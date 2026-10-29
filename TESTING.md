# Developer validation

Runtime requirements: Java 17+ with jdk.httpserver; keytool for initial setup and certificate renewal. No Python, Maven, Gradle, Spring runtime or third-party Java libraries. The prebuilt JAR contains the UI and Java 17 bytecode.

Rebuild and run Java tests with a JDK:

```bash
java Build.java test
java --add-modules jdk.httpserver -cp build/classes:build/test-classes ServerTests
```

On Windows the classpath separator is `;` instead of `:`. The source launcher uses the JDK compiler API, so a separate javac executable on PATH is not required.

UI integration tests (developer-only Node 24/jsdom):

```bash
npm install --ignore-scripts
npm test
```

UI tests start the real Java HTTPS backend and use jsdom with simulated capture and RTCPeerConnection. This verifies authentication, room/chat/UI flows and signaling; it is not a physical video quality, codec, throughput or nine-hour endurance test. Test certificates/accounts/databases use temporary directories and are excluded from the deliverable.

Backend validation covers persistent accounts/rooms/chat, private authentication/RPC, single administrator, suspension/restore, room kick/delete, concurrent 8-connection capacity, room name/password and login/join rate limits, code text, salted password storage, password reset, backup, actual keytool CA/server certificate chain, real HTTPS cookies/API, CSRF/IP subnet/private-file protection and public-only student installer ZIP.

Windows cmd/PowerShell launchers and the student certificate installation have been reviewed but not executed on Windows in this environment. Run a short test in the actual classroom before using it for a lesson.

Completed checks for this deliverable: Java backend/HTTPS/setup tests passed; real-Java-backend UI integration passed; the actual packaged JAR completed interactive setup and generated certificates/student ZIP, served its embedded UI over trusted HTTPS from an otherwise empty directory, rejected simultaneous data access, and created a stopped-server backup. JAR manifest, Java 17 class-file version and embedded UI version were also checked.

Quality release java-lan2: UI integration additionally checks native capture without a forced 16:9 ratio, actual source-capability constraint application, higher sender bitrate caps after negotiation, maintain-resolution text versus maintain-framerate motion, H.264 preference with fallback codecs retained, capture/codec-constraint rejection fallback, original pixel-size viewing and bilingual quality labels. No actual multi-PC image-quality measurement was performed.

Language release java-lan3: five-language offline guide and README-link tests; Japanese/Chinese/Vietnamese/English switching while inside a room preserves room names and code messages. New guide and glossary assets are covered by HTTPS asset tests. Developer glossary and guide synchronization use optional Node scripts; classroom runtime still requires only Java. Uncommon technical errors use an English/original fallback.
