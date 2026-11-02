#!/usr/bin/env python3
"""Build a standalone static single-player site; no Python server is deployed."""
import argparse, hashlib, json, shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parent
LIMIT = 20 * 1024 * 1024
REQUIRED = {'h3bitmap.lod','h3sprite.lod','h3ab_bmp.lod','h3ab_spr.lod','heroes3.snd','h3ab_ahd.snd'}

def export(destination, russian, english):
    games=[(language,folder) for language,folder in [('ru',russian),('en',english)] if folder is not None]
    if not games:raise ValueError('Provide at least one game language')
    for language,folder in games:
        if not folder.is_dir():raise ValueError(f'{language}: game folder not found')
        data=next((p for p in folder.iterdir() if p.is_dir() and p.name.lower()=='data'),None)
        missing=REQUIRED-({p.name.lower() for p in data.iterdir() if p.is_file()} if data else set())
        if missing:raise ValueError(f'{language}: missing {missing}')
    destination.mkdir(parents=True, exist_ok=False)
    manifest = {'inventories':{},'parts':{}}
    def copy(source, relative):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        size = source.stat().st_size
        digest = hashlib.sha256()
        if size <= LIMIT:
            with source.open('rb') as src, target.open('wb') as dst:
                for block in iter(lambda:src.read(1024*1024),b''):
                    digest.update(block);dst.write(block)
        else:
            parts=[]
            with source.open('rb') as src:
                index=0
                while block:=src.read(LIMIT):
                    digest.update(block)
                    name=relative+f'.part{index:03}'
                    (destination/name).write_bytes(block);parts.append('/'+name);index+=1
            manifest['parts']['/'+relative]={'size':size,'urls':parts}
        return digest.hexdigest()
    for language, folder in games:
        files=[]
        for sub, extensions in [('Data',{'.lod','.snd'}),('Maps',{'.h3m','.h3c','.tut'}),('Mp3',{'.mp3'})]:
            source_folder=next((p for p in folder.iterdir() if p.is_dir() and p.name.lower()==sub.lower()),folder/sub)
            for source in sorted(source_folder.glob('*')):
                if source.is_file() and source.suffix.lower() in extensions:
                    path=sub+'/'+source.name
                    version=copy(source,f'game-data/{language}/{path}')
                    files.append({'path':path,'size':source.stat().st_size,'version':version})
        missing=REQUIRED-{Path(f['path']).name.lower() for f in files}
        if missing:raise ValueError(f'{language}: missing {missing}')
        manifest['inventories'][language]={'files':files,'missing':[]}
    for name in ['vcmiclient.js','vcmiclient.wasm','vcmi.data','vcmi.data.js','LICENSE-VCMI.txt']:
        copy(ROOT/'vendor'/name,'vendor/'+name)
    refresh_client(destination, manifest)
    print(json.dumps({'directory':str(destination),'files':sum(1 for p in destination.rglob('*') if p.is_file()),'bytes':sum(p.stat().st_size for p in destination.rglob('*') if p.is_file()),'split_archives':len(manifest['parts'])}))
def refresh_client(destination, manifest):
    if (ROOT/'vendor-mobile').is_dir():
        shutil.copytree(ROOT/'vendor-mobile',destination/'vendor-mobile',dirs_exist_ok=True)
    shutil.copytree(ROOT/'assets',destination/'assets',dirs_exist_ok=True)
    for name in ['save-zip.js','LICENSE-fflate.txt','asset-sha256.js','LICENSE-noble-hashes.txt']:
        shutil.copyfile(ROOT/'vendor'/name,destination/'vendor'/name)
    for name in ['index.html','favicon.svg','favicon-32.png','apple-touch-icon.png','favicon.ico','app.js','mobile.js','mobile-adventure.js','mobile-adventure.css','mobile-engine.js','manifest.webmanifest','pwa-icon-192.png','pwa-icon-512.png','runtime-lifecycle.js','save-transfer-core.js','save-transfer.js','release-notes.js','feedback.js','preflight.js','cache-core.js','cache.js','maps-core.js','maps.js','dialogs.js','download.js']:
        shutil.copyfile(ROOT/name,destination/name)
    (destination/'site-data.js').write_text('window.HEROES_STATIC='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n')
    index=destination/'index.html'
    index.write_text(index.read_text().replace('<script src="app.js">','<script src="site-data.js"></script>\n<script src="app.js">'))
    # Deployment-only feedback destination is never checked into the source package.
    feedback_config=ROOT/'feedback-config.local.json'
    if feedback_config.exists():
        settings=json.loads(feedback_config.read_text())
        endpoint=settings.get('reportURL','')
        if not isinstance(endpoint,str) or not endpoint.startswith('https://'):
            raise ValueError('feedback reportURL must be an HTTPS URL')
        payload=json.dumps({'reportURL':endpoint},ensure_ascii=True).replace('<','\\u003c')
        index.write_text(index.read_text().replace('<script src="feedback.js"></script>', '<script>window.HEROES_FEEDBACK='+payload+';</script>\n<script src="feedback.js"></script>'))
    app=destination/'app.js';code=app.read_text()
    code=code.replace("'/game-data/' + path + '?lang=' + gameLanguage", "'/game-data/' + gameLanguage + '/' + path")
    code=code.replace("const languages = await (await fetch('/api/languages')).json();", "const languages = {languages:Object.keys(window.HEROES_STATIC.inventories)};")
    begin=code.index("    const response = await fetch('/api/files?lang='")
    end=code.index('    updateNetworkUI();',begin)
    code=code[:begin]+"    inventory = window.HEROES_STATIC.inventories[gameLanguage];\n    networkInfo = {available:false,can_host:false};\n"+code[end:]
    code=code.replace('function fetchAsset(url,options) { return fetch(url,options); }','function fetchAsset(url,options) { return fetchSiteAsset(url,options); }')
    code+='''
// Stream large archives from host-compatible parts into the loader's one buffer.
async function fetchSiteAsset(url, options={}) {
  const entry = window.HEROES_STATIC.parts[url];
  if (!entry) return fetch(url, options);
  let index=0, reader=null;
  return new Response(new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          if (!reader) {
            if (index===entry.urls.length) {controller.close();return;}
            const response=await fetch(entry.urls[index++], options);
            if (!response.ok || !response.body) throw new Error('Resource download failed: HTTP '+response.status);
            reader=response.body.getReader();
          }
          const chunk=await reader.read();
          if (!chunk.done) {controller.enqueue(chunk.value);return;}
          reader.releaseLock();reader=null;
        }
      } catch(error) {if(reader)await reader.cancel().catch(()=>{});controller.error(error);}
    },
    async cancel(reason) {if(reader)await reader.cancel(reason);}
  }), {headers:{'Content-Length':String(entry.size)}});
}
'''
    app.write_text(code)
    (destination/'_headers').write_text('/*\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp\n  X-Content-Type-Options: nosniff\n')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--russian',type=Path)
    parser.add_argument('--english',type=Path)
    parser.add_argument('--refresh-client',action='store_true')
    args=parser.parse_args()
    if args.refresh_client:
        source=(args.out/'site-data.js').read_text()
        manifest=json.loads(source.removeprefix('window.HEROES_STATIC=').strip().removesuffix(';'))
        refresh_client(args.out.resolve(),manifest)
        print('Client refreshed; game assets unchanged')
    else:
        if not args.russian and not args.english: parser.error('--russian and/or --english is required')
        export(args.out.resolve(),args.russian.resolve() if args.russian else None,args.english.resolve() if args.english else None)
