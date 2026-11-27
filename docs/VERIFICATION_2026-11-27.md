# 포트폴리오 정리 검증 기록 · 2026-11-27

이 문서는 최초 포트폴리오 문서 정리 시점의 기록입니다. 이후 사이트 수정과 Java 설치 편의 개선·새 JAR 빌드 결과는 [사이트 점검·설치 개선 기록](AUDIT_INSTALL_2026-11-27.md)에 별도로 남겼습니다.

## 대상과 환경

- 원본: `breadhun0814/classroom-live-java`, `main`, 커밋 `a09e155`.
- 환경: Windows, JDK 26.0.2.1, Node.js 24.22.3, jsdom 30.1.3.
- 빌드 대상: 기존 `Build.java`의 `--release 17`. Java 17 자체에서의 실행은 이번에 확인하지 않았습니다.
- 변경 범위: README·포트폴리오 문서·검증 안내·이미지·`.gitignore`. 애플리케이션 코드와 기존 배포 JAR는 변경하지 않았습니다.
- 테스트와 촬영에는 임시 합성 데이터만 사용했습니다. 실제 교실 계정·대화·인증서를 산출물에 포함하지 않았습니다.

## 실행 결과

| 명령 / 확인 | 결과 | 확인 범위 |
| --- | --- | --- |
| `java Build.java test` | 통과 | 서버·관리 앱 JAR 빌드, Java 테스트 컴파일 |
| `java --add-modules jdk.httpserver -cp "build/classes;build/test-classes" ServerTests` | 통과 | 계정·권한·비밀번호 방·코드 채팅·동시 정원·요청 제한·저장·백업·비밀번호 재설정·실제 HTTPS·인증서·학생 설치팩 |
| 같은 classpath로 `ManagedServerTests` | UTF-8 조건에서 통과 | 실제 JAR 자식 프로세스·한글/공백 경로·HTTPS·중복 방지·STOP·재시작·부모 EOF·기존 데이터 보존 |
| `node tests/ui.test.cjs` | 통과 | 실제 Java HTTPS 백엔드와 쿠키 인증에 연결하는 jsdom UI 흐름, 모의 캡처·WebRTC 협상·화질 설정 경로 |
| `node tests/guides.test.cjs` | 통과 | 5개 언어 가이드·전환·선택 저장, README 상대 링크 |
| 실제 Edge UI 자동화 | 통과 | 한 PC에서 분리된 관리자·학생 컨텍스트로 로그인·가입·방 생성·입장·일반 및 코드 메시지 표시 |

`ServerTests` 출력은 `ALL JAVA BACKEND / HTTPS / SETUP TESTS PASSED`로 종료했습니다. `ManagedServerTests`는 기존 설정·계정·CA·학생 설치팩의 바이트 보존까지 검사했습니다. 테스트 파일의 assertion 개수를 임의의 독립 테스트 수나 성능 지표로 환산하지 않았습니다.

문서 정리 후 기존 다국어 안내 테스트를 재실행했고, 수정·추가 문서의 상대 링크 39개와 UTF-8 텍스트, 표지 SVG 렌더링, README 미리보기를 확인했습니다. `.gitignore`가 운영 데이터·인증서·실제 Java 경로·빌드·개발 의존성 경로를 제외하는 것도 확인했습니다.

## Windows 출력 인코딩 조건

기본 환경의 `ManagedServerTests`는 별도 자식 프로세스가 출력한 한글 경로를 UTF-8로 읽는 비교에서 실패했습니다. Windows 자식 프로세스의 출력 인코딩을 명시하니 통과했습니다. 소스나 검증 기준을 완화하지 않았습니다.

PowerShell에서 해당 테스트에만 다음 조건을 적용할 수 있습니다. 기존 환경 변수가 있으면 보존한 뒤 복구합니다.

```powershell
$classroomPreviousJavaOptions = $env:JAVA_TOOL_OPTIONS
try {
    $env:JAVA_TOOL_OPTIONS = "$classroomPreviousJavaOptions -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8".Trim()
    java --add-modules jdk.httpserver -cp "build/classes;build/test-classes" ManagedServerTests
} finally {
    $env:JAVA_TOOL_OPTIONS = $classroomPreviousJavaOptions
}
```

실행 도구의 제한된 샌드박스에서는 Java 컴파일러의 클래스 경로 접근과 Node 의존성 도구의 임시 경로 접근이 실패했습니다. 동일한 빌드·테스트를 승인된 일반 실행 환경에서 완료했습니다. 이 접근 실패를 애플리케이션 빌드 결함으로 기록하지 않았습니다.

## 화면 자료의 의미

`assets/login.png`와 `assets/classroom.png`는 실제 앱을 Edge에서 열어 촬영한 화면입니다. 임시 Java 테스트 서버와 합성 관리자·학생·메시지를 사용했습니다. 화면 공유 대기 상태를 촬영했으며, 영상 화면을 합성하거나 실제 미디어 전송이 확인된 것처럼 표시하지 않았습니다. `assets/cover.svg`는 프로젝트 소개용 도식입니다.

## 이번에 확인하지 않은 항목

- 서로 다른 실제 PC 간 화면 전송, 8대 PC 동시 영상, 실제 해상도·FPS·대역폭·코덱 품질.
- 장시간 수업, 네트워크 장애·학교 PC 격리 정책을 포함한 현장 조건.
- Windows 바탕화면 바로가기·창 없는 실행의 수동 조작, 학생 PC의 CA 설치와 방화벽 변경.
- 새 PC 설치, Ubuntu 실행, Java 17 런타임 자체에서의 실행.
- 독립적인 보안 감사, 운영 도입 성과와 사용자 수.

기존 `TESTING.md`의 과거 검증 설명은 원본 작성 기록이며, 위 결과와 별개의 시점입니다. 이번 검증을 근거로 과거의 실제 수업 성공이나 성능 개선 수치를 주장하지 않습니다.

## 추가 사용 편의 개선 검증 · 2026-11-27

| 검증 범위 | 환경과 결과 |
| --- | --- |
| 브라우저 기능 | Windows의 Edge와 로컬 Java HTTPS 서버에서 합성 계정으로 최근 방, 새 입장 잠금, 손들기, 답장·고정, 관리자 가입 제어·조작 기록을 확인했습니다. |
| 대화 읽기와 검색 | Edge에서 메시지 55건의 검색 페이지, 일반·코드별 검색, TXT와 자동 복사 차단 시 직접 복사 흐름을 확인했습니다. |
| 시작과 좁은 화면 | 새 Edge 세션 8개에서 동시에 로그인 화면을 열었습니다. 390px 앱 화면에서 화면·통화·대화 이동과 가로 넘침 여부를 확인했습니다. |
| 미디어 | 같은 PC의 Edge 두 세션에서 합성 카메라·마이크·공유 화면을 사용했습니다. 공유 중 부하 변경과 통화 재연결 뒤 5분간 연결과 프레임 증가를 확인했습니다. |
| 서버와 설치 | 배포용 JAR로 Java 권한·방 범위·HTTPS 회귀 테스트를 통과했습니다. Windows 설치 검사 36개와 한글 경로의 관리 앱 시작·중복 실행 방지·재시작·데이터 보존을 확인했습니다. |

8개 세션은 초기 접속 검증입니다. 다른 PC 사이의 실제 장비와 네트워크 조합, 여러 대의 동시 영상 전송 품질은 별도의 현장 확인이 필요합니다.
