"""Record public identities over an already authenticated SSH channel."""
import argparse
import json
from pathlib import Path
import re
import subprocess

p=argparse.ArgumentParser()
p.add_argument('hostname',choices=['attune-a','attune-b','attune-c'])
p.add_argument('--address',required=True)
p.add_argument('--known-hosts',required=True)
p.add_argument('--key',required=True)
p.add_argument('--root',default='infra')
p.add_argument('--garage',action='store_true')
a=p.parse_args()
ssh=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+a.known_hosts,'-i',a.key,'root@'+a.address]
command='printf "%s\\n" "$(hostname)"; cat /etc/machine-id; cat /persist/sops/recipient.txt; cat /persist/ssh/ssh_host_ed25519_key.pub'
lines=subprocess.check_output(ssh+[command],text=True).splitlines()
if len(lines)!=4 or lines[0]!=a.hostname or not re.fullmatch('[a-f0-9]{32}',lines[1]) or not re.fullmatch('age1[0-9a-z]{58}',lines[2]):
    raise ValueError('public enrollment identity failed validation')
identity=dict(machineId=lines[1],ageRecipient=lines[2],sshHostKey=lines[3])
path=Path(a.root)/'identities'/(a.hostname+'.json')
if path.exists():
    previous=json.loads(path.read_text())
    if any(previous.get(k)!=v for k,v in identity.items()):
        raise ValueError('identity changed; use explicit lost-node recovery procedure')
    identity=previous
if a.garage:
    node=subprocess.check_output(ssh+['garage node id -q'],text=True).strip().split('@')[0]
    if not re.fullmatch('[a-f0-9]{64}',node):
        raise ValueError('invalid Garage public node ID')
    if identity.get('garageId') not in (None,node):
        raise ValueError('Garage identity changed')
    identity['garageId']=node
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(identity,indent=2)+'\n')
print(path)
