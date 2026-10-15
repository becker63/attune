"""Bounded read-only BuildBuddy RPC client; tokens remain in runtime files."""
import argparse
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request


class Client:
    def __init__(self, endpoint, credential):
        if urllib.parse.urlparse(endpoint).scheme != 'https':
            raise ValueError('BuildBuddy requires HTTPS')
        self.endpoint = endpoint.rstrip('/')
        p = Path(credential)
        if p.stat().st_mode & 0o077:
            raise ValueError('credential file must be owner-private')
        self.token = p.read_text().strip().removeprefix('Bearer ')

    def rpc(self, method, payload):
        if method not in ('SearchInvocation', 'GetInvocation', 'GetExecution', 'GetLog', 'GetTarget'):
            raise ValueError('RPC outside read-only allowlist')
        prefix = '/api/v1/' if method in ('GetLog', 'GetTarget') else '/rpc/BuildBuddyService/'
        req = urllib.request.Request(self.endpoint + prefix + method, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'x-buildbuddy-api-key': self.token})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read(3_000_001)
                if len(data) > 3_000_000 or self.token.encode() in data:
                    raise ValueError('oversized or credential-reflecting provider response')
                return json.loads(data)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f'{method}: HTTP {e.code}') from None
        except urllib.error.URLError:
            raise RuntimeError(f'{method}: network unavailable') from None

    def probe(self):
        result = self.rpc('SearchInvocation', {'query': {}, 'count': 1})
        rows = result.get('invocation', [])
        status = {'search': 'PASS', 'accessible_invocations_in_probe': len(rows), 'execution': 'NOT RUN', 'logs': 'NOT RUN', 'cas_artifact_bytes': 'NOT RUN', 'cpu_heap_profiles': 'NOT RUN', 'cpu_heap_profiles_reason': 'Per-action CPU/heap profile availability was not established by this bounded API probe'}
        if rows:
            identity = rows[0]['invocationId']
            for method, field, payload in [('GetExecution', 'execution', {'execution_lookup': {'invocation_id': identity}}), ('GetLog', 'logs', {'selector': {'invocation_id': identity}})]:
                try:
                    self.rpc(method, payload)
                    status[field] = 'PASS'
                except RuntimeError as e:
                    status[field] = str(e)
        return status


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--endpoint', default='https://becker63.buildbuddy.io')
    p.add_argument('--credential', required=True)
    args = p.parse_args()
    print(json.dumps(Client(args.endpoint, args.credential).probe(), indent=2))
