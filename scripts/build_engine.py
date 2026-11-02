#!/usr/bin/env python3
"""Build the pinned experimental engine locally; never deploy or replace desktop artifacts."""
import argparse,hashlib,json,os,shutil,subprocess,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(args,*,env=None,cwd=None):
    subprocess.run([str(x) for x in args],check=True,env=env,cwd=cwd)
def prepare(archive,source,cache):
    cache.parent.mkdir(parents=True,exist_ok=True)
    if not cache.exists():run(['curl','-fL','--retry','3',archive['url'],'-o',cache])
    if hashlib.sha256(cache.read_bytes()).hexdigest()!=archive['sha256']:raise ValueError('Archive checksum mismatch: '+cache.name)
    marker=source/'.heroes-archive-sha256'
    if marker.exists():
        if marker.read_text().strip()!=archive['sha256']:raise ValueError('Existing source has a different archive revision')
        return
    if source.exists() and any(source.iterdir()):raise ValueError('Use an empty work directory for unmarked sources')
    source.mkdir(parents=True,exist_ok=True)
    with tarfile.open(cache) as bundle:
        members=bundle.getmembers();prefix=members[0].name.split('/')[0]+'/'
        for member in members:
            if not member.name.startswith(prefix):continue
            member.name=member.name[len(prefix):]
            if member.name:bundle.extract(member,source,filter='data')
    marker.write_text(archive['sha256']+'\n')
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk',type=Path,required=True,help='Emscripten SDK upstream folder (contains bin/ and emscripten/)')
    parser.add_argument('--work',type=Path,default=ROOT/'.engine-work')
    parser.add_argument('--prepare-only',action='store_true')
    parser.add_argument('--jobs',type=int,default=4,help='Compilation parallelism; default 4 to limit memory pressure')
    args=parser.parse_args()
    if args.jobs<1:parser.error('--jobs must be positive')
    sdk=args.sdk.expanduser().resolve();work=args.work.expanduser().resolve();work.mkdir(parents=True,exist_ok=True)
    lock=json.loads((ROOT/'config/engine-build.lock.json').read_text())
    version=(sdk/'emscripten/emscripten-version.txt').read_text().strip().strip('"')
    if version.split('-',1)[0]!=lock['emscripten']:parser.error('Expected Emscripten '+lock['emscripten'])
    tools={name:shutil.which(name) for name in ['cmake','ninja','node']}
    if not all(tools.values()):parser.error('cmake, ninja and Node.js must be on PATH')
    source=work/'source';build=work/'emscripten'
    prepare(lock['archives']['source'],source,work/'downloads/source.tar.gz')
    prepare(lock['archives']['fuzzylite'],source/'AI/FuzzyLite',work/'downloads/fuzzylite.tar.gz')
    cmake=source/'CMakeLists.txt';text=cmake.read_text()
    if '-DTBB_TEST=OFF' not in text:
        text=text.replace('"-DBUILD_SHARED_LIBS=false"', '"-DBUILD_SHARED_LIBS=false"\n\t\t\t\t"-DTBB_TEST=OFF"')
        cmake.write_text(text)
    text=cmake.read_text()
    text=text.replace("'callMain', 'run']", "'callMain', 'run', 'HEAPU8']")
    if text!=cmake.read_text():cmake.write_text(text)
    (source/'data').mkdir(exist_ok=True)
    music=source/'data/Mp3_empty'
    if music.is_file():
        if music.stat().st_size:raise ValueError('Expected an empty generated music placeholder')
        music.unlink()
    music.mkdir(exist_ok=True);(music/'.keep').touch()
    config=work/'emscripten.config.py';config.write_text('LLVM_ROOT = '+repr(str(sdk/'bin'))+'\nBINARYEN_ROOT = '+repr(str(sdk))+'\nNODE_JS = '+repr(tools['node'])+'\nCACHE = '+repr(str(work/'cache'))+'\n')
    env=os.environ.copy();env['EM_CONFIG']=str(config);env['PATH']=str(sdk/'emscripten')+os.pathsep+env['PATH']
    run([sdk/'emscripten/emcmake',tools['cmake'],'-S',source,'-B',build,'-GNinja','-DCMAKE_BUILD_TYPE=MinSizeRel','-DCMAKE_POLICY_VERSION_MINIMUM=3.5'],env=env)
    if args.prepare_only:return
    run([sdk/'emscripten/embuilder','build','sdl2','sdl2_ttf','sdl2_image','sdl2_mixer'],env=env)
    run([tools['ninja'],'-j'+str(args.jobs),'boost-lib','tbb-lib'],env=env,cwd=build)
    # Boost 1.86 QVM uses 'template' on non-template indexed accessors; Clang 22 rejects it.
    qvm=build/'boost/include/boost/qvm/quat_traits.hpp'
    qvm.write_bytes(qvm.read_bytes().replace(b'::template write_element_idx(',b'::write_element_idx('))
    run([tools['ninja'],'-j'+str(args.jobs),'html5'],env=env,cwd=build)
    run([tools['ninja'],'-j32','html5'],env=env,cwd=build)
    artifacts={p.name:{'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (build/'html5').glob('*') if p.is_file()}
    (work/'build-result.json').write_text(json.dumps({'source_revision':lock['source_revision'],'files':artifacts},indent=2)+'\n')
    print('Engine built in '+str(build/'html5')+'. Desktop artifacts were not replaced.')
if __name__=='__main__':main()
