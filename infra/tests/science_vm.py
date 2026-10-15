"""Executed inside a disposable NixOS guest with real pinned services."""
import importlib.util
import json
from pathlib import Path
import secrets
import subprocess
import sys
import urllib.request
import base64

sys.path.insert(0, '/etc/attune-ingest')
from archive import S3Store, import_evidence, verify_manifest, backup, LocalStore
from index import project, query


def cli(*args):
    return subprocess.check_output(['garage', *args],text=True,stderr=subprocess.PIPE)


root = Path('/var/lib/attune-fixture')
root.mkdir(exist_ok=True)
credentials = root/'credentials.json'
if not credentials.exists():
    node = cli('node','id','-q').strip().split('@')[0]
    cli('layout','assign','-z','fixture','-c','1G',node)
    cli('layout','apply','--version','1')
    access, secret = 'GK'+secrets.token_hex(16), secrets.token_hex(32)
    credentials.write_text(json.dumps(dict(access_key=access,secret_key=secret)))
    credentials.chmod(0o600)
    for _ in range(2):
        subprocess.run(['python3', '/etc/garage-credentials.py', '--credentials', str(credentials)], check=True)
    assert secret.encode() not in subprocess.check_output(['journalctl', '--no-pager'])

spec = importlib.util.spec_from_file_location('fixture', '/etc/test_science.py')
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)
source, evidence = f.fixture(root)
store = S3Store('http://127.0.0.1:3900','attune-science',credentials)
state = root/'state.sqlite'
manifest = import_evidence(source,store,state)
assert import_evidence(source,store,state) == manifest
key = 'studies/synthetic/runs/run-1/manifest.json'
verify_manifest(store,key)
# Schema statements are issued separately because HTTP disallows multiquery.
for statement in Path('/etc/schema.sql').read_text().split(';'):
    if statement.strip():
        query('http://localhost:8123',statement)
project(store,key,'http://localhost:8123')
project(store,key,'http://localhost:8123')
assert query('http://localhost:8123',"SELECT count() FROM attune.events_v1 WHERE kind='evaluation'").strip()==b'1'
assert query('http://localhost:8123',"SELECT count() FROM attune.events_v1 WHERE kind='feedback'").strip()==b'2'
assert query('http://localhost:8123',"SELECT numerator, denominator FROM attune.measurements_v1 WHERE status='defined'").strip()==b'1\t2'
assert query('http://localhost:8123',"SELECT isNull(value), denominator FROM attune.measurements_v1 WHERE status='undefined'").strip()==b'1\t0'
assert query('http://localhost:8123',"SELECT isNull(sumOrNull(numerator)), isNull(sumOrNull(denominator)), isNull(avgOrNull(value)) FROM attune.measurements_v1 WHERE metric='MRR@10'").strip()==b'1\t1\t1'
backup(store, LocalStore(root/'off-cluster-backup'), key)
backup(LocalStore(root/'off-cluster-backup'), LocalStore(root/'restored'), key)
verify_manifest(LocalStore(root/'restored'),key)
evidence['run']='interrupted'
source.write_text(json.dumps(evidence))
(root/'raw.json').unlink()
try:
    import_evidence(source,store,state)
    raise AssertionError('missing artifact must fail')
except FileNotFoundError:
    pass
(root/'raw.json').write_bytes(b'raw immutable Bazel evidence\n')
import_evidence(source,store,state)
verify_manifest(store,'studies/synthetic/runs/interrupted/manifest.json')
headers={'Authorization':'Basic '+base64.b64encode(b'admin:admin').decode()}
for uid in ('attune-infrastructure','attune-search','attune-quality'):
    req=urllib.request.Request('http://localhost:3000/api/dashboards/uid/'+uid,headers=headers)
    with urllib.request.urlopen(req) as response:
        assert json.load(response)['dashboard']['uid']==uid
with urllib.request.urlopen(urllib.request.Request('http://localhost:3000/api/datasources',headers=headers)) as response:
    assert {d['uid'] for d in json.load(response)}=={'science','operations'}
payload = dict(queries=[dict(refId='A', datasource=dict(uid='science',type='grafana-clickhouse-datasource'), rawSql="SELECT value, numerator, denominator FROM attune.measurements_v1 WHERE status='defined'", format=1, queryType='sql', editorType='sql')], **{'from':'0','to':'9999999999999'})
request=urllib.request.Request('http://localhost:3000/api/ds/query',data=json.dumps(payload).encode(),headers=headers | {'Content-Type':'application/json'})
with urllib.request.urlopen(request) as response:
    result=json.load(response)['results']['A']
    assert not result.get('error'), result.get('error')
    assert result['frames'][0]['data']['values']==[[0.5],[1],[2]], result
print('PASS: immutable S3 archive, Parquet, SQL projections, undefined fractions, Grafana provisioning, retry, backup/restore')
