/* Static portfolio demo. No accounts, network requests or actual screen capture. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const menu = $('main-nav'), menuButton = $('menu-toggle');
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {menu.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','메뉴 열기');}));
  document.addEventListener('keydown', e => {if(e.key==='Escape'&&menu.classList.contains('is-open')){menu.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','메뉴 열기');menuButton.focus();}});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {menu.querySelectorAll('[aria-current]').forEach(a=>a.removeAttribute('aria-current'));menu.querySelector(`a[href="#${entry.target.id}"]`)?.setAttribute('aria-current','location');}
    }, {rootMargin:'-15% 0px -60% 0px'});
    document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));
  }
  const dialog=$('image-dialog');
  document.querySelectorAll('[data-open-image]').forEach(button=>button.addEventListener('click',()=>{dialog.showModal();document.body.classList.add('dialog-open');}));
  dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
  $('close-image').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  const steps = [
    {title:'비밀번호 방',description:'이름이나 초대 코드와 비밀번호로 수업 공간에 입장합니다. 실제 서비스는 방마다 공유자를 포함해 최대 8개 접속을 허용합니다.'},
    {title:'코드 채팅',description:'코드의 줄바꿈을 유지해 보내고 대화를 검색·복사·저장할 수 있습니다. 대화창에 예시 메시지를 직접 입력해 보세요.'},
    {title:'화면 공유',description:'실제 앱은 브라우저 화면을 WebRTC로 직접 전달합니다. 아래 프리셋은 설정의 차이를 설명하는 예시이며 화면을 캡처하지 않습니다.'},
    {title:'관리자 운영',description:'관리자는 회원의 이용 정지·복구, 방 참여자 퇴장과 방 삭제를 할 수 있습니다. 예시 버튼은 이 페이지의 표시 상태만 바꿉니다.'}
  ];
  function activateStep(index, focus=false) {
    document.querySelectorAll('[data-step]').forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;if(i===index&&focus)button.focus();});
    document.querySelectorAll('[data-demo-pane]').forEach((pane,i)=>pane.hidden=i!==index);
    $('demo-title').textContent=steps[index].title;$('demo-description').textContent=steps[index].description;
    $('demo-room-label').textContent=index===3?'회원 및 방 관리':'Java 수업 · 코드 함께 읽기';
  }
  const tabs=[...document.querySelectorAll('[data-step]')];
  tabs.forEach((button,i)=>{button.addEventListener('click',()=>activateStep(i));button.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();activateStep(next,true);}});});
  function setPreset(button) {
    document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    $('preset-description').textContent=button.dataset.preset==='text'?'글자 프리셋 예시: 원본 해상도 · 30fps · 해상도 유지 우선':'움직임 프리셋 예시: 1080p · 60fps · H.264 우선';
  }
  document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>setPreset(button)));
  const roomForm=$('demo-room-form');
  function clearRoomResult(){['demo-room-code','demo-room-password'].forEach(id=>$(id).removeAttribute('aria-invalid'));$('room-result').textContent='예시 값으로 입장을 확인해 보세요.';$('room-next').hidden=true;}
  $('fill-room-example').addEventListener('click',()=>{$('demo-room-code').value='20261127ABCD';$('demo-room-password').value='demo123';clearRoomResult();});
  roomForm.addEventListener('input',clearRoomResult);
  roomForm.addEventListener('submit',event=>{event.preventDefault();const codeOk=$('demo-room-code').value.trim().toUpperCase()==='20261127ABCD',passwordOk=$('demo-room-password').value==='demo123';$('demo-room-code').setAttribute('aria-invalid',String(!codeOk));$('demo-room-password').setAttribute('aria-invalid',String(!passwordOk));$('room-result').textContent=codeOk&&passwordOk?'예시 방 입장을 확인했습니다. 코드 채팅도 살펴보세요.':'위의 예시 코드와 비밀번호를 확인해 주세요. 실제 계정 정보는 입력하지 마세요.';$('room-next').hidden=!(codeOk&&passwordOk);});
  $('room-next').addEventListener('click',()=>activateStep(1,true));
  const messages=$('demo-messages');let composing=false;
  $('demo-message').addEventListener('compositionstart',()=>{composing=true;});
  $('demo-message').addEventListener('compositionend',()=>{composing=false;});
  $('demo-message').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.isComposing||composing))event.preventDefault();});
  const initialMessages=[...messages.children].map(message=>message.cloneNode(true));
  $('demo-chat-form').addEventListener('submit',event=>{
    event.preventDefault();const input=$('demo-message'),text=input.value.trim();if(composing||!text)return;
    const message=document.createElement('div');message.className='message mine';const sender=document.createElement('span');sender.className='sender';sender.textContent='나 · 체험';message.append(sender,document.createTextNode(text));messages.append(message);
    while(messages.children.length>25)messages.firstElementChild.remove();
    input.value='';messages.scrollTop=messages.scrollHeight;input.focus();
  });
  $('reset-demo').addEventListener('click',()=>{messages.replaceChildren(...initialMessages.map(message=>message.cloneNode(true)));messages.scrollTop=0;$('demo-message').value='';composing=false;roomForm.reset();clearRoomResult();setPreset(document.querySelector('[data-preset=text]'));document.querySelectorAll('[data-suspend]').forEach(b=>{b.setAttribute('aria-pressed','false');b.textContent='이용 정지';});$('copy-code').textContent='예시 코드 복사';activateStep(0);$('demo-tabs').querySelector('[data-step]').focus();announce('체험을 처음 상태로 되돌렸습니다.');});
  document.querySelectorAll('[data-suspend]').forEach(button=>button.addEventListener('click',()=>{const paused=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'복구하기':'이용 정지';announce(paused?'예시 회원을 이용 정지 상태로 표시했습니다.':'예시 회원을 복구했습니다.');}));
  const routes={api:'계정·방·채팅과 SDP·ICE 연결 정보는 Java HTTPS 서버를 거칩니다. 브라우저는 응답 처리 후 약 1.8초마다 새 상태를 조회합니다.',video:'화면 영상은 공유자에서 시청자마다 WebRTC로 직접 전달합니다. 외부 STUN/TURN은 사용하지 않으며, 교실 PC 사이의 직접 통신이 필요합니다.'};
  document.querySelectorAll('[data-route-button]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-route-button]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('route-description').textContent=routes[button.dataset.routeButton];$('architecture-visual').dataset.route=button.dataset.routeButton;$('path-label').textContent=button.dataset.routeButton==='api'?'HTTPS API · 계정 / 채팅 / 연결 정보':'WebRTC P2P · 시청자별 직접 영상 전송';}));
  let toastTimer;function announce(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
  $('copy-code').addEventListener('click',async()=>{const code=$('pane-code').querySelector('pre'),text=code.textContent;try{await navigator.clipboard.writeText(text);announce('예시 코드를 복사했습니다.');}catch{const range=document.createRange();range.selectNodeContents(code);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);announce('복사 권한이 없어 코드를 선택했습니다. Ctrl+C 또는 길게 눌러 복사하세요.');}});
  window.matchMedia('(min-width:601px)').addEventListener('change',event=>{if(event.matches){menu.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','메뉴 열기');}});
  activateStep(0);
})();
