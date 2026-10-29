# Classroom Live Java LAN — Tiếng Việt

[한국어](guide-ko.md) | [English](guide-en.md) | [日本語](guide-ja.md) | [简体中文](guide-zh-CN.md) | [Tiếng Việt](guide-vi.md)

Dùng một máy tính trong lớp để đăng nhập, trò chuyện và chia sẻ màn hình.

> Đây là trang hướng dẫn. Để học trực tiếp, hãy bật máy chủ lớp rồi mở https://IP_MAY_CHU:CONG/. GitHub Pages không chạy máy chủ Java.

## Có những chức năng gì?

Mỗi phòng có tối đa 8 kết nối trình duyệt, kể cả giảng viên; mỗi lần chỉ một người chia sẻ. Có tài khoản/mật khẩu cục bộ, phòng có mật khẩu, chat văn bản/mã nguồn, quản lý thành viên và chia sẻ màn hình chất lượng cao. Tài khoản và chat được lưu trên máy chủ lớp. Không ghi hình; không có chia sẻ âm thanh hoặc tệp đính kèm.

## 1. Chuẩn bị máy chủ

Trên GitHub chọn Code → Download ZIP rồi giải nén tất cả. Mở thư mục có ClassroomLive.jar và 00-Java-Check.cmd. Máy chủ cần Java 17 trở lên và keytool. Không cần Python, Maven hoặc tài khoản đám mây. Máy sinh viên chỉ cần Chrome.

## 2. Dùng Java trong Spring Tools

Chạy 00-Java-Check.cmd. Nếu không tìm thấy Java, mở Spring Tools → Window → Preferences → Java → Installed JREs → Edit và sao chép JRE home. Tạo java-path.txt cạnh JAR, ghi đường dẫn thư mục JDK thực tế ở dòng đầu rồi kiểm tra lại. Không chép nguyên đường dẫn ví dụ.

## 3. Thiết lập lần đầu

Gõ ipconfig trong PowerShell để tìm IPv4 Ethernet có dây và mặt nạ mạng thực tế. Chạy 01-Setup.cmd, nhập IP máy chủ, dải mạng được phép, cổng (mặc định 8443), tài khoản quản trị duy nhất và mật khẩu từ 12 ký tự. Ví dụ: IP 192.168.22.156 với mặt nạ 255.255.255.0 dùng dải 192.168.22.0/24. Hãy dùng thông số thực tế.

## 4. Tường lửa và khởi động

Trên máy chủ, nhấp phải 03-Firewall.cmd → Run as administrator. Chỉ mở cổng TCP đã chọn cho dải mạng lớp. Chạy 02-Start.cmd, giữ cửa sổ và máy tính hoạt động trong buổi học. Dừng bằng Ctrl+C. Không tắt toàn bộ tường lửa.

## 5. Chuẩn bị máy sinh viên

Chỉ gửi tệp data/STUDENT_SETUP.zip được tạo sau thiết lập. Mỗi người dùng Windows, kể cả trên máy chủ, giải nén rồi chạy Setup.cmd; xác nhận tệp gốc do giảng viên cung cấp, nhập YES và chấp thuận chứng chỉ lớp. Đóng hoàn toàn rồi mở lại Chrome. Không gửi cả thư mục máy chủ hoặc data/tls. Nếu chính sách trường chặn cài đặt, liên hệ người phụ trách.

## 6. Đăng ký, vào phòng và học

Mở địa chỉ HTTPS hiện trong cửa sổ máy chủ bằng Chrome. Sinh viên đăng ký ID, mật khẩu ít nhất 8 ký tự và biệt danh; không cần xác nhận email. Giảng viên đăng nhập bằng tài khoản quản trị đã tạo, trở về chat và tạo phòng có mật khẩu. Sinh viên chọn phòng và nhập mật khẩu phòng. Enter gửi; Shift+Enter xuống dòng. Chọn chế độ mã nguồn khi gửi code.

## 7. Chất lượng và ngôn ngữ

Trên máy chia sẻ, chọn “Chữ bài học rõ nét” để dùng độ phân giải gốc, chất lượng cao và 30fps. “Video mượt” chọn 1080p, 60fps và ưu tiên H.264. Chất lượng/FPS thực tế phụ thuộc máy và mạng. Người xem có thể dùng toàn màn hình hoặc kích thước gốc. Bộ chọn ngôn ngữ đổi nhãn giao diện và hướng dẫn; lựa chọn được lưu trong trình duyệt.

## 8. Quản trị, sao lưu và cập nhật

Chỉ quản trị viên đã chỉ định được xem thành viên, đình chỉ/khôi phục, mời ra khỏi phòng và xóa phòng. Không thể đình chỉ chính quản trị viên. Dừng máy chủ trước khi chạy 04-Backup.cmd hoặc 05-Reset-Password.cmd. Cập nhật: dừng → thay ClassroomLive.jar → giữ data và java-path.txt → bật lại → mọi người nhấn Ctrl+Shift+R. Sau khi khởi động lại phải đăng nhập và vào phòng lại.

## Lỗi kết nối hoặc hình mờ

Kiểm tra nguồn máy chủ, IP, cổng, dải mạng và chứng chỉ. Nếu chat được nhưng không có hình, làm mới Chrome và sao chép chẩn đoán. Cùng tòa nhà vẫn có thể bị VLAN hoặc cô lập thiết bị chặn video; cần người phụ trách trường cho phép. IP không phân biệt được Ethernet và Wi-Fi cùng dải. Gửi hình chất lượng cao cho 7 người làm tăng tải máy chia sẻ. Chọn 1440p không tạo thêm chi tiết từ nguồn 1080p.

## Đưa lên GitHub

Tạo kho mã, chọn Add file → Upload files và tải nội dung đã giải nén lên. README.md phải nằm ở thư mục gốc để GitHub hiển thị mô tả. Không tải data được tạo lúc chạy, khóa riêng chứng chỉ, dữ liệu tài khoản hoặc java-path.txt cá nhân. Tải qua trình duyệt không tự loại tệp theo .gitignore. Bật trang hướng dẫn: Settings → Pages → Deploy from a branch → main / (root).

