"""Frozen Studio-plus-rule composition (treatment D) driver.

Reuses the retained exact-path-v1 Studio rankings (digest-verified) and the
existing native owners: Kernel.prepare/Planner.pairs for support, Rank.support
for normalization, Rank.ranking for treatment C, StudioCompose.compose for D.
No labels enter any prediction action.
"""
import json, gzip, base64, hashlib, os, sys
from pathlib import Path
from fractions import Fraction
import quality

scale = quality.scale
Q = quality.Q
OLD = quality.OLD
COMP = Q / 'studio-composition'
AGREE = Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2')
DEV = ['eslint-plugin-ember', 'pino', 'tslint-to-eslint-config', 'create-typescript-app', 'firebase-tools', 'carbon', 'got', 'eslint-plugin-vue', 'community-server']
RES = ['eslint-plugin-react', 'renovate', 'serverless', 'spectral', 'greenwood']

# Frozen eight-program panel, chosen from development-only evidence (see report).
PANEL = [
    ('010;021', 'ember-reverse-import-shared-consumer', 'source-supported'),
    ('010;020;021', 'import-triangle', 'source-supported'),
    ('010;301', 'simple-reverse-import-control', 'source-supported'),
    ('010;021;123;301', 'import-chain-with-defines', 'source-supported'),
    ('001;002;010', 'low-harm', 'source-supported'),
    ('002;012;301', 'harmful-negative-control', 'source-supported'),
    ('020;021', 'r3-selected-common-consumer', 'source-supported'),
    ('103;104;113;115;116;235;243;256;335;356', 'r3-selected-best-call-based', 'diagnostic-nominal-calls'),
]


def tasks():
    all_tasks = {t['task']: t for t in json.load(open(OLD / 'tasks.json')) if t['structural_completed'] and t['group'] in DEV + RES}
    assert len(all_tasks) == 47
    return all_tasks


def studio_rankings():
    manifest = {x['name']: x for x in json.load(open(AGREE / 'payload-manifest.json'))}
    def load(name):
        x = manifest[name]
        raw = gzip.decompress((AGREE / x['path']).read_bytes())
        assert hashlib.sha256(raw).hexdigest() == x['raw_sha256']
        return json.loads(raw)
    out = {}
    for task in tasks():
        payload = load('predict_' + task + '.json')
        arm = [p for p in payload[4] if p[0] == 'exact-path-v1.StudioCurrent'][0]
        _, ranking, pool, _, state, _ = arm
        assert state == 'Completed'
        ev = load('evaluate_' + task + '.json')[0]
        evarm = [a for a in ev[7] if a[0] == 'exact-path-v1.StudioCurrent'][0]
        digest = hashlib.sha256(json.dumps([[p for p, _ in ranking], pool], separators=(',', ':')).encode()).hexdigest()
        assert digest == evarm[8], ('Studio ranking digest mismatch', task)
        out[task] = [[p, s] for p, s in ranking]
    return out


def assemble():
    COMP.mkdir(exist_ok=True)
    all_tasks = tasks()
    studios = studio_rankings()
    jobs = []
    for task, meta in sorted(all_tasks.items()):
        world = meta['world']
        studio_name = 'studio-' + task
        scale.assemble.put(studio_name, studios[task])
        jobs.append([task, json.loads((Q / 'inputs' / ('graph-' + world + '.json')).read_text())[0], 'graph-' + world, 'q-' + task, studio_name])
    programs = []
    for qid, role, source_class in PANEL:
        programs.append([qid, [[int(v) for v in a] for a in qid.split(';')]])
    p_input = scale.assemble.put('studio_compose-programs', programs)
    j_input = scale.assemble.put('studio_compose-jobs', jobs)
    unmeasured = scale.assemble.put('studio_compose-unmeasured', scale.assemble.unmeasured(sorted(all_tasks.values(), key=lambda t: t['task'])))
    rows = scale.read(OLD / 'verified-baselines.json')['rows']
    metric_values = quality.metric_values
    studio_metrics = [[r['task'], r['repository'], metric_values(r['operational_metrics'])] for r in rows if r['method'] == 'exact-path-v1.StudioCurrent' and r['task'] in all_tasks]
    assert len(studio_metrics) == 47
    s_input = scale.assemble.put('studio_compose-studio-metrics', studio_metrics)
    ev_jobs = []
    for task, meta in sorted(all_tasks.items()):
        ev_jobs.append([task, meta['group'], 'q-' + task, 'label-' + task])
    ej_input = scale.assemble.put('studio_compose-evaluation-jobs', ev_jobs)
    compose_inputs = {'jobs': j_input, 'programs': p_input, 'unmeasured': unmeasured, 'mode': scale.assemble.put('studio_compose-mode-rows', 'rows')}
    for task, meta in sorted(all_tasks.items()):
        world = meta['world']
        compose_inputs['graph-' + world] = '@native_campaign_inputs//:graph-' + world + '.json'
        compose_inputs['q-' + task] = '@native_campaign_inputs//:q-' + task + '.json'
        compose_inputs['studio-' + task] = '@native_campaign_inputs//:studio-' + task + '.json'
    compose = scale.assemble.target('studio_compose', 'studio_compose_kernel', compose_inputs, timeout=600)
    diagnostics_inputs = {**compose_inputs, 'mode': scale.assemble.put('studio_compose-mode-diagnostics', 'diagnostics')}
    diagnostics = scale.assemble.target('studio_compose_diagnostics', 'studio_compose_kernel', diagnostics_inputs, timeout=600)
    eval_inputs = {'predictions': compose, 'programs': p_input, 'benefit': '@native_campaign_inputs//:benefit.json',
                   'studio': s_input, 'jobs': ej_input}
    for task, meta in sorted(all_tasks.items()):
        eval_inputs['q-' + task] = '@native_campaign_inputs//:q-' + task + '.json'
        eval_inputs['label-' + task] = '@native_campaign_inputs//:label-' + task + '.json'
    evaluation = scale.assemble.target('studio_compose_evaluation', 'quality_evaluation_kernel', eval_inputs, timeout=600)
    # Replace this experiment's own stale declarations from earlier failed attempts.
    registry = scale.read(Q / 'action-registry.json')
    for name in ['studio_compose', 'studio_compose_diagnostics', 'studio_compose_evaluation']:
        registry.pop(name, None)
    scale.write(Q / 'action-registry.json', registry)
    quality.flush()
    scale.write(COMP / 'studio-compose-actions.json', {'panel': PANEL, 'jobs': len(jobs), 'targets': [compose, diagnostics, evaluation],
        'contract': 'Frozen additive treatment D: score_Studio + 0.5/(60+rank_rule) on rule-supported files only; k=60 and 0.5 fixed; 32-candidate budget and top-ten preserved; no label input in prediction actions'})
    return compose, diagnostics, evaluation


def run():
    compose, diagnostics, evaluation = assemble()
    os.environ['ATTUNE_CAMPAIGN_NAMESPACE'] = 'attune-studio-composition-20261014'
    os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX'] = '.*studio_compose.*[.]json'
    success = scale.build('studio-composition', [compose, diagnostics, evaluation])
    payload = scale.read(scale.B / 'studio_compose.json')
    diag_payload = scale.read(scale.B / 'studio_compose_diagnostics.json')
    evaluation_payload = scale.read(scale.B / 'studio_compose_evaluation.json')
    scale.write(COMP / 'studio-compose-payload.json', {'rows': payload, 'diagnostics': diag_payload[0], 'checks': diag_payload[1]})
    scale.write(COMP / 'studio-compose-evaluation.json', evaluation_payload)
    print('Compose complete:', len(payload), 'rows;', sum(1 for c in diag_payload[1] if not c[1]), 'path-check failures;',
          sum(c[2] for c in diag_payload[1]), 'score mismatches;', 'build successes', sorted(success))


if __name__ == '__main__':
    run()
