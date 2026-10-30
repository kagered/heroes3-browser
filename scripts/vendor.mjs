import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const fflate=dirname(require.resolve('fflate/package.json'));
writeFileSync(resolve(root,'src/vendor/save-zip.js'),readFileSync(resolve(fflate,'umd/index.js')));
writeFileSync(resolve(root,'src/vendor/LICENSE-fflate.txt'),readFileSync(resolve(fflate,'LICENSE')));
// Resolve the package root through its package.json, not the ESM subdirectory.
const nobleRoot=dirname(require.resolve('@noble/hashes/sha256'));
writeFileSync(resolve(root,'src/vendor/LICENSE-noble-hashes.txt'),readFileSync(resolve(nobleRoot,'LICENSE')));
await build({stdin:{contents:"import {sha256} from '@noble/hashes/sha256'; window.heroesSHA256=sha256;",resolveDir:root,sourcefile:'asset-sha256-entry.js'},bundle:true,format:'iife',platform:'browser',minify:true,legalComments:'inline',outfile:resolve(root,'src/vendor/asset-sha256.js')});
const files=['save-zip.js','LICENSE-fflate.txt','asset-sha256.js','LICENSE-noble-hashes.txt'];
const hashes=Object.fromEntries(files.map(name=>[name,createHash('sha256').update(readFileSync(resolve(root,'src/vendor',name))).digest('hex')]));
writeFileSync(resolve(root,'config/vendor.lock.json'),JSON.stringify({fflate:'0.8.3','noble-hashes':'1.8.0',esbuild:'0.28.2',sha256:hashes},null,2)+'\n');
console.log('Browser libraries rebuilt and checksums updated. Review the diff and run npm test.');
