import {esc} from './evidence.js';
import {graphKey} from './chart-key.js';
const ink='#efe4d6',muted='#a89499',green='#a7c59c',amber='#d5ad75',pink='#ce879b';
const duration=t=>t<1?Math.round(t*1000)+' ms':t<60?t.toFixed(t<10?2:1)+' s':(t/60).toFixed(1)+' min';
export async function mountTimeScale(host,alive){
 const d=await fetch('wait-classes.json').then(r=>r.json());if(!alive())return ()=>{};
 let width=700,threshold=3600,frame=0,playing=false,disposed=false;
 host.innerHTML='<p class="clock-instruction">Every dot is one recorded wait. Read rightward for longer waits.</p>'+graphKey([['square',muted,'Box: middle half of observations'],['line',ink,'Line inside box: median'],['diamond',pink,'Diamond: mean'],['dot',amber,'One operation · hover for exact duration']])+'<p class="clock-scale-note">The scale stretches short waits so we can see them: each equal distance means 10× longer (a logarithmic scale). Point to a mark for its exact value, or focus a dot and use the arrow keys.</p><div class="figure-controls"><button data-clock-play>Reveal the wait lengths</button><button data-clock-end>Show all observations</button><output></output></div><div class="clock-plot"></div><p class="clock-readout" aria-live="polite"></p><div class="wait-boundaries"></div><figcaption>Separate retained measurements, not a concurrent schedule: 351 Qwen requests; 90 source-extraction and 90 Theory processes; 88 Jev requests and 88 Sol turns. The two model-turn populations include three issues excluded from the 85-task accuracy cohort. Boxes span the 25th–75th percentiles. Whiskers reach observed values within 1.5 box widths; farther dots are outliers. Statistics are calculated in seconds. These show variability, not confidence intervals. <a href="wait-classes.json" download>All 707 observations, statistics, boundaries and source hashes</a>.</figcaption>';
 const plot=host.querySelector('.clock-plot'),boundaries=host.querySelector('.wait-boundaries');
 boundaries.innerHTML=d.classes.map(c=>`<section id="wait-${c.id}"><h4>${esc(c.name)} <span>n = ${c.stats.n}</span></h4><p><strong>Timer:</strong> ${esc(c.boundary)}</p><p><strong>Scheduling / reuse:</strong> ${esc(c.opportunity)}</p></section>`).join('');
 host.addEventListener('evidence-pause',stop);
 function stop(){cancelAnimationFrame(frame);playing=false;host.querySelector('[data-clock-play]').textContent='Reveal the wait lengths';}
 function draw(){
  const narrow=width<500,left=9,right=width-12,pitch=narrow?162:149,height=pitch*5+50,lo=.1,hi=3600;
  const x=v=>left+(right-left)*(Math.log10(Math.max(lo,v))-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo));
  const text=(xx,y,s,c=muted,size=11,anchor='start')=>`<text x="${xx}" y="${y}" fill="${c}" font-size="${size}" text-anchor="${anchor}">${esc(s)}</text>`;
  let svg='';const ticks=narrow?[.1,1,10,100,1000]:[.1,1,10,60,600,3600];
  for(const t of ticks)svg+=`<line x1="${x(t)}" x2="${x(t)}" y1="23" y2="${height-30}" stroke="#624653" stroke-opacity=".25"/>`+text(x(t),13,t<1?'0.1 s':t<60?t+' s':t/60+' min',muted,10,t===lo?'start':t===hi?'end':'middle');
  d.classes.forEach((c,i)=>{
   const top=42+i*pitch,y=top+(narrow?71:61),s=c.stats,color=i===0||i===3?green:i===4?pink:amber;
   svg+=text(left,top,c.name,ink,narrow?13:14)+text(left,top+20,(narrow?c.unit:c.tool+' · '+c.unit)+' · n='+s.n,muted,narrow?10:10);
   const detail=c.name+' · n='+s.n+' · median '+duration(s.median)+' · mean '+duration(s.mean)+' · Q1 '+duration(s.q1)+' · Q3 '+duration(s.q3)+' · whiskers '+duration(s.low)+' to '+duration(s.high)+' · '+s.outliers+' outliers';
   svg+=`<g data-wait-box="${c.id}" tabindex="0" aria-label="${esc(detail)}"><title>${esc(detail)}</title><line x1="${x(s.low)}" x2="${x(s.high)}" y1="${y}" y2="${y}" stroke="${color}"/><path d="M${x(s.low)} ${y-7}V${y+7} M${x(s.high)} ${y-7}V${y+7}" stroke="${color}"/><rect x="${x(s.q1)}" y="${y-11}" width="${Math.max(.7,x(s.q3)-x(s.q1))}" height="22" fill="#24191f" stroke="${color}"/><line x1="${x(s.median)}" x2="${x(s.median)}" y1="${y-11}" y2="${y+11}" stroke="${ink}" stroke-width="2"/></g>`;
   svg+=c.observations.map((r,j)=>{const yy=y+30+(j%5-2)*2.7;return `<circle data-wait-observation="${c.id}" cx="${x(r.seconds)}" cy="${yy}" r="2" fill="${color}" fill-opacity="${r.seconds<=threshold?.55:.055}" tabindex="${j===0?0:-1}" aria-label="${esc(c.name+' · '+r.id+' · '+r.seconds.toFixed(3)+' seconds')}"><title>${esc(c.name+' · '+r.id+'\n'+r.seconds.toFixed(3)+' seconds · '+r.detail+'\n'+c.unit)}</title></circle>`;}).join('');
   const mx=x(s.mean);svg+=`<path d="M${mx} ${y-5}l5 5 -5 5 -5 -5Z" fill="${pink}"><title>${esc(c.name+' · arithmetic mean '+s.mean.toFixed(6)+' seconds')}</title></path>`;
   svg+=text(left,y+57,'median '+duration(s.median)+' · mean '+duration(s.mean)+' · longest '+duration(s.max),muted,narrow?10:11);
   if(i<4)svg+=`<line x1="${left}" x2="${right}" y1="${top+pitch-18}" y2="${top+pitch-18}" stroke="#48303b"/>`;
  });
  if(threshold<hi)svg+=`<line x1="${x(threshold)}" x2="${x(threshold)}" y1="23" y2="${height-30}" stroke="${ink}" stroke-dasharray="2 4"/>`;
  svg+=text(left,height-4,'Duration per recorded operation · seconds, logarithmic scale',muted,10);
  plot.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Five box-and-whisker plots with 707 individual observations. Each row has its own stated measurement boundary.">${svg}</svg>`;
  const n=d.classes.reduce((sum,c)=>sum+c.observations.filter(r=>r.seconds<=threshold).length,0);
  host.querySelector('output').textContent=n+' / 707 observations';
  host.querySelector('.clock-readout').textContent=threshold>=hi?'Different units of work, deliberately labeled. Median Jev request: 0.370 s; median inspected Sol turn: 28.942 s. That is 78.2× across these stated boundaries, not a comparison of model kernels.':`Reveal threshold: ${duration(threshold)}. ${n} recorded operations took no longer than this. This animation reveals a distribution; it is not a replay of concurrent jobs.`;
  host.dataset.clockSeconds=String(threshold);
  plot.querySelectorAll('[data-wait-observation]').forEach(dot=>dot.onkeydown=e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   e.preventDefault();stop();const row=[...plot.querySelectorAll('[data-wait-observation="'+dot.dataset.waitObservation+'"]')],i=row.indexOf(dot);
   const next=e.key==='Home'?0:e.key==='End'?row.length-1:Math.max(0,Math.min(row.length-1,i+(e.key==='ArrowRight'?1:-1)));
   row.forEach(n=>n.setAttribute('tabindex','-1'));row[next].setAttribute('tabindex','0');row[next].focus();
  });
 }
 const resize=new ResizeObserver(()=>{if(!disposed&&alive()){width=Math.max(260,plot.clientWidth);draw();}});resize.observe(plot);width=Math.max(260,plot.clientWidth);draw();
 host.querySelector('[data-clock-play]').onclick=()=>{if(playing){stop();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){threshold=3600;draw();return;}playing=true;host.querySelector('[data-clock-play]').textContent='Pause reveal';const from=threshold===3600?.1:threshold,start=performance.now();function tick(now){if(disposed||!alive())return;const t=Math.max(0,Math.min(1,(now-start)/8000));threshold=from*Math.pow(3600/from,t);draw();if(t<1)frame=requestAnimationFrame(tick);else stop();}frame=requestAnimationFrame(tick);};
 host.querySelector('[data-clock-end]').onclick=()=>{stop();threshold=3600;draw();};
 return ()=>{disposed=true;stop();resize.disconnect();};
}
