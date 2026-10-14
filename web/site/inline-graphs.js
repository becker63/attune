import * as Plot from './vendor/plot.js';
import {esc} from './evidence.js';
const names={imports:'Imports',imported_by:'ImportedBy',defines:'Defines',defined_in:'DefinedIn',calls:'Calls',callers:'Callers'};
const domains=r=>['defines'].includes(r)?['file','symbol']:r==='defined_in'?['symbol','file']:['calls','callers'].includes(r)?['symbol','symbol']:['file','file'];
export function mountInlineGraphs(root,t,f,record){
 const observers=[];
 root.querySelectorAll('[data-mini]').forEach(host=>{
  const mode=host.dataset.mini;
  if(mode==='ranks'){
   let keep=t.id.includes('greenwood')?f.paths.filter(g=>g.path.endsWith('resource-utils.js')):t.id.includes('obsidian-tasks')?f.paths.filter(g=>/\/(DescriptionField|TextField)\.ts$/.test(g.path)):f.paths.slice(0,3);
   if(!keep.length)keep=f.paths.slice(0,3);
   const values=keep.flatMap(g=>['Q','QJ','QS'].map((arm,i)=>({arm,position:i,rank:g.ranks[arm],path:g.path,file:g.path.split('/').pop()})));
   if(!values.length)return;
   let focus=-1;
   host.innerHTML='<div class="walk-controls" role="group" aria-label="Highlight frozen ranking arm"><button data-rank-step="-1" aria-pressed="true">All ranks</button><button data-rank-step="0" aria-pressed="false">Qwen</button><button data-rank-step="1" aria-pressed="false">Qwen + Jev</button><button data-rank-step="2" aria-pressed="false">Qwen + Atlas + Jev</button></div><div class="plot-mount"></div><figcaption>Selected required files; all required paths appear in the table below. Rank is list position, not confidence. The area at or above the dashed rank-10 line is recovered. QJ and QS are separate alternatives from Q.</figcaption><pre class="graph-transcript">'+esc(keep.map(g=>g.path+'\n  Q '+g.ranks.Q+'\n  +-- QJ '+g.ranks.QJ+'\n  `-- QS '+g.ranks.QS).join('\n\n'))+'</pre>';
   const draw=()=>host.querySelector('.plot-mount').replaceChildren(Plot.plot({width:Math.max(280,host.clientWidth),height:220,marginLeft:42,marginRight:24,style:{background:'transparent',color:'#b9a5a7',fontFamily:'monospace'},x:{domain:[-.15,2.15],ticks:[0,1,2],tickFormat:i=>['Q','QJ','QS'][i],label:null},y:{domain:[1,Math.max(12,...values.map(v=>v.rank))+2],reverse:true,label:'Rank',grid:true},color:{range:['#dcb77e','#b0cfa4','#dda0b3'],legend:keep.length>1},marks:[Plot.ruleY([10],{stroke:'#b9a5a7',strokeDasharray:'3,4'}),Plot.line(values,{x:'position',y:'rank',stroke:'file'}),Plot.dot(values,{x:'position',y:'rank',fill:'file',symbol:'square',title:d=>`${t.repository} #${t.number}\n${d.path}\n${d.arm}: rank ${d.rank}; original Q rank ${f.paths.find(g=>g.path===d.path).ranks.Q}\n${d.arm==='Q'?'Embedding prior; no Jev judgment':('Recorded Jev judgment: '+(f.decisions[d.arm]?.[d.path]||'unavailable'))}\n${d.rank<=10?'Recovered':'Missed'} at cutoff 10. Already revealed historical fix. World ${t.world}, revision ${t.revision}.`,r:d=>focus<0||focus===d.position?5:2,fillOpacity:d=>focus<0||focus===d.position?1:.3}),Plot.text(values,{x:'position',y:'rank',text:d=>String(d.rank),dy:-13,fill:'#f1e9d9',fillOpacity:d=>focus<0||focus===d.position?1:.25})]}));
   host.querySelectorAll('[data-rank-step]').forEach(b=>b.onclick=()=>{focus=Number(b.dataset.rankStep);host.querySelectorAll('[data-rank-step]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();});
   const observer=new ResizeObserver(draw);observer.observe(host);observers.push(observer);draw();return;
  }
  let edges=mode==='calls'?record.compositions.find(c=>c.name==='Defines;Calls;DefinedIn')?.edges:mode==='shared'?record.compositions.find(c=>c.name==='Imports;ImportedBy')?.edges:null;
  if(mode==='import'){const c=record.compositions.find(c=>c.name==='Imports;ImportedBy');const fact=record.facts.find(e=>e.relation==='imports'&&e.subject.includes('DescriptionField')&&e.object.includes('TextField'));edges=c?[c.edges[0]]:fact?[[fact.relation,fact.subject,fact.object]]:[];}
  let missing=false;
  if(mode==='import'&&t.id==='sindresorhus__got-2043'){edges=[['imports','source/core/index.ts','source/core/response.ts']];missing=true;}
  if(!edges?.length){host.innerHTML='<figcaption>No verified '+esc(mode)+' composition retained for this case.</figcaption>';return;}
  const nodes=[],map=new Map();
  const add=(path,kind)=>{const id=kind+':'+path;if(!map.has(id)){const n={id,path,kind,y:nodes.length};nodes.push(n);map.set(id,n);}return map.get(id);};
  const links=edges.map(([r,a,b])=>{const [ak,bk]=domains(r);return {r,a:add(a,ak),b:add(b,bk)};});
  const transcript=edges.map(([r,a,b])=>{const [ak,bk]=domains(r);const wrap=(p,k)=>k==='file'?'['+p+']':'('+p+')';return wrap(a,ak)+'\n  '+(missing?'......> (source only)':`--${names[r]}-->`)+ '\n'+wrap(b,bk);}).join('\n\n');
  host.innerHTML='<div class="plot-mount"></div><figcaption>'+ (missing?'Dotted: confirmed in source, absent from Atlas.':'Solid arrows: retained typed facts. [file] and (symbol) are different types.')+'</figcaption><pre class="graph-transcript">'+esc(transcript)+'</pre>';
  host.dataset.edgeCount=edges.length;host.dataset.admission=missing?'source-only':'admitted';
  const draw=()=>host.querySelector('.plot-mount').replaceChildren(Plot.plot({width:Math.max(280,host.clientWidth),height:Math.max(190,nodes.length*88),marginTop:26,marginBottom:26,marginLeft:22,marginRight:14,style:{background:'transparent',color:'#f1e9d9',fontFamily:'monospace',fontSize:'12px'},x:{domain:[0,1],axis:null},y:{domain:[-.25,nodes.length-.75],reverse:true,axis:null},marks:[Plot.arrow(links,{x1:.08,x2:.08,y1:e=>e.a.y+.2,y2:e=>e.b.y-.2,title:e=>`${e.a.path}\n${missing?'Source import; no admitted edge':names[e.r]}\n${e.b.path}`,stroke:missing?'#b9a5a7':'#dcb77e',strokeDasharray:missing?'2,5':null,headLength:6}),Plot.text(nodes,{x:.04,y:'y',text:n=>n.kind==='file'?'['+n.path.split('/').pop()+']':'('+n.path.split('/').pop()+')',textAnchor:'start',title:n=>`${n.kind}: ${n.path}\n${missing?'Source-confirmed, not admitted by Atlas':'Admitted in '+t.world}\nRepository ${t.repository}, revision ${t.revision}`,fill:n=>n.kind==='file'?'#b0cfa4':'#dda0b3'}),Plot.text(links,{x:.13,y:e=>(e.a.y+e.b.y)/2,text:e=>missing?'source import; not admitted':'--'+names[e.r]+'-->',textAnchor:'start',fill:'#dcb77e'})]}));
  const observer=new ResizeObserver(draw);observer.observe(host);observers.push(observer);draw();
 });
 return ()=>observers.forEach(o=>o.disconnect());
}
