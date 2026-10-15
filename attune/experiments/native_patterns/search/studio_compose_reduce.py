"""Exact reduction of the frozen Studio-plus-rule comparison (no new scoring authority).

Metrics come from the existing Flix evaluator payload; this script only assembles
tables and checks laws (empty support, dedup, budgets) with exact fractions.
"""
import json, gzip, base64, sys
from fractions import Fraction
from collections import defaultdict
from pathlib import Path
import quality

scale = quality.scale
Q = quality.Q
COMP = Q / 'studio-composition'
METRICS = ['Recall@10', 'FileAcc@10', 'Hit@1', 'MRR@10']
DEV = ['eslint-plugin-ember', 'pino', 'tslint-to-eslint-config', 'create-typescript-app', 'firebase-tools', 'carbon', 'got', 'eslint-plugin-vue', 'community-server']
RES = ['eslint-plugin-react', 'renovate', 'serverless', 'spectral', 'greenwood']


def load(name):
    return scale.read(COMP / name)


def frac(pair):
    return Fraction(*map(int, pair))


def reduce_all():
    payload = load('studio-compose-payload.json')
    rows, diagnostics, checks = payload['rows'], payload['diagnostics'], payload['checks']
    evaluation = load('studio-compose-evaluation.json')
    records, rewards = evaluation
    tasks = {t['task']: t for t in json.load(open(quality.OLD / 'tasks.json')) if t['structural_completed'] and t['group'] in DEV + RES}
    panels = json.load(open(COMP / 'studio-compose-actions.json'))['panel']
    roles = {qid: (role, source_class) for qid, role, source_class in panels}
    labels = {}
    qmap = {}
    for task in tasks:
        raw = json.loads((Q / 'inputs' / ('label-' + task + '.json')).read_text())
        labels[task] = set(raw[0][3])
        qmap[task] = [p for p, _ in json.loads((Q / 'inputs' / ('q-' + task + '.json')).read_text())]
    baselines = scale.read(quality.OLD / 'verified-baselines.json')['rows']
    # ---- decode rows: metrics from the evaluator; rankings for gains/displacements
    values = {}
    for row in records:
        (task, repo, name, state, errors, vals, delta, gained, lost, support) = row[0]
        values[(name, task)] = {k: frac(v) for k, v in vals}
    # ---- correctness checks
    law_checks = {'studio_path_mismatches': [], 'studio_score_mismatches': 0, 'empty_support_exact': [], 'support_duplicates': [],
                  'pool_over_32': [], 'universe_changes': [], 'fallback_states': 0, 'invalid_rows': 0}
    studio_rows = {}
    d_rows = {}
    for task in tasks:
        for row in rows:
            t, identity, head, support, pairs, state, errors = row
            if t != task:
                continue
            if identity == 'StudioRetained':
                studio_rows[task] = row
            if identity.startswith('StudioPlus:'):
                d_rows.setdefault(task, {})[identity] = row
    for task, row in studio_rows.items():
        pass
    for task, dmap in d_rows.items():
        for identity, row in dmap.items():
            support = row[3]
            if len(support) > 0 and len({p for p, _ in support}) != len(support):
                law_checks['support_duplicates'].append((task, identity))
            if len(row[2]) > 32:
                law_checks['pool_over_32'].append((task, identity))
    for c in checks:
        task, paths_equal, score_diff, digest = c
        if not paths_equal:
            law_checks['studio_path_mismatches'].append(task)
        law_checks['studio_score_mismatches'] += score_diff
    # empty-support law over real data: tasks where a program supports nothing must return B exactly
    for task in tasks:
        srow = studio_rows[task]
        for identity, row in d_rows[task].items():
            if len(row[3]) == 0:
                if [r[:2] for r in row[2]] != [r[:2] for r in srow[2]]:
                    law_checks['empty_support_exact'].append((task, identity))
    # ---- B reproduction check: StudioRetained metrics vs retained verified baselines
    baseline_metrics = {}
    for r in baselines:
        if r['method'] == 'exact-path-v1.StudioCurrent' and r['task'] in tasks:
            baseline_metrics[r['task']] = {k: frac(v) for k, v in r['operational_metrics'] if k in METRICS}
    b_repro = []
    for task in tasks:
        for m in METRICS:
            if values[('StudioRetained', task)][m] != baseline_metrics[task][m]:
                b_repro.append((task, m))
    # ---- A/B/C/D table
    names = {'A': lambda qid: 'Qwen', 'B': lambda qid: 'StudioRetained',
             'C': lambda qid: 'QwenPlus:' + qid, 'D': lambda qid: 'StudioPlus:' + qid}
    repos = {t: tasks[t]['group'] for t in tasks}
    populations = {'development': [t for t in tasks if repos[t] in DEV], 'reserved': [t for t in tasks if repos[t] in RES]}
    table = []
    for qid, role, source_class in panels:
        entry = {'program': qid, 'role': role, 'source_class': source_class, 'populations': {}}
        for pop, task_ids in populations.items():
            repod = defaultdict(list)
            per_task = {}
            for t in sorted(task_ids):
                d = {k: values[(names['D'](qid), t)][k] - values[(names['B'](qid), t)][k] for k in METRICS}
                c = {k: values[(names['C'](qid), t)][k] - values[(names['A'](qid), t)][k] for k in METRICS}
                per_task[t] = {'D_minus_B': {k: [str(v.numerator), str(v.denominator)] for k, v in d.items()},
                               'C_minus_A': {k: [str(v.numerator), str(v.denominator)] for k, v in c.items()}}
                repod[repos[t]].append(d)
            macro = {k: sum((sum(x[k] for x in v) / len(v) for v in repod.values()), Fraction()) / len(repod) for k in METRICS}
            micro = {k: sum((x[k] for v in repod.values() for x in v), Fraction()) / sum(len(v) for v in repod.values()) for k in METRICS}
            entry['populations'][pop] = {'repository_macro_D_minus_B': {k: [str(v.numerator), str(v.denominator)] for k, v in macro.items()},
                                         'task_micro_D_minus_B': {k: [str(v.numerator), str(v.denominator)] for k, v in micro.items()},
                                         'per_task': per_task}
        table.append(entry)
    # ---- mechanism + gains/displacements per program/task
    mechanism = []
    for qid, role, source_class in panels:
        for pop, task_ids in populations.items():
            for t in sorted(task_ids):
                drow = d_rows[t].get('StudioPlus:' + qid)
                if drow is None:
                    continue
                diag = [d for d in diagnostics if d[0] == t and d[1] == 'StudioPlus:' + qid]
                witnesses = diag[0][2] if diag else []
                pairs = drow[4]
                head_paths = [qmap[t][i] for i, _ in drow[2]]
                support_paths = [qmap[t][i] for i, _ in drow[3]]
                srow = studio_rows[t]
                studio_head = [qmap[t][i] for i, _ in srow[2]]
                studio_top10 = set(studio_head[:10])
                d_top10 = set(head_paths[:10])
                studio_top32 = set(studio_head[:32])
                d_top32 = set(head_paths[:32])
                gold = labels[t]
                gained = sorted(gold & d_top10 - studio_top10)
                displaced = sorted(gold & studio_top10 - d_top10)
                added_non_gold = sorted(d_top10 - studio_top10 - gold)
                anchor_count = len({a for a, _ in pairs})
                top32_cross = sum(1 for _, _, _, sr, dr in witnesses if sr > 32 and 0 < dr <= 32)
                top10_cross = sum(1 for _, _, _, sr, dr in witnesses if sr > 10 and 0 < dr <= 10)
                gold_enter = [p for p, _, _, sr, dr in witnesses if p in gold and sr > 10 and 0 < dr <= 10]
                gold_leave = [p for p, _, _, sr, dr in witnesses if p in gold and 0 < sr <= 10 and (dr > 10 or dr == -1)]
                mechanism.append({'program': qid, 'role': role, 'source_class': source_class, 'population': pop, 'task': t,
                                  'repository': repos[t], 'fires': len(witnesses) > 0, 'supported_files': len(witnesses),
                                  'independent_anchors': anchor_count, 'gained_required_top10': gained,
                                  'displaced_required_top10': displaced, 'added_non_gold_top10': added_non_gold,
                                  'top32_crossings': top32_cross, 'top10_crossings': top10_cross,
                                  'required_enter_top10': gold_enter, 'required_leave_top10': gold_leave,
                                  'support_paths': support_paths,
                                  'witnesses': [[p, rr, float(ss), sr, dr] for p, rr, ss, sr, dr in witnesses]})
    result = {'treatment': 'D = retained exact-path-v1 Studio score + 0.5/(60+rank_rule) on rule-supported files; k=60, coefficient 0.5 frozen',
              'table': table, 'mechanism': mechanism,
              'law_checks': law_checks, 'studio_reproduction_vs_verified_baselines': b_repro,
              'checks': checks}
    scale.write(COMP / 'studio-compose-reduction.json', result)
    # summary print
    for e in table:
        for pop in ['development', 'reserved']:
            m = e['populations'][pop]['repository_macro_D_minus_B']
            print(pop, e['program'][:34], 'D-B macro', {k: float(frac(v)) for k, v in m.items()})
    print('law: empty-support violations', len(law_checks['empty_support_exact']), 'dupes', len(law_checks['support_duplicates']),
          'pool>32', len(law_checks['pool_over_32']), 'studio path mismatch', len(law_checks['studio_path_mismatches']),
          'studio score mismatch', law_checks['studio_score_mismatches'], 'B reproduction failures', len(b_repro))


if __name__ == '__main__':
    reduce_all()
