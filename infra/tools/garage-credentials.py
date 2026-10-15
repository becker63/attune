"""Reconcile an enrolled S3 identity; secret bytes travel through stdin only."""
import argparse
import json
from pathlib import Path
import subprocess


def run(*args, payload=None):
    return subprocess.run(['garage', *args], input=json.dumps(payload) if payload is not None else None,
                          text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def reconcile(path):
    credentials = json.loads(Path(path).read_text())
    if run('bucket', 'info', 'attune-science').returncode:
        run('bucket', 'create', 'attune-science').check_returncode()
    if run('key', 'info', credentials['access_key']).returncode:
        run('json-api', 'ImportKey', '-', payload=dict(
            accessKeyId=credentials['access_key'], secretAccessKey=credentials['secret_key'],
            name='attune-archive')).check_returncode()
    run('bucket', 'allow', '--read', '--write', '--key', credentials['access_key'], 'attune-science').check_returncode()
    print('Archive bucket and credential permissions reconciled')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--credentials', default='/run/secrets/archive-s3')
    reconcile(p.parse_args().credentials)
