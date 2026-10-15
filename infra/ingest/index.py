"""Reconstructable ClickHouse projection from independently verified Parquet."""
import base64
import json
from pathlib import Path
import urllib.request
import urllib.parse
from archive import verify_manifest


def query(endpoint, sql, credentials=None, data=None):
    headers = {}
    if credentials:
        c = json.loads(Path(credentials).read_text())
        headers['Authorization'] = 'Basic ' + base64.b64encode((c['user']+':'+c['password']).encode()).decode()
    req = urllib.request.Request(endpoint+'/?'+urllib.parse.urlencode({'query': sql}), data=data if data is not None else b'', headers=headers)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def project(store, manifest_key, endpoint, credentials=None):
    m = verify_manifest(store, manifest_key)
    for obj in m['objects']:
        if obj['media_type'] == 'application/vnd.apache.parquet':
            query(endpoint, 'INSERT INTO attune.records_v1 FORMAT Parquet', credentials, store.get(obj['key']))
    # ReplacingMergeTree + FINAL views make duplicate replay logically idempotent.
    # Table optimization is optional; archives remain the authoritative source.


def main():
    import argparse
    from archive import LocalStore, S3Store
    from backup import keys
    p = argparse.ArgumentParser()
    p.add_argument('--archive-endpoint')
    p.add_argument('--archive-credentials')
    p.add_argument('--archive-local')
    p.add_argument('--bucket', default='attune-science')
    p.add_argument('--clickhouse', required=True)
    p.add_argument('--credentials', required=True)
    p.add_argument('--manifest')
    p.add_argument('--all', action='store_true')
    a = p.parse_args()
    if bool(a.manifest) == a.all:
        p.error('choose exactly one of --manifest or --all')
    store = LocalStore(a.archive_local) if a.archive_local else S3Store(a.archive_endpoint,a.bucket,a.archive_credentials)
    selected = keys(store) if a.all else [a.manifest]
    for key in selected:
        project(store,key,a.clickhouse,a.credentials)
    print('Projected',len(selected),'verified manifests')


if __name__ == '__main__':
    main()
