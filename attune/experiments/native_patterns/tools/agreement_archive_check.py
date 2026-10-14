"""Offline verify archived scientific payloads and producing bytes; no acquisition."""
from pathlib import Path
import json,gzip,hashlib
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');sha=lambda b:hashlib.sha256(b).hexdigest()
rows=json.loads((O/'payload-manifest.json').read_text())
for row in rows:
 b=(O/row['path']).read_bytes();assert sha(b)==row['gzip_sha256'];raw=gzip.decompress(b);assert sha(raw)==row['raw_sha256'];json.loads(raw)
source=json.loads((O/'producing-source-final.json').read_text())['source']
for r in source:assert sha((O/r['snapshot']).read_bytes())==r['sha256']
print('ParityPass: offline gzip/json/hash replay',len(rows),'payloads;',len(source),'source snapshots; zero provider calls')
