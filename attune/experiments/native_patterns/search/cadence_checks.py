"""Controller checks for the cadence campaign; Flix laws cover search and guidance.

  python3 cadence_checks.py
Uses the real cadence_budget host binary; preflight classification and scoring are
replaced by fixtures so no campaign state is read or written.
"""
import os,json,tempfile
from pathlib import Path
from unittest.mock import patch
directory=Path(tempfile.mkdtemp(prefix='cadence-check-'))
os.environ['ATTUNE_CADENCE_DIR']=str(directory)
import cadence

def ledger_checks():
    cap=10_000_000
    (directory/'decisions').mkdir(exist_ok=True)
    def budget(ledger,operation):
        (directory/'decisions/budget.json').write_text(json.dumps(ledger))
        with patch.object(cadence.scale,'O',directory):
            result,_=cadence.host('scale_budget','budget-check',{'ledger':ledger,'operation':operation})
        return result
    # Concurrent dispatch near the cap: only reservations that fit are granted, atomically in one step.
    before,granted=budget([cap-3*2688,10],['reserve',5,[]])
    assert len(granted)==3 and before[0]<=cap,(before,granted)
    # Exhausted: no new reservation at all.
    _,granted=budget(before,['reserve',1,[]])
    assert granted==[]
    # Crash after reservation, before result persistence: no usage known -> reservation retained.
    after,_=budget([2688,1],['reconcile',0,[None]])
    assert after==[2688,1]
    # Known usage releases the ceiling to the actual charge.
    after,_=budget([2688,1],['reconcile',0,[5000]])
    assert after==[210,1],after

def preflight_checks():
    table={'UNSAT':{'rows':[['t','g',[]]],'source':'u'},'001;103':{'rows':[['t','g',[]]],'source':'c'}}
    verdicts={'a':'UNSAT','b':'001;103','c2':None,'d':'999'}
    p=cadence.Preflight.__new__(cadence.Preflight);p.table=dict(table);p.verdict=dict(verdicts)
    scored=lambda entries:{q:([['-1','10']],-1.0) for q,_,_ in entries}
    cache={}
    with patch.object(cadence,'score',scored),patch.object(cadence,'append',lambda *_:None),patch.object(cadence.scale,'write',lambda *_:None):
        left=p.resolve(['a','b','c2','d'],cache)
    assert left==['c2','d'],'Invalid/no-claim and unseen computations go to native execution'
    assert cache['a']['reuse']=='unsatisfiable' and cache['b']['reuse']=='proven-core','Evidence classes stay distinct'
    # Missing task cells or failed panels never become a computation representative.
    p.verdict['d']='999'
    with patch.object(cadence,'append',lambda *_:None):
        p.learn('d',{'invalid':True,'records':[]});assert '999' not in p.table
        p.learn('d',{'invalid':False,'records':[1]*3});assert '999' not in p.table

def release_checks():
    pending=[['x',[],[]],['y',[],[]],['x',[],[]]]
    assert cadence.release(pending,{'x':{'reward':-1}}) is None,'Partial panels are not released'
    early={'y':{'reward':-2},'x':{'reward':-1}};late={'x':{'reward':-1},'y':{'reward':-2}}
    assert cadence.release(pending,early)==cadence.release(pending,late)==[['x',-1],['y',-2],['x',-1]]
    # A result present only because another arm requested it is released solely through this
    # branch's own pending list; unrelated cache entries never appear.
    assert all(q in ('x','y') for q,_ in cadence.release(pending,{**early,'z':{'reward':1}}))

if __name__=='__main__':
    ledger_checks();preflight_checks();release_checks()
    print('Cadence controller checks passed: concurrent ledger cap, crash-retained reservation, preflight evidence classes, representative admission, ordered complete release.')
