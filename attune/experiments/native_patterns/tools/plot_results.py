"""Standalone figures from sealed metrics and measured execution receipts."""
from pathlib import Path
import argparse
import json
import re
import statistics
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

p = argparse.ArgumentParser(); p.add_argument('--experiment', type=Path, required=True); a = p.parse_args(); o = a.experiment
figdir = o / 'figures'; figdir.mkdir(exist_ok=True)
plt.rcParams.update({'font.size': 9, 'axes.spines.top': False, 'axes.spines.right': False, 'svg.fonttype': 'none'})
def save(fig, name):
    fig.tight_layout()
    fig.savefig(figdir / (name + '.svg'))
    fig.savefig(figdir / (name + '.png'), dpi=160)
    plt.close(fig)
rows = json.loads((o / 'tables/paired-pattern-repository-deltas.json').read_text())
groups = sorted({r['group'] for r in rows})
panel = [('StudioCurrent', 'Current Studio fusion'), ('ImportCallAgreement.5.votes.expansion', 'Import + call agreement'), ('DirectImport.5.votes.fixed', 'Direct import, fixed pool')]
fig, ax = plt.subplots(figsize=(9, 5))
for i, (config, label) in enumerate(panel):
    values = {r['group']: r['delta'] * 100 for r in rows if r['config'] == config}
    ax.barh([j + (i - 1) * .24 for j in range(len(groups))], [values[g] for g in groups], height=.24, label=label)
ax.set_yticks(range(len(groups)), groups); ax.axvline(0, color='black', linewidth=.6)
ax.set_xlabel('Repository-macro Recall@10 difference from Qwen (percentage points)')
ax.set_title('47 completed eligible tasks · 14 repository groups · descriptive frozen variants')
ax.legend(loc='lower right', fontsize=8)
save(fig, 'repository-deltas')
patterns = json.loads((o / 'tables/pattern-performance.json').read_text())[:20]
fig, ax = plt.subplots(figsize=(10, 6))
for i, row in enumerate(patterns):
    change = row['task_changes']
    ax.barh(i, change.get('improved', 0), color='#236c91')
    ax.barh(i, -change.get('harmed', 0), color='#b65b35')
ax.set_yticks(range(20), [r['pattern'] for r in patterns]); ax.axvline(0, color='black', linewidth=.6)
ax.set_xlabel('Tasks harmed ←                 → Tasks improved in Recall@10')
ax.set_title('Best descriptive frozen variant per named pattern · 47 tasks\nOutcome-selected comparison; unchanged tasks omitted, not an OOF selector')
save(fig, 'pattern-contributions')
tags = ['primary-v2-cold-execution', 'identical-warm', 'fresh-client-replay', 'recompute-rollback']
labels = ['Full cold', 'Identical warm', 'Fresh-client replay', 'Independent recompute']
receipts = [json.loads((o / ('tables/actions-' + t + '.json')).read_text()) for t in tags]
fig, ax = plt.subplots(figsize=(8, 3.8))
seconds = [float(r['build_wall_ms']) / 1000 for r in receipts]
bars = ax.bar(labels, seconds, color=['#236c91', '#678675', '#678675', '#236c91'])
ax.set_yscale('log'); ax.set_ylim(.1, 3000); ax.set_ylabel('Bazel elapsed wall time (seconds, log scale)')
for b, s in zip(bars, seconds): ax.text(b.get_x() + b.get_width() / 2, s * 1.15, f'{s:.2f} s', ha='center')
ax.set_title('Acquired vectors and toolchains retained; cold failures preserved\nRecompute: 88 rankings + 86 pattern/fusion runs + six whole-world extractions')
save(fig, 'cache-wall-time')
# Java wraps the entire Flix main invocation. Serialization consumes its result
# before this clock stops. These are process samples, not warmed microbenchmarks.
timings = []
for tag in ['primary-v2-cold-execution', 'witness-repair-primary', 'recompute-rollback']:
    actions = {r['target']: r for r in json.loads((o / ('tables/actions-' + tag + '.json')).read_text())['rows']}
    current = None
    for line in (o / ('logs/' + tag + '.log')).read_text().splitlines():
        match = re.match(r'INFO: From Computing (//[^:]+:[^:]+):$', line)
        if match: current = match[1]
        m = re.match(r'attune_(compile|main)_ns=(\d+)', line)
        if current in actions and m and not actions[current]['cache_hit']:
            timings.append({'tag': tag, 'target': current, 'boundary': m[1], 'seconds': int(m[2]) / 1e9})
(o / 'tables/consumed-result-timings.json').write_text(json.dumps({'measurement': 'Fresh JVM process samples; main includes input reads and consumed serialized output. No steady-state kernel claim.', 'rows': timings}, indent=2) + '\n')
evals = json.loads((o / 'tables/pattern-task-changes.json').read_text())
cost = {r['target'].split(':rmatch_')[1]: r['seconds'] for r in timings if r['tag'] == 'recompute-rollback' and ':rmatch_' in r['target'] and r['boundary'] == 'main'}
fig, ax = plt.subplots(figsize=(8, 4))
for config, label in panel[:2]:
    pts = [r for r in evals if r['config'] == config and r['task'] in cost]
    ax.scatter([cost[r['task']] for r in pts], [100 * r['delta_recall10'] for r in pts], s=22, alpha=.6, label=label)
ax.axhline(0, color='black', linewidth=.6); ax.set_xscale('log')
ax.set_xlabel('Shared 64-rule + Studio route action main time (seconds, log scale)')
ax.set_ylabel('Task Recall@10 difference (percentage points)')
ax.set_title('47 completed tasks · shared batch cost, not marginal per-pattern cost')
ax.legend(fontsize=8)
save(fig, 'quality-shared-cost')
(o / 'provenance/plot-version.json').write_text(json.dumps({'matplotlib': matplotlib.__version__, 'plots': sorted(f.name for f in figdir.iterdir())}, indent=2) + '\n')
print('Saved four measured figures and consumed-result timing table')
