"""Frozen reserved comparison for quality-selected programs.

Reuse exact prior reserved answers where the canonical program identity matches;
evaluate only the uncovered development-selected programs with the existing
quality evaluation kernel. Reduction uses exact fractions; it is not an evaluator.
"""
import json, gzip, base64, hashlib, sys
from fractions import Fraction
from collections import defaultdict
import quality

scale = quality.scale
Q = quality.Q
OLD = quality.OLD
METRICS = quality.METRICS
RES_GROUPS = ['eslint-plugin-react', 'renovate', 'serverless', 'spectral', 'greenwood']


def reserved_tasks():
    tasks = [t for t in scale.read(OLD / 'tasks.json')
             if t['group'] in RES_GROUPS and t['structural_completed']]
    assert len(tasks) == 18 and len({t['group'] for t in tasks}) == 5
    return sorted(tasks, key=lambda t: t['task'])


def prior_reserved():
    value = scale.read(OLD / 'reserved-evaluations.json')
    if isinstance(value, list) and value and value[0] == 'gzip-base64-v1':
        value = json.loads(gzip.decompress(base64.b64decode(value[2])))
    return value


def baselines(tasks):
    rows = scale.read(OLD / 'verified-baselines.json')['rows']
    ids = {t['task'] for t in tasks}
    def arm(method):
        out = [[r['task'], r['repository'], quality.metric_values(r['operational_metrics'])]
               for r in rows if r['method'] == method and r['task'] in ids]
        assert len(out) == 18
        return out
    return arm('Qwen'), arm('exact-path-v1.StudioCurrent')


def evaluate():
    sel = scale.read(Q / 'selected-quality-programs.json')
    ids = [r[0] for r in sel]
    assert len(ids) == 12 and len(set(ids)) == 12
    prior = prior_reserved()
    covered = [q for q in ids if q in prior]
    todo = [q for q in ids if q not in prior]
    tasks = reserved_tasks()
    qwen, studio = baselines(tasks)
    studio_input = scale.assemble.put('q3-reserved-studio-metrics', studio)
    programs = [[q, [[int(v) for v in a] for a in q.split(';')]] for q in todo]
    shard_targets = []
    for i, task in enumerate(tasks):
        graph = 'graph-' + task['world']; q = 'q-' + task['task']
        identity = scale.read(Q / 'inputs' / (graph + '.json'))[0]
        inputs = {'planner': scale.assemble.put('q3_reserved_%d-planner' % i, 'fanout-v1'),
                  'programs': scale.assemble.put('q3_reserved-programs', programs),
                  'jobs': scale.assemble.put('q3_reserved_%d-jobs' % i, [[task['task'], identity, graph, q]]),
                  'unmeasured': scale.assemble.put('q3_reserved_%d-unmeasured' % i, scale.assemble.unmeasured([task])),
                  graph: '@native_campaign_inputs//:' + graph + '.json',
                  q: '@native_campaign_inputs//:' + q + '.json'}
        shard_targets.append(scale.assemble.target('q3_reserved_%d' % i, 'plan_predict_kernel', inputs, timeout=20 + 5 * len(programs)))
    aliases = {'s%d' % i: t for i, t in enumerate(shard_targets)}
    prediction = scale.assemble.target('q3_reserved_predictions', 'scale_merge_kernel',
                                       {**aliases, 'shards': scale.assemble.put('q3_reserved-shards', list(aliases))}, timeout=60)
    ev_inputs = {'predictions': prediction, 'programs': scale.assemble.put('q3_reserved-programs', programs),
                 'benefit': '@native_campaign_inputs//:benefit.json', 'studio': studio_input}
    jobs = []
    for task in tasks:
        q = 'q-' + task['task']; label = 'label-' + task['task']
        jobs.append([task['task'], task['group'], q, label])
        ev_inputs[q] = '@native_campaign_inputs//:' + q + '.json'
        ev_inputs[label] = '@native_campaign_inputs//:' + label + '.json'
    ev_inputs['jobs'] = scale.assemble.put('q3_reserved-evaluation-jobs', jobs)
    evaluation = scale.assemble.target('q3_reserved_evaluation', 'quality_evaluation_kernel', ev_inputs, timeout=120)
    scale.TASKS = tasks
    quality.flush()
    scale.write(Q / 'reserved-actions.json', {
        'tasks': [t['task'] for t in tasks], 'reuse': covered, 'new': todo,
        'targets': ['//experiments/native_patterns/search' + evaluation],
        'contract': 'Unchanged fanout-v1, five anchors, normalized support, RRF60, pool32/top10; frozen program evaluation, no search feedback'})
    success = scale.build('q3-reserved', [evaluation])
    name = evaluation[1:]
    payload = scale.read(scale.B / (name + '.json'))
    records, rewards = payload
    scale.write(Q / 'reserved-new-responses.json', {'todo': todo, 'records': records, 'rewards': rewards,
                                                    'build_success': sorted(success)})
    reduce_all(prior, records, tasks, qwen, studio)
    print('Reserved comparison complete:', len(ids), 'programs;', len(covered), 'reused;', len(todo), 'new')


def utility(values):
    d = {k: Fraction(*map(int, v)) for k, v in values}
    return d['Recall@10'] / 2 + d['FileAcc@10'] / 5 + d['Hit@1'] / 5 + d['MRR@10'] / 10


def reduce_all(prior, records, tasks, qwen, studio):
    task_ids = [t['task'] for t in tasks]
    repos = {t['task']: t['group'] for t in tasks}
    qu = {t: utility(v) for t, r, v in qwen}
    su = {t: utility(v) for t, r, v in studio}
    by_program = defaultdict(dict)
    for row in records:
        (task, repo, name, state, errors, values, delta, gained, lost, support) = row[0]
        if state == 'Completed':
            by_program[name][task] = {'values': values, 'delta_qwen': delta, 'gained': gained, 'lost': lost,
                                      'support': support, 'state': state}
    # Prior answers are complete reserved panels; treat missing as censored, never zero.
    reused, new = [], []
    table = []
    sel = scale.read(Q / 'selected-quality-programs.json')
    for entry in sel:
        qid, atoms = entry[0], len(entry[1])
        rows = {}
        source = None
        if qid in prior:
            rows = {r[0][0]: {'values': r[0][5], 'delta_qwen': r[0][6], 'gained': r[0][7], 'lost': r[0][8],
                              'support': r[0][9], 'state': r[0][3]} for r in prior[qid]['records']}
            source = 'ReusedPriorReserved'; reused.append(qid)
        else:
            rows = by_program.get(qid, {})
            source = 'FreshQualityKernel'; new.append(qid)
        complete = sorted(rows.keys()) == sorted(task_ids) and all(rows[t]['state'] == 'Completed' for t in task_ids)
        groups = defaultdict(list)
        groups_q = defaultdict(list)
        for t in task_ids:
            r = rows.get(t)
            if not r or r['state'] != 'Completed':
                continue
            u = utility([(k, v) for k, v in r['values']])
            groups[repos[t]].append(u - su[t])
            groups_q[repos[t]].append(u - qu[t])
        if not complete or len(groups) != 5:
            table.append({'program': qid, 'atoms': atoms, 'source': source, 'state': 'Incomplete',
                          'covered_tasks': len(rows)})
            continue
        gain = sum((sum(v, Fraction()) / len(v)) for v in groups.values()) / 5
        harm = sum((sum(max(-d, Fraction()) for d in v) / len(v)) for v in groups.values()) / 5
        r3 = gain - harm / 2 - Fraction(atoms, 500)
        gain_q = sum((sum(v, Fraction()) / len(v)) for v in groups_q.values()) / 5
        harm_q = sum((sum(max(-d, Fraction()) for d in v) / len(v)) for v in groups_q.values()) / 5
        recall_delta = sum((sum(Fraction(*map(int, rows[t]['delta_qwen'][1])) for t in task_ids if repos[t] == r) / len([t for t in task_ids if repos[t] == r])) for r in groups) / 5
        beat_studio = any(utility([(k, v) for k, v in rows[t]['values']]) > su[t] for t in task_ids)
        hit1_harm = sum(1 for t in task_ids if rows[t]['gained'] == [] and rows[t]['lost'] != [])
        table.append({'program': qid, 'atoms': atoms, 'source': source, 'state': 'Complete',
                      'r3_reserved': [str(r3.numerator), str(r3.denominator)],
                      'gain_vs_studio': [str(gain.numerator), str(gain.denominator)],
                      'harm_vs_studio': [str(harm.numerator), str(harm.denominator)],
                      'gain_vs_qwen': [str(gain_q.numerator), str(gain_q.denominator)],
                      'harm_vs_qwen': [str(harm_q.numerator), str(harm_q.denominator)],
                      'mean_recall_delta_vs_qwen': [str(recall_delta.numerator), str(recall_delta.denominator)],
                      'beats_studio_on_any_task': beat_studio,
                      'displacement_tasks': hit1_harm,
                      'records': {t: rows[t] for t in task_ids}})
    scale.write(Q / 'reserved-quality-table.json', {'rows': table, 'scope': 'Reserved panel diagnostic only; not a pristine holdout and never a selection input.'})
    # Oracle diagnostic: per-task best program utility vs Studio (upper bound, not deployable).
    oracle = []
    for t in task_ids:
        best = max(((utility([(k, v) for k, v in r['records'][t]['values']]), r['program']) for r in table
                    if r['state'] == 'Complete'), default=None)
        if best:
            oracle.append({'task': t, 'repository': repos[t], 'studio_utility': [str(su[t].numerator), str(su[t].denominator)],
                           'best_program': best[1], 'best_utility': [str(best[0].numerator), str(best[0].denominator)]})
    scale.write(Q / 'reserved-oracle-diagnostic.json', {'rows': oracle, 'scope': 'Oracle chooses the best program per task independently; diagnostic only, never a deployable policy.'})
    print('Reduced:', len(reused), 'reused,', len(new), 'fresh;',
          sum(1 for r in table if r['state'] == 'Complete' and Fraction(*map(int, r['r3_reserved'])) > 0), 'positive reserved R3')


if __name__ == '__main__':
    if sys.argv[1] == 'run':
        evaluate()
    elif sys.argv[1] == 'reduce':
        prior = prior_reserved()
        tasks = reserved_tasks()
        qwen, studio = baselines(tasks)
        payload = scale.read(Q / 'reserved-new-responses.json')
        reduce_all(prior, payload['records'], tasks, qwen, studio)
