// Real local Java HTTPS API + jsdom UI + simulated browser media peers.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),https=require('node:https'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'../public'),pcs=new Map();let seq=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await sleep(20);}throw Error('UI timeout');}
let base,ca;
function browser(){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:base,runScripts:'outside-only'});
 const w=dom.window,timers=[],calls=[],capture=[];let cookie='',copied='';
 Object.defineProperty(w,'isSecureContext',{value:true});Object.defineProperty(w.crypto,'randomUUID',{value:crypto.randomUUID});
 w.AbortSignal={timeout:()=>undefined};w.setTimeout=fn=>{timers.push(fn);return fn;};w.clearTimeout=fn=>{let i=timers.indexOf(fn);if(i>=0)timers.splice(i,1);};
 w.fetch=(url,options={})=>new Promise((resolve,reject)=>{
  assert(String(url).startsWith('/api/'),'No cloud dependency is allowed');calls.push(url);
  const req=https.request(new URL(url,base),{method:options.method||'GET',ca,headers:{...options.headers,Origin:base.slice(0,-1),...(cookie?{Cookie:cookie}:{})}},res=>{
   let body='';if(res.headers['set-cookie'])cookie=res.headers['set-cookie'][0].split(';')[0];res.setEncoding('utf8');res.on('data',s=>body+=s);res.on('end',()=>resolve({ok:res.statusCode<400,json:async()=>JSON.parse(body)}));
  });req.on('error',reject);req.end(options.body);
 });
 const constraints=[];let settings={width:1280,height:800,frameRate:30,displaySurface:'monitor'};
 const track={kind:'video',stop(){},getSettings:()=>({...settings}),getCapabilities:()=>({width:{max:2560},height:{max:1600}}),applyConstraints:async c=>{constraints.push(c);if(w.failConstraints)throw new Error('Unsupported constraint');const h=c.height?.max||c.height?.ideal||settings.height;settings={...settings,width:Math.round(h*2560/1600),height:h,frameRate:c.frameRate?.max||settings.frameRate};}};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getDisplayMedia:async o=>{capture.push(o);return stream;},getSupportedConstraints:()=>({resizeMode:true})}});
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async s=>{copied=s;}}});
 w.HTMLMediaElement.prototype.play=async()=>{};w.confirm=()=>true;
 class Peer{
  constructor(config){assert.equal(config.iceServers.length,0);this.id='pc'+(++seq);this.senders=[];this.transceivers=[];this.connectionState='new';this.iceConnectionState='checking';this.signalingState='stable';pcs.set(this.id,this);}
  addTrack(track,stream){this.stream=stream;const sender={track,getParameters:()=>({encodings:[{}]}),setParameters:async p=>{assert.equal(this.remoteDescription?.type,'answer');this.params=p;}};this.senders.push(sender);this.transceivers.push({sender,setCodecPreferences:codecs=>{if(w.failCodec)throw new Error('Unsupported codec preference');this.codecs=codecs;}});}
  getTransceivers(){return this.transceivers;}getSenders(){return this.senders;}async createOffer(){return {type:'offer',sdp:this.id};}async createAnswer(){return {type:'answer',sdp:this.id};}
  async setLocalDescription(d){this.localDescription=d;this.signalingState=d.type==='offer'?'have-local-offer':'stable';queueMicrotask(()=>this.onicecandidate?.({candidate:{toJSON:()=>({candidate:'fake-host-ice'})}}));}
  async setRemoteDescription(d){this.remoteDescription=d;this.signalingState=d.type==='offer'?'have-remote-offer':'stable';if(d.type==='answer'){let viewer=pcs.get(d.sdp);viewer.ontrack?.({streams:[this.stream]});this.connectionState=viewer.connectionState='connected';this.iceConnectionState=viewer.iceConnectionState='connected';this.onconnectionstatechange?.();viewer.onconnectionstatechange?.();}}
  async addIceCandidate(){}async getStats(){return new Map();}close(){this.connectionState='closed';}
 }
 const capabilities={codecs:[{mimeType:'video/VP8',clockRate:90000},{mimeType:'video/rtx',clockRate:90000},{mimeType:'video/H264',clockRate:90000},{mimeType:'video/VP9',clockRate:90000}]};w.RTCRtpSender={getCapabilities:()=>capabilities};w.RTCRtpReceiver={getCapabilities:()=>capabilities};
 w.RTCPeerConnection=Peer;w.localStorage.setItem('classroom-language','ko');
 for(const name of ['config.js','local-api.js','languages.js','i18n.js','app.js'])w.eval(fs.readFileSync(path.join(root,'web',name),'utf8'));
 const el=id=>w.document.getElementById(id);
 return {w,dom,el,capture,calls,track,constraints,get copied(){return copied;},async tick(){let fn=timers.shift();if(fn)await fn();await sleep(30);},async click(id){el(id).click();await sleep(50);},async submit(id){el(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await sleep(50);}};
}
(async()=>{
 const child=spawn(process.env.JAVA||'java',['--add-modules','jdk.httpserver','-cp',[path.join(__dirname,'../build/classes'),path.join(__dirname,'../build/test-classes')].join(path.delimiter),'ServerTests','fixture'],{cwd:path.join(__dirname,'..')});child.stderr.pipe(process.stderr);
 const info=await new Promise((resolve,reject)=>{let buf='';child.stdout.on('data',d=>{buf+=d;if(buf.includes('\n')){try{resolve(JSON.parse(buf.split('\n')[0]));}catch(e){reject(e);}}});child.on('exit',code=>reject(Error('Backend exited '+code)));});
 base=`https://127.0.0.1:${info.port}/`;ca=fs.readFileSync(info.ca);
 const x=browser(),y=browser();
 try{
  await until(()=>!x.el('auth').hidden&&!y.el('auth').hidden);
  x.el('email').value='teacher';x.el('password').value='TeacherPassword-123';await x.submit('auth-form');await until(()=>!x.el('lobby').hidden);assert.equal(x.el('admin-button').hidden,false);
  await y.click('auth-toggle');y.el('email').value='student01';y.el('password').value='StudentPassword123';y.el('display-name').value='Student 한글';await y.submit('auth-form');await until(()=>!y.el('lobby').hidden);assert.equal(y.el('admin-button').hidden,true);
  x.el('room-title').value='우리 교실';x.el('create-password').value='classpass';await x.submit('create-form');await until(()=>x.el('room-name').textContent==='우리 교실');
  await y.click('refresh-rooms');await until(()=>y.el('room-list').textContent.includes('우리 교실'));y.el('room-list').querySelector('button').click();y.el('join-password').value='classpass';await y.submit('join-form');await until(()=>y.el('room-name').textContent==='우리 교실');
  x.el('chat-text').value='  const a = 1;\n  a++;';x.el('as-code').checked=true;x.el('chat-text').dispatchEvent(new x.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await until(()=>x.el('chat-text').value==='');await y.tick();assert(y.el('messages').textContent.includes('const a = 1'));assert.equal(y.el('messages').querySelector('pre').textContent,'  const a = 1;\n  a++;');

  for(const [language,shareLabel,loginLabel]of [['ja','画面共有を開始','ログイン'],['zh-CN','开始共享屏幕','登录'],['vi','Chia sẻ màn hình','Đăng nhập'],['en','Share screen','Sign in']]){
   y.el('language').value=language;y.el('language').dispatchEvent(new y.w.Event('change'));assert.equal(y.el('share').textContent,shareLabel);assert.equal(y.el('auth-title').textContent,loginLabel);assert.equal(y.el('room-name').textContent,'우리 교실');assert.equal(y.el('messages').querySelector('pre').textContent,'  const a = 1;\n  a++;');assert.equal(y.w.localStorage.getItem('classroom-language'),language);
  }
  y.el('language').value='ko';y.el('language').dispatchEvent(new y.w.Event('change'));
  await x.click('preset-text');assert.equal(x.el('resolution').value,'native');await x.click('share');await until(()=>x.capture.length===1);assert.equal(x.capture[0].video.width,undefined,'Native capture must not force 16:9 width');assert.equal(x.capture[0].video.height,undefined,'Native capture must not cap the surface to 1080p');await until(()=>x.constraints.length===1);assert.equal(x.constraints[0].width.ideal,2560);assert.equal(x.constraints[0].height.ideal,1600);assert.equal(x.track.contentHint,'text');await x.tick();await y.tick();await x.tick();await y.tick();await x.tick();await y.tick();
  assert.equal([...pcs.values()].filter(p=>p.connectionState==='connected').length,2,'Two peers negotiated over local server');assert.equal(x.el('stop').hidden,false);
  const textSender=[...pcs.values()].find(p=>p.params&&p.connectionState==='connected');assert(textSender);assert.equal(textSender.params.encodings[0].maxBitrate,32000000);assert.equal(textSender.params.encodings[0].scaleResolutionDownBy,1);assert.equal(textSender.params.degradationPreference,'maintain-resolution');assert.equal(x.el('quality-level').disabled,true);assert.match(x.el('capture-stats').textContent,/2560×1600/);
  Object.defineProperty(y.el('screen'),'videoWidth',{value:2560,configurable:true});Object.defineProperty(y.el('screen'),'videoHeight',{value:1600,configurable:true});await y.click('native-size');assert.equal(y.el('screen').style.width,'2560px');assert.equal(y.el('screen').style.height,'1600px');assert.equal(y.el('native-size').getAttribute('aria-pressed'),'true');await y.click('native-size');assert.equal(y.el('screen').style.width,'');
  await x.click('copy-diagnostics');const captureReport=JSON.parse(x.copied);assert.equal(captureReport.capture.height,1600);assert.equal(captureReport.requested.bitrate,32000000);
  await y.click('copy-diagnostics');assert.equal(JSON.parse(y.copied).version,'java-lan3');assert.equal(JSON.parse(y.copied).relayConfigured,false);
  await x.click('stop');await x.tick();await y.tick();
  await x.click('preset-motion');assert.equal(x.el('resolution').value,'1080');assert.equal(x.el('fps').value,'60');assert.equal(x.el('video-codec').value,'h264');
  await x.click('share');await until(()=>x.capture.length===2);await x.tick();await y.tick();await x.tick();await y.tick();await x.tick();await y.tick();
  const motion=[...pcs.values()].find(p=>p.params&&p.connectionState==='connected');assert(motion);assert.equal(x.capture[1].video.width,undefined);assert.equal(x.constraints[1].height.max,1080);assert.equal(x.track.contentHint,'motion');assert.equal(motion.params.degradationPreference,'maintain-framerate');assert.equal(motion.params.encodings[0].maxFramerate,60);assert.equal(motion.params.encodings[0].maxBitrate,30000000);assert.equal(motion.codecs[0].mimeType,'video/H264');assert(motion.codecs.some(c=>c.mimeType==='video/VP8'),'Keep codec fallback');
  await x.click('stop');await x.tick();await y.tick();
  // A browser that refuses optional capture/codec settings must still connect and expose the warning.
  x.w.failConstraints=true;x.w.failCodec=true;await x.click('preset-text');x.el('video-codec').value='vp9';await x.click('share');await until(()=>x.capture.length===3);await x.tick();await y.tick();await x.tick();await y.tick();await x.tick();await y.tick();
  assert.equal([...pcs.values()].filter(p=>p.connectionState==='connected').length,2);assert.match(x.el('capture-stats').textContent,/캡처 설정 일부/);
  await x.click('stop');await x.tick();await y.tick();
  await y.click('leave');await y.click('profile-button');y.el('profile-nickname').value='English Student';await y.submit('profile-form');await until(()=>y.el('account').textContent==='English Student');
  await x.click('leave');await x.click('admin-button');await until(()=>x.el('admin-users').textContent.includes('English Student'));
  let suspend=[...x.el('admin-users').querySelectorAll('button')].find(b=>b.textContent==='이용 정지');assert(suspend);suspend.click();await until(()=>x.el('admin-users').textContent.includes('이용 정지 해제'));
  y.el('language').value='en';y.el('language').dispatchEvent(new y.w.Event('change'));assert.equal(y.el('auth-title').textContent,'Sign in');assert.equal(y.el('preset-text').textContent,'Clear classroom text');assert.equal(y.el('native-size').textContent,'View original size');
  await x.click('logout');await until(()=>!x.el('auth').hidden);assert.equal(x.el('admin-users').children.length,0);
  console.log('PASS quality: native non-16:9 source capture, 32Mbps text cap, preserve resolution, original pixel display, motion/H264 fallback, optional-constraint fallback and bilingual labels. PASS: actual HTTPS/cookie login, local signup, directory join, Enter code chat, mocked WebRTC negotiation with no STUN/cloud calls, diagnostics, English nickname, owner admin suspension, bilingual UI, logout privacy');
 }finally{x.dom.window.close();y.dom.window.close();child.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
