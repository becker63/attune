import * as Plot from './vendor/plot.js';
import {esc} from './evidence.js';
import {graphKey} from './chart-key.js';

const green='#a7c59c',amber='#d5ad75',pink='#ce879b',muted='#a89499';
const style={background:'transparent',color:muted,fontFamily:'monospace',fontSize:11};
let dataPromise;
const dollars=n=>'$'+n.toFixed(n<.01?5:n<1?3:2);
const caption=s=>`<figcaption>${s} <a href="costs.json" download>Receipts, pricing assumptions &amp; source hashes</a>.</figcaption>`;

export async function mountCostFigure(host,kind,alive){
  dataPromise??=fetch('costs.json').then(r=>r.json());const d=await dataPromise;
  if(!alive())return ()=>{};
  let frame=0,disposed=false,observer,playing=false;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.addEventListener('evidence-pause',stop);
 function stop(){cancelAnimationFrame(frame);playing=false;const b=host.querySelector('[data-cost-play]');if(b)b.textContent=b.dataset.label;}
  function replay(draw,duration){
    if(playing){stop();return;}stop();playing=true;
    const b=host.querySelector('[data-cost-play]');b.textContent='Pause replay';const start=performance.now();
    function tick(now){if(disposed||!alive())return;const t=reduced()?1:Math.min(1,(now-start)/duration);draw(t);if(t<1)frame=requestAnimationFrame(tick);else stop();}
    draw(0);frame=requestAnimationFrame(tick);
  }
  function watch(el,draw){const paint=()=>{if(!disposed&&alive())draw(Math.max(250,el.clientWidth));};observer=new ResizeObserver(paint);observer.observe(el);paint();}
  if(kind==='cost-latency'){
    const med=d.summary,ratio=Math.round(d.ratios.median_wait),sol=[...d.sol].sort((a,b)=>a.seconds-b.seconds),jev=new Map(d.jev.map(r=>[r.task,r]));
    const rows=sol.flatMap((r,i)=>[{...jev.get(r.task),lane:i+1-.18,arm:'Jev',color:green},{...r,lane:i+1+.18,arm:'Sol',color:pink}]);
    let limit=55,at=55,width=700;
    host.innerHTML=`<p class="factor-line"><strong>${ratio}×</strong><span>shorter median wait for the prepared judgment<br><small>Jev request ${med.Jev.median_seconds.toFixed(2)} s · Sol inspection turn ${med.Sol.median_seconds.toFixed(2)} s</small></span></p>`+
      graphKey([['line',green,'Jev · prepared shortlist'],['line',pink,'Sol · search and read'],['dot',muted,'Recorded finish'],['dash',muted,'Replay position']])+
      '<div class="figure-controls"><button data-cost-play data-label="Replay the recorded waits">Replay the recorded waits</button><button data-cost-end>Show all</button><button data-time-scale="55" aria-pressed="true">Whole wait</button><button data-time-scale="2" aria-pressed="false">First 2 seconds</button></div><div class="figure-plot"></div><p class="cost-readout" aria-live="polite"></p>'+
      caption('88 paired tasks, sorted by Sol duration. Each pair of lines uses the same issue. Recorded durations are aligned at zero for comparison; these were separate runs, not concurrent jobs. The 78× ratio divides the two medians. It compares a Jev request with a whole Sol turn, and excludes Attune preparation.');
    const el=host.querySelector('.figure-plot');
    function draw(){
      const visible=Math.min(at,limit),ended=rows.filter(r=>r.seconds<=visible);
      el.replaceChildren(Plot.plot({width,height:470,marginLeft:37,marginRight:14,marginTop:30,style,
        x:{domain:[0,limit],ticks:limit===2?[0,.5,1,1.5,2]:[0,10,20,30,40,50],label:'Seconds since each request / turn began',grid:true},
        y:{domain:[89,0],ticks:[1,22,44,66,88],label:'Issue pair'},marks:[
          Plot.ruleY(rows,{y:'lane',x1:0,x2:r=>Math.min(r.seconds,visible),stroke:'color',strokeWidth:1.4,title:r=>`${r.task}\n${r.arm}: ${r.seconds.toFixed(3)} seconds`}),
          Plot.dot(ended,{x:'seconds',y:'lane',fill:'color',r:1.6,title:r=>`${r.task}\n${r.arm}: ${r.seconds.toFixed(3)} seconds`}),
          Plot.ruleX([visible],{stroke:muted,strokeDasharray:'3 4'})]}));
      const count=arm=>rows.filter(r=>r.arm===arm&&r.seconds<=visible).length;
      host.querySelector('.cost-readout').textContent=`At ${visible.toFixed(2)} s: ${count('Jev')}/88 Jev requests finished; ${count('Sol')}/88 Sol turns finished.`;
    }
    watch(el,w=>{width=w;draw();});
    host.querySelector('[data-cost-play]').onclick=()=>replay(t=>{at=t*limit;draw();},limit===2?6000:7000);
    host.querySelector('[data-cost-end]').onclick=()=>{stop();at=limit;draw();};
    host.querySelectorAll('[data-time-scale]').forEach(b=>b.onclick=()=>{stop();limit=Number(b.dataset.timeScale);at=limit;host.querySelectorAll('[data-time-scale]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();});
  }
  if(kind==='cost-money'){
    const qs=[...d.jev].sort((a,b)=>a.task.localeCompare(b.task)),sol=new Map(d.sol.map(r=>[r.task,r]));
    let qsum=0,ssum=0;const points=qs.flatMap((r,i)=>{qsum+=r.usd;ssum+=sol.get(r.task).usd;return [
      {n:i+1,task:r.task,usd:d.cold_embedding_usd,series:'Cold Qwen retrieval',color:green},
      {n:i+1,task:r.task,usd:qsum+d.cold_embedding_usd,series:'Cold Qwen + Jev',color:amber},
      {n:i+1,task:r.task,usd:ssum,series:'Sol estimate',color:pink}];});
    let count=88,width=700;
    host.innerHTML=`<p class="factor-line"><strong>${Math.round(d.summary.Sol.usd/d.cold_embedding_usd)}×</strong><span>lower known model spend for Qwen retrieval<br><small>$0.141 recorded acquisition · $4.65 Sol API estimate</small></span></p><p class="factor-secondary"><strong>${Math.round(d.ratios.model_cost_including_cold)}×</strong> lower including structural-context Jev judgment: <strong>$0.165</strong> versus <strong>$4.65 estimated</strong>.</p>`+
      graphKey([['line',green,'Cold Qwen retrieval · recorded'],['line',amber,'Cold Qwen + Jev · recorded'],['dash',pink,'Sol · API-price estimate']])+
      '<div class="figure-controls"><button data-cost-play data-label="Count the 88 recorded tasks">Count the 88 recorded tasks</button><button data-cost-end>Show total</button></div><div class="figure-plot"></div><p class="cost-readout" aria-live="polite"></p>'+
      caption('Tasks are counted in task-ID order, not elapsed time. The green line holds the full $0.1409903 Qwen acquisition charge; amber adds each prepared Jev judgment. Acquisition is charged in full from the start, not allocated per task. Sol is estimated from actual token counts at published Standard API rates, including cached-input discounts. Its actual ChatGPT-plan bill is unknown. All lines exclude build and extraction compute.');
    const el=host.querySelector('.figure-plot');
    function draw(){
      const visible=points.filter(r=>r.n<=count),actual=visible.filter(r=>r.series!=='Sol estimate'),estimated=visible.filter(r=>r.series==='Sol estimate');
      el.replaceChildren(Plot.plot({width,height:365,marginLeft:57,marginRight:18,marginTop:30,style,
        x:{domain:[1,88],ticks:[1,22,44,66,88],label:'Recorded tasks counted'},
        y:{type:'log',domain:[.0001,10],ticks:[.0001,.001,.01,.1,1,10],tickFormat:n=>'$'+n,label:'Dollars · each large step is 10×',grid:true},marks:[
          Plot.line(actual,{x:'n',y:'usd',z:'series',stroke:'color'}),Plot.line(estimated,{x:'n',y:'usd',stroke:pink,strokeDasharray:'4 4'}),
          Plot.dot(visible,{x:'n',y:'usd',fill:r=>r.series==='Sol estimate'?'#1a1015':r.color,stroke:'color',r:2,title:r=>`${r.n} tasks · ${r.series}: $${r.usd.toFixed(6)}\nLast added: ${r.task}`})]}));
      host.querySelector('.cost-readout').textContent=points.filter(r=>r.n===count).map(r=>`${r.series}: ${dollars(r.usd)}`).join(' · ');
    }
    watch(el,w=>{width=w;draw();});host.querySelector('[data-cost-play]').onclick=()=>replay(t=>{const n=Math.min(88,1+Math.floor(t*88));if(n!==count){count=n;draw();}},5000);
    host.querySelector('[data-cost-end]').onclick=()=>{stop();count=88;draw();};
  }
  if(kind==='cost-pricing'){
    host.innerHTML='<div class="table-scroll"><table class="pricing-table"><caption>Estimated Standard API bill for 88 inspected Sol turns</caption><thead><tr><th scope="col">Recorded tokens</th><th scope="col">Count</th><th scope="col">$ / million</th><th scope="col">Estimate</th></tr></thead><tbody>'+d.parts.map(p=>`<tr><th scope="row">${esc(p.label)}</th><td>${p.tokens.toLocaleString('en-US')}</td><td>$${p.rate.toFixed(2)}</td><td>$${p.usd.toFixed(3)}</td></tr>`).join('')+`</tbody><tfoot><tr><th scope="row" colspan="3">Total API-equivalent estimate</th><td>$${d.summary.Sol.usd.toFixed(3)}</td></tr></tfoot></table></div>`+
      caption('Rates checked 10 October 2026: <a href="https://developers.openai.com/api/docs/models/gpt-6.1-sol">official gpt-6.1-sol model pricing</a>. All retained input totals are below 272,000 tokens per turn. Cache writes are zero; reasoning tokens are already in output. Standard pricing assumed, with no fast-mode or regional premium, no tool-compute fees, and no claim about the subscription bill.');
  }
  return ()=>{disposed=true;stop();observer?.disconnect();};
}
