"""Bounded Cloud execution-receipt export, distinct from scientific evidence."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from archive import canonical, digest
from buildbuddy import Client

PROTOCOL = canonical(dict(schema_version=1, kind='buildbuddy-execution-receipt', semantics='Provider-reported invocation/execution metadata only; no claim of complete scientific artifacts or CPU/heap profiles.'))


def collect(client, inbox, metrics, repository='https://github.com/becker63/attune'):
    inbox=Path(inbox)
    response=client.rpc('SearchInvocation',dict(query={'repo_url':repository},sort=dict(sort_field=2,ascending=False),count=20))
    exported=0
    for row in response.get('invocation',[]):
        if row.get('repoUrl','').removesuffix('.git') != repository.removesuffix('.git'):
            continue
        if row.get('invocationStatus')!='COMPLETE_INVOCATION_STATUS':
            continue
        invocation=row['invocationId']
        if not all(c in 'abcdef0123456789-' for c in invocation.lower()):
            raise ValueError('unexpected invocation identity')
        execution=client.rpc('GetExecution',dict(execution_lookup=dict(invocation_id=invocation)))
        receipt=canonical(dict(invocation=row,execution=execution))
        fingerprint=digest(receipt)
        run='bb-'+invocation+'-'+fingerprint[:16]
        destination=inbox/run
        destination.mkdir(parents=True,exist_ok=True)
        (destination/'protocol.json').write_bytes(PROTOCOL)
        (destination/'receipt.json').write_bytes(receipt)
        evidence=dict(schema_version=1,evidence_class='execution_receipt',study='buildbuddy-receipts-v1',run=run,protocol_sha256=digest(PROTOCOL),source_revision=row.get('commitSha') or 'unavailable',
          artifacts=[dict(path='protocol.json',sha256=digest(PROTOCOL),media_type='application/json'),dict(path='receipt.json',sha256=fingerprint,media_type='application/json')],
          records=[dict(kind='build_execution_span',id=invocation,artifact_sha256=fingerprint,invocation_id=invocation,provider_metadata=row,provider_execution=execution,profiles_status='unavailable-unless-separately-exported')])
        encoded=canonical(evidence)
        path=destination/'evidence.json'
        if path.exists() and path.read_bytes()!=encoded:
            raise ValueError('receipt content identity collision')
        temporary=destination/'evidence.json.pending'
        temporary.write_bytes(encoded)
        temporary.replace(path)
        exported+=1
    metric=Path(metrics)
    tmp=metric.with_suffix('.tmp')
    tmp.write_text(f'attune_buildbuddy_last_poll_seconds {int(time.time())}\nattune_buildbuddy_receipts_exported {exported}\n')
    tmp.replace(metric)
    return exported


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--repository',default='https://github.com/becker63/attune')
    p.add_argument('--endpoint',default='https://becker63.buildbuddy.io')
    p.add_argument('--credential',required=True)
    p.add_argument('--inbox',required=True)
    p.add_argument('--metrics',required=True)
    a=p.parse_args()
    print('Exported',collect(Client(a.endpoint,a.credential),a.inbox,a.metrics,a.repository),'execution receipts; scientific artifact completeness not asserted')
