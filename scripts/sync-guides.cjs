// Developer tool: regenerate offline guide data and Markdown translations. Not needed to run the server.
const fs=require('node:fs'),path=require('node:path');const root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'guide-data.json'),'utf8'));
let js=fs.readFileSync(path.join(root,'guide.js'),'utf8');const start=js.indexOf('const guides=')+'const guides='.length,end=js.indexOf(';\nconst picker');if(start<13||end<0)throw Error('Guide template marker not found');js=js.slice(0,start)+JSON.stringify(data)+js.slice(end);fs.writeFileSync(path.join(root,'guide.js'),js);
fs.copyFileSync(path.join(root,'index.html'),path.join(root,'START_HERE.html'));
for(const [from,to]of [['index.html','help.html'],['guide.js','guide.js'],['guide.css','guide.css']])fs.copyFileSync(path.join(root,from),path.join(root,'public',to));
const nav=Object.entries(data).map(([lang,d])=>`[${d.name}](guide-${lang}.md)`).join(' | ');
for(const [lang,d]of Object.entries(data)){let md=`# ${d.title} — ${d.name}\n\n${nav}\n\n${d.lead}\n\n> ${d.notice}\n\n`;for(const [title,body]of d.sections)md+=`## ${title}\n\n${body}\n\n`;fs.writeFileSync(path.join(root,'docs',`guide-${lang}.md`),md);}
console.log('Updated offline guide, server help and Markdown language guides.');
