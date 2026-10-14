"""Reduce one retained qualitative diagnostic; no provider or production ranking."""
from pathlib import Path
import json
import math
import hashlib

O = Path(__import__('os').environ.get('ATTUNE_EXPERIMENT', '/home/becker/experiments/attune-native-patterns-20261013'))
raw = O / 'raw/preact-diagnostic.json'
x = json.loads(raw.read_text())
q = x['query']
methods = {m['method']: m for m in q['methods']}
combined = methods['embeddings+atlas']
stages = {s['label']: s for s in combined['stages']}
qr = {p: i+1 for i, p in enumerate(stages['Qwen ranking']['paths'])}
sr = {p: i+1 for i, p in enumerate(stages['Follow relationships']['paths'])}
merged = stages['Merge rankings']['merge']
for row in merged:
    p = row['path']
    ranks = [qr.get(p), sr.get(p)]
    votes = [1/(60+r) if r else 0 for r in ranks]
    assert row['ranks'] == ranks
    assert row['votes'] == votes
    assert row['score'] == sum(votes)
assert [r['path'] for r in sorted(merged, key=lambda r: (-r['score'], r['path']))] == stages['Merge rankings']['paths']
for r, expected in zip(combined['results'], merged):
    assert r['path'] == expected['path'] and r['score'] == expected['score']
rows = []
for name, method in methods.items():
    scores = [r['score'] for r in method['results']]
    extent = max([0]+scores)-min([0]+scores) or 1
    pool = method.get('pool', next((s['paths'] for s in method['stages'] if s['label']=='Candidate pool'), []))
    for i, r in enumerate(method['results']):
        rows.append({'method': name, 'rank': i+1, 'path': r['path'], 'score': r['score'],
                     'qwen_rank': qr.get(r['path']), 'structural_rank': sr.get(r['path']),
                     'bar_percent': abs(r['score'])/extent*100,
                     'gap_to_next': r['score']-scores[i+1] if i+1<len(scores) else None,
                     'pool_size': len(pool)})
(O/'tables/viewer-scores.json').write_text(json.dumps(rows,indent=2)+'\n')
text = ['# Retained Preact score audit', '',
f'Question: `{q["question"]}`. Repository `preactjs/preact`, revision `{q["revision"]}`, exactly {x["files"]} viewer-admitted files. Query `{q["queryId"]}`.', '',
f'The retained observation SHA256 is `{hashlib.sha256(raw.read_bytes()).hexdigest()}`. This is a qualitative diagnostic, outside the fixing-path benchmark. Receipt IDs and the complete 120-file ranking are preserved in `raw/preact-diagnostic.json`.', '',
'All 120 saved fusion calculations reproduce exactly as `1/(60+Qwen rank) + 1/(60+structural rank)`; a missing structural rank contributes zero. Lexical scores count word matches (three per path match and one per source match). Qwen scores are cosine similarities. Structural order counts distinct anchor/route evidence. Jev outputs are provider judgments over three different 30-file pools and contexts. These scales are not interchangeable and none is established here as a calibrated probability.', '',
'| Method | First | Second | Third |', '|---|---|---|---|']
for name, m in methods.items():
    text.append('| '+name+' | '+' | '.join(f'{r["path"]}: {r["score"]:.9g}' for r in m['results'][:3])+' |')
text += ['', 'The structural top three reflect rank agreement: `compat/src/suspense.js` has ranks (4,1), `devtools/src/index.js` (1,4), and `hooks/src/index.js` (3,2). Their fused scores are nearly tied; fusion does not produce a sharp probability peak. `src/options.js` drops from Qwen rank 2 to fusion rank 9 because its structural rank is 38. `compat/src/hooks.js` rises from 7 to 5.', '',
'The sharpest displayed peak is the saved combined-pool Jev judgment: 0.90, 0.67, 0.46. It comes after a distinct pool and structural context were presented to the judge. The embedding-pool Jev arm instead begins 0.87, 0.83, 0.58. These are historical judgments, not matched evidence that any new pattern helps.', '',
'The inspected viewer sets each chart extent from zero to the maximum displayed score and uses `abs(score)/extent` for bar width, with four significant digits in text. That changes visual widths within each method; it does not change the producer score. Cross-chart sharpness therefore mixes producer scale, pool/context, and display scale. `tables/viewer-scores.json` reconstructs every displayed top-ten value, rank change, bar width and adjacent gap.', '',
'The saved export has receipt identifiers and usage observations, but does not contain every exact request/response body needed to reapply old Jev judgments to a changed pattern context. Such replay is `ReferenceUnavailable` unless the complete exact request matches. No provider request was made for this audit.']
(O/'VIEWER-AUDIT.md').write_text('\n'.join(text)+'\n')
print('Verified 120 exact RRF values and 60 displayed scores')
