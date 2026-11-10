# PROJECT CONTEXT — Garage Management System

## Quét ảnh tại từng trường xe — 28/10/2026

- Theo yêu cầu người dùng, model AutoVision `car_classifier.tflite` 44 MB được đưa trực tiếp vào Git cùng code/metadata/LICENSE; clone mới có sẵn model và không cần chép hoặc tải riêng. Đã bỏ quy tắc ignore model trong `mobile/.gitignore`.
- Mục chụp/chọn ảnh của form chỉ hiển thị **Ảnh xe** để dùng với AutoVision; đã bỏ nội dung giấy đăng kiểm khỏi nhãn, hướng dẫn chọn ảnh và hộp thoại quyền camera.
- Form xe Android có biểu tượng máy ảnh nhỏ bên dưới góc phải của Biển số xe, Số ODO hiện tại và Số khung / VIN. Bấm biểu tượng mở thẳng lựa chọn chụp ảnh hoặc chọn từ thư viện; OCR chỉ đề xuất thông tin của trường đó và vẫn yêu cầu xác nhận trước khi điền.
- Đã bỏ nút quét chung và menu chọn thông tin cần quét. Năm sản xuất nhập thủ công. Xe đã lưu giữ biển số chỉ đọc và khóa biểu tượng quét biển số; ODO/VIN vẫn cho quét. AutoVision hãng/dòng, ảnh hồ sơ và luồng lưu xe giữ nguyên.
- `flutter analyze --no-pub` sạch; 12 test form xe/OCR đạt, gồm fixture TRIP và hai test mới cho camera từng trường, khóa quét biển số xe đã lưu. Chưa chạy/build app Flutter hoặc thử camera/OCR native trên điện thoại.
- Các đường dẫn Agent Pack, checklist, thiết kế Stitch và nhật ký phiên bên ngoài repository tại ổ D: không tồn tại trên máy hiện tại; chưa cập nhật snapshot/nhật ký ngoài repo.

## Quét trường xe từ ảnh trên Android — 26/10/2026

- AutoVision v5.13.0 vẫn chỉ phân loại hãng/dòng. Mobile bổ sung Google ML Kit Text Recognition 0.16.0 để đọc chữ từ ảnh giấy đăng ký, biển số, VIN, đồng hồ ODO hoặc năm sản xuất. Người dùng xác nhận trước khi điền vào form; biển số xe đã tạo vẫn chỉ đọc.
- Parser chỉ nhận VIN 17 ký tự, năm có nhãn sản xuất và ODO rõ tổng km; giá trị mơ hồ phải nhập tay. Ảnh OCR xử lý trên thiết bị, không upload. `Xe`/`HinhAnhXe`, API và RBAC không đổi; lưu vào database chỉ xảy ra khi bấm lưu xe.
- `flutter analyze --no-pub` sạch và 10 test OCR/form xe đạt trước tinh chỉnh cuối để bỏ qua dòng TRIP; fixture TRIP cập nhật chưa chạy lại. Chưa `flutter run`/`flutter build` hay kiểm tra OCR native trên Galaxy Note20 Ultra 5G. Xem `docs/AUTOVISION_MOBILE_INTEGRATION.md`.

## Việt hóa bảng chat hỗ trợ — 11/10/2026

- Đã áp `V08__support_chat_vietnamese_names.sql` vào SQL Server Docker local: `SupportConversation` → `HoiThoaiHoTro`, `SupportMessage` → `TinNhanHoTro`, `SupportReadCursor` → `TrangThaiDocHoTro`; đổi 19 tên cột theo đề xuất.
- Theo yêu cầu người dùng, giữ tên `customerId`/`agentId` và khóa ngoại tới `NguoiDung.MaNguoiDung`. API/DTO, tên class Java và trạng thái BOT/WAITING/HUMAN giữ nguyên; JPA dùng tên SQL mới.
- Fresh install dùng `database/GarageManagementSystem.sql`; DB đã áp V05 cần áp V08 một lần. Không chạy lại schema tổng trên database có dữ liệu. V05 giữ nguyên để lưu lịch sử migration.
- Đã chạy thử migration rồi rollback, sau đó áp thật; so sánh toàn bộ hàng trước/sau đạt, giữ 1 hội thoại, 2 tin nhắn, 2 trạng thái đọc. Các CHECK đều enabled/trusted, FK customerId/agentId đúng NguoiDung.
- 50/50 targeted backend tests đạt, gồm 1 SQL Server integration test đọc/ghi Unicode, history và read cursor với rollback. Số bản ghi sau test vẫn 1/2/2. Chưa E2E web/mobile hoặc gọi Gemini thật.
- Khởi động lại backend với source mới trước khi sử dụng chat. Không commit/push/deploy, không chạy/build Flutter.


## Đổi tên SQL sang tiếng Việt — 11/10/2026

Người dùng duyệt đổi tên bảng và cột. Đã áp V07__repair_chat_vietnamese_names.sql vào GarageManagementSystem trong garage-sqlserver. RepairChatRoom → PhongChatSuaChua; RepairChatMessage → TinNhanSuaChua.

- PhongChatSuaChua: MaTiepNhan, ThoiDiemXoa, MaNguoiXoa.
- TinNhanSuaChua: MaTinNhan, MaTiepNhan, MaNguoiGui, VaiTroNguoiGui, MaChongTrung, NoiDung, ThoiDiemGui.
- Migration dùng transaction, khóa hai bảng và so sánh mọi giá trị trước/sau; giữ nguyên 2 phòng, 8 tin nhắn. Lần chạy đầu bị SQL Server chặn đổi tên cột thuộc CHECK và đã rollback; bản hoàn chỉnh tạo lại các CHECK trong cùng transaction, kiểm tra enabled/trusted đạt. FK, unique chống trùng, identity và index giữ chức năng; tên constraint/index khai báo cũng đổi sang tiếng Việt.
- Cập nhật GarageManagementSystem.sql cho cài mới; giữ V06 là lịch sử, database đã có V06 dùng V07. Local đã áp V07, không chạy lại migration hoặc toàn bộ schema.
- Cập nhật @Table/@Column/@JoinColumn trong hai entity và native SQL của RepairChatLocalIntegrationTest. Tên lớp/thuộc tính Java và JSON API giữ nguyên để web/mobile tương thích.
- 30 tests backend đạt: 15 service, 4 notifier, 7 controller, 4 SQL integration rollback. Kiểm tra gửi/đọc Unicode, retry, unique, phân trang, bàn giao, xóa và thông báo. Chưa kiểm thử E2E UI sau đổi tên. Không chạy/build Flutter, commit/push/deploy.
- Khởi động lại backend trước khi tiếp tục chat. Trong SSMS refresh Tables để thấy tên mới.

**Cập nhật thông báo chat sửa chữa 09/10/2026:** tin mới của thợ báo đến tiếp tân hoạt động cùng chi nhánh qua chuông web (badge/toast), mở đúng phiếu sửa chữa. Dùng bảng ThongBao hiện hữu, không thêm schema. WebSocket riêng sau commit và tải bù mỗi 10 giây; tin cũ không sinh lại thông báo. Khởi động lại backend và tải lại web để thử. 36 targeted backend tests, 4 SQL integration rollback, 3 STOMP tests và web build đạt; chưa thử E2E web/mobile cho thông báo.

> **Ghi chú cho AI Agent**: File này tổng hợp các quyết định kỹ thuật và trạng thái triển khai thực tế. Đọc file này khi bắt đầu session mới để nắm ngữ cảnh mà không cần scan toàn bộ codebase.

## Chat sửa chữa — cập nhật database 09/10/2026

- Người dùng đã duyệt cập nhật và áp database local ngày 09/10. Thêm `database/migrations/V06__repair_chat.sql`, đồng bộ `GarageManagementSystem.sql`, áp thành công vào `GarageManagementSystem` trong `garage-sqlserver` trên volume hiện hữu. Chỉ thêm RepairChatRoom/RepairChatMessage cùng FK, unique retry và index lịch sử.
- `.env` local đã đặt `GARAGE_REPAIR_CHAT_ENABLED=true`; mặc định source vẫn false cho môi trường khác. Backend hiện chưa chạy, người dùng khởi động để nhận cấu hình; không tự chạy/build Flutter.
- 25 backend tests đạt: 15 service, 7 controller, 3 SQL integration rollback. Đã kiểm tra Unicode, idempotency, unique constraint, phân trang, bàn giao chỉ đọc và hard delete + marker. Sau thử hai bảng chat 0 dòng, số dòng các bảng cũ không đổi. Chưa kiểm thử cạnh tranh nhiều transaction hoặc E2E trên hai thiết bị.

### Lịch sử khung code ngày 07/10/2026

- Người dùng thu gọn phạm vi: chat ngay trong lần sửa, không nhóm chi nhánh, không gửi ảnh; lịch sử phiếu/bảo dưỡng chưa làm. Giữ ảnh hồ sơ xe thu nhỏ khi có. Tiếp tân có thể xóa vĩnh viễn nội dung chat đã lưu trữ sau bàn giao.
- Đã có khung backend `/api/repair-chat`, web tab **Trao đổi sửa chữa** trong chi tiết phiếu và mobile `/technician/repair-orders/:id/chat`. Backend kiểm tra role/chi nhánh và phân công DA_DUYET của thợ; khách bị chặn. Các phiếu cùng MaTiepNhan dùng chung phòng, lần tiếp nhận khác có phòng khác.
- Source hỗ trợ phân trang 40 tin, retry idempotency, lấy tin mới mỗi 5 giây khi màn đang mở, gửi chữ tối đa 2000 ký tự, chỉ đọc khi bàn giao. DELETE chỉ FRONT_DESK/ADMIN sau bàn giao, xóa nội dung và giữ dấu người/thời điểm xóa chống tái tạo; không đụng chứng từ hay ảnh xe. Chưa có WebSocket/unread/push cho chat này.
- `GARAGE_REPAIR_CHAT_ENABLED=false` mặc định ngay trong injection; capabilities không đọc các bảng mới. Người dùng đã trả lời **“Chỉ làm khung code, để database duyệt sau”**. Không thêm migration hay sửa schema; SQL đề xuất nằm ngoài repo trong Work Sessions. Không bật cờ trước khi duyệt/áp schema và kiểm thử SQL.
- Kiểm tra: 34 backend targeted tests đạt; 25 Flutter targeted tests đạt, gồm widget ở 390×844; flutter analyze sạch; web build đạt với cảnh báo bundle lớn. Lint web bị chặn do thiếu ESLint config. Chưa chạy/build app Flutter, chưa E2E/SQL thật hoặc kiểm tra giao diện web trong trình duyệt. Chi tiết: `docs/REPAIR_CHAT_SCAFFOLD.md`.

## 1. Môi trường phát triển đã xác minh

### Chat hỗ trợ hướng 1 — 2026-10-02 (đã áp database local)

- Có source `/api/support-chat`, web `/app/chat` dành cho ADMIN/MANAGER/FRONT_DESK, mobile CUSTOMER `/support-chat` qua nút nổi. Chọn chi nhánh, bot FAQ/Gemini tùy chọn, handoff, claim và resolve; chỉ người phụ trách gửi tin khi HUMAN. Không triển khai nhóm nội bộ/chat phiếu sửa chữa.
- Ba entity mới SupportConversation/SupportMessage/SupportReadCursor, không đổi chat legacy. **Đã được duyệt và áp V05__support_chat.sql vào SQL Server local**; schema chuẩn đã đồng bộ. Kiểm tra SQL ghi/đọc Unicode, trạng thái và read cursor đạt, dữ liệu thử đã rollback; số dòng các bảng cũ giữ nguyên. `GARAGE_SUPPORT_ENABLED=false` mặc định; capabilities hoạt động trước migration. Hibernate không tự tạo bảng.
- STOMP private `/user/queue/support-chat` phát invalidation sau commit, client tải bù REST khi reconnect; đọc riêng từng người, idempotency gửi tin/đặt lịch, khóa claim và bỏ kết quả bot đến muộn. Siết allowlist SUBSCRIBE và chặn SEND trực tiếp vào broker. Tin STAFF gửi thông báo/FCM qua module hiện hữu.
- Đặt lịch từ chat dùng lại form mobile trong sheet, xác nhận trước gửi, chi nhánh cố định theo phòng; backend gọi AppointmentService, vẫn chờ tiếp tân xác nhận. Không cho AI ghi DB. FAQ dùng danh mục/giá thật; Gemini chưa kiểm thử với key thật và mặc định tắt.
- Flutter 147 tests đạt, analyze sạch; web build và 2 test STOMP đạt. Targeted backend support/WebSocket đạt; full backend bị dừng khi SQL Server localhost:1433 không kết nối được. Lint web chưa chạy được do repository thiếu cấu hình ESLint. Chưa run/build Flutter hoặc E2E thật. Chi tiết [SUPPORT_CHAT_SETUP.md](SUPPORT_CHAT_SETUP.md).

### Hoàn thiện thanh toán sau rà soát — 2026-10-01

- Tiếp tục công việc 30/09, không khởi tạo lại. GiaoDichSePay triển khai Persistable với isNew luôn true vì receipt chỉ được insert: tránh JPA merge ghi đè receipt có cùng provider ID giữa bước kiểm tra trùng và lưu. Thêm test SQL xác minh INSERT trùng bị từ chối.
- Mobile không hiển thị 0đ khi chưa tải số dư. PaymentException giữ HTTP status; khi 401/403/404 thì xóa phiên/thông tin ngân hàng đang hiển thị và dừng polling; lỗi mạng tạm thời vẫn giữ thông tin và khả năng thử lại.
- Kiểm tra lần tiếp tục: 30 backend tests (14 SePayService, 6 PaymentService, 7 controller, 3 SQL integration), 33 Flutter tests trong module hóa đơn, analyze sạch, diff check đạt. Full suite 492 backend/119 Flutter là kết quả ngày 30/09, không phải full rerun ngày 01/10.
- Docker lúc đầu tắt; người dùng mở lại, đã xác minh SQL sau kiểm thử: invoice #1 của khách #1001, 1.190.000đ, CHUA_THANH_TOAN, 0 payment/session/event thử. Không đổi schema hoặc thêm fixture mới. SePay vẫn disabled vì chưa có tài khoản/key; chưa run/build Flutter, commit/push/deploy hoặc chuyển tiền thật.

### Thanh toán ngân hàng mobile và backend SePay — 2026-09-30

- User chốt triển khai payment backend cùng mobile, bạn cùng nhóm làm web; chưa yêu cầu commit/push. Bỏ phiếu thô TECHNICIAN (chưa triển khai), giữ công việc/tiến độ. Khách duyệt phát sinh trên mobile là yêu cầu riêng đã chốt nhưng chưa làm trong phiên này.
- Luồng hóa đơn: tiếp tân bấm Xuất hóa đơn sau khi phiếu chính/phát sinh hoàn tất, backend tổng hợp, web/mobile đọc chung. API xuất đã có, web vẫn placeholder; chưa bổ sung đầy đủ guard hoàn tất/khóa hạng mục vào InvoiceService trong phiên thanh toán.
- Mobile: `/invoices/:invoiceId/payment`, nút trong chi tiết khi còn nợ, chọn tài khoản nhận cấu hình (MVP một tài khoản), QR/sao chép, trạng thái pending/expired/review/paid. Poll 5 giây khi màn hoạt động, dừng ở nền/dispose/kết quả cuối, tải ngay khi resume; bỏ response cũ khi đổi hóa đơn/session đăng nhập. Giữ navbar 5 tab và route guard CUSTOMER.
- API mới: GET `/api/invoices/{id}/payment-options`, POST `/api/invoices/{id}/payment-sessions` (không body), GET `/api/invoices/{id}/payment-sessions/{sessionId}`. CUSTOMER chính chủ và ADMIN/MANAGER/FRONT_DESK trong phạm vi chi nhánh; TECHNICIAN không có quyền. Amount/account/ownership do server quyết định.
- POST `/api/payments/sepay/webhook` dùng Apikey riêng, constant-time compare, chỉ bật khi cấu hình hợp lệ. Phiên 15 phút, mã GAR + 24 hex, account/environment snapshot. Chỉ credit đúng tiền/receiver/code vào phiên còn hiệu lực; sai/thiếu/thừa/đến muộn lưu đối soát. PK `SEPAY:<environment>:<provider-id>` chống retry, cùng transaction với payment; khóa hóa đơn và refresh sau lock, dùng chung với PaymentService thu ngân.
- Đã được duyệt thêm `PhienThanhToan`/`GiaoDichSePay`, đồng bộ `database/GarageManagementSystem.sql` và áp local `database/migrations/V04__sepay_payment_sessions.sql`. DDL chỉ bổ sung; không reset dữ liệu.
- Đã xác minh tài khoản người dùng cung cấp là khách #1001 và tạo fixture hóa đơn #1 từ phiếu #2002 đã hoàn tất: 1 dịch vụ + 2 phụ tùng, tổng 1.190.000đ, CHUA_THANH_TOAN. Không có phiếu con local nên chưa test gộp phát sinh trong fixture. Sau kiểm thử: 0 payments/sessions/events lưu lại.
- Kiểm tra: Maven toàn bộ **492/492**, 62 suites, gồm 2 SQL Server integration (round trip/replay rollback và invoice locking giữa hai transaction). Loại report QuotationServiceTest cũ không thuộc lần chạy này khi đếm. Flutter **119/119**, analyze sạch, diff check đạt. Chưa chạy/build Flutter hoặc thử trên thiết bị; chưa có tài khoản/key/callback SePay thật, mặc định `SEPAY_ENABLED=false`.
- Tài liệu: `docs/SEPAY_SETUP.md`, `docs/PAYMENT_SEPAY_WEB_HANDOFF.md`, `docs/PAYMENT_TEST_INVOICE_SAMPLE.md`. Hạn chế: chưa UI/API giải quyết đối soát/hoàn tiền; một tài khoản nhận chung; chưa deep link/lưu QR, thông báo payment realtime hoặc invoice export UI web.

### Chỉnh sửa xe CUSTOMER và chẩn đoán phân công — 2026-09-29

- Mobile `/vehicles`: thêm bánh răng cạnh đặt lịch; dùng lại bottom sheet để sửa xe với dữ liệu điền sẵn, PUT `/api/vehicles/{id}`, cập nhật thẻ/ảnh sau khi lưu. Model phụ thuộc hãng, trạng thái tải/lỗi/retry và validation giữ nguyên; lỗi lưu giữ form, đóng form không ghi dữ liệu. Biển số chỉ đọc vì `UpdateVehicleRequest` không có trường này. Màu/VIN trống gửi chuỗi rỗng; năm/ODO để trống giữ giá trị cũ theo contract cập nhật từng trường. Owner/role/branch vẫn do backend kiểm tra.
- Database local trong container `garage-sqlserver`, `GarageManagementSystem.dbo.PhanCong` còn schema cũ gồm `MaQuanLy`, `ThoiGianPhanCong`, default `TrangThai = DA_GIAO`. Thiếu `MaNguoiPhanCong`, `MaNguoiDuyet`, `ThoiGianTao`, `ThoiGianDuyet`, `GhiChu` mà entity hiện dùng. Truy vấn chỉ đọc xác nhận `Invalid column name`; bảng đang rỗng. Đây là lỗi lệch schema local, chưa có log HTTP để khẳng định máy chủ trong ảnh dùng đúng database này.
- Chưa sửa/ap dụng schema hoặc dữ liệu. SQL đề xuất ở `D:/KLCN/Garage_Management_Work_Sessions/2026-09-29_phan-cong-migration-proposal.sql`, cần duyệt trước khi chạy. Script chỉ nhận schema cũ/bảng rỗng, đổi tên hai cột, thêm ba cột/FK người duyệt, đồng bộ default và NOT NULL trạng thái trong transaction; dừng nếu có dữ liệu để tránh tự suy diễn trạng thái cũ.
- Kiểm tra: `flutter analyze --no-pub` sạch; `flutter test --no-pub` 109/109 đạt; 53 test backend thuộc TechnicianAssignmentService/Controller và VehicleService/Controller đạt (service/repository nghiệp vụ được mock trong test). Chưa chạy/build Flutter hoặc kiểm thử gửi phân công/lưu xe thật. Không commit/push/deploy.

### Giao diện trang chủ mobile — 2026-09-26

- Người dùng chọn bố cục tham khảo DatXE với nền sáng, xanh–cam AutoCare. `HomePage` có header, lời chào theo session, banner ảnh xe riêng, lưới 6 tiện ích, thẻ mở lịch hẹn và các thẻ giới thiệu chức năng có thể bấm. Giữ 5 tab và route guard hiện tại; không thêm API hay dữ liệu quảng cáo giả.
- Asset nội bộ `mobile/asset/home_autocare_car.png`, khai báo trong pubspec. Lưới đổi 3 sang 2 cột khi chữ phóng lớn; nội dung giới hạn rộng 640 px trên màn lớn.
- Kiểm tra `flutter analyze --no-pub` sạch, `flutter test --no-pub` 96/96 đạt. Widget tests kiểm tra guest returnTo của 6 tiện ích, layout 320/390/768 px với text scale 2 và 5 tab. Chưa chạy/build Flutter hoặc nghiệm thu thiết bị thật.

- OS: Windows 11 Home (64-bit)
- Java: Oracle JDK `17.0.12`
- Maven: `Apache Maven 3.9.16`
- Node.js: `v24.15.0` | npm `11.12.1`
- Flutter / Dart: `D:\Downloadd\LapTrinhMobile\flutter`
- Git: `2.51.0`

### Mobile cập nhật tiến độ — 2026-09-29

- Form TECHNICIAN thay slider bằng thanh chỉ đọc, tự tính theo trạng thái giống `TechnicianExecutionService.getProgressHistory`: `DANG_SUA` 50%, `HOAN_TAT` 100%, còn lại 0%. Đây là mức quy đổi trạng thái, không phải tỷ lệ hạng mục thực hiện. Form cuộn được khi mở bàn phím.
- Đã kiểm tra 110 Flutter tests, analyze sạch; 35 backend tests thuộc CustomerProgressNotifierTest, TechnicianExecutionServiceTest, NotificationServiceTest đạt. Chưa chạy/build Flutter hoặc tái hiện thông báo trên thiết bị/API thật.
- `CHO_KH_DUYET` đã gọi notifier khi trạng thái thay đổi, gửi đến tài khoản chủ xe đang hoạt động. Mobile lấy lần tải đầu làm baseline nên không phát popup lịch sử khi đổi tài khoản; inbox vẫn tải từ REST. Chưa có API/màn hình duyệt hoặc từ chối phát sinh; đang trao đổi nghiệp vụ với người dùng, chưa triển khai luồng phản hồi.

## 2. Backend Module Status
- Framework: Spring Boot 3.2.5, Java 17.
- **Authentication**: Stateless JWT (JJWT 0.12.5), BCryptPasswordEncoder.
  - `POST /api/auth/register` → public customer registration. Số điện thoại được dùng làm `NguoiDung.TenDangNhap`; backend cố định `ROLE_CUSTOMER`, BCrypt hash mật khẩu và tạo `NguoiDung` + `NguoiDung_VaiTro` + `KhachHang` trong cùng transaction. DTO không nhận role/branch và response không chứa mật khẩu/hash; schema mới không dùng `MaKhachHangCode`.
  - `POST /api/auth/login` → xác thực `tenDangNhap/email` + BCrypt + `trangThai`. Trả JWT với `roles` claim và `hasPin` dựa trên `NguoiDung.MaPinHash`.
  - `GET /api/auth/me` → trả thông tin user hiện tại và `hasPin`.
- **Authorization (RBAC)**: `@EnableMethodSecurity`, `@PreAuthorize("hasRole('...')")`.
  - Convention: `ROLE_SYSTEM_ADMIN`, `ROLE_BRANCH_MANAGER`, `ROLE_RECEPTIONIST`, `ROLE_TECHNICIAN`, `ROLE_CUSTOMER`.
  - Role source: `NguoiDung → NguoiDung_VaiTro → VaiTro` (DB only, never client).
  - Multi-role fully supported.
  - `JwtAuthenticationEntryPoint`: `401 Unauthorized` JSON.
  - `JwtAccessDeniedHandler`: `403 Forbidden` JSON.
- **Branch Authorization**: `BranchAuthorizationService`.
  - Branch source: `NguoiDung → NhanVien → ChiNhanh` (DB only, never client).
  - `SYSTEM_ADMIN` → global access, no branch restriction.
  - `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` → own branch only (403 if cross-branch).
  - `CUSTOMER` → denied from branch-staff endpoints (403 via RBAC).
- **Branch Master Data API**:
  - Base path: `/api/branches` (`GET /api/branches`, `GET /api/branches/{id}`).
  - Controller: `BranchController`, Service: `BranchService`, Repository: `ChiNhanhRepository.findByTrangThaiTrue()`.
  - DTO: `BranchResponse` (maChiNhanh, maChiNhanhCode, tenChiNhanh, diaChi, soDienThoai, email, trangThai, ngayTao).
  - Authorization: `@PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'CUSTOMER')")`.
- **User Management (TASK 06A)**:
  - Base path: `/api/admin/users` (SYSTEM_ADMIN only).
  - DTOs: `UserResponse`, `CreateUserRequest`, `UpdateUserRequest`, `UpdateUserStatusRequest`.
- **Employee Management (TASK 06B)**:
  - Base path: `/api/employees` (SYSTEM_ADMIN: global, BRANCH_MANAGER: own branch).
  - DTOs: `EmployeeResponse`, `CreateEmployeeRequest`, `UpdateEmployeeRequest`, `UpdateEmployeeStatusRequest`.
  - Relationship: `NguoiDung (1-1) NhanVien (N-1) ChiNhanh`.
- **Reports & Statistics Management (TASK 19)**:
  - Base paths: `/api/reports/dashboard`, `/api/reports/revenue`, `/api/reports/appointments`, `/api/reports/repair-orders`, `/api/reports/services`, `/api/reports/parts`, `/api/reports/inventory`, `/api/reports/technicians`, `/api/reports/branches`.
  - Metrics: Doanh thu thực tế (`DA_THANH_TOAN`), số tiền đã thanh toán (`ThanhToan.THANH_CONG`), số tiền chưa thanh toán, breakdown lịch hẹn theo trạng thái, breakdown phiếu sửa chữa theo 7 trạng thái chuẩn, top dịch vụ, top phụ tùng, cảnh báo tồn kho sắp hết, hiệu suất kỹ thuật viên, so sánh chi nhánh.
  - Money precision: Sử dụng `BigDecimal` chuẩn xác, không dùng float/double.
  - Access Control: `SYSTEM_ADMIN` toàn quyền xem mọi chi nhánh; `BRANCH_MANAGER` và nhân viên chỉ xem chi nhánh của mình (`403 Forbidden` nếu cố truy cập chi nhánh khác); `CUSTOMER` bị chặn hoàn toàn (`403 Forbidden`).
  - Validation: Kiểm tra khoảng thời gian `from <= to` (`400 Bad Request` nếu `from > to`).
  - DTOs: `DashboardResponse`, `RevenueReportResponse`, `RevenuePeriodResponse`, `AppointmentReportResponse`, `RepairOrderReportResponse`, `ServiceReportResponse`, `PartReportResponse`, `InventoryReportResponse`, `TechnicianReportResponse`, `BranchReportResponse`.
- **Chat / Realtime Conversation Management (TASK 18)**:
  - Base paths: `/api/conversations`, `/api/conversations/{id}`, `/api/conversations/{id}/messages`, `/api/conversations/{id}/read`.
  - Entities: `CuocHoiThoai`, `TinNhan`.
  - Workflow: Tạo cuộc hội thoại giữa Customer và Garage (gắn phiếu tiếp nhận nếu có) -> Gửi tin nhắn -> Lưu tin nhắn vào DB -> Push realtime event qua WebSocket (`/queue/chat`) đến người nhận -> Đánh dấu đã đọc.
  - Membership & Security: Enforce nghiêm ngặt quyền tham gia cuộc hội thoại. Customer chỉ xem/gửi trong hội thoại của mình (`403 Forbidden` đối với khách khác). Staff chỉ truy cập hội thoại thuộc chi nhánh mình hoặc được phân công. Sender luôn được resolve từ JWT SecurityContext (chống fake senderId).
  - Repositories: `CuocHoiThoaiRepository`, `TinNhanRepository`.
  - DTOs: `CreateConversationRequest`, `SendMessageRequest`, `ConversationResponse`, `ChatMessageResponse`.
- **WebSocket Realtime (TASK 17)**:
  - Base endpoint: `/ws` (STOMP over WebSocket & SockJS fallback).
  - Authentication: `WebSocketAuthChannelInterceptor` intercepts STOMP `CONNECT` frame, validates `Authorization: Bearer <JWT>` header, populates authenticated `Principal` in STOMP session. Unauthenticated or invalid JWT -> rejected.
  - Destinations:
    - User Private: `/user/queue/notifications` (Spring User Destination prefix `/user`, simple broker `/queue`).
    - Branch Topic: `/topic/branches/{branchCode}` (Enforces branch authorization check against `BranchAuthorizationService.isAllowedBranchByCode(branchCode)` on `SUBSCRIBE`).
  - Integration: `NotificationService` calls `WebSocketEventPublisher` to push `RealtimeEvent` to the recipient user destination; wrapped in try-catch to guarantee database persistence safety even if client is offline.
  - Appointment realtime (2026-09-15): `AppointmentService` phát `RealtimeEvent` với `entityType = DAT_LICH` sau khi tạo, hủy, xác nhận, tiếp nhận hoặc cập nhật trạng thái lịch hẹn. Event được gửi tới `/topic/branches/{maChiNhanh}` cho staff đúng chi nhánh và `/user/queue/notifications` của khách hàng liên quan. Frontend web dùng STOMP client tối giản để subscribe và tự cập nhật `/app/appointments`; Flutter tracking/detail tự refresh nền mỗi 8 giây.
  - Classes: `WebSocketConfig`, `WebSocketAuthChannelInterceptor`, `WebSocketEventPublisher`, `RealtimeEvent`.
- **Notification Management (TASK 16)**:
  - Tích hợp tiến độ khách hàng (2026-09-21/22): `CustomerProgressNotifier` được gọi từ `AppointmentService`, `ReceptionService`, `RepairOrderService`, `TechnicianAssignmentService`, `TechnicianExecutionService`. Lưu `ThongBao` cùng transaction, lấy người nhận từ lịch hẹn/chủ xe; bỏ qua tài khoản vô hiệu hóa và trạng thái không đổi. Sau commit mới phát STOMP và FCM async. Phiếu chính `HOAN_TAT` mời đến garage nhận xe; phiếu con hoàn tất không mời nhận toàn bộ xe.
  - Bàn giao riêng: `GET/POST /api/reception/{id}/handover`, ADMIN/MANAGER/FRONT_DESK và kiểm tra chi nhánh phía backend. Yêu cầu mọi phiếu sửa chữa không hủy hoàn tất và hóa đơn thanh toán đầy đủ; lưu người/thời gian/ghi chú ở `BanGiaoXe`, reception `DA_BAN_GIAO`, lịch liên quan `HOAN_TAT`, notification `VEHICLE_HANDED_OVER`. Khóa reception để serialize bàn giao và tạo phiếu sửa chữa; lặp POST trả audit cũ. Web đã có panel trong chi tiết tiếp nhận.
  - Android: `POST_NOTIFICATIONS`, monitor STOMP/poll 30 giây toàn app, baseline chống phát lịch sử, kiểm tra account khi mở inbox và xóa alert khi logout. Có `firebase_core`/`firebase_messaging`, quyền qua FCM khi cấu hình hợp lệ, background notification payload do Android hiển thị. Foreground dùng monitor/local alert; resume chế độ FCM không phát local trùng lô nền. Mobile gọi `POST/DELETE /api/notifications/devices`, xử lý token refresh, rebind tài khoản và revoke trước logout. Backend giữ token theo owner JWT ở `ThietBiPush`, gửi tới token cập nhật trong 60 ngày, xóa token UNREGISTERED. Thiếu FCM vẫn có inbox/local fallback; không hỗ trợ APNs/iOS.
  - Schema được người dùng duyệt sửa: thêm hai bảng trong `database/GarageManagementSystem.sql` và migration thủ công `V03__push_devices_and_vehicle_handover.sql`; chưa áp database đang chạy. FCM chỉ là kênh gửi, không thay SQL Server. Cấu hình qua `GARAGE_PUSH_ENABLED`, `GARAGE_PUSH_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` và file Android google-services.json (không commit secrets). Chưa có project/credentials trong phiên này.
  - Kiểm tra 2026-09-22: 119 backend targeted tests (gồm MVC role/validation), 71 Flutter tests, analyze sạch, build web đạt. Panel web smoke-test API giả lập ở 1280/390px. Lint web chưa chạy được do thiếu ESLint config của repo; bundle có cảnh báo >500 KB. Chưa build/run Flutter, gửi FCM thật, áp migration hoặc kiểm tra khóa SQL thật; push best-effort chưa có durable outbox. Xem [hướng dẫn bàn giao web](HANDOVER_WEB_HANDOFF.md) và [cấu hình/demo FCM](FCM_SETUP.md).
  - Mobile CUSTOMER (2026-09-17): `/notifications` đã thay placeholder bằng danh sách, số chưa đọc từ API, đọc từng mục/đọc tất cả, loading/error/empty/retry và pull-to-refresh. Page -> NotificationGateway/NotificationService -> ApiClient; giữ backend authority, không gửi owner/role/branch. Kết nối STOMP tới `/ws`, subscribe `/user/queue/notifications`, tải lại REST khi có `DAT_LICH` hoặc `THONG_BAO`, khi kết nối lại hoặc app resume; polling dự phòng 30 giây khi màn hình hoạt động. Hủy subscription/timer khi pause/dispose; tuần tự hóa tải và mutation, gộp sự kiện đến trong lúc bận. `flutter analyze` sạch, `flutter test` đạt 56/56 (17 test mới); chưa kiểm thử thiết bị/backend thật.
  - Base paths: `/api/notifications`, `/api/notifications/{id}`, `/api/notifications/unread-count`, `/api/notifications/read-all`.
  - Entities: `ThongBao`.
  - Workflow đã nối: thay đổi lịch hẹn/tiếp nhận/phân công/trạng thái sửa chữa -> lưu thông báo cho khách -> phát event sau commit -> mobile tải inbox và báo mục mới khi app hoạt động -> đánh dấu đã đọc / đọc tất cả. Thông báo trực tiếp từ hóa đơn, thanh toán hoặc báo giá riêng vẫn chưa được nối; trạng thái sửa chữa `CHO_KH_DUYET` có thông báo chờ khách xác nhận.
  - Ownership & Security: Mỗi thông báo thuộc về một người dùng cụ thể (`NguoiDung`). Người dùng chỉ được xem/sửa thông báo của chính mình (`403 Forbidden` khi cố truy cập thông báo của người khác).
  - Repositories: `ThongBaoRepository`.
  - DTOs: `NotificationResponse`, `UnreadCountResponse`.
- **Invoice & Payment Management (TASK 15)**:
  - Base paths: `/api/repair-orders/{repairOrderId}/invoice`, `/api/invoices`, `/api/invoices/{invoiceId}/payments`.
  - Entities: `HoaDon`, `HoaDon_DichVu`, `HoaDon_PhuTung`, `ThanhToan`.
  - Workflow: Tạo hóa đơn từ phiếu sửa chữa (`CHUA_THANH_TOAN`) -> Thu ngân thực hiện thanh toán (Full hoặc Partial Payment) -> Hóa đơn chuyển trạng thái sang `DA_THANH_TOAN` khi đã thanh toán đủ 100%.
  - Pricing & Subtotals: Server tự động tập hợp tất cả dịch vụ và phụ tùng từ `PhieuSuaChua_DichVu` và `PhieuSuaChua_PhuTung`, tính `tongTien = SUM(thanhTien dịch vụ) + SUM(thanhTien phụ tùng)`, `thanhTien = tongTien - giamGia + thue`. Client không thể override giá.
  - Payment Rules: Kiểm tra số tiền `soTien > 0`, không cho thanh toán vượt quá số tiền còn lại (`conLai`), chống idempotency lặp lại mã giao dịch `maGiaoDich`.
  - Duplicate Prevention: Mỗi `PhieuSuaChua` chỉ có duy nhất 1 hóa đơn (Unique constraint / DuplicateResourceException 409 Conflict).
  - Status Protection & Immutability: Không thể thanh toán hoặc sửa đổi hóa đơn đã `DA_THANH_TOAN` hoặc `HUY`.
  - Ownership & RBAC: Customer chỉ được xem hóa đơn và thanh toán thuộc xe của mình (`403 Forbidden` đối với xe khác, không được tự tạo hóa đơn). Staff tuân thủ `BranchAuthorizationService`.
  - Repositories: `HoaDonRepository`, `HoaDonDichVuRepository`, `HoaDonPhuTungRepository`, `ThanhToanRepository`.
  - DTOs: `CreateInvoiceRequest`, `InvoiceResponse`, `InvoiceServiceItemResponse`, `InvoicePartItemResponse`, `CreatePaymentRequest`, `PaymentResponse`.
- **Additional Quotation Management (TASK 14)**:
  - Đối chiếu source và remote main `8832f5f` ngày 2026-09-27: mô tả cũ về `/quotations`, `QuotationController/Service`, `BaoGiaPhatSinh` không khớp source hiện tại. Chưa có API để CUSTOMER xem/duyệt/từ chối báo giá phát sinh; trạng thái sửa chữa `CHO_KH_DUYET` và thông báo không cấp quyền phản hồi.
  - Phiếu phát sinh thực tế: `POST /api/repair-orders/direct` với `maPhieuCha`, chỉ ADMIN/MANAGER/FRONT_DESK. Backend kiểm tra chi nhánh, xe/khách hàng của phiếu cha, reception và tính giá từ dữ liệu server. GET phiếu sửa chữa cũng chỉ dành cho ba role này.
  - CUSTOMER được đọc dự toán tại `GET /api/services`, `GET /api/appointments` và `GET /api/appointments/{id}` theo ownership. Dự toán gồm tiền công, phụ tùng định mức và tổng; backend tính từ danh mục hiện tại khi đọc, chưa lưu snapshot chốt giá.
  - CUSTOMER được xem hóa đơn chính chủ qua `GET /api/invoices` và `GET /api/invoices/{id}`. Khi tạo hóa đơn, backend gộp hạng mục phiếu con trực tiếp không hủy; DTO không phân biệt dòng gốc/phát sinh. Không suy diễn các dòng hóa đơn là báo giá đã được khách duyệt.
  - Mobile: giữ module hóa đơn và trang chủ chưa commit; sửa chi tiết lịch hẹn đọc ba tổng `tongTienDichVuDuKien`, `tongTienPhuTungDuKien`, `tongChiPhiDuKien` trực tiếp từ API, thiếu trường hiển thị “Chưa có dự toán”, giữ 0 đồng hợp lệ. Thêm chú thích báo giá sơ bộ ở đặt lịch/chi tiết; giữ navbar, route và API contract. Không thêm thao tác duyệt/từ chối, không sửa backend/schema/seed.
- **Parts & Inventory Management (TASK 13)**:
  - Base paths: `/api/parts`, `/api/inventory`, `/api/repair-orders/{repairOrderId}/parts`.
  - Parts Catalog: Xem danh mục phụ tùng đang hoạt động (`PhuTung.trangThai = 1`).
  - Branch Inventory: Xem tồn kho phụ tùng theo chi nhánh (`TonKho`), hỗ trợ kiểm tra `BranchAuthorizationService` (SYSTEM_ADMIN: all, BRANCH_MANAGER/RECEPTIONIST/TECHNICIAN: own branch).
  - Add Part to Repair Order: Kiểm tra số lượng tồn kho `TonKho.soLuongTon >= request.soLuong`, kiểm tra trùng lặp (`DuplicateResourceException`), bảo vệ trạng thái kết thúc (`HOAN_TAT`, `HUY` -> 400), tự động trừ tồn kho và ghi nhật ký kiểm toán vào bảng `GiaoDichKho (loaiGiaoDich = 'XUAT_SUA_CHUA')`.
  - Pricing resolution: Server tự resolve đơn giá bán `part.getGiaBan()`, không tin tưởng đơn giá gửi từ client. Tự động tính `thanhTien = donGia * soLuong`.
  - Update Part Quantity: Tính `diff = newQty - oldQty`. Nếu tăng -> trừ thêm tồn kho; nếu giảm -> hoàn trả vào tồn kho; đồng thời ghi nhận `GiaoDichKho` tương ứng.
  - Delete Part: Hoàn trả 100% số lượng phụ tùng về tồn kho chi nhánh, ghi nhật ký `GiaoDichKho (loaiGiaoDich = 'HOAN_TRA')`, sau đó xóa bản ghi khỏi `PhieuSuaChua_PhuTung`.
  - RBAC: `SYSTEM_ADMIN` (all), `BRANCH_MANAGER` / `RECEPTIONIST` (own branch), `TECHNICIAN` (assigned orders only), `CUSTOMER` (403 Forbidden).
  - Repositories: `PhuTungRepository`, `TonKhoRepository`, `PhieuSuaChuaPhuTungRepository`, `GiaoDichKhoRepository`.
  - DTOs: `PartResponse`, `InventoryResponse`, `CreateRepairPartRequest`, `UpdateRepairPartRequest`, `RepairPartResponse`.
  - Relationships: `ChiNhanh (1-N) TonKho (N-1) PhuTung`, `PhieuSuaChua (1-N) PhieuSuaChua_PhuTung (N-1) PhuTung`, `GiaoDichKho (N-1) ChiNhanh, PhuTung, PhieuSuaChua`.
- **Repair Progress / Service Execution (TASK 12)**:
  - Base path: `/api/technician/repair-orders`.
  - `GET /api/technician/repair-orders`: Kỹ thuật viên xem danh sách phiếu sửa chữa được phân công cho mình (thông qua `PhanCong`).
  - `GET /api/technician/repair-orders/{id}` & `/items`: Kỹ thuật viên xem chi tiết và dịch vụ của phiếu sửa chữa mà mình phụ trách.
  - `PATCH /api/technician/repair-orders/{id}/progress`: Ghi nhận tiến độ sửa chữa vào bảng `TienDoSuaChua`, tự động chuyển trạng thái phiếu (`DANG_SUA`, `HOAN_TAT`, `TAM_DUNG`, `CHO_KH_DUYET`) và ghi nhận `thoiGianBatDau` / `thoiGianHoanTat`.
  - `PATCH /api/technician/repair-orders/{id}/items/{itemId}`: Cập nhật trạng thái hạng mục dịch vụ (`CHO_XU_LY`, `DANG_SUA`, `HOAN_TAT`, `HUY`).
  - Cross-technician protection: Kỹ thuật viên T1 không được truy cập/sửa phiếu của T2 dù cùng chi nhánh (403 Forbidden).
  - Status protection: Chặn cập nhật khi phiếu sửa chữa đã ở trạng thái `HOAN_TAT` hoặc `HUY` (400 Bad Request).
  - `TECHNICIAN`: Toàn quyền cập nhật trên các phiếu mình được phân công.
  - `RECEPTIONIST`, `CUSTOMER`: 403 Forbidden.
  - DTOs: `UpdateRepairProgressRequest`, `RepairProgressResponse`, `UpdateServiceItemStatusRequest`.
  - Relationship: `PhieuSuaChua (1-N) TienDoSuaChua (N-1) NhanVien`.
- **Technician Assignment (TASK 11)**:
  - Base path: `/api/repair-orders/{repairOrderId}/assignments`.
  - `POST /api/repair-orders/{repairOrderId}/assignments`: Phân công kỹ thuật viên cho phiếu sửa chữa.
  - Technician validation: Kiểm tra `NhanVien` tồn tại, tài khoản `NguoiDung` active, có vai trò `TECHNICIAN`, và phải cùng thuộc chi nhánh với `PhieuSuaChua` (403 Forbidden nếu khác branch).
  - Status synchronization: Khi phân công, nếu trạng thái phiếu đang là `CHO_XU_LY`, tự động chuyển sang `DA_PHAN_CONG`.
  - Duplicate check: Mỗi kỹ thuật viên chỉ được phân công 1 lần cho cùng 1 phiếu sửa chữa (409 Conflict).
  - Delete assignment: Hủy phân công, nếu không còn phân công nào và trạng thái là `DA_PHAN_CONG` -> tự động chuyển về `CHO_XU_LY`.
  - Status protection: Chặn phân công khi phiếu sửa chữa đã ở trạng thái `HOAN_TAT` hoặc `HUY` (400 Bad Request).
  - `SYSTEM_ADMIN`: Toàn quyền phân công, xem, xóa trên mọi chi nhánh.
  - `BRANCH_MANAGER`: Toàn quyền phân công, xem, xóa thuộc chi nhánh mình.
  - `RECEPTIONIST`, `TECHNICIAN`, `CUSTOMER`: 403 Forbidden.
  - DTOs: `CreateAssignmentRequest`, `AssignmentResponse`.
  - Relationship: `PhieuSuaChua (1-N) PhanCong (N-1) NhanVien`.
- **Service / Repair Items Management (TASK 11)**:
  - Base path: `/api/repair-orders/{repairOrderId}/items`.
  - `POST /api/repair-orders/{repairOrderId}/items`: Thêm dịch vụ vào phiếu sửa chữa.
  - Price resolution: Đơn giá được ưu tiên lấy tự động từ `DichVu.DonGia`, hoặc đơn giá từ request nếu catalog chưa định nghĩa. Schema hiện tại không có bảng `GiaDichVuChiNhanh`; nếu cần bảng giá riêng theo chi nhánh thì phải được duyệt thay đổi schema riêng.
  - Calculation: `ThanhTien = DonGia` theo computed column hiện tại của `PhieuSuaChua_DichVu`. API còn nhận/hiển thị `soLuong` để giữ tương thích DTO nhưng schema chưa lưu số lượng dịch vụ; muốn lưu `SoLuong` thật cần duyệt đổi schema riêng.
  - Duplicate prevention: Mỗi dịch vụ chỉ được xuất hiện tối đa 1 lần trong cùng một phiếu sửa chữa (409 Conflict).
  - Status protection: Chặn thêm/sửa/xóa dịch vụ khi phiếu sửa chữa đã ở trạng thái `HOAN_TAT` hoặc `HUY` (400 Bad Request).
  - `SYSTEM_ADMIN`: Toàn quyền xem, thêm, sửa, xóa trên mọi chi nhánh.
  - `BRANCH_MANAGER`: Toàn quyền xem, thêm, sửa, xóa thuộc chi nhánh mình.
  - `RECEPTIONIST`: Xem và thêm dịch vụ thuộc chi nhánh mình.
  - `TECHNICIAN`, `CUSTOMER`: 403 Forbidden.
  - DTOs: `CreateRepairItemRequest`, `UpdateRepairItemRequest`, `RepairItemResponse`.
  - Relationship: `PhieuSuaChua (1-N) PhieuSuaChua_DichVu (N-1) DichVu`.
- **Repair Order Management (TASK 10)**:
  - Base path: `/api/repair-orders`.
  - `POST /api/repair-orders`: Tạo phiếu sửa chữa từ phiếu tiếp nhận (`PhieuTiepNhan`). Tự động liên kết ChiNhanh từ PhieuTiepNhan.
  - Idempotency & Source validation: Mỗi PhieuTiepNhan chỉ được tạo tối đa 1 PhieuSuaChua (409 Conflict nếu trùng), chặn phiếu tiếp nhận đã hủy (400 Bad Request).
  - `SYSTEM_ADMIN`: Toàn quyền tạo, xem, cập nhật thông tin và trạng thái toàn hệ thống.
  - `BRANCH_MANAGER`: Tạo, xem, cập nhật thông tin và trạng thái thuộc chi nhánh mình (`BranchAuthorizationService.isAllowedBranch`).
  - `RECEPTIONIST`: Tạo và xem phiếu sửa chữa thuộc chi nhánh mình.
  - `TECHNICIAN`, `CUSTOMER`: 403 Forbidden.
  - Status management: `CHO_XU_LY`, `DA_PHAN_CONG`, `DANG_SUA`, `CHO_KH_DUYET`, `TAM_DUNG`, `HOAN_TAT`, `HUY`. Chặn chuyển trạng thái khi đã kết thúc (HOAN_TAT, HUY).
  - DTOs: `CreateRepairOrderRequest`, `UpdateRepairOrderRequest`, `UpdateRepairOrderStatusRequest`, `RepairOrderResponse`.
  - Relationship: `PhieuTiepNhan (1-1) PhieuSuaChua (N-1) ChiNhanh`.
- **Reception / Check-in (TASK 09)**:
  - Base path: `/api/reception`.
  - `POST /api/reception/check-in/{appointmentId}`: Check-in tiếp nhận xe từ lịch hẹn. Tạo `PhieuTiepNhan`, cập nhật `DatLich.trangThai -> DA_TIEP_NHAN`, cập nhật `Xe.soKmHienTai` trong 1 transaction.
  - `SYSTEM_ADMIN`: Toàn quyền check-in, xem phiếu tiếp nhận toàn hệ thống.
  - `RECEPTIONIST`: Check-in và xem phiếu tiếp nhận thuộc chi nhánh mình (`BranchAuthorizationService.isAllowedBranch`). Chặn cross-branch (403 Forbidden).
  - `BRANCH_MANAGER`: Xem danh sách & chi tiết phiếu tiếp nhận thuộc chi nhánh mình.
  - `TECHNICIAN`, `CUSTOMER`: 403 Forbidden.
  - Validations & Idempotency: Không cho tiếp nhận lịch hẹn đã hủy (400), không cho tiếp nhận trùng / duplicate phiếu (409), nhân viên tiếp nhận lấy tự động từ JWT SecurityContext.
  - DTOs: `CheckInRequest`, `ReceptionResponse`.
  - Relationship: `DatLich (1-1) PhieuTiepNhan (N-1) NhanVien, ChiNhanh, Xe`.
- **Appointment Management (TASK 08)**:
  - Base path: `/api/appointments`.
  - `SYSTEM_ADMIN` → danh sách toàn bộ, xem bất kỳ, tạo (có thể chỉ định `maKhachHang`), hủy bất kỳ.
  - `BRANCH_MANAGER`, `RECEPTIONIST` → danh sách thuộc chi nhánh mình (`BranchAuthorizationService.resolveUserBranchId`), xem/hủy lịch hẹn thuộc chi nhánh mình (403 nếu cross-branch).
  - `CUSTOMER` → danh sách lịch hẹn của mình, xem/hủy lịch hẹn của mình (403 nếu truy cập của khách khác). Tạo lịch hẹn: owner tự động trích xuất từ JWT, bắt buộc `Xe` thuộc quyền sở hữu của mình (403 nếu đặt xe người khác).
  - `TECHNICIAN` → 403 Forbidden.
  - Validation: thời gian hẹn không ở quá khứ (400), chi nhánh phải hoạt động (400), chống trùng lịch hẹn cho cùng xe tại cùng thời điểm (409).
  - Cancel status: chỉ cho phép hủy khi trạng thái là `CHO_XAC_NHAN` hoặc `DA_XAC_NHAN`. Trạng thái khác hoặc đã hủy trước đó trả về 400 Bad Request.
  - DTOs: `AppointmentResponse`, `CreateAppointmentRequest`.
  - Relationship: `NguoiDung (1-1) KhachHang (1-N) Xe (1-N) DatLich (N-1) ChiNhanh`.
- **Vehicle Management (TASK 07)**:
  - Base path: `/api/vehicles`.
  - Danh mục xe: `GET /api/brands` và `GET /api/brands/{brandId}/models`; `CreateVehicleRequest` bắt buộc `maHangXe` và `maModel` khớp quan hệ hãng-model.
  - `SYSTEM_ADMIN` → danh sách toàn bộ, CRUD bất kỳ xe. Khi tạo xe phải cấp `maKhachHang`.
  - `CUSTOMER` → chỉ thấy/sửa/xóa xe của chính mình. Owner tự động từ JWT — client không được gửi `customerId` để xác định owner.
  - Cross-customer: CUSTOMER A truy cập xe CUSTOMER B → 403 Forbidden (query thẳng theo owner — không filter Java).
  - DELETE: nếu xe đã có `DatLich`/`PhieuTiepNhan` → database constraint sẽ chặn → trả 400 Bad Request (không cascade delete).
  - DTOs: `VehicleResponse`, `CreateVehicleRequest`, `UpdateVehicleRequest`.
  - Relationship: `NguoiDung (1-1) KhachHang (1-N) Xe`.
- **Customer Management (TASK 06C)**:
  - Base path: `/api/customers`.
  - Self-service: `/api/customers/me` (CUSTOMER & SYSTEM_ADMIN).
  - Admin management: `/api/customers` (SYSTEM_ADMIN only).
  - Customer Ownership: CUSTOMER chỉ được xem/sửa profile của chính mình qua `JWT → NguoiDung → KhachHang`. Cố ý truy cập profile khách hàng khác bị trả về 403 Forbidden.
  - DTOs: `CustomerResponse`, `CreateCustomerRequest`, `UpdateCustomerRequest`, `UpdateCustomerStatusRequest`.
  - Relationship: `NguoiDung (1-1) KhachHang`.
  - Schema hiện tại không có `MaKhachHangCode`; backend customer/vehicle/appointment/reception/repair-order response dùng `maKhachHang` làm định danh khách hàng.
- **Khách vãng lai không tạo tài khoản (BUSINESS DECISION — PLANNED, 2026-09-09)**:
  - Khách không bắt buộc đăng ký mobile. Nhân viên tiếp nhận sẽ tra cứu theo biển số; nếu chưa có xe thì tạo một hồ sơ khách vãng lai riêng với tên mặc định `Khách vãng lai - <biển số>` và chỉ bổ sung dữ liệu thật mà khách đồng ý cung cấp.
  - Không dùng một tài khoản `Khách lẻ` chung. Với schema hiện tại bắt buộc `KhachHang.MaNguoiDung`, backend dự kiến tạo một `NguoiDung` kỹ thuật duy nhất cho từng hồ sơ vãng lai, sinh username/mật khẩu ở server, BCrypt hash mật khẩu, gán `ROLE_CUSTOMER` để giữ quan hệ dữ liệu và đặt `TrangThai = false` để không đăng nhập.
  - Biển số là khóa tra cứu nghiệp vụ nhưng không đủ để tự động xác nhận chủ sở hữu. Khi xe đã tồn tại, nhân viên phải đối chiếu trước khi dùng lại; không tự gộp hồ sơ hoặc lộ dữ liệu cá nhân.
  - Luồng phải chạy qua API nội bộ dành cho `FRONT_DESK`/`MANAGER`/`ADMIN`, enforce branch isolation và transaction cho khách + xe + lịch/tiếp nhận. Source hiện chưa triển khai: `POST /api/appointments` chưa cho `FRONT_DESK`, còn check-in đang bắt buộc `appointmentId`.
  - Khách vãng lai không dùng thông báo/duyệt báo giá trên mobile; các xác nhận tại quầy hoặc qua kênh liên hệ phải được audit. Cần luồng chuyển đổi an toàn nếu khách đăng ký sau này để giữ nguyên lịch sử.
- **Test suite**: `mvn test` → **76/76 tests PASS**.

## 3. Repositories
| Repository | Entity | Key Queries |
|---|---|---|
| `NguoiDungRepository` | `NguoiDung` | `findByTenDangNhap`, `findByEmail`, `findByTenDangNhapOrEmail`, `existsByTenDangNhap`, `existsByEmail` |
| `NguoiDungVaiTroRepository` | `NguoiDungVaiTro` | `findByNguoiDungMaNguoiDung`, `deleteByNguoiDungMaNguoiDung`, `countActiveUsersByRoleName` |
| `VaiTroRepository` | `VaiTro` | `findByTenVaiTro` |
| `ChiNhanhRepository` | `ChiNhanh` | `findByTrangThaiTrue` |
| `NhanVienRepository` | `NhanVien` | `findByNguoiDungMaNguoiDung`, `findByChiNhanhMaChiNhanh`, `existsByNguoiDungMaNguoiDung` |
| `KhachHangRepository` | `KhachHang` | `findByNguoiDungMaNguoiDung`, `existsByNguoiDungMaNguoiDung` |
| `XeRepository` | `Xe` | `findByKhachHangMaKhachHang`, `findByMaXeAndKhachHangMaKhachHang`, `existsByBienSo`, `existsBySoVIN` |
| `DatLichRepository` | `DatLich` | `findByKhachHangMaKhachHang`, `findByChiNhanhMaChiNhanh`, `findByMaDatLichAndKhachHangMaKhachHang`, `existsByXeMaXeAndThoiGianHenAndTrangThaiNotIn` |
| `PhieuTiepNhanRepository` | `PhieuTiepNhan` | `findByChiNhanhMaChiNhanh`, `findByXeMaXe`, `existsByDatLichMaDatLich`, `findByDatLichMaDatLich` |
| `PhieuSuaChuaRepository` | `PhieuSuaChua` | `findByChiNhanhMaChiNhanh`, `findByPhieuTiepNhanMaTiepNhan`, `existsByPhieuTiepNhanMaTiepNhan` |
| `PhieuSuaChuaDichVuRepository` | `PhieuSuaChuaDichVu` | `findByPhieuSuaChuaMaPhieuSuaChua`, `existsByPhieuSuaChuaMaPhieuSuaChuaAndDichVuMaDichVu`, `findByMaChiTietAndPhieuSuaChuaMaPhieuSuaChua` |
| `PhanCongRepository` | `PhanCong` | `findByPhieuSuaChuaMaPhieuSuaChua`, `existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienMaNhanVien`, `findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua`, `countByPhieuSuaChuaMaPhieuSuaChua`, `findByNhanVienMaNhanVien` |
| `TienDoSuaChuaRepository` | `TienDoSuaChua` | `findByPhieuSuaChuaMaPhieuSuaChuaOrderByThoiGianDesc` |
| `DichVuRepository` | `DichVu` | `findByTrangThaiTrue` |

## 4. Database
- Schema: `database/GarageManagementSystem.sql` (SQL Server DDL — single source of truth. **KHÔNG sửa nếu chưa được duyệt**).
- Docker init thực thi `GarageManagementSystem.sql` và sau đó `database/seed/V01__development_seed.sql` chỉ khi database chưa tồn tại. Nếu volume đã có database, entrypoint bỏ qua khởi tạo để bảo toàn dữ liệu.
- Cảnh báo đồng bộ: Schema nguồn hiện có 32 bảng và không có `GiaDichVuChiNhanh`, `MaChiNhanhCode`, `MaNhanVienCode`. Seed development và code service/repair-item phải bám theo `DichVu.DonGia`; mọi nhu cầu bảng giá chi nhánh hoặc số lượng dịch vụ lưu bền vững cần duyệt đổi schema riêng.

## 5. Nhật ký tiến độ
- **TASK 01** (COMPLETED): Project Foundation.
- **TASK 02** (COMPLETED): Database Mapping — 35 JPA Entities.
- **TASK 03** (COMPLETED): Authentication / JWT.
- **TASK 03.1** (COMPLETED): Development Seed Data & Auth Validation.
- **TASK 04** (COMPLETED): Authorization / RBAC.
- **TASK 05** (COMPLETED): Branch Authorization.
- **TASK 06A** (COMPLETED): User Management (`NguoiDung`).
- **TASK 06B** (COMPLETED): Employee Management (`NhanVien`).
- **TASK 06C** (COMPLETED): Customer Management (`KhachHang`) — 76/76 tests PASS.
- **TASK 07** (COMPLETED): Vehicle Management (`Xe`) — 101/101 tests PASS.
- **TASK 08** (COMPLETED): Appointment Management (`DatLich`) — 132/132 tests PASS.
- **TASK 09** (COMPLETED): Reception / Check-in (`PhieuTiepNhan`) — 151/151 tests PASS.
- **TASK 10** (COMPLETED): Repair Order Management (`PhieuSuaChua`) — 174/174 tests PASS.
- **TASK 11** (COMPLETED): Technician Assignment (`PhanCong`) — 215/215 tests PASS.
- **EXTRA TASK** (COMPLETED): Service / Repair Items Management (`PhieuSuaChua_DichVu`) — 195/195 tests PASS.
- **TASK 12** (COMPLETED): Repair Progress / Service Execution (`TienDoSuaChua`) — 234/234 tests PASS.
- **TASK 13** (COMPLETED): Parts / Inventory Management (`PhuTung`, `TonKho`, `PhieuSuaChua_PhuTung`, `GiaoDichKho`) — 263/263 tests PASS.
- **TASK 14** (COMPLETED): Additional Quotation (`BaoGiaPhatSinh`, `BaoGiaPhatSinh_DichVu`, `BaoGiaPhatSinh_PhuTung`) — 280/280 tests PASS.
- **TASK 15** (COMPLETED): Invoice / Payment (`HoaDon`, `HoaDon_DichVu`, `HoaDon_PhuTung`, `ThanhToan`) — 298/298 tests PASS.
- **TASK 16** (COMPLETED): Notification Management (`ThongBao`) — 313/313 tests PASS.
- **TASK 17** (COMPLETED): WebSocket Realtime (`WebSocketConfig`, `WebSocketAuthChannelInterceptor`, `WebSocketEventPublisher`) — 326/326 tests PASS.
- **TASK 18** (COMPLETED): Chat / Realtime Conversation (`CuocHoiThoai`, `TinNhan`) — 341/341 tests PASS.
- **TASK 19** (COMPLETED): Reports & Statistics (`ReportService`, `ReportController`) — 357/357 tests PASS.
- **FRONTEND TASK 01** (COMPLETED): Frontend Foundation (React 18, TypeScript, Vite, Router, JWT Auth, API Client, Layout Foundation) — PASS.
- **FRONTEND TASK 02** (COMPLETED): Authentication UI & User Experience (AutoCare Theme, Login UX, Show/Hide Password, User Dropdown, Role Navigation, Dashboard KPIs) — PASS.
- **FRONTEND TASK 03** (COMPLETED): Dashboard & Real Data Integration (Role-Specific Dashboards for Admin, Manager, Receptionist, Technician, Customer; Backend `/api/reports/*`, `/api/vehicles`, `/api/appointments`) — PASS.
- **FRONTEND TASK 05** (COMPLETED): User / Employee / Customer Management (Full CRUD interfaces, dynamic filters, detail & form modals, status toggles, branch constraints, RoleGuard protection for `/app/employees`, `/app/customers`, `/app/users`) — PASS.
-**FRONTEND TASK 06** (COMPLETED): Vehicle Management (Full CRUD interfaces, customer ownership isolation, license plate & VIN validation, detail & form & delete modals, RoleGuard protection for `/app/vehicles` for `ROLE_ADMIN` & `ROLE_CUSTOMER`) — PASS.
- **FRONTEND TASK 07** (COMPLETED): Appointment Management (role-scoped list and KPIs, search/status/branch/date filters, detail modal backed by `GET /api/appointments/{id}`, create flow for `ROLE_ADMIN`/`ROLE_CUSTOMER`, cancel/confirm/receive theo quyền backend, loading/error/empty states, Customer & Branch isolation, RoleGuard protection for `/app/appointments` for `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_FRONT_DESK`, `ROLE_CUSTOMER`) — frontend production build PASS; repository ESLint script is currently missing an ESLint configuration.
- **FRONTEND TASK 09** (COMPLETED): Repair Order Management & Technician Assignment (List & KPIs, search, branch/status filters, Detail modal with services, parts, assignment history & totals; Technician Assignment modal with role workflow: Manager/Admin $\rightarrow$ auto approved `DA_DUYET`, Receptionist `ROLE_FRONT_DESK` $\rightarrow$ pending approval `CHO_DUYET`; Pending assignments review tab for Manager/Admin with Approve and Reject modals; Technician view via `/api/technician/repair-orders` strictly restricted to `DA_DUYET` assignments; RoleGuard protection for `/app/repair-orders` for `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_FRONT_DESK`, `ROLE_TECHNICIAN`) — frontend production build PASS.
- **INFRASTRUCTURE TASK 01** (COMPLETED): Docker Development Environment (Docker Compose orchestration, multi-stage Spring Boot Dockerfile, React/Vite dev Dockerfile, MS SQL Server 2022 container with schema-only initialization via entrypoint script, named volume persistence `garage-sqlserver-data`, bridge network `garage-network`) — PASS.
- **MOBILE CUSTOMER REGISTRATION & LOGIN PIN STATE** (COMPLETED): Public `/api/auth/register`, fixed `ROLE_CUSTOMER`, BCrypt + transactional account/profile creation without `MaKhachHangCode`, Flutter registration screen and login handoff, `/api/auth/login` and `/api/auth/me` expose `hasPin` from `NguoiDung.MaPinHash` — 87 targeted backend tests PASS, backend compile PASS, 6 Flutter tests PASS, `flutter analyze` clean.
- **MOBILE APPOINTMENT SERVICE SELECTION & REPAIR ORDER AUTO-COPY** (COMPLETED):
  - **Backend**:
    - `DatLichDichVuRepository` mapping `DatLich_DichVu`.
    - `ServiceController` (`GET /api/services`, `GET /api/services/{id}`) exposing active service catalog for all authenticated roles.
    - `CreateAppointmentRequest` & `AppointmentResponse` updated with `maDichVuList` and `dichVu` list.
    - `AppointmentService`: Validates service existence, active state, deduplicates IDs, saves `DatLich_DichVu` in transaction, and returns mapped services.
    - `RepairOrderService`: Automatically copies pre-selected services from `DatLich_DichVu` to `PhieuSuaChua_DichVu` (with server-side catalog prices) and standard parts from `DichVu_PhuTung` to `PhieuSuaChua_PhuTung` on repair order creation (idempotent, no inventory deduction at booking/creation stage).
    - 400/400 backend unit/integration tests PASS.
  - **Mobile (Flutter)**:
    - `ServiceOption` & `AppointmentServiceItem` models added to `appointment_models.dart`.
    - `AppointmentService` fetches `/services` in `loadBookingOptions` and transmits `maDichVuList` on `createAppointment`.
    - `AppointmentBookingPage`: Interactive, optional "Dịch vụ muốn thực hiện" section with multi-selection, deselection, pricing and estimated duration display, and selected services summary.
    - `AppointmentDetailPage`: Displays "Dịch vụ đã chọn" list or a friendly "Chưa chọn dịch vụ" status.
    - All 56 Flutter unit/widget tests PASS, `flutter analyze` clean.

## 6. Frontend Status & Architecture
- **Framework & Build**: React 18, TypeScript, Vite 5 (`frontend/`).
- **Ports & Endpoints**:
  - Frontend Port: `3001` (`http://localhost:3001/`)
  - Backend Port: `8080`
  - REST API Base URL: `http://localhost:8080/api`
  - WebSocket URL: `http://localhost:8080/ws`
- **Design System**: AutoCare Multi-Branch (`AUTO-GARAGE-UI-SUGGESTION/autocare_multi_branch/DESIGN.md`), Inter font, Material Symbols Outlined, Deep Blue (`#00236f`/`#1e3a8a`), Industrial Slate (`#334155`), Action Orange (`#fd761a`), clean surface backgrounds.
- **Authentication & Security**:
  - `ITokenStorage` (default: `localStorage`) + safe JWT claims parser.
  - `AuthContext` + `useAuth()` hook managing login, logout, user profile hydration via `GET /api/auth/me`.
  - `ProtectedRoute` enforcing authentication redirect to `/login`.
  - `RoleGuard` enforcing role-based permissions (`ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_FRONT_DESK`, `ROLE_TECHNICIAN`, `ROLE_CUSTOMER`) redirecting to `/unauthorized`.
- **Management Modules**:
  - **Repair Order Management & Technician Assignment (FE09)** (`/app/repair-orders`): Connected to `/api/repair-orders` (`GET`, `POST`, `PUT`, `PATCH /status`), `/api/repair-orders/{id}/assignments`, `/api/repair-orders/assignments/pending`, `/api/repair-orders/{id}/items`, `/api/repair-orders/{id}/parts`, `/api/technician/repair-orders`. Real data, Bento KPI cards (Total, In Progress, Waiting, Pending Approval), search by plate/name/phone/code/model, status & branch filters, Detail modal (services table, parts table, technician assignments list, total cost), Assign Technician modal with role notice (Manager auto-approved `DA_DUYET`, Receptionist pending approval `CHO_DUYET`), Pending assignments tab for Managers/Admins with Approve and Reject modals, Technician execution view (`DA_DUYET` only), RoleGuard protection for `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_FRONT_DESK`, `ROLE_TECHNICIAN`.
  - **Appointment Management (FE07)** (`/app/appointments`): Connected to `/api/appointments` (`GET`, `POST`, `PATCH /cancel`, `PATCH /confirm`, `PATCH /receive`, `PATCH /status`) and `/api/branches`. Real data, Bento KPI cards (Total, Pending, Confirmed, Completed), search by plate/name/phone/code, status/branch/date filters, Appointment Detail modal, Create Appointment modal (for Admin & Customer), Confirm Appointment action (`DA_XAC_NHAN` for Admin/Receptionist/Manager), Receive Appointment action (`DA_TIEP_NHAN` for Admin/Receptionist/Manager), Cancel Appointment modal (`/api/appointments/{id}/cancel`), RoleGuard protection.
  - **Vehicle Management (FE06)** (`/app/vehicles`): Connected to `/api/vehicles`. Role-aware CRUD (Admin: global system vehicles + assign customer; Customer: own vehicles only). Search, brand and status filters, Detail modal, Create/Edit modals with plate/VIN validation, Delete modal, KPI cards.
  - **Brand & Model Management** (`/app/brands-models`): Connected to `/api/brands` and `/api/brands/{id}/models`. Cascading dropdown and brand/model management for Admin and Manager.
  - **Employee Management** (`/app/employees`): Connected to `/api/employees`. Search, branch & role filters, Create/Edit modals with branch rules (Branch Managers cannot transfer branches), Status modal, KPI metrics.
  - **Customer Management** (`/app/customers`): Connected to `/api/customers` and `/api/vehicles`. Search, status filters, Create/Edit modals, Customer vehicles list, Status modal.
  - **User & Permissions Management** (`/app/users`): Connected to `/api/admin/users`. Multi-role selection, username & BCrypt password creation, SYSTEM_ADMIN safety constraints, status toggles.
- **Dashboards & Real Data**:
  - `reportService` & `customerDashboardService` connected to live Spring Boot APIs.
  - Role-specific dashboard views (`AdminDashboard`, `ManagerDashboard`, `ReceptionistDashboard`, `TechnicianDashboard`, `CustomerDashboard`).
  - Skeleton loading state (`DashboardSkeleton`) & graceful error retry without layout jumping.
- **Navigation & Layout**:
  - Fixed 240px Industrial Slate Sidebar with role-based navigation filtering.
  - Top Navigation Header with system title, search bar, notification bell with unread dot, and user profile dropdown with logout.
  - Responsive layout with mobile drawer toggle and overlay backdrop.

## 7. Mobile App Status

- **Hóa đơn CUSTOMER (2026-09-25)**: `features/invoices` gồm model, `InvoiceGateway`/`InvoiceService` qua `ApiClient`, màn danh sách/chi tiết. Tài khoản → Hóa đơn của tôi → `/invoices` → `/invoices/{id}`; giữ navbar 5 mục, chọn Tài khoản. Guest login với `returnTo`; TECHNICIAN về `/technician`. Route gắn key theo session.
- Chỉ dùng `GET /api/invoices` và `GET /api/invoices/{id}`. `InvoiceResponse` đã kèm `services`, `parts`, `payments`; lịch sử và các khoản tiền hiển thị từ cùng response, không gọi riêng `/payments`. Giữ trạng thái backend, không suy ra từ số tiền; hiển thị cả giao dịch thất bại. Có loading/error/retry/empty/pull-to-refresh; tải lại danh sách khi quay về từ chi tiết; xóa dữ liệu cũ khi tải lỗi, bỏ qua response cũ/dispose. Không đổi backend/schema/seed, không thanh toán online.
- Xác minh phiên hóa đơn: `flutter analyze` sạch, `flutter test` **93/93**, gồm **22 test mới** cho API/model, UI, refresh, phản hồi đến muộn, màn hình hẹp và router/session. Chưa chạy/build Flutter hoặc kiểm thử API thật trên thiết bị.
- **Nền tảng**: Flutter app dùng chung cho `ROLE_CUSTOMER` và `ROLE_TECHNICIAN`, tổ chức theo `app/core/features/shared`.
- **Foundation đã có**:
  - AutoCare Material 3 theme theo Deep Blue / Orange design direction.
  - Splash screen toàn màn hình dùng `mobile/asset/screen.png`, có loading state và thời gian hiển thị tối thiểu 1,6 giây trong lúc khôi phục session.
  - Guest home không yêu cầu đăng nhập ngay khi mở app.
  - Màn hình `/register` trước đăng nhập bám AutoCare design: họ tên, số điện thoại, email tùy chọn, mật khẩu, điều khoản; có validation/loading/error/success. Sau đăng ký, app chuyển sang login và điền sẵn số điện thoại.
  - Đăng ký thật qua `POST /api/auth/register`; số điện thoại là tên đăng nhập. Role khách hàng do backend gán cố định, không do mobile gửi.
  - Đăng nhập thật qua `POST /api/auth/login`, JWT lưu bằng secure storage và kiểm tra session qua `GET /api/auth/me`; cả hai luồng đều lưu trạng thái `hasPin` để chuẩn bị màn PIN sau đăng nhập.
  - Role đọc từ claim `roles` để điều hướng customer/technician; backend vẫn là authority cho RBAC, branch và ownership.
  - Các route cá nhân yêu cầu đăng nhập và bảo toàn route đích qua tham số `returnTo`.
- **API base URL (09/10/2026)**: mặc định `http://10.0.2.2:8080/api` để Android Emulator chỉ cần `flutter run`; web dùng localhost. Profile điện thoại thật USB vẫn truyền `http://127.0.0.1:8080/api` và thiết lập adb reverse. Môi trường khác override bằng `--dart-define=API_BASE_URL=...`. Backend phải chạy trên máy tính, Docker SQL Server riêng không cung cấp API.
- **Android emulator graphics**: AVD `Pixel_10_Pro_XL` Android 17/API 37, page size 16 KB có thể bị SurfaceView đen dù Flutter widget tree và Dart VM vẫn hoạt động. Android debug manifest tắt Impeller để dùng Skia fallback. Ngày 2026-09-11, Android Studio đã ghi AVD trở lại `hw.gpu.mode=auto` và bật Fast Boot, làm lỗi tái diễn kèm ADB mất thiết bị; đã đặt `hw.gpu.mode=software`, `fastboot.forceColdBoot=yes`, `fastboot.forceFastBoot=no`, cold boot và xác minh launcher cùng AutoCare render bình thường. Bản release giữ renderer mặc định.
- **Customer feature screens**: `/vehicles` đã dùng `GET/POST /api/vehicles` để xem và thêm xe chính chủ bằng form bottom sheet; mục “Xe của tôi”, CTA/nút `+` và dấu cộng lớn ở empty state cùng mở form. Form đăng ký xe bám bố cục Stitch với các trường hai cột, badge bảo mật, vùng “Ảnh xe hoặc Giấy đăng kiểm”, CTA “Thêm xe vào danh sách” và khối trợ giúp. Hãng xe được tải từ `GET /api/brands`; khi chọn hãng, app tải model qua `GET /api/brands/{brandId}/models`, bắt buộc chọn cặp hợp lệ rồi gửi `maHangXe`/`maModel` trong `POST /api/vehicles`. Mobile không gửi `maKhachHang`; backend xác định owner từ JWT. Form có loading, retry, empty/error cho danh mục hãng-model. Vùng ảnh cho phép chụp bằng camera hoặc chọn từ thư viện, xin quyền camera, xem trước, nén ở chất lượng 82 và tải lên sau khi tạo xe qua `POST /api/vehicles/{id}/image`; hỗ trợ JPEG/PNG/WebP tối đa 8 MB. Backend lưu metadata ở `HinhAnhXe`, nội dung file tại `VEHICLE_IMAGES_DIR`, kiểm tra ownership trước upload/xem/xóa; card xe đọc ảnh có JWT qua `GET /api/vehicles/{id}/image` và dùng placeholder nếu chưa có. Card xe có nút “Đặt lịch ngay” chuyển sang `/appointments?vehicleId=...` và tự chọn xe tương ứng. `/vehicles` và `/appointments` dùng header/banner AutoCare phỏng theo tài liệu Stitch nhưng giữ thanh điều hướng hiện hành `Trang chủ / Đặt lịch / Theo dõi / Thông báo / Tài khoản`; route `/vehicles` đánh dấu đúng mục Tài khoản. Màn lịch hẹn tải xe/chi nhánh hoạt động, cho phép thêm xe ngay trong luồng rồi tự tải lại để hiện form đặt lịch, tạo lịch, hiển thị lịch của customer và hủy trạng thái `CHO_XAC_NHAN`/`DA_XAC_NHAN` qua quyền backend. `/tracking` đã thay placeholder bằng danh sách lịch hẹn và màn chi tiết `/tracking/{appointmentId}`; app đọc `GET /api/appointments` cùng `GET /api/appointments/{id}`, hiển thị timeline `CHO_XAC_NHAN`, `DA_XAC_NHAN`, `DA_TIEP_NHAN`, `HOAN_TAT`, hỗ trợ pull-to-refresh/loading/error/empty và không tự cập nhật trạng thái. Theo dõi phiếu sửa chữa chi tiết cho customer và notification vẫn là phase tiếp theo.
- **Technician feature screens**: `/technician` đã thay placeholder bằng danh sách phiếu sửa chữa được phân công, có bộ lọc đang xử lý/hoàn tất/tất cả, pull-to-refresh và loading/error/empty state. Route `/technician/repair-orders/{id}` tải song song chi tiết phiếu, hạng mục dịch vụ và lịch sử tiến độ; hiển thị xe, khách hàng, chi nhánh, ghi chú tiếp nhận, trạng thái và tỷ lệ hạng mục hoàn tất. Kỹ thuật viên có thể cập nhật tiến độ (`DA_PHAN_CONG`, `DANG_SUA`, `TAM_DUNG`, `CHO_KH_DUYET`, `HOAN_TAT`) kèm phần trăm/mô tả, hoặc đổi trạng thái hạng mục (`CHO_XU_LY`, `DANG_SUA`, `HOAN_TAT`, `HUY`). Phiếu `HOAN_TAT`/`HUY` bị khóa thao tác trên UI; backend vẫn enforce role, branch và assigned-only. Mobile không gửi `maNhanVien` hoặc `maChiNhanh`. `flutter analyze` sạch và toàn bộ 37 test đạt ngày 2026-09-14.

## 8. Docker Infrastructure & LAN Networking Status
- **Docker Compose**: `docker-compose.yml` defining `garage-frontend` (:3001), `garage-backend` (:8080), `garage-sqlserver` (:1433), connected via `garage-network`.
- **Database Service**: `mcr.microsoft.com/mssql/server:2022-latest` with `entrypoint.sh` executing `GarageManagementSystem.sql` and `database/seed/*.sql` only on first run if DB does not exist. Existing volumes are preserved; `database/apply-dev-seed.ps1` can apply the idempotent dev seed to an existing DB without deleting data or changing schema. Client devices in LAN do not require local SQL Server.
- **Backend Service**: Multi-stage `maven:3.9-eclipse-temurin-17` builder and `eclipse-temurin:17-jre-jammy` runner. Configurable `CORS_ALLOWED_ORIGIN_PATTERNS` supporting `*` and LAN host origins.
- **Frontend Service**: `node:20-alpine` running Vite dev server bound to `0.0.0.0:3001` with dynamic hostname resolution in `env.ts` (`http://<HOST_IP>:8080/api` and `ws://<HOST_IP>:8080/ws`) for cross-device LAN development.
- **Secrets & Configuration**: `.env.example` at root, `.gitignore` protecting `.env` and sensitive build/log files.
- **Persistence**: Named volume `garage-sqlserver-data` keeps database changes across container restarts.
- **Vehicle profile image migration**: database mới nhận bảng `HinhAnhXe` từ `GarageManagementSystem.sql`; database development đã tồn tại áp migration idempotent bằng `database/apply-vehicle-image-migration.ps1`.

## 9. Nguyên tắc cốt lõi
- Không triển khai business feature chưa được yêu cầu.
- Không sửa schema SQL Server nếu chưa được phê duyệt.
- Backend là authority cuối cùng — không tin role/branch/ownership từ client.
- Cập nhật `README.md` và `docs/PROJECT_CONTEXT.md` sau mỗi task.



## Cập nhật Docker SQL đã được duyệt — 2026-09-29 15:01

- Người dùng yêu cầu áp SQL mới vào Docker để đồng bộ backend.
- Đã sao lưu COPY_ONLY/CHECKSUM và RESTORE VERIFYONLY thành công; bản sao ở `D:/KLCN/Garage_Management_Work_Sessions/GarageManagementSystem_before_sync_20260929.bak`.
- Áp migration PhanCong: đổi MaQuanLy thành MaNguoiPhanCong, ThoiGianPhanCong thành ThoiGianTao; thêm MaNguoiDuyet, ThoiGianDuyet, GhiChu và FK; TrangThai NOT NULL mặc định CHO_DUYET. Bảng rỗng tại thời điểm cập nhật.
- Áp V02 để tạo HinhAnhXe. Không thực thi các DELETE cuối file SQL nguồn, không reset volume hoặc seed lại.
- Script đề xuất ban đầu có lỗi cú pháp EXEC/QUOTENAME; SQL Server từ chối trước khi thực thi. Đã sửa bằng biến câu lệnh + sp_executesql và chạy thành công.
- Đối chiếu các cột DDL: không thiếu cột; kiểu dữ liệu, nullable và độ dài chuỗi khớp. Truy vấn các cột PhanCong mới thành công.
- Kiểm thử TechnicianAssignmentServiceTest và TechnicianAssignmentControllerTest: 24/24 đạt. Chưa bấm gửi phân công qua phiên đăng nhập web thực tế.
- Không sửa file SQL nguồn của người dùng; không commit/push.

## Cập nhật 01/10/2026 — hồ sơ khách hàng mobile và giao diện thanh toán thành công

- Mobile: `Tài khoản → Thông tin cá nhân` mở `/account/profile`, dùng GET/PUT `/api/customers/me` hiện hữu. Sửa họ tên, email, số điện thoại liên hệ, địa chỉ, ngày sinh; tên đăng nhập chỉ đọc. Có validation, trạng thái tải/lưu, retry và thông báo lỗi; lỗi lưu giữ bản nháp. Chưa có upload avatar hoặc đổi mật khẩu trong phạm vi này. Email đã có cần nhập email thay thế; chưa hỗ trợ xóa ngày sinh.
- Profile service dùng ApiClient/JWT, chỉ gửi các trường hồ sơ, không gửi mã khách/role/branch. Route thuộc customer guard và giữ navbar Tài khoản. Tên hiển thị cập nhật sau save, kiểm tra token tránh áp phản hồi lên phiên đăng nhập khác; thông tin vẫn do backend lưu.
- Thanh toán thành công: thẻ trắng, dấu tích trong vòng tròn xanh primary #00236F, mã hóa đơn thực màu xanh, số tiền đã trả và nút xem hóa đơn/danh sách. Hiển thị khi backend trả DA_THANH_TOAN và còn lại 0; giữ cơ chế polling/dừng polling. Không tự xóa hóa đơn hoặc tự đánh dấu đã thanh toán, không thêm chuyển trang tự động.
- Sửa null session ở AccountPage khi logout/redirect. Không thay API, schema, backend hoặc dữ liệu thật.
- Kiểm tra: `flutter test --no-pub test/features/customer/profile_test.dart test/features/invoices` đạt 38 test; `flutter analyze --no-pub` sạch; `git diff --check` đạt. Chưa chạy/build Flutter hoặc xác minh form trên thiết bị với tài khoản thật.

## Cập nhật 01/10/2026 — lưu QR và mở MB Bank trên Android

- Màn thanh toán có nút **Lưu QR và mở MB Bank** và **Lưu mã QR** riêng. Tải đúng ảnh QR từ phiên backend; chỉ mở MB sau khi lưu thành công. Nếu thiếu MB, ảnh vẫn được lưu và app báo cách mở thủ công.
- Kiểm tra status/ownership trước khi lưu; ngăn thao tác khi phiên hết hạn, đã trả tiền hoặc màn hình đã thay đổi. Kết quả thanh toán vẫn lấy từ backend khi polling/resume.
- Android 10+ lưu PNG qua MediaStore vào Pictures/AutoCare, không yêu cầu quyền đọc thư viện. Android 9 trở xuống xin WRITE_EXTERNAL_STORAGE. Chỉ thêm query package com.mbmobile; chưa hỗ trợ iOS, Techcombank hoặc TPBank trong phiên triển khai này.
- Flutter analyze sạch; 45/45 tests trong test/features/invoices đạt (11 tests QR mới). Chưa chạy/build Flutter, chưa biên dịch/kiểm thử bridge Kotlin trên thiết bị, chưa mở MB hoặc chuyển tiền thật.
- Do có thay đổi native Android, người dùng phải dừng/chạy lại app đầy đủ. Trên máy ảo chưa cài MB, thử lưu ảnh và thông báo thiếu ứng dụng; luồng MB thật cần Garage và MB trên cùng điện thoại.
## Kiểm tra bản bàn giao ngày 01/10/2026

- Backend `mvn test`: BUILD SUCCESS, 493 tests được báo cáo; 0 failures/errors, 3 SQL integration tests opt-in bị skip (490 tests chạy đạt).
- Mobile `flutter analyze`: sạch; `flutter test`: 137/137 đạt. Không chạy/build Flutter trong phiên push.
- Frontend `npm run build`: đạt; cảnh báo bundle trên 500 kB, không chặn build. Không thay đổi source React trong bản bàn giao.
- Bộ kiểm thử không thay thế nghiệm thu SePay/ngân hàng. Người dùng đã xác nhận chạy điện thoại ổn; backend tiếp tục là nơi xác nhận thanh toán.


### Mở rộng chat theo ngữ cảnh và GPS — 02/10/2026

- Bot dùng chi nhánh hiện tại, danh mục/giá dịch vụ thật, tóm tắt số lịch của chủ phòng và tối đa 6 tin CUSTOMER/BOT gần nhất khi gọi Gemini. FAQ đặt lịch/tìm gara hướng dẫn khách tự chọn, không tạo lịch tự động.
- Thêm GET/POST /api/support-chat/branch-suggestions cho CUSTOMER và màn Tìm gara trên mobile: lịch đặt hoặc GPS foreground có xin quyền khi bấm. Tính khoảng cách tại backend, không lưu/gửi GPS sang Gemini. Chưa có tọa độ gara thật vì user xác nhận địa chỉ mẫu; cấu hình GARAGE_SUPPORT_BRANCH_COORDINATES để trống, không bịa khoảng cách. Không thay schema/áp SQL trong phần mở rộng này.
- Sửa retry/khởi tạo chat mobile và xóa lỗi cũ sau phục hồi. Chưa xác minh lỗi mạng ban đầu trên máy khách hoặc gọi Gemini/GPS thật.


### Đặt lịch bằng AI trong hội thoại — 02/10/2026

- Đã triển khai Gemini-first khi cấu hình hợp lệ, JSON bản nháp có xe/chi nhánh/giờ/dịch vụ/nhu cầu; backend tự xây bản tóm tắt và chỉ tạo lịch sau tin xác nhận rõ ràng. Lịch vẫn CHO_XAC_NHAN.
- Thêm SupportBookingDrafts; lưu bản nháp versioned trong tin BOT hiện hữu, không migration/schema. Kiểm tra lại ownership/active/time/catalog, hiệu lực 15 phút, khóa phòng, idempotency theo draft message ID. Hủy bản nháp không tác động lịch đã tạo; sửa thông tin cần xác nhận lại.
- Cập nhật SupportBotService/Context, DTO, SupportChatService và test. Key/model đã có trong .env (không ghi giá trị); không gọi provider thật, không tạo lịch thật khi test. Không tự chạy Flutter, commit/push/deploy.

## Lịch sử sửa chữa CUSTOMER — 13/10/2026

- Mobile: Tài khoản → Lịch sử sửa chữa (`/account/repair-history`), lọc xe, phân trang 20 lần, kéo tải lại và chi tiết `/account/repair-history/{receptionId}`. Giữ navbar 5 mục và tab Tài khoản; guest/TECHNICIAN không vào được route khách.
- API mới chỉ đọc: `GET /api/repair-history?vehicleId=&page=0&size=20` (size 1–50) và `GET /api/repair-history/{id}`, chỉ ROLE_CUSTOMER. Backend lấy khách từ tài khoản đang hoạt động; lọc chủ xe trong truy vấn, không nhận owner/branch từ client. Chi tiết không thuộc quyền trả 404. Không hiển thị lần có hóa đơn của khách khác khi xe chuyển chủ.
- Mỗi MaTiepNhan là một lần sửa. Từ 07/11/2026, lịch sử hiển thị khi các phiếu sửa chữa không hủy đã hoàn tất và hóa đơn hợp lệ đã thanh toán đủ, không cần xác nhận bàn giao riêng. Gom chi phí theo từng hóa đơn thực tế, không cộng lại phiếu con đã gộp hóa đơn. Danh sách dùng Slice (không count), projection và một truy vấn hóa đơn theo cả trang; chi tiết mới tải dòng hóa đơn qua InvoiceService với kiểm tra quyền hiện hữu.
- Chi tiết có ngày tiếp nhận và ngày bàn giao nếu đã ghi nhận, km lúc tiếp nhận, yêu cầu khách, dịch vụ/phụ tùng trên hóa đơn và liên kết hóa đơn. Giá lấy từ chứng từ; không hiển thị chat/ghi chú nội bộ. Thiếu hóa đơn thì chi phí chưa có thông tin, không giả định bằng 0.
- Không thêm/sửa bảng, schema, migration, index hoặc dữ liệu; không cần migration cho tính năng này. Dữ liệu cũ thiếu bản ghi bàn giao không tự suy ra là đã giao.
- Kiểm tra: 34 targeted backend tests đạt (service/controller/query mapping, hồi quy hóa đơn/bàn giao); Flutter toàn bộ 175 tests đạt, 11 targeted tests lịch sử chạy lại ở viewport 390×844 đạt; analyze sạch. Query mapping kiểm tra offline với SQLServerDialect, chưa chạy truy vấn trên SQL Server thật hoặc E2E thiết bị.
- Flutter SDK local tự resolve meta/test_api khi analyze; đã hoàn nguyên thay đổi pubspec.lock ngoài phạm vi. Không nâng dependency trong source. Không run/build Flutter, commit/push/deploy.
## Khắc phục kết nối mobile USB — 13/10/2026

- Đã xác minh backend lắng nghe 8080 và GET /api/brands trả 200. Điện thoại Android thật kết nối ADB nhưng reverse --list rỗng. Source mobile mặc định 127.0.0.1 nên thiếu reverse khiến app gọi loopback của điện thoại, không tới máy tính.
- Đã tạo lại adb reverse tcp:8080 tcp:8080; GET /api/brands từ curl trên chính điện thoại trả 200. Chưa thao tác UI app để xác nhận toàn bộ màn hình.
- Thêm mobile/connect-usb.ps1: kiểm tra ADB, chọn đúng một điện thoại hoặc -DeviceId, kiểm tra public API backend, thiết lập và xác minh reverse; không tự chạy/build Flutter, không khởi động backend/database.
- Cập nhật task VS Code local Garage: connect Android USB để dùng script. .vscode đang bị gitignore nên task này chỉ áp dụng máy hiện tại; script và mobile/README được theo dõi để chia sẻ quy trình.
- Giữ nguyên default URL USB; sửa comment AppConfig và mobile/README bị lệch với source. Máy ảo dùng profile có API_BASE_URL=http://10.0.2.2:8080/api. .env backend không phải nguồn API_BASE_URL Flutter; đổi dart-define cần dừng/chạy lại app.
- Kết nối USB có thể mất sau rút cáp/restart ADB/điện thoại. F5 bằng profile USB sẽ chạy kiểm tra trước; nếu app đang mở, chạy lại script rồi Thử lại. Không cam kết app kết nối tới máy tính khi rút USB nếu không cấu hình LAN/HTTPS.
- Kiểm tra script với điện thoại thật: đạt; DeviceId không tồn tại: dừng exit 1 với thông báo hướng dẫn. Không thay endpoint nghiệp vụ, DB, secrets, dependencies; không run/build Flutter.
## Điều chỉnh bot tư vấn — 13/10/2026

- Người dùng chốt dịch vụ + triệu chứng cơ bản + đặt lịch. Sửa prompt/FAQ, không fine-tune mô hình và không thêm bảng DB.
- Câu mở đầu như “hãy tư vấn giúp tôi”, không dấu/chữ hoa, được trả câu hỏi làm rõ tại local, handoff=false, không gọi Gemini. Triệu chứng cơ bản hỏi hãng/model và thời điểm xuất hiện, không chẩn đoán hoặc tự kê phụ tùng. Dấu hiệu nghiêm trọng chuyển hỗ trợ trực tiếp. Giá vẫn theo danh mục thật; lịch vẫn cần khách xác nhận và backend validate.
- Provider HTTP lỗi/quota, timeout hoặc JSON không hợp lệ dùng FAQ thay cho thông báo sai “ngoài khả năng”. Log chỉ HTTP status/loại exception, không log key, nội dung khách hoặc response body. Worker/context gián đoạn có thông báo riêng; bỏ lời hứa nhân viên trả lời ngay.
- Kiểm tra SupportBotServiceTest, SupportChatServiceTest, SupportBookingDraftsTest, SupportChatControllerTest đạt. Không gọi Gemini thật, chưa E2E mobile/web. Không sửa .env/application.properties/model/key hoặc database, không tự restart backend.
- Cần restart backend. Phòng đã WAITING/HUMAN cần tiếp tân xử lý và resolve về BOT theo luồng hiện hữu trước khi thử lại; không sửa DB hay xóa lịch sử.
- FAQ vẫn là từ khóa, không hiểu đầy đủ phủ định/ngữ cảnh; chất lượng Gemini thật cần nghiệm thu riêng. Bộ quy tắc và tình huống: docs/SUPPORT_BOT_PLAYBOOK.md.
## Sửa đăng xuất mobile khi offline — 14/10/2026
- Phát hiện AuthController.logout chờ beforeLogout (hủy push backend/FCM) trước khi xóa token; lỗi hoặc pending ở push chặn đăng xuất.
- Chuyển hủy push sang tác vụ nền có bắt lỗi; vẫn chờ xóa secure storage trước khi công bố đăng xuất thành công. PushRegistration giữ desired=null khi hủy lỗi, chỉ giữ binding cũ để retry revoke, không đăng ký lại tài khoản đã thoát. App hiện hữu retry khi resume.
- 20 targeted tests auth/push/routes đạt; flutter analyze --no-pub sạch. Chưa thử trên điện thoại. Không run/build Flutter hoặc sửa DB.
- Hạn chế: nếu cả backend và Firebase không truy cập được thì chưa xác nhận thu hồi FCM token; thông báo hệ thống có thể còn đến đến khi revoke thành công. Retry trong bộ nhớ trong vòng đời app, không tuyên bố thu hồi push offline tức thời.
- Kết quả hồi quy cuối: flutter test --no-pub toàn bộ 178/178 đạt; hoàn tất kiểm tra tự động, chưa thử thiết bị thật.
