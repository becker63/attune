"""Generate credentials once, encrypt per host, never write plaintext into Git."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess

p=argparse.ArgumentParser()
p.add_argument('--buildbuddy-credential')
p.add_argument('--root',default='infra')
p.add_argument('--admin-key',default=str(Path.home()/'.config/sops/age/keys.txt'))
a=p.parse_args()
root=Path(a.root)
admin=Path(a.admin_key)
if admin.stat().st_mode & 0o077:
    raise ValueError('administrative age identity must be owner-private')
recipient=subprocess.check_output(['age-keygen','-y',str(admin)],text=True).strip()
identities={n:json.loads((root/'identities'/(n+'.json')).read_text()) for n in ['attune-a','attune-b','attune-c']}
outputs=[root/'secrets'/(n+'.yaml') for n in identities]
if any(path.exists() for path in outputs):
    raise ValueError('existing encrypted credentials detected; use rotation or SOPS recipient update, never regenerate silently')
rpc=secrets.token_hex(32)
metrics=secrets.token_urlsafe(32)
grafana=secrets.token_urlsafe(32)
ingest=secrets.token_urlsafe(32)
s3=dict(access_key='GK'+secrets.token_hex(12),secret_key=secrets.token_hex(32))
users='<clickhouse><users><grafana><password_sha256_hex>'+hashlib.sha256(grafana.encode()).hexdigest()+'</password_sha256_hex></grafana><ingest><password_sha256_hex>'+hashlib.sha256(ingest.encode()).hexdigest()+'</password_sha256_hex></ingest></users></clickhouse>'
values={
 'attune-a':{'garage-rpc':rpc,'grafana-admin':secrets.token_urlsafe(32),'grafana-key':secrets.token_urlsafe(32),'grafana-clickhouse':grafana,'metrics-password':metrics},
 'attune-b':{'garage-rpc':rpc,'clickhouse-users':users},
 'attune-c':{'garage-rpc':rpc,'metrics-password':metrics,'archive-s3':json.dumps(s3),'archive-clickhouse':json.dumps(dict(user='ingest',password=ingest))},
}
if a.buildbuddy_credential:
    token=Path(a.buildbuddy_credential)
    if token.stat().st_mode & 0o077:
        raise ValueError('BuildBuddy source credential must be owner-private')
    values['attune-c']['buildbuddy-api']=token.read_text().strip()
(root/'secrets').mkdir(exist_ok=True)
rules=[]
for name, value in values.items():
    recipients=[recipient,identities[name]['ageRecipient']]
    encrypted=subprocess.run(['sops','--encrypt','--age',','.join(recipients),'--input-type','json','--output-type','yaml','/dev/stdin'],input=json.dumps(value),capture_output=True,text=True,check=True).stdout
    (root/'secrets'/(name+'.yaml')).write_text(encrypted)
    rules.append(dict(path_regex='secrets/'+name+r'\.yaml$',age=','.join(recipients)))
(root/'.sops.yaml').write_text(json.dumps(dict(creation_rules=rules),indent=2)+'\n')
print('Encrypted host credentials created. Back up the existing administrative age identity independently before deployment.')
