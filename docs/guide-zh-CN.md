# Classroom Live Java LAN — 简体中文

[한국어](guide-ko.md) | [English](guide-en.md) | [日本語](guide-ja.md) | [简体中文](guide-zh-CN.md) | [Tiếng Việt](guide-vi.md)

使用教室内一台电脑提供登录、聊天和屏幕共享。

> 本页是安装使用指南。上课时请启动教室服务器，再访问 https://服务器IP:端口/。GitHub Pages不能运行Java服务器。

## 功能介绍

每个房间最多8个浏览器连接，包含教师；同一时间仅一人共享屏幕。支持本地账号密码、密码保护房间、文字和代码聊天、管理员用户管理及高画质屏幕共享。账号和聊天记录保存在教室服务器，不录制屏幕。不包含音频共享或附件上传。

## 1. 准备服务器电脑

在GitHub选择Code → Download ZIP，然后全部解压。打开包含ClassroomLive.jar和00-Java-Check.cmd的文件夹。服务器需要Java 17或更高版本及keytool，不需要Python、Maven或云服务账号。学生电脑只需Chrome。

## 2. 使用Spring Tools中的Java

运行00-Java-Check.cmd。如找不到Java，在Spring Tools → Window → Preferences → Java → Installed JREs → Edit中复制JRE home。在JAR旁新建java-path.txt，第一行写入实际JDK文件夹路径，再次检查。不要直接使用示例路径。

## 3. 首次配置

在PowerShell输入ipconfig，查找有线以太网的实际IPv4和子网掩码。运行01-Setup.cmd，设置服务器IP、允许的网段、端口（默认8443）、唯一管理员账号及至少12位密码。例如：IP为192.168.22.156、掩码为255.255.255.0，则网段为192.168.22.0/24。请使用实际数值。

## 4. 防火墙与启动

在服务器电脑右键03-Firewall.cmd → 以管理员身份运行，仅允许指定教室网段访问所选TCP端口。运行02-Start.cmd，上课期间保持窗口和电脑开启。Ctrl+C停止。不要关闭整个防火墙。

## 5. 学生连接准备

只分发生成的data/STUDENT_SETUP.zip。每个Windows用户（包括服务器用户）先解压，运行Setup.cmd，确认是教师提供的原版文件后输入YES，批准安装教室证书。完全退出并重新打开Chrome。不要分发整个服务器文件夹或data/tls。如学校策略阻止安装，请联系负责人。

## 6. 注册、入室与上课

在Chrome输入服务器窗口显示的HTTPS地址。学生使用账号、至少8位密码和昵称注册，无需邮件验证。教师使用首次配置的管理员账号登录，返回聊天界面后创建密码房间。学生选择房间并输入房间密码。Enter发送，Shift+Enter换行；发送代码时选择代码模式。

## 7. 画质与语言

共享方选择“课堂文字更清晰”，设置为原始分辨率、高画质、30fps。“视频更流畅”选择1080p、60fps并优先H.264。实际分辨率和帧率取决于电脑及网络。观看者可使用全屏或原始大小显示。语言菜单切换界面文字和帮助，选择保存在浏览器中。

## 8. 管理、备份与更新

只有指定管理员可以查看用户、停用/恢复账号、移出房间及删除房间。不能停用管理员本人。先停止服务器，再运行04-Backup.cmd或05-Reset-Password.cmd。更新顺序：停止 → 替换ClassroomLive.jar → 保留data和java-path.txt → 启动 → 所有人按Ctrl+Shift+R。重启后需要重新登录和入室。

## 连接或清晰度问题

检查电源、实际IP、端口、允许网段及证书。能聊天但没画面时刷新Chrome并复制连接诊断。同一建筑也可能因VLAN或设备隔离阻止视频，需要学校负责人放行。同一子网的有线和Wi-Fi无法仅靠IP限制区分。向7人发送高画质会增加共享电脑负担。把1080p源画面设为1440p不会产生原本不存在的细节。

## 上传到GitHub

新建仓库，选择Add file → Upload files，上传解压后的内容。README.md应位于仓库根目录，GitHub才会显示说明。不要上传生成的data、证书私钥、用户数据或个人java-path.txt。浏览器上传不会自动遵守.gitignore。启用说明网页：Settings → Pages → Deploy from a branch → main / (root)。

