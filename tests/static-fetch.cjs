const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const urls=[];let canceled=false;
const c=vm.createContext({window:{HEROES_STATIC:{parts:{'/large':{size:4,urls:['/p1','/p2']}}}},Response,ReadableStream,fetch:async url=>{urls.push(url);return new Response(Uint8Array.from(url==='/p1'?[1,2]:[3,4]))}});
vm.runInContext(fs.readFileSync('src/export_site.py','utf8').match(/code\+='''\n([\s\S]*?)\n'''/)[1],c);
(async()=>{const response=await vm.runInContext("fetchSiteAsset('/large')",c);assert.equal(response.headers.get('Content-Length'),'4');assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer())),[1,2,3,4]);assert.deepEqual(urls,['/p1','/p2']);console.log('PASS: split archive streamed in order with exact size, without assembling copies in the proxy');})().catch(e=>{console.error(e);process.exitCode=1});
