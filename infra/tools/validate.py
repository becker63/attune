"""Run reproducible checks and retain evidence without treating unrun tests as passed."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import time

CHECKS = ['evaluation', 'installer-guard', 'science', 'worker', 'receipts', 'export', 'dashboards', 'queries', 'secrets', 'git-signatures', 'emulation', 'services', 'garage', 'persistence', 'science-integration', 'gitops', 'installer']
RUNTIME = {'services', 'garage', 'persistence', 'science-integration', 'gitops'}


def capture(command):
    result = subprocess.run(command, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--flake', default='path:./infra')
    p.add_argument('--output', default='infra/reports')
    p.add_argument('--runtime', action='store_true')
    p.add_argument('--iso', action='store_true')
    p.add_argument('--installer', action='store_true')
    args = p.parse_args()
    out = Path(args.output)
    logs = out / 'logs'
    logs.mkdir(parents=True, exist_ok=True)
    system = platform.machine().replace('arm64', 'aarch64') + '-linux'
    # Resolve once: concurrent working-tree edits cannot mix test revisions.
    requested_flake = args.flake
    metadata_raw = capture(['nix', 'flake', 'metadata', args.flake, '--json'])
    if metadata_raw is None:
        raise SystemExit('Cannot resolve the infrastructure flake')
    snapshot = Path(json.loads(metadata_raw)['path'])
    args.flake = 'path:' + str(snapshot)
    results = []
    jobs = [(name, f'{args.flake}#checks.{system}.{name}',
             args.installer if name == 'installer' else args.runtime or name not in RUNTIME)
            for name in CHECKS]
    jobs += [(f'installer-attune-{h}', f'{args.flake}#packages.{system}.installer-attune-{h}', args.iso)
             for h in 'abc']
    for name, attr, enabled in jobs:
        result = dict(name=name, output=attr, status='NOT RUN',
                      reason='enable --installer' if name == 'installer' else
                      'enable --iso' if name.startswith('installer-attune-') else 'enable --runtime')
        if enabled:
            print('Checking ' + name, flush=True)
            started = time.monotonic()
            log = logs / (name + '.log')
            result['log'] = str(log)
            with log.open('w') as stream:
                build = subprocess.run(['nix', 'build', attr, '--no-link', '--json', '--max-jobs', '1', '--cores', '2', '--builders', ''],
                                       stdout=subprocess.PIPE, stderr=stream, text=True)
                stream.write(build.stdout)
                code = build.returncode
            result.update(status='PASS' if code == 0 else 'FAIL', seconds=round(time.monotonic() - started, 2),
                          reason='' if code == 0 else 'Nix evaluation/build/test failed; see log')
            if code == 0:
                built = json.loads(build.stdout)[0]
                result['derivation'] = built['drvPath']
                output = built['outputs']['out']
                result['store_path'] = output
                if name == 'installer':
                    result['acceptance'] = json.loads((Path(output) / 'result.json').read_text())
                if name.startswith('installer-attune-'):
                    iso = Path(output) / 'iso' / (name.removeprefix('installer-') + '-installer.iso')
                    result.update(iso=str(iso), iso_sha256=digest(iso))
        results.append(result)
        print(name + ': ' + result['status'], flush=True)
    source = snapshot
    source_hash = hashlib.sha256()
    for path in sorted(source.rglob('*')):
        if not path.is_file() or any(x in path.parts for x in ('reports', '__pycache__')) or path.is_symlink():
            continue
        if path.suffix in ('.iso', '.raw', '.qcow2', '.pyc'):
            continue
        source_hash.update(str(path.relative_to(source)).encode() + b'\0' + path.read_bytes())
    versions_expression = 'let f = builtins.getFlake ' + json.dumps(str(snapshot)) + '; p = f.inputs.nixpkgs.legacyPackages.' + system + '; in {' + ' '.join(
        name + ' = p.' + attr + '.version;' for name, attr in {
            'qemu': 'qemu', 'nix': 'nix', 'python': 'python3', 'garage': 'garage_2',
            'clickhouse': 'clickhouse', 'grafana': 'grafana', 'victoriametrics': 'victoriametrics',
            'clickhouse_plugin': 'grafanaPlugins.grafana-clickhouse-datasource'}.items()) + '}'
    pinned_versions = capture(['nix', 'eval', '--impure', '--json', '--expr', versions_expression])
    report = dict(timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  git_revision=capture(['git', 'rev-parse', 'HEAD']),
                  git_branch=capture(['git', 'branch', '--show-current']), requested_flake=requested_flake, source_snapshot=str(snapshot),
                  working_tree='Source hash records infrastructure under test; report may precede delivery commit.',
                  source_sha256=source_hash.hexdigest(), lock_sha256=digest(source / 'flake.lock'), architecture=system,
                  pinned_tool_versions=json.loads(pinned_versions) if pinned_versions else None,
                  tools={name: capture(command) for name, command in {
                      'nix': ['nix', '--version'], 'kernel': ['uname', '-sr'], 'python': ['python3', '--version'],
                      'git': ['git', '--version']}.items()},
                  results=results,
                  external_requirements=[
                      dict(name='Physical ThinkCentre installation', status='NOT RUN', reason='No physical disk operations authorized during development'),
                      dict(name='Host enrollment and live Garage membership', status='BLOCKED', reason='Requires verified physical machine identities and measured storage capacity'),
                      dict(name='Operational off-cluster backup', status='BLOCKED', reason='Requires independent destination; disposable restore fixture is tested separately'),
                      dict(name='BuildBuddy CAS artifact download', status='NOT RUN', reason='Receipt API access does not establish CAS byte retrieval; local evidence ingestion is supported'),
                  ])
    (out / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')
    rows = '\n'.join(f"| {r['name']} | {r['status']} | {r['reason']} |" for r in results + report['external_requirements'])
    (out / 'validation.md').write_text('# Validation results\n\n' +
        f"Source revision: `{report['git_revision']}`; infrastructure SHA-256: `{report['source_sha256']}`; host: `{system}`.\n\n" +
        '| Check | Status | Reason |\n|---|---|---|\n' + rows + '\n\nSee validation.json for derivations, store paths, tool versions, image hashes and logs.\n')
    print(out / 'validation.md')
    raise SystemExit(any(r['status'] == 'FAIL' for r in results))


if __name__ == '__main__':
    main()
