"""Fail-closed selection. Inspection never writes to block devices."""
import json
import hashlib
from pathlib import Path
import os
import re
import subprocess
import sys


class Refusal(Exception):
    pass


def select(disks, host, authorized, environment, replacement_verified=False):
    if environment != host['name'] or authorized != host['name']:
        raise Refusal('missing or mismatched installer authorization/environment')
    candidates = [d for d in disks if re.fullmatch(r'nvme\d+n\d+', d['name']) and d['type'] == 'disk']
    if len(candidates) != 1:
        raise Refusal('expected exactly one NVMe namespace')
    d = candidates[0]
    if not 240_000_000_000 <= int(d['size']) <= 270_000_000_000:
        raise Refusal('capacity outside 256 GB tolerance')
    if d.get('tran') not in ('nvme', None) or d.get('rm') or d.get('ro'):
        raise Refusal('removable, read-only, or non-NVMe target')
    nodes = [d]
    for n in nodes:
        nodes.extend(n.get('children', []))
    if any(any(n.get('mountpoints') or []) for n in nodes):
        raise Refusal('target contains mounted filesystems (including installer media)')
    if host.get('diskSerial') and d.get('serial', '').strip() != host['diskSerial']:
        raise Refusal('disk serial mismatch')
    # Existing layouts, including interrupted installs, are never auto-replaced.
    protected = any(n.get('label') in ('attune-system', 'ATTUNE_EFI') for n in nodes)
    if protected:
        raise Refusal('Attune installation or interrupted installation already present')
    nonempty = len(nodes) != 1 or any(n.get('fstype') or n.get('pttype') or n.get('signatures') for n in nodes) or not d.get('zeroed', False)
    replacement = host.get('replaceSerial')
    if nonempty and not (replacement_verified or (replacement and replacement == host.get('diskSerial') == d.get('serial', '').strip())):
        raise Refusal('nonempty disk requires a pinned replacement identity or a signed one-boot disk claim')
    return '/dev/' + d['name']


def inspect():
    result = subprocess.run(['lsblk', '--json', '--bytes', '--output', 'NAME,TYPE,SIZE,TRAN,RM,RO,SERIAL,FSTYPE,PTTYPE,LABEL,MOUNTPOINTS'], check=True, capture_output=True, text=True)
    disks = json.loads(result.stdout)['blockdevices']
    for d in disks:
        if d['type'] == 'disk' and re.fullmatch(r'nvme\d+n\d+', d['name']):
            p = subprocess.run(['wipefs', '--no-act', '--json', '/dev/' + d['name']], check=True, capture_output=True, text=True)
            d['signatures'] = json.loads(p.stdout).get('signatures', [])
    return disks


def zeroed(path, size):
    # Absence of filesystem signatures is not proof of an empty disk.
    # Read the entire namespace; no sampling can safely authorize raw data loss.
    chunk_size = 8 * 1024 * 1024
    zeros = bytes(chunk_size)
    with open(path, 'rb', buffering=0) as device:
        remaining = size
        while remaining:
            count = min(chunk_size, remaining)
            data = device.read(count)
            if len(data) != count or data != zeros[:count]:
                return False
            remaining -= count
    return True


def claim(disks, host, authorized, environment):
    # Validate every eligibility guard while deferring only the nonempty check.
    target = select(disks, host, authorized, environment, replacement_verified=True)
    d = next(d for d in disks if '/dev/' + d['name'] == target)
    with open(target, 'rb', buffering=0) as f:
        first = f.read(1024 * 1024)
        f.seek(int(d['size']) - 1024 * 1024)
        last = f.read(1024 * 1024)
    ssh_public = Path('/etc/ssh/ssh_host_ed25519_key.pub').read_bytes()
    return dict(host=host['name'], boot_id=Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
                installer_identity=hashlib.sha256(ssh_public).hexdigest(),
                disk=target, capacity=int(d['size']), disk_fingerprint=hashlib.sha256(first + last).hexdigest(),
                action='replace-non-attune-disk')


def verify_replacement(expected, ticket, signature, signers):
    try:
        raw = Path(ticket).read_bytes()
        authorization = json.loads(raw)
        expires = authorization.pop('expires_uptime')
        now = float(Path('/proc/uptime').read_text().split()[0])
        if authorization != expected or not now < expires <= now + 1800:
            return False
        p = subprocess.run(['ssh-keygen', '-Y', 'verify', '-f', signers, '-I', 'attune-operator',
                            '-n', 'attune-install', '-s', signature], input=raw, capture_output=True)
        return p.returncode == 0
    except (FileNotFoundError, ValueError, KeyError, TypeError):
        return False


def main():
    host = json.load(open(sys.argv[1]))
    def marker(p):
        try:
            return open(p).read().strip()
        except FileNotFoundError:
            return ''
    try:
        disks = inspect()
        authorized, environment = marker('/etc/attune-install-authorized'), marker('/etc/attune-installer')
        approved = False
        if '--claim' in sys.argv or Path('/run/attune-replacement.json').exists():
            expected = claim(disks, host, authorized, environment)
            if '--claim' in sys.argv:
                expected['expires_uptime'] = int(float(Path('/proc/uptime').read_text().split()[0])) + 1800
                print(json.dumps(expected, sort_keys=True))
                return
            approved = verify_replacement(expected, '/run/attune-replacement.json', '/run/attune-replacement.json.sig', '/etc/attune-install-signers')
        target = select(disks, host, authorized, environment, replacement_verified=True)
        disk = next(d for d in disks if '/dev/' + d['name'] == target)
        if not approved and not host.get('replaceSerial') and not (disk.get('children') or disk.get('fstype') or disk.get('pttype') or disk.get('signatures')):
            print('Verifying that the entire NVMe namespace is zero-filled before automatic installation...', file=sys.stderr)
            disk['zeroed'] = zeroed(target, int(disk['size']))
        print(select(disks, host, authorized, environment, replacement_verified=approved))
    except (Refusal, subprocess.CalledProcessError, ValueError, KeyError, OSError) as e:
        print('INSTALLATION REFUSED: ' + str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
