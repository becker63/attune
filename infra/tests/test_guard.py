import copy
import importlib.util
import unittest
import json
import tempfile
import subprocess
from pathlib import Path
spec = importlib.util.spec_from_file_location('guard', Path(__file__).parents[1] / 'installer/guard.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


class Guard(unittest.TestCase):
    def setUp(self):
        self.host = dict(name='attune-a', diskSerial=None, replaceSerial=None)
        self.disk = dict(name='nvme0n1', type='disk', size=256_000_000_000, tran='nvme', rm=False, ro=False, mountpoints=[None], serial='test', zeroed=True)

    def choose(self, disks=None, **kw):
        return g.select([self.disk] if disks is None else disks, self.host, kw.get('authorization', 'attune-a'), kw.get('environment', 'attune-a'))

    def test_blank(self):
        self.assertEqual(self.choose(), '/dev/nvme0n1')

    def test_negative_matrix(self):
        for field, value in [('zeroed', False), ('size', 20_000_000_000), ('tran', 'usb'), ('rm', True), ('ro', True), ('mountpoints', ['/iso']), ('fstype', 'ext4'), ('pttype', 'gpt'), ('label', 'attune-system'), ('signatures', ['gpt']), ('children', [dict(label='ATTUNE_EFI', mountpoints=[None])])]:
            with self.subTest(field=field):
                d = self.disk | {field: value}
                with self.assertRaises(g.Refusal):
                    self.choose([d])

    def test_missing_and_multiple(self):
        for ds in ([], [self.disk, self.disk | dict(name='nvme1n1')]):
            with self.assertRaises(g.Refusal):
                self.choose(ds)

    def test_authorization(self):
        for kwargs in (dict(authorization=''), dict(environment=''), dict(environment='attune-b')):
            with self.assertRaises(g.Refusal):
                self.choose(**kwargs)

    def test_pinned_identity(self):
        self.host['diskSerial'] = 'different'
        with self.assertRaises(g.Refusal):
            self.choose()

    def test_replacement_is_specific(self):
        self.disk['fstype'] = 'ext4'
        self.host.update(diskSerial='test', replaceSerial='test')
        self.assertEqual(self.choose(), '/dev/nvme0n1')
        self.disk['label'] = 'attune-system'
        with self.assertRaises(g.Refusal):
            self.choose()

    def test_serial_free_explicit_replacement(self):
        self.disk['fstype'] = 'ntfs'
        self.assertEqual(g.select([self.disk], self.host, 'attune-a', 'attune-a', replacement_verified=True), '/dev/nvme0n1')
        self.disk['label'] = 'attune-system'
        with self.assertRaises(g.Refusal):
            g.select([self.disk], self.host, 'attune-a', 'attune-a', replacement_verified=True)

    def test_full_zero_scan_finds_interior_raw_data(self):
        with tempfile.TemporaryDirectory() as t:
            path = Path(t)/'disposable-device'
            with path.open('wb') as f:
                f.truncate(20 * 1024 * 1024)
            self.assertTrue(g.zeroed(path, path.stat().st_size))
            with path.open('r+b') as f:
                f.seek(10 * 1024 * 1024)
                f.write(b'unknown raw evidence')
            self.assertFalse(g.zeroed(path, path.stat().st_size))

    def test_signed_one_boot_replacement_ticket(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            key = root/'key'
            subprocess.run(['ssh-keygen','-q','-t','ed25519','-N','','-f',str(key)], check=True, capture_output=True)
            signers = root/'signers'
            signers.write_text('attune-operator namespaces="attune-install" '+key.with_suffix('.pub').read_text())
            expected = dict(host='attune-a',boot_id='fixture-boot',installer_identity='fixture-public-identity',disk='/dev/nvme0n1',capacity=256_000_000_000,disk_fingerprint='fixture-disk',action='replace-non-attune-disk')
            ticket = root/'ticket.json'
            uptime = int(float(Path('/proc/uptime').read_text().split()[0]))
            ticket.write_text(json.dumps(expected | dict(expires_uptime=uptime+60)))
            subprocess.run(['ssh-keygen','-Y','sign','-f',str(key),'-n','attune-install',str(ticket)],check=True,capture_output=True)
            signature = str(ticket)+'.sig'
            self.assertTrue(g.verify_replacement(expected,str(ticket),signature,str(signers)))
            for field in ['host','boot_id','disk','disk_fingerprint','installer_identity','action']:
                with self.subTest(field=field):
                    self.assertFalse(g.verify_replacement(expected | {field:'changed'},str(ticket),signature,str(signers)))
            ticket.write_text(json.dumps(expected | dict(expires_uptime=uptime-1)))
            self.assertFalse(g.verify_replacement(expected,str(ticket),signature,str(signers)))

    def test_interrupted_and_repeated_install(self):
        for label in ['attune-system', 'ATTUNE_EFI']:
            self.disk['children'] = [dict(label=label)]
            with self.assertRaises(g.Refusal):
                self.choose()


if __name__ == '__main__':
    unittest.main()
