const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const app=fs.readFileSync('src/app.js','utf8');const fn=app.slice(app.indexOf('function homeDestination()'),app.indexOf('async function returnHome()'));
function target(navigator,origin){const context=vm.createContext({navigator,location:{origin},gameLanguage:'en'});vm.runInContext(fn,context);return vm.runInContext('homeDestination()',context)}
assert.equal(target({userAgent:'iPad',platform:'iPad'},'https://heroes-iii-browser.pages.dev'),'https://heroes-iii-memory-reset.pages.dev/?lang=en');
assert.equal(target({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5},'https://heroes-iii-browser.pages.dev'),'https://heroes-iii-memory-reset.pages.dev/?lang=en');
assert.equal(target({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:0},'https://heroes-iii-browser.pages.dev'),'/index.html');
assert.equal(target({userAgent:'iPad',platform:'iPad'},'http://localhost:8765'),'/index.html');
const html=fs.readFileSync('support/memory-reset/index.html','utf8');const script=html.split('<script>')[1].split('</script>')[0];
for (const query of ['?lang=ru','?lang=en&return=https://evil.invalid']) {
 let destination;const elements=new Map();const context={URLSearchParams,location:{search:query,replace:url=>destination=url},document:{documentElement:{},querySelector:name=>{if(!elements.has(name))elements.set(name,{});return elements.get(name)}},setTimeout:fn=>fn()};
 vm.runInNewContext(script,context);assert.equal(destination,'https://heroes-iii-browser.pages.dev/');
}
console.log('PASS: iPad/iPhone route, desktop/local unchanged, fixed return destination ignores arbitrary URLs');
