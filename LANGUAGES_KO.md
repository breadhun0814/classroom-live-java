# 다국어·GitHub 안내 — java-lan3

## 지원 언어

한국어 / English / 日本語 / 简体中文 / Tiếng Việt.

웹 화면 오른쪽 위 언어 메뉴와 START_HERE.html·GitHub Pages 안내 페이지의 언어 메뉴에서 선택합니다. 브라우저의 언어로 시작하고, 선택한 언어는 해당 브라우저에 저장합니다. 도움말은 같은 언어 설정을 사용합니다.

주요 버튼·가입·방·채팅·관리자·화질·연결 안내를 번역했습니다. 드문 외부 기술 오류나 아직 사전에 없는 서버 문구는 영어 또는 원래 메시지로 표시될 수 있습니다. 닉네임·방 이름·메시지·코드 내용은 원문을 유지합니다. 명령 파일과 서버 콘솔은 같은 파일 이름/명령을 사용하며, 각 언어 설명서에서 실행 순서를 안내합니다.

번역문을 파일에 포함하므로 번역 API 가입·비용·인터넷 연결이 필요하지 않습니다.

## GitHub에서 보이는 파일

- README.md: 저장소 첫 화면의 소개와 언어별 설명 링크.
- docs/guide-ko.md, guide-en.md, guide-ja.md, guide-zh-CN.md, guide-vi.md: 각 언어의 설치·사용 설명.
- index.html, guide.js, guide.css: GitHub Pages용 다국어 안내 페이지.
- START_HERE.html: 압축 해제 후 직접 여는 동일한 안내.
- 교실 서버의 /help: 같은 다국어 도움말.

## 업로드 순서

1. 새 GitHub 저장소를 만듭니다.
2. Add file → Upload files를 누릅니다.
3. ZIP 자체가 아닌 **압축을 푼 폴더 안의 내용**을 올립니다. 저장소 첫 화면에 README.md와 ClassroomLive.jar가 보여야 합니다.
4. Commit changes로 저장합니다.
5. README의 언어 링크를 눌러 각 설명을 확인합니다.
6. 안내 웹페이지가 필요하면 Settings → Pages → Deploy from a branch → main / (root) → Save를 선택합니다. 실제 기본 브랜치가 main이 아니면 해당 브랜치를 선택합니다.

GitHub Pages는 안내 페이지를 보여 줍니다. 실제 채팅/화면 공유는 Java 서버를 실행하고 교실의 HTTPS 주소로 접속합니다.

**실행 후 생성된 data 폴더, 인증서 개인 키, 회원·채팅 데이터, 개인 java-path.txt는 올리지 마세요.** 브라우저 업로드는 .gitignore만으로 자동 제외되지 않습니다. 처음 받은 ZIP에는 이 개인 데이터가 포함되지 않습니다.

## 기존 서버 업데이트

서버 종료 → 새 ClassroomLive.jar만 기존 폴더에 복사 → 기존 data와 java-path.txt 유지 → 02-Start.cmd 실행 → 참여자 모두 Ctrl+Shift+R → 로그인·입장.

최신 UI와 다국어 도움말이 JAR에 포함되어 있습니다. IP·포트·CA를 바꾸지 않았다면 학생 인증서 재설치는 필요 없습니다.

## 개발자가 번역을 고칠 때

일반 사용자는 이 작업이 필요 없습니다. 개발자는 guide-data.json의 설명 데이터를 수정하고 `node scripts/sync-guides.cjs`로 안내·Markdown을 갱신합니다. UI 번역은 scripts/translations.tsv에서 영어|일본어|중국어|베트남어 순서로 수정한 뒤 `node scripts/sync-glossary.cjs`를 실행합니다. 한국어/영어 원본은 public/web/i18n.js에 있습니다. 변경 후 `java Build.java`로 JAR를 다시 빌드합니다. Node는 이 개발 작업에만 필요하며 서버나 학생 PC의 실행 의존성이 아닙니다.
