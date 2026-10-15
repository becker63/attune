"""Authored finite fixture for label isolation, warm replay and forced native recomputation."""
import os,hashlib
import scale,eta

def main():
    scale.require_search_boundary()
    program=[['001',[[0,0,1]]]];q=[['a.flix',.8],['b.flix',.5]]
    shared={'planner':scale.assemble.put('isolation-planner','fanout-v1'),'programs':scale.assemble.put('isolation-programs',program),'jobs':scale.assemble.put('isolation-jobs',[['fixture','fixture-world','graph','ranking']]),'unmeasured':scale.assemble.put('isolation-unmeasured',[['fixture',[]]]),'graph':scale.assemble.put('isolation-graph',['fixture-world',[['imports','a.flix','b.flix']],[],[],[],'Completed',[]]),'ranking':scale.assemble.put('isolation-ranking',q)}
    prediction=scale.assemble.target('scale_isolation_predictions','plan_predict_kernel',shared,timeout=25)
    evals=[]
    for side,path in [('before','a.flix'),('after','b.flix')]:
        inputs={'predictions':prediction,'programs':shared['programs'],'benefit':scale.assemble.put('isolation-benefit',[]),'jobs':scale.assemble.put('isolation-evaluation-jobs',[['fixture','fixture-repo','ranking','labels']]),'ranking':shared['ranking'],'labels':scale.assemble.put('isolation-label-'+side,[['fixture','fixture-repo','eligible-gold',[path]]])}
        evals.append(scale.assemble.target('scale_isolation_'+side+'_evaluation','scale_evaluation_kernel',inputs,timeout=120))
    scale.flush();old=os.environ.get('ATTUNE_SCALE_DOWNLOAD_REGEX');os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']='.*scale_isolation.*[.]json'
    try:
        success=scale.build('scale-isolation-before',[evals[0]]);assert evals[0] in success
        p=scale.B/(prediction[1:]+'.json');payload=scale.read(p);digest=hashlib.sha256(p.read_bytes()).hexdigest();before=scale.read(scale.B/(evals[0][1:]+'.json'))
        assert payload[0][5]=='Completed','Prediction launcher success is insufficient'
        success=scale.build('scale-isolation-after',[evals[1]]);assert evals[1] in success
        after=scale.read(scale.B/(evals[1][1:]+'.json'));assert before!=after
        assert hashlib.sha256(p.read_bytes()).hexdigest()==digest
        labels='//experiments/native_patterns/search'+prediction
        actions=eta.objects(scale.O/'logs/scale-isolation-after.actions.json')
        assert not any(a.get('targetLabel')==labels and not a.get('cacheHit') for a in actions),'Held label invalidated prediction'
        success=scale.build('scale-isolation-warm',[evals[1]]);assert evals[1] in success
        assert scale.read(scale.B/(evals[1][1:]+'.json'))==after
        recompute=scale.assemble.target('scale_isolation_recompute_predictions','plan_predict_kernel',shared,timeout=25);scale.flush()
        success=scale.build('scale-isolation-recompute',[recompute]);assert recompute in success
        assert scale.read(scale.B/(recompute[1:]+'.json'))==payload
        assert not any('label' in alias for alias in shared)
        # Only these authored scratch inputs are mutable. Corpus inputs stay frozen.
        mutable=dict(shared)
        values={'programs':program,'graph':scale.read(scale.O/'inputs/isolation-graph.json'),
                'jobs':[['fixture','fixture-world','graph','ranking']]}
        for alias,value in values.items():mutable[alias]=scale.assemble.put('isolation-mutable-'+alias,value)
        target=scale.assemble.target('scale_isolation_mutable_predictions','plan_predict_kernel',mutable,timeout=25)
        scale.flush();mutations=[]
        def check(tag,expected_first,expected_payload=None,fresh=False):
            success=scale.build(tag,[target]);assert target in success
            path=scale.B/(target[1:]+'.json');answer=scale.read(path)
            assert answer[0][5]=='Completed' and answer[0][2][0][0]==expected_first
            if expected_payload is not None:assert answer==expected_payload
            actions=eta.objects(scale.O/('logs/'+tag+'.actions.json'))
            executions=[a for a in actions if a.get('targetLabel')=='//experiments/native_patterns/search'+target and not a.get('cacheHit') and a.get('exitCode',0)==0 and a.get('status') in [None,'','SUCCESS']]
            if fresh:assert executions,'Mutation did not demonstrate actual prediction execution'
            mutations.append({'tag':tag,'payload_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                              'observed_execution':bool(executions),'input_sha256':{k:hashlib.sha256((scale.O/'inputs'/v.split(':')[1]).read_bytes()).hexdigest() for k,v in mutable.items()}})
            return answer
        initial=check('scale-isolation-mutable-initial',1,fresh=True)
        scale.write(scale.O/'inputs/isolation-mutable-programs.json',[['010',[[0,1,0]]]])
        check('scale-isolation-rule-change',0,fresh=True)
        scale.write(scale.O/'inputs/isolation-mutable-programs.json',values['programs'])
        check('scale-isolation-rule-rollback',1,initial)
        graph=list(values['graph']);graph[0]='fixture-world-recipe2'
        scale.write(scale.O/'inputs/isolation-mutable-graph.json',graph)
        scale.write(scale.O/'inputs/isolation-mutable-jobs.json',[['fixture','fixture-world-recipe2','graph','ranking']])
        check('scale-isolation-world-recipe-change',1,initial,fresh=True)
        for alias in ['graph','jobs']:scale.write(scale.O/'inputs'/('isolation-mutable-'+alias+'.json'),values[alias])
        check('scale-isolation-world-recipe-rollback',1,initial)
        scale.write(scale.O/'audit/rule-world-recipe-invalidation.json',{'status':'Passed','observations':mutations,
            'scope':'Native prediction cache boundary over authored admitted facts. Recipe identity is represented by the validated world identity; this does not rerun source extraction or admission.',
            'provider_calls':0,'corpus_inputs_changed':False})
        scale.write(scale.O/'audit/label-isolation-warm-recompute.json',{'status':'Passed','fixture':'Authored two-file facts/ranking; not a benchmark acquisition or scored task','prediction_payload_sha256':digest,'prediction_inputs':shared,'evaluator_label_change_changes_metrics':True,'evaluator_label_change_does_not_execute_prediction':True,'warm_exact_evaluation':True,'forced_exact_prediction':True,'provider_calls':0,'tags':['scale-isolation-before','scale-isolation-after','scale-isolation-warm','scale-isolation-recompute']})
        print('Label isolation, warm replay and forced native recomputation passed.')
    finally:
        if old is None:os.environ.pop('ATTUNE_SCALE_DOWNLOAD_REGEX',None)
        else:os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']=old
if __name__=='__main__':main()
