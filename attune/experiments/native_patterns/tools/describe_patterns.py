"""Post-seal descriptive reductions; never feeds prediction or selection."""
from pathlib import Path
from fractions import Fraction as F
import argparse
import collections
import json

p = argparse.ArgumentParser()
p.add_argument('--experiment', type=Path, required=True)
p.add_argument('--payloads', type=Path, required=True)
a = p.parse_args()
o = a.experiment
assert (o / 'selection-seal.json').exists()
cs = json.loads((o / 'tables/configuration-performance.json').read_text())
config = {c['id']: c for c in cs}
patterns = json.loads((o / 'patterns.json').read_text())
def metric(c, m='Recall@10'):
    return F(*map(int, c['paired_completed']['metrics'][m]['repository_macro']['exact']))
def key(c):
    return (-metric(c), -metric(c, 'MRR@10'), c['cost'], c['id'])
best = min((c for c in cs if c['pattern']), key=key)
rows = []
for pattern in patterns:
    variants = [c for c in cs if c['pattern'] == pattern['name']]
    if not variants:
        rows.append({'pattern': pattern['name'], 'state': 'RejectedCap'})
    else:
        winner = min(variants, key=key)
        rows.append({'pattern': pattern['name'], 'state': 'Completed', 'best_descriptive_config': winner['id'], 'best_paired_recall10': float(metric(winner)),
                     'paired_delta_qwen': float(metric(winner) - metric(config['Qwen'])), 'task_changes': winner['paired_recall_changes'],
                     'tasks_with_support': winner['nonempty_support_tasks'], 'cost_primitive_atoms': winner['cost'], 'selection': 'Hindsight descriptive best among frozen variants, not OOF'})
(o / 'tables/pattern-performance.json').write_text(json.dumps(rows, indent=2) + '\n')
panel = ['Qwen', 'StudioCurrent', best['id'], 'DirectImport.5.votes.fixed', 'DirectImport.5.votes.expansion', 'SharedCallee.5.normalized.fixed', 'SameCaller.5.normalized.fixed.agreement2', 'SameFileDistinctCallers.3.votes.fixed']
evaluations = [json.loads(f.read_text()) for f in sorted(a.payloads.glob('eval_*.json')) if '_fixture-' not in f.name and '_scratch_' not in f.name]
eligible = [r for r in evaluations if r[2] == 'eligible-gold' and r[3] > 0]
paired = [r for r in eligible if next(x[3] for x in r[4] if x[0] == 'StudioCurrent') == 'Completed']
index = {r[0]: {c: dict(ms) for c, ms, _, _, _ in r[4]} for r in eligible}
def value(t, c, m):
    return F(*map(int, index[t][c][m]))
def mean(values):
    v = list(values)
    return sum(v, F()) / len(v)
repo_rows, changes, per_task = [], [], []
for c in panel:
    totals = [0, 0, 0]
    for task in paired:
        t, g, _, n, data = task
        row = next(r for r in data if r[0] == c)
        totals = [a + len(b) for a, b in zip(totals, row[2])]
        per_task.append({'task': t, 'group': g, 'config': c, 'gold_count': n, 'delta_recall10': float(value(t, c, 'Recall@10') - value(t, 'Qwen', 'Recall@10')),
                         'gold_added': row[2][0], 'gold_displaced': row[2][1], 'non_gold_added': row[2][2]})
    changes.append({'config': c, 'population': '47 completed eligible tasks', 'gold_added': totals[0], 'gold_displaced': totals[1], 'non_gold_added': totals[2]})
    for g in sorted({r[1] for r in paired}):
        ts = [r[0] for r in paired if r[1] == g]
        delta = mean(value(t, c, 'Recall@10') - value(t, 'Qwen', 'Recall@10') for t in ts)
        repo_rows.append({'group': g, 'config': c, 'tasks': len(ts), 'delta': float(delta)})
for name, data in [('paired-pool-changes.json', changes), ('paired-pattern-repository-deltas.json', repo_rows), ('pattern-task-changes.json', per_task)]:
    (o / 'tables' / name).write_text(json.dumps(data, indent=2) + '\n')
print('Best individual descriptive pattern:', best['id'])
