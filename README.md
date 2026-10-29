# Classroom Live Java LAN

[한국어](docs/guide-ko.md) | [English](docs/guide-en.md) | [日本語](docs/guide-ja.md) | [简体中文](docs/guide-zh-CN.md) | [Tiếng Việt](docs/guide-vi.md)

**교실 컴퓨터 한 대로 운영하는 화면 공유·채팅 서버입니다.**

**A self-hosted classroom screen-sharing and chat server.**

- 교수님 포함 최대 8접속 / Up to 8 connections including the presenter.
- Java 17+ 서버 한 대, 학생은 Chrome / One Java 17+ server, students use Chrome.
- 아이디·비밀번호, 비밀번호 방, 코드 채팅, 관리자 회원 관리 / Local accounts, protected rooms, code chat and administrator controls.
- 원본 해상도·고화질 설정 / Native-resolution capture and high-quality presets.
- 한국어·영어·일본어·중국어 간체·베트남어 안내와 화면 / Korean, English, Japanese, Simplified Chinese and Vietnamese guides and interface.
- 외부 서비스 없이 교실 내부망에서 사용 / No cloud service dependency during classroom use.

## 시작하기 / Start here

1. **Code → Download ZIP** → 모두 압축 풀기 / Extract all files.
2. **START_HERE.html**을 열어 언어를 선택하세요 / Open START_HERE.html and choose a language.
3. 서버에서 **00-Java-Check.cmd → 01-Setup.cmd → 03-Firewall.cmd (관리자 권한 / as administrator) → 02-Start.cmd**.
4. 학생에게 생성된 **data/STUDENT_SETUP.zip만** 전달 / Give students **only** the generated data/STUDENT_SETUP.zip.

> GitHub Pages에서는 다국어 설치 안내를 볼 수 있습니다. 실제 채팅과 화면 공유는 실행 중인 교실 서버의 HTTPS 주소에서 사용합니다.
>
> GitHub Pages hosts the guide. The live app runs at the classroom server’s HTTPS address.

## 언어별 설명 / Guides

- [한국어](docs/guide-ko.md)
- [English](docs/guide-en.md)
- [日本語](docs/guide-ja.md)
- [简体中文](docs/guide-zh-CN.md)
- [Tiếng Việt](docs/guide-vi.md)

## 기존 서버 업데이트 / Update an existing server

서버 종료 → 새 **ClassroomLive.jar** 교체 → 기존 **data**와 **java-path.txt** 유지 → 재시작 → 모든 브라우저 **Ctrl+Shift+R**.

Stop the server, replace **ClassroomLive.jar**, preserve **data** and **java-path.txt**, restart, and refresh every browser with **Ctrl+Shift+R**. Server restarts require sign-in and room re-entry.

## GitHub Pages 안내 페이지

Settings → Pages → Deploy from a branch → **main / (root)** → Save.

## 비공개로 보관 / Keep private

**data/**, 인증서 개인 키, 회원·채팅 데이터, 실제 **java-path.txt**를 올리지 마세요. 브라우저 업로드는 .gitignore만으로 제외되지 않습니다.

Never publish **data/**, private certificate keys, account/chat data or your actual **java-path.txt**. Browser uploads do not automatically honor .gitignore.

## 한계 / Limits

같은 건물이어도 PC 간 통신이 차단되면 학교 담당자의 허용이 필요합니다. 원본 해상도와 전송 상한은 실제 화질/FPS를 보장하지 않습니다. 영상은 녹화하지 않으며 음성·첨부파일·집에서 내부 IP로 접속하는 기능은 포함하지 않습니다.

School device isolation can prevent peer video. Requested resolution and bitrate limits do not guarantee actual quality/FPS. Screens are not recorded. Audio, file attachments and home access to private LAN IPs are not included.

고급 화질 설명 / Advanced quality settings: [QUALITY_KO.md](QUALITY_KO.md). Developer checks: [TESTING.md](TESTING.md).

Uncommon upstream technical errors may fall back to English or the original server message. User-entered names, room names, messages and code are preserved.
