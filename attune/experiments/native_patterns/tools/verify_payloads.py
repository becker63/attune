"""Offline verification of retained inputs and canonical produced payloads."""
from pathlib import Path
import argparse
import hashlib
import json

p = argparse.ArgumentParser()
p.add_argument('--experiment', type=Path, required=True)
p.add_argument('--payloads', type=Path, required=True)
a = p.parse_args()
def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
inputs = json.loads((a.experiment / 'input-manifest.json').read_text())['inputs']
for name, expected in inputs.items():
    assert digest(a.experiment / 'inputs' / name) == expected, ('input changed', name)
payloads = json.loads((a.experiment / 'cache-payload-seal.json').read_text())
for name, expected in payloads.items():
    assert digest(a.payloads / name) == expected['sha256'], ('payload changed', name)
print(f'ParityPass: {len(inputs)} frozen inputs and {len(payloads)} exact canonical payloads; no network or provider access')
