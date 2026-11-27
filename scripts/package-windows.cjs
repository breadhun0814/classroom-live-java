// Runtime-only ZIP: no accounts, private certificates, downloaded JDK or developer files.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const files=['Start-Classroom.cmd','ClassroomLive.jar','ServerControl.jar','ClassroomLive.ico','ClassroomLive.png','Server-App.cmd','Server-App.vbs','Server-App-Debug.cmd','Create-Desktop-Shortcut.cmd','00-Java-Check.cmd','01-Setup.cmd','02-Start.cmd','03-Firewall.cmd','04-Backup.cmd','05-Reset-Password.cmd','QUICK_START_KO.txt','START_HERE.html','guide.js','guide.css','install.html','portfolio.css','portfolio-icon.svg','java-path.example.txt','scripts/java-runtime.ps1','scripts/start-classroom.ps1','scripts/run.ps1','scripts/control.ps1','scripts/firewall.ps1','scripts/create-shortcut.ps1'];
const output=path.join(root,'downloads','ClassroomLive-Windows.zip');
const build=path.resolve(root,'build');fs.mkdirSync(build,{recursive:true});
const staging=fs.mkdtempSync(path.join(build,'runtime-package-'));
try {
 for(const file of files){const target=path.join(staging,'ClassroomLive',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const jdkHome=process.env.JAVA_HOME;
 const jar=jdkHome?path.join(jdkHome,'bin',process.platform==='win32'?'jar.exe':'jar'):'jar';
 execFileSync(jar,['--create','--file',output,'--no-manifest','-C',staging,'ClassroomLive'],{stdio:'inherit'});
 console.log(`Packaged ${files.length} runtime files: ${output}`);
}finally{
 const resolved=path.resolve(staging);
 if(path.dirname(resolved)!==build||!path.basename(resolved).startsWith('runtime-package-'))throw Error('Unexpected staging path');
 fs.rmSync(resolved,{recursive:true,force:true});
}
