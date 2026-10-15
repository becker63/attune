import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).parents[1] / 'ingest'))
import archive as a


def fixture(root):
    data = b'raw immutable Bazel evidence\n'
    (root/'raw.json').write_bytes(data)
    sha = a.digest(data)
    records = [dict(kind='evaluation', id='physical-1'), dict(kind='feedback', id='arm-1', evaluation_id='physical-1'), dict(kind='feedback', id='arm-2', evaluation_id='physical-1')]
    for status, val, num, den in [('defined', 0.5, 1, 2), ('undefined', None, 0, 0)]:
        records.append(dict(kind='measurement', id=status, metric='Recall@10', metric_version='1', population='tasks', aggregation='micro', value=val, numerator=num, denominator=den, status=status, population_count=2, covered_count=1 if val else 0, undefined_count=1, artifact_sha256=sha))
    records.append(dict(kind='measurement', id='unavailable', metric='MRR@10', metric_version='1', population='tasks', aggregation='micro', value=None, status='unavailable', population_count=2, covered_count=0, undefined_count=0, artifact_sha256=sha))
    protocol = a.canonical(dict(schema_version=1, name='synthetic'))
    (root/'protocol.json').write_bytes(protocol)
    e = dict(schema_version=1, study='synthetic', run='run-1', protocol_sha256=a.digest(protocol), source_revision='0'*40, records=records, artifacts=[dict(path='raw.json', sha256=sha, media_type='application/json'),dict(path='protocol.json',sha256=a.digest(protocol),media_type='application/json')])
    path = root/'evidence.json'
    path.write_text(json.dumps(e))
    return path, e


class Science(unittest.TestCase):
    def test_archive_recovery_backup(self):
        import pyarrow.parquet as pq
        import pyarrow as pa
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            source, evidence = fixture(root)
            store = a.LocalStore(root/'store')
            state = root/'state.sqlite'
            m = a.import_evidence(source, store, state)
            self.assertEqual(m, a.import_evidence(source, store, state))
            key = 'studies/synthetic/runs/run-1/manifest.json'
            a.verify_manifest(store, key)
            obj = next(o for o in m['objects'] if o['media_type'].endswith('parquet'))
            rows = pq.read_table(pa.BufferReader(store.get(obj['key']))).to_pylist()
            self.assertEqual(len([r for r in rows if r['kind']=='evaluation']), 1)
            self.assertEqual(len([r for r in rows if r['kind']=='feedback']), 2)
            undefined = next(r for r in rows if r['id']=='undefined')
            self.assertIsNone(undefined['value'])
            self.assertEqual(undefined['denominator'], 0)
            defined = next(r for r in rows if r['id']=='defined')
            self.assertEqual((defined['numerator'], defined['denominator']), (1, 2))
            dest = a.LocalStore(root/'backup')
            a.backup(store, dest, key)
            restored = a.LocalStore(root/'restored')
            a.backup(dest, restored, key)
            self.assertEqual(a.verify_manifest(restored, key), m)
            # A new run interrupted before all bytes exist cannot publish a seal.
            evidence['run'] = 'interrupted'
            source.write_text(json.dumps(evidence))
            (root/'raw.json').unlink()
            with self.assertRaises(FileNotFoundError):
                a.import_evidence(source, store, state)
            self.assertFalse((root/'store/studies/synthetic/runs/interrupted/manifest.json').exists())
            (root/'raw.json').write_bytes(b'raw immutable Bazel evidence\n')
            a.import_evidence(source, store, state)
            a.verify_manifest(store, 'studies/synthetic/runs/interrupted/manifest.json')
            with self.assertRaises(ValueError):
                store.put(key, b'changed')

    def test_moving_source_revision_cannot_seal(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            source, evidence = fixture(root)
            evidence['source_revision'] = 'HEAD'
            source.write_text(json.dumps(evidence))
            with self.assertRaises(ValueError):
                a.import_evidence(source, a.LocalStore(root/'archive'), root/'state.sqlite')
            self.assertFalse((root/'archive/studies/synthetic/runs/run-1/manifest.json').exists())

    def test_backup_rejects_same_physical_disk(self):
        from unittest.mock import Mock, patch
        from backup import require_independent
        destination = Mock()
        destination.is_mount.return_value = True
        with patch('backup.physical_disks', side_effect=[{'259:0'}, {'259:0'}]):
            with self.assertRaises(ValueError):
                require_independent(destination)
        with patch('backup.physical_disks', side_effect=[{'8:0'}, {'259:0'}]):
            require_independent(destination)

    def test_missing_values_and_physical_reuse(self):
        with self.assertRaises(ValueError):
            a.validate_records([dict(kind='feedback', id='bad', evaluation_id='missing')])
        with self.assertRaises(ValueError):
            a.validate_records([dict(kind='evaluation', id='same')]*2)


if __name__ == '__main__':
    unittest.main()
