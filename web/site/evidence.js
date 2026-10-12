// Render recorded facts and excerpts. No graph evaluation runs here.
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const patternNames = {
  'api-barrel':'One file exposes several modules', 'ast-visitor':'Different code runs for different syntax nodes',
  'configuration-policy':'A setting selects what code does', 'dependency-injection':'The caller supplies a helper',
  'event-subscription':'An event triggers a registered function', 'external-adapter':'A wrapper translates between two APIs',
  'generated-boundary':'Code writes other code', 'hook-registry':'A name selects a registered implementation',
  'initialization-protocol':'Setup steps must happen in order', 'plugin-chain':'Plugins process a value one after another',
  'shared-utility':'Several files use the same helper', 'transformation-pipeline':'Several steps transform the same data'
};
const relations={imports:'Imports',imported_by:'ImportedBy',defines:'Defines',defined_in:'DefinedIn',calls:'Calls',callers:'Callers'};
const limits={
  'event-subscription':'An import does not tell Atlas which event runs which function.',
  'hook-registry':'An import does not tell Atlas which dictionary key selects which function or object.',
  'ast-visitor':'Imports and calls do not tell Atlas which syntax node selects a callback or when it runs.',
  'dependency-injection':'An import does not tell Atlas which concrete helper was passed into a parameter.',
  'transformation-pipeline':'Imports and calls do not describe the data passed between steps or their required order.',
  'generated-boundary':'The six relations do not say that one file generated another file.',
  'configuration-policy':'An import does not record which setting or condition selects a behavior.',
  'external-adapter':'Imports and calls do not describe how values or callback contracts change across an external API.',
  'initialization-protocol':'Imports do not say which setup step must finish first or which settings it changes.',
  'plugin-chain':'Imports do not describe how plugins are discovered, selected or ordered.',
  'shared-utility':'Two files importing one helper does not prove both are affected by the same bug.',
  'api-barrel':'An import is not the same as a public export. This extractor can miss re-export connections.'
};
export function edgeText(from,relation,to) {
  if(relation==='imports') return `${from}\n  ------> ${to}\n  The first file imports the second.`;
  if(relation==='imported_by') return `${from}\n  <------ ${to}\n  The second file imports the first. Followed backward.`;
  return `${from}\n  ------> ${to}\n  Recorded relation: ${relations[relation] || relation}`;
}
function participantDiagram(a) {
  const edges=a.observed_Atlas_motif.split(';').map(x=>x.split('|')).filter(x=>x.length===3 && relations[x[0]]);
  if(edges.length) return edges.map(([r,from,to])=>edgeText(from,r,to)).join('\n\n');
  return ['Files inspected:',...a.paths.split(';').map(p=>'  '+p),'','No import between these participants is recorded','in this pattern entry. This is not proof that','the source files are unrelated.'].join('\n');
}
function sourceBlock(s) {
  return `<figure class="source-window"><figcaption>${esc(s.path)}:${s.start}–${s.end}</figcaption>${s.html}</figure>`;
}
export function sourceEvidence(t,f,highlighted,tasks) {
  return `<section id="source-section" class="case-section"><h2>What the code does</h2>
    ${f.annotations.length?'<p>These patterns were checked in the source. Highlighted lines are the original evidence; nearby lines provide context.</p>':'<p class="not-inspected"><strong>Not inspected.</strong> This issue has recorded rankings, but no source explanation from the census. No pattern is assigned here.</p>'}
    ${f.annotations.map(a=>`<article class="pattern-instance">
      <h3>${esc(patternNames[a.pattern] || a.pattern)}</h3><p class="pattern-role">${esc(a.role)}</p>
      <div class="pattern-columns"><div><pre class="pattern-diagram">${esc(participantDiagram(a))}</pre><h4>What the graph cannot tell us</h4><p>${esc(limits[a.pattern])}</p><p class="metadata">Census term: ${esc(a.pattern)} · ${esc(a.instance)} · checked in source · confidence ${esc(a.confidence)}<br>Functions and types: ${esc(a.symbols)}</p></div>
      <div class="source-windows">${highlighted.instances[a.instance]?.length?highlighted.instances[a.instance].map(sourceBlock).join(''):`<pre class="evidence">${esc(a.excerpts)}</pre>`}</div></div>
      <p class="metadata">Same behavior in other repositories: ${[...new Map(tasks.filter(x=>x.repository!==t.repository&&x.patterns.includes(a.pattern)).map(x=>[x.repository,x])).values()].map(x=>`<a class="peer-link" href="#case/${x.id}">${esc(x.group)} #${x.number}</a>`).join(' · ') || 'No independent example recorded.'}</p>
    </article>`).join('')}</section>`;
}
export function connections(f) {
  return `<section id="connections-section" class="case-section"><h2>3. Can recorded imports connect the files?</h2>
    <p>The census started at Qwen’s first result and checked for import paths to the files changed by the fix. A path shows a connection; it does not show why Jev changed a rank.</p>
    ${f.traces.length?f.traces.map(x=>`<article class="trace"><h3>${esc(x.target)}</h3>${!Array.isArray(x.path)?`<p>No path was found using the recorded imports. Missing imports can cause this; the source files may still work together.</p><pre class="pattern-diagram">${esc(x.start)}\n\nNo recorded import path\n\n${esc(x.target)}</pre>`:x.path.length?`<p>${x.path.length} import ${x.path.length===1?'step':'steps'}, starting at ${esc(x.start)}.</p><pre class="pattern-diagram">${esc(x.path.map(([from,r,to],i)=>`Step ${i+1}\n${edgeText(from,r,to)}`).join('\n\n'))}</pre><p class="metadata">Atlas names: ${esc(x.path.map(e=>relations[e[1]]).join(' ; '))}</p>`:'<p>Qwen’s first result is this file. No import step is needed.</p>'}</article>`).join(''):'<p>No path check was retained for this issue. We cannot tell from this record whether an import path exists.</p>'}</section>`;
}
export function theorySection(t,f,highlighted) {
  return `<section id="theory-section" class="case-section"><h2>Follow one shared helper, in plain English</h2>
    <p>This worked example is Greenwood #1100${t.id==='projectevergreen__greenwood-1100'?'':', not an additional finding about the selected issue'}. Its saved relationships explain what the current Theory.flix code can match. They are not a replay of the historical reranker’s reasoning.</p>
    ${highlighted.theoryHTML}
    <p class="metadata">Example paths: packages/cli/src/lifecycles/bundle.js, packages/cli/src/lib/resource-utils.js, packages/cli/src/lifecycles/graph.js. Connection provenance: census composition-evidence.tsv, Greenwood #1100, Imports ; ImportedBy.<br>Current Theory.flix SHA-256 ${highlighted.theory[0].sha256}. Descriptions admit at most three connections, four positions, two outputs and one inequality.</p></section>`;
}

export function provenance(f) {
  return `<details class="provenance"><summary>Source records, confidence and repeated examples</summary>${f.annotations.map(a=>`<p>${esc(a.instance)} / ${esc(a.pattern)}: ${esc(a.confidence)} confidence.<br>Also recorded in: ${esc(a.independent_recurrence)}<br>${esc(a.provenance)}<br>Specific limitation: ${esc(a.unexposed_relationships)}</p>`).join('') || '<p>No source pattern was inspected for this case.</p>'}</details>`;
}
