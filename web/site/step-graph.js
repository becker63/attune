import {esc} from './evidence.js';
let library;
const domain=r=>r==='calls'||r==='callers'?['symbol','symbol']:r==='defines'?['file','symbol']:r==='defined_in'?['symbol','file']:['file','file'];
export function mountGraph(root,t,f,record) {
  const core=new Set([...f.paths.map(g=>g.path),...f.annotations.flatMap(a=>a.paths.split(';')),...f.traces.flatMap(x=>Array.isArray(x.path)?x.path.flatMap(([a,,b])=>[a,b]):[])]);
  const retained=[];
  for(const fact of record.facts) if(['imports','imported_by'].includes(fact.relation)&&core.has(fact.subject)&&core.has(fact.object))retained.push([fact.relation,fact.subject,fact.object]);
  for(const trace of f.traces) if(Array.isArray(trace.path)) for(const [a,r,b] of trace.path)retained.push([r,a,b]);
  for(const c of record.compositions)for(const edge of c.edges)retained.push(edge);
  const normalize=([relation,a,b])=>{
    let [fromType,toType]=domain(relation);
    if(['imported_by','defined_in','callers'].includes(relation)) { [a,b]=[b,a];[fromType,toType]=[toType,fromType];relation={imported_by:'imports',defined_in:'defines',callers:'calls'}[relation]; }
    return {source:fromType+':'+a,target:toType+':'+b,relation,from:a,to:b};
  };
  const all=[...new Map(retained.map(r=>{const e=normalize(r);return [e.source+'|'+e.relation+'|'+e.target,e];})).values()];
  const ids=[...new Set([...f.paths.map(g=>'file:'+g.path),'file:'+t.predictions.Q[0],...all.flatMap(e=>[e.source,e.target])])];
  const gold=new Set(f.paths.map(g=>'file:'+g.path));
  let active=all,step=all.length,graph,disposed=false,fitFrame=0,mode='all', scene='connections', resultArm='QS';
  const cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(ids.length)))), rows=Math.ceil(ids.length/cols);
  const nodes=ids.map((id,i)=>({id,path:id.slice(id.indexOf(':')+1),x:300+(i%cols)*380,y:300+Math.floor(i/cols)*170,index:i,kind:id.startsWith('symbol:')?'symbol':'file',gold:gold.has(id)}));
  const style={disableSimulation:true,disableZoom:true,backgroundColor:'#140e11',nodeSize:4,
    nodeColor:n=>!isLit(n)?'#59434d':n.gold?'#b0cfa4':n.kind==='symbol'?'#dda0b3':'#dcb77e',linkColor:l=>l.relation==='imports'?'#dcb77e':'#dda0b3',linkWidth:1.4,linkArrows:true,linkVisibilityMinTransparency:1,
    showDynamicLabels:false,showHoveredNodeLabel:false,nodeLabelAccessor:n=>`[${n.index}] ${n.path.split('/').pop()}`,nodeLabelClassName:'ascii-node-label',nodeLabelColor:'#f1e9d9',
    fitViewOnInit:true,fitViewDelay:0,scaleNodesOnZoom:false,showLabelsFor:[],onZoom:()=>labels(),onZoomEnd:()=>labels()};
  root.innerHTML=`<div class="graph-caption">${ids.length} files or symbols · ${all.length} recorded connections</div>
    <div class="cosmo-stage"><div class="cosmo-canvas"></div><div class="graph-labels"></div></div><p class="graph-renderer metadata">Opening the local graph…</p>
    <div class="graph-controls"><button data-reset>All connections</button>${record.compositions.map((c,i)=>`<button data-composition="${i}">${esc(c.name.replaceAll(';',' → '))}</button>`).join('')}</div>
    <div class="graph-controls"><button data-back aria-label="Previous connection">←</button><input type="range" min="0" max="${all.length}" value="${all.length}" aria-label="Connections shown"><button data-next aria-label="Next connection">→</button><span class="step-count"></span></div>
    <p class="step-caption" aria-live="polite"></p><pre class="graph-ascii"></pre>
    <p class="metadata">Green: fixing file. Amber: other file. Rose: symbol or call connection.<br>This is the recorded neighborhood of the inspected files, not the whole repository. Inverse records are drawn once in the forward direction.</p>`;
  const canvas=root.querySelector('.cosmo-canvas'), slider=root.querySelector('input');
  const asText=e=>`${e.from}\n  --${e.relation==='imports'?'imports':e.relation==='defines'?'defines':'calls'}--> ${e.to}`;
  function isLit(n) {
    if(scene==='start')return n.id==='file:'+t.predictions.Q[0];
    if(scene==='source')return f.annotations.some(a=>a.paths.split(';').includes(n.path));
    if(scene==='results')return f.paths.some(g=>g.path===n.path&&g.ranks[resultArm]<=10);
    const shown=new Set(active.slice(0,step).flatMap(e=>[e.source,e.target]));
    return mode==='all'||shown.has(n.id);
  }
  const labelLayer=root.querySelector('.graph-labels');
  labelLayer.innerHTML=nodes.map(n=>`<span class="node-label" data-node="${n.index}" tabindex="0" data-evidence="${esc(JSON.stringify({sentence:n.path,details:n.kind+' in '+t.world+'\nRevision '+t.revision+'\n'+all.filter(e=>e.source===n.id||e.target===n.id).map(e=>e.from+' --'+e.relation+'--> '+e.to).join('\n'),source:'relationships.json'}))}">[${n.index}] ${esc(n.path.split('/').pop())}<small></small></span>`).join('');
  function labels(){
    if(!graph)return;
    nodes.forEach(n=>{const el=labelLayer.querySelector(`[data-node="${n.index}"]`),pos=graph.spaceToScreenPosition([n.x,n.y]);
      if(pos){el.style.left=`${Math.max(48,Math.min(canvas.clientWidth-48,pos[0]))}px`;el.style.top=`${Math.max(36,Math.min(canvas.clientHeight-20,pos[1]))}px`;}
      el.classList.toggle('dim',!isLit(n));el.classList.toggle('lit',isLit(n));
      const g=f.paths.find(g=>g.path===n.path);el.querySelector('small').textContent=scene==='results'&&g?`${resultArm} rank ${g.ranks[resultArm]}${g.ranks[resultArm]>10?' · missed':''}`:'';
    });
  }
  function fit(){cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(()=>{if(disposed||!graph)return;graph.fitView(0);labels();});}
  function draw() {
    const links=active.slice(0,step);
    root.dataset.step=String(step);root.dataset.edges=JSON.stringify(links);root.dataset.total=String(active.length);
    slider.max=String(active.length);slider.value=String(step);
    root.querySelector('[data-back]').disabled=step===0;root.querySelector('[data-next]').disabled=step===active.length;
    root.querySelector('.step-count').textContent=`${step} / ${active.length}`;
    root.querySelector('.step-caption').textContent=active.length?`${mode==='all'?'All retained paths and connections among the participating files.':'Selected recorded connection: '+mode+'.'} Arrows show recorded facts; they do not show model reasoning.`:'No connection between these files was retained. They are shown separately; this does not prove the source is disconnected.';
    root.querySelector('.graph-ascii').textContent=mode==='all'?(links.length?links.map(asText).join('\n\n'):'No recorded connection to draw.'):(links.length?links.map(asText).join('\n\n'):'Start of the selected connection.');
    if(graph){graph.setData(nodes,links,false);graph.start();labels();}
  }
  function select(edges,name){mode=name;active=edges;step=edges.length;draw();}
  root.querySelector('[data-reset]').onclick=()=>select(all,'all');
  root.querySelectorAll('[data-composition]').forEach(b=>b.onclick=()=>{const c=record.compositions[Number(b.dataset.composition)];select(c.edges.map(normalize),c.name);});
  root.querySelector('[data-back]').onclick=()=>{step=Math.max(0,step-1);draw();};
  root.querySelector('[data-next]').onclick=()=>{step=Math.min(active.length,step+1);draw();};
  slider.oninput=()=>{step=Number(slider.value);draw();};
  root.selectFile=path=>{const trace=f.traces.find(x=>x.target===path);select(trace&&Array.isArray(trace.path)?trace.path.map(([a,r,b])=>normalize([r,a,b])):[],path);};
  root.setScene=(next,arm='QS')=>{
    scene=next;resultArm=arm;root.dataset.scene=scene;
    if(next==='start'){mode='Starting file';active=[];step=0;}
    else if(next==='theory'&&record.compositions.length){const c=record.compositions.find(c=>c.name==='Imports;ImportedBy')||record.compositions[0];mode=c.name;active=c.edges.map(normalize);step=active.length;}
    else {mode='all';active=all;step=all.length;}
    draw();
  };
  draw();library ||= import('./vendor/cosmograph.js');
  library.then(({Cosmograph})=>{
    if(disposed)return;
    try {graph=new Cosmograph(canvas,style);draw();fit();root.dataset.renderer='cosmograph';root.querySelector('.graph-renderer').textContent='Cosmograph · fixed file positions · arrows follow the recorded relation';}
    catch {graph?.remove();graph=null;root.dataset.renderer='text';root.querySelector('.cosmo-stage').hidden=true;root.querySelector('.graph-renderer').textContent='WebGL is unavailable; the same relationships are written below.';}
  }).catch(()=>{if(!disposed){root.dataset.renderer='text';root.querySelector('.cosmo-stage').hidden=true;root.querySelector('.graph-renderer').textContent='Graph renderer unavailable. Recorded relationships are shown below.';}});
  const observer=new ResizeObserver(()=>fit());observer.observe(canvas);
  return ()=>{disposed=true;observer.disconnect();cancelAnimationFrame(fitFrame);graph?.remove();};
}
