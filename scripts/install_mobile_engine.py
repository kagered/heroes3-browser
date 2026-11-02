#!/usr/bin/env python3
"""Install an immutable mobile engine build into an existing lab static site."""
import argparse,hashlib,json,shutil
from pathlib import Path

def install(engine,site):
    names=['vcmiclient.js','vcmiclient.wasm','vcmi.data','vcmi.data.js']
    digests={name:hashlib.sha256((engine/name).read_bytes()).hexdigest() for name in names}
    build=hashlib.sha256(json.dumps(digests,sort_keys=True).encode()).hexdigest()[:20]
    prefix='vendor-mobile/'+build+'/'
    target=site/prefix
    target.mkdir(parents=True,exist_ok=True)
    metadata={}
    for name in names:
        source=engine/name;destination=target/name
        if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest()!=digests[name]:
            raise RuntimeError('Immutable mobile build differs: '+name)
        if not destination.exists():shutil.copyfile(source,destination)
        metadata[prefix+name]={'size':destination.stat().st_size,'hash':digests[name]}
    # Retain previous build directories and legacy root files for cached launchers.
    (site/'mobile-engine.js').write_text('window.HEROES_MOBILE_NATIVE_SETTINGS = true;\nwindow.HEROES_MOBILE_ENGINE_BASE = '+json.dumps(prefix)+';\nwindow.HEROES_MOBILE_ENGINE = '+json.dumps(metadata)+';\n')
    return prefix,metadata

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('engine',type=Path);p.add_argument('site',type=Path);a=p.parse_args()
    if not (a.site/'index.html').is_file():p.error('Expected an existing static site')
    install(a.engine,a.site)
if __name__=='__main__':main()
