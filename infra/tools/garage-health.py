"""Local Garage health to bounded operational metrics, without per-object labels."""
import json
from pathlib import Path
import subprocess

out=Path('/data/metrics/garage.prom')
try:
    result=subprocess.run(['garage','json-api','GetClusterHealth'],capture_output=True,text=True,timeout=10,check=True)
    health=json.loads(result.stdout)
    status=health['status']
    text='attune_garage_health_probe_up 1\n'
    text+=f'attune_garage_healthy {int(status=="healthy")}\n'
    text+=f'attune_garage_available {int(status in ("healthy","degraded"))}\n'
    for key in ('storageNodes','storageNodesUp','connectedNodes','partitions','partitionsQuorum','partitionsAllOk'):
        if key in health:
            text+=f'attune_garage_{key} {int(health[key])}\n'
except (subprocess.SubprocessError,ValueError,KeyError):
    text='attune_garage_health_probe_up 0\n'
tmp=out.with_suffix('.tmp')
tmp.write_text(text)
tmp.replace(out)
