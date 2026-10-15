"""Scratch label-isolation and independent selected-action recomputation assembly."""
from pathlib import Path
import json,hashlib,subprocess
import assemble
from pilot import O,B,read,write

def prepare():
    registry=read(O/'action-registry.json')
    assert all(not any('label' in a or 'label' in str(v) for a,v in r['inputs'].items())
               for r in registry.values() if r['kernel'] in ['predict_kernel','merge_kernel','recovery_kernel','audit_kernel'])
    parent=registry['common0_evaluation'];inputs=dict(parent['inputs'])
    jobs=read(O/'inputs/common0-evaluation-jobs.json');task,repo,_,label=jobs[0]
    labels=read(O/'inputs'/(label+'.json'));q=read(O/'inputs'/('q-'+task+'.json'))
    mutated=[]
    for t,r,s,gold in labels:mutated.append([t,r,s,[q[-1][0]] if t==task else gold])
    inputs[label]=assemble.put('scratch-mutated-label',mutated)
    assemble.target('scratch_label_evaluation','evaluation_kernel',inputs,180)
    # Output name changes the deterministic action key while all semantic inputs stay identical.
    original=registry['common0_shard9'];assemble.target('scratch_forced_prediction','predict_kernel',dict(original['inputs']),180)
    usage=[]
    for line in (O/'decisions/dispatch.jsonl').read_text().splitlines():
        row=json.loads(line);tokens=(row.get('usage') or {}).get('input_tokens')
        usage.append([row['attempts'],tokens])
    assemble.target('cost_reconciliation','cost_kernel',{'usage':assemble.put('native-cost-usage',usage)},180)
    assemble.flush()
    write(O/'audit/label-isolation-protocol.json',{'parent_prediction':str(B/'common0_predictions.json'),
          'prediction_sha256':hashlib.sha256((B/'common0_predictions.json').read_bytes()).hexdigest(),
          'mutation':'One evaluator-only required-file label replaced by Qwen tail file; no prediction input changed',
          'task':task,'prediction_inputs_no_labels':True,
          'forced_recompute':'common0_shard9 identical inputs, different output identity, compilation shared'})
    return ['//experiments/native_patterns/search:'+n for n in ['scratch_label_evaluation','scratch_forced_prediction','cost_reconciliation']]

def check():
    seal=read(O/'audit/label-isolation-protocol.json')
    assert hashlib.sha256(Path(seal['parent_prediction']).read_bytes()).hexdigest()==seal['prediction_sha256']
    original=read(B/'common0_evaluation.json')[0];mutated=read(B/'scratch_label_evaluation.json')[0]
    assert original!=mutated
    assert all(a==b for a,b in zip(original,mutated) if a[0]!=seal['task'])
    assert read(B/'common0_shard9.json')==read(B/'scratch_forced_prediction.json')
    write(O/'audit/label-isolation-result.json',{'status':'ParityPass','sealed_predictions_unchanged':True,
          'evaluator_results_changed':True,'other_tasks_exact':True,'independent_prediction_recomputation_exact':True,
          'reconciled_budget_micro_usd_attempts':read(B/'cost_reconciliation.json')})
if __name__=='__main__':
    targets=prepare();result=subprocess.run(['bash',str(O/'run.sh'),'isolation-and-cost','build',*targets,'--keep_going'])
    if result.returncode:raise SystemExit(result.returncode)
    check()
