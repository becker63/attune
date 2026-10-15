"""Read-only reductions of native evidence; no prediction or search logic."""
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
import gzip,lzma,json,hashlib,re,statistics,base64
import scale

def objects(path):
    if not path.exists():
        path=next((p for p in [Path(str(path)+'.gz'),Path(str(path).removesuffix('.gz')+'.xz')] if p.exists()),path)
    if not path.exists():return []
    text=(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else lzma.decompress(path.read_bytes()) if path.suffix=='.xz' else path.read_bytes()).decode()
    decoder=json.JSONDecoder();i=0;result=[]
    while i<len(text):
        while i<len(text) and text[i].isspace():i+=1
        if i==len(text):break
        try:value,i=decoder.raw_decode(text,i)
        except json.JSONDecodeError:break
        result.append(value)
    return result

def concurrency(spans,wall):
    points=[(0.,0),(wall,0)]
    for start,duration in spans:
        a=max(0.,start);b=min(wall,start+duration)
        if b>a:points.extend([(a,1),(b,-1)])
    n=0;peak=0;area=0.;below=0.;above=0.;last=0.
    for t,delta in sorted(points,key=lambda p:(p[0],p[1])):
        dt=t-last;area+=n*dt
        if n<20:below+=dt
        if n>60:above+=dt
        n+=delta;peak=max(peak,n);last=t
    return {'peak':peak,'time_weighted_mean':area/wall if wall else None,'seconds_below_20':below,'seconds_above_60':above,'scope':'fresh target-matched remote process intervals; not CPU utilization'}

def invocation(tag,registry):
    logs=scale.O/'logs';profile=logs/(tag+'.profile.gz');events=json.loads(gzip.decompress(profile.read_bytes()))['traceEvents']
    actionfile=logs/(tag+'.actions.json.gz')
    if not actionfile.exists():actionfile=logs/(tag+'.actions.json')
    actions=objects(actionfile)
    fresh={a.get('targetLabel'):a for a in actions if a.get('runner')=='remote' and not a.get('cacheHit') and a.get('mnemonic')=='FlixArtifact'}
    parents=defaultdict(list)
    for e in events:
        if e.get('cat')=='action processing' and e.get('args',{}).get('mnemonic')=='FlixArtifact':parents[e['tid']].append(e)
    spans=[];matched=[]
    for e in events:
        if e.get('cat')!='Remote execution process wall time' or 'dur' not in e:continue
        for parent in parents[e['tid']]:
            label=parent.get('args',{}).get('target')
            if label in fresh and parent['ts']-1000<=e['ts'] and e['ts']+e['dur']<=parent['ts']+parent.get('dur',0)+1000:
                spans.append((e['ts']/1e6,e['dur']/1e6));matched.append(label);break
    started=datetime.fromisoformat((logs/(tag+'.started')).read_text().strip().replace('Z','+00:00'));ended=datetime.fromisoformat((logs/(tag+'.ended')).read_text().strip().replace('Z','+00:00'));wall=(ended-started).total_seconds()
    computations=0;failed=0;reused=0;programs=set();cells=set();durations=[];metrics=defaultdict(list);identities=set()
    for a in actions:
        identity=(a.get('targetLabel'),a.get('digest',{}).get('hash'),a.get('runner'),a.get('cacheHit'),a.get('exitCode'))
        if identity in identities:continue
        identities.add(identity)
        label=a.get('targetLabel','');name=label.rsplit(':',1)[-1];rule=registry.get(name)
        if not rule or rule['kernel'] not in ['scale_predict_kernel','plan_predict_kernel']:continue
        programs_input=scale.O/'inputs'/rule['inputs']['programs'].split(':',1)[1];p=scale.read(programs_input);jobs=scale.read(scale.O/'inputs'/rule['inputs']['jobs'].split(':',1)[1]);count=len(p)*len(jobs)
        programs.update(q for q,_ in p)
        if a.get('cacheHit'):reused+=count
        elif a.get('exitCode')==0 and a.get('status') in ['',None,'SUCCESS']:
            computations+=count;cells.update((qid,job[0]) for qid,_ in p for job in jobs)
            for key,value in a.get('metrics',{}).items():
                if key.endswith('Time') and isinstance(value,str) and value.endswith('s'):
                    try:metrics[key].append(float(value[:-1]))
                    except ValueError:pass
        else:failed+=count
    executed={a.get('targetLabel') for a in actions if a.get('mnemonic')=='FlixArtifact'}
    for event in objects(logs/(tag+'.bep.json')):
        label=event.get('id',{}).get('targetCompleted',{}).get('label')
        if not label or label in executed or not event.get('completed',{}).get('success'):continue
        rule=registry.get(label.rsplit(':',1)[-1])
        if rule and rule['kernel'] in ['scale_predict_kernel','plan_predict_kernel']:
            reused+=len(scale.read(scale.O/'inputs'/rule['inputs']['programs'].split(':',1)[1]))*len(scale.read(scale.O/'inputs'/rule['inputs']['jobs'].split(':',1)[1]))
    uuids=[e['started']['uuid'] for e in objects(logs/(tag+'.bep.json')) if 'started' in e]
    summarize=lambda values:{'n':len(values),'mean':statistics.mean(values),'p50':statistics.median(values),'p95':sorted(values)[min(len(values)-1,int(.95*(len(values)-1)))],'max':max(values)}
    return {'tag':tag,'invocation_id':uuids[0] if uuids else None,'start':started.isoformat(),'end':ended.isoformat(),'controller_invocation_wall_seconds':wall,'fresh_successful_program_task_computations':computations,'cache_reused_program_task_computations':reused,'failed_execution_unit_member_opportunities':failed,'distinct_requested_programs':len(programs),'successful_cells':sorted(cells),'action_stage_seconds':{key:summarize(values) for key,values in metrics.items()},'concurrency':concurrency(spans,wall),'matched_process_spans':len(spans),'fresh_actions':len(fresh),'profile':str(profile),'profile_sha256':hashlib.sha256(profile.read_bytes()).hexdigest(),'profile_bytes':profile.stat().st_size,'rss':None,'cpu_time':None}

def main():
    p=scale.O;checkpoint_bytes=(p/'controller.json').read_bytes();states=json.loads(checkpoint_bytes)
    if isinstance(states,list) and states[0]=='gzip-base64-v1':
        raw=gzip.decompress(base64.b64decode(states[2]));assert hashlib.sha256(raw).hexdigest()==states[1];states=json.loads(raw)
    registry=scale.read(p/'action-registry.json');epochs=scale.read(p/'execution-epoch-2.json');waves=[]
    inherited=scale.read(p/'execution-epoch-1-observations.json');task_ids=[t['task'] for t in scale.TASKS]
    seen={(qid,task) for qid,rows in inherited.items() if any(not row.get('invalid',False) for row in rows) for task in task_ids}
    historical=set(scale.read(scale.PILOT/'evaluation-cache.json'));new_cells=set();complete_physical=set()
    for number in range(8,10000):
        tags=[f.name[:-6] for f in (p/'logs').glob(f'scale-wave-{number}*.ended') if re.match(r'^scale-wave-'+str(number)+r'(?:-|\.)',f.name)]
        if not tags:break
        tags.sort(key=lambda tag:(p/'logs'/(tag+'.started')).read_text())
        parts=[invocation(tag,registry) for tag in tags];start=min(datetime.fromisoformat(r['start']) for r in parts);end=max(datetime.fromisoformat(r['end']) for r in parts);wall=(end-start).total_seconds();new=0
        for part in parts:
            cells={tuple(c) for c in part.pop('successful_cells')};new+=len(cells-seen);seen.update(cells);new_cells.update(cells)
        newly_complete={qid for qid,_ in new_cells if qid not in complete_physical and all((qid,t) in seen for t in task_ids)};complete_physical.update(newly_complete)
        waves.append({'wave':number,'invocations':parts,'controller_wall_seconds':wall,'invocation_wall_sum_seconds':sum(r['controller_invocation_wall_seconds'] for r in parts),'gaps_seconds':wall-sum(r['controller_invocation_wall_seconds'] for r in parts),'fresh_successful_program_task_computations':sum(r['fresh_successful_program_task_computations'] for r in parts),'exact_reused_computations':sum(r['cache_reused_program_task_computations'] for r in parts),'concurrency':{'peak':max(r['concurrency']['peak'] for r in parts),'time_weighted_mean':sum(r['concurrency']['time_weighted_mean']*r['controller_invocation_wall_seconds'] for r in parts)/wall if wall else None,'seconds_below_20':sum(r['concurrency']['seconds_below_20'] for r in parts)+wall-sum(r['controller_invocation_wall_seconds'] for r in parts),'seconds_above_60':sum(r['concurrency']['seconds_above_60'] for r in parts)},'final_disposition':scale.read(p/'wave.json')>number})
        waves[-1].update({'new_successful_program_task_cells':new,'complete_panels_observed_from_physical_success':len(newly_complete),'first_completed_global_novel_programs':len(newly_complete-historical),'new_successful_cells_per_controller_second':new/wall if wall else None,'completed_panels_per_controller_second':len(newly_complete)/wall if wall else None})
    completed=sum(len(t['state'][7]) for t in states.values());remaining={name:t['config'][0]-len(t['state'][7]) for name,t in states.items()};receipts=[json.loads(s) for s in (p/'decisions/dispatch.jsonl').read_text().splitlines()];charges=sum((Decimal(str((r.get('usage') or {}).get('cost',0))) for r in receipts),Decimal(0))
    evaluations=scale.read(p/'evaluations.json');pending={qid for t in states.values() for qid,_,_ in t['state'][5] if qid not in evaluations}
    # Full exact completed panels are valid reuse; individual successful cells survive unfinished panels.
    seen.update((qid,t) for qid,row in evaluations.items() if not row.get('invalid') for t in task_ids)
    missing=[(qid,t) for qid in sorted(pending) for t in task_ids if (qid,t) not in seen]
    provider_spans=[((r['start_ns']-min(x['start_ns'] for x in receipts))/1e9,(r['end_ns']-r['start_ns'])/1e9) for r in receipts] if receipts else []
    provider_wall=max((s+d for s,d in provider_spans),default=0)
    start=datetime.fromtimestamp((p/'execution-epoch-2.json').stat().st_mtime,timezone.utc);now=datetime.now(timezone.utc);elapsed=(now-start).total_seconds();delta=completed-sum(epochs['private_revelations'].values());rate=delta/elapsed if elapsed>0 else 0
    packet={'as_of':now.isoformat(),'execution_epoch':'fanout-v1/missing-singletons-v1','checkpoint_sha256':hashlib.sha256((p/'controller.json').read_bytes()).hexdigest(),'limits':{'trials':24,'slots_per_trial':1024,'rbe_jobs':80,'jev_in_flight':4,'new_inference_cap_usd':3,'singleton_outer_seconds':25},'completed_logical_slots':completed,'epoch_start_logical_slots':sum(epochs['private_revelations'].values()),'remaining_by_branch':remaining,'remaining_logical_slots':sum(remaining.values()),'continuation_wall_seconds_including_gaps':elapsed,'logical_slots_finalized_since_epoch_start':delta,'observed_end_to_end_logical_slots_per_second':rate,'remaining_search_seconds_sensitivity':{name:sum(remaining.values())/(rate*factor) if rate else None for name,factor in [('low',1.5),('central',1),('high',.5)]},'forecast_scope':'Sensitivity scenarios, not confidence intervals; pauses/implementation gaps included; no Jev wait added twice; validation/reporting ETA not yet measured','observed_inference_usd':str(charges),'reserved_reconciled_ledger':scale.read(p/'decisions/budget.json'),'waves':waves,'planner_comparison':{'cases':72,'representative':64,'tail':8,'exact_pair_support_rank_metric_parity_cases':65,'old_timeout_new_completion_cases':5,'nonempty_rescues':3,'representative_median_stage_ratio_old_over_new':.9999702029952031},'missing_measurements':['exact full-panel pending task inventory reduction','physical novelty sensitivity fit','remote CPU/RSS/GC','validation/reporting time','steady-state window before three complete profiled waves']}
    packet['checkpoint_sha256']=hashlib.sha256(checkpoint_bytes).hexdigest()
    epoch_file=max((path for path in p.glob('execution-epoch-*.json') if path.stem.rsplit('-',1)[1].isdigit()),key=lambda path:int(path.stem.rsplit('-',1)[1]))
    if epoch_file.exists():
        current_epoch=scale.read(epoch_file)
        packet['execution_epoch']=epoch_file.stem+': fanout-v1/missing-singletons-v1/ready-panel-release-v1/resource-replay-v1'
        packet['execution_epoch_manifest_sha256']=hashlib.sha256(epoch_file.read_bytes()).hexdigest()
        packet['historical_rate_scope']='Full continuation across execution epochs 2 onward; implementation and interruption gaps included'
        epoch_elapsed=(now-datetime.fromisoformat(current_epoch.get('restart_at',current_epoch['as_of']))).total_seconds()
        epoch_delta=completed-sum(current_epoch['private_revelations'].values())
        packet['current_epoch_progress']={'seconds':epoch_elapsed,'new_logical_slots':epoch_delta,'logical_slots_per_second':epoch_delta/epoch_elapsed if epoch_elapsed else None,'start_wave':current_epoch.get('new_wave')}
    branch_rates={name:(len(t['state'][7])-epochs['private_revelations'].get(name,0))/elapsed for name,t in states.items()}
    branch_forecasts={name:(remaining[name]/branch_rates[name] if branch_rates[name]>0 else None) for name in remaining if remaining[name]>0}
    packet['branch_observed_logical_slots_per_second']=branch_rates
    packet['branch_rate_remaining_seconds']=branch_forecasts
    packet['slowest_branch_forecast_seconds']=max((v for v in branch_forecasts.values() if v is not None),default=None)
    packet['branch_forecast_scope']='Fixed historical branch rates; useful critical-path sensitivity, not additive work or a calibrated bound; available capacity can shift as other branches finish'
    revealed={qid for t in states.values() for qid in t['state'][7]};novel_revealed=revealed-historical
    packet['observed_revealed_canonical_novelty']={'novel_programs':len(novel_revealed),'logical_slots':completed,'ratio':len(novel_revealed)/completed if completed else None,'scope':'Distinct privately revealed canonical programs absent from pilot inventory / summed private revelations; physical executions and preflight discoveries are distinct accounts'}
    packet.update({'pending_panels':len(pending),'exact_missing_program_task_pairs':len(missing),'pending_pair_manifest_sha256':hashlib.sha256(json.dumps(missing,separators=(',',':')).encode()).hexdigest(),'pending_work_scope':'Pending logical batches at checkpoint; successful post-epoch cells and complete saved panels deducted; active unfinished actions conservatively remain missing','provider_concurrency':concurrency(provider_spans,provider_wall),'provider_concurrency_scope':'Host dispatch spans; HTTP occupancy not independently measured','provider_attempts':sum(r['attempts'] for r in receipts),'returned_usage_input_tokens':sum((r.get('usage') or {}).get('input_tokens',0) for r in receipts)})
    packet['missing_measurements']=['remote CPU/RSS/GC','validation/reporting time','logical per-wave slot boundary timestamps','full pending world-cell history before epoch for partial panels','HTTP-only occupancy']
    finished=[w for w in waves if w['final_disposition']][-3:]
    if finished:
        wall=sum(w['controller_wall_seconds'] for w in finished);new=sum(w['new_successful_program_task_cells'] for w in finished);panels=sum(w['complete_panels_observed_from_physical_success'] for w in finished)
        packet['recent_three_finished_waves']={'wave_ids':[w['wave'] for w in finished],'controller_seconds':wall,'new_successful_program_task_cells':new,'complete_panels':panels,'new_cells_per_second':new/wall,'panels_per_second':panels/wall,'scope':'Recovery-inclusive invocation windows; inter-wave gaps excluded; draining old partial work can contribute'}
        measured=new/wall
        packet['physical_work_crosscheck_sensitivity']={name:{'assumed_novelty_per_logical_slot':novelty,'assumed_successful_cells_per_second':measured*factor,'projected_missing_cells_including_partial_work':len(missing)+max(0,sum(remaining.values())*novelty-len(pending))*len(task_ids),'projected_controller_seconds':(len(missing)+max(0,sum(remaining.values())*novelty-len(pending))*len(task_ids))/(measured*factor) if measured else None} for name,novelty,factor in [('low',.25,1.5),('central',.5,1),('high',.75,.5)]}
        packet['physical_crosscheck_scope']='Sensitivity crosscheck; existing missing cells charged exactly, other pending cells credited, future novelty hypothetical; work is not a forecast of new hypotheses guaranteed to exist. Not added to logical/provider forecasts.'
    if (p/'search-stopped.json').exists():
        packet['search_status']='UserStopped; remaining work retained for resume, no active search ETA'
        packet['stop_manifest_sha256']=hashlib.sha256((p/'search-stopped.json').read_bytes()).hexdigest()
        packet['remaining_search_seconds_sensitivity']=None
    ledger=packet['reserved_reconciled_ledger'];packet['cash_ledger_minus_returned_usage_usd']=str(Decimal(ledger[0])/Decimal(1000000)-charges)
    previous=scale.read(p/'eta_packet.json') if (p/'eta_packet.json').exists() else None
    if previous and completed>previous['completed_logical_slots']:
        observed=(now-datetime.fromisoformat(previous['as_of'])).total_seconds();predicted=(completed-previous['completed_logical_slots'])/previous['observed_end_to_end_logical_slots_per_second'] if previous['observed_end_to_end_logical_slots_per_second'] else None
        packet['previous_forecast_check']={'previous_as_of':previous['as_of'],'new_slots':completed-previous['completed_logical_slots'],'elapsed_seconds':observed,'predicted_seconds_at_previous_rate':predicted,'error_seconds':observed-predicted if predicted else None}
    scale.append('eta-history.jsonl',{k:packet[k] for k in ['as_of','completed_logical_slots','remaining_logical_slots','observed_end_to_end_logical_slots_per_second','pending_panels','exact_missing_program_task_pairs']})
    scale.write(p/'eta_packet.json',packet)
    (p/'ETA_PACKET.md').write_text(f"As of {packet['as_of']}: execution epoch **{packet['execution_epoch']}**. Trees and prior history preserved. Checkpoint SHA256: `{packet['checkpoint_sha256']}`.\n\n**{completed:,} / 24,576 logical slots consumed; {sum(remaining.values()):,} remain.** Limits: 80 RBE jobs, four host Jev slots, $3 shared cap, 25-second singleton process envelope. Returned inference charges: ${charges}; reserved/reconciled ledger: {ledger} micro-USD/opportunities.\n\nObserved continuation rate including interruptions: {rate:.3f} logical slots/s ({delta} slots / {elapsed:.1f} seconds). Remaining-search low/central/high sensitivity: "+json.dumps(packet['remaining_search_seconds_sensitivity'])+f" seconds. These are sensitivity ranges, not calibrated intervals. Validation/reporting time is unmeasured. **{len(pending)} pending logical panels; {len(missing)} missing program/task pairs** after deducting observed successful cells and exact complete reuse. Unfinished actions remain conservatively missing.\n\nPlanner: 64 representative plus eight separate tail cases, two executions per side. All 65 mutually completed cases preserve pairs, support, reconstructed rankings and canonical metrics; five old timeouts complete, three nonempty. Representative median stage ratio is approximately 1.00.\n\nRecent recovery-inclusive completed-wave reduction: "+json.dumps(packet.get('recent_three_finished_waves'))+". These windows exclude inter-wave gaps and can include draining partial panels; they are not a guaranteed sustainable fresh rate.\n\nPer-invocation counts, cache share, measured process concurrency, action stage distributions, UUIDs and compressed-profile hashes are in eta_packet.json. Process overlap is not CPU utilization. CPU/RSS/GC, HTTP-only occupancy, validation/reporting time, and pre-epoch partial-cell inventory remain unavailable. No Jev wait is added twice to the end-to-end forecast.\n")
    print('ETA packet slots',completed,'rate',rate,'waves',len(waves))

if __name__=='__main__':main()
