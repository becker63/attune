"""Bounded spool ingestion; failed imports stay visible and retry next timer tick."""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import shutil
import time
from archive import S3Store, import_evidence, digest, verify_manifest
from index import project


def tick(inbox, store, state, metrics, clickhouse, clickhouse_credentials, retain_completed_days=7):
    if retain_completed_days < 0:
        raise ValueError('cache retention days must be nonnegative')
    failed = 0
    processed = 0
    db = sqlite3.connect(state)
    db.execute('CREATE TABLE IF NOT EXISTS worker_imports (source TEXT PRIMARY KEY, digest TEXT, completed_at INTEGER)')
    if 'completed_at' not in {row[1] for row in db.execute('PRAGMA table_info(worker_imports)')}:
        db.execute('ALTER TABLE worker_imports ADD COLUMN completed_at INTEGER')
        db.execute('UPDATE worker_imports SET completed_at=?', (int(time.time()),))
    db.execute('CREATE TABLE IF NOT EXISTS worker_stats (id INTEGER PRIMARY KEY, verified_bytes INTEGER NOT NULL)')
    db.execute('INSERT OR IGNORE INTO worker_stats VALUES (1,0)')
    db.commit()
    completed = dict(db.execute('SELECT source,digest FROM worker_imports'))
    pending = []
    for source in sorted(Path(inbox).glob('*/evidence.json')):
        if source.stat().st_size > 32 * 1024 * 1024:
            failed += 1
            continue
        fingerprint = digest(source.read_bytes())
        if completed.get(str(source)) != fingerprint:
            pending.append((source, fingerprint))
    for source, fingerprint in pending[:100]:
        try:
            manifest = import_evidence(source, store, state)
            if clickhouse:
                key = f"studies/{manifest['study']}/runs/{manifest['run']}/manifest.json"
                project(store, key, clickhouse, clickhouse_credentials)
            db.execute('INSERT OR REPLACE INTO worker_imports VALUES (?,?,?)', (str(source),fingerprint,int(time.time())))
            db.execute('UPDATE worker_stats SET verified_bytes=verified_bytes+? WHERE id=1', (sum(o['size'] for o in manifest['objects']),))
            db.commit()
            processed += 1
        except Exception as e:
            print(json.dumps(dict(source=source.parent.name, status='failed', error=type(e).__name__)), flush=True)
            failed += 1
    # Local inbox bytes are a cache only after archive AND projection succeeded.
    # Re-verify sealed objects before deleting at most ten old completed bundles.
    purged = 0
    if retain_completed_days > 0:
        threshold = int(time.time()) - retain_completed_days * 86400
        old = list(db.execute('SELECT source,digest FROM worker_imports WHERE completed_at < ? ORDER BY completed_at LIMIT 10', (threshold,)))
        for path, fingerprint in old:
            source = Path(path)
            if not source.exists():
                db.execute('UPDATE worker_imports SET completed_at=NULL WHERE source=?', (path,))
                continue
            try:
                if source.parent.is_symlink() or source.parent.resolve().parent != Path(inbox).resolve():
                    raise ValueError('cache path outside declared inbox')
                if digest(source.read_bytes()) != fingerprint:
                    continue
                evidence = json.loads(source.read_text())
                expected_files = {'evidence.json'}
                for artifact in evidence['artifacts']:
                    local = source.parent / artifact['path']
                    expected_files.add(str(local.resolve().relative_to(source.parent.resolve())))
                    with local.open('rb') as stream:
                        if hashlib.file_digest(stream, 'sha256').hexdigest() != artifact['sha256']:
                            raise ValueError('local cached artifact changed after indexing')
                entries = list(source.parent.rglob('*'))
                if any(p.is_symlink() for p in entries) or {str(p.relative_to(source.parent)) for p in entries if p.is_file()} != expected_files:
                    raise ValueError('unarchived files in completed cache bundle')
                key = f"studies/{evidence['study']}/runs/{evidence['run']}/manifest.json"
                verify_manifest(store, key)
                shutil.rmtree(source.parent)
                purged += 1
                db.execute('UPDATE worker_imports SET completed_at=NULL WHERE source=?', (path,))
            except Exception as e:
                print(json.dumps(dict(source=source.parent.name, status='cache-retained', error=type(e).__name__)), flush=True)
                failed += 1
    verified_bytes = db.execute('SELECT verified_bytes FROM worker_stats WHERE id=1').fetchone()[0]
    db.commit()
    db.close()
    metric = Path(metrics)
    metric.parent.mkdir(parents=True, exist_ok=True)
    tmp = metric.with_suffix('.tmp')
    tmp.write_text(f'attune_archive_verified_bytes_total {verified_bytes}\nattune_ingest_backlog {len(pending)-processed}\nattune_ingest_failures {failed}\nattune_ingest_cache_bundles_purged {purged}\nattune_ingest_last_poll_seconds {int(time.time())}\n')
    tmp.replace(metric)
    return failed


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--inbox', required=True)
    p.add_argument('--state', required=True)
    p.add_argument('--metrics', required=True)
    p.add_argument('--endpoint', required=True)
    p.add_argument('--bucket', default='attune-science')
    p.add_argument('--credentials', required=True)
    p.add_argument('--clickhouse')
    p.add_argument('--clickhouse-credentials')
    p.add_argument('--retain-completed-days', type=int, default=7)
    a = p.parse_args()
    store = S3Store(a.endpoint, a.bucket, a.credentials)
    raise SystemExit(bool(tick(a.inbox, store, a.state, a.metrics, a.clickhouse, a.clickhouse_credentials, a.retain_completed_days)))
