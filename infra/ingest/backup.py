"""Copy sealed evidence with integrity verification; source is never deleted."""
import argparse
from pathlib import Path
import os
import json
import subprocess
import time
from archive import LocalStore, S3Store, backup


def keys(store):
    if isinstance(store,LocalStore):
        return sorted(str(p.relative_to(store.root)) for p in store.root.glob('studies/*/runs/*/manifest.json'))
    pages=store.client.get_paginator('list_objects_v2').paginate(Bucket=store.bucket,Prefix='studies/')
    return sorted(o['Key'] for page in pages for o in page.get('Contents',[]) if o['Key'].endswith('/manifest.json'))


def physical_disks(path):
    mount = json.loads(subprocess.check_output(['findmnt', '--json', '--target', str(path), '--output', 'SOURCE'], text=True))['filesystems'][0]
    device = mount['source'].split('[', 1)[0]
    if not device.startswith('/dev/'):
        raise ValueError('local backup requires a verifiable external block device; use the remote endpoint option for network archives')
    tree = json.loads(subprocess.check_output(['lsblk', '--json', '--inverse', '--output', 'MAJ:MIN,TYPE', device], text=True))['blockdevices']
    disks = set()
    while tree:
        node = tree.pop()
        if node['type'] == 'disk':
            disks.add(node['maj:min'])
        tree.extend(node.get('children', []))
    if not disks:
        raise ValueError('cannot establish physical disk ancestry')
    return disks


def require_independent(destination, source=Path('/data')):
    if not destination.is_mount() or physical_disks(destination) & physical_disks(source):
        raise ValueError('backup destination must be mounted on an independent physical disk')


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--source-endpoint')
    p.add_argument('--source-credentials')
    p.add_argument('--source-local')
    p.add_argument('--source-bucket',default='attune-science')
    p.add_argument('--destination-endpoint')
    p.add_argument('--destination-credentials')
    p.add_argument('--destination-bucket',default='attune-science-backup')
    p.add_argument('--destination-local')
    p.add_argument('--allow-test-destination',action='store_true')
    p.add_argument('--metrics')
    a=p.parse_args()
    source=LocalStore(a.source_local) if a.source_local else S3Store(a.source_endpoint,a.source_bucket,a.source_credentials)
    if a.destination_local:
        dest=Path(a.destination_local)
        if not a.allow_test_destination:
            require_independent(dest)
        destination=LocalStore(dest)
    else:
        if a.destination_endpoint==a.source_endpoint:
            raise ValueError('backup endpoint must be independent of the source cluster')
        destination=S3Store(a.destination_endpoint,a.destination_bucket,a.destination_credentials)
    manifests=keys(source)
    for key in manifests:
        backup(source,destination,key)
    if a.metrics:
        metric=Path(a.metrics)
        tmp=metric.with_suffix('.tmp')
        tmp.write_text(f'attune_backup_last_verified_seconds {int(time.time())}\nattune_backup_manifests_verified {len(manifests)}\n')
        tmp.replace(metric)
    print(f'Verified {len(manifests)} sealed manifests and their objects')


if __name__=='__main__':
    main()
