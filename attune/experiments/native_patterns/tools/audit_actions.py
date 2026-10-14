"""Reduce Bazel observations. Never computes predictions or pattern answers."""
from pathlib import Path
import collections
import datetime
import hashlib
import json
import re
import sys

ROOT = Path(__import__('os').environ.get('ATTUNE_EXPERIMENT', '/home/becker/experiments/attune-native-patterns-20261013'))

def objects(path):
    decoder = json.JSONDecoder()
    text = path.read_text()
    index = 0
    while index < len(text):
        while index < len(text) and text[index].isspace():
            index += 1
        if index == len(text):
            return
        value, index = decoder.raw_decode(text, index)
        yield value

def seconds(value):
    return float(value[:-1]) if isinstance(value, str) and value.endswith('s') else None

def stage(label):
    name = label.split(':')[-1]
    return name.split('_', 1)[0]

def audit(tag):
    log = ROOT / 'logs' / (tag + '.actions.json')
    if not log.exists():
        return {'tag': tag, 'state': 'ReferenceUnavailable', 'reason': 'No finalized execution log'}
    rows = []
    for action in objects(log):
        if action.get('mnemonic') != 'FlixArtifact':
            continue
        label = action['targetLabel']
        metrics = action.get('metrics', {})
        inputs = action.get('inputs', [])
        forbidden = [p['path'] for p in inputs if re.search(r'/(labels[.]json|[^/]*-labels[.]json|label_[^/]*[.]tsv|tasks[.]json|worlds[.]json)$', p['path'])]
        prediction = stage(label) in {'extract', 'admit', 'q', 'qlegacy', 'match', 'predict', 'jev', 'unavailable', 'rextract', 'radmit', 'rq', 'rmatch', 'rpredict', 'probe'}
        assert not (prediction and forbidden), (tag, label, forbidden)
        code = action.get('exitCode')
        state = 'Completed' if code == 0 else 'ResourceLimited' if code == 124 else 'ExecutionFailed'
        row = {'tag': tag, 'target': label, 'stage': stage(label), 'action_sha256': action.get('digest', {}).get('hash'),
               'runner': action.get('runner'), 'cache_hit': action.get('cacheHit', False), 'exit_code': code, 'state': state,
               'outputs': action.get('actualOutputs', []), 'input_count': len(inputs), 'gold_inputs': forbidden,
               'timings_s': {k: seconds(v) for k, v in metrics.items() if k.endswith('Time') and k != 'startTime'},
               'start_time': metrics.get('startTime'), 'input_bytes': int(metrics.get('inputBytes', 0))}
        rows.append(row)
    bep = ROOT / 'logs' / (tag + '.bep.json')
    invocation = None
    wall = None
    if bep.exists():
        for line in bep.read_text().splitlines():
            value = json.loads(line)
            if 'started' in value:
                invocation = value['started'].get('uuid')
            if 'buildMetrics' in value:
                wall = value['buildMetrics'].get('timingMetrics', {}).get('wallTimeInMs')
    result = {'tag': tag, 'invocation': invocation, 'build_wall_ms': wall, 'scientific_actions': len(rows),
              'counts': dict(collections.Counter((r['stage'] + ':' + ('cache-hit' if r['cache_hit'] else r['state'])) for r in rows)),
              'prediction_gold_boundary': 'ParityPass', 'rows': rows}
    (ROOT / 'tables' / ('actions-' + tag + '.json')).write_text(json.dumps(result, indent=2) + '\n')
    return {k: v for k, v in result.items() if k != 'rows'}

if __name__ == '__main__':
    for tag in sys.argv[1:]:
        print(json.dumps(audit(tag)))
