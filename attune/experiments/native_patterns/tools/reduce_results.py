"""Evaluator-only independent metric checks and descriptive report reductions."""
from pathlib import Path
from fractions import Fraction as F
import argparse
import collections
import hashlib
import json

p = argparse.ArgumentParser()
p.add_argument('--experiment', type=Path, required=True)
p.add_argument('--payloads', type=Path, required=True)
a = p.parse_args()
o, payloads = a.experiment, a.payloads
assert (o / 'prediction-seal.json').exists() and (o / 'selection-seal.json').exists()
configs = {c['id']: c for c in json.loads((o / 'configs.json').read_text())}
labels = {t: (g, s, set(gold)) for t, g, s, gold in json.loads((o / 'inputs/labels.json').read_text())}
tasks = json.loads((o / 'inputs/metric-tasks.json').read_text())
metrics = ['Hit@1', 'Hit@5', 'Hit@10', 'Recall@1', 'Recall@5', 'Recall@10', 'MRR@10', 'FileAcc@10', 'FileAcc@32', 'Recall@32']
metric_index, states, pools, support_counts = {}, {}, {}, {}
task_rows, score_shapes = [], []
def fraction(pair):
    return None if pair is None else F(int(pair[0]), int(pair[1]))
def mean(values):
    values = list(values)
    return sum(values, F()) / len(values) if values else None
def dump(name, value):
    (o / 'tables' / name).write_text(json.dumps(value, indent=2) + '\n')
def wire(v):
    return {'exact': [str(v.numerator), str(v.denominator)], 'value': float(v)} if v is not None else None
for task in tasks:
    group, status, gold = labels[task]
    f = payloads / ('unavailable_' + task + '.json')
    if not f.exists():
        f = payloads / ('predict_' + task + '.json')
    predictions = json.loads(f.read_text())
    evaluated = json.loads((payloads / ('eval_' + task + '.json')).read_text())
    assert evaluated[:4] == [task, group, status, len(gold)]
    native = {c: (dict(m), changes, state, reasons) for c, m, changes, state, reasons in evaluated[4]}
    base_pool = set(next(r[2] for r in predictions if r[0] == 'Qwen'))
    metric_index[task], states[task], pools[task], support_counts[task] = {}, {}, {}, {}
    for config, ranking, pool, support, state, reasons in predictions:
        paths = [p for p, _ in ranking]
        results = {}
        for metric in metrics:
            family, k = metric.split('@'); k = int(k)
            recovered = gold & set(paths[:k])
            if not gold:
                value = None
            elif family == 'Hit':
                value = F(bool(recovered))
            elif family == 'Recall':
                value = F(len(recovered), len(gold))
            elif family == 'FileAcc':
                value = F(gold <= set(paths[:k]))
            else:
                value = next((F(1, i + 1) for i, path in enumerate(paths[:k]) if path in gold), F())
            assert fraction(native[config][0][metric]) == value, (task, config, metric)
            results[metric] = value
        added, displaced = set(pool) - base_pool, base_pool - set(pool)
        changes = [sorted(added & gold), sorted(displaced & gold), sorted(added - gold)]
        assert [sorted(x) for x in native[config][1]] == changes
        assert native[config][2:] == (state, reasons)
        metric_index[task][config] = results
        states[task][config], pools[task][config], support_counts[task][config] = state, changes, len(support)
        if config in ('Qwen', 'StudioCurrent'):
            values = [s for _, s in ranking[:10] if s is not None]
            score_shapes.append({'task': task, 'config': config, 'state': state, 'top10_scores': values, 'scale': 'cosine' if config == 'Qwen' else 'RRF k=60'})
    task_rows.append({'task': task, 'group': group, 'status': status, 'gold_count': len(gold), 'source_state': states[task]['StudioCurrent'], 'candidate_count': len(next(r[1] for r in predictions if r[0] == 'Qwen'))})

eligible = [t for t in tasks if labels[t][1] == 'eligible-gold' and labels[t][2]]
paired = [t for t in eligible if states[t]['StudioCurrent'] == 'Completed']
groups = sorted({labels[t][0] for t in eligible})
def group_values(config, metric, population):
    return {g: mean(metric_index[t][config][metric] for t in population if labels[t][0] == g) for g in sorted({labels[t][0] for t in population})}
def aggregate(config, metric, population):
    return mean(metric_index[t][config][metric] for t in population), mean(group_values(config, metric, population).values())
def key(config, population):
    return (-aggregate(config, 'Recall@10', population)[1], -aggregate(config, 'MRR@10', population)[1], configs[config]['cost'], config)
native_summary = json.loads((payloads / 'summary.json').read_text())
assert native_summary[:2] == [len(eligible), len(groups)]
selection = json.loads((o / 'selection-seal.json').read_text())
assert native_summary[2] == selection[2]
selections = {}
for group, choice, recall, mrr in selection[2]:
    training = [t for t in eligible if labels[t][0] != group]
    expected = min(configs, key=lambda c: key(c, training))
    assert choice == expected, (group, choice, expected)
    assert fraction(recall) == aggregate(choice, 'Recall@10', training)[1]
    assert fraction(mrr) == aggregate(choice, 'MRR@10', training)[1]
    selections[group] = choice
for config, metric, micro, macro in native_summary[3]:
    assert (fraction(micro), fraction(macro)) == aggregate(config, metric, eligible)
for group, rows in native_summary[4]:
    for config, metric, value in rows:
        assert fraction(value) == group_values(config, metric, eligible)[group]

descriptive = []
for config in configs:
    row = dict(configs[config])
    row['states'] = dict(collections.Counter(states[t][config] for t in eligible))
    row['nonempty_support_tasks'] = sum(support_counts[t][config] > 0 for t in paired)
    for name, population in [('all_eligible', eligible), ('paired_completed', paired), ('single_file', [t for t in eligible if len(labels[t][2]) == 1]), ('multi_file', [t for t in eligible if len(labels[t][2]) > 1])]:
        row[name] = {'tasks': len(population), 'groups': len({labels[t][0] for t in population}), 'metrics': {m: dict(zip(['task_micro', 'repository_macro'], map(wire, aggregate(config, m, population)))) for m in metrics}}
    row['pool_changes'] = {name: sum(len(pools[t][config][i]) for t in eligible) for i, name in enumerate(['gold_added', 'gold_displaced', 'non_gold_added'])}
    row['paired_recall_changes'] = dict(collections.Counter('improved' if metric_index[t][config]['Recall@10'] > metric_index[t]['Qwen']['Recall@10'] else 'harmed' if metric_index[t][config]['Recall@10'] < metric_index[t]['Qwen']['Recall@10'] else 'unchanged' for t in paired))
    descriptive.append(row)
dump('configuration-performance.json', descriptive)
dump('task-population.json', task_rows)
dump('score-shapes.json', score_shapes)
best = min(configs, key=lambda c: key(c, eligible))
best_paired = min(configs, key=lambda c: key(c, paired))
simple = [c for c in configs if configs[c]['pattern'] in ('', 'DirectImport', 'DirectImporter')]
best_simple = min(simple, key=lambda c: key(c, paired))
panel = list(dict.fromkeys(['Qwen', 'StudioCurrent', best_paired, best_simple, 'SharedCallee.5.normalized.expansion', 'SameCaller.5.votes.expansion', 'SameFileDistinctCallers.5.votes.expansion']))
repo_rows = []
for config in panel:
    for popname, population in [('all_eligible', eligible), ('paired_completed', paired)]:
        q = group_values('Qwen', 'Recall@10', population)
        for group, value in group_values(config, 'Recall@10', population).items():
            repo_rows.append({'config': config, 'population': popname, 'group': group, 'tasks': sum(labels[t][0] == group for t in population), 'recall10': wire(value), 'qwen': wire(q[group]), 'delta': wire(value - q[group])})
dump('repository-deltas.json', repo_rows)
oof = {}
for m in metrics:
    by_group = {g: mean(metric_index[t][selections[g]][m] for t in eligible if labels[t][0] == g) for g in groups}
    oof[m] = {'task_micro': wire(mean(metric_index[t][selections[labels[t][0]]][m] for t in eligible)), 'repository_macro': wire(mean(by_group.values()))}
oracle_tasks = {t: min(configs, key=lambda c: (-metric_index[t][c]['Recall@10'], -metric_index[t][c]['MRR@10'], configs[c]['cost'], c)) for t in eligible}
oracle_repos = {g: min(configs, key=lambda c: key(c, [t for t in eligible if labels[t][0] == g])) for g in groups}
dump('oracle-headroom.json', {'label': 'Hindsight oracle, not a deployable selector', 'task_choices': oracle_tasks, 'repository_choices': oracle_repos,
    'task_oracle_repository_macro_recall10': wire(mean(mean(metric_index[t][oracle_tasks[t]]['Recall@10'] for t in eligible if labels[t][0] == g) for g in groups)),
    'repository_oracle_macro_recall10': wire(mean(group_values(oracle_repos[g], 'Recall@10', eligible)[g] for g in groups))})
delta = [r['delta']['value'] for r in repo_rows if r['config'] == best_paired and r['population'] == 'paired_completed']
summary = {'state': 'ParityPass', 'independent_metric_comparisons': len(tasks) * len(configs) * len(metrics), 'eligible_tasks': len(eligible), 'repository_groups': len(groups),
    'paired_tasks': len(paired), 'paired_groups': len({labels[t][0] for t in paired}), 'best_all_eligible': best, 'best_paired_descriptive': best_paired, 'strongest_simple_paired': best_simple,
    'out_of_fold': oof, 'selection_counts': dict(collections.Counter(selections.values())),
    'paired_best_repository_sensitivity': {'improved': sum(x > 0 for x in delta), 'harmed': sum(x < 0 for x in delta), 'unchanged': sum(x == 0 for x in delta), 'leave_one_group_out_mean_delta_range': [min((sum(delta) - x) / (len(delta) - 1) for x in delta), max((sum(delta) - x) / (len(delta) - 1) for x in delta)]},
    'no_pristine_holdout': 'Grouped validation on previously exposed data. Descriptive best is outcome selected.', 'tasks_more_than_ten_gold': [t for t in eligible if len(labels[t][2]) > 10]}
dump('evaluation-verification.json', summary)
print(json.dumps(summary, indent=2))
