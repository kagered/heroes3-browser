#!/usr/bin/env python3
"""Check source files, vendored hashes and packaging ignore rules."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def check():
 output=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT)
 names=sorted(set(x.decode() for x in output.split(b'\0') if x));failures=[]
 forbidden={'.lod','.snd','.h3m','.h3c','.tut','.mp3','.vsgm1','.vcgm1','.wasm','.zip','.data','.pyc','.log'}
 engine={'src/vendor/vcmiclient.js','src/vendor/vcmiclient.wasm','src/vendor/vcmi.data','src/vendor/vcmi.data.js','src/vendor/LICENSE-VCMI.txt'}
 for name in names:
  path=ROOT/name
  if not path.is_file():continue
  if path.name in {'server.py','serve.py','boot.py','Launcher.swift'} or path.suffix.lower() in forbidden or name in engine or any(part in {'node_modules','.wrangler','game-assets','dist','runtime','__pycache__'} for part in Path(name).parts):failures.append('Forbidden file: '+name);continue
  if path.stat().st_size>2*1048576:failures.append('Unexpected large source file: '+name)
  try:text=path.read_text()
  except UnicodeDecodeError:continue
  if re.search(r'(?:ghp_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)',text):failures.append('Possible secret in '+name)
  if re.search(r'/(?:Users)/[A-Za-z0-9._-]+/',text) or re.search(r'/(?:private/)?tmp/heroes-',text):failures.append('Personal/local path in '+name)
  if path.suffix=='.md':
   links=re.findall(r'!?\[[^\]]*\]\(([^)]+)\)',text)+re.findall(r'(?:src|href)="([^"]+)"',text)
   for link in links:
    if link.startswith(('https://','http://','mailto:','#')):continue
    target=link.split('#')[0]
    if target and not (path.parent/target).exists():failures.append('Broken document link in '+name+': '+target)
 vendor=json.loads((ROOT/'config/vendor.lock.json').read_text())
 for name,digest in vendor['sha256'].items():
  if hashlib.sha256((ROOT/'src/vendor'/name).read_bytes()).hexdigest()!=digest:failures.append('Changed browser library: '+name)
 examples=['dist/index.html','data/game/Data/H3bitmap.lod','src/vendor/vcmiclient.wasm','src/vendor/vcmiclient.js','src/vendor/vcmi.data','src/vendor/vcmi.data.js','.env','local-game.json','sample.vsgm1','map.h3m']
 ignored=subprocess.run(['git','check-ignore','--stdin','-z'],input=('\0'.join(examples)+'\0').encode(),stdout=subprocess.PIPE,cwd=ROOT)
 if set(x.decode() for x in ignored.stdout.split(b'\0') if x)!=set(examples):failures.append('Required ignore rules missing')
 if failures:
  for failure in failures:print(failure,file=sys.stderr)
  raise SystemExit(1)
 print(f'Source package checked: {len(names)} files; no game data, engine binaries or detected secrets/local paths.')
if __name__=='__main__':check()
