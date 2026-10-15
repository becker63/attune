"""Immutable local evidence -> verified objects -> sealed manifest.

Bazel remains the producer. No cacheable action contacts this archive.
"""
import argparse
import hashlib
import fcntl
import math
import json
import os
from pathlib import Path
import re
import sqlite3
import tempfile
import urllib.request


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


class LocalStore:
    def __init__(self, root):
        self.root = Path(root)

    def get(self, key):
        return (self.root / key).read_bytes()

    def put(self, key, data):
        p = self.root / key
        p.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix='.upload-', dir=p.parent)
        try:
            with os.fdopen(fd, 'wb') as f:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            try:
                os.link(temporary, p)
            except FileExistsError:
                if p.read_bytes() != data:
                    raise ValueError('immutable object conflict: ' + key)
            directory = os.open(p.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        finally:
            os.unlink(temporary)
        if self.get(key) != data:
            raise ValueError('stored object verification failed')


class S3Store:
    def __init__(self, endpoint, bucket, credentials):
        import boto3
        from botocore.config import Config
        c = json.loads(Path(credentials).read_text())
        self.client = boto3.client('s3', endpoint_url=endpoint, region_name='attune', aws_access_key_id=c['access_key'], aws_secret_access_key=c['secret_key'], config=Config(connect_timeout=3, read_timeout=10, retries={'max_attempts': 2}))
        self.bucket = bucket

    def get(self, key):
        return self.client.get_object(Bucket=self.bucket, Key=key)['Body'].read()

    def put(self, key, data):
        from botocore.exceptions import ClientError
        # Garage does not provide a reliable conditional-PUT immutability boundary.
        # Serialize authorized archive writers on the shared persistent lock and
        # check existing bytes before issuing any PUT.
        try:
            existing = self.get(key)
        except ClientError as e:
            if e.response['ResponseMetadata']['HTTPStatusCode'] != 404:
                raise
        else:
            if existing != data:
                raise ValueError('immutable object conflict: ' + key)
            return
        try:
            self.client.put_object(Bucket=self.bucket, Key=key, Body=data, IfNoneMatch='*')
        except ClientError as e:
            if e.response['ResponseMetadata']['HTTPStatusCode'] not in (409, 412):
                raise
        if self.get(key) != data:
            raise ValueError('immutable object conflict or hash mismatch: ' + key)


def validate_records(records):
    physical = set()
    identities = set()
    kinds = {'study','trial','subject','candidate','evaluation','measurement','event','artifact','feedback','search_transition','ranking_item','structural_witness','repository_fact','build_execution_span'}
    for r in records:
        if r.get('kind') not in kinds or not isinstance(r.get('id'),str) or not r['id']:
            raise ValueError('invalid versioned record identity')
        identity = (r['kind'],r['id'])
        if identity in identities:
            raise ValueError('duplicate record identity')
        identities.add(identity)
        if r['kind'] == 'evaluation':
            if r['id'] in physical:
                raise ValueError('duplicate physical evaluation')
            physical.add(r['id'])
        if r['kind'] == 'measurement':
            for name in ('metric', 'metric_version', 'population', 'aggregation', 'status', 'population_count', 'covered_count', 'undefined_count', 'artifact_sha256'):
                if name not in r:
                    raise ValueError('measurement missing ' + name)
            if r['status'] not in ('defined', 'undefined', 'failed', 'unavailable'):
                raise ValueError('invalid metric status')
            if (r.get('value') is not None) != (r['status'] == 'defined'):
                raise ValueError('only defined measurements may have values')
            if r['status']=='defined' and (isinstance(r['value'],bool) or not isinstance(r['value'],(int,float)) or not math.isfinite(r['value'])):
                raise ValueError('defined metric values must be finite numbers')
            for count in ('population_count','covered_count','undefined_count'):
                if not isinstance(r[count],int) or isinstance(r[count],bool) or r[count] < 0:
                    raise ValueError('coverage counts must be nonnegative integers')
            if r['covered_count']+r['undefined_count'] > r['population_count']:
                raise ValueError('coverage exceeds population')
            if (r.get('numerator') is None) != (r.get('denominator') is None):
                raise ValueError('exact fraction must retain both terms')
            if r.get('denominator') is not None and (any(not isinstance(r[k],int) or isinstance(r[k],bool) for k in ('numerator','denominator')) or r['denominator'] < 0):
                raise ValueError('exact fractions require integer numerator and nonnegative integer denominator')
            if r.get('denominator') == 0 and r['status'] == 'defined':
                raise ValueError('zero denominator is undefined')
    for r in records:
        if r['kind'] == 'feedback' and r.get('evaluation_id') not in physical:
            raise ValueError('logical feedback lacks physical evaluation')


def parquet(records):
    import pyarrow as pa
    import pyarrow.parquet as pq
    # Explicit optional columns prevent all-null inference from erasing metric types.
    schema = pa.schema([
        ('kind', pa.string()), ('id', pa.string()), ('study', pa.string()),
        ('trial', pa.string()), ('subject', pa.string()), ('candidate', pa.string()),
        ('evaluation_id', pa.string()), ('treatment', pa.string()), ('repository', pa.string()), ('seed', pa.int64()),
        ('metric', pa.string()), ('metric_version', pa.string()), ('population', pa.string()),
        ('aggregation', pa.string()), ('value', pa.float64()), ('numerator', pa.int64()), ('denominator', pa.int64()),
        ('status', pa.string()), ('population_count', pa.int64()), ('covered_count', pa.int64()), ('undefined_count', pa.int64()),
        ('artifact_sha256', pa.string()), ('extension_json', pa.string()),
    ])
    allowed = set(schema.names)
    normalized = []
    for record in records:
        row = {k: v for k, v in record.items() if k in allowed}
        row['extension_json'] = canonical({k: v for k, v in record.items() if k not in allowed}).decode()
        normalized.append(row)
    out = pa.BufferOutputStream()
    pq.write_table(pa.Table.from_pylist(normalized, schema=schema), out, compression='zstd', version='2.6')
    return out.getvalue().to_pybytes()


def import_evidence(source, store, state):
    Path(state).parent.mkdir(parents=True, exist_ok=True)
    with open(str(state) + '.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        return _import_evidence(source, store, state)


def _import_evidence(source, store, state):
    source = Path(source)
    evidence = json.loads(source.read_text())
    for key in ('study', 'run'):
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', evidence[key]):
            raise ValueError('invalid identity')
    if evidence['schema_version'] != 1 or not evidence.get('protocol_sha256') or not evidence.get('source_revision'):
        raise ValueError('schema/provenance missing')
    if evidence.get('evidence_class', 'scientific') == 'scientific' and not re.fullmatch(r'[a-fA-F0-9]{40}|[a-fA-F0-9]{64}', evidence['source_revision']):
        raise ValueError('scientific source_revision must be an immutable Git/object digest, not a moving ref')
    records = [dict(r, study=evidence['study']) for r in evidence['records']]
    validate_records(records)
    Path(state).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(state)
    db.execute('CREATE TABLE IF NOT EXISTS imports (identity TEXT PRIMARY KEY, status TEXT, error TEXT)')
    identity = evidence['study'] + '/' + evidence['run']
    db.execute('INSERT INTO imports VALUES (?, ?, NULL) ON CONFLICT(identity) DO UPDATE SET status=excluded.status,error=NULL', (identity, 'pending'))
    db.commit()
    try:
        objects = []
        def publish(data, media):
            sha = digest(data)
            key = 'objects/sha256/' + sha[:2] + '/' + sha
            store.put(key, data)
            if digest(store.get(key)) != sha:
                raise ValueError('archive hash mismatch')
            objects.append(dict(key=key, sha256=sha, size=len(data), media_type=media))
            return sha
        artifact_hashes = set()
        protocol = None
        for a in evidence['artifacts']:
            path = (source.parent / a['path']).resolve()
            if not path.is_relative_to(source.parent.resolve()):
                raise ValueError('artifact path escapes evidence directory')
            data = path.read_bytes()
            if digest(data) != a['sha256']:
                raise ValueError('artifact hash mismatch')
            artifact_hashes.add(publish(data, a['media_type']))
            if a['sha256'] == evidence['protocol_sha256']:
                protocol = data
        if protocol is None:
            raise ValueError('protocol bytes must be an archived artifact')
        store.put(f"studies/{evidence['study']}/protocol.json", protocol)
        for r in records:
            if r.get('artifact_sha256') and r['artifact_sha256'] not in artifact_hashes:
                raise ValueError('producing artifact not archived')
        publish(parquet(records), 'application/vnd.apache.parquet')
        manifest = {k: evidence[k] for k in ('schema_version', 'study', 'run', 'protocol_sha256', 'source_revision')}
        manifest['evidence_class'] = evidence.get('evidence_class', 'scientific')
        if manifest['evidence_class'] not in ('scientific','execution_receipt'):
            raise ValueError('unsupported evidence class')
        manifest.update(status='complete', objects=sorted(objects, key=lambda o: o['key']))
        body = canonical(manifest)
        manifest_key = f"studies/{evidence['study']}/runs/{evidence['run']}/manifest.json"
        store.put(manifest_key, body)
        db.execute('UPDATE imports SET status=?,error=NULL WHERE identity=?', ('complete', identity))
        db.commit()
        return manifest
    except Exception as e:
        db.execute('UPDATE imports SET status=?,error=? WHERE identity=?', ('failed', type(e).__name__, identity))
        db.commit()
        raise
    finally:
        db.close()


def verify_manifest(store, key):
    m = json.loads(store.get(key))
    if m['status'] != 'complete':
        raise ValueError('unsealed evidence')
    for obj in m['objects']:
        data = store.get(obj['key'])
        if len(data) != obj['size'] or digest(data) != obj['sha256']:
            raise ValueError('corrupt archive object')
    return m


def backup(store, destination, key):
    m = verify_manifest(store, key)
    for obj in m['objects']:
        destination.put(obj['key'], store.get(obj['key']))
    protocol = next(o for o in m['objects'] if o['sha256'] == m['protocol_sha256'])
    destination.put(f"studies/{m['study']}/protocol.json", store.get(protocol['key']))
    destination.put(key, store.get(key))
    verify_manifest(destination, key)


def read_bep(path):
    """Retain actual local BEP receipts; do not infer absent execution metrics."""
    events = [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]
    return [dict(kind='build_execution_span', id=str(i), buildbuddy_receipt=e) for i, e in enumerate(events)]


def main():
    p = argparse.ArgumentParser()
    p.add_argument('evidence')
    p.add_argument('--state', required=True)
    p.add_argument('--local-store')
    p.add_argument('--endpoint')
    p.add_argument('--bucket', default='attune-science')
    p.add_argument('--credentials')
    args = p.parse_args()
    store = LocalStore(args.local_store) if args.local_store else S3Store(args.endpoint, args.bucket, args.credentials)
    print(canonical(import_evidence(args.evidence, store, args.state)).decode())


if __name__ == '__main__':
    main()
