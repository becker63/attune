from pathlib import Path
import sys
import tempfile
import unittest
import sqlite3
sys.path.insert(0,str(Path(__file__).parents[1]/'ingest'))
from archive import LocalStore
from worker import tick
from test_science import fixture


class Worker(unittest.TestCase):
    def test_only_verified_completed_cache_is_purged(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            inbox = root/'inbox'
            source = inbox/'run'
            source.mkdir(parents=True)
            fixture(source)
            store = LocalStore(root/'archive')
            args = (inbox,store,root/'state.sqlite',root/'metrics.prom',None,None)
            self.assertEqual(tick(*args),0)
            with sqlite3.connect(root/'state.sqlite') as db:
                db.execute('UPDATE worker_imports SET completed_at=0')
            # Unarchived additions must never be silently treated as cache.
            extra = source/'unarchived.txt'
            extra.write_text('not yet evidence')
            self.assertEqual(tick(*args),1)
            self.assertTrue(source.exists())
            extra.unlink()
            # An unavailable/corrupt archive cannot authorize local cache deletion.
            manifest = root/'archive/studies/synthetic/runs/run-1/manifest.json'
            body = manifest.read_bytes()
            manifest.unlink()
            self.assertEqual(tick(*args),1)
            self.assertTrue(source.exists())
            manifest.write_bytes(body)
            self.assertEqual(tick(*args),0)
            self.assertFalse(source.exists())
            self.assertTrue(manifest.exists())

    def test_completed_sources_are_not_reindexed(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t)
            inbox=root/'inbox'
            source=inbox/'run-1'
            source.mkdir(parents=True)
            fixture(source)
            store=LocalStore(root/'archive')
            args=(inbox,store,root/'state.sqlite',root/'metrics.prom',None,None)
            self.assertEqual(tick(*args),0)
            before=(root/'archive/studies/synthetic/runs/run-1/manifest.json').stat().st_mtime_ns
            self.assertEqual(tick(*args),0)
            self.assertEqual((root/'archive/studies/synthetic/runs/run-1/manifest.json').stat().st_mtime_ns,before)
            self.assertIn('attune_ingest_backlog 0',(root/'metrics.prom').read_text())


if __name__=='__main__':
    unittest.main()
