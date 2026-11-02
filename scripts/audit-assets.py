from pathlib import Path
import hashlib,json,gzip,fnmatch
root=Path(__file__).resolve().parent.parent
dist=root/'dist'
manifest=json.loads((root/'scripts/ocr-assets.json').read_text())
for f in manifest['files']:
 p=dist/f['path'];assert p.is_file(),p
 assert p.stat().st_size==f['bytes'],p
 assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'],p
 if p.suffix=='.gz':assert len(gzip.decompress(p.read_bytes()))>1000,p
assets=[p for p in dist.rglob('*') if p.is_file()]
assert len(assets)<20000
assert all(p.stat().st_size<25*1024*1024 for p in assets)
headers=(dist/'_headers').read_text();assert 'Content-Encoding:' not in headers
rules=[]
for line in headers.splitlines():
 if line and not line.startswith(' '):rules.append([line,{}])
 elif ':' in line:
  k,v=line.strip().split(':',1);rules[-1][1][k.lower()]=v.strip()
for route in ['/','/app.js','/vendor/pdf.mjs','/vendor/ocr/v1/worker.min.js','/vendor/ocr/v1/lang/urd.traineddata.gz']:
 vals=[h['cache-control'] for pattern,h in rules if fnmatch.fnmatch(route,pattern) and 'cache-control' in h]
 assert len(vals)<=1,(route,vals)
 if '/ocr/v1/' in route:assert vals==['public, max-age=31536000, immutable']
assert not (dist/'_worker.js').exists()
assert '/vendor/ocr/v1/' in (dist/'word-ocr.js').read_text()
print(f'Passed: {len(assets)} static files, all below 25 MiB; OCR hashes, language gzip files, and non-conflicting cache headers.')
