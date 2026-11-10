# AI MASTER CONTEXT — GARAGE MANAGEMENT SYSTEM
> **Tài liệu Trung tâm Dùng chung cho ChatGPT & Antigravity**
> - **Mục đích:** Cung cấp ngữ cảnh toàn diện, chính xác và có cấu trúc cố định về dự án **Garage Management** (Hệ thống đặt lịch và quản lý dịch vụ sửa chữa ô tô đa chi nhánh) cho cả **tác vụ lập trình (Coding)** và **tác vụ viết báo cáo Khóa luận tốt nghiệp (Thesis Writing)**.
> - **Nguyên tắc cập nhật dành cho AI (ChatGPT / Antigravity):**
>   1. Khi hoàn thành tính năng hoặc thay đổi kiến trúc/database, hãy **cập nhật trực tiếp vào đúng bảng/mục tương ứng** trong file này, đồng thời chỉ ghi thêm 1 dòng tóm tắt vào **Mục 7 (Nhật ký cập nhật)**.
>   2. **KHÔNG** chèn các đoạn log dài dòng, rời rạc lên đầu file làm vỡ cấu trúc tài liệu.

---

## 1. PHÂN TÁCH 2 CHẾ ĐỘ LÀM VIỆC CỦA AI (QUAN TRỌNG)

Để tránh việc AI đem các câu cảnh báo kỹ thuật nội bộ viết nhầm vào báo cáo học thuật, mọi AI đọc file này phải phân biệt rõ 2 chế độ:

### 1.1. Chế độ Lập trình & Kỹ thuật (Engineering Mode)
- **Không tự ý sửa Database:** Schema SQL Server (`database/GarageSystemDB.sql` / `database/GarageManagementSystem.sql` và thư mục `database/migrations/`) chỉ được sửa hoặc áp migration khi người dùng duyệt rõ ràng.
- **Backend Authority tuyệt đối:** Mọi kiểm tra phân quyền (RBAC), cô lập chi nhánh (Branch Isolation) và quyền sở hữu (Ownership) bắt buộc thực thi tại Spring Boot Backend từ `SecurityContext` (JWT). Tuyệt đối không tin `role`, `branchId`, `customerId` hay `donGia` do Client gửi lên.
- **An toàn Hệ thống & Git:** Không tự ý `git reset --hard`, không xóa file/volume Docker, không tự ý commit/push/deploy nếu chưa có yêu cầu.
- **Quy tắc Flutter:** Không tự chạy `flutter run` hoặc `flutter build` (do người dùng tự khởi chạy); AI chỉ chạy `flutter analyze` và `flutter test` để kiểm tra code.

### 1.2. Chế độ Viết Báo cáo Khóa luận Tốt nghiệp (Academic Thesis Mode)
- **Bản Chương 4 hiện hành (06/11/2026):** `D:/KLCN/Garage_Management_Work_Sessions/thesis-notes/Chuong_4_Cai_Dat_He_Thong_Garage_Management.docx`, Markdown đồng bộ tại `D:/KLCN/Garage_Management_Work_Sessions/thesis-notes/Chuong_4_Cai_Dat_He_Thong_Garage_Management.md` và bản bàn giao `D:/KLCN/Chuong_4_Cai_Dat_He_Thong_Garage_Management.md`. Bám Chương 4 của PDF mẫu `D:/KLCN/2025_kltn_toeic+knn_1.pdf` (trang in 100–130) và thống nhất thuật ngữ với Chương 2 hiện hành. Bố cục gồm 4.1 Môi trường phát triển và cài đặt, 4.2 Kiến trúc hệ thống, 4.3 Xây dựng chức năng chính (tách Web và Mobile), 4.4 Kết chương.
- **Cập nhật bản Markdown Chương 4 (06/11/2026):** Hai mục 4.1.1 và 4.1.2 đã được mở rộng theo PDF mẫu, gồm yêu cầu môi trường, công cụ, quy trình cài đặt, kiểm tra kết nối và đóng gói. Bản Markdown chính tại `D:/KLCN/Chuong_4_Cai_Dat_He_Thong_Garage_Management.md` đồng bộ với bản cùng tên trong thesis-notes. Bản Word 10 trang thuộc phiên trước và chưa đồng bộ nội dung này.
- **Bản Word Chương 4 đã rà soát (06/11/2026):** `D:/KLCN/Garage_Management_Work_Sessions/thesis-notes/Chuong_4_Cai_Dat_He_Thong_Garage_Management_Da_Ra_Soat.docx`. Chuyển từ Markdown Antigravity đã mở rộng mục 4.1. Đã đối chiếu và chỉnh kênh STOMP theo chi nhánh, API tạo phiên VietQR, cơ chế khóa hóa đơn và các mô tả vượt phạm vi. Kết xuất 17 trang, 2 bảng, 4 sơ đồ, 2 ảnh kiểm thử và 6 vị trí chờ ảnh. Bản Word 10 trang là bản trước.
- **Tiến độ Chương 4:** Bản Word đã kết xuất và rà soát bố cục 10 trang, có 2 bảng lệnh cài đặt, 4 sơ đồ, 2 ảnh giao diện dùng dữ liệu kiểm thử. Còn 6 vị trí chờ ảnh giao diện: đăng nhập Web, xác nhận lịch hẹn, phê duyệt phân công, đặt lịch Mobile, cập nhật tiến độ kỹ thuật viên và lịch sử sửa chữa.
- **Đối chiếu khi chỉnh Chương 4:** Web hiện có trang hóa đơn và hộp thoại thu tiền tại quầy. Mobile có luồng VietQR và đọc trạng thái đối soát SePay. Phân biệt phiếu sửa chữa phát sinh đã có với chức năng khách hàng duyệt báo giá độc lập, thuộc phạm vi mở rộng. Phiên này chỉ soạn tài liệu và đối chiếu mã nguồn. Nhật ký phiên: `D:/KLCN/Garage_Management_Work_Sessions/2026-11-06_22-15_chuong-4-cai-dat-he-thong.md`.

- **Bản Chương 2 hiện hành đã chỉnh theo yêu cầu người dùng (04/11/2026):** `D:/KLCN/Garage_Management_Work_Sessions/thesis-notes/Chuong_2_Theo_Mau_2025_Bang_Nghiep_Vu.docx`, Markdown đồng bộ cùng tên; bản bàn giao `D:/KLCN/Chuong_2_Theo_Mau_2025_Bang_Nghiep_Vu.docx`. Cấu trúc: 2.1 yêu cầu; 2.2 mô hình hóa nghiệp vụ (BUC và 12 quy trình có a văn bản, b Activity, c tương tác); 2.3 mô hình hóa chức năng (2.3.1 chỉ 1 Use Case hệ thống tổng quát, 2.3.2 các bảng đặc tả); 2.4 lớp mức phân tích; 2.5 kết chương. Bản Word 51 trang, 29 bảng (gồm 12 bảng văn bản nghiệp vụ đóng khung 1 cột 3 hàng theo mẫu PDF), 14 hình đã có và 25 vị trí để trắng (12 tuần tự, 12 cộng tác, 1 lớp); chú thích liên tục 2.1–2.39 gồm cả vị trí trống. Giữ các bản cũ làm lịch sử.
- **Định dạng phần a đã chốt:** Mỗi quy trình tại 2.2.2 phải trình bày phần “a. Bằng văn bản” trong bảng đóng khung ba hàng: tên Use Case và sự kiện bắt đầu; các dòng cơ bản; các dòng thay thế. Không đổi về các đoạn chữ rời. Bản hiện hành có 29 bảng được đánh số liên tục.
- **Quyết định trình bày đã chốt:** SUC chỉ làm căn cứ viết đặc tả, KHÔNG chèn bộ hình SUC; không chèn 12 hình UC phân rã hoặc hình include riêng. Giữ BUC, 12 Activity và 1 UC hệ thống tổng quát. Không tự thêm lại các hình đã bỏ khi Antigravity/Codex tiếp tục chỉnh báo cáo.
- **Vị trí nguồn hình:** BUC tổng quan đang dùng là `D:/KLCN/Garage_Management_Work_Sessions/thesis-notes/chapter2-work/figures/buc.png`; 12 Activity tại `D:/KLCN/Activity`; UC tổng quát tại `D:/KLCN/UC/UC/UC_TongQuat.png`. 11 SUC tại `D:/KLCN/SUC` và 12 UC phân rã còn lại chỉ để tham khảo. `D:/KLCN/BUC` có 10 PNG thao tác chi tiết, ảnh đã kiểm tra là Activity có làn bơi; không phân loại chỉ dựa vào tên thư mục. Manifest và danh sách hình thiếu ở `thesis-notes/chapter2-corrected/`.

- **CẤM dùng "văn phong rào đón của AI Agent" trong báo cáo đồ án:**
  - Tuyệt đối **KHÔNG** viết các câu như: *"Có mã nguồn trong working tree; không suy diễn là đã phát hành"*, *"Việc có code không đồng nghĩa đã nghiệm thu"*, *"Đây là đặc tả mục tiêu, không khẳng định source đã có"*, *"Chưa chứng minh toàn bộ quy trình..."*.
  - Tuyệt đối **KHÔNG** trích dẫn `README.md`, `PROJECT_CONTEXT.md` hay tên file `.sql` nội bộ làm Tài liệu tham khảo học thuật ở cuối chương.
- **Cách diễn đạt chuẩn học thuật Kỹ thuật Phần mềm:**
  - Phân tách rõ thành **Phạm vi chức năng cốt lõi (Core Scope – đã triển khai hoàn chỉnh trong hệ thống)** và **Phạm vi mở rộng / Định hướng phát triển (Extended Scope / Future Work)**.
  - Đa dạng hóa cấu trúc câu giữa các mục để tránh bị phần mềm kiểm tra trùng lặp (Plagiarism / Repetition Check) hoặc AI Detector đánh dấu.
  - Sử dụng đúng thuật ngữ chuyên ngành CNTT tại **Mục 6** của tài liệu này.

---

## 2. TỔNG QUAN KIẾN TRÚC & CÔNG NGHỆ (TECH STACK)

| Thành phần | Công nghệ & Phiên bản | Cổng / Đường dẫn | Ghi chú kiến trúc |
| :--- | :--- | :--- | :--- |
| **Backend API** | Java 17, Spring Boot 3.2.5, Spring Security, JPA/Hibernate, Maven | Port `8080` (`/api/*`, WebSocket `/ws`) | Kiến trúc phân tầng: `Controller -> Service -> Repository -> Entity/DTO`, bọc phản hồi trong `ApiResponse<T>`. |
| **Frontend Web** | React 18, TypeScript, Vite 5, React Router, Axios | Port `3001` (`http://localhost:3001`) | Phục vụ `ADMIN`, `MANAGER`, `FRONT_DESK`, `TECHNICIAN`. Tổ chức theo `src/features/<domain>`, bảo vệ bằng `ProtectedRoute` & `RoleGuard`. |
| **Mobile App** | Flutter / Dart (Material 3 – AutoCare Theme) | Android Emulator (`10.0.2.2:8080/api`) / USB (`127.0.0.1:8080/api` qua `adb reverse`) | Phục vụ `CUSTOMER` (5 tab: Trang chủ, Đặt lịch, Theo dõi, Thông báo, Tài khoản) và `TECHNICIAN` (Quản lý công việc, Tiến độ, Chat sửa chữa). |
| **Database** | Microsoft SQL Server 2022 (Docker container `garage-sqlserver`) | Port `1433` (Volume `garage-sqlserver-data`) | Quản lý giao dịch ACID (`@Transactional`), dùng `BigDecimal` cho tiền tệ, mật khẩu băm `BCrypt`. |
| **Tích hợp ngoài** | **SePay** (VietQR & Webhook), **Firebase (FCM)**, **Google Gemini LLM** | Cấu hình bật/tắt qua biến môi trường `.env` | SePay đối soát thanh toán tự động; FCM đẩy thông báo nền Android; Gemini hỗ trợ Chatbot tư vấn & tạo bản nháp đặt lịch. |

---

## 3. MÔ HÌNH 5 VAI TRÒ & 3 LỚP KIỂM SOÁT BẢO MẬT

### 3.1. Năm vai trò kỹ thuật (Roles)
1. **Quản trị viên hệ thống (`ROLE_ADMIN` / `ROLE_SYSTEM_ADMIN`):** Quản trị toàn cục (chi nhánh, tài khoản, nhân sự, danh mục dịch vụ – phụ tùng, báo cáo toàn hệ thống). Không bị giới hạn bởi phạm vi 1 chi nhánh.
2. **Quản lý chi nhánh (`ROLE_MANAGER` / `ROLE_BRANCH_MANAGER`):** Quản lý nhân sự nội bộ, duyệt phân công kỹ thuật viên (`DA_DUYET`), quản lý nhập/xuất/tồn kho và xem báo cáo trong phạm비 chi nhánh phụ trách.
3. **Nhân viên tiếp nhận (`ROLE_FRONT_DESK` / `ROLE_RECEPTIONIST`):** Xử lý lịch hẹn (xác nhận/hủy), check-in tiếp nhận xe, lập phiếu sửa chữa (gốc & phát sinh), đề xuất phân công (`CHO_DUYET`), lập hóa đơn, thu tiền tại quầy, bàn giao xe và trực Chat hỗ trợ khách hàng / Chat sửa chữa.
4. **Kỹ thuật viên (`ROLE_TECHNICIAN`):** Không tự đăng ký công khai; chỉ xem và cập nhật tiến độ/hạng mục/phụ tùng/chat trên các phiếu sửa chữa thuộc chi nhánh mình và đã có lệnh phân công **`DA_DUYET`**.
5. **Khách hàng (`ROLE_CUSTOMER`):** Tự đăng ký công khai (mặc định luôn gán `ROLE_CUSTOMER`, số điện thoại là tên đăng nhập); quản lý xe cá nhân, đặt lịch, xem dự toán, theo dõi tiến độ, chat tư vấn, xem hóa đơn, thanh toán QR SePay và tra cứu lịch sử các lần sửa đã hoàn tất và thanh toán đầy đủ.

### 3.2. Ba lớp kiểm soát tại Backend
- **Lớp 1 – RBAC (`@PreAuthorize`):** Kiểm tra vai trò từ bảng `NguoiDung -> NguoiDung_VaiTro -> VaiTro`.
- **Lớp 2 – Branch Isolation (`BranchAuthorizationService`):** Ánh xạ `NguoiDung -> NhanVien -> ChiNhanh`. Nhân sự chi nhánh nào chỉ thao tác dữ liệu chi nhánh đó (trả `403 Forbidden` nếu vượt ranh giới).
- **Lớp 3 – Resource Ownership & Assignment Verification:**
  - Khách hàng: Truy vấn dữ liệu luôn gắn điều kiện `KhachHang.MaNguoiDung` từ JWT.
  - Kỹ thuật viên: Truy vấn phiếu sửa chữa luôn kiểm tra tồn tại bản ghi `PhanCong` của chính kỹ thuật viên đó ở trạng thái `DA_DUYET`.

---

## 4. MA TRẬN HIỆN TRẠNG CHỨC NĂNG TOÀN HỆ THỐNG

> Bảng này giúp AI nắm chính xác tính năng nào **đã triển khai trong code** và tính năng nào là **yêu cầu mở rộng (backlog/future work)** khi lập trình hoặc viết báo cáo.

| Mã FR | Phân hệ / Chức năng | Backend (Spring Boot) | Web Frontend (React) | Mobile App (Flutter) | Ghi chú Nghiệp vụ & Báo cáo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR01** | Xác thực, Đăng ký & Hồ sơ cá nhân | **Hoàn thành** (`/api/auth/login`, `/register`, `/me`, `/api/customers/me`) | **Hoàn thành** (`/login`, quản lý phiên JWT) | **Hoàn thành** (`/login`, `/register`, `/account/profile`, offline logout safe) | Đăng ký công khai tạo đồng bộ `NguoiDung` + `ROLE_CUSTOMER` + `KhachHang` trong 1 transaction. Hỗ trợ cờ `hasPin`. |
| **FR02** | Quản trị Chi nhánh, Tài khoản & Danh mục | **Hoàn thành** (`/api/branches`, `/api/admin/users`, `/api/brands`, `/api/services`, `/api/parts`) | **Hoàn thành** (`/app/users`, `/app/brands-models`, lọc chi nhánh) | **Hoàn thành** (Tải chi nhánh, hãng/model, dịch vụ khi đặt lịch/thêm xe) | Danh mục dùng chung toàn hệ thống; đơn giá lấy từ `DichVu.DonGia` và `PhuTung.GiaBan`. |
| **FR03** | Quản lý Nhân sự | **Hoàn thành** (`/api/employees`) | **Hoàn thành** (`/app/employees`) | *Không áp dụng* | Liên kết `NguoiDung (1-1) NhanVien (N-1) ChiNhanh`. |
| **FR04** | Quản lý Khách hàng & Phương tiện (kèm Ảnh xe) | **Hoàn thành** (`/api/customers`, `/api/vehicles`, `/api/vehicles/{id}/image`) | **Hoàn thành** (`/app/customers`, `/app/vehicles`) | **Hoàn thành** (`/vehicles`: thêm/sửa xe, chọn hãng-model, chụp/tải ảnh xe) | Ảnh hồ sơ xe lưu metadata ở bảng `HinhAnhXe` (1-1), file lưu tại `VEHICLE_IMAGES_DIR` (tối đa 8MB). |
| **FR05** | Tra cứu Dịch vụ & Dự toán sơ bộ | **Hoàn thành** (`GET /api/services`, tính dự toán dịch vụ + phụ tùng định mức) | **Hoàn thành** | **Hoàn thành** (Hiển thị 3 tổng dự toán dịch vụ, phụ tùng, tổng cộng) | Dự toán tính từ danh mục chuẩn, chưa trừ tồn kho khi đặt lịch. |
| **FR06** | Đặt lịch hẹn & Điều phối lịch hẹn | **Hoàn thành** (`/api/appointments`, confirm/receive/cancel, STOMP `DAT_LICH`) | **Hoàn thành** (`/app/appointments` có realtime STOMP) | **Hoàn thành** (`/appointments`, `/tracking`, `/tracking/{id}`) | Chọn nhiều dịch vụ (`DatLich_DichVu`), kiểm tra trùng lịch cùng xe, chống chọn giờ quá khứ. |
| **FR07** | Tiếp nhận xe (Check-in từ lịch hẹn) | **Hoàn thành** (`POST /api/reception/check-in/{appointmentId}`) | **Hoàn thành** (Xác nhận & Tiếp nhận từ lịch hẹn) | *Dành cho Web nội bộ* | Tạo `PhieuTiepNhan`, đổi lịch sang `DA_TIEP_NHAN` và cập nhật `Xe.SoKmHienTai` trong 1 transaction. |
| **FR08** | Quản lý Phiếu sửa chữa (Gốc & Phát sinh) | **Hoàn thành** (`/api/repair-orders`, `/api/repair-orders/direct` với `maPhieuCha`) | **Hoàn thành** (`/app/repair-orders`, quản lý dịch vụ/phụ tùng) | **Hoàn thành** (Xem/cập nhật phía Kỹ thuật viên) | Tự động sao chép dịch vụ từ lịch hẹn và phụ tùng định mức sang phiếu sửa chữa khi khởi tạo. |
| **FR09** | Phân công & Phê duyệt Kỹ thuật viên (2 bước) | **Hoàn thành** (`/api/repair-orders/{id}/assignments`, `/assignments/pending`) | **Hoàn thành** (Modal giao việc, Tab chờ duyệt, Duyệt/Từ chối) | **Hoàn thành** (KTV nhận danh sách phiếu đã `DA_DUYET`) | Tiếp tân đề xuất $\rightarrow$ `CHO_DUYET`; Quản lý/Admin duyệt hoặc tự giao $\rightarrow$ `DA_DUYET`. |
| **FR10** | Thực hiện Sửa chữa & Cập nhật Tiến độ | **Hoàn thành** (`/api/technician/repair-orders`, `/progress`, `/items/{itemId}`) | **Hoàn thành** (Xem tiến độ và hạng mục trên Web) | **Hoàn thành** (`/technician`, `/technician/repair-orders/{id}`) | Cập nhật trạng thái hạng mục và tiến độ phiếu (`DANG_SUA` 50%, `HOAN_TAT` 100%). |
| **FR11** | Quản lý Tồn kho & Xuất phụ tùng sửa chữa | **Hoàn thành** (`/api/inventory`, `/api/repair-orders/{id}/parts`) | **Hoàn thành** (Quản lý phụ tùng trong chi tiết phiếu) | *Tác nghiệp qua phiếu* | Xuất phụ tùng trừ `TonKho` ngay lập tức, sinh `GiaoDichKho` (`XUAT_SUA_CHUA` / `HOAN_TRA`). |
| **FR13** | Lập Hóa đơn Quyết toán | **Hoàn thành** (`POST /api/repair-orders/{id}/invoice`, `GET /api/invoices`) | **Đã có trang danh sách và chi tiết hóa đơn** | **Hoàn thành** (`/invoices`, `/invoices/{id}`) | Gộp tự động dịch vụ & phụ tùng từ phiếu gốc và các phiếu con không bị hủy. |
| **FR14** | Thanh toán tại quầy & QR Ngân hàng (SePay) | **Hoàn thành** (`/payment-options`, `/payment-sessions`, `/api/payments/sepay/webhook`) | **Đã có hộp thoại thu tiền tại quầy** | **Hoàn thành** (`/invoices/{id}/payment`, lưu QR, mở MB Bank, poll 5s) | Khóa hóa đơn (`Pessimistic Lock`), phiên QR 15 phút, chống hạch toán lặp qua bảng `GiaoDichSePay`. |
| **FR15** | Bàn giao Phương tiện | **Hoàn thành** (`GET/POST /api/reception/{id}/handover`) | **Hoàn thành** (Panel xác nhận bàn giao trong tiếp nhận) | **Hoàn thành** (Nhận thông báo & mở lịch sử sau bàn giao) | Bắt buộc mọi phiếu không hủy đã `HOAN_TAT` và hóa đơn đã `DA_THANH_TOAN`. Lưu bảng `BanGiaoXe`. |
| **FR16** | Thông báo, Chat Hỗ trợ (AI Bot) & Chat Sửa chữa | **Hoàn thành** (`/api/notifications`, `/api/support-chat`, `/api/repair-chat`, FCM, STOMP) | **Hoàn thành** (`/app/chat`, Tab Trao đổi sửa chữa, Chuông thông báo) | **Hoàn thành** (`/notifications`, `/support-chat`, `/technician/repair-orders/{id}/chat`) | Chat hỗ trợ: `BOT -> WAITING -> HUMAN` (FAQ + Gemini đặt lịch nháp). Chat sửa chữa: theo `MaTiepNhan`, chỉ đọc sau bàn giao. |
| **FR17** | Báo cáo Thống kê & Lịch sử Sửa chữa | **Hoàn thành** (`/api/reports/*`, `/api/repair-history`) | **Hoàn thành** (Dashboards theo từng Role) | **Hoàn thành** (`/account/repair-history`, lọc theo xe, xem chi tiết) | Lịch sử khách hàng chỉ hiển thị các lần tiếp nhận đã `DA_BAN_GIAO` của đúng chủ xe. |
| **FR18** | Khách hàng Duyệt Báo giá Phát sinh Trực tuyến | **Yêu cầu mở rộng (Future Work)** | **Yêu cầu mở rộng** | **Yêu cầu mở rộng** | Hiện đã có phiếu con phát sinh (`/repair-orders/direct`) và trạng thái `CHO_KH_DUYET`, nhưng luồng khách bấm Đồng ý/Từ chối báo giá độc lập là phần mở rộng. |
| **Mở rộng** | Tiếp nhận Khách vãng lai không tạo tài khoản | **Đã chốt đặc tả nghiệp vụ (Chưa code)** | **Chưa triển khai** | *Không dùng Mobile* | Định hướng tạo `NguoiDung` kỹ thuật ẩn (`TrangThai = false`) gắn biển số `Khách vãng lai - <biển số>`, không dùng chung 1 tài khoản `Khách lẻ`. |

---

## 5. CẤU TRÚC DATABASE & TẬP TRẠNG THÁI CHUẨN (SQL SERVER)

### 5.1. Các bảng dữ liệu trọng tâm và Lịch sử Migration
- File schema gốc: `database/GarageSystemDB.sql` / `database/GarageManagementSystem.sql`.
- Các bản cập nhật schema (Migrations) đã áp vào SQL Server local:
  - **Cốt lõi:** `NguoiDung`, `VaiTro`, `NguoiDung_VaiTro`, `ChiNhanh`, `NhanVien`, `KhachHang`, `HangXe`, `ModelXe`, `Xe`, `DichVu`, `PhuTung`, `DichVu_PhuTung`, `TonKho`, `GiaoDichKho`, `DatLich`, `DatLich_DichVu`, `PhieuTiepNhan`, `PhieuSuaChua`, `PhieuSuaChua_DichVu`, `PhieuSuaChua_PhuTung`, `PhanCong`, `TienDoSuaChua`, `HoaDon`, `HoaDon_DichVu`, `HoaDon_PhuTung`, `ThanhToan`, `ThongBao`, `CuocHoiThoai`, `TinNhan`.
  - **V02 (`HinhAnhXe`):** Lưu metadata ảnh đại diện phương tiện (1-1 với `Xe`).
  - **V03 (`ThietBiPush`, `BanGiaoXe`):** Quản lý FCM device token theo người dùng và lưu biên bản xác nhận bàn giao xe (1-1 với `PhieuTiepNhan`).
  - **V04 (`PhienThanhToan`, `GiaoDichSePay`):** Quản lý phiên thanh toán VietQR (15 phút, mã `GAR...`) và biên nhận sự kiện Webhook SePay chống ghi nhận trùng lặp (`Persistable` insert-only).
  - **V05 & V08 (`HoiThoaiHoTro`, `TinNhanHoTro`, `TrangThaiDocHoTro`):** Hệ thống Chat hỗ trợ khách hàng (đã Việt hóa tên bảng/cột ở V08, giữ FK `customerId`/`agentId` trỏ tới `NguoiDung.MaNguoiDung`).
  - **V06 & V07 (`PhongChatSuaChua`, `TinNhanSuaChua`):** Hệ thống trao đổi nội bộ giữa Tiếp tân và Kỹ thuật viên theo lần tiếp nhận (`MaTiepNhan`, đã Việt hóa tên bảng/cột ở V07).

### 5.2. Tập giá trị trạng thái chuẩn (Enums / Statuses)
- **Lịch hẹn (`DatLich.TrangThai`):** `CHO_XAC_NHAN`, `DA_XAC_NHAN`, `DA_TIEP_NHAN`, `DANG_XU_LY`, `HOAN_TAT`, `HUY`.
- **Phiếu tiếp nhận (`PhieuTiepNhan.TrangThai`):** `DA_TIEP_NHAN`, `DANG_XU_LY`, `DA_BAN_GIAO`, `HUY`.
- **Phiếu sửa chữa (`PhieuSuaChua.TrangThai`):** `CHO_XU_LY`, `DA_PHAN_CONG`, `DANG_SUA`, `CHO_KH_DUYET`, `TAM_DUNG`, `HOAN_TAT`, `HUY`.
- **Phân công kỹ thuật (`PhanCong.TrangThai`):** `CHO_DUYET`, `DA_DUYET`, `TU_CHOI`.
- **Hạng mục dịch vụ (`PhieuSuaChua_DichVu.TrangThai`):** `CHO_XU_LY`, `DANG_SUA`, `HOAN_TAT`, `HUY`.
- **Giao dịch kho (`GiaoDichKho.LoaiGiaoDich`):** `NHAP_KHO`, `XUAT_SUA_CHUA`, `HOAN_TRA`, `DIEU_CHINH`.
- **Hóa đơn (`HoaDon.TrangThai`):** `CHUA_THANH_TOAN`, `THANH_TOAN_MOT_PHAN`, `DA_THANH_TOAN`, `HUY`.
- **Phiên thanh toán SePay (`PhienThanhToan.TrangThai`):** `PENDING`, `SUCCEEDED`, `EXPIRED`, `CANCELLED`, `REVIEW_REQUIRED`.
- **Hội thoại hỗ trợ (`HoiThoaiHoTro.TrangThai`):** `BOT`, `WAITING`, `HUMAN`, `RESOLVED`.

---

## 6. TỪ ĐIỂN THUẬT NGỮ CHUẨN CHO BÁO CÁO ĐỒ ÁN (THESIS GLOSSARY)

> Khi **ChatGPT** hoặc **Antigravity** hỗ trợ viết hoặc chỉnh sửa các chương báo cáo Khóa luận tốt nghiệp, bắt buộc dùng cột **Thuật ngữ chuẩn học thuật** bên phải để đảm bảo văn phong chuyên nghiệp và vượt qua kiểm tra đạo văn/trùng lặp:

| Cách viết thô / Dịch máy (CẦN TRÁNH) | Thuật ngữ chuẩn học thuật CNTT (NÊN DÙNG) |
| :--- | :--- |
| *mô hình ngôn ngữ* | **Mô hình ngôn ngữ lớn (Large Language Model – LLM)** / **Trợ lý ảo tích hợp AI (AI Chatbot)** |
| *hợp đồng dữ liệu* | **Đặc tả giao tiếp API (API Contract)** / **Đối tượng truyền tải dữ liệu (Data Transfer Object – DTO)** |
| *cờ cấu hình* | **Tham số cấu hình hệ thống (Configuration Properties / Feature Flags)** |
| *cây phiếu* | **Cấu trúc phân cấp phiếu sửa chữa (phiếu gốc và các phiếu sửa chữa phát sinh / quan hệ cha – con)** |
| *khóa hóa đơn / khóa phòng* | **Cơ chế khóa bản ghi mức giao dịch (Pessimistic / Transaction Locking)** chống xung đột đồng thời (*Race Condition*) |
| *chống ghi lặp / chống hạch toán lặp* | **Đảm bảo tính lũy đẳng (Idempotency / Idempotent Processing)** |
| *trong working tree / trong source* | **Trong kiến trúc mã nguồn hiện hành / Trong phiên bản hệ thống hiện tại** |
| *số km* | **Chỉ số công-tơ-mét (ODO – Odometer)** |
| *kiểm tra vai trò, chi nhánh, chủ sở hữu* | **Kiểm soát truy cập dựa trên vai trò (RBAC)**, **Cô lập dữ liệu theo chi nhánh (Branch Isolation)** và **Xác thực quyền sở hữu tài nguyên (Resource Ownership Verification)** |
| *thành công hoặc hoàn tác cùng nhau* | **Đảm bảo tính toàn vẹn giao dịch (ACID / `@Transactional`)**, thực thi nguyên tử (Atomic) hoặc **hoàn tác (Rollback)** khi gặp lỗi |

---

## 7. NHẬT KÝ CẬP NHẬT TÓM TẮT (CHANGELOG)

- **06/11/2026:** Soạn và kiểm tra bố cục bản Word Chương 4 theo PDF mẫu. Đường dẫn và ảnh còn thiếu ở Mục 1.2.

- **04/11/2026 (chốt lại phạm vi hình):** Bỏ bộ hình SUC/UC phân rã, giữ BUC + 12 Activity + 1 UC tổng quát; đặc tả SUC giữ nguyên, bản hiện hành 51 trang tại Mục 1.2.

- **04/11/2026 (tài liệu khóa luận):** Sắp xếp lại Chương 2 theo mẫu 2025, giữ 38 ảnh/17 bảng, chừa 25 vị trí sơ đồ thiếu; cập nhật bản hiện hành và đường dẫn nguồn hình tại Mục 1.2.

- **02/11/2026 (tài liệu khóa luận):** Chuyển bản Markdown Chương 2 của Antigravity sang Word A4 kèm đủ 11 SUC và 12 Activity do người dùng cung cấp; đồng bộ bản Markdown và đường dẫn bàn giao tại Mục 1.2.

- **02/11/2026:** Khởi tạo file trung tâm `AI_MASTER_CONTEXT.md` hợp nhất toàn bộ ngữ cảnh kỹ thuật, trạng thái Backend/Web/Mobile/DB và bộ quy tắc chuẩn hóa văn phong học thuật cho Chương 2 Khóa luận tốt nghiệp.
- **14/10/2026:** Sửa lỗi đăng xuất Mobile khi mất mạng (chuyển tác vụ hủy FCM push sang chạy nền không chặn xóa JWT storage; đạt 178/178 Flutter tests).
- **13/10/2026:** Hoàn thành tính năng **Lịch sử sửa chữa của Khách hàng** (`GET /api/repair-history`, màn hình `/account/repair-history`), tinh chỉnh kịch bản Chatbot tư vấn (`SUPPORT_BOT_PLAYBOOK.md`) và script kết nối điện thoại thật qua USB (`mobile/connect-usb.ps1`).
- **11/10/2026:** Hoàn thành Việt hóa các bảng SQL Chat hỗ trợ (`V08__support_chat_vietnamese_names.sql`) và Chat sửa chữa (`V07__repair_chat_vietnamese_names.sql`); đồng bộ toàn bộ lên nhánh `main` (599 backend tests pass, 163 Flutter tests pass).
- **09/10/2026:** Hoàn thành tính năng **Trao đổi sửa chữa nội bộ** (`/api/repair-chat`, Web tab & Mobile KTV chat theo `MaTiepNhan`, thông báo chuông Web cho tiếp tân cùng chi nhánh).
- **02/10/2026:** Hoàn thành tính năng **Chat hỗ trợ khách hàng & AI Chatbot** (`/api/support-chat`, chuyển tiếp `BOT -> WAITING -> HUMAN`, gợi ý chi nhánh theo GPS/lịch sử và tạo bản nháp đặt lịch bằng Gemini).
- **01/10/2026:** Hoàn thành luồng **Thanh toán ngân hàng qua VietQR & Đối soát Webhook SePay** (`V04`, tạo phiên QR 15 phút, lưu ảnh QR & mở ứng dụng MB Bank trên Android, xác minh giao dịch Live 2.000đ qua ngrok).
- **22/09/2026 – 29/09/2026:** Hoàn thành **Bàn giao phương tiện** (`BanGiaoXe`), thông báo đẩy **FCM Android** (`ThietBiPush`), màn hình **Hóa đơn khách hàng**, chỉnh sửa hồ sơ/xe và cập nhật tiến độ Kỹ thuật viên trên Mobile.
