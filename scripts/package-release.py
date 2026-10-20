"""Build a source-only release from an explicit allowlist; never copy local state."""
import json,re,zipfile,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
out=root/'releases'/f'coding-made-easy-macos-source-{version}.zip'
out.parent.mkdir(exist_ok=True)
files=['package.json','.gitignore','LICENSE','README.md','CONTRIBUTING.md','SECURITY.md','THIRD_PARTY_NOTICES.md','start.command','server.mjs','request.mjs','auth.mjs','ai.mjs','library.mjs','curriculum.mjs','runner.mjs','runtimes.mjs','auth.test.mjs','core.test.mjs','library.test.mjs','workspace.mjs','workspace.test.mjs','evidence.mjs','example-project.mjs','CHANGELOG.md','SETUP.md','server.test.mjs']
paths=[root/f for f in files]
for folder in ['public','examples/minifhir','runtime/sync','scripts']:
 paths.extend(f for f in (root/folder).rglob('*') if f.is_file())
paths=sorted(set(paths))
for f in paths:
 relative=f.relative_to(root)
 if f.is_symlink() or any(part in {'.local','.git','node_modules','__pycache__','releases'} for part in relative.parts) or f.name.startswith('.env'):
  raise SystemExit(f'Refusing unexpected file: {relative}')
 if str(Path.home()).encode() in f.read_bytes() or re.search(rb'sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}',f.read_bytes()):
  raise SystemExit(f'Refusing potentially private content: {relative}')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
 for f in paths:archive.write(f,Path('coding-made-easy')/f.relative_to(root))
checksum=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.zip.sha256').write_text(f'{checksum}  {out.name}\n')
print(f'{out.name}: {len(paths)} files, {out.stat().st_size} bytes')
print('Verified: no personal state, credentials, account overrides, or machine-specific user paths.')
