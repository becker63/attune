"""Bounded adapter for Attune's retained native quality-task report format.

No experiment is executed here. Physical evaluations and online feedback are not
inferred from observational reports. Source bytes and exact fractions survive.
"""
import argparse
from fractions import Fraction
import gzip
import hashlib
import itertools
import json
from pathlib import Path
import re
import shutil
import tempfile

import ijson
from archive import canonical, digest, validate_records

METRICS = ('Recall@10', 'FileAcc@10', 'Hit@1', 'MRR@10')


def export(source, expected, protocol, protocol_sha256, destination, *, study, run,
           revision, population, offset=0, count=1000):
    source, protocol, destination = map(Path, (source, protocol, destination))
    if offset < 0 or not 1 <= count <= 1000:
        raise ValueError('offset must be nonnegative and count between 1 and 1000')
    if not re.fullmatch(r'[a-fA-F0-9]{40}|[a-fA-F0-9]{64}', revision):
        raise ValueError('source revision must be immutable')
    if not population or any(not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', x) for x in (study, run)):
        raise ValueError('invalid study/run/population identity')
    if destination.exists():
        raise ValueError('export destination already exists; retain it or choose another run')
    protocol_bytes = protocol.read_bytes()
    if len(protocol_bytes) > 4 * 1024 * 1024 or digest(protocol_bytes) != protocol_sha256:
        raise ValueError('protocol hash/size mismatch')
    json.loads(protocol_bytes)
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.attune-export-', dir=destination.parent))
    try:
        raw = stage/'source.bin'
        sha = hashlib.sha256()
        with source.open('rb') as src, raw.open('xb') as dst:
            while chunk := src.read(8 * 1024 * 1024):
                sha.update(chunk)
                dst.write(chunk)
        if sha.hexdigest() != expected:
            raise ValueError('source hash mismatch')
        with raw.open('rb') as probe:
            compressed = probe.read(2) == b'\x1f\x8b'
        opener = gzip.open if compressed else open
        records = []
        selected_rows = 0
        with opener(raw, 'rb') as stream:
            selected = itertools.islice(ijson.items(stream, 'item', use_float=True), offset, offset + count)
            for index, row in enumerate(selected, offset):
                for key in ('query', 'task', 'repository', 'state', 'canonical_metrics'):
                    if key not in row:
                        raise ValueError('unsupported native quality-task record: missing ' + key)
                identity = digest(canonical([expected, row['query'], row['repository'], row['task']]))
                candidate = digest(row['query'].encode())
                subject = digest(canonical([row['repository'], row['task']]))
                records.append(dict(kind='event', id='report-' + identity,
                    subject=subject, candidate=candidate, repository=row['repository'],
                    source_row_index=index, source_format='attune-native-quality-task-v1',
                    provenance_class='observational-report', producer_record=row,
                    claims_new_physical_computation=False, artifact_sha256=expected))
                pairs = dict(row['canonical_metrics'])
                optional = {'utility': 'utility', 'delta_studio': 'utility_delta_studio', 'delta_qwen': 'utility_delta_qwen'}
                extra_metrics = [metric for field, metric in optional.items() if field in row]
                pairs.update({metric: row[field] for field, metric in optional.items() if field in row})
                for metric in (*METRICS, *extra_metrics):
                    pair = pairs.get(metric)
                    status, value, numerator, denominator = 'unavailable', None, None, None
                    if row['state'] == 'Completed' and pair is not None:
                        if not isinstance(pair, list) or len(pair) != 2 or any(not re.fullmatch(r'-?\d+', str(v)) for v in pair):
                            raise ValueError('canonical metric must be an exact integer pair')
                        numerator, denominator = map(int, pair)
                        if denominator < 0:
                            raise ValueError('negative denominator')
                        status = 'defined' if denominator else 'undefined'
                        value = float(Fraction(numerator, denominator)) if denominator else None
                    records.append(dict(kind='measurement', id=digest(canonical([identity, metric])),
                        subject=subject, candidate=candidate, repository=row['repository'],
                        metric=metric, metric_version='attune-native-quality-v1', population=population,
                        aggregation='per-task', status=status, value=value, numerator=numerator,
                        denominator=denominator, population_count=1, covered_count=int(status == 'defined'),
                        undefined_count=int(status == 'undefined'), artifact_sha256=expected,
                        report_event_id='report-' + identity))
                selected_rows += 1
        if not records:
            raise ValueError('no records in selected range')
        records.append(dict(kind='event', id='scope-' + digest(canonical([expected, offset, count])),
            provenance_class='selected-report-records', requested_offset=offset, requested_count=count,
            selected_count=selected_rows, claims_complete_source_index=False,
            claims_new_physical_computation=False, artifact_sha256=expected))
        validate_records(records)
        (stage/'protocol.json').write_bytes(protocol_bytes)
        envelope = dict(schema_version=1, study=study, run=run, source_revision=revision,
            protocol_sha256=protocol_sha256, records=records, artifacts=[
                dict(path='source.bin', sha256=expected, media_type='application/gzip' if compressed else 'application/json'),
                dict(path='protocol.json', sha256=protocol_sha256, media_type='application/json')])
        body = canonical(envelope)
        if len(body) > 32 * 1024 * 1024:
            raise ValueError('export exceeds spool limit; use a smaller --count')
        (stage/'evidence.pending').write_bytes(body)
        stage.rename(destination)
        (destination/'evidence.pending').rename(destination/'evidence.json')
        return destination/'evidence.json'
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('source')
    p.add_argument('--sha256', required=True)
    p.add_argument('--protocol', required=True)
    p.add_argument('--protocol-sha256', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--study', required=True)
    p.add_argument('--run', required=True)
    p.add_argument('--source-revision', required=True)
    p.add_argument('--population', required=True)
    p.add_argument('--offset', type=int, default=0)
    p.add_argument('--count', type=int, default=1000)
    a = p.parse_args()
    print(export(a.source, a.sha256, a.protocol, a.protocol_sha256, a.output,
                 study=a.study, run=a.run, revision=a.source_revision, population=a.population,
                 offset=a.offset, count=a.count))


if __name__ == '__main__':
    main()
