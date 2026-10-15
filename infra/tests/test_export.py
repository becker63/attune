import gzip
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).parents[1]/'ingest'))
import archive
spec = importlib.util.spec_from_file_location('native_export', Path(__file__).parents[1]/'ingest/export.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class Export(unittest.TestCase):
    def test_native_report_exactness_and_no_invented_computation(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            row = dict(query='0;1;2', task='task', repository='repo', state='Completed',
                canonical_metrics=[['Recall@10', ['1','2']], ['FileAcc@10', ['0','0']]],
                ranking_identity_qwen=True, delta_studio=['-1','10'])
            source = root/'quality-task-responses.json.gz'
            source.write_bytes(gzip.compress(json.dumps([row]).encode(), mtime=0))
            protocol = root/'protocol.json'
            protocol.write_bytes(b'{"schema_version":1,"synthetic":true}')
            args = (source, archive.digest(source.read_bytes()), protocol, archive.digest(protocol.read_bytes()))
            output = exporter.export(*args, root/'bundle', study='synthetic', run='part-0', revision='0'*40, population='fixture-tasks')
            evidence = json.loads(output.read_text())
            self.assertFalse(any(r['kind'] in ('evaluation','feedback') for r in evidence['records']))
            by_metric = {r['metric']:r for r in evidence['records'] if r['kind']=='measurement'}
            self.assertEqual((by_metric['Recall@10']['numerator'],by_metric['Recall@10']['denominator']),(1,2))
            self.assertEqual(by_metric['FileAcc@10']['status'],'undefined')
            self.assertEqual(by_metric['Hit@1']['status'],'unavailable')
            self.assertEqual(by_metric['utility_delta_studio']['numerator'],-1)
            self.assertEqual(by_metric['utility_delta_studio']['denominator'],10)
            self.assertEqual(evidence['records'][-1]['selected_count'],1)
            store = archive.LocalStore(root/'archive')
            archive.import_evidence(output,store,root/'state.sqlite')
            with self.assertRaises(ValueError):
                exporter.export(source,'f'*64,protocol,args[3],root/'bad',study='synthetic',run='bad',revision='0'*40,population='fixture')
            self.assertFalse((root/'bad').exists())


if __name__ == '__main__':
    unittest.main()
