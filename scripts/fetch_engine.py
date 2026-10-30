#!/usr/bin/env python3
"""Fetch the pinned upstream engine, never original Heroes III game files."""
import argparse,hashlib,json,shutil,subprocess,tempfile,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def verify(path,item):
    try:
        if not path.is_file() or path.stat().st_size!=item['size']:return False
        digest=hashlib.sha256()
        with path.open('rb') as source:
            for block in iter(lambda:source.read(1048576),b''):digest.update(block)
        return digest.hexdigest()==item['sha256']
    except OSError:return False
def ensure(check_only=False):
    lock=json.loads((ROOT/'config/engine.lock.json').read_text())
    target=ROOT/'src/vendor';target.mkdir(parents=True,exist_ok=True)
    for item in lock['files']:
        path=target/item['name']
        if verify(path,item):print('Verified:',item['name']);continue
        if check_only:raise SystemExit('Missing or changed engine file: '+item['name']+'. Run python3 scripts/fetch_engine.py')
        if not item['url'].startswith('https://raw.githubusercontent.com/caiiiycuk/vcmi-wasm/'):raise SystemExit('Unexpected engine URL')
        print('Downloading:',item['name'],flush=True)
        with tempfile.TemporaryDirectory(dir=target) as temp:
            download=Path(temp)/item['name']
            if shutil.which('curl'):
                subprocess.run(['curl','--fail','--location','--silent','--show-error','--proto','=https','--proto-redir','=https','--retry','2','--connect-timeout','15','--max-time','180',item['url'],'--output',str(download)],check=True)
            else:
                with urllib.request.urlopen(item['url'],timeout=180) as response,download.open('wb') as output:shutil.copyfileobj(response,output)
            if not verify(download,item):raise SystemExit('Engine checksum mismatch: '+item['name'])
            download.replace(path)
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args();ensure(args.check)
