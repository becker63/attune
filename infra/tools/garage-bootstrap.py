"""Reconcile initial Garage layout once; later membership changes need review."""
import argparse
import json
from pathlib import Path
import subprocess
import time


def cli(*args):
    return subprocess.check_output(['garage', *args], text=True, timeout=15)


def bootstrap(inventory, marker, capacity):
    expected = {name: h for name, h in inventory.items() if 'garage' in h['roles']}
    if len(expected) != 3 or any(h['garageId'] is None or h.get('garageCapacity') is None for h in expected.values()):
        raise ValueError('all three verified Garage public IDs and measured capacities must be enrolled')
    desired = {name: dict(id=h['garageId'], capacity=h['garageCapacity']) for name, h in expected.items()}
    body = json.dumps(desired, sort_keys=True)
    marker = Path(marker)
    if marker.exists():
        if marker.read_text() != body:
            raise ValueError('layout identity changed; use reviewed replacement procedure')
        cli('health', '-q')
        return
    # Refuse to modify an existing nonempty layout or an unrelated cluster.
    layout = json.loads(cli('json-api', 'GetClusterLayout'))
    if layout.get('version', 0) != 0 or layout.get('roles'):
        raise ValueError('nonempty layout without local completion marker; inspect and adopt manually')
    local = cli('node','id','-q').strip().split('@')[0]
    for name, h in expected.items():
        if h['garageId'] == local:
            continue
        cli('node', 'connect', h['garageId'] + '@' + h['address'] + ':3901')
    for name, h in expected.items():
        cli('layout', 'assign', '-z', name, '-c', str(h['garageCapacity']), h['garageId'])
    cli('layout', 'apply', '--version', '1')
    for attempt in range(20):
        try:
            cli('health', '-q')
            break
        except subprocess.CalledProcessError:
            if attempt == 19:
                raise
            time.sleep(0.5)
    marker.parent.mkdir(parents=True, exist_ok=True)
    temporary = marker.with_suffix('.tmp')
    temporary.write_text(body)
    temporary.replace(marker)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('inventory')
    p.add_argument('--marker', default='/data/garage/bootstrap.json')
    args = p.parse_args()
    bootstrap(json.loads(Path(args.inventory).read_text()), args.marker, None)
