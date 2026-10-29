(() => {
  'use strict';
  const words = {"Classroom Live · 교실 서버":"Classroom Live \u00b7 Classroom server","Classroom Live LAN · 교실 안에서 함께":"Classroom Live LAN \u00b7 Together in the classroom","교실 전용 · 계정과 채팅은 교실 서버에 저장됩니다. 화면은 녹화하지 않습니다.":"Classroom LAN \u00b7 Accounts and chats stay on the classroom server. Screens are not recorded.","아이디 또는 비밀번호가 올바르지 않습니다.":"Incorrect user ID or password.","이미 사용 중인 아이디입니다.":"That user ID is already in use.","로그인이 필요합니다. 다시 로그인하세요.":"Please sign in again.","현재 회원가입이 닫혀 있습니다. 관리자에게 문의하세요.":"Registration is closed. Contact the administrator.","로그인 시도가 너무 많습니다. 5분 후 다시 시도하세요.":"Too many sign-in attempts. Try again in five minutes.","시도가 너무 많습니다. 5분 후 다시 시도하세요.":"Too many attempts. Try again in five minutes.","아이디는 영문·숫자·_.@+-로 3~80자 입력하세요.":"Use 3\u201380 letters, digits or _.@+- for the user ID.","방 이름·코드 또는 방 비밀번호가 올바르지 않습니다.":"Incorrect room name, code or password.","관리자 계정은 정지하거나 퇴장시킬 수 없습니다.":"The administrator cannot be suspended or removed.","계정당 최대 10개 방을 만들 수 있습니다.":"Each account can create up to ten rooms.","서버 연결 또는 저장 오류입니다. 서버 PC의 저장 공간과 권한을 확인하세요.":"Server connection or storage error. Check disk space and permissions on the server.","교실 네트워크 연결이 끊겼습니다. 연결되면 자동으로 다시 시도합니다.":"You are offline. We will retry when the connection returns.","교실 네트워크 연결이 돌아왔습니다. 다시 연결하고 있어요.":"You are back online. Reconnecting\u2026","글자나 코드 공유는 글자 선명도 우선, 1080p, 30fps부터 확인하세요.":"For text or code, start with text clarity mode, 1080p, and 30fps.","화면 공유를 위해 HTTPS와 교실 인증서 등록이 필요합니다. 접속 도움말을 확인하세요.":"HTTPS and the classroom certificate are required for screen sharing. Open Connection help.","로그인과 비밀번호 방을 사용할 수 있는 화면은 준비되었습니다. 교실 서버를 실행하고 이 주소로 접속하세요.":"Start the classroom server and open this address.","교실 서버를 최신 버전으로 실행해 주세요.":"Update and restart the classroom server.","방 목록을 불러오지 못했습니다. 교실 서버 상태를 확인하세요.":"Could not load rooms. Check the classroom server.","원본 해상도 (추천)":"Original resolution (recommended)","전송 품질":"Send quality","고화질 (유선 추천)":"High (wired LAN recommended)","기본 / 부하 줄이기":"Standard / lower load","최고 화질 / 높은 부하":"Maximum / high load","영상 코덱":"Video codec","자동 (추천)":"Automatic (recommended)","H.264 / 호환성":"H.264 / compatibility","VP9 / 선명도 비교":"VP9 / compare clarity","수업 글씨 선명하게":"Clear classroom text","영상 부드럽게":"Smooth video","원본 크기로 보기":"View original size","화면에 맞춰 보기":"Fit to screen","공유자 설정입니다. 글씨 수업은 원본 해상도 · 30fps · 글자 선명도를 권장합니다.":"Presenter settings: for text, use original resolution, 30fps and text clarity mode.","원본 해상도는 선택한 화면의 실제 크기를 사용합니다. 전송 품질은 공유 PC에서 설정하세요. 상한을 높여도 실제 속도·화질은 PC와 네트워크에 따라 달라집니다.":"Original resolution uses the selected surface dimensions. Configure send quality on the presenting PC. Higher limits do not guarantee bitrate or quality; results depend on hardware and networking.","브라우저가 원본 캡처 설정 일부를 적용하지 못했습니다. 실제 캡처 해상도를 확인하세요.":"The browser could not apply some capture settings. Check actual capture resolution.","선택한 코덱을 지원하지 않아 자동 코덱으로 연결합니다.":"The selected codec is unavailable; using automatic codec selection.","코덱 우선순위를 적용하지 못해 자동으로 연결합니다.":"Codec preference could not be applied; using automatic selection.","원본 해상도 · 글자 선명도 · 고화질 · 30fps로 설정했습니다.":"Selected original resolution, text clarity, high quality and 30fps.","1080p · 움직임 우선 · 고화질 · 60fps로 설정했습니다. 실제 성능에 따라 달라집니다.":"Selected 1080p, motion priority, high quality and 60fps. Actual performance varies."," · 실제 전송량은 아래 통계에서 확인하세요.":" \u00b7 See actual bitrate in the statistics below."," · 브라우저가 캡처 설정 일부를 적용하지 못했습니다.":" \u00b7 Some capture settings could not be applied."," · 원본이 목표 해상도보다 작습니다. 더 크게 선택해도 원본 글씨가 늘어나지는 않습니다.":" \u00b7 The source is smaller than the target. A larger selection cannot add source detail."," · 큰 원본은 PC 부하가 높습니다. 끊기면 1440p 또는 1080p로 낮춰 보세요.":" \u00b7 Large sources require more processing. If video stutters, try 1440p or 1080p.","아이디":"User ID","아이디 또는 닉네임 검색":"Search user ID or nickname","교실 서버를 실행하고 이 주소로 접속하세요.":"Start the classroom server and open this address.","교실 전용 · 계정과 채팅은 교실 서버에 저장됩니다. 화면은 녹화하지 않습니다. ":"Classroom LAN \u00b7 Accounts and chats stay on the classroom server. Screens are not recorded. ","접속 도움말":"Connection help","이 버전은 교실 내부망 전용입니다. 화면만 안 보이면 PC 간 통신 차단 여부를 학교 담당자에게 확인하세요.":"This version is for the classroom LAN. If video alone fails, ask your school administrator to check peer connectivity.","선택한 화질과 프레임은 목표값이며, 화면 해상도·PC·네트워크에 따라 달라집니다. 교실 내부망에서 컴퓨터끼리 직접 화면을 전달합니다.":"Resolution and FPS are targets; actual results depend on the screen, computers and network. Video is sent directly between classroom computers.","교실 PC 간 화면 연결에 실패했습니다. 두 PC의 Chrome을 새로고침하고 학교 담당자에게 PC 간 통신 차단 여부를 확인하세요.":"The classroom video connection failed. Refresh Chrome on both PCs and ask the school administrator to check device isolation.","연결 정보는 있지만 영상 통신 경로가 아직 연결되지 않았습니다. 학교 담당자에게 브라우저 통신 허용과 PC 간 연결 차단 여부를 확인하세요.":"Negotiation exists but video is not connected. Ask your school administrator to check browser access and device isolation.",
    '중계 설정을 불러오지 못했습니다. 운영자가 Supabase의 ice-config 배포와 Secrets 설정을 확인해야 합니다.':'Could not load relay settings. The operator must check the ice-config deployment and Secrets in Supabase.',
    "연결 문제 해결":"Troubleshoot connection",
    "화면이 안 보일 때 해결 방법":"How to fix a missing shared screen",
    "재생 다시 시도":"Retry playback",
    "상태 다시 확인":"Recheck status",
    "공유자와 시청자 모두 PC의 Chrome 또는 Edge를 사용하고 Ctrl+Shift+R로 새로고침하세요.":"Use desktop Chrome or Edge on both computers and refresh with Ctrl+Shift+R.",
    "공유자는 공유 중지를 누른 뒤 화면 공유 시작을 다시 누르고, 실제 공유할 화면을 선택하세요.":"The presenter should stop sharing, start again, and choose the intended screen.",
    "글자나 코드 공유는 글자 선명도 우선, 1080p, 30fps부터 확인하세요.":"For text or code, start with text clarity mode, 1080p, and 30fps.",
    "같은 장소여도 PC 간 통신이 차단될 수 있습니다. 학교 담당자에게 브라우저 통신 허용과 PC 간 연결 차단 여부를 확인하세요. 방화벽 전체를 끌 필요는 없습니다.":"Computers in the same location may still be isolated. Ask the school network administrator to check browser access and device isolation. Do not disable the entire firewall.",
    "서로 다른 인터넷망에서 직접 연결이 실패하면 TURN 중계를 설정해야 할 수 있습니다.":"If direct connections fail across networks, a TURN relay may be required.",
    "해결되지 않으면 공유자와 안 보이는 PC에서 각각 연결 진단 복사를 눌러 결과를 알려 주세요.":"If the problem persists, copy diagnostics from both the presenter and the affected viewer.",
    "인터넷 연결이 끊겨 있습니다. 네트워크를 연결한 뒤 화면 다시 연결을 누르세요.":"You are offline. Reconnect to the network, then click Reconnect video.",
    "참여자 간 코드 버전이 다릅니다. 공유자와 시청자 모두 Ctrl+Shift+R을 누르세요.":"Some participants have an older app version. Everyone must refresh with Ctrl+Shift+R.",
    "현재 방에서 화면 공유가 시작되지 않았습니다. 공유자가 화면 공유 시작을 눌러 화면을 선택해야 합니다.":"No screen is being shared. The presenter must start sharing and choose a screen.",
    "아직 시청 연결 요청이 없습니다. 시청자가 같은 방에 들어와 화면 다시 연결을 눌러 주세요.":"No viewer connection has been requested yet. Join the same room and click Reconnect video.",
    "화면 연결 정보 교환이 아직 완료되지 않았습니다. 두 PC를 새로고침한 뒤 공유를 다시 시작해 보세요.":"Video negotiation is incomplete. Refresh both computers, then restart sharing.",
    "연결 정보는 있지만 영상 통신 경로가 아직 연결되지 않았습니다. PC별 방화벽이나 학교 네트워크 분리를 확인하고, 필요한 경우 TURN 중계를 연결하세요.":"Negotiation exists but the video path is not connected. Check per-PC firewalls and device isolation, and configure TURN if needed.",
    "연결은 됐지만 영상 프레임을 받지 못했습니다. 재생 다시 시도를 누르고, 공유자는 공유할 화면이 정상인지 확인한 뒤 다시 공유하세요.":"Connected, but no video frames have arrived. Retry playback and ask the presenter to verify the source and restart sharing.",
    "재생이 일시 정지되어 있습니다. 재생 다시 시도 버튼을 누르세요.":"Playback is paused. Click Retry playback.",
    "영상 프레임을 받은 기록은 있습니다. 화면이 흐리거나 멈추면 실제 송수신 해상도와 네트워크·PC 성능 제한 표시를 확인하세요.":"Video frames have arrived. If the image is blurry or frozen, check actual resolution and bandwidth/CPU limitations.",
    "현재 정보만으로 원인을 확정할 수 없습니다. 아래 순서로 확인하고 양쪽 PC의 연결 진단을 복사해 주세요.":"The available information does not identify the cause. Follow the steps below and copy diagnostics from both computers.",
    "재생을 다시 요청했습니다. 계속 보이지 않으면 화면 다시 연결을 눌러 주세요.":"Playback was requested again. If the screen remains blank, reconnect the video.",

    '연결 진단 복사':'Copy connection diagnostics',
    '연결 진단을 복사했습니다. 공유하는 PC와 안 보이는 PC에서 각각 복사해 알려 주세요. 이메일·비밀번호·키·IP 주소는 포함하지 않습니다.':'Diagnostics copied. Copy the report from both presenter and affected viewer. No emails, passwords, keys, or IP addresses are included.',
    '언어 / Language':'Language',
    'Classroom Live · 함께 보는 공간':'Classroom Live · Share your screen',
    'Classroom Live · 내 화면을 함께 보는 공간':'Classroom Live · A space to share your screen',
    '관리자 기능을 사용하려면 Supabase에서 update-admin.sql을 실행해 주세요.':'The operator must run update-admin.sql in Supabase before this version can be used.',
    '예전에 만들어진 같은 이름의 방이 여러 개 있습니다. 목록에서 방을 선택하거나 초대 코드를 사용하세요.':'Several older rooms have the same name. Select one from the list or use its invitation code.',
    '관리자 연결 필요':'Service setup required','서비스를 연결하고 있어요.':'The service is being connected.',
    '로그인과 비밀번호 방을 사용할 수 있는 화면은 준비되었습니다. 운영자가 Supabase 프로젝트를 연결하면 이용할 수 있습니다.':'The app is ready. The operator needs to connect a Supabase project before you can sign in and use protected rooms.',
    '운영자 설정 순서 보기':'View setup instructions','설치 없이, 함께':'TOGETHER, WITHOUT INSTALLING',
    '내 화면에서':'From my screen,','우리의 공간으로.':'to our shared space.',
    '비밀번호가 있는 방에서 화면을 공유하고':'Share your screen in a password-protected room',
    '이야기를 나누세요.':'and start a conversation.','화면 공유':'Screen sharing','비밀번호 방':'Protected rooms',
    '로그인':'Sign in','회원가입':'Sign up','이메일':'Email','비밀번호':'Password','표시 이름':'Display name',
    '닉네임':'Nickname','닉네임 설정':'Nickname settings','한글과 영어 모두 사용할 수 있습니다.':'You can use Korean, English, and other languages.',
    '나만의 계정으로 시작하세요.':'Get started with your own account.','계정이 없나요? 회원가입':'New here? Create an account',
    '이미 계정이 있나요? 로그인':'Already have an account? Sign in','계정 만들기':'Create account',
    '관리자 로그인':'Admin sign in','일반 로그인으로 돌아가기':'Back to regular sign in',
    '운영자로 지정한 본인 계정으로 로그인하세요.':'Sign in with the account designated as the operator.',
    '로그아웃':'Sign out','회원 관리':'Manage members','회원 및 방 관리':'Members and rooms',
    '관리자 권한으로 회원 이용 상태와 방을 관리합니다.':'Manage account access and rooms with your admin account.',
    '채팅 사이트로 돌아가기':'Back to chat','가입한 회원':'Registered members','이메일 또는 닉네임 검색':'Search email or nickname',
    '검색 / 새로고침':'Search / refresh','모든 방 관리':'Manage all rooms','방 새로고침':'Refresh rooms',
    '방 참여 회원':'Room participants','저장':'Save','돌아가기':'Back','이전':'Previous','다음':'Next',
    '함께할 방을 열어 보세요.':'Open a room to get together.','방 링크와 비밀번호는 초대할 사람에게 알려 주세요.':'Share the room link and password with your guests.',
    '새 방 만들기':'Create a room','방 이름':'Room name','방 비밀번호':'Room password','방 만들기':'Create room',
    '초대받은 방에 입장':'Join a room','입장 방법':'Join using','초대 코드로 입장':'Invitation code','방 이름으로 입장':'Room name',
    '초대 코드':'Invitation code','방 들어가기':'Join room','만들어진 방':'Available rooms',
    '방을 선택한 뒤 비밀번호를 입력하세요.':'Select a room, then enter its password.','목록 새로고침':'Refresh list',
    '한 방에 최대 8명(공유자 포함) · 한 번에 한 명이 화면 공유 · 일반 PC의 Chrome / Edge 권장':'Up to 8 connections including the presenter · One presenter at a time · Desktop Chrome / Edge recommended',
    '초대 링크 복사':'Copy invitation link','나가기':'Leave','방 삭제':'Delete room','함께 볼 화면을 기다리고 있어요.':'Waiting for a shared screen.',
    '아래에서 화면 공유를 시작해 보세요.':'Start sharing your screen below.','공유 대기 중':'Waiting for a presenter',
    '공유 모드':'Sharing mode','글자 선명도 우선':'Prioritize text clarity','동영상 / 움직임 우선':'Prioritize motion',
    '화질':'Resolution','프레임':'Frame rate','화면 공유 시작':'Share screen','공유 중지':'Stop sharing',
    '화면 다시 연결':'Reconnect video','전체 화면':'Full screen','전체 화면 닫기':'Exit full screen',
    '실제 전송 품질은 화면 연결 후 표시됩니다.':'Actual transmission quality appears after a viewer connects.',
    '선택한 화질과 프레임은 목표값이며, 화면 해상도·PC·네트워크에 따라 달라집니다.':'Resolution and frame rate are targets. Actual quality depends on the source, computer, and network.',
    '함께 있는 사람':'Participants','대화':'Chat','메시지 또는 코드':'Message or code','코드로 보내기':'Send as code','보내기':'Send',
    '대화 검색':'Search chat','글자 크기':'Text size','작게':'Small','보통':'Normal','크게':'Large','대화 저장':'Export chat',
    '단축키':'Shortcuts','채팅 단축키':'Chat shortcuts','이전 대화 불러오기':'Load earlier messages','새 메시지':'New messages',
    '대화 기록':'Chat history','닫기':'Close','Enter: 전송':'Enter: Send','Shift+Enter: 줄바꿈':'Shift+Enter: New line',
    'Ctrl+K: 대화 검색':'Ctrl+K: Search chat','Alt+M: 메시지 입력':'Alt+M: Focus message box','Escape: 검색 지우기':'Escape: Clear search',
    '연결 확인 중':'Checking connection','접속 중':'Connected','재연결 중':'Reconnecting','오프라인':'Offline',
    '8자 이상':'At least 8 characters','6자 이상':'At least 6 characters','우리 반 스터디':'Study group',
    '12자리 방 코드':'12-character room code','12자리 초대 코드':'12-character invitation code',
    '예: 장훈 / Janghun / student_01':'e.g. Janghun / student_01',
    '메시지나 코드 입력 · Enter 전송 / Shift+Enter 줄바꿈':'Message or code · Enter to send / Shift+Enter for a new line',
    '만들어진 방 이름을 입력하세요':'Enter the exact room name','아직 만들어진 방이 없습니다. 첫 방을 만들어 보세요.':'No rooms yet. Create the first one.',
    '이 방 선택':'Select room','방 목록을 불러오지 못했습니다. 목록 새로고침을 눌러 주세요.':'Could not load rooms. Click Refresh list.',
    '방 목록을 사용하려면 운영자가 Supabase에서 update-room-entry.sql을 실행해야 합니다.':'The operator must run the latest Supabase update SQL before room lists can be used.',
    '관리자':'Admin','이용 정지':'Suspended','정상':'Active','이용 정지 해제':'Restore access','강제 퇴장':'Remove from room',
    '참여 회원 보기':'View participants','현재 접속한 회원이 없습니다.':'No members are currently connected.',
    '검색 결과가 없습니다.':'No matching members.','만들어진 방이 없습니다.':'There are no rooms.',
    '이용 정지를 해제했습니다.':'Access has been restored.',
    '이용 정지했습니다. 해당 회원은 현재 방에서도 퇴장됩니다.':'The account is suspended and is being removed from its current rooms.',
    '회원의 모든 해당 방 접속을 종료했습니다.':'All of this member’s connections to the room have been removed.',
    '닉네임을 저장했습니다.':'Your nickname has been saved.','더 이전 대화가 없습니다.':'There are no earlier messages.',
    '메시지 복사':'Copy message','코드 복사':'Copy code','복사했습니다.':'Copied.',
    '불러온 대화를 TXT 파일로 저장했습니다.':'The loaded messages have been exported as a TXT file.',
    '초안 저장됨':'Draft saved','초안을 복원했습니다.':'Draft restored.','초안을 저장하지 못했습니다.':'Could not save the draft.',
    '인터넷 연결이 끊겼습니다. 연결되면 자동으로 다시 시도합니다.':'You are offline. We will retry when the connection returns.',
    '인터넷 연결이 돌아왔습니다. 다시 연결하고 있어요.':'You are back online. Reconnecting…',
    '화면 공유 또는 작성 중인 메시지가 있습니다. 방에서 나갈까요?':'You are sharing or have an unsent draft. Leave this room?',
    '방을 삭제했습니다.':'The room was deleted.',
    '이 방과 대화 기록을 삭제할까요? 모든 참여자가 나가게 됩니다.':'Delete this room and its chat history? All participants will be removed.',
    '초대 링크를 복사했습니다. 방 비밀번호는 별도로 알려 주세요.':'Invitation link copied. Share the room password separately.',
    '가입되었습니다. 새 방을 만들거나 초대받은 방으로 들어가세요.':'Your account is ready. Create or join a room.',
    '가입 확인 메일을 확인해 주세요. 메일의 링크를 누른 후 로그인하면 됩니다.':'Check your confirmation email. Follow the link, then sign in.',
    '로그아웃했습니다.':'You have signed out.','서버 요청을 완료하지 못했습니다.':'The server request could not be completed.',
    '요청에 실패했습니다.':'The request failed.','관리자 계정이 아닙니다. 일반 로그인으로 이용하세요.':'This is not an admin account. Use regular sign in.',
    '관리자만 사용할 수 있습니다.':'Only an administrator can use this action.','로그인이 필요합니다.':'Please sign in.',
    '이용 정지된 계정입니다. 관리자에게 문의하세요.':'This account is suspended. Contact the administrator.',
    '관리자 계정은 이용 정지할 수 없습니다.':'Admin accounts cannot be suspended.',
    '관리자 계정은 강제 퇴장할 수 없습니다.':'Admin accounts cannot be removed by this action.',
    '방 접속이 만료되었습니다. 비밀번호를 입력해 다시 입장하세요.':'Your room access has expired or you were removed. Enter the password to rejoin.',
    '이미 사용 중인 방 이름입니다. 다른 이름을 입력하세요.':'That room name is already in use. Choose another name.',
    '방 이름 또는 방 비밀번호가 올바르지 않습니다.':'Incorrect room name or password.',
    '방 코드 또는 방 비밀번호가 올바르지 않습니다.':'Incorrect invitation code or room password.',
    '입장 시도가 너무 많습니다. 5분 후 다시 시도하세요.':'Too many join attempts. Try again in five minutes.',
    '방이 가득 찼습니다. 최대 8명까지 입장할 수 있습니다.':'The room is full. It allows up to eight connections.',
    '방을 만든 사람만 삭제할 수 있습니다.':'Only the room owner can delete this room.',
    '이미 삭제된 방입니다.':'This room has already been deleted.','회원을 찾을 수 없습니다.':'Member not found.',
    '다른 사람이 공유 중입니다. 공유가 끝난 후 시작하세요.':'Someone else is sharing. Wait until they stop.',
    '종료된 화면 공유입니다.':'This screen-sharing session has ended.','상대방이 방을 나갔습니다.':'The other person has left the room.',
    '닉네임은 한글·영어 등 1~24자로 입력하세요.':'Enter a nickname of 1–24 characters. Korean and English are supported.',
    '방 이름은 1~60자로 입력하세요.':'Enter a room name of 1–60 characters.',
    '방 비밀번호는 6~64자, UTF-8 72바이트 이하여야 합니다.':'Room passwords must be 6–64 characters and at most 72 UTF-8 bytes.',
    '표시 이름을 확인하세요.':'Check your display name.','다른 접속에서 사용 중인 ID입니다.':'This connection ID is already in use.',
    '메시지는 분당 30개까지 보낼 수 있습니다.':'You can send up to 30 messages per minute.',
    '잘못된 키입니다. 공개용 Publishable key만 사용하세요.':'Invalid configuration. Use a public Publishable key.',
    '공개용 anon key 또는 Publishable key가 필요합니다.':'A public anon or Publishable key is required.',
    '로그인 라이브러리를 불러오지 못했습니다. 새로고침하거나 학교 네트워크의 CDN 차단 여부를 확인해 주세요.':'Could not load sign-in support. Refresh the page or check whether the network blocks the CDN.',
    '브라우저가 고화질 전송 설정을 적용하지 못했습니다. Chrome/Edge를 업데이트하고 다시 공유해 주세요.':'The browser could not apply the quality settings. Update Chrome/Edge and share again.',
    '브라우저에서 영상 인코딩 설정을 제공하지 않습니다.':'The browser did not provide video encoding settings.',
    '이 브라우저는 화면 공유를 지원하지 않습니다. PC의 Chrome 또는 Edge에서 열어 주세요.':'This browser cannot share a screen. Use desktop Chrome or Edge.',
    '동영상의 재생 버튼을 눌러 주세요.':'Press the video play button.',
    '화면 공유를 시작했습니다. 방에 있는 다른 사람들이 볼 수 있습니다.':'Screen sharing started. Other people in this room can watch.',
    '화면 선택을 취소했거나 공유 권한을 허용하지 않았습니다.':'Screen selection was canceled or sharing permission was denied.',
    '공유하는 사람과 보는 사람 모두 Ctrl+Shift+R로 새로고침해 주세요.':'Both presenter and viewers must refresh with Ctrl+Shift+R.',
    '연결이 복구되었습니다.':'Connection restored.',
    '연결이 오래 끊어져 방에서 나왔습니다. 다시 입장해 주세요.':'The connection was lost for too long. Please rejoin the room.',
    '영상 연결 실패 · 화면 다시 연결을 눌러 주세요.':'Video connection failed · Click Reconnect video',
    '직접 화면 연결에 실패했습니다. 다른 인터넷망에서는 TURN 중계 서버 연결이 필요할 수 있습니다. 운영자 설정 안내의 TURN 단계를 확인하세요.':'Direct video connection failed. Different networks may require a TURN relay. See the TURN setup instructions.',
    '화면 연결에 실패했습니다. 중계 서버 설정과 학교 네트워크 차단 여부를 확인하세요.':'Video connection failed. Check the relay settings and network restrictions.',
    '화면 연결을 다시 시도합니다. 계속 실패하면 운영자의 TURN 중계 설정이 필요할 수 있습니다.':'Retrying video. If it keeps failing, the operator may need to configure a TURN relay.',
    '화면 중계 서버 연결 실패. 운영자가 ice-config 설정을 확인해야 합니다.':'Could not configure the video relay. The operator must check ice-config.',
    '화면 연결 식별자가 없습니다. 다시 연결하세요.':'The connection identifier is missing. Reconnect the video.',
    '연결됨 · 영상 수신 대기':'Connected · Waiting for video frames',
    '실시간 화면 연결됨':'Live video connected','공유 화면에 연결하고 있어요…':'Connecting to the shared screen…',
    '원본 미리보기입니다. 시청자가 연결되면 실제 송신 품질을 표시합니다.':'This is your local preview. Actual sending statistics appear when a viewer connects.',
    '실제 영상 전송 통계를 기다리고 있어요…':'Waiting for actual video statistics…',
    '실제 송신':'Actual send','실제 수신':'Actual receive','fps 측정 중':'Measuring fps','전송량 측정 중':'Measuring bitrate',
    ' (나)':' (you)',' · 공유 중':' · sharing',' · 내가 만든 방':' · your room',
    ' (가장 낮은 해상도 기준)':' (lowest-resolution viewer)',
    ' · 네트워크 속도로 품질이 제한되고 있어요.':' · Quality is limited by network bandwidth.',
    ' · 공유 PC의 처리 성능으로 품질이 제한되고 있어요.':' · Quality is limited by the presenter’s CPU.',
    ' · 원본 캡처가 선택한 해상도보다 작아요.':' · The captured source is smaller than the selected resolution.',
    ' · 실제 전송 해상도가 목표보다 낮습니다.':' · Actual sending resolution is below the target.',
    ' · 영상이 지연되고 있어요. 화면 다시 연결을 누르거나 공유 프레임을 낮춰 보세요.':' · Video is delayed. Reconnect it or lower the sharing frame rate.',
    ' 중계 서버가 연결되지 않아 일부 네트워크에서는 화면 연결이 실패할 수 있습니다.':' A relay is not configured, so some networks may not connect.',
  };
  const supported=['ko','en','ja','zh-CN','vi'];
  const normalize=value=>String(value||'').toLowerCase().startsWith('zh')?'zh-CN':String(value||'').split('-')[0];
  let lang='ko';
  try { lang=localStorage.getItem('classroom-language') || normalize(navigator.language); } catch {}
  if(!supported.includes(lang))lang='en';
  function english(value) {
    const text=String(value??'');
    if(Object.hasOwn(words,text))return words[text];
    // These templates only translate application-generated labels, never message bodies or nicknames.
    const patterns=[
      [/^(.*?) · (\d+)\/8명$/,(_,code,n)=>`${code} · ${n}/8 connected`],
      [/^전체 (\d+)개 · (\d+)페이지$/,(_,n,p)=>`${n} rooms · Page ${p}`],
      [/^전체 (\d+)명 · (\d+)페이지$/,(_,n,p)=>`${n} members · Page ${p}`],
      [/^비밀번호 필요 · (\d+)\/8명( · 내가 만든 방)?$/,(_,n,own)=>`Password required · ${n}/8 connected${own?' · your room':''}`],
      [/^새 메시지 (\d+)개 · 아래로$/,(_,n)=>`${n} new messages · Jump down`],
      [/^검색 결과 (\d+)개$/,(_,n)=>`${n} matches`],
      [/^가입: (.*?) · 최근 로그인: (.*)$/,(_,a,b)=>`Joined: ${a} · Last sign-in: ${b}`],
      [/^방 참여 회원: (.*)$/,(_,title)=>`Participants: ${title}`],
      [/^(.*?) · (.*?) · (\d+)개 접속$/,(_,name,email,n)=>`${name} · ${email} · ${n} connections`],
      [/^「(.*)」 방을 선택했습니다\. 방 비밀번호를 입력해 주세요\.$/,(_,title)=>`Selected “${title}”. Enter its room password.`],
      [/^(.*?) 계정의 이용 상태를 변경할까요\?$/,(_,email)=>`Change access for ${email}?`],
      [/^(.*?) 회원을 이 방에서 퇴장시킬까요\?$/,(_,email)=>`Remove ${email} from this room?`],
      [/^「(.*)」 방과 대화 기록을 삭제할까요\?$/,(_,title)=>`Delete “${title}” and its chat history?`],
    ];
    for(const [re,replace]of patterns)if(re.test(text))return text.replace(re,replace);
    const qualityNote='선택한 화질과 프레임은 목표값이며, 화면 해상도·PC·네트워크에 따라 달라집니다.';
    if(text.startsWith(qualityNote))return english(qualityNote)+english(text.slice(qualityNote.length));
    if(text.startsWith('연결을 확인하고 자동으로 다시 연결하고 있어요. '))return 'Checking the connection and retrying. '+english(text.slice('연결을 확인하고 자동으로 다시 연결하고 있어요. '.length));
    let out=text;
    for(const key of Object.keys(words).filter(k=>k.startsWith(' · ')||k.startsWith(' (')||['실제 송신','실제 수신','fps 측정 중','전송량 측정 중'].includes(k)).sort((a,b)=>b.length-a.length))out=out.split(key).join(words[key]);
    out=out.replace(/^원본 캡처 /,'Source capture ').replace(/최대 ([0-9.]+) fps/g,'up to $1 fps').replace(/전송 상한 ([0-9.]+) Mbps\/명/g,'send limit $1 Mbps/viewer').replace(/([0-9]+)명 상한 합계 ([0-9.]+) Mbps/g,'$1 viewers, total limit $2 Mbps');
    return out.replace(/직접 (\d+)명 \/ 중계 (\d+)명 \/ 확인 중 (\d+)명/g,'Direct $1 / Relay $2 / Unknown $3').replace(/연결: 중계/g,'Connection: Relay').replace(/연결: 직접/g,'Connection: Direct').replace(/연결: 확인 중/g,'Connection: Unknown').replace(/시청 (\d+)명/g,'$1 viewers').replace(/수신 버퍼 (\d+)ms/g,'Receive buffer $1ms').replace(/누적 프레임 누락 (\d+)/g,'Dropped frames $1').replace(/누적 멈춤 (\d+)회/g,'Freezes $1').replace(/^내 공유 화면 · /,'My capture · ').replace(/\(캡처\)/g,'(capture)').replace(/^화면 연결 중 · /,'Video connection · ');
  }
  function t(value) {
    const original=String(value??'');if(lang==='ko')return original;
    const translated=english(original);if(lang==='en')return translated;
    return window.CL_TRANSLATIONS?.translate(translated,lang)||translated;
  }
  const textRecords=[]; const attributeRecords=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    if(['SCRIPT','STYLE'].includes(node.parentElement?.tagName)||node.parentElement?.closest('#language'))continue;
    const original=node.nodeValue;if(/[가-힣]/.test(original))textRecords.push({node,original});
  }
  for(const element of document.querySelectorAll('[placeholder],[aria-label],[title]'))for(const name of ['placeholder','aria-label','title']){
    const original=element.getAttribute(name);if(original&&/[가-힣]/.test(original))attributeRecords.push({element,name,original});
  }
  function set(element,text) { element.dataset.uiText=String(text);element.textContent=t(text); }
  const originalTitle=document.title;
  function apply(){
    if(document.title===originalTitle||document.title===words[originalTitle])document.title=t(originalTitle);
    document.documentElement.lang=lang;document.getElementById('language').value=lang;
    for(const {node,original}of textRecords)if(node.isConnected){const trimmed=original.trim();node.nodeValue=original.replace(trimmed,t(trimmed));}
    for(const {element,name,original}of attributeRecords)element.setAttribute(name,t(original));
    for(const element of document.querySelectorAll('[data-ui-text]'))element.textContent=t(element.dataset.uiText);
  }
  window.CL_I18N={t,set,apply,language:()=>lang};
  document.getElementById('language').addEventListener('change',event=>{
    lang=event.target.value;try{localStorage.setItem('classroom-language',lang);}catch{}
    apply();window.dispatchEvent(new CustomEvent('classroom-language',{detail:lang}));
  });
  apply();
})();
