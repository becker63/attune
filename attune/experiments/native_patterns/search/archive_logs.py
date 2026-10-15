"""Lossless experiment-owned log compaction; active invocation files are untouched."""
import gzip,hashlib,lzma
import scale

def main():
    active=scale.read(scale.O/'active-build-receipt.json')['tag']
    saved=0;count=0
    for source in sorted((scale.O/'logs').glob('*.actions.json.gz')):
        tag=source.name.removesuffix('.actions.json.gz')
        if tag==active or not (scale.O/'logs'/(tag+'.ended')).exists():continue
        raw=gzip.decompress(source.read_bytes());target=source.with_name(tag+'.actions.json.xz')
        if target.exists():assert lzma.decompress(target.read_bytes())==raw
        else:
            temporary=target.with_name(target.name+'.writing');temporary.write_bytes(lzma.compress(raw,preset=3));temporary.replace(target)
            assert lzma.decompress(target.read_bytes())==raw
        scale.append('audit/lossless-log-compaction.jsonl',{'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'payload_sha256':hashlib.sha256(raw).hexdigest(),'archive':str(target),'archive_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'source_bytes':source.stat().st_size,'archive_bytes':target.stat().st_size})
        saved+=source.stat().st_size-target.stat().st_size;count+=1;source.unlink()
    print('Losslessly compacted',count,'completed logs; saved MiB',saved/1048576)
if __name__=='__main__':main()
