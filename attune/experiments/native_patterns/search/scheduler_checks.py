"""Finite transport fixtures: release complete groups, never invent failure rewards."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import json
import scale

def checks():
    with TemporaryDirectory(prefix='scheduler-check-',dir=scale.O/'audit') as directory:
        root=Path(directory);(root/'logs').mkdir()
        scale.write(root/'active-build-receipt.json',{'tag':'fixture'})
        action=root/'logs/fixture.actions.json'
        with patch.object(scale,'O',root):
            for exit_code,status,expected in [(124,'NON_ZERO_EXIT',True),(137,'NON_ZERO_EXIT',False),(1,'UNAVAILABLE',False),(0,'',False)]:
                scale._LAST_FAILURE_EVIDENCE=None
                action.write_text(json.dumps({'targetLabel':'//fixture:singleton','exitCode':exit_code,'status':status,'timeoutMillis':'25000','runner':'remote'})+'\n')
                assert bool(scale.isolated_watchdog_evidence(':singleton'))==expected
        tasks=[{'task':'t0'},{'task':'t1'}]
        def item(group,task):return {'target':':'+group+'_'+task,'programs':[(group+'0',[]),(group+'1',[])],'task':{'task':task},'evaluation':':'+group,'depth':0}
        def shard(tag,programs,task):return {'target':':'+tag,'programs':programs,'task':task,'depth':0}
        calls=[];reductions=[];collected=[]
        def panel(tag,programs,items):
            reductions.append((tag,sorted(q for q,_ in programs),{i['task']['task'] for i in items}))
            return ':'+tag+'_evaluation'
        def build(tag,targets):
            calls.append((tag,targets))
            return set(targets)-({':B_t1_single0'} if len(calls)==1 else set())
        def collect(target,cache):collected.append(target)
        with patch.object(scale,'O',root),patch.object(scale,'TASKS',tasks),patch.object(scale,'shard',shard),patch.object(scale,'panel',panel),patch.object(scale,'build',build),patch.object(scale,'flush',lambda:None),patch.object(scale,'collect_target',collect),patch.object(scale,'isolated_watchdog_evidence',lambda _: {'exit_code':124}),patch.object(scale.assemble,'put',lambda *_:'@fixture//:input'),patch.object(scale.assemble,'target',lambda tag,*_,**kwargs:':'+tag):
            scale.recover(1,[item('A','t1'),item('B','t1')],[item('A','t0'),item('B','t0')],{})
        assert len(calls)==3
        assert any('released_' in target for target in calls[1][1]),'A must reduce alongside B disposition, before final reduction'
        assert len(calls[-1][1])==1,'Already-released A must not wait for/reduce with B again'
        assert all(tasks=={'t0','t1'} for _,_,tasks in reductions)
        assert len(collected)==2
    print('Scheduler checks passed: complete-group release, coverage, no duplicate reduction, watchdog-only penalty eligibility.')
if __name__=='__main__':checks()
