#!/usr/bin/env python3
"""Install a locally built lab engine into an existing static preview directory."""
import argparse,hashlib,json,shutil
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('engine',type=Path);p.add_argument('site',type=Path);a=p.parse_args()
if not (a.site/'index.html').is_file():p.error('Expected an existing static site')
metadata={}
for name in ['vcmiclient.js','vcmiclient.wasm','vcmi.data','vcmi.data.js']:
    source=a.engine/name;target=a.site/'vendor-mobile'/name
    target.parent.mkdir(exist_ok=True);shutil.copyfile(source,target)
    metadata['vendor-mobile/'+name]={'size':target.stat().st_size,'hash':hashlib.sha256(target.read_bytes()).hexdigest()}
(a.site/'mobile-engine.js').write_text('window.HEROES_MOBILE_ENGINE = '+json.dumps(metadata)+';\n')
