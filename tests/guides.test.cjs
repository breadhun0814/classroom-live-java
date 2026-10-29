const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');const root=path.join(__dirname,'..');
for(const [lang,needle]of [['ko','GitHub Pages는'],['en','GitHub Pages does not'],['ja','GitHub Pagesでは'],['zh-CN','GitHub Pages不能'],['vi','GitHub Pages không']]){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.github.io/project/?lang='+lang,runScripts:'outside-only'});const w=dom.window;
 w.eval(fs.readFileSync(path.join(root,'guide.js'),'utf8'));assert.equal(w.document.documentElement.lang,lang);assert.equal(w.document.querySelectorAll('article').length,11);assert(w.document.getElementById('guide-notice').textContent.includes(needle));
 for(const value of ['ko','en','ja','zh-CN','vi']){const p=w.document.getElementById('guide-language');p.value=value;p.dispatchEvent(new w.Event('change'));assert.equal(w.document.documentElement.lang,value);assert.equal(w.localStorage.getItem('classroom-language'),value);assert.equal(w.document.querySelectorAll('article').length,11);}
 const md=fs.readFileSync(path.join(root,'docs','guide-'+lang+'.md'),'utf8');assert(md.includes('STUDENT_SETUP.zip'));assert(md.includes('ClassroomLive.jar'));assert(md.includes('data/tls'));assert(md.includes('8443'));dom.window.close();
}
const md=fs.readFileSync(path.join(root,'README.md'),'utf8');for(const match of md.matchAll(/\]\(([^)]+)\)/g)){if(!match[1].startsWith('https:'))assert(fs.existsSync(path.join(root,match[1])),match[1]);}
console.log('PASS five-language offline guides, page/README links, language switching and persisted choice; instructions distinguish GitHub Pages from the live LAN server');
