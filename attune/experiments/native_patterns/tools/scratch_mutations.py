"""Mutate only authored/scratch copies; preserve originals and rollback bytes."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

p = argparse.ArgumentParser()
p.add_argument('phase', choices=['baseline', 'mutate', 'rollback', 'check'])
p.add_argument('--experiment', type=Path, required=True)
p.add_argument('--workspace', type=Path, required=True)
a = p.parse_args()
o, w = a.experiment, a.workspace
d = o / 'inputs'
package = w / 'experiments/native_patterns'
out = o / 'bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns'
backup = o / 'raw/scratch-originals'
manifest = o / 'provenance/scratch-backup.json'
def sha(f):
    return hashlib.sha256(f.read_bytes()).hexdigest()
def output_hashes():
    return {f.name: sha(f) for f in out.glob('*.json') if '_scratch_' in f.name or f.name.startswith('probe_')}
def edit_json(name, fn):
    f = d / name
    value = json.loads(f.read_text())
    f.write_text(json.dumps(fn(value), separators=(',', ':')) + '\n')
def source(case, fn):
    edit_json('scratch-' + case + '-source.json', fn)
def vector(case, fn):
    f = d / ('probe-' + case + '-query-vector.tsv')
    rows = [r.split('\t') for r in f.read_text().splitlines()]
    f.write_text('\n'.join('\t'.join(fn(r)) for r in rows) + '\n')
if a.phase == 'baseline':
    assert not manifest.exists(), 'Originals already frozen'
    backup.mkdir(parents=True, exist_ok=True)
    files = sorted(d.glob('scratch-*.json')) + sorted(d.glob('probe-*'))
    files += [package / 'scratch/Attune/Patterns.flix', package / 'scratch/PredictScratch.flix']
    rows = []
    for i, f in enumerate(files):
        b = backup / str(i)
        shutil.copy2(f, b)
        rows.append({'path': str(f), 'backup': str(b), 'sha256': sha(f)})
    manifest.write_text(json.dumps({'files': rows, 'outputs': output_hashes()}, indent=2) + '\n')
elif a.phase == 'mutate':
    assert manifest.exists()
    f = package / 'scratch/Attune/Patterns.flix'
    old = 'Match("DirectImport", a, b, List#{}) :- Seed(a), I(a, b), if (a != b).'
    assert old in f.read_text()
    f.write_text(f.read_text().replace(old, old.replace('I(a, b)', 'I(b, a)')))
    f = package / 'scratch/PredictScratch.flix'
    assert '|> Studio.sorted;' in f.read_text()
    f.write_text(f.read_text().replace('|> Studio.sorted;', '|> Studio.sorted |> List.reverse;'))
    source('body', lambda rows: [[p, s.replace('return helper();', 'return helper() + spare();')] if p == 'a.js' else [p, s] for p, s in rows])
    source('import', lambda rows: [[p, s.replace("'./b.js'", "'./d.js'")] if p == 'a.js' else [p, s] for p, s in rows])
    source('filename', lambda rows: [['renamed.js' if p == 'd.js' else p, s] for p, s in rows])
    edit_json('scratch-filename-ranking.json', lambda rows: [['renamed.js' if p == 'd.js' else p, s] for p, s in rows])
    source('ambiguity', lambda rows: rows + [['e.js', 'export function helper() { return 2; }\n']])
    edit_json('scratch-ambiguity-ranking.json', lambda rows: rows + [['e.js', 0.0]])
    edit_json('scratch-ranking-ranking.json', lambda rows: list(reversed(rows)))
    edit_json('scratch-label-labels.json', lambda rows: [[t, g, s, ['d.js']] for t, g, s, _ in rows])
    edit_json('probe-query-query.json', lambda value: value + '\nchanged scratch query')
    vector('vector', lambda r: r[:9] + [','.join(str(-float(v)) for v in r[9].split(','))])
    (d / 'probe-missing-query-vector.tsv').write_text('')
    vector('corrupt', lambda r: r[:9] + ['NaN,' + ','.join(r[9].split(',')[1:])])
    vector('dimension', lambda r: r[:9] + [','.join(r[9].split(',')[:-1])])
    vector('recipe', lambda r: r[:4] + ['wrong-scratch-recipe'] + r[5:])
    shutil.copy2(d / 'w70-vectors.tsv', d / 'probe-world-code-vectors.tsv')
    edit_json('probe-body-source.json', lambda rows: [[p, s + '\n// scratch source change\n'] if i == 0 else [p, s] for i, (p, s) in enumerate(rows)])
    (o / 'provenance/scratch-mutated-inputs.json').write_text(json.dumps({r['path']: sha(Path(r['path'])) for r in json.loads(manifest.read_text())['files']}, indent=2) + '\n')
elif a.phase == 'rollback':
    (o / 'tables/scratch-mutated-outputs.json').write_text(json.dumps(output_hashes(), indent=2) + '\n')
    for r in json.loads(manifest.read_text())['files']:
        shutil.copy2(r['backup'], r['path'])
        assert sha(Path(r['path'])) == r['sha256']
elif a.phase == 'check':
    before = json.loads(manifest.read_text())['outputs']
    after = output_hashes()
    assert before == after, [n for n in before if before[n] != after.get(n)]
    (o / 'tables/scratch-rollback.json').write_text(json.dumps({'state': 'ParityPass', 'outputs': len(after), 'sha256': after}, indent=2) + '\n')
    print('ParityPass:', len(after), 'exact scratch outputs restored')
