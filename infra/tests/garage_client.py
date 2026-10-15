import argparse
import hashlib
import json
from pathlib import Path
import secrets
import subprocess
import sys
sys.path.insert(0,'/etc/attune-ingest')
from archive import S3Store

p=argparse.ArgumentParser()
p.add_argument('action', choices=['setup','write','read','multipart','large'])
p.add_argument('endpoint')
p.add_argument('--label',default='baseline')
a=p.parse_args()
credentials=Path('/var/lib/fixture-s3.json')
if a.action=='setup':
    access, secret='GK'+secrets.token_hex(16),secrets.token_hex(32)
    subprocess.run(['garage','key','import','--yes','-n','fixture',access,secret],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    subprocess.run(['garage','bucket','allow','--read','--write','--key',access,'fixture'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    credentials.write_text(json.dumps(dict(access_key=access,secret_key=secret)))
    credentials.chmod(0o600)
store=S3Store(a.endpoint,'fixture',credentials)
data=b'Attune quorum fixture\n'+a.label.encode()
if a.action=='large':
    data=secrets.token_bytes(1024*1024)
key='objects/sha256/'+hashlib.sha256(data).hexdigest()[:2]+'/'+hashlib.sha256(data).hexdigest()
if a.action in ('setup','write','large'):
    store.put(key,data)
elif a.action=='read':
    assert store.get(key)==data
    objects=store.client.list_objects_v2(Bucket='fixture').get('Contents',[])
    assert any(o['Key']==key for o in objects)
elif a.action=='multipart':
    upload=store.client.create_multipart_upload(Bucket='fixture',Key='interrupted')
    store.client.upload_part(Bucket='fixture',Key='interrupted',UploadId=upload['UploadId'],PartNumber=1,Body=b'incomplete')
    store.client.abort_multipart_upload(Bucket='fixture',Key='interrupted',UploadId=upload['UploadId'])
    assert not any(o['Key']=='interrupted' for o in store.client.list_objects_v2(Bucket='fixture').get('Contents',[]))
print('PASS', a.action)
