#!/usr/bin/env bash
# Secondary, exact-receipt replay. This command has no provider transport.
set -euo pipefail
if [[ "${1:-}" != "--enable-replay" ]]; then
  printf '%s\n' 'Disabled: no Jev calls. For matched saved receipts:' '  jev_matched_replay.sh --enable-replay TASK CONFIG PATTERN RECEIPTS_JSON'
  exit 0
fi
shift
[[ $# == 4 ]] || { printf '%s\n' 'Expected TASK CONFIG PATTERN RECEIPTS_JSON' >&2; exit 2; }
campaign_dir="${ATTUNE_EXPERIMENT:-/home/becker/experiments/attune-native-patterns-20261013}"
replay_task="$1"
overlay="$(mktemp -d "$campaign_dir/jev-replay-inputs.XXXXXX")"
python3 - "$campaign_dir/inputs" "$overlay" "$2" "$3" "$4" <<'PY'
from pathlib import Path
import json,sys
source,target=map(Path,sys.argv[1:3])
for p in source.iterdir():
    if p.is_file() and p.name not in ('jev-enabled.json','jev-selected.json','jev-receipts.json'):
        (target/p.name).symlink_to(p.resolve())
(target/'jev-enabled.json').write_text('true\n')
(target/'jev-selected.json').write_text(json.dumps([sys.argv[3],sys.argv[4]])+'\n')
receipts=json.loads(Path(sys.argv[5]).read_text())
assert isinstance(receipts,list)
(target/'jev-receipts.json').write_text(json.dumps(receipts)+'\n')
PY
ATTUNE_CAMPAIGN_INPUTS="$overlay" bash "$campaign_dir/run.sh" "jev-matched-$(basename "$overlay")" build "//experiments/native_patterns:jev_$replay_task"
