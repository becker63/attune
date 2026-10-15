"""Boot the common installer ISO against a new sparse file, never a block device."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--iso', required=True)
    p.add_argument('--firmware', required=True)
    p.add_argument('--firmware-vars', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    require(Path(args.iso).is_file(), 'installer ISO file does not exist: ' + args.iso)
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    disk = out/'nvme.raw'
    require(not disk.exists(), 'refusing to reuse a disk image; choose a new test directory')
    with disk.open('xb') as f:
        f.truncate(256_000_000_000)
    require(disk.is_file() and not disk.is_block_device(), 'only a newly created regular file is allowed')
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization
    # RFC 8032 test vector, public fixture, never an operational identity.
    key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'))
    private = out/'fixture-identity'
    private.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.OpenSSH, serialization.NoEncryption()))
    private.chmod(0o600)
    firmware_vars = out/'uefi-vars.fd'
    shutil.copyfile(args.firmware_vars, firmware_vars)
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    ssh = ['ssh','-i',str(private),'-p',str(port),'-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=accept-new','-o','UserKnownHostsFile='+str(out/'known_hosts'),'-o','BatchMode=yes','-o','ConnectTimeout=3','root@127.0.0.1']
    base = ['qemu-system-x86_64','-machine','q35','-accel','tcg','-cpu','max','-m','2048','-smp','2', '-display','none','-no-reboot',
            '-drive',f'if=pflash,format=raw,readonly=on,file={args.firmware}', '-drive',f'if=pflash,format=raw,file={firmware_vars}',
            '-drive',f'if=none,id=nvme,format=raw,file={disk}', '-device','nvme,drive=nvme,serial=ATTUNE_VM_ONLY,bootindex=2',
            '-netdev',f'user,id=n,hostfwd=tcp:127.0.0.1:{port}-:22','-device','e1000,netdev=n']
    usb = ['-device','qemu-xhci','-drive',f'if=none,id=usb,format=raw,readonly=on,file={args.iso}', '-device','usb-storage,drive=usb,bootindex=1']
    def start(name, installer):
        serial = out/(name+'.serial.log')
        log = (out/(name+'.qemu.log')).open('w')
        return subprocess.Popen(base+['-serial','file:'+str(serial)]+(usb if installer else []),stdout=log,stderr=subprocess.STDOUT)
    def remote(command, timeout=30):
        return subprocess.run(ssh+[command],capture_output=True,text=True,timeout=timeout)
    def wait_ssh(process):
        deadline = time.monotonic()+1800
        while time.monotonic()<deadline:
            require(process.poll() is None, 'QEMU exited before installed SSH was ready')
            r = remote('test -f /persist/attune/install-complete && test -s /persist/sops/recipient.txt && systemctl is-active --quiet comin')
            if r.returncode == 0:
                return
            time.sleep(5)
        raise RuntimeError('installed SSH timeout')
    print('Stage: boot ISO and install onto fresh virtual NVMe', flush=True)
    process = start('install', True)
    try:
        deadline = time.monotonic() + 7200
        offset = 0
        while process.poll() is None and time.monotonic() < deadline:
            serial = out/'install.serial.log'
            if serial.exists():
                with serial.open(errors='replace') as log:
                    log.seek(offset)
                    chunk = log.read()
                    offset = log.tell()
                    if chunk:
                        print(chunk, end='', flush=True)
                        require('Attune installation refused or failed.' not in chunk, 'installer service failed; see serial diagnostics above')
            time.sleep(3)
        require(process.poll() == 0, 'installer did not reboot successfully: ' + (out/'install.qemu.log').read_text()[-5000:])
    finally:
        if process.poll() is None:
            process.terminate(); process.wait()
    print('Stage: boot installed NVMe and check SSH, comin and identity', flush=True)
    process = start('installed', False)
    try:
        wait_ssh(process)
        def check(cmd):
            r = remote(cmd)
            require(r.returncode == 0, 'installed check failed: '+cmd+'\n'+r.stderr)
            return r.stdout
        identity = check('cat /etc/machine-id && cat /persist/ssh/ssh_host_ed25519_key.pub && cat /persist/sops/recipient.txt')
        check('systemctl is-active comin && sshd -T | grep "passwordauthentication no" && test -d /nix/var/nix/profiles && test -f /boot/EFI/BOOT/BOOTX64.EFI')
        check('touch /etc/undeclared && echo evidence > /data/retained && echo history > /var/lib/comin/acceptance-retained')
        remote('systemctl reboot')
        process.wait(timeout=180)
    finally:
        if process.poll() is None:
            process.terminate(); process.wait()
    print('Stage: reboot installed system and verify root reset/persistence', flush=True)
    process = start('rebooted', False)
    try:
        wait_ssh(process)
        require(remote('test ! -e /etc/undeclared && grep evidence /data/retained && grep history /var/lib/comin/acceptance-retained').returncode == 0, 'root reset or persistence failed')
        require(remote('cat /etc/machine-id && cat /persist/ssh/ssh_host_ed25519_key.pub && cat /persist/sops/recipient.txt').stdout == identity, 'identity changed after reboot')
        remote('systemctl poweroff')
        process.wait(timeout=180)
    finally:
        if process.poll() is None:
            process.terminate(); process.wait()
    print('Stage: repeat USB boot must refuse installation', flush=True)
    process = start('repeat-usb', True)
    try:
        deadline = time.monotonic()+1800
        while time.monotonic()<deadline:
            log = out/'repeat-usb.serial.log'
            if log.exists() and 'INSTALLATION REFUSED' in log.read_text(errors='replace'):
                break
            require(process.poll() is None, 'repeated installer boot unexpectedly exited')
            time.sleep(5)
        else:
            raise RuntimeError('reinstallation refusal not observed')
    finally:
        process.terminate(); process.wait()
    (out/'result.json').write_text(json.dumps(dict(status='PASS', iso_sha256=hashlib.file_digest(open(args.iso,'rb'),'sha256').hexdigest(), disk_bytes=disk.stat().st_size, architecture='x86_64-linux', accelerator='tcg'),indent=2))
    private.unlink()
    print(out/'result.json')


if __name__ == '__main__':
    main()
