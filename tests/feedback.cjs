const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const lang of ['ru','en']){
 const links=Array.from({length:3},()=>({events:{},addEventListener(name,fn){this.events[name]=fn}}));const document={documentElement:{lang},querySelectorAll:()=>links};
 const context={URL,document,window:{HEROES_FEEDBACK:{reportURL:'https://example.test/issues/new'},HEROES_BUILD:{version:'release-audit',engine:'VCMI 1.6.5'},innerWidth:1024,innerHeight:768},navigator:{userAgent:'Audit Safari',platform:'MacIntel',maxTouchPoints:5},location:{origin:'https://game.example.test',pathname:'/',search:'?private=DO_NOT_SEND',hash:'#private-save'}};
 vm.runInNewContext(fs.readFileSync('src/feedback.js','utf8'),context);
 for(const link of links){const url=new URL(link.href),body=url.searchParams.get('body');assert.equal(url.hostname,'example.test');assert.equal(url.pathname,'/issues/new');assert.equal(link.hidden,false);assert(body.includes('release-audit'));assert(body.includes('Audit Safari'));assert(!body.includes('DO_NOT_SEND'));assert(!body.includes('private-save'));assert(body.includes(lang==='en'?'Steps to reproduce':'Как повторить'));}
 document.documentElement.lang=lang==='ru'?'en':'ru';links[0].events.click();assert(new URL(links[0].href).searchParams.get('body').includes(lang==='ru'?'Steps to reproduce':'Как повторить'));
}
console.log('PASS: footer/loading/help drafts, current build/browser, RU/EN on activation and exclusion of query/hash');

for (const reportURL of [undefined, 'invalid', 'javascript:alert(1)', 'http://example.test']) {
 const link={hidden:true};
 vm.runInNewContext(fs.readFileSync('src/feedback.js','utf8'), {URL,window:{HEROES_FEEDBACK:{reportURL}},document:{querySelectorAll:()=>[link]}});
 assert.equal(link.hidden,true);assert.equal(link.href,undefined);
}
