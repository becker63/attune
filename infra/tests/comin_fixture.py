import argparse
import json
from pathlib import Path
import subprocess

p=argparse.ArgumentParser()
p.add_argument('label')
p.add_argument('--unsigned',action='store_true')
p.add_argument('--untrusted',action='store_true')
p.add_argument('--bad-build',action='store_true')
p.add_argument('--bad-activation',action='store_true')
p.add_argument('--wrong-machine',action='store_true')
a=p.parse_args()
root=Path('/srv/fixture')
root.mkdir(parents=True,exist_ok=True)
def run(*cmd):
    return subprocess.run(cmd,cwd=root,check=True,capture_output=True,text=True).stdout
if not (root/'.git').exists():
    run('git','init','-b','main')
    run('ssh-keygen','-q','-t','ed25519','-N','','-f',str(root/'signing'))
    run('ssh-keygen','-q','-t','ed25519','-N','','-f',str(root/'untrusted'))
    (root/'allowed').write_text('fixture namespaces="git" '+(root/'signing.pub').read_text())
    (root/'.gitignore').write_text('signing*\nuntrusted*\nallowed\n')
    for key,value in [('user.name','Fixture'),('user.email','fixture@example.invalid'),('gpg.format','ssh'),('user.signingkey',str(root/'signing')),('commit.gpgsign','true')]:
        run('git','config',key,value)
settings=json.loads(Path('/etc/comin-fixture.json').read_text())
text=Path('/etc/comin-flake.nix.in').read_text()
for key,value in dict(BASH=settings['bash'],COREUTILS=settings['coreutils'],SYSTEM=settings['system'],MACHINE_ID='"ffffffffffffffffffffffffffffffff"' if a.wrong_machine else 'null',LABEL=a.label,FAIL='false' if a.bad_build else ':',ACTIVATION_FAIL='exit 1' if a.bad_activation else ':').items():
    text=text.replace('@'+key+'@',value)
(root/'flake.nix').write_text(text)
run('git','add','flake.nix','.gitignore')
run('nix','flake','lock',str(root))
run('git','add','flake.nix','.gitignore')
if (root/'flake.lock').exists():
    run('git','add','flake.lock')
command=['git']
if a.untrusted:
    command+=['-c','user.signingkey='+str(root/'untrusted')]
command+=['commit','--no-gpg-sign' if a.unsigned else '-S','-m',a.label]
run(*command)
