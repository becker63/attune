"""Verify immutable inherited artifacts and assemble metadata; never select policies."""
from pathlib import Path
import argparse, collections, datetime, hashlib, itertools, json, math, re, subprocess
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
p=argparse.ArgumentParser(); p.add_argument('--experiment',type=Path,required=True);p.add_argument('--inherited',type=Path,required=True);a=p.parse_args();O=a.experiment;P=a.inherited
D=O/'inputs';out=P/'bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns'
def sha(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def encoded(x):return json.dumps(x,ensure_ascii=True,separators=(',',':'))+'\n'
def dump(path,x):path.write_text(encoded(x))
oldtasks=json.loads((P/'tasks.json').read_text());worlds={w['world']:w for w in json.loads((P/'worlds.json').read_text())};labels={t:(g,s,gold) for t,g,s,gold in json.loads((P/'inputs/labels.json').read_text())}
configs=json.loads((P/'configs.json').read_text());patterns={x['name']:x for x in json.loads((P/'patterns.json').read_text())}
eligible=[t for t in oldtasks if t['status']=='eligible-gold' and t['gold_count']>0 and t['replay_state']=='Completed']
wanted={t['task'] for t in oldtasks};catalog=Path('/home/becker/.cache/attune-v2-bootstrap-bazel/external/+_repo_rules5+swe_rebench_v2_catalog/file/downloaded');pin=json.loads((P/'input-manifest.json').read_text())['dataset'];assert sha(catalog)==pin['sha256']
repo_set={worlds[t['world']]['repository'] for t in oldtasks};catalog_counts=collections.Counter();found={};additional=[]
columns=['instance_id','repo','base_commit','created_at','patch','problem_statement','meta']
for batch in pq.ParquetFile(catalog).iter_batches(batch_size=256,columns=columns):
    keep=pc.is_in(batch.column(columns.index('repo')),value_set=pa.array(sorted(repo_set)))
    for r in batch.filter(keep).to_pylist():
        catalog_counts[r['repo']]+=1
        if r['instance_id'] in wanted:found[r['instance_id']]=r
        else:additional.append({'task':r['instance_id'],'repository':r['repo'],'revision':r['base_commit'],'query_receipt':'ReferenceUnavailable'})
assert wanted<=found.keys(),wanted-found.keys()
metadata=[]
for t in oldtasks:
    tid=t['task'];r=found[tid];w=worlds[t['world']];assert r['repo']==w['repository'] and r['base_commit']==w['revision']
    label=P/'raw/historical/attune/test/study/manifest/localization'/('label_'+tid+'.tsv');prov=next(x.split('\t') for x in label.read_text().splitlines() if x.startswith('provenance\t'))
    patch_sha=hashlib.sha256(r['patch'].encode()).hexdigest();assert (r['repo'],r['base_commit'])==(prov[1],prov[2]),tid
    assert len(r['patch'].encode('utf-16-le'))//2==int(prov[6]),(tid,'patch length')
    query_file=P/'inputs'/(tid+'-query.json');query=json.loads(query_file.read_text()) if query_file.exists() else r['problem_statement'];normalized=' '.join(re.findall(r'[\w./]+',query.lower()))
    tokens=normalized.split();trigrams=set(tuple(tokens[i:i+3]) for i in range(len(tokens)-2))
    meta={'task':tid,'group':t['group'],'repository':w['repository'],'world':t['world'],'revision':w['revision'],'status':t['status'],'gold_count':t['gold_count'],'candidates':w['candidates'],'query_sha256':hashlib.sha256(query.encode()).hexdigest(),'normalized_query_sha256':hashlib.sha256(normalized.encode()).hexdigest(),'patch_sha256':patch_sha,'created_at':r['created_at'],'created_at_scope':'Dataset timestamp; does not establish label/fix availability','label_available_at':None,'pr_url':r['meta']['pr_url'],'eligible':t in eligible}
    metadata.append(meta);meta['_tokens']=tokens;meta['_trigrams']=trigrams
parent={t['task']:t['task'] for t in eligible}
def root(x):
    while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
    return x
def union(x,y):parent[root(y)]=root(x)
related=[]
for x,y in itertools.combinations([m for m in metadata if m['eligible']],2):
    if x['group']!=y['group']:continue
    reasons=[]
    if x['patch_sha256']==y['patch_sha256']:reasons.append('Identical reference patch')
    if x['normalized_query_sha256']==y['normalized_query_sha256']:reasons.append('Identical normalized query')
    tx,ty=x['_trigrams'],y['_trigrams'];similarity=len(tx&ty)/len(tx|ty) if tx|ty else 0
    lengths=[len(x['_tokens']),len(y['_tokens'])]
    if min(lengths)>=20 and min(lengths)/max(lengths)>=.8 and similarity>=.9:reasons.append('Predeclared token-trigram near duplicate')
    if reasons:union(x['task'],y['task']);related.append({'tasks':[x['task'],y['task']],'reasons':reasons,'trigram_jaccard':similarity})
for m in metadata:m.pop('_tokens');m.pop('_trigrams')
groups=collections.defaultdict(list)
for t in eligible:groups[root(t['task'])].append(t['task'])
issuegroups=[];bytask={m['task']:m for m in metadata}
for ids in groups.values():
    ids=sorted(ids);gid='issue-'+hashlib.sha256('|'.join(ids).encode()).hexdigest()[:16];repo=bytask[ids[0]]['group'];completed=all(json.loads((out/('match_'+tid+'.json')).read_text())[4]=='Completed' if (out/('match_'+tid+'.json')).exists() else False for tid in ids)
    issuegroups.append({'id':gid,'repository_group':repo,'tasks':ids,'worlds':sorted({bytask[t]['world'] for t in ids}),'completed':completed,'task_mix':'single' if all(bytask[t]['gold_count']==1 for t in ids) else 'multi','size':len(ids)})
for repo in sorted({g['repository_group'] for g in issuegroups}):
    these=sorted((g for g in issuegroups if g['repository_group']==repo),key=lambda g:hashlib.sha256(('specialization-20261013-v1'+g['id']).encode()).hexdigest())
    for slot,g in enumerate(these):g['slot']=slot
for g in issuegroups:
    for tid in g['tasks']:bytask[tid]['issue_group']=g['id'];bytask[tid]['slot']=g['slot'];bytask[tid]['structural_completed']=g['completed']
folds=[]
for slot in range(max(g['slot'] for g in issuegroups)+1):
    held=[g for g in issuegroups if g['slot']==slot];cal=[g for g in issuegroups if g['slot']!=slot]
    heldworlds=collections.defaultdict(set)
    for g in held:heldworlds[g['repository_group']].update(g['worlds'])
    lw=[g for g in cal if not (set(g['worlds'])&heldworlds[g['repository_group']])]
    folds.append({'id':'fold-'+str(slot),'slot':slot,'calibration_groups':[g['id'] for g in cal],'held_groups':[g['id'] for g in held],'calibration_tasks':sorted(t for g in cal for t in g['tasks']),'held_tasks':sorted(t for g in held for t in g['tasks']),'leave_world_out_calibration_groups':[g['id'] for g in lw]})
split={'seed':20261013,'groups':issuegroups,'folds':folds,'related_pairs':related,'chronology':'ReferenceUnavailable: dataset created_at lacks verified resolution/label-availability times.','original_population':metadata}
assert sum(len(f['held_tasks']) for f in folds)==len(eligible)
dump(O/'split-manifest.json',split);dump(O/'tables/chronology.json',[{k:m[k] for k in ['task','created_at','created_at_scope','label_available_at','pr_url']} for m in metadata]);dump(O/'tables/additional-issue-inventory.json',{'catalog_counts':dict(catalog_counts),'additional':additional,'additional_valid_acquired_query_receipts':0,'scope':'Pinned catalogue rows for the same repositories; retained query acquisition has only the inherited 88 task IDs. No population expansion.'})
selected=[m for m in metadata if m['eligible']]
seal=json.loads((P/'cache-payload-seal.json').read_text());predseal={r['task']:r for r in json.loads((P/'prediction-seal.json').read_text())['records']};verified=[]
for i,m in enumerate(selected):
    tid=m['task'];predname=('unavailable_' if not (out/('predict_'+tid+'.json')).exists() else 'predict_')+tid+'.json'
    for name in ['q_'+tid+'.json','eval_'+tid+'.json',predname]:
        f=out/name;assert sha(f)==seal[name]['sha256'],name;verified.append({'file':str(f),'sha256':sha(f)})
    predictions=json.loads((out/predname).read_text());q=next(r for r in predictions if r[0]=='Qwen');universe={p for p,_ in q[1]};assert len(universe)==len(q[1]) and q[4]=='Completed'
    summaries=[]
    for cid,ranking,pool,support,state,reasons in predictions:
        valid=(state=='Completed' and len(ranking)==len(universe) and {p for p,_ in ranking}==universe and len({p for p,_ in ranking})==len(ranking) and pool==[p for p,_ in ranking[:32]] and all(s is None or math.isfinite(s) for _,s in ranking))
        assert state!='Completed' or valid,(tid,cid)
        signature=hashlib.sha256(encoded([[p for p,_ in ranking],pool]).encode()).hexdigest()
        summaries.append([cid,valid,signature,len(support)])
    dump(D/('meta-'+tid+'.json'),[tid,m['group'],m['issue_group'],m['world'],m['revision'],m['structural_completed'],len(universe),True,summaries])
    (D/('eval-'+tid+'.json')).symlink_to((out/('eval_'+tid+'.json')).resolve())
    (D/('pred-'+tid+'.json')).symlink_to((out/predname).resolve())
    dump(D/('task-'+tid+'.json'),tid)
    dump(D/('labels-'+tid+'.json'),[[tid,labels[tid][0],labels[tid][1],labels[tid][2]]])
    if i%10==0:print('Verified prediction bank',i+1,'/',len(selected),flush=True)
config_wire=[]
for c in configs:
    pat=patterns.get(c['pattern']);simple=c['id'] in ['Qwen','Identity'] or (pat is not None and len(pat['atoms'])<=3 and all(atom[0]=='I' for atom in pat['atoms']))
    config_wire.append([c['id'],c['cost'],simple,c['pattern']])
dump(D/'configuration-meta.json',config_wire);dump(O/'configuration-meta.json',config_wire);dump(O/'tasks.json',selected)
(O/'provenance/inherited-payload-verification.json').write_text(json.dumps({'state':'ParityPass','records':verified,'tasks':len(selected),'configs':len(configs),'profiles_not_fitted':True},indent=2)+'\n')
(O/'split-seal.json').write_text(json.dumps({'sha256':sha(O/'split-manifest.json'),'protocol_sha256':sha(O/'PROTOCOL.md'),'inherited_manifest_sha256':sha(O/'inherited-evidence-manifest.json')},indent=2)+'\n')
(D/'BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(f.name for f in D.iterdir() if f.name not in ['BUILD.bazel','MODULE.bazel']))+')\n')
print('SEALED',len(selected),'tasks',len(issuegroups),'independent groups',len({m['group'] for m in selected}),'repositories',len(related),'related pairs',flush=True)
