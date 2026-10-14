import {esc} from './evidence.js';

// Presentation of recorded file identities and ranks, never a live ranker.
export async function mountSequence(host, alive) {
  const data=await fetch('sequence.json').then(r=>r.json());
  if(!alive())return ()=>{};
  const labels=['The repository','1. Qwen','2. Atlas','3. Jev','The ten shown'];
  const explanations=[
    ['393 files. Where is the missing resource?','Each dot is a real file in Greenwood #1100. Start in path order; nothing has been scored yet.'],
    ['Put promising files first. Keep 32 for a closer look.','Qwen describes the issue and files with numbers; Flix compares them. The other 361 files stay in the full ranking, outside the judgment budget.'],
    ['Same 32 files. Now show who uses whom.','These 17 arrows are accepted imports among the shortlist. Atlas supplies connection summaries and saved structural-answer IDs to Jev. It does not move a file or add a candidate.'],
    ['Ten say Relevant. Move those to the front.','Jev makes the judgments; Flix moves that group first, preserving Qwen’s order within it. Relevant is the model’s answer, not proof of a fix.'],
    ['The helper makes the cut: 28 → 10.','All 393 files remain ranked. We show the first ten. This saved structural-prompt result does not identify which clue changed the helper’s judgment.']
  ];
  host.innerHTML=`<div class="figure-controls"><button data-net-play>Replay these files</button><button data-net-end>Show result</button><span>Recorded ranks · explanatory motion</span></div><ol class="net-steps">${labels.map((s,i)=>`<li><button data-net-step="${i}">${s}</button></li>`).join('')}</ol><svg class="candidate-net" viewBox="0 0 700 370" role="img" aria-label="393 Greenwood candidate files become a judged shortlist and a top ten"></svg><p class="net-identity" aria-live="polite">Point to a file for its name and recorded ranks.</p><p class="net-heading"></p><p class="net-explanation"></p><label class="replay-scrubber">Step through the explanation <input type="range" min="0" max="4" step="0.01" value="0" aria-label="Pipeline replay position"></label><figcaption>One dot = one file. Number = rank at this step. Solid arrow = admitted Imports, pointing toward the dependency. Green = Jev marked Relevant; amber = no judgment yet; grey = NotRelevant or Unknown; dim = outside the current view. Greenwood w49, revision ${data.revision.slice(0,12)}. <a href="sequence.json" download>All 393 rows, 17 edges and source hashes</a>.</figcaption>`;
  host.querySelector('svg').before(host.querySelector('.net-heading'));
  let narrow=host.clientWidth<500;
  const svg=host.querySelector('svg'),ns='http://www.w3.org/2000/svg';
  function node(tag,attrs,parent=svg){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;}
  const defs=node('defs',{}),marker=node('marker',{id:'net-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto'},defs);node('path',{d:'M 0 0 L 10 5 L 0 10',fill:'#a7c59c'},marker);
  const edgeGroup=node('g',{}),fileGroup=node('g',{}),map=new Map();
  const files=data.candidates.map((file,index)=>{
    const g=node('g',{},fileGroup),circle=node('circle',{r:3,fill:'#d5ad75'},g);
    const title=node('title',{},g);title.textContent=file.path;
    const number=node('text',{y:-10,'text-anchor':'middle','font-size':10,fill:'#efe4d6'},g);
    const label=node('text',{y:19,'text-anchor':'middle','font-size':9,fill:'#a89499'},g);
    const f={...file,index,g,circle,number,label};map.set(file.path,f);
    const inspect=()=>{host.querySelector('.net-identity').textContent=`${file.path} · Q ${file.Q} → QS ${file.QS} · ${file.QS_judgment}`;};
    g.onmouseenter=inspect;g.onfocus=inspect;
    g.setAttribute('aria-label',`${file.path}: Qwen rank ${file.Q}, structural judgment rank ${file.QS}, ${file.QS_judgment}`);
    return f;
  });
  const edges=data.imports.map(e=>({...e,el:node('path',{fill:'none',stroke:'#a7c59c','stroke-width':1,'marker-end':'url(#net-arrow)'},edgeGroup)}));
  function point(f,stage){
    if(stage===0)return narrow?[18+(f.index%18)*18.4,25+Math.floor(f.index/18)*17]:[20+(f.index%25)*27.4,30+Math.floor(f.index/25)*20];
    if(f.Q>32)return narrow?[15+(f.index%60)*5.4,440+Math.floor(f.index/60)*7]:[20+(f.index%100)*6.6,325+Math.floor(f.index/100)*7];
    const rank=stage>=3?f.QS:f.Q;
    if(stage===4&&rank>10)return narrow?[15+(rank-11)*15,435]:[20+(rank-11)*29,320];
    if(stage===4)return narrow?[180,25+(rank-1)*40]:[175+Math.floor((rank-1)/5)*350,35+((rank-1)%5)*54];
    return narrow?[40+((rank-1)%4)*90,35+Math.floor((rank-1)/4)*53]:[45+((rank-1)%8)*87,45+Math.floor((rank-1)/8)*76];
  }
  let position=0,frame=0,playing=false,disposed=false;
  function draw(value){
    position=value;const a=Math.floor(value),b=Math.min(4,a+1),t=value-a,stage=Math.round(value);
    host.querySelectorAll('[data-net-step]').forEach((e,i)=>e.setAttribute('aria-current',i===stage?'step':'false'));
    host.querySelector('.net-heading').textContent=explanations[stage][0];host.querySelector('.net-explanation').textContent=explanations[stage][1];host.querySelector('input').value=value;
    for(const f of files){const p=point(f,a),q=point(f,b);f.x=p[0]+(q[0]-p[0])*t;f.y=p[1]+(q[1]-p[1])*t;f.g.setAttribute('transform',`translate(${f.x},${f.y})`);const short=f.Q<=32,visible=stage===0||short&&(stage!==4||f.QS<=10);
      f.g.style.opacity=visible?'1':'.12';f.circle.setAttribute('r',stage===0||!short?2:4);f.circle.setAttribute('fill',stage>=3&&short?(f.QS_judgment==='Relevant'?'#a7c59c':'#a89499'):'#d5ad75');
      f.number.textContent=stage>0&&short&&(stage!==4||f.QS<=10)?String(stage>=3?f.QS:f.Q):'';
      f.label.textContent=stage===4&&f.QS<=10?f.path.replace('packages/cli/src/',''):stage>0&&stage<4&&[1,2,28].includes(f.Q)?f.path.split('/').pop():'';
      f.g.setAttribute('tabindex',short?'0':'-1');
    }
    for(const e of edges){const s=map.get(e.source),t=map.get(e.target),cx=(s.x+t.x)/2,cy=Math.min(s.y,t.y)-24,dx=t.x-cx,dy=t.y-cy,length=Math.hypot(dx,dy)||1;e.el.setAttribute('d',`M${s.x},${s.y} Q${cx},${cy} ${t.x-dx/length*7},${t.y-dy/length*7}`);e.el.style.opacity=stage===2?'.65':'0';}
  }
  host.addEventListener('evidence-pause',stop);
 function stop(){cancelAnimationFrame(frame);playing=false;host.querySelector('[data-net-play]').textContent='Replay these files';}
  function play(){if(playing){stop();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){draw(4);return;}playing=true;host.querySelector('[data-net-play]').textContent='Pause replay';const start=performance.now(),from=position>=4?0:position;const tick=now=>{if(disposed)return;const v=Math.max(0,Math.min(4,from+(now-start)/2700));draw(v);if(v<4)frame=requestAnimationFrame(tick);else stop();};frame=requestAnimationFrame(tick);}
  host.querySelector('[data-net-play]').onclick=play;host.querySelector('[data-net-end]').onclick=()=>{stop();draw(4);};host.querySelector('input').oninput=e=>{stop();draw(Number(e.target.value));};host.querySelectorAll('[data-net-step]').forEach(b=>b.onclick=()=>{stop();draw(Number(b.dataset.netStep));});draw(0);
  const resize=new ResizeObserver(()=>{narrow=host.clientWidth<500;svg.setAttribute('viewBox',narrow?'0 0 360 495':'0 0 700 370');draw(position);});resize.observe(host);
  return ()=>{disposed=true;stop();resize.disconnect();};
}
