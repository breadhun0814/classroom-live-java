/* Classroom Live LAN: same-origin local SQLite server + WebRTC. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg = window.CLASSROOM_CONFIG || {};
  const tr = text => window.CL_I18N?.t(text) || String(text ?? '');
  const setUiElement = (element,text) => { if(window.CL_I18N)window.CL_I18N.set(element,text);else element.textContent=String(text); };
  const ui = (id,text) => setUiElement($(id),text);
  const ask = text => window.confirm(tr(text));
  const state = { db: null, user: null, room: null, client: sessionStorage.getItem('live-client') || crypto.randomUUID(), generation: 0, epoch: null, publisher: null, stream: null, peers: new Map(), pending: new Map(), message: 0, signal: 0, timer: null, polling: false, signup: false, watchAt: 0, ice: [], iceUntil: 0, pollFailures: 0, shareBusy: false };
  sessionStorage.setItem('live-client', state.client);
  const notice = (text, error = false) => { if (/Could not find|schema cache/.test(text) && /live_/.test(text)) text='교실 서버를 최신 버전으로 실행해 주세요.'; ui('notice',text); $('notice').classList.toggle('error', error); $('notice').hidden = !text; };
  function screen(name) { ['setup','auth','lobby','room','admin','profile'].forEach(id => { $(id).hidden = id !== name; }); }
  async function rpc(name, args = {}) {
    const { data, error } = await state.db.rpc(name, args);
    if (error) throw new Error(error.message || '서버 요청을 완료하지 못했습니다.');
    if (data?.error) throw new Error(data.error);
    return data;
  }
  function args() { return { p_room: state.room.id, p_client: state.client }; }
  const displayName = () => String(state.nickname || state.user?.user_metadata?.display_name || state.user?.email?.split('@')[0] || '참여자').slice(0,24);
  function bind(id, event, fn) {
    $(id).addEventListener(event, async e => {
      e.preventDefault(); const button = e.submitter || (e.currentTarget.tagName === 'BUTTON' ? e.currentTarget : null);
      if (button) button.disabled = true;
      try { await fn(e); } catch (error) { notice(error.message || '요청에 실패했습니다.', true); }
      finally { if (button) button.disabled = false; }
    });
  }
  function inviteCode() { return new URL(location.href).searchParams.get('room') || ''; }
  let directoryOffset = 0;
  let directoryRequest = 0;
  function updateJoinMethod(clear = true) {
    const byName = $('join-method').value === 'name'; const input = $('room-code');
    ui('join-target-label',byName ? '방 이름' : '초대 코드');
    input.maxLength = byName ? 60 : 12; input.placeholder = tr(byName ? '만들어진 방 이름을 입력하세요' : '12자리 초대 코드');
    if (byName) input.removeAttribute('pattern'); else input.pattern = '[A-Fa-f0-9]{12}';
    if (clear) { input.value = ''; $('join-password').value = ''; }
  }
  async function loadRooms(offset = 0) {
    if (!state.db || !state.user || state.room) return;
    const request = ++directoryRequest; const userId = state.user.id;
    try {
      const data = await rpc('live_list_rooms', { p_offset: offset });
      if (request !== directoryRequest || state.user?.id !== userId || state.room) return;
      directoryOffset = data.offset; const list = $('room-list'); list.replaceChildren();
      if (!data.rooms.length) { const empty = document.createElement('p'); empty.className = 'muted'; setUiElement(empty,'아직 만들어진 방이 없습니다. 첫 방을 만들어 보세요.'); list.append(empty); }
      for (const room of data.rooms) {
        const row = document.createElement('div'); row.className = 'room-row';
        const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = room.title;
        const detail = document.createElement('span'); detail.className = 'muted'; setUiElement(detail,`비밀번호 필요 · ${room.member_count}/8명${room.is_owner ? ' · 내가 만든 방' : ''}`);
        info.append(title,detail); const button = document.createElement('button'); setUiElement(button,'이 방 선택');
        button.addEventListener('click', () => {
          // A specific code also disambiguates legacy rooms with duplicate names.
          $('join-method').value = 'code'; updateJoinMethod(); $('room-code').value = room.code;
          $('join-password').focus(); notice(`「${room.title}」 방을 선택했습니다. 방 비밀번호를 입력해 주세요.`);
        });
        row.append(info,button); list.append(row);
      }
      ui('rooms-page',`전체 ${data.total}개 · ${Math.floor(data.offset/50)+1}페이지`);
      $('rooms-prev').disabled = data.offset === 0; $('rooms-next').disabled = !data.has_more;
    } catch (error) {
      if (request !== directoryRequest || state.user?.id !== userId || state.room) return;
      $('room-list').textContent = /live_list_rooms|schema cache|Could not find/i.test(error.message)
        ? '방 목록을 불러오지 못했습니다. 교실 서버 상태를 확인하세요.' : '방 목록을 불러오지 못했습니다. 목록 새로고침을 눌러 주세요.';
    }
  }
  async function updateAccount(user, preserveView=false) {
    const previousUserId=state.user?.id;
    const sameUser=!!user&&state.user?.id===user.id;
    if (user) {
      const access = await rpc('live_account_status');
      if (state.adminLogin && !access.is_admin) { await state.db.auth.signOut(); throw new Error('관리자 계정이 아닙니다. 일반 로그인으로 이용하세요.'); }
      state.isAdmin = !!access.is_admin; state.nickname = access.nickname;
    } else { state.isAdmin = false; state.nickname = ''; }
    state.user = user; $('account').textContent = user ? displayName() : ''; $('logout').hidden = !user;
    $('admin-button').hidden = !state.isAdmin; $('profile-button').hidden = !user;
    if (!user) {
      state.iceUntil=0;state.ice=[];
      directoryRequest++;adminRequest++;adminRoomsRequest++;adminMembersRequest++;
      for(const id of ['room-list','admin-users','admin-rooms','admin-room-members'])$(id).replaceChildren();
      try{for(const key of Object.keys(sessionStorage))if(previousUserId&&key.startsWith(`classroom-draft:${previousUserId}:`))sessionStorage.removeItem(key);}catch{}
      cleanup(); screen('auth'); return;
    }
    if(preserveView&&sameUser)return;
    if (state.adminLogin && state.isAdmin) { screen('admin'); await loadAdmin(); return; }
    if (!state.room && $('admin').hidden && $('profile').hidden) {
      screen('lobby'); const code = inviteCode();
      if (code && $('join-method').value === 'code' && !$('room-code').value) { updateJoinMethod(); $('room-code').value = code.toUpperCase().replace(/[^A-F0-9]/g,'').slice(0,12); }
      loadRooms();
    }
  }
  function closePeer(id) { const p = state.peers.get(id); if (p) { p.pc.onconnectionstatechange = null; p.pc.close(); } state.peers.delete(id); state.pending.delete(id); }
  const cachedMessages = new Map();
  let chatUnread = 0; let tabUnread = 0;
  const draftKey = () => state.user && state.room ? `classroom-draft:${state.user.id}:${state.room.id}` : null;
  function saveDraft() {
    const key=draftKey(); if (!key) return;
    try { if ($('chat-text').value) sessionStorage.setItem(key,JSON.stringify({text:$('chat-text').value,code:$('as-code').checked})); else sessionStorage.removeItem(key); ui('draft-status',$('chat-text').value?'초안 저장됨':''); } catch { ui('draft-status','초안을 저장하지 못했습니다.'); }
    ui('chat-count',`${$('chat-text').value.length} / 8000`);
  }
  function restoreDraft() {
    try { const draft=JSON.parse(sessionStorage.getItem(draftKey())||'null'); if (draft) { $('chat-text').value=String(draft.text||'').slice(0,8000); $('as-code').checked=!!draft.code; ui('draft-status','초안을 복원했습니다.'); } } catch {}
    ui('chat-count',`${$('chat-text').value.length} / 8000`);
  }
  function updateTabTitle() { document.title=`${tabUnread?'('+tabUnread+') ':''}${state.room?.title?state.room.title+' · ':''}Classroom Live`; }
  function updateUnread() { $('new-messages').hidden=!chatUnread; ui('new-messages',`새 메시지 ${chatUnread}개 · 아래로`); updateTabTitle(); }
  function stopTracks() { if (state.stream) for (const track of state.stream.getTracks()) { track.onended = null; track.stop(); } state.stream = null; }
  function clearVideo() { $('screen').srcObject = null; $('screen').style.width=''; $('screen').style.height=''; $('video-card').scrollTop=0; $('video-card').scrollLeft=0; $('screen').onloadeddata=null; $('screen').onplaying=null; showCaptureStats(); $('empty-screen').hidden = false; ui('video-status','공유 대기 중'); ui('quality-stats','실제 전송 품질은 화면 연결 후 표시됩니다.'); ui('fullscreen-stats',''); }
  function cleanup() {
    saveDraft(); cachedMessages.clear(); chatUnread=0; tabUnread=0; updateUnread();
    clearTimeout(state.timer); state.timer = null; state.generation++; state.polling = false; state.shareBusy = false;
    stopTracks(); for (const id of [...state.peers.keys()]) closePeer(id); state.pending.clear();
    state.room = null; state.epoch = null; state.publisher = null; state.message = 0; state.signal = 0; state.pollFailures = 0; state.watchAttempts = 0; state.watchPaused = false;
    sessionStorage.removeItem('live-room'); $('messages').replaceChildren(); $('members').replaceChildren(); clearVideo();
    $('chat-text').value=''; $('chat-search').value=''; $('as-code').checked=false; ui('draft-status',''); ui('chat-count','0 / 8000'); ui('chat-search-count',''); $('older-chat').disabled=false; updateTabTitle();
    $('share').hidden = false; $('stop').hidden = true; $('watch').hidden = true; $('resolution').disabled = false; $('fps').disabled = false; $('share-mode').disabled = false; for(const id of ['quality-level','video-codec','preset-text','preset-motion'])$(id).disabled=false; showCaptureStats();
  }
  async function enter(room) {
    cleanup(); state.room = { id: room.room_id, code: room.code }; sessionStorage.setItem('live-room', JSON.stringify(state.room));
    restoreDraft(); updateTabTitle();
    $('create-password').value = ''; $('join-password').value = ''; notice(''); screen('room');
    await poll(state.generation);
  }
  function filterChat() {
    const term=$('chat-search').value.trim().toLocaleLowerCase(); let count=0;
    for (const row of $('messages').children) { const m=cachedMessages.get(Number(row.dataset.id)); const match=!term||`${m?.display_name||''}\n${m?.body||''}`.toLocaleLowerCase().includes(term); row.hidden=!match; if(match)count++; }
    ui('chat-search-count',term?`검색 결과 ${count}개`:'');
  }
  function renderMessages(messages, prepend=false) {
    const panel = $('messages');
    const oldHeight=panel.scrollHeight; const oldTop=panel.scrollTop; const initial=!panel.children.length; let added=0;
    const follow = panel.children.length === 0 || panel.scrollHeight - panel.scrollTop - panel.clientHeight < 60;
    for (const m of messages) {
      if (cachedMessages.has(Number(m.id))) continue;
      cachedMessages.set(Number(m.id),m); added++;
      const wrap = document.createElement('div'); wrap.className = 'message'; wrap.dataset.id=m.id;
      const by = document.createElement('div'); by.className = 'by'; by.textContent = `${m.display_name} · ${new Date(m.created_at).toLocaleTimeString(window.CL_I18N?.language()||'ko', {hour:'2-digit',minute:'2-digit'})}`;
      const body = document.createElement(m.is_code ? 'pre' : 'div'); body.className = 'content'; body.textContent = m.body;
      const head=document.createElement('div'); head.className='message-head';
      const copy=actionButton(m.is_code?'코드 복사':'메시지 복사',async()=>{await navigator.clipboard.writeText(m.body);notice('복사했습니다.');});copy.className='message-copy';head.append(by,copy);
      wrap.append(head, body);
      if(prepend) { const after=[...panel.children].find(row=>Number(row.dataset.id)>Number(m.id)); panel.insertBefore(wrap,after||null); } else panel.append(wrap);
      state.message = Math.max(state.message,Number(m.id));
    }
    while (panel.children.length > 1000) { const old=panel.firstChild; cachedMessages.delete(Number(old.dataset.id));old.remove(); }
    filterChat();
    // Do not pull someone away from an older message they are reading.
    if (added && prepend) panel.scrollTop=oldTop+panel.scrollHeight-oldHeight;
    else if (added && follow) panel.scrollTop = panel.scrollHeight;
    else if(added&&!initial)chatUnread+=added;
    if(added&&!initial&&!prepend&&document.hidden)tabUnread+=added;
    updateUnread();
  }
  function refreshControls() {
    const ours = state.publisher === state.client && !!state.stream;
    $('share').hidden = ours; $('share').disabled = !!state.publisher && !ours;
    $('stop').hidden = !ours; $('watch').hidden = !state.publisher || ours;
    $('resolution').disabled = ours; $('fps').disabled = ours; $('share-mode').disabled = ours; for(const id of ['quality-level','video-codec','preset-text','preset-motion'])$(id).disabled=ours;
  }
  async function applyState(data, generation) {
    if (generation !== state.generation || !state.room || state.shareBusy) return;
    ui('connection-status','접속 중'); $('connection-status').classList.remove('offline');
    const changed = data.room.share_epoch !== state.epoch;
    state.room = data.room;
    if (changed) {
      for (const id of [...state.peers.keys()]) closePeer(id); state.pending.clear(); state.watchAt = 0;
      state.epoch = data.room.share_epoch; state.publisher = data.room.share_client; state.watchAttempts = 0; state.watchPaused = false;
      if (state.publisher !== state.client) { stopTracks(); clearVideo(); }
    } else state.publisher = data.room.share_client;
    // A reloaded sharing tab has no media consent: release the old claim.
    if (state.publisher === state.client && !state.stream && !state.shareBusy) {
      await rpc('live_share', { ...args(), p_start: false }); state.publisher = null;
    }
    $('room-name').textContent = data.room.title; $('room-code-label').textContent = `ROOM / ${data.room.code}`;
    $('close-room').hidden = data.room.owner_id !== state.user.id;
    ui('member-count',`(${data.members.length}/8)`); $('members').replaceChildren();
    const present = new Set(data.members.map(m => m.client_id));
    for (const id of [...state.peers.keys()]) if (!present.has(id)) closePeer(id);
    for (const m of data.members) {
      const el = document.createElement('span'); el.className = 'member' + (m.client_id === state.publisher ? ' sharing' : '');
      el.textContent = m.name + (m.client_id === state.client ? tr(' (나)') : '') + (m.client_id === state.publisher ? tr(' · 공유 중') : ''); $('members').append(el);
    }
    renderMessages(data.messages); refreshControls();
    for (const signal of data.signals) {
      if (generation !== state.generation) return;
      if (signal.epoch === state.epoch) {
        try { await receiveSignal(signal); } catch (error) { console.warn('화면 연결 재시도 필요:', error.message); state.watchAt = 0; }
      }
      state.signal = Math.max(state.signal, Number(signal.id));
    }
    await updateMediaStats();
    if (state.publisher && state.publisher !== state.client) {
      const peer = state.peers.get(state.publisher);
      const stuck = peer && Date.now() - peer.createdAt > 25000 && !peer.hasVideo;
      if (!state.watchPaused && (!peer || stuck || ['failed','closed','disconnected'].includes(peer.pc.connectionState)) && Date.now() - state.watchAt > 12000) {
        if ((state.watchAttempts || 0) >= 3) {
          state.watchPaused = true; ui('video-status','영상 연결 실패 · 화면 다시 연결을 눌러 주세요.');
          notice(cfg.useTurnFunction ? '화면 연결에 실패했습니다. 중계 서버 설정과 학교 네트워크 차단 여부를 확인하세요.' : '교실 PC 간 화면 연결에 실패했습니다. 두 PC의 Chrome을 새로고침하고 학교 담당자에게 PC 간 통신 차단 여부를 확인하세요.', true);
        } else await watch();
      }
    }
  }
  async function poll(generation) {
    if (generation !== state.generation || !state.room || state.polling) return;
    state.polling = true;
    const epochAtRequest = state.epoch;
    try {
      const data = await rpc('live_room_state', { ...args(), p_after_message: state.message, p_after_signal: state.signal });
      if (generation !== state.generation) return;
      if (state.pollFailures) notice('연결이 복구되었습니다.'); state.pollFailures = 0;
      // A share start/stop may have completed while this older request was in flight.
      if (epochAtRequest === state.epoch) await applyState(data, generation);
    } catch (error) {
      if (generation !== state.generation) return;
      ui('connection-status','재연결 중'); $('connection-status').classList.add('offline');
      state.pollFailures++;
      if (/이용 정지/.test(error.message)) { cleanup(); await state.db.auth.signOut(); await updateAccount(null); notice(error.message, true); return; }
      if (/만료|로그인|삭제/.test(error.message)) { cleanup(); screen('lobby'); notice(error.message, true); return; }
      notice('연결을 확인하고 자동으로 다시 연결하고 있어요. ' + error.message, true);
      if (state.pollFailures >= 20) { cleanup(); screen('lobby'); notice('연결이 오래 끊어져 방에서 나왔습니다. 다시 입장해 주세요.', true); return; }
    } finally {
      if (generation === state.generation) { state.polling = false; if (state.room) state.timer = setTimeout(() => poll(generation), state.pollFailures ? 4000 : 1800); }
    }
  }
  async function loadIce() { /* LAN: host candidates only, no cloud/STUN/TURN requests. */ }
  async function sendSignal(target, kind, payload, epoch = state.epoch, connectionId = state.peers.get(target)?.connectionId) {
    if (!state.room || !epoch) return;
    if (!connectionId) throw new Error('화면 연결 식별자가 없습니다. 다시 연결하세요.');
    await rpc('live_send_signal', { ...args(), p_target: target, p_epoch: epoch, p_kind: kind, p_payload: { connectionId, data: payload } });
  }
  function mediaProfile() {
    const source=state.stream?.getVideoTracks()[0]?.getSettings() || {};
    const native=$('resolution').value==='native';
    const height=native?Number(source.height||1080):Number($('resolution').value);
    const width=native?Number(source.width||1920):Math.round(height*(source.width&&source.height?source.width/source.height:16/9));
    const fps=Number($('fps').value),level=$('quality-level').value;
    const tier=width*height>2560*1600?3:width*height>1920*1200?2:width*height>1280*800?1:0;
    const rates={standard:[6,12,20,32],high:[10,20,32,50],max:[16,32,48,80]};
    const mbps=(rates[level]||rates.high)[tier]*(fps>30?1.5:1);
    return {native,width,height,fps,level,bitrate:mbps*1000000,text:$('share-mode').value!=='motion',codec:$('video-codec').value};
  }
  function showCaptureStats() {
    if(!state.stream){ui('capture-stats','공유자 설정입니다. 글씨 수업은 원본 해상도 · 30fps · 글자 선명도를 권장합니다.');return;}
    const source=state.stream.getVideoTracks()[0]?.getSettings()||{},p=mediaProfile();
    const viewers=[...state.peers.values()].filter(peer=>peer.pc.connectionState==='connected').length;
    let text=`원본 캡처 ${source.width||'?'}×${source.height||'?'} · 최대 ${p.fps} fps · 전송 상한 ${p.bitrate/1000000} Mbps/명`;
    if(viewers)text+=` · ${viewers}명 상한 합계 ${(p.bitrate/1000000*viewers).toFixed(0)} Mbps`;
    text+=' · 실제 전송량은 아래 통계에서 확인하세요.';
    if(state.captureWarning)text+=' · 브라우저가 캡처 설정 일부를 적용하지 못했습니다.';
    if(source.height<p.height||source.width<p.width)text+=' · 원본이 목표 해상도보다 작습니다. 더 크게 선택해도 원본 글씨가 늘어나지는 않습니다.';
    if(Number(source.width)*Number(source.height)>2560*1600)text+=' · 큰 원본은 PC 부하가 높습니다. 끊기면 1440p 또는 1080p로 낮춰 보세요.';
    ui('capture-stats',text);
  }
  async function prepareCapture(stream) {
    const track=stream.getVideoTracks()[0];if(!track)throw new Error('공유할 영상 트랙이 없습니다.');
    state.captureWarning=false;const p=mediaProfile();track.contentHint=p.text?'text':'motion';if(p.text&&track.contentHint!=='text')track.contentHint='detail';
    if(typeof track.applyConstraints==='function'){
      const constraints={frameRate:{ideal:p.fps,max:p.fps}};
      const capabilities=track.getCapabilities?.()||{};
      if(p.native){
        // Capture the selected surface's own dimensions; never assume a 16:9 source.
        if(capabilities.width?.max>0)constraints.width={ideal:capabilities.width.max};
        if(capabilities.height?.max>0)constraints.height={ideal:capabilities.height.max};
        if(navigator.mediaDevices.getSupportedConstraints?.().resizeMode)constraints.resizeMode={ideal:'none'};
      }else constraints.height={ideal:p.height,max:p.height};
      try{await track.applyConstraints(constraints);}
      catch{state.captureWarning=true;notice('브라우저가 원본 캡처 설정 일부를 적용하지 못했습니다. 실제 캡처 해상도를 확인하세요.',true);}
    }
  }
  function preferCodec(peer) {
    const mode=mediaProfile().codec;if(mode==='auto')return;
    const receive=window.RTCRtpReceiver?.getCapabilities?.('video')?.codecs;
    const send=window.RTCRtpSender?.getCapabilities?.('video')?.codecs;
    if(!receive||!send)return;
    const preferred=mode==='h264'?'video/h264':'video/vp9';
    const codecs=receive.filter(c=>send.some(s=>s.mimeType.toLowerCase()===c.mimeType.toLowerCase()&&s.clockRate===c.clockRate));
    if(!codecs.some(c=>c.mimeType.toLowerCase()===preferred)){notice('선택한 코덱을 지원하지 않아 자동 코덱으로 연결합니다.');return;}
    const rank=c=>c.mimeType.toLowerCase()===preferred?0:/\/(rtx|red|ulpfec)$/i.test(c.mimeType)?2:1;
    const ordered=[...codecs].sort((a,b)=>rank(a)-rank(b));
    for(const transceiver of peer.pc.getTransceivers?.()||[]){
      if(transceiver.sender?.track?.kind!=='video'||!transceiver.setCodecPreferences)continue;
      try{transceiver.setCodecPreferences(ordered);}catch{notice('코덱 우선순위를 적용하지 못해 자동으로 연결합니다.');}
    }
  }
  let nativeView=false;
  function sizeVideo() {
    const video=$('screen'),card=$('video-card');card.classList.toggle('native-size',nativeView);
    if(nativeView){const source=state.stream?.getVideoTracks()[0]?.getSettings()||{};
      const w=video.videoWidth||source.width,h=video.videoHeight||source.height;
      const ratio=window.devicePixelRatio||1;
      video.style.width=w?`${w/ratio}px`:'100%';video.style.height=h?`${h/ratio}px`:'100%';
    }else{video.style.width='';video.style.height='';}
    $('native-size').setAttribute('aria-pressed',String(nativeView));ui('native-size',nativeView?'화면에 맞춰 보기':'원본 크기로 보기');
  }
  async function configureSender(peer) {
    // Apply after the remote answer: negotiated encodings and transactionId are now valid.
    const sender = peer.pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;
    const profile = mediaProfile();
    const makeParameters = () => {
      const p = sender.getParameters();
      if (!p.encodings?.length) throw new Error('브라우저에서 영상 인코딩 설정을 제공하지 않습니다.');
      for (const encoding of p.encodings) {
        encoding.maxBitrate = profile.bitrate; encoding.maxFramerate = profile.fps; encoding.scaleResolutionDownBy = 1;
      }
      return p;
    };
    try {
      const p = makeParameters(); p.degradationPreference = profile.text ? 'maintain-resolution' : 'maintain-framerate';
      await sender.setParameters(p); peer.qualityConfigured = true;
    } catch (error) {
      // Some browsers reject degradationPreference; keep the standard encoding limits.
      try { await sender.setParameters(makeParameters()); peer.qualityConfigured = true; }
      catch (fallbackError) { peer.qualityConfigured = false; console.warn('전송 품질 설정 실패:', fallbackError.message); notice('브라우저가 고화질 전송 설정을 적용하지 못했습니다. Chrome/Edge를 업데이트하고 다시 공유해 주세요.', true); }
    }
  }
  async function updateMediaStats() {
    if (!state.publisher) return;
    showCaptureStats();sizeVideo();
    const ours = state.publisher === state.client; const generation = state.generation; const epoch = state.epoch;
    const peers = [...state.peers.values()];
    if (!peers.length) { if (ours) ui('quality-stats','원본 미리보기입니다. 시청자가 연결되면 실제 송신 품질을 표시합니다.'); return; }
    const samples = (await Promise.all(peers.map(async peer => {
      if (typeof peer.pc.getStats !== 'function') return [];
      try {
        const reports = await peer.pc.getStats(); const result = []; peer.previousStats ||= new Map();
        const transport=[...reports.values()].find(r=>r.type==='transport'&&r.selectedCandidatePairId);
        const pair=transport?reports.get(transport.selectedCandidatePairId):[...reports.values()].find(r=>r.type==='candidate-pair'&&r.nominated&&r.state==='succeeded');
        const local=pair&&reports.get(pair.localCandidateId);const remote=pair&&reports.get(pair.remoteCandidateId);
        const route=local?.candidateType==='relay'||remote?.candidateType==='relay'?'relay':local?.candidateType&&remote?.candidateType?'direct':'unknown';
        peer.route=route;
        for (const report of reports.values()) {
          if (report.type !== (ours ? 'outbound-rtp' : 'inbound-rtp') || (report.kind || report.mediaType) !== 'video' || report.isRemote) continue;
          const codec = reports.get(report.codecId); if (/\/(rtx|red|ulpfec)$/i.test(codec?.mimeType || '')) continue;
          const width = Number(report.frameWidth || 0), height = Number(report.frameHeight || 0);
          if (!width || !height) continue;
          const previous = peer.previousStats.get(report.id); const bytes = Number((ours ? report.bytesSent : report.bytesReceived) || 0);
          const frames = Number((ours ? report.framesEncoded : report.framesDecoded) || 0); const elapsed = previous ? (report.timestamp - previous.timestamp) / 1000 : 0;
          if (!ours && frames > 0) { peer.hasVideo = true; state.watchAttempts = 0; }
          const bitrate = elapsed > 0 && bytes >= previous.bytes ? (bytes - previous.bytes) * 8 / elapsed / 1000000 : null;
          const fps = report.framesPerSecond ?? (elapsed > 0 && frames >= previous.frames ? (frames - previous.frames) / elapsed : null);
          const emitted = report.jitterBufferEmittedCount; const delay = report.jitterBufferDelay;
          const emittedDelta = previous && emitted != null && previous.emitted != null ? emitted - previous.emitted : 0;
          const bufferMs = emittedDelta > 0 && delay >= previous.delay ? (delay - previous.delay) / emittedDelta * 1000 : null;
          peer.previousStats.set(report.id, { bytes, frames, timestamp: report.timestamp, emitted, delay });
          result.push({ width, height, fps, bitrate, reason: report.qualityLimitationReason, codec: codec?.mimeType?.split('/')[1], bufferMs, drops: report.framesDropped, freezes: report.freezeCount, route });
        }
        return result;
      } catch { return []; }
    }))).flat();
    if (generation !== state.generation || epoch !== state.epoch || !state.room) return;
    if (!samples.length) { ui('quality-stats','실제 영상 전송 통계를 기다리고 있어요…'); return; }
    const sample = samples.sort((a,b) => a.width*a.height-b.width*b.height)[0];
    const fps = sample.fps == null ? 'fps 측정 중' : `${Math.round(sample.fps)} fps`;
    const bitrate = sample.bitrate == null ? '전송량 측정 중' : `${sample.bitrate.toFixed(1)} Mbps`;
    let text = `${ours ? '실제 송신' : '실제 수신'} ${sample.width}×${sample.height} · ${fps} · ${bitrate}${sample.codec ? ' · '+sample.codec : ''}`;
    if (ours) text += ` · 시청 ${samples.length}명${samples.length>1 ? ' (가장 낮은 해상도 기준)' : ''}`;
    if(ours)text+=` · 직접 ${samples.filter(s=>s.route==='direct').length}명 / 중계 ${samples.filter(s=>s.route==='relay').length}명 / 확인 중 ${samples.filter(s=>s.route==='unknown').length}명`;
    else text+=` · 연결: ${sample.route==='relay'?'중계':sample.route==='direct'?'직접':'확인 중'}`;
    if (!ours && sample.bufferMs != null) text += ` · 수신 버퍼 ${Math.round(sample.bufferMs)}ms`;
    if (!ours && sample.drops != null) text += ` · 누적 프레임 누락 ${sample.drops}`;
    if (!ours && sample.freezes != null) text += ` · 누적 멈춤 ${sample.freezes}회`;
    if (!ours && sample.bufferMs > 500) text += ' · 영상이 지연되고 있어요. 화면 다시 연결을 누르거나 공유 프레임을 낮춰 보세요.';
    if (sample.reason === 'bandwidth') text += ' · 네트워크 속도로 품질이 제한되고 있어요.';
    if (sample.reason === 'cpu') text += ' · 공유 PC의 처리 성능으로 품질이 제한되고 있어요.';
    if (ours && state.stream?.getVideoTracks()[0]?.getSettings().height < mediaProfile().height) text += ' · 원본 캡처가 선택한 해상도보다 작아요.';
    if (samples.some(s => s.height < mediaProfile().height) && ours) text += ' · 실제 전송 해상도가 목표보다 낮습니다.';
    ui('quality-stats',text);
    ui('fullscreen-stats',text);
  }
  function newPeer(id, connectionId = crypto.randomUUID()) {
    closePeer(id);
    const epoch = state.epoch; const generation = state.generation;
    const pc = new RTCPeerConnection({ iceServers: state.ice }); const peer = { pc, epoch, connectionId, createdAt: Date.now(), pendingIce: [], hasVideo: false, candidatesSent:0,candidatesReceived:0, queue: Promise.resolve() }; state.peers.set(id, peer);
    pc.onicecandidate = e => {
      if (e.candidate && generation === state.generation && epoch === state.epoch && state.peers.get(id) === peer) {
        peer.queue = peer.queue.then(async () => {if(state.peers.get(id) === peer){await sendSignal(id, 'ice', e.candidate.toJSON(), epoch, connectionId);peer.candidatesSent++;}}).catch(error => {peer.lastError=`candidate-send:${error.name||'Error'}`;console.warn(error.message);});
      }
    };
    pc.ontrack = e => {
      if (generation !== state.generation || epoch !== state.epoch || state.peers.get(id) !== peer) return;
      const incoming=e.streams[0] || new MediaStream([e.track]); $('screen').srcObject = incoming;
      const ready=()=>{if(generation===state.generation&&epoch===state.epoch&&state.peers.get(id)===peer&&$('screen').srcObject===incoming){peer.hasVideo=true;state.watchAttempts=0;$('empty-screen').hidden=true;ui('video-status','실시간 화면 연결됨');}};
      $('screen').onloadeddata=ready;$('screen').onplaying=ready;
      $('screen').play().catch(() => notice('동영상의 재생 버튼을 눌러 주세요.'));
    };
    pc.onconnectionstatechange = () => {
      if (generation !== state.generation || state.peers.get(id) !== peer) return;
      if (state.publisher !== state.client) {
        ui('video-status',pc.connectionState === 'connected' ? peer.hasVideo?'실시간 화면 연결됨':'연결됨 · 영상 수신 대기' : '화면 연결 중 · ' + pc.connectionState);
        if (pc.connectionState === 'failed') notice('화면 연결을 다시 시도합니다. 계속 실패하면 운영자의 TURN 중계 설정이 필요할 수 있습니다.', true);
      }
    };
    return peer;
  }
  async function drainIce(id, pc) {
    const peer = state.peers.get(id);
    if (!peer || peer.pc !== pc) return;
    while (peer.pendingIce.length) {await pc.addIceCandidate(peer.pendingIce.shift());peer.candidatesReceived++;}
  }
  async function receiveSignal(s) {
    const envelope = s.payload;
    if (!envelope || typeof envelope.connectionId !== 'string' || !envelope.data) {
      if (!state.oldClientNotice) { state.oldClientNotice = true; notice('공유하는 사람과 보는 사람 모두 Ctrl+Shift+R로 새로고침해 주세요.'); }
      return;
    }
    const connectionId = envelope.connectionId; const payload = envelope.data;
    if (s.kind === 'watch' && state.publisher === state.client && state.stream) {
      const old = state.peers.get(s.sender);
      if (old?.connectionId === connectionId) return;
      const peer = newPeer(s.sender, connectionId); const pc = peer.pc;
      for (const track of state.stream.getTracks()) pc.addTrack(track, state.stream);
      preferCodec(peer);
      await pc.setLocalDescription(await pc.createOffer());
      await sendSignal(s.sender, 'offer', { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
    } else if (s.kind === 'offer' && s.sender === state.publisher && state.publisher !== state.client) {
      const peer = state.peers.get(s.sender);
      if (!peer || peer.connectionId !== connectionId || peer.pc.remoteDescription) return;
      const { pc } = peer; await pc.setRemoteDescription(payload); await drainIce(s.sender, pc);
      await pc.setLocalDescription(await pc.createAnswer());
      await sendSignal(s.sender, 'answer', { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
    } else if (s.kind === 'answer' && state.publisher === state.client) {
      const peer = state.peers.get(s.sender); if (peer?.connectionId === connectionId && peer.pc.signalingState === 'have-local-offer') { await peer.pc.setRemoteDescription(payload); await drainIce(s.sender, peer.pc); await configureSender(peer); }
    } else if (s.kind === 'ice') {
      const peer = state.peers.get(s.sender);
      if (!peer || peer.connectionId !== connectionId) return;
      if (peer.pc.remoteDescription) {await peer.pc.addIceCandidate(payload);peer.candidatesReceived++;}
      else if (peer.pendingIce.length < 100) peer.pendingIce.push(payload);
    }
  }
  async function watch() {
    if (!state.publisher || state.publisher === state.client) return;
    const generation = state.generation; const publisher = state.publisher; state.watchAt = Date.now();
    await loadIce(); if (generation !== state.generation || publisher !== state.publisher) return;
    clearVideo(); const peer = newPeer(publisher); state.watchAttempts = (state.watchAttempts || 0) + 1;
    ui('video-status','공유 화면에 연결하고 있어요…'); await sendSignal(publisher, 'watch', {}, state.epoch, peer.connectionId);
  }
  async function share() {
    if (!state.room || state.publisher || state.shareBusy) return;
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('이 브라우저는 화면 공유를 지원하지 않습니다. PC의 Chrome 또는 Edge에서 열어 주세요.');
    const generation = state.generation; const roomArgs = args(); state.shareBusy = true; let stream; let claimed = false;
    try {
      // The picker must open in the click handler before awaiting a network call.
      const p=mediaProfile();const video={frameRate:{ideal:p.fps,max:p.fps}};
      if(!p.native)video.height={ideal:p.height,max:p.height};
      stream = await navigator.mediaDevices.getDisplayMedia({video,audio:false});
      if (generation !== state.generation) { stream.getTracks().forEach(t => t.stop()); return; }
      await prepareCapture(stream);
      if (generation !== state.generation) { stream.getTracks().forEach(t=>t.stop()); return; }
      await loadIce(); const result = await rpc('live_share', { ...roomArgs, p_start: true }); claimed = true;
      if (generation !== state.generation) { await rpc('live_share', { ...roomArgs, p_start: false }); stream.getTracks().forEach(t=>t.stop()); return; }
      for (const id of [...state.peers.keys()]) closePeer(id);
      state.stream = stream; state.epoch = result.epoch; state.publisher = state.client;
      const track = stream.getVideoTracks()[0];
      track.contentHint = mediaProfile().text ? 'text' : 'motion';
      if (mediaProfile().text && track.contentHint !== 'text') track.contentHint = 'detail';
      track.onended = () => stopSharing().catch(error => notice(error.message, true));
      $('screen').srcObject = stream; $('empty-screen').hidden = true; $('screen').play().catch(() => {});
      const settings = track.getSettings(); ui('video-status',`내 공유 화면 · ${settings.width || '?'}×${settings.height || '?'} · ${Math.round(settings.frameRate || 0)} fps (캡처)`);
      showCaptureStats();sizeVideo();notice('화면 공유를 시작했습니다. 방에 있는 다른 사람들이 볼 수 있습니다.'); refreshControls();
    } catch (error) {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (claimed) await rpc('live_share', { ...roomArgs, p_start: false }).catch(() => {});
      if (error.name !== 'NotAllowedError') throw error;
      notice('화면 선택을 취소했거나 공유 권한을 허용하지 않았습니다.');
    } finally { state.shareBusy = false; }
  }
  async function stopSharing() {
    stopTracks(); for (const id of [...state.peers.keys()]) closePeer(id); clearVideo();
    try { if (state.room) await rpc('live_share', { ...args(), p_start: false }); }
    finally { state.publisher = null; state.epoch = null; refreshControls(); }
  }
  async function leave() {
    if (!state.room) return;
    const old = args(); cleanup(); screen('lobby');
    await rpc('live_leave_room', old).catch(() => {});
    await loadRooms();
  }
  let adminOffset = 0; let adminRoomOffset = 0; let adminRequest = 0; let adminRoomsRequest = 0; let adminMembersRequest=0;
  function dateLabel(value) { return value ? new Date(value).toLocaleString(window.CL_I18N?.language() || 'ko') : '—'; }
  function actionButton(text, handler, danger = false) {
    const button = document.createElement('button'); setUiElement(button,text); if (danger) button.className = 'danger';
    button.addEventListener('click', async () => { button.disabled = true; try { await handler(); } catch (error) { notice(error.message,true); } finally { button.disabled = false; } });
    return button;
  }
  async function loadAdminUsers(offset = 0) {
    if (!state.isAdmin) return;
    const request = ++adminRequest;
    const data = await rpc('live_admin_list_users',{p_offset:offset,p_search:$('admin-search').value.trim()});
    if (request !== adminRequest || !state.isAdmin) return;
    adminOffset = data.offset; delete $('admin-users').dataset.uiText; $('admin-users').replaceChildren();
    for (const user of data.users) {
      const row = document.createElement('div'); row.className = 'admin-user-row';
      const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = user.nickname;
      const email = document.createElement('div'); email.textContent = user.email || '—';
      const meta = document.createElement('div'); meta.className = 'muted'; setUiElement(meta,`가입: ${dateLabel(user.created_at)} · 최근 로그인: ${dateLabel(user.last_sign_in_at)}`);
      const badge = document.createElement('span'); badge.className = 'status-badge'; setUiElement(badge,user.is_admin ? '관리자' : user.suspended ? '이용 정지' : '정상');
      info.append(name,email,meta,badge); row.append(info);
      if (!user.is_admin) row.append(actionButton(user.suspended ? '이용 정지 해제' : '이용 정지',async () => {
        if (!ask(`${user.email} 계정의 이용 상태를 변경할까요?`)) return;
        await rpc('live_admin_set_suspension',{p_user:user.id,p_suspended:!user.suspended});
        await loadAdminUsers(adminOffset); await loadAdminRooms(adminRoomOffset); $('admin-members-panel').hidden = true;
        notice(user.suspended ? '이용 정지를 해제했습니다.' : '이용 정지했습니다. 해당 회원은 현재 방에서도 퇴장됩니다.');
      },!user.suspended));
      $('admin-users').append(row);
    }
    if (!data.users.length) ui('admin-users','검색 결과가 없습니다.');
    ui('admin-page',`전체 ${data.total}명 · ${Math.floor(data.offset/50)+1}페이지`);
    $('admin-prev').disabled = data.offset===0; $('admin-next').disabled = !data.has_more;
  }
  async function loadAdminMembers(room) {
    const request=++adminMembersRequest;
    const users = await rpc('live_admin_room_members',{p_room:room.id});
    if (!state.isAdmin||request!==adminMembersRequest) return;
    ui('admin-members-title',`방 참여 회원: ${room.title}`);
    delete $('admin-room-members').dataset.uiText; $('admin-room-members').replaceChildren(); $('admin-members-panel').hidden = false;
    for (const user of users) {
      const row = document.createElement('div'); row.className = 'admin-user-row';
      const name = document.createElement('div'); setUiElement(name,`${user.nickname} · ${user.email} · ${user.connections}개 접속`); row.append(name);
      if (!user.is_admin) row.append(actionButton('강제 퇴장',async () => {
        if (!ask(`${user.email} 회원을 이 방에서 퇴장시킬까요?`)) return;
        await rpc('live_admin_kick',{p_room:room.id,p_user:user.user_id}); await loadAdminMembers(room); await loadAdminRooms(adminRoomOffset); notice('회원의 모든 해당 방 접속을 종료했습니다.');
      },true));
      $('admin-room-members').append(row);
    }
    if (!users.length) ui('admin-room-members','현재 접속한 회원이 없습니다.');
  }
  async function loadAdminRooms(offset = 0) {
    if (!state.isAdmin) return;
    const request = ++adminRoomsRequest; const data = await rpc('live_list_rooms',{p_offset:offset});
    if (request!==adminRoomsRequest || !state.isAdmin) return;
    adminRoomOffset = data.offset; delete $('admin-rooms').dataset.uiText; $('admin-rooms').replaceChildren();
    for (const room of data.rooms) {
      const row = document.createElement('div'); row.className = 'room-row'; const info = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = room.title; const meta = document.createElement('span'); meta.className = 'muted'; setUiElement(meta,`${room.code} · ${room.member_count}/8명`);
      info.append(title,meta); const buttons = document.createElement('div'); buttons.className = 'actions';
      buttons.append(actionButton('참여 회원 보기',()=>loadAdminMembers(room)),actionButton('방 삭제',async () => {
        if (!ask(`「${room.title}」 방과 대화 기록을 삭제할까요?`)) return;
        await rpc('live_admin_delete_room',{p_room:room.id}); $('admin-members-panel').hidden=true; await loadAdminRooms(adminRoomOffset); notice('방을 삭제했습니다.');
      },true)); row.append(info,buttons); $('admin-rooms').append(row);
    }
    if (!data.rooms.length) ui('admin-rooms','만들어진 방이 없습니다.');
    ui('admin-rooms-page',`전체 ${data.total}개 · ${Math.floor(data.offset/50)+1}페이지`);
    $('admin-rooms-prev').disabled=data.offset===0; $('admin-rooms-next').disabled=!data.has_more;
  }
  async function loadAdmin() { await Promise.all([loadAdminUsers(),loadAdminRooms()]); }
  function renderAuthMode() {
    ui('auth-title',state.adminLogin ? '관리자 로그인' : state.signup ? '회원가입' : '로그인');
    ui('auth-description',state.adminLogin ? '운영자로 지정한 본인 계정으로 로그인하세요.' : '나만의 계정으로 시작하세요.');
    ui('auth-submit',state.signup ? '계정 만들기' : '로그인'); $('name-label').hidden = !state.signup;
    $('display-name').required = !!state.signup; $('password').autocomplete = state.signup ? 'new-password' : 'current-password';
    $('auth-toggle').hidden = !!state.adminLogin; ui('auth-toggle',state.signup ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입');
    ui('admin-login-toggle',state.adminLogin ? '일반 로그인으로 돌아가기' : '관리자 로그인');
  }
  bind('admin-login-toggle','click',async () => { state.adminLogin=!state.adminLogin; state.signup=false; renderAuthMode(); notice(''); });
  bind('admin-button','click',async () => { if (state.room) await leave(); state.adminLogin=true; screen('admin'); await loadAdmin(); });
  bind('admin-back','click',async () => { state.adminLogin=false; screen('lobby'); await loadRooms(); });
  bind('admin-search-form','submit',async () => loadAdminUsers());
  bind('admin-refresh-rooms','click',async () => loadAdminRooms());
  $('admin-prev').addEventListener('click',()=>loadAdminUsers(Math.max(0,adminOffset-50)).catch(e=>notice(e.message,true)));
  $('admin-next').addEventListener('click',()=>loadAdminUsers(adminOffset+50).catch(e=>notice(e.message,true)));
  $('admin-rooms-prev').addEventListener('click',()=>loadAdminRooms(Math.max(0,adminRoomOffset-50)).catch(e=>notice(e.message,true)));
  $('admin-rooms-next').addEventListener('click',()=>loadAdminRooms(adminRoomOffset+50).catch(e=>notice(e.message,true)));
  bind('profile-button','click',async () => { $('profile-nickname').value=displayName(); screen('profile'); });
  const backFromProfile = () => { screen(state.room?'room':state.adminLogin?'admin':'lobby'); if (!state.room&&!state.adminLogin) loadRooms(); };
  bind('profile-back','click',async () => backFromProfile());
  bind('profile-form','submit',async () => {
    const result=await rpc('live_set_nickname',{p_nickname:$('profile-nickname').value}); state.nickname=result.nickname; $('account').textContent=displayName(); backFromProfile(); notice('닉네임을 저장했습니다.');
  });
  bind('auth-toggle', 'click', async () => {
    state.signup = !state.signup; renderAuthMode(); notice('');
  });
  bind('auth-form','submit', async () => {
    const email = $('email').value.trim(); const password = $('password').value;
    if (state.signup) {
      const { data, error } = await state.db.auth.signUp({ email, password, options: { data: { display_name: $('display-name').value.trim().slice(0,24) }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error; $('password').value = '';
      if (data.session) { state.signup=false; renderAuthMode(); await updateAccount(data.user); notice('가입되었습니다. 새 방을 만들거나 초대받은 방으로 들어가세요.'); }
      else notice('가입 확인 메일을 확인해 주세요. 메일의 링크를 누른 후 로그인하면 됩니다.');
    } else {
      const { data, error } = await state.db.auth.signInWithPassword({ email, password }); if (error) throw error;
      $('password').value = ''; notice(''); await updateAccount(data.user);
    }
  });
  bind('logout','click', async () => { await leave(); const { error } = await state.db.auth.signOut(); if (error) throw error; state.adminLogin=false; await updateAccount(null); renderAuthMode(); notice('로그아웃했습니다.'); });
  bind('create-form','submit', async () => enter(await rpc('live_create_room', { p_title: $('room-title').value.trim(), p_password: $('create-password').value, p_name: displayName(), p_client: state.client })));
  $('join-method').addEventListener('change', () => updateJoinMethod());
  bind('refresh-rooms','click', async () => loadRooms());
  $('rooms-prev').addEventListener('click', () => loadRooms(Math.max(0,directoryOffset-50)));
  $('rooms-next').addEventListener('click', () => loadRooms(directoryOffset+50));
  bind('join-form','submit', async () => {
    const byName = $('join-method').value === 'name';
    await enter(await rpc(byName ? 'live_join_room_by_name' : 'live_join_room', {
      [byName ? 'p_room_name' : 'p_code']: $('room-code').value.trim(), p_password: $('join-password').value, p_name: displayName(), p_client: state.client,
    }));
  });
  bind('leave','click', async()=>{if((state.stream||$('chat-text').value.trim())&&!ask('화면 공유 또는 작성 중인 메시지가 있습니다. 방에서 나갈까요?'))return;await leave();}); bind('share','click', share); bind('stop','click', stopSharing); bind('watch','click',async () => { state.watchPaused=false; state.watchAttempts=0; await watch(); });
  bind('close-room','click', async () => { if (!ask('이 방과 대화 기록을 삭제할까요? 모든 참여자가 나가게 됩니다.')) return; await rpc('live_close_room', { p_room: state.room.id }); cleanup(); screen('lobby'); await loadRooms(); notice('방을 삭제했습니다.'); });
  bind('copy-link','click', async () => { const url = new URL(location.href); url.search = ''; url.hash = ''; url.searchParams.set('room',state.room.code); await navigator.clipboard.writeText(url.href); notice('초대 링크를 복사했습니다. 방 비밀번호는 별도로 알려 주세요.'); });
  bind('native-size','click',async()=>{nativeView=!nativeView;sizeVideo();});
  $('screen').addEventListener('loadedmetadata',sizeVideo);
  window.addEventListener('resize',sizeVideo);
  bind('preset-text','click',async()=>{$('resolution').value='native';$('fps').value='30';$('share-mode').value='text';$('quality-level').value='high';$('video-codec').value='auto';notice('원본 해상도 · 글자 선명도 · 고화질 · 30fps로 설정했습니다.');});
  bind('preset-motion','click',async()=>{$('resolution').value='1080';$('fps').value='60';$('share-mode').value='motion';$('quality-level').value='high';$('video-codec').value='h264';notice('1080p · 움직임 우선 · 고화질 · 60fps로 설정했습니다. 실제 성능에 따라 달라집니다.');});
  bind('fullscreen','click', async () => { if ($('video-card').requestFullscreen) await $('video-card').requestFullscreen(); });
  bind('exit-fullscreen','click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
  function connectionReport(){
    return {version:'java-lan3',role:state.stream?'presenter':state.publisher?'viewer':'waiting',online:navigator.onLine,relayConfigured:!!cfg.useTurnFunction,connectionIssue:state.connectionIssue||null,oldClientDetected:!!state.oldClientNotice,
      capture:state.stream?.getVideoTracks()[0]?.getSettings()?(()=>{const s=state.stream.getVideoTracks()[0].getSettings();return {width:s.width,height:s.height,frameRate:s.frameRate,displaySurface:s.displaySurface};})():null,
      requested:state.stream?mediaProfile():null,
      browser:(navigator.userAgent.match(/(?:Edg|Chrome|Firefox|Version)\/[\d.]+/g)||[]).join(' '),
      video:{readyState:$('screen').readyState,width:$('screen').videoWidth,height:$('screen').videoHeight,paused:$('screen').paused},
      connections:[...state.peers.values()].map((peer,index)=>({number:index+1,connectionTag:peer.connectionId.slice(0,8),state:peer.pc.connectionState,ice:peer.pc.iceConnectionState,signaling:peer.pc.signalingState,gathering:peer.pc.iceGatheringState,localSdp:peer.pc.localDescription?.type||null,remoteSdp:peer.pc.remoteDescription?.type||null,candidatesSent:peer.candidatesSent,candidatesReceived:peer.candidatesReceived,queuedCandidates:peer.pendingIce.length,receivedVideo:peer.hasVideo,route:peer.route||'unknown',error:peer.lastError||null,qualityConfigured:!!peer.qualityConfigured})),
      statistics:$('quality-stats').textContent};
  }
  function renderConnectionHelp(){
    const report=connectionReport();const hints=[];
    if(!report.online)hints.push('교실 네트워크 연결이 끊겨 있습니다. 네트워크를 연결한 뒤 화면 다시 연결을 누르세요.');
    if(report.oldClientDetected)hints.push('참여자 간 코드 버전이 다릅니다. 공유자와 시청자 모두 Ctrl+Shift+R을 누르세요.');
    if(report.connectionIssue==='relay-config')hints.push('중계 설정을 불러오지 못했습니다. 운영자가 Supabase의 ice-config 배포와 Secrets 설정을 확인해야 합니다.');
    if(report.role==='waiting')hints.push('현재 방에서 화면 공유가 시작되지 않았습니다. 공유자가 화면 공유 시작을 눌러 화면을 선택해야 합니다.');
    if(report.role==='presenter'&&!report.connections.length)hints.push('아직 시청 연결 요청이 없습니다. 시청자가 같은 방에 들어와 화면 다시 연결을 눌러 주세요.');
    if(report.connections.some(p=>!p.localSdp||!p.remoteSdp))hints.push('화면 연결 정보 교환이 아직 완료되지 않았습니다. 두 PC를 새로고침한 뒤 공유를 다시 시작해 보세요.');
    if(report.connections.some(p=>p.localSdp&&p.remoteSdp&&!p.receivedVideo&&['new','checking','failed','disconnected'].includes(p.ice||p.state)))hints.push('연결 정보는 있지만 영상 통신 경로가 아직 연결되지 않았습니다. 학교 담당자에게 브라우저 통신 허용과 PC 간 연결 차단 여부를 확인하세요.');
    if(report.role==='viewer'&&report.connections.some(p=>p.state==='connected'&&!p.receivedVideo))hints.push('연결은 됐지만 영상 프레임을 받지 못했습니다. 재생 다시 시도를 누르고, 공유자는 공유할 화면이 정상인지 확인한 뒤 다시 공유하세요.');
    if(report.role==='viewer'&&report.video.paused)hints.push('재생이 일시 정지되어 있습니다. 재생 다시 시도 버튼을 누르세요.');
    if(report.role==='viewer'&&report.connections.some(p=>p.receivedVideo))hints.push('영상 프레임을 받은 기록은 있습니다. 화면이 흐리거나 멈추면 실제 송수신 해상도와 네트워크·PC 성능 제한 표시를 확인하세요.');
    if(!hints.length)hints.push('현재 정보만으로 원인을 확정할 수 없습니다. 아래 순서로 확인하고 양쪽 PC의 연결 진단을 복사해 주세요.');
    $('connection-hints').replaceChildren();for(const text of hints){const p=document.createElement('p');setUiElement(p,text);$('connection-hints').append(p);}
    $('help-reconnect').hidden=report.role!=='viewer';$('help-play').hidden=report.role!=='viewer';
  }
  bind('copy-diagnostics','click',async()=>{
    const report=connectionReport();
    await navigator.clipboard.writeText(JSON.stringify(report,null,2));notice('연결 진단을 복사했습니다. 공유하는 PC와 안 보이는 PC에서 각각 복사해 알려 주세요. 이메일·비밀번호·키·IP 주소는 포함하지 않습니다.');
  });
  bind('show-connection-help','click',async()=>{$('connection-help').open=true;renderConnectionHelp();});
  $('connection-help').addEventListener('toggle',()=>{if($('connection-help').open)renderConnectionHelp();});
  bind('help-recheck','click',async()=>renderConnectionHelp());
  bind('help-play','click',async()=>{await $('screen').play();notice('재생을 다시 요청했습니다. 계속 보이지 않으면 화면 다시 연결을 눌러 주세요.');});
  bind('help-reconnect','click',async()=>{state.watchPaused=false;state.watchAttempts=0;await watch();renderConnectionHelp();});
  $('chat-text').addEventListener('input',saveDraft); $('as-code').addEventListener('change',saveDraft);
  $('chat-search').addEventListener('input',filterChat);
  $('messages').addEventListener('scroll',()=>{const panel=$('messages');if(panel.scrollHeight-panel.scrollTop-panel.clientHeight<60){chatUnread=0;updateUnread();}});
  bind('new-messages','click',async()=>{$('messages').scrollTop=$('messages').scrollHeight;chatUnread=0;updateUnread();});
  $('chat-font').addEventListener('change',()=>{const size=['13','15','18'].includes($('chat-font').value)?$('chat-font').value:'15';$('messages').style.setProperty('--chat-font-size',size+'px');try{localStorage.setItem('classroom-font',size);}catch{}});
  try{const size=localStorage.getItem('classroom-font');if(['13','15','18'].includes(size)){$('chat-font').value=size;$('messages').style.setProperty('--chat-font-size',size+'px');}}catch{}
  bind('older-chat','click',async()=>{
    const generation=state.generation;const before=cachedMessages.size?Math.min(...cachedMessages.keys()):Number.MAX_SAFE_INTEGER;
    const data=await rpc('live_chat_history',{...args(),p_before:before});if(generation!==state.generation)return;
    renderMessages(data,true);if(!data.length)notice('더 이전 대화가 없습니다.');
  });
  bind('export-chat','click',async()=>{
    const text=[state.room.title,'Classroom Live',...Array.from(cachedMessages.values()).sort((a,b)=>Number(a.id)-Number(b.id)).map(m=>`[${dateLabel(m.created_at)}] ${m.display_name}\n${m.body}\n`)].join('\n');
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`classroom-${state.room.code}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('불러온 대화를 TXT 파일로 저장했습니다.');
  });
  bind('shortcuts','click',async()=>{$('shortcuts-dialog').showModal();});bind('close-shortcuts','click',async()=>{$('shortcuts-dialog').close();});
  document.addEventListener('keydown',event=>{if(!state.room||$('room').hidden)return;if(event.ctrlKey&&event.key.toLowerCase()==='k'){event.preventDefault();$('chat-search').focus();}else if(event.altKey&&event.key.toLowerCase()==='m'){event.preventDefault();$('chat-text').focus();}else if(event.key==='Escape'&&document.activeElement===$('chat-search')){$('chat-search').value='';filterChat();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tabUnread=0;updateTabTitle();}});
  $('room-code').addEventListener('paste',event=>{if($('join-method').value!=='code')return;const text=event.clipboardData?.getData('text')||'';try{const code=new URL(text.trim()).searchParams.get('room');if(/^[A-Fa-f0-9]{12}$/.test(code||'')){event.preventDefault();$('room-code').value=code.toUpperCase();}}catch{}});
  let composingChat = false;
  let sendingChat = false;
  $('chat-text').addEventListener('compositionstart', () => { composingChat = true; });
  $('chat-text').addEventListener('compositionend', () => { composingChat = false; });
  $('chat-text').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || composingChat || event.keyCode === 229) return;
    event.preventDefault();
    if (!event.repeat && !sendingChat) $('chat-form').requestSubmit();
  });
  bind('chat-form','submit', async () => {
    const draft = $('chat-text').value;
    if (sendingChat || !draft.trim()) return;
    const code = $('as-code').checked;
    const generation=state.generation;
    sendingChat = true;
    const button = $('chat-form').querySelector('button'); button.disabled = true;
    try {
      await rpc('live_send_message', { ...args(), p_body: code ? draft : draft.trim(), p_is_code: code });
      if(generation!==state.generation)return;
      // Keep anything the user started typing while this request was in flight.
      if ($('chat-text').value === draft) $('chat-text').value = '';
      saveDraft();
      notice('');
    } finally { sendingChat = false; button.disabled = false; }
  });
  window.addEventListener('offline', () => { ui('connection-status','오프라인');$('connection-status').classList.add('offline');notice('교실 네트워크 연결이 끊겼습니다. 연결되면 자동으로 다시 시도합니다.', true); });
  window.addEventListener('online',()=>{notice('교실 네트워크 연결이 돌아왔습니다. 다시 연결하고 있어요.');if(state.room&&!state.polling){clearTimeout(state.timer);poll(state.generation);}});
  window.addEventListener('beforeunload',event=>{saveDraft();if(state.stream||$('chat-text').value.trim()){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide', () => { stopTracks(); for (const id of [...state.peers.keys()]) closePeer(id); });
  async function init() {
    if (!window.isSecureContext) { screen('setup'); notice('화면 공유를 위해 HTTPS와 교실 인증서 등록이 필요합니다. 접속 도움말을 확인하세요.',true); return; }
    state.db = window.CLASSROOM_LOCAL;
    const { data, error } = await state.db.auth.getSession(); if (error) throw error;
    const saved = sessionStorage.getItem('live-room'); await updateAccount(data.session?.user || null);
    const authUpdate = async user => { try { await updateAccount(user,true); } catch(error) { cleanup(); await state.db.auth.signOut(); await updateAccount(null); notice(error.message,true); } };
    state.db.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_OUT') setTimeout(() => authUpdate(null), 0); else if (session?.user) setTimeout(() => authUpdate(session.user), 0); });
    if (saved && state.user) { try { const room = JSON.parse(saved); if (room.id) await enter({ room_id: room.id, code: room.code }); } catch { cleanup(); screen('lobby'); } }
    if (!cfg.useTurnFunction) ui('quality-note','원본 해상도는 선택한 화면의 실제 크기를 사용합니다. 전송 품질은 공유 PC에서 설정하세요. 상한을 높여도 실제 속도·화질은 PC와 네트워크에 따라 달라집니다.');
  }
  window.addEventListener('classroom-language',()=>{renderAuthMode();updateJoinMethod(false);updateUnread();filterChat();if(state.room)updateMediaStats();else if(!$('admin').hidden&&state.isAdmin)loadAdmin().catch(e=>notice(e.message,true));else if(!$('lobby').hidden&&state.user)loadRooms();});
  init().catch(error => { screen('auth'); notice(error.message, true); });
})();
