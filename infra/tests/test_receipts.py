from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).parents[1]/'ingest'))
from receipts import collect
from archive import import_evidence, LocalStore


class Provider:
    def rpc(self, method, payload):
        if method=='SearchInvocation':
            return dict(invocation=[dict(invocationId='00000000-0000-0000-0000-000000000001',invocationStatus='COMPLETE_INVOCATION_STATUS',repoUrl='https://github.com/becker63/attune',commitSha='synthetic-fixture',cacheStats=[]),dict(invocationId='partial',invocationStatus='PARTIAL_INVOCATION_STATUS')])
        return dict(execution=[dict(executionId='physical-1',cachedResult=True,queuedTimestamp='2026-01-01T00:00:00Z')])


class Receipts(unittest.TestCase):
    def test_receipts_never_claim_scientific_completion(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t)
            self.assertEqual(collect(Provider(),root/'inbox',root/'bb.prom'),1)
            self.assertEqual(collect(Provider(),root/'inbox',root/'bb.prom'),1)
            sources=list((root/'inbox').glob('*/evidence.json'))
            self.assertEqual(len(sources),1)
            result=import_evidence(sources[0],LocalStore(root/'archive'),root/'state.sqlite')
            self.assertEqual(result['evidence_class'],'execution_receipt')


if __name__=='__main__':
    unittest.main()
