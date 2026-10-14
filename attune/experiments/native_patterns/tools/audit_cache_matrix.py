"""Compare observed action boundaries and preserved payload identities."""
from pathlib import Path
import argparse
import collections
import json

p = argparse.ArgumentParser()
p.add_argument('--experiment', type=Path, required=True)
a = p.parse_args(); o = a.experiment
baseline = {}
for tag in ['witness-repair-primary', 'warm-primary-scratch']:
    for row in json.loads((o / ('tables/actions-' + tag + '.json')).read_text())['rows']:
        if row['exit_code'] == 0:
            baseline[row['target']] = row
mutated = json.loads((o / 'tables/actions-scratch-mutated-report.json').read_text())['rows']
rollback = json.loads((o / 'tables/actions-recompute-rollback.json').read_text())['rows']
expected = json.loads((o / 'scratch-manifest.json').read_text())['expected_invalidation']
rows = []
for case in ['base', 'rule', 'scoring', 'body', 'import', 'filename', 'ambiguity', 'ranking', 'label']:
    observed = sorted(r['stage'] for r in mutated if r['target'].endswith('_scratch_' + case))
    wanted = sorted(expected.get(case, []))
    assert observed == wanted, (case, observed, wanted)
    changes = [r for r in mutated if r['target'].endswith('_scratch_' + case)]
    assert all(r['action_sha256'] != baseline[r['target']]['action_sha256'] for r in changes)
    restored = [r for r in rollback if r['target'].endswith('_scratch_' + case)]
    assert all(r['action_sha256'] == baseline[r['target']]['action_sha256'] and r['cache_hit'] for r in restored)
    rows.append({'mutation': case, 'expected_stages': wanted, 'observed_stages': observed, 'state': 'ParityPass', 'rollback_cached_actions': len(restored)})
for r in mutated:
    if r['stage'] == 'probe':
        case = r['target'].split('probe_')[1]
        assert r['exit_code'] == (0 if case == 'vector' else 1)
        rows.append({'mutation': 'saved-' + case, 'state': 'ParityPass', 'observed_result': 'Valid authored counterfactual vector' if case == 'vector' else 'Explicit replay refusal', 'action_sha256': r['action_sha256']})
before = json.loads((o / 'provenance/scratch-backup.json').read_text())['outputs']
after = json.loads((o / 'tables/scratch-mutated-outputs.json').read_text())
assert before['predict_scratch_label.json'] == after['predict_scratch_label.json']
assert before['extract_scratch_label.json'] == after['extract_scratch_label.json']
assert before['eval_scratch_label.json'] != after['eval_scratch_label.json']
for name in ['body', 'import', 'filename', 'ambiguity']:
    assert before['admit_scratch_' + name + '.json'] != after['admit_scratch_' + name + '.json']
(o / 'tables/invalidation-matrix.json').write_text(json.dumps({'state': 'ParityPass', 'rows': rows, 'label_boundary': 'Only evaluator action and output changed', 'admission_boundary': 'Whole-world admission changed, including name ambiguity; no file-local admission claim'}, indent=2) + '\n')
print('ParityPass: action digests, stage boundaries, rollback cache keys, and label isolation')
