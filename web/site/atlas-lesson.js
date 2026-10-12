import {esc} from './evidence.js';
export function atlasLesson(t,f,record,h) {
 const green=t.id==='projectevergreen__greenwood-1100',got=t.id==='sindresorhus__got-2043';
 if(!green&&!got&&t.id!=='obsidian-tasks-group__obsidian-tasks-1006')return `<p>No authored Atlas walkthrough is available for this example.</p><a class="peer-link" href="#case/${t.id}/connections">Read this case’s retained connection evidence →</a>`;
 const needle=green?'../lib/resource-utils.js':got?'./response.js':'./TextField';
 const windows=f.annotations.flatMap(a=>h.instances[a.instance]||[]);
 const window=windows.find(w=>w.code.split('\n').some(l=>l.includes('import ')&&l.includes(needle)));
 let source='';
 if(window){const i=window.code.split('\n').findIndex(l=>l.includes('import ')&&l.includes(needle)),line=window.start+i;
 const html=window.html.match(new RegExp(`<span class="code-line[^\"]*" data-line="${line}"[^>]*>.*?(?=\\n|<\\/code>)`))?.[0];
 source=`<figure class="source-window"><figcaption>${esc(window.path)}:${line}</figcaption><pre class="source-code"><code>${html||esc(window.code.split('\n')[i])}</code></pre></figure>`;}
 const edge=record.compositions.find(c=>c.name==='Imports;ImportedBy')?.edges[0]||record.facts.filter(x=>x.relation==='imports'&&x.subject.includes('DescriptionField')&&x.object.includes('TextField')).map(x=>[x.relation,x.subject,x.object])[0];
 const fact=got?'<pre class="pattern-diagram">Written target:  ./response.js\nRetained file:   response.ts\nAdmitted Imports fact: absent</pre><p>The extractor did not resolve that suffix change. Atlas cannot use this source import as an edge, even though a reader can see the dependency.</p>':edge?`<pre class="pattern-diagram">${esc(edge[1])}\n  --Imports--> ${esc(edge[2])}</pre><p>The extractor resolved the import to a file in <strong>${esc(t.world)}</strong>, this pinned source snapshot. Reading the same fact backward gives <strong>ImportedBy</strong>; it is not a second dependency.</p>`:'<p>No matching import fact is retained for this example.</p>';
 const composition=record.compositions.find(c=>c.name==='Defines;Calls;DefinedIn');
 const path=composition?`<pre class="pattern-diagram">bundle.js                         [File]\n    | Defines\n    v\nbundleSsrPages                     [Symbol]\n    | Calls\n    v\ncheckResourceExists                [Symbol]\n    | DefinedIn\n    v\nresource-utils.js                 [File]</pre><p><strong>The question:</strong> which file defines a function called by a function in <code>bundle.js</code>?</p><p><strong>One saved answer:</strong> <code>resource-utils.js</code>. This three-fact match is verified in the census. It makes the helper reachable from the starting file; it does not say the helper is relevant to the issue.</p>`:got?'<p><strong>This example stops at the missing import.</strong> No admitted import path can cross that missing edge. A composition requires recorded facts; Theory does not infer a replacement edge from a plausible filename.</p>':'<p><code>DescriptionField.ts → TextField.ts → Task.ts</code> is visible through the retained imports. But the census did not save a verified Theory composition for this case. Seeing those neighbors does not establish which field implementations need editing.</p>';
 const result=green?'<p>The helper was already Qwen’s candidate <strong>28</strong>. Jev alone left it at <strong>28</strong>. With structural metadata, its judgment changed from <strong>Unknown to Relevant</strong>, and its rank became <strong>10</strong>. That completed all eight eligible fixing files.</p>':got?'<p>Qwen found both required files at ranks <strong>1 and 6</strong>. Jev moved them to <strong>1 and 2</strong>, and the structural condition tied. Retrieval succeeded despite the missing import.</p>':'<p>With structural metadata, <code>DescriptionField.ts</code> fell from <strong>4 to 24</strong> and <code>TextField.ts</code> from <strong>6 to 28</strong>. <code>Task.ts</code> stayed first. Correct connections did not preserve the complete set of relevant files.</p>';
 const readable=(name,label)=>`<p class="metadata">${label}</p><div class="annotated-flix">${h.readable[name]}</div>`;
 return `<p>Take the file in front of us. Atlas records <em>what it defines, what it imports, and what its functions call</em>. A relation is one of those recorded connections. A composition follows several compatible relations.</p>
 <h3>Ask about words, or ask about connections</h3>
 <pre class="pattern-diagram">LEXICAL                         ATLAS
&lt;issue words&gt;                   [starting file]
     |                               |
     v                               v
&lt;matching terms&gt;                &lt;typed expression&gt;
     |                               |
     v                               v
&lt;ranked files&gt;                  &lt;connected files + witness&gt;</pre>
 <p>Lexical scoring asks which files share the issue’s words. Atlas asks which files connect to a chosen candidate in a specified way. A witness explains the connection; it does not establish relevance.</p>
 <section class="code-walk" data-walk="types"></section>
 <p><code>[file]</code>, <code>(symbol)</code> and <code>&lt;value&gt;</code> have consistent roles here. Named arrows are typed relations; <code>==&gt;</code> marks explanatory data flow.</p>
 <h3>An import becomes a fact</h3>${source}<figure class="inline-graph" data-mini="import"></figure>${green?readable('atlas-facts','Explanatory Flix record for a retained fact. Display only; world means w49.'):fact}
 <p><code>[file]</code> and <code>(symbol)</code> are different kinds of endpoint. A path is a file; a named function is a symbol. Atlas keeps those types separate.</p>
 <h3>The same fact can be read backward</h3><pre class="pattern-diagram">[a.js] --Imports----> [b.js]
[a.js] <---ImportedBy-- [b.js]

One dependency. Two directions to ask about it.</pre><p>“What does this file import?” and “Who imports this file?” read the same dependency in opposite directions. This actual Flix table defines all three pairs.</p><figure class="source-window"><figcaption>${esc(h.small.inverse.path)}:${h.small.inverse.start}–${h.small.inverse.end} · actual source</figcaption>${h.small.inverse.html}</figure>
 ${green?`<p>That gives us a useful question: <strong>who else imports the resource helper?</strong> These are the census’s saved facts, read forward and then backward.</p><figure class="inline-graph" data-mini="shared"></figure>`:''}
 <h3>A connection can become a sentence</h3>${green?`<section class="code-walk" data-walk="calls"></section><p>Start at <code>bundle.js</code>. Find a function it defines, a function that function calls, and the file defining the called function.</p><figure class="inline-graph" data-mini="calls"></figure><p><code>startingFunction</code> appears twice: both facts must mean the same function. So does <code>calledFunction</code>. Every row uses the same <code>world</code>. Those shared names are the join.</p><p>The saved answer here is <code>resource-utils.js</code>. The return value is a file connected to the start—not a declaration that it needs editing.</p>`:path}
 <p><code>Defines ; Calls ; DefinedIn</code> fits because its types line up:</p><pre class="pattern-diagram">[File] --> (Symbol) --> (Symbol) --> [File]

Imports ; Calls does not fit:
[File] --> [File]   X   (Symbol) --> (Symbol)</pre><p>Theory checks these descriptions and matches their facts. It does not turn them into semantic labels such as “plugin system”; that still requires source inspection.</p>
 <h3>What actually reaches Jev</h3><p>The fixed expression has compatible endpoints, an exact witness and a reusable shape. Its short description does not bound how many matches a hub can return. Frozen QS only judges Qwen’s first 32; it cannot rescue candidates below that boundary.</p><pre class="pattern-diagram">Qwen's first 32 files
    + candidate definitions, imports, importers
    + IDs of matched Theory templates
    |
    v
Jev's relevance decisions --> stable promotion --> QS</pre><p>The template IDs identify descriptions with recorded matches. They are not scores. Jev receives these fields, not an interactive graph traversal tool or source bodies.</p><figure class="inline-graph" data-mini="ranks"></figure>${result}<p class="metadata">The rank changes are observed. The study does not identify which connection caused a judgment, and it does not measure execution cost.</p>
 <h3>The exact matching rule underneath</h3><p>The readable sentence above explains the idea. The actual two-edge Theory rule below uses generic names so it can match different relation pairs. Comments translate the implementation; the original code remains unchanged. This does not assert an additional match for the selected case.</p><div class="annotated-flix">${h.connections.matching}</div><p class="metadata">Attune/Theory.flix:682–690. The two-edge rule illustrates the shared-import match when one is retained; the three-edge call path uses a different member of the fixed rule family.</p>`;
}
