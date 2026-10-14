"""Validate prediction artifacts without labels, then seal their exact bytes."""
from pathlib import Path
import argparse
import collections
import datetime
import hashlib
import json
import math

p = argparse.ArgumentParser()
p.add_argument('--experiment', type=Path, required=True)
p.add_argument('--payloads', type=Path, required=True)
a = p.parse_args()
configs = {c['id']: c for c in json.loads((a.experiment / 'configs.json').read_text())}
tasks = json.loads((a.experiment / 'inputs/metric-tasks.json').read_text())
rows = []
states = collections.Counter()
for task in tasks:
    qfile = a.payloads / ('q_' + task + '.json')
    prediction = a.payloads / ('unavailable_' + task + '.json')
    if not prediction.exists():
        prediction = a.payloads / ('predict_' + task + '.json')
    baseline = json.loads(qfile.read_text())
    predictions = json.loads(prediction.read_text())
    paths = [p for p, _ in baseline]
    universe = set(paths)
    assert len(paths) == len(universe)
    assert {r[0] for r in predictions} == set(configs)
    assert len(predictions) == len(configs)
    for config, ranking, pool, support, state, reasons in predictions:
        states[state] += 1
        if state != 'Completed':
            assert not ranking and not pool and reasons, (task, config)
            continue
        ranked = [p for p, _ in ranking]
        assert len(ranked) == len(paths) and set(ranked) == universe, (task, config, 'universe')
        assert pool == ranked[:32] and len(pool) <= 32
        assert all(s is None or math.isfinite(s) for _, s in ranking)
        assert all(math.isfinite(s) for _, s in support)
        mode = configs[config]['mode']
        if mode in ('baseline', 'identity'):
            assert ranking == baseline
        if mode == 'fixed':
            assert set(pool) == set(paths[:32]) and ranking[32:] == baseline[32:]
        if mode in ('fixed', 'expansion') and not support:
            assert ranking == baseline, (task, config, 'empty fallback')
    files = [qfile, prediction]
    match = a.payloads / ('match_' + task + '.json')
    if match.exists():
        files.append(match)
    rows.append({'task': task, 'files': [{'name': f.name, 'sha256': hashlib.sha256(f.read_bytes()).hexdigest(), 'bytes': f.stat().st_size} for f in files]})
payload = {'tasks': len(tasks), 'configurations': len(configs), 'states': dict(states), 'records': rows,
           'validation': 'Exact universe, finite scores, pool budget, fixed-pool/tail identity, empty-pattern fallback, typed failures; no labels read.'}
encoded = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()
seal = a.experiment / 'prediction-seal.json'
if seal.exists():
    assert json.loads(seal.read_text()) == payload, 'Sealed prediction bytes changed'
else:
    seal.write_bytes(encoded + b'\n')
    (a.experiment / 'provenance/prediction-seal-receipt.json').write_text(json.dumps({'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'payload_sha256': hashlib.sha256(encoded).hexdigest()}, indent=2) + '\n')
print(json.dumps({k: v for k, v in payload.items() if k != 'records'}))
