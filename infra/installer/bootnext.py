"""Best-effort one-boot NVMe selection; never changes the firmware BootOrder."""
import re
import subprocess
import sys


def entries():
    p=subprocess.run(['efibootmgr'],capture_output=True,text=True,check=True)
    return set(re.findall(r'^Boot([0-9A-Fa-f]{4})[ *]',p.stdout,re.M))


try:
    before=entries()
    subprocess.run(['efibootmgr','--create-only','--disk',sys.argv[1],'--part','1','--label',sys.argv[2], '--loader',r'\EFI\BOOT\BOOTX64.EFI'],capture_output=True,check=True)
    added=entries()-before
    if len(added)!=1:
        raise ValueError('firmware did not expose exactly one new entry')
    subprocess.run(['efibootmgr','--bootnext',added.pop()],capture_output=True,check=True)
    print('Requested a one-time NVMe boot through UEFI BootNext; firmware support is required.')
except (subprocess.SubprocessError,ValueError):
    print('UEFI BootNext unavailable; remove USB during reboot or select NVMe in firmware.')
