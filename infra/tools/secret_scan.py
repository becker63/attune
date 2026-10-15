"""Conservative source/staged audit; never prints suspected secret bytes."""
import argparse
import pathlib
import re
import subprocess
import sys

PATTERNS = [
    r'AGE-' + r'SECRET-KEY-1[0-9A-Z]+',
    r'-----BEGIN ' + r'(?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----',
    r'(?i)(?:api_token|api_key|secret_key|password)\s*[:=]\s*[\"\'][a-zA-Z0-9_+/=-]{24,}[\"\']',
]


def inspect(name, data):
    if len(data) > 1024 * 1024:
        return name + ': unexpectedly large artifact'
    if pathlib.Path(name).suffix in ('.iso', '.raw', '.qcow2'):
        return name + ': generated disk/image must not be committed'
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        return name + ': unexpected binary'
    if any(re.search(pattern, text) for pattern in PATTERNS):
        return name + ': suspected plaintext secret'
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument('source', nargs='?', default='infra')
    p.add_argument('--staged', action='store_true')
    args = p.parse_args()
    if args.staged:
        names = subprocess.check_output(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).decode().split('\0')
        unexpected = [n for n in names if n and not n.startswith('infra/')]
        if unexpected:
            raise SystemExit('Refusing delivery with staged files outside infra: ' + ', '.join(unexpected))
        files = ((n, subprocess.check_output(['git', 'show', ':' + n])) for n in names if n)
    else:
        files = ((str(p), p.read_bytes()) for p in pathlib.Path(args.source).rglob('*')
                 if p.is_file() and not any(x in p.parts for x in ('__pycache__', '.git', 'reports')))
    failures = [problem for name, data in files if (problem := inspect(name, data))]
    if failures:
        print('\n'.join(failures), file=sys.stderr)
        raise SystemExit(1)
    print('PASS: no recognizable private keys, plaintext credentials, disks or unexpected binaries')


if __name__ == '__main__':
    main()
