import {esc} from './evidence.js';
import {readingData} from './signature-reading.js';
const inspect=(sentence,details,source='reading.json')=>`data-evidence="${esc(JSON.stringify({sentence,details,source}))}"`;
const controls='<div class="figure-controls"><button data-mechanics-play>Replay the steps</button><button data-mechanics-end>Show all</button><output></output></div>';
export async function mountMechanics(host,kind,alive){
 host.dataset.evidenceSource='reading.json';
 const d=await readingData();if(!alive())return ()=>{};
 let frame=0,disposed=false,playing=false,step=3,last=3;
 function stop(){cancelAnimationFrame(frame);playing=false;const b=host.querySelector('[data-mechanics-play]');if(b)b.textContent='Replay the steps';}
 let draw=()=>{},refresh=()=>{};
 if(kind==='reading-atlas-handoff'){
  host.innerHTML=controls+`<div class="handoff-story"><pre class="handoff-diagram"><span data-mechanics-step="0">Qwen already found the helper
  28  resource-utils.js
      outside the first ten</span>

<span data-mechanics-step="1">Who uses it?
  build.js -------+
  serve.js -------+---> resource-utils.js
  bundle.js ------+
  22 importing files; six names in the note</span>

<span data-mechanics-step="2">Same candidate, two requests to Jev
  basic       -> Unknown
  + Atlas     -> Relevant</span>

<span data-mechanics-step="3">Move Relevant files first
  basic       -> rank 28
  + Atlas     -> rank 10  &lt;-- inside the ten

  QS: 8 of 8 fixing files in top ten</span></pre></div><p class="mechanics-readout" aria-live="polite"></p><figcaption>Greenwood #1100 · frozen replay. Solid arrows are accepted Imports. The note also contains definitions, an import and structural answer IDs; no record identifies the deciding clue. <a href="atlas-story.json" download>Source, note, judgments and ranks</a>.</figcaption>`;
  const words=['Already on the list. Too far down to be shown.','The build command, server and bundler use this helper. Atlas supplies names from the code.','With the note, the recorded judgment changes. We cannot tell which clue made the difference.','The helper enters the first ten. All eight files in this historical fix are now there.'];
  draw=()=>{host.querySelector('.mechanics-readout').textContent=words[step];};
 }

 if(kind==='reading-memo'){
  let different=false;
  const key='World: shop-v1\nMemo namespace: demo\nExact typed input: Files{shop/receipt.rb}\nOperation: imports\nOutput: Files{shop/pricing.rb}';
  host.innerHTML=controls+'<p class="figure-key">Checked shop example · both questions use the same saved repository.</p><div class="memo-routes"><section><h4>A · start at a function</h4><pre>Symbols{Shop.Receipt.render}\n`-- defined_in -&gt; Files{shop/receipt.rb}\n    [OK; COMPUTED t3]</pre><div class="memo-question" tabindex="0" data-memo-question="A" '+inspect('A computes and saves the Imports answer at t4.',key+'\nProducer: t4\nNo answer is saved yet. Follow Imports facts and collect distinct targets.','sources/memo-contrast.flix')+'>Files{shop/receipt.rb}\n`-- imports → <span data-memo-answer="A">Files{shop/pricing.rb}</span>\n    <span data-memo-state="A">[OK; COMPUTED t4]</span></div></section><section data-mechanics-step="2"><h4>B · start at a file</h4><button data-memo-change>Try checkout.rb instead</button><div class="memo-question" tabindex="0" data-memo-question="B"><span data-memo-input>Files{shop/receipt.rb}</span>\n`-- imports → <span data-memo-answer="B">Files{shop/pricing.rb}</span>\n    <span data-memo-state="B">[OK; REUSE t4]</span></div></section></div><pre class="memo-flow"></pre><p class="mechanics-readout" aria-live="polite"></p><figcaption>Teaching replay using the shop facts. The original A/B notation comes from ReadmeCorrespondence.flix:85–96; the alternate input is checked against the current lookup in <a href="sources/memo-contrast.flix">this small executable test</a>. No wall-time saving is inferred.</figcaption>';
  const same=[['First time asking. No answer saved yet.','receipt.rb + Imports\n  -> look for a saved answer\n  -> none'],['Follow the connection once. Save what came back.','receipt.rb + Imports\n  -> follow the facts\n  -> pricing.rb\n  -> save as t4'],['Different beginning. Exactly the same question.','receipt.rb + Imports\n  -> look for a saved answer\n  -> found t4'],['We already answered this. We do not need to do it again.','receipt.rb + Imports\n  -> saved pricing.rb\n  -> [OK; REUSE t4]']];
  const changed=[...same.slice(0,2),['Only the input file changed. The saved entry still starts at receipt.rb.','saved question: receipt.rb  + Imports\nnew question:   checkout.rb + Imports'],['Same answer, but a different question. We had to follow the facts again.','checkout.rb + Imports\n  -> no saved answer\n  -> follow facts -> pricing.rb\n  -> [OK; COMPUTED t5]']];
  draw=()=>{
    const stages=different?changed:same;
    host.dataset.memoInput=different?'checkout':'receipt';
    host.querySelector('.memo-flow').textContent=stages[step][1];host.querySelector('.mechanics-readout').textContent=stages[step][0];
    host.querySelectorAll('[data-memo-question]').forEach(el=>el.classList.toggle('key-matched',step>=2&&!different));
    const second=host.querySelector('[data-memo-question="B"]');second.classList.toggle('key-different',different&&step>=2);
    host.querySelector('[data-memo-input]').textContent=different?'Files{shop/checkout.rb}':'Files{shop/receipt.rb}';
    second.dataset.evidence=JSON.stringify({sentence:different?'A different input computes a new answer, even though the output is identical.':'B reuses the answer A computed at t4.',details:(different?key.replace('Exact typed input: Files{shop/receipt.rb}','Exact typed input: Files{shop/checkout.rb}'):key)+(different?'\nProducer: B’s t5\nWork: apply Imports to checkout.rb and collect its targets. A’s entry at t4 has a different input.':'\nProducer: A’s t4\nSkipped: following Imports facts and collecting targets. The key lookup still happens.'),source:'sources/memo-contrast.flix'});
    if(step<3)second.dataset.evidence=JSON.stringify({sentence:'B’s answer has not been revealed yet. Compare this question with the saved one.',details:'World: shop-v1\nMemo namespace: demo\nExact typed input: Files{shop/'+(different?'checkout':'receipt')+'.rb}\nOperation: imports\nEarlier saved input at t4: Files{shop/receipt.rb} + imports',source:'sources/memo-contrast.flix'});
    for(const [route,ready,waiting] of [['A',step>=1,'[NO SAVED ANSWER]'],['B',step>=3,'[LOOK UP THIS QUESTION]']]){host.querySelector(`[data-memo-answer="${route}"]`).textContent=ready?'Files{shop/pricing.rb}':'?';host.querySelector(`[data-memo-state="${route}"]`).textContent=ready?(route==='A'?'[OK; COMPUTED t4]':different?'[OK; COMPUTED t5]':'[OK; REUSE t4]'):waiting;}
  };
  host.querySelector('[data-memo-change]').onclick=e=>{stop();different=!different;step=2;refresh();e.currentTarget.textContent=different?'Back to receipt.rb':'Try checkout.rb instead';host.querySelector('[data-mechanics-play]').textContent='Show what happens';};
 }

 if(kind==='reading-extinction'){
  host.innerHTML=controls+'<p class="figure-key">Greenwood w49 · actual retained sets. A frontier means the whole set we have right now, not everything visited so far.</p><pre class="extinction-tree"><span data-mechanics-step="0">Files{lib/resource-utils.js}\n`-- imports -&gt; Files{lib/hashing-utils.js} [OK]</span>\n    <span data-mechanics-step="1">+-- imports -&gt; Files{} [EMPTY]</span>\n    <span data-mechanics-step="2">|   +-- imports -&gt; Files{} [EMPTY]\n    |   `-- defines -&gt; Symbols{} [EMPTY]</span>\n    <span data-mechanics-step="3">`-- imported_by -&gt; Files{\n          lib/resource-utils.js,\n          lifecycles/bundle.js,\n          lifecycles/serve.js\n        } [OK]</span></pre><p class="mechanics-readout" aria-live="polite"></p><p class="figure-key">The bottom branch restarts from hashing-utils.js, before the empty answer. It does not bring an empty set back to life. Names omit packages/cli/src/.</p><figcaption>First and last answers are reductions of retained facts; continuations of an empty set illustrate the current apply rule. No runtime work tags are assigned. <a href="route-examples.json" download>Exact sets and supporting rows</a> · <a href="sources/memo-apply.flix">Actual apply</a>.</figcaption>';
  const words=['One file imports one helper. The answer replaces the current set.','No admitted import leaves that helper. There are zero starting items for the next lookup.','Nothing in → no matching source rows → nothing out. Changing the next operation cannot supply missing input.','A different question, asked before the dead end, finds three consumers. An empty outgoing route does not mean an unused file.'];
  draw=()=>{host.querySelector('.mechanics-readout').textContent=words[step];};
 }
 if(kind==='reading-path-words'){
  // Highlight only whole pieces already listed as matches in the checked example.
  // Scores and ranks still come from reading.json; the browser does not rank files.
  const pathText=r=>r.path.split(/([\p{L}\p{N}_]+)/u).map(part=>r.matches.includes(part.toLowerCase())?`<mark data-word="${esc(part.toLowerCase())}">${esc(part)}</mark>`:esc(part)).join('');
  host.innerHTML=controls+'<p class="path-issue">Instructional issue: <strong><mark data-word="receipt">receipt</mark> <mark data-word="total">total</mark> incorrect</strong></p><div class="table-scroll"><table class="path-word-table"><thead><tr><th>File path</th><th>Matching words</th><th>Score</th><th>Rank</th></tr></thead><tbody>'+d.path_example.map(r=>`<tr data-path-rank="${r.rank}"><td>${pathText(r)}</td><td class="path-matches">${r.matches.join(', ')||'none'}</td><td class="path-score">${r.score}</td><td>${r.rank}</td></tr>`).join('')+'</tbody></table></div><p class="mechanics-readout" aria-live="polite"></p><figcaption>P counts distinct whole-word matches, then breaks ties by the original path. These five teaching paths were checked against Study.lexicalTokens and lexicalPriorScore. <a href="sources/path-tokens.flix">Tokenizer</a> · <a href="sources/path-score.flix">Score</a> · <a href="sources/path-order.flix">Tie rule</a>.</figcaption>';
  const words=['Start with filenames in path order. The issue asks about receipt, total and incorrect.','Split at slashes and dots. Keep words of three or more characters, lowercase them, and remove repeats.','Light up whole words shared with the issue. Two matches beat one; one beats none.','Sort by the count. Ties keep path order. Camel case and underscores did not split those last two names.'];
  let priorStep=3;const rowAnimations=new Set();
  draw=()=>{const body=host.querySelector('tbody'),before=new Map([...body.children].map(row=>[row,row.getBoundingClientRect().top]));[...body.children].sort((a,b)=>step>=3?Number(a.dataset.pathRank)-Number(b.dataset.pathRank):a.firstElementChild.textContent<b.firstElementChild.textContent?-1:1).forEach(row=>body.append(row));if(step!==priorStep&&!matchMedia('(prefers-reduced-motion: reduce)').matches){rowAnimations.forEach(a=>a.cancel());rowAnimations.clear();for(const row of body.children){const delta=before.get(row)-row.getBoundingClientRect().top;if(delta){const animation=row.animate([{transform:`translateY(${delta}px)`},{transform:'none'}],{duration:300,easing:'ease-out'});rowAnimations.add(animation);animation.onfinish=()=>rowAnimations.delete(animation);}}}priorStep=step;host.dataset.wordsLit=String(step>=2);host.querySelector('.path-word-table').classList.toggle('word-ranked',step>=3);host.querySelector('.mechanics-readout').textContent=words[step];};
  host.addEventListener('evidence-pause',()=>{rowAnimations.forEach(a=>a.cancel());rowAnimations.clear();});
 }

 if(kind==='reading-branches'){
  host.innerHTML='<pre class="branch-prompt">                 Q: Qwen ranking\n                         |\n              SAME original top 32\n                  /             \\\n        basic request       structural request\n             |              + Atlas note\n             v                   v\n            Jev                 Jev\n             |                   |\n       promote Relevant    promote Relevant\n             |                   |\n            QJ                  QS</pre><p><strong>Two alternatives from the same starting list.</strong> QS does not run after QJ. Neither branch adds a candidate. A relationship can mention another file without adding it to the 32 judgments.</p><figcaption>QwenJevStages.flix:288–289 calls the same promotion function twice with the same original Q ranking and separate decisions. <a href="sources/q-branches.flix">Actual two calls</a>.</figcaption>';
 }
 if(kind==='reading-traces'){
  host.innerHTML=d.traces.map(t=>`<section class="trace-case"><h4>${esc(t.repository)} #${t.task.split('-').pop()}</h4><p>Required files in the first ten: Q <strong>${t.recovered.Q}/${t.gold_count}</strong>; QJ <strong>${t.recovered.QJ}/${t.gold_count}</strong>; QS <strong>${t.recovered.QS}/${t.gold_count}</strong>.</p>${t.conditions.QS.records.map((r,i)=>`<div class="trace-file"><p><code>${esc(r.path)}</code></p><pre ${inspect('Same original Q candidate, two separate judgments.',`${t.task}\n${r.path}\nOriginal Q: ${r.ranks.Q}\nBasic Jev: ${t.conditions.QJ.records[i].decision??'unavailable'} → rank ${r.ranks.QJ}\nStructural Jev: ${r.decision??'unavailable'} → rank ${r.ranks.QS}\nTop 10 means positions 1–10. Neither rank is a probability. This inspection shows already revealed historical labels.`)}>Q rank ${r.ranks.Q}\n+-- basic Jev: ${esc(t.conditions.QJ.records[i].decision??'unavailable')} -> QJ rank ${r.ranks.QJ}\n\`-- structural Jev: ${esc(r.decision??'unavailable')} -> QS rank ${r.ranks.QS}</pre><p class="figure-key">${t.task.startsWith('projectevergreen')?'Admitted consumers enter the prompt; the helper’s judgment changes. The individual causal clue is unknown.':t.task.startsWith('obsidian')?'The two field judgments become negative. Task.ts remains first, while required implementation files fall below ten.':'.js → .ts source resolution leaves an import absent. Both fixing files are found by Q before structure is supplied.'}</p><details><summary>Compare the exact basic and structural requests</summary><h5>Basic candidate record</h5><pre class="request-reading">${esc(t.conditions.QJ.records[i].instructions||'Unavailable')}</pre><h5>Same candidate, with structure</h5><pre class="request-reading">${esc(r.instructions||'Not present in this request; no record invented.')}</pre><p class="figure-key">Same issue and original Q shortlist. No source body or graph-navigation tool. Request hash: ${t.conditions.QS.request_sha256}</p></details></div>`).join('')}</section>`).join('')+'<figcaption>Exact public candidate fields, parsed decisions and frozen gold ranks. A note reaching Jev is observed; a model rationale selecting a particular edge is unavailable. <a href="reading.json" download>Sanitized trace records and provenance</a>.</figcaption>';
 }
 if(kind==='reading-marginal'){
  host.innerHTML='<div class="table-scroll"><table><thead><tr><th>Same 85 issues · top ten</th><th>Both QJ & QS</th><th>QS gains</th><th>QS loses</th><th>Neither</th></tr></thead><tbody>'+[['any','At least one required file'],['all','Every required file']].map(([key,name])=>`<tr ${inspect(name+' under the paired QJ and QS conditions.',JSON.stringify(d.paired[key])+'\nDenominator: all 85 eligible tasks; same Q candidate populations. Binary recovery changes, not individual file-rank changes.')}><td>${name}</td>${['both','gained','lost','neither'].map(k=>`<td>${d.paired[key][k]||0}</td>`).join('')}</tr>`).join('')+'</tbody></table></div><p>Structure adds <strong>one any-file success</strong> and <strong>two complete fixes</strong> over basic Jev here. No task loses either binary top-ten status. Individual files can still fall sharply—as the Obsidian case shows.</p><figcaption>Paired counts recomputed only from frozen ranks in evidence.json. The comparison changes the whole structural prompt; it does not isolate one Atlas relation.</figcaption>';
 }
 if(host.querySelector('[data-mechanics-play]')){
  function show(){draw();host.dataset.mechanicsStep=step;host.querySelectorAll('[data-mechanics-step]').forEach(e=>e.classList.toggle('pending',+e.dataset.mechanicsStep>step));host.querySelector('output').textContent=(step+1)+' / '+(last+1);}
  refresh=show;
  host.querySelector('[data-mechanics-play]').onclick=()=>{if(playing){stop();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){step=last;show();return;}playing=true;host.querySelector('[data-mechanics-play]').textContent='Pause replay';const from=step===last?0:step;step=from;show();const start=performance.now();function tick(now){if(disposed||!alive())return;const next=Math.max(from,Math.min(last,from+Math.floor((now-start)/1500)));if(next!==step){step=next;show();}if(next<last)frame=requestAnimationFrame(tick);else stop();}frame=requestAnimationFrame(tick);};
  host.querySelector('[data-mechanics-end]').onclick=()=>{stop();step=last;show();};host.addEventListener('evidence-pause',stop);show();
 }
 return ()=>{disposed=true;stop();};
}
