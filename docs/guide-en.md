# Classroom Live Java LAN — English

[한국어](guide-ko.md) | [English](guide-en.md) | [日本語](guide-ja.md) | [简体中文](guide-zh-CN.md) | [Tiếng Việt](guide-vi.md)

Run classroom sign-in, chat and screen sharing from one local computer.

> This is the installation guide. For a live class, start the classroom server and open https://SERVER_IP:PORT/. GitHub Pages does not run the Java server.

## What is included?

Up to 8 browser connections per room including the professor, with one presenter at a time. Local ID/password accounts, protected rooms, text/code chat, administrator controls and high-quality screen sharing are included. Accounts and chat stay on the classroom server. Screens are not recorded. Audio sharing and file attachments are not included.

## 1. Prepare the server PC

On GitHub select Code → Download ZIP, then extract all files. Work in the folder containing ClassroomLive.jar and 00-Java-Check.cmd. The server needs Java 17+ and keytool. No Python, Maven or cloud account is required. Students only need Chrome.

## 2. Use the Java in Spring Tools

Run 00-Java-Check.cmd. If Java is not found, open Spring Tools → Window → Preferences → Java → Installed JREs → Edit and copy JRE home. Create java-path.txt beside the JAR and put the actual JDK folder on its first line, then check again. Do not use the example path literally.

## 3. Initial server setup

Run ipconfig in PowerShell and find the wired Ethernet IPv4 and subnet mask. Run 01-Setup.cmd and enter the actual server IP, allowed subnet, port (default 8443), and your sole administrator ID and a password of at least 12 characters. Example only: 192.168.22.156 with mask 255.255.255.0 uses subnet 192.168.22.0/24. Use your actual values.

## 4. Firewall and start

On the server, right-click 03-Firewall.cmd → Run as administrator. It allows only the configured TCP port from the classroom subnet. Run 02-Start.cmd and keep the window and PC powered on during lessons. Stop with Ctrl+C. Do not disable the entire firewall.

## 5. Prepare student access

Distribute only the generated data/STUDENT_SETUP.zip. Each Windows user, including the server user, extracts it, runs Setup.cmd, verifies it came from the teacher, types YES and approves the classroom certificate. Completely close and reopen Chrome. Never distribute the whole server folder or data/tls. If school policy blocks installation, ask IT.

## 6. Accounts, rooms and lessons

Open the HTTPS address printed by the server in Chrome. Students create an ID, password of at least 8 characters and nickname; no email confirmation is used. The professor signs in with the setup administrator account, returns to chat and creates a password-protected room. Students select the room and enter its password. Enter sends; Shift+Enter adds a line. Select Send as code for code.

## 7. Quality and language

On the presenting PC, Clear classroom text selects original resolution, high quality and 30fps. Smooth video selects 1080p, 60fps and H.264 preference. Actual resolution/FPS depend on hardware and networking. Viewers can use full screen or original-size view. The language picker changes interface labels and help; the selection is saved in the browser.

## 8. Admin, backup and updates

Only the designated administrator can list members, suspend/restore access, remove room participants and delete rooms. The administrator cannot suspend themselves. Stop the server before 04-Backup.cmd or 05-Reset-Password.cmd. To update: stop, replace ClassroomLive.jar, preserve data and java-path.txt, restart, and refresh all browsers with Ctrl+Shift+R. Everyone signs in and rejoins after a restart.

## Connection or clarity problems

Check server power, actual IP, port, allowed subnet and certificate trust. If chat works but video fails, refresh Chrome and copy diagnostics. Even within one building, VLANs or device isolation can block video; school IT may need to allow peer traffic. An IP subnet cannot distinguish Ethernet from Wi-Fi on the same subnet. Sending high quality to seven viewers increases presenter load. Selecting 1440p cannot create details absent from a 1080p source.

## Upload to GitHub

Create a repository, select Add file → Upload files and upload the extracted contents. README.md must be at the repository root for GitHub to display the description. Never upload generated data, private certificate keys, account records or your personal java-path.txt. Browser uploads do not automatically honor .gitignore. For the guide site: Settings → Pages → Deploy from a branch → main / (root).

