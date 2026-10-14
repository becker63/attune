"""Test-only exhaustive finite interpretation, independent of native rule execution.

This intentionally slow Cartesian reference is limited to the 13 tiny fixtures.
It is never imported by prediction or applied to repository facts.
"""
from pathlib import Path
import itertools
import json
import sys

ROOT = Path(__import__('os').environ.get('ATTUNE_EXPERIMENT', '/home/becker/experiments/attune-native-patterns-20261013'))
patterns = [p for p in json.loads((ROOT / 'patterns.json').read_text()) if p['selected']]
cases = json.loads((ROOT / 'inputs/finite.json').read_text())
actual = dict(json.loads(Path(sys.argv[1]).read_text()))
rows = []
for name, edges, anchors in cases:
    relations = {p: set() for p in ('I', 'D', 'C')}
    domains = {'File': set(anchors), 'Symbol': set()}
    for relation, left, right in edges:
        p = {'imports': 'I', 'defines': 'D', 'calls': 'C'}.get(relation)
        if p is None:
            continue
        relations[p].add((left, right))
        domains['Symbol' if p == 'C' else 'File'].add(left)
        domains['File' if p == 'I' else 'Symbol'].add(right)
    expected = set()
    for p in patterns:
        variables = p['variables']
        types = {v: 'File' if v in ('a', 'b') or v.startswith('f') else 'Symbol' for v in variables}
        witness_order = ['a', 'b'] + [v for v in variables if v not in ('a', 'b')]
        matches = 0
        for values in itertools.product(*(sorted(domains[types[v]]) if v != 'a' else sorted(set(anchors)) for v in variables)):
            assignment = dict(zip(variables, values))
            if any(assignment[x] == assignment[y] for x, y in p['guards']):
                continue
            if not all((assignment[x], assignment[y]) in relations[relation] for relation, x, y in p['atoms']):
                continue
            expected.add((p['name'], assignment['a'], assignment['b'], tuple((types[v], assignment[v]) for v in witness_order)))
            matches += 1
        rows.append({'case': name, 'pattern': p['name'], 'reference_witnesses': matches})
    received = {(p, a, b, tuple(map(tuple, parts))) for p, a, b, parts in actual[name]}
    assert expected == received, (name, 'missing', list(expected-received)[:8], 'extra', list(received-expected)[:8])
    assert len(received) == len(actual[name]), ('duplicate native witnesses', name)
(ROOT / 'tables/finite-parity.json').write_text(json.dumps({'state': 'ParityPass', 'cases': len(cases), 'patterns': len(patterns), 'comparisons': rows}, indent=2) + '\n')
print(f'ParityPass: {len(cases)} finite worlds × {len(patterns)} patterns; exact typed witness sets')
