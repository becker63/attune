"""Declare byte inputs and ordinary Bazel actions; Flix owns all scientific work."""
from pathlib import Path
import json, hashlib

W = Path('/home/becker/projects/attune/attune')
O = Path('/home/becker/experiments/attune-jev-search-20261014')
PACKAGE = W / 'experiments/native_patterns/search'
RULES = {}

def put(name, value):
    path = O / 'inputs' / (name + '.json')
    text = json.dumps(value, separators=(',', ':')) + '\n'
    if path.exists() and path.read_text() != text:
        raise ValueError('Refusing to replace immutable input: ' + str(path))
    path.write_text(text)
    return '@native_campaign_inputs//:' + path.name

def target(name, kernel, inputs, timeout=140):
    RULES[name] = dict(kernel=kernel, inputs=inputs, timeout=timeout)
    return ':' + name

def panel(tag, programs, tasks):
    program_input = put(tag + '-programs', programs)
    # Three tasks per process: at most 24 program/task computations per batch.
    ordered = sorted(tasks, key=lambda t: (-t['candidates'], t['task']))
    shards = [ordered[i:i+3] for i in range(0, len(ordered), 3)]
    predictions = {}
    for index, shard in enumerate(shards):
        inputs = {'programs': program_input,
                  'unmeasured':put(tag+'-unmeasured-'+str(index), unmeasured(shard))}
        jobs = []
        for task in shard:
            graph = 'graph-' + task['world']; q = 'q-' + task['task']
            identity = json.loads((O/'inputs'/(graph+'.json')).read_text())[0]
            jobs.append([task['task'], identity, graph, q])
            inputs[graph] = '@native_campaign_inputs//:'+graph+'.json'
            inputs[q] = '@native_campaign_inputs//:'+q+'.json'
        inputs['jobs'] = put(tag + '-jobs-' + str(index), jobs)
        predictions['shard'+str(index)] = target(tag+'_shard'+str(index), 'predict_kernel', inputs)
    merge_inputs = dict(predictions)
    merge_inputs['shards'] = put(tag+'-shards', list(predictions))
    prediction = target(tag+'_predictions', 'merge_kernel', merge_inputs)
    evaluation_inputs = {'programs':program_input, 'predictions':prediction,
                         'benefit':'@native_campaign_inputs//:benefit.json'}
    jobs = []
    for task in tasks:
        q='q-'+task['task']; label='label-'+task['task']
        jobs.append([task['task'], task['group'], q, label])
        evaluation_inputs[q]='@native_campaign_inputs//:'+q+'.json'
        evaluation_inputs[label]='@native_campaign_inputs//:'+label+'.json'
    evaluation_inputs['jobs'] = put(tag+'-evaluation-jobs', jobs)
    evaluation = target(tag+'_evaluation', 'evaluation_kernel', evaluation_inputs)
    return prediction, evaluation

def unmeasured(tasks):
    inherited=Path('/home/becker/experiments/attune-native-patterns-20261013/inputs')
    result=[]
    for task in tasks:
        q=json.loads((O/'inputs'/('q-'+task['task']+'.json')).read_text())
        missing=[path for path, score in q if score is None]
        if missing:
            source=dict(json.loads((inherited/(task['world']+'-source.json')).read_text()))
            receipts=[line.split('\t') for line in (inherited/(task['world']+'-vectors.tsv')).read_text().splitlines()]
            for path in missing:
                matched=[r for r in receipts if r[1:3]==['code',path]]
                assert source[path]=='' and len(matched)==1 and matched[0][8]=='unmeasured'
                assert matched[0][5:7]==[hashlib.sha256(b'').hexdigest()]*2
        result.append([task['task'],missing])
    return result

def flush():
    registry = O/'action-registry.json'
    old = json.loads(registry.read_text()) if registry.exists() else {}
    for name, rule in RULES.items():
        if name in old and old[name] != rule: raise ValueError('Changed declared action: '+name)
        old[name]=rule
    registry.write_text(json.dumps(old, indent=2)+'\n')
    lines=['load("//platform/build:native.bzl", "flix_action")', 'def targets():']
    for name, rule in old.items():
        lines.append('    flix_action(name='+repr(name)+',srcs=[],inputs='+repr(rule['inputs'])+',java_deps=['+repr(':'+rule['kernel'])+',"//platform/tools/grit:attune_grit"],compiled=True,timeout_seconds='+str(rule['timeout'])+',tags=["manual"])')
    (PACKAGE/'batches.bzl').write_text('\n'.join(lines)+'\n')
    # Reserved evaluator labels remain absent until archives are frozen.
    dev=set(json.loads((O/'protocol.json').read_text())['development'])
    allowed={ 'label-'+t['task']+'.json' for t in json.loads((O/'tasks.json').read_text()) if t['group'] in dev}
    seal=O/'archives-sealed.json'
    if seal.exists():
        archives=json.loads(seal.read_text())
        assert len(archives)==9
        for archive in archives.values():
            path=Path(archive['native_output'])
            assert hashlib.sha256(path.read_bytes()).hexdigest()==archive['output_sha256']
        reserved=set(json.loads((O/'protocol.json').read_text())['reserved'])
        allowed.update('label-'+t['task']+'.json' for t in json.loads((O/'tasks.json').read_text()) if t['group'] in reserved)
    reference=O/'reference-labels-authorized.json'
    if reference.exists():
        receipt=json.loads(reference.read_text())
        assert hashlib.sha256(seal.read_bytes()).hexdigest()==receipt['archive_seal_sha256']
        allowed.update('label-'+task+'.json' for task in receipt['tasks'])
    exports=sorted(p.name for p in (O/'inputs').glob('*.json') if p.exists() and (not p.name.startswith('label-') or p.name in allowed))
    (O/'inputs/BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(exports)+')\n')

if __name__ == '__main__':
    B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/search')
    controls=json.loads((B/'language_probe.json').read_text())
    programs=[[r[1],[[int(x) for x in a] for a in r[1].split(';')]] for r in controls]
    put('common-controls', programs)
    dev=set(json.loads((O/'protocol.json').read_text())['development'])
    tasks=[t for t in json.loads((O/'tasks.json').read_text()) if t['group'] in dev and t['structural_completed']]
    panel('common0', programs[:8], tasks)
    panel('common1', programs[8:], tasks)
    flush()
