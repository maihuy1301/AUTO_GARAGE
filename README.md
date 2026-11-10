# Garage Management System (Hệ Thống Quản Lý Garage Ô Tô Đa Chi Nhánh)

## Quét thông tin xe trên Android — 26/10/2026

Form xe CUSTOMER giữ AutoVision để gợi ý hãng/dòng từ ảnh toàn xe. Trên Android, biểu tượng máy ảnh bên dưới góc phải của từng trường biển số, ODO và VIN cho chụp/chọn ảnh riêng để OCR trên thiết bị; đã bỏ nút quét chung và menu chọn loại thông tin. Năm sản xuất nhập thủ công. Người dùng kiểm tra kết quả rồi mới điền form; chỉ nút lưu xe mới gửi dữ liệu qua backend vào bảng `Xe`. Không đổi schema/API và không tải ảnh quét OCR lên backend. Xem [hướng dẫn AutoVision và OCR](docs/AUTOVISION_MOBILE_INTEGRATION.md). Chưa xác minh OCR native trên điện thoại thật.

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

**Chat tiếp tân ↔ kỹ thuật viên theo lần sửa:** web mở trong chi tiết phiếu sửa chữa → **Trao đổi sửa chữa**; mobile thợ mở chi tiết công việc → **Trao đổi với tiếp tân**. Ngày 09/10/2026 đã được duyệt, áp V06 vào SQL Server local và bật `GARAGE_REPAIR_CHAT_ENABLED=true` trong `.env` local. 25 backend tests đạt, gồm 3 SQL integration rollback. Khởi động backend để nhận cấu hình; chưa thử E2E web/mobile. Chỉ chữ, chưa làm lịch sử bảo dưỡng. Xem [bàn giao chat sửa chữa](docs/REPAIR_CHAT_SCAFFOLD.md).

Chat khách mobile ↔ tiếp tân (02/10/2026): đã viết luồng bot/FAQ → chờ tiếp tân → nhân viên hỗ trợ, nhắn tin realtime và đặt lịch có xác nhận. **Mặc định tắt; đã áp migration V05 vào SQL Server local ngày 02/10/2026, chưa kiểm thử end-to-end.** Xem [cấu hình và bàn giao chat hỗ trợ](docs/SUPPORT_CHAT_SETUP.md). Gemini là tùy chọn, chưa có key vẫn dùng được FAQ và chat người-người sau khi bật tính năng.

## 1. Project Overview
Hệ thống phần mềm quản lý việc đặt lịch và dịch vụ sửa chữa xe ô tô dành cho Garage đa chi nhánh.
- **Web App (React + Vite)**: Dành cho `ADMIN`, `MANAGER`, `RECEPTIONIST`.
- **Mobile App (Flutter + Dart)**: Dành cho `TECHNICIAN`, `CUSTOMER`.
- **Backend Modules Completed**: Auth, RBAC, Branch Authorization, User Management, Employee Management, Customer Management, Vehicle Management, Appointment Management, Reception / Check-in, Repair Order Management, Service / Repair Items Management, Technician Assignment, Repair Progress / Service Execution, Parts / Inventory Management, Additional Quotation, Invoice / Payment, Notification, WebSocket Realtime, Chat, Reports & Statistics.

## 2. Tech Stack
- **Backend**: Spring Boot 3.2.5, Java 17, Maven, Spring Web, Spring Data JPA, Spring Security, Spring Validation, JJWT 0.12.5, SQL Server Driver.
- **Frontend**: React 18, Vite 5, TypeScript, React Router 6, Axios, Modern Dark/Light Design System.
- **Mobile**: Flutter, Dart.
- **Database**: Microsoft SQL Server.

## 3. Project Structure
```text
AUTO_GARAGE/
├── backend/src/main/java/com/garage/
│   ├── controller/       # AuthController, RbacTestController, BranchTestController, BranchController,
│   │                     # AdminUserController (TASK 06A), EmployeeController (TASK 06B),
│   │                     # CustomerController (TASK 06C), VehicleController (TASK 07),
│   │                     # AppointmentController (TASK 08), ReceptionController (TASK 09),
│   │                     # RepairOrderController (TASK 10), RepairItemController (TASK 11),
│   │                     # TechnicianAssignmentController (TASK 12), TechnicianExecutionController (TASK 12 Execution),
│   │                     # PartController (TASK 13), InventoryController (TASK 13), RepairPartController (TASK 13),
│   │                     # QuotationController (TASK 14), InvoiceController (TASK 15), NotificationController (TASK 16),
│   │                     # ChatController (TASK 18), ReportController (TASK 19)
│   ├── dto/              # ApiResponse, LoginRequest, LoginResponse, BranchResponse, User DTOs, Employee DTOs, Customer DTOs, Vehicle DTOs, Appointment DTOs, Reception DTOs, RepairOrder DTOs, RepairItem DTOs, Assignment DTOs, RepairProgress DTOs, Part DTOs, Inventory DTOs, RepairPart DTOs, Quotation DTOs, Invoice DTOs, Payment DTOs, Notification DTOs, Chat DTOs, Report DTOs (TASK 19)
│   ├── entity/           # 35 JPA Entities
│   ├── exception/        # GlobalExceptionHandler, ResourceNotFoundException,
│   │                     # DuplicateResourceException, BadRequestException
│   ├── repository/       # NguoiDungRepository, NguoiDungVaiTroRepository,
│   │                     # NhanVienRepository, ChiNhanhRepository, VaiTroRepository,
│   │                     # KhachHangRepository (TASK 06C), XeRepository (TASK 07),
│   │                     # DatLichRepository (TASK 08), PhieuTiepNhanRepository (TASK 09),
│   │                     # PhieuSuaChuaRepository (TASK 10), PhieuSuaChuaDichVuRepository (TASK 11),
│   │                     # DichVuRepository (TASK 11),
│   │                     # PhanCongRepository (TASK 12), TienDoSuaChuaRepository (TASK 12 Execution),
│   │                     # PhuTungRepository (TASK 13), TonKhoRepository (TASK 13), PhieuSuaChuaPhuTungRepository (TASK 13), GiaoDichKhoRepository (TASK 13),
│   │                     # BaoGiaPhatSinhRepository (TASK 14), BaoGiaPhatSinhDichVuRepository (TASK 14), BaoGiaPhatSinhPhuTungRepository (TASK 14),
│   │                     # HoaDonRepository (TASK 15), HoaDonDichVuRepository (TASK 15), HoaDonPhuTungRepository (TASK 15), ThanhToanRepository (TASK 15),
│   │                     # ThongBaoRepository (TASK 16), CuocHoiThoaiRepository (TASK 18), TinNhanRepository (TASK 18)
│   ├── security/         # JwtService, JwtAuthenticationFilter,
│   │                     # JwtAuthenticationEntryPoint, JwtAccessDeniedHandler,
│   │                     # CustomUserDetails, CustomUserDetailsService, SecurityConfig,
│   │                     # BranchAuthorizationService
│   ├── service/          # AuthService, UserService, EmployeeService, CustomerService (TASK 06C), VehicleService (TASK 07), AppointmentService (TASK 08), ReceptionService (TASK 09), RepairOrderService (TASK 10), RepairItemService (TASK 11), TechnicianAssignmentService (TASK 12), TechnicianExecutionService (TASK 12 Execution), InventoryService (TASK 13), RepairPartService (TASK 13), QuotationService (TASK 14), InvoiceService (TASK 15), PaymentService (TASK 15), NotificationService (TASK 16), ChatService (TASK 18), ReportService (TASK 19)
│   └── websocket/        # WebSocketConfig (TASK 17), WebSocketAuthChannelInterceptor (TASK 17), WebSocketEventPublisher (TASK 17)
├── frontend/             # React + Vite foundation
├── mobile/               # Flutter customer/technician app foundation
├── database/
│   └── GarageManagementSystem.sql       # SQL Server DDL schema and the only Docker init script
└── docs/PROJECT_CONTEXT.md
```

## 4. Environment Verified
| Tool | Version |
|---|---|
| OS | Windows 11 |
| Java | 17.0.12 |
| Maven | 3.9.16 |
| Node.js | v24.15.0 (npm 11.12.1) |
| Flutter/Dart | Installed |
| Git | 2.51.0 |

## 4.1 Running the Project

Rà soát payment ngày 01/10/2026: receipt SePay chỉ INSERT để bảo vệ mã giao dịch không bị ghi đè; mobile bỏ hiển thị số dư giả khi chưa tải và xóa thông tin thanh toán khi mất quyền. 30 test backend payment (gồm 3 SQL integration), 33 test Flutter hóa đơn/thanh toán đạt; analyze sạch. Hóa đơn mẫu #1 vẫn chưa thanh toán. Các kết quả full suite bên dưới là lần chạy 30/09.

**Thanh toán ngân hàng mobile + backend SePay (30/09/2026):** khách mở Tài khoản → Hóa đơn của tôi → chi tiết → Thanh toán ngân hàng. Có API payment-options/payment-sessions và webhook SePay, QR theo phiên 15 phút, sao chép thông tin, kiểm tra trạng thái khi resume/polling. Mặc định tích hợp tắt đến khi cấu hình tài khoản nhận và webhook key; xem [cấu hình SePay](docs/SEPAY_SETUP.md) và [bàn giao web](docs/PAYMENT_SEPAY_WEB_HANDOFF.md). Schema thêm `PhienThanhToan`/`GiaoDichSePay`, migration `V04__sepay_payment_sessions.sql` đã được duyệt và áp local. Local có hóa đơn mẫu #1 của khách #1001, 1.190.000đ chưa thanh toán. Backend tests 492/492 (gồm 2 SQL integration rollback), Flutter 119/119, analyze sạch. Chưa kết nối SePay thật, chưa chạy/build Flutter, chưa làm giao diện web hoặc luồng khách duyệt phát sinh.

- **Backend (Spring Boot)**:
  - Port: `8080`
  - Base API URL: `http://localhost:8080/api`
  - Realtime WebSocket: `http://localhost:8080/ws`
  - Command: `mvn spring-boot:run` (in `backend/`) or `java -jar target/garage-backend-0.0.1-SNAPSHOT.jar`
- **Frontend (React + Vite + TypeScript)**:
  - Port: `3001`
  - Web URL: `http://localhost:3001/`
  - Command: `npm run dev` (in `frontend/`)
  - Production Build: `npm run build`
- **Mobile (Flutter)**:
  - Khi mở app, splash screen AutoCare dùng ảnh `mobile/asset/screen.png` được hiển thị trong lúc khôi phục session, tối thiểu 1,6 giây.
  - Android emulator: `flutter run` (in `mobile/`, mặc định gọi `http://10.0.2.2:8080/api`).
  - Nếu AVD Android 17/API 37 16 KB chỉ hiện màn hình đen dù app vẫn chạy, Android debug manifest đã tắt Impeller để dùng Skia fallback. Dừng phiên cũ rồi chạy lại `flutter run`; nếu vẫn đen, đổi `Emulated Performance > Graphics` sang `Software`, cold boot AVD và thử lại.
  - Thiết bị thật/iOS/Desktop: `flutter run --dart-define=API_BASE_URL=http://<backend-host>:8080/api`.
  - Thiết bị Android thật qua USB: chạy `adb reverse tcp:8080 tcp:8080`, sau đó `flutter run -d <device-id> --dart-define=API_BASE_URL=http://127.0.0.1:8080/api`.
  - Customer/guest foundation: guest home, đăng ký khách hàng công khai, JWT login, secure token storage, role routing và protected navigation với `returnTo`; CUSTOMER có màn `/vehicles` để xem/thêm xe và chuyển thẳng sang `/appointments?vehicleId=...` để đặt lịch với xe đã chọn, xem lịch của mình, hủy lịch khi backend cho phép. Form thêm xe tải hãng qua `GET /api/brands`, tải model phụ thuộc qua `GET /api/brands/{brandId}/models` và gửi `maHangXe`/`maModel` theo schema mới; không gửi owner từ mobile. Tab `/tracking` tải lịch hẹn thuộc customer và mở `/tracking/{appointmentId}` qua `GET /api/appointments/{id}` để hiển thị chi tiết cùng tiến trình `CHO_XAC_NHAN -> DA_XAC_NHAN -> DA_TIEP_NHAN -> HOAN_TAT`; hỗ trợ pull-to-refresh, loading/error/empty state và không cho mobile tự đổi trạng thái. TECHNICIAN có danh sách công việc `/technician`, bộ lọc trạng thái, chi tiết `/technician/repair-orders/{id}`, danh sách hạng mục/lịch sử tiến độ và thao tác cập nhật tiến độ hoặc trạng thái hạng mục qua các endpoint assigned-only. Mobile không gửi mã kỹ thuật viên hay chi nhánh; backend xác định quyền từ JWT và phân công. Các màn dùng header/banner AutoCare theo tham khảo Stitch.

Mobile CUSTOMER có mục **Tài khoản → Hóa đơn của tôi** (2026-09-25): `/invoices` gọi `GET /api/invoices`, `/invoices/{id}` gọi `GET /api/invoices/{id}` để xem dịch vụ/phụ tùng, tạm tính/giảm giá/thuế/tổng thanh toán/đã thanh toán/còn lại, trạng thái và lịch sử `payments` trong cùng phản hồi. Có loading/error/retry/empty và pull-to-refresh, giữ tab Tài khoản trong customer shell. Backend xác định ownership/RBAC qua JWT; mobile không gửi owner/branch/role và không có thao tác thanh toán online. Kiểm tra: `flutter analyze` sạch, `flutter test` đạt 93/93 (22 test hóa đơn mới); chưa kiểm thử app với backend thật trên thiết bị.

## 4.2 Infrastructure & Development Workflow

Mobile CUSTOMER — 2026-09-29: trong **Xe của tôi**, nút bánh răng cạnh **Đặt lịch ngay** mở form chỉnh sửa điền sẵn hãng/model, năm sản xuất, màu, VIN và số km. Lưu qua `PUT /api/vehicles/{id}`, có thể thay ảnh qua API ảnh hiện hữu; biển số chỉ đọc theo contract backend. Không gửi owner/branch/role. Flutter analyze sạch, 109/109 tests đạt; chưa chạy/build app hoặc kiểm thử lưu với API thật.

Mobile CUSTOMER: trang chủ được sắp xếp lại ngày 2026-09-26 theo bố cục tham khảo DatXE, giữ nền sáng và xanh–cam AutoCare. Có banner ảnh xe, 6 tiện ích (đặt lịch, xe, theo dõi, hóa đơn, thông báo, tài khoản), thẻ mở lịch hẹn và các thẻ dẫn tới chức năng hiện có; thanh điều hướng vẫn giữ 5 mục. Không hiển thị lịch hẹn/dịch vụ/ưu đãi giả trên trang chủ.

Chi tiết đầy đủ xem tại [docs/DOCKER.md](docs/DOCKER.md).

```bash
# 1. Khởi động SQL Server 2022 qua Docker Compose (Terminal 1)
docker compose up -d --build

# 2. Khởi động Backend Spring Boot (Terminal 2)
cd backend
mvn spring-boot:run

# 3. Khởi động Frontend React / Vite (Terminal 3)
cd frontend
npm run dev
```

### Services & Ports
| Thành phần | Môi trường | Port | Công nghệ / Ghi chú |
|---|---|---|---|
| `garage-sqlserver` | Docker Compose | `1433` | MS SQL Server 2022 (Persistent Volume `garage-sqlserver-data`) |
| Backend | Native Host | `8080` | Java 17 / Spring Boot 3.2.5 (`http://localhost:8080/api`) |
| Frontend | Native Host | `3001` | React 18 / Vite 5 (`http://localhost:3001/`) |
| Mobile App | Flutter CLI | — | Flutter / Android / iOS |

Nếu database đã tồn tại nhưng thiếu dữ liệu mẫu, khởi động SQL Server rồi chạy seed idempotent an toàn:

```powershell
.\database\apply-dev-seed.ps1
```

Database development đã tồn tại cần áp migration ảnh hồ sơ xe một lần:

```powershell
.\database\apply-vehicle-image-migration.ps1
```

## 5. Development Test Accounts (Password: `Password123@`)

Các tài khoản dưới đây được tạo bởi seed development `database/seed/V01__development_seed.sql` khi Docker khởi tạo database mới. Nếu volume `garage-sqlserver-data` đã có database từ trước, entrypoint bỏ qua cả schema và seed để bảo toàn dữ liệu hiện có.

| Username | Role | Branch | Records |
|---|---|---|---|
| `admin` | `ROLE_ADMIN` | Global | — |
| `manager` | `ROLE_MANAGER` | Garage Central Chi Nhánh 1 | `NhanVien` |
| `receptionist` | `ROLE_FRONT_DESK` | Garage Central Chi Nhánh 1 | `NhanVien` |
| `technician` | `ROLE_TECHNICIAN` | Garage Central Chi Nhánh 1 | `NhanVien` |
| `manager2` | `ROLE_MANAGER` | Garage Chi Nhánh 2 Bình Thạnh | `NhanVien` |
| `technician2` | `ROLE_TECHNICIAN` | Garage Chi Nhánh 2 Bình Thạnh | `NhanVien` |
| `customer` | `ROLE_CUSTOMER` | — | `KhachHang`, `Xe` (51A-11111) |
| `customer2` | `ROLE_CUSTOMER` | — | `KhachHang`, `Xe` (51B-22222) |

## 6. Development Sample Vehicles (TASK 07)

Các xe mẫu dưới đây cũng được tạo bởi seed development khi database mới được khởi tạo.

| Biển số | Owner | Hãng xe | Model | Năm |
|---|---|---|---|---|
| `51A-11111` | `customer` | Toyota | Camry | 2020 |
| `51B-22222` | `customer2` | Honda | Civic | 2021 |

## 7. Endpoints
### Authentication (`AuthController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký khách hàng bằng số điện thoại; tạo transaction `NguoiDung` + `ROLE_CUSTOMER` + `KhachHang`, BCrypt hash mật khẩu; không dùng `MaKhachHangCode` trong schema mới | Public |
| `POST` | `/api/auth/login` | Đăng nhập bằng số điện thoại/tên đăng nhập hoặc email và mật khẩu; trả thêm `hasPin` để mobile biết có cần màn nhập PIN không | Public |
| `GET` | `/api/auth/me` | Lấy thông tin người dùng hiện tại, gồm trạng thái `hasPin` | Authenticated |

### Branch Master Data (`BranchController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/branches` | Lấy danh sách chi nhánh (Master Data) | Authenticated (`SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `CUSTOMER`) |
| `GET` | `/api/branches/{id}` | Lấy thông tin chi tiết một chi nhánh theo ID | Authenticated |

### Report & Statistics (`ReportController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/reports/dashboard` | Thống kê dashboard tổng quan (doanh thu, đơn, lịch, khách, xe) | Staff / Admin |
| `GET` | `/api/reports/revenue` | Thống kê doanh thu, đã thanh toán, chưa thanh toán, theo ngày | Staff / Admin |
| `GET` | `/api/reports/appointments` | Thống kê lịch hẹn theo trạng thái | Staff / Admin |
| `GET` | `/api/reports/repair-orders` | Thống kê phiếu sửa chữa theo trạng thái | Staff / Admin |
| `GET` | `/api/reports/services` | Top dịch vụ sử dụng nhiều nhất & doanh thu dịch vụ | Staff / Admin |
| `GET` | `/api/reports/parts` | Top phụ tùng sử dụng nhiều nhất & doanh thu phụ tùng | Staff / Admin |
| `GET` | `/api/reports/inventory` | Báo cáo tồn kho & cảnh báo phụ tùng sắp hết hàng | Staff / Admin |
| `GET` | `/api/reports/technicians` | Thống kê hiệu suất kỹ thuật viên (phân công, hoàn tất, đang sửa) | Staff / Admin |
| `GET` | `/api/reports/branches` | Báo cáo so sánh các chi nhánh (doanh thu, lịch hẹn, sửa chữa) | Staff / Admin |

### Chat & Realtime Messaging (`ChatController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/conversations` | Lấy danh sách cuộc hội thoại của user hiện tại | Authenticated (`CUSTOMER`, `STAFF`, `ADMIN`) |
| `POST` | `/api/conversations` | Tạo cuộc hội thoại mới (kèm tin nhắn đầu tiên nếu có) | Authenticated |
| `GET` | `/api/conversations/{conversationId}` | Xem chi tiết cuộc hội thoại (kèm kiểm tra membership) | Conversation member |
| `GET` | `/api/conversations/{conversationId}/messages` | Lấy lịch sử tin nhắn của cuộc hội thoại | Conversation member |
| `POST` | `/api/conversations/{conversationId}/messages` | Gửi tin nhắn mới (kèm push realtime qua WebSocket) | Conversation member |
| `PATCH` | `/api/conversations/{conversationId}/read` | Đánh dấu các tin nhắn trong hội thoại là đã đọc | Conversation member |

### WebSocket Realtime (`/ws`)
| Protocol | Destination / Channel | Description | Permission |
|---|---|---|---|
| `STOMP` | `/ws` | WebSocket connection handshake (SockJS + native WS) | `Authorization: Bearer <JWT>` header required |
| `STOMP` | `/user/queue/notifications` | User private notification destination | Authenticated user (own queue) |
| `STOMP` | `/topic/branches/{branchCode}` | Branch-specific event broadcast topic | `SYSTEM_ADMIN` or Staff belonging to that branch |

Appointment realtime: khi lịch hẹn được tạo, hủy, xác nhận, tiếp nhận hoặc cập nhật trạng thái, backend phát `RealtimeEvent` với `entityType = DAT_LICH` tới `/topic/branches/{maChiNhanh}` và private queue của khách hàng. Web `/app/appointments` subscribe STOMP và tự cập nhật danh sách/chi tiết đang mở; mobile `/tracking` và `/tracking/{appointmentId}` tự refresh nền mỗi 8 giây để không cần reload thủ công.

### Notification Endpoints (`NotificationController`)
Từ 2026-09-21, backend lưu thông báo cho khách khi xác nhận/tiếp nhận/hủy/hoàn tất lịch hẹn, tạo phiếu sửa chữa, phân công và đổi giai đoạn sửa chữa. Phiếu sửa chữa chính chuyển `HOAN_TAT` sẽ gửi lời mời đến garage kiểm tra, thanh toán và nhận xe; hoàn tất phiếu con chỉ báo hoàn tất công việc bổ sung. Thông báo lấy người nhận từ dữ liệu backend, lưu cùng transaction nghiệp vụ và phát STOMP sau commit. Gửi lại cùng trạng thái không sinh thông báo mới.

Android xin quyền khi đăng nhập CUSTOMER, theo dõi thông báo ở mọi tab và mở `/notifications` đúng tài khoản khi bấm. Từ 2026-09-22 đã có code FCM cho nền/đóng bình thường, đăng ký/refresh/hủy token theo JWT và tránh phát lại local alert khi resume. Cần cấu hình Firebase Android + Firebase Admin và áp migration trước khi kiểm thử thật; chưa cấu hình/gửi FCM thật trong phiên triển khai. SQL Server vẫn lưu toàn bộ nghiệp vụ. Khi thiếu Firebase, inbox REST và local notifications foreground vẫn hoạt động. Người dùng dừng/chạy lại Flutter đầy đủ vì hot reload không áp dụng native changes.

Đã thêm bước bàn giao riêng trên web chi tiết tiếp nhận: chỉ cho phép khi tất cả phiếu sửa chữa không hủy đã hoàn tất và hóa đơn đã thanh toán đầy đủ. Backend ghi `BanGiaoXe`, chuyển tiếp nhận sang `DA_BAN_GIAO`, lịch liên quan sang `HOAN_TAT`, gửi thông báo đã bàn giao; request lặp trả audit cũ. Migration `database/migrations/V03__push_devices_and_vehicle_handover.sql` thêm `ThietBiPush` và `BanGiaoXe`, **chưa áp vào database đang chạy**.

- [Bàn giao cho nhóm web: schema, API, trạng thái và nghiệm thu](docs/HANDOVER_WEB_HANDOFF.md).
- [Tạo/cấu hình FCM, demo và lời thuyết trình](docs/FCM_SETUP.md).
- API mới: `POST/DELETE /api/notifications/devices` (CUSTOMER); `GET/POST /api/reception/{id}/handover` (ADMIN/MANAGER/FRONT_DESK, đúng chi nhánh).
- Kiểm tra 2026-09-22: 119 targeted backend tests, 71 Flutter tests, analyze sạch, build web đạt; UI panel được smoke-test với API giả lập desktop/mobile. Chưa chạy/build Flutter, SQL migration hay FCM thật; chưa có iOS/APNs và durable push outbox.

Mobile CUSTOMER có tab `/notifications`: danh sách và số chưa đọc lấy từ API, đánh dấu đọc từng thông báo/đọc tất cả, loading/error/empty state và kéo để làm mới. Khi tab đang mở, STOMP private queue nhận sự kiện `DAT_LICH`/`THONG_BAO` để tải lại REST; có refresh dự phòng mỗi 30 giây, tải lại khi resume/reconnect và dừng kết nối khi rời màn hình. Backend tiếp tục xác định ownership từ JWT.

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/notifications` | Lấy danh sách thông báo của người dùng hiện tại (mới nhất trước) | Authenticated user (`ALL ROLES`) |
| `GET` | `/api/notifications/{id}` | Xem chi tiết thông báo (kèm kiểm tra ownership) | Authenticated user (own notification) |
| `PATCH` | `/api/notifications/{id}/read` | Đánh dấu thông báo là đã đọc (idempotent) | Authenticated user (own notification) |
| `PATCH` | `/api/notifications/read-all` | Đánh dấu tất cả thông báo của mình là đã đọc | Authenticated user (`ALL ROLES`) |
| `GET` | `/api/notifications/unread-count` | Đếm số lượng thông báo chưa đọc của mình | Authenticated user (`ALL ROLES`) |

### Invoice & Payment Endpoints (`InvoiceController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/repair-orders/{repairOrderId}/invoice` | Xem hóa đơn của phiếu sửa chữa | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `CUSTOMER` (own order) |
| `POST` | `/api/repair-orders/{repairOrderId}/invoice` | Tạo hóa đơn từ phiếu sửa chữa (tự động tính tổng & items) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST` |
| `GET` | `/api/invoices/{invoiceId}` | Xem chi tiết hóa đơn (kèm dịch vụ, phụ tùng, thanh toán) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `CUSTOMER` (own order) |
| `GET` | `/api/invoices` | Xem danh sách hóa đơn theo chi nhánh | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `CUSTOMER` |
| `POST` | `/api/invoices/{invoiceId}/payments` | Thực hiện thanh toán hóa đơn (Full / Partial payment) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST` |
| `GET` | `/api/invoices/{invoiceId}/payments` | Xem lịch sử thanh toán của hóa đơn | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `CUSTOMER` (own order) |

### Additional Quotation — mô tả cũ, chưa có API trong source hiện tại

> Đối chiếu `main`/remote `8832f5f` ngày 2026-09-27: không có `QuotationController`, `QuotationService` hay route `/quotations` trong backend hiện tại. Bảng dưới là tài liệu lịch sử, không phải API có thể gọi. CUSTOMER chưa được xem phiếu phát sinh riêng hoặc duyệt/từ chối báo giá qua app. Các mục TASK 14/Quotation trong tổng quan và cây thư mục phía trên cũng là mô tả cũ.

Luồng sẵn sàng: CUSTOMER đọc `/api/services`, lịch hẹn chính chủ tại `/api/appointments` và `/api/appointments/{id}`, hóa đơn chính chủ tại `/api/invoices` và `/api/invoices/{id}`. Tạo phiếu phát sinh dùng `POST /api/repair-orders/direct` với `maPhieuCha`, chỉ cho `ADMIN`, `MANAGER`, `FRONT_DESK`; backend kiểm tra chi nhánh và quan hệ khách/xe/phiếu cha. Hóa đơn phiếu cha gộp hạng mục phiếu con trực tiếp không hủy, nhưng DTO không đánh dấu nguồn từng dòng.

Mobile ngày 2026-09-27: chi tiết lịch hẹn đọc `tongTienDichVuDuKien`, `tongTienPhuTungDuKien`, `tongChiPhiDuKien` từ backend; thiếu trường hiển thị “Chưa có dự toán”. Màn đặt lịch và chi tiết nêu rõ báo giá sơ bộ, không phải số tiền thanh toán cuối cùng. Dự toán được backend tính từ danh mục hiện tại khi đọc lịch, chưa phải bản báo giá chốt giá. Module hóa đơn CUSTOMER đang có được giữ nguyên; không thêm thao tác duyệt/từ chối khi chưa có API.
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/repair-orders/{repairOrderId}/quotations` | Xem danh sách báo giá phát sinh của phiếu sửa chữa | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `CUSTOMER` (own order) |
| `POST` | `/api/repair-orders/{repairOrderId}/quotations` | Tạo báo giá phát sinh mới (tự động tính giá và tổng tiền) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` (assigned) |
| `GET` | `/api/quotations/{quotationId}` | Xem chi tiết báo giá phát sinh (kèm items dịch vụ & phụ tùng) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `CUSTOMER` (own order) |
| `PATCH` | `/api/quotations/{quotationId}/approve` | Khách hàng duyệt báo giá phát sinh (`DA_DUYET`) | `CUSTOMER` (own quotation), `SYSTEM_ADMIN`, `BRANCH_MANAGER` |
| `PATCH` | `/api/quotations/{quotationId}/reject` | Khách hàng từ chối báo giá phát sinh (`TU_CHOI`) | `CUSTOMER` (own quotation), `SYSTEM_ADMIN`, `BRANCH_MANAGER` |
| `PATCH` | `/api/quotations/{quotationId}/cancel` | Quản lý/nhân viên hủy báo giá phát sinh (`HUY`) | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |

### Parts & Inventory Endpoints (`PartController`, `InventoryController`, `RepairPartController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/parts` | Lấy danh mục phụ tùng đang hoạt động | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` |
| `GET` | `/api/parts/{id}` | Lấy chi tiết phụ tùng theo ID | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` |
| `GET` | `/api/inventory` | Xem danh sách tồn kho theo chi nhánh (kèm branch auth) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` |
| `GET` | `/api/inventory/{partId}` | Xem chi tiết tồn kho phụ tùng tại chi nhánh | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` |
| `GET` | `/api/repair-orders/{repairOrderId}/parts` | Xem danh sách phụ tùng trong phiếu sửa chữa | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` |
| `POST` | `/api/repair-orders/{repairOrderId}/parts` | Thêm phụ tùng vào phiếu sửa chữa (tự động trừ tồn kho & audit `GiaoDichKho`) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` (assigned) |
| `PUT` | `/api/repair-orders/{repairOrderId}/parts/{partDetailId}` | Cập nhật số lượng phụ tùng (điều chỉnh tồn kho tương ứng) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` (assigned) |
| `DELETE` | `/api/repair-orders/{repairOrderId}/parts/{partDetailId}` | Xóa phụ tùng khỏi phiếu (hoàn trả 100% tồn kho & audit `GiaoDichKho`) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN` (assigned) |

### Technician Execution & Progress Endpoints (`TechnicianExecutionController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/technician/repair-orders` | Xem danh sách phiếu sửa chữa được phân công cho kỹ thuật viên | `TECHNICIAN` (assigned only) |
| `GET` | `/api/technician/repair-orders/{repairOrderId}` | Xem chi tiết phiếu sửa chữa được phân công | `TECHNICIAN` (assigned only) |
| `GET` | `/api/technician/repair-orders/{repairOrderId}/items` | Xem danh sách dịch vụ thuộc phiếu sửa chữa của mình | `TECHNICIAN` (assigned only) |
| `PATCH` | `/api/technician/repair-orders/{repairOrderId}/progress` | Cập nhật tiến độ sửa chữa (`TienDoSuaChua`, chuyển status sang `DANG_SUA`/`HOAN_TAT`) | `TECHNICIAN` (assigned only) |
| `PATCH` | `/api/technician/repair-orders/{repairOrderId}/items/{itemId}` | Cập nhật trạng thái hạng mục dịch vụ (`CHO_XU_LY`, `DANG_SUA`, `HOAN_TAT`, `HUY`) | `TECHNICIAN` (assigned only) |
| `GET` | `/api/technician/repair-orders/{repairOrderId}/progress-history` | Xem lịch sử các lần cập nhật tiến độ sửa chữa | `TECHNICIAN` (assigned only) |

### Technician Assignment Endpoints (`TechnicianAssignmentController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/repair-orders/{repairOrderId}/assignments` | Xem danh sách kỹ thuật viên được phân công cho phiếu sửa chữa | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |
| `POST` | `/api/repair-orders/{repairOrderId}/assignments` | Phân công kỹ thuật viên (kiểm tra vai trò TECHNICIAN, cùng chi nhánh, chống duplicate, đồng bộ trạng thái -> DA_PHAN_CONG) | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |
| `DELETE` | `/api/repair-orders/{repairOrderId}/assignments/{assignmentId}` | Hủy phân công kỹ thuật viên (rollback về CHO_XU_LY nếu không còn phân công) | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |

### Service / Repair Items Management Endpoints (`RepairItemController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/repair-orders/{repairOrderId}/items` | Danh sách dịch vụ trong phiếu sửa chữa (kèm thành tiền tính tự động) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST` |
| `POST` | `/api/repair-orders/{repairOrderId}/items` | Thêm dịch vụ vào phiếu sửa chữa (tự động lấy đơn giá theo bảng giá chi nhánh) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST` |
| `PUT` | `/api/repair-orders/{repairOrderId}/items/{itemId}` | Cập nhật số lượng, đơn giá, trạng thái của hạng mục dịch vụ | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |
| `DELETE` | `/api/repair-orders/{repairOrderId}/items/{itemId}` | Xóa dịch vụ khỏi phiếu sửa chữa | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |

### Repair Order Management Endpoints (`RepairOrderController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `POST` | `/api/repair-orders` | Tạo phiếu sửa chữa từ phiếu tiếp nhận (idempotent, branch-scoped) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST` |
| `GET` | `/api/repair-orders` | Lấy danh sách phiếu sửa chữa (SYSTEM_ADMIN: toàn hệ thống, BRANCH_MANAGER/RECEPTIONIST: chi nhánh mình) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST` |
| `GET` | `/api/repair-orders/{id}` | Lấy chi tiết phiếu sửa chữa theo ID (branch-scoped) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST` |
| `PUT` | `/api/repair-orders/{id}` | Cập nhật thông tin phiếu sửa chữa (ghi chú, thời gian bắt đầu, kết thúc) | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |
| `PATCH` | `/api/repair-orders/{id}/status` | Cập nhật trạng thái phiếu sửa chữa (`CHO_XU_LY`, `DA_PHAN_CONG`, `DANG_SUA`, `CHO_KH_DUYET`, `TAM_DUNG`, `HOAN_TAT`, `HUY`) | `SYSTEM_ADMIN`, `BRANCH_MANAGER` |

### Reception / Check-in Endpoints (`ReceptionController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `POST` | `/api/reception/check-in/{appointmentId}` | Check-in tiếp nhận xe từ lịch hẹn (tạo PhieuTiepNhan, cập nhật DatLich -> DA_TIEP_NHAN, cập nhật Odometer) | `SYSTEM_ADMIN`, `RECEPTIONIST`, `BRANCH_MANAGER` |
| `GET` | `/api/reception` | Lấy danh sách phiếu tiếp nhận (SYSTEM_ADMIN: toàn hệ thống, RECEPTIONIST/BRANCH_MANAGER: chi nhánh mình) | `SYSTEM_ADMIN`, `RECEPTIONIST`, `BRANCH_MANAGER` |
| `GET` | `/api/reception/{id}` | Lấy chi tiết phiếu tiếp nhận theo ID (branch-scoped) | `SYSTEM_ADMIN`, `RECEPTIONIST`, `BRANCH_MANAGER` |

### Appointment Management Endpoints (`AppointmentController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/appointments` | Danh sách lịch hẹn (SYSTEM_ADMIN: toàn hệ thống, BRANCH_MANAGER/RECEPTIONIST: chi nhánh mình, CUSTOMER: lịch hẹn của mình) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `CUSTOMER` |
| `GET` | `/api/appointments/{id}` | Chi tiết lịch hẹn (ownership & branch check) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `CUSTOMER` |
| `POST` | `/api/appointments` | Đặt lịch hẹn mới (kiểm tra sở hữu xe, chi nhánh hoạt động, thời gian tương lai, chống trùng lịch) | `SYSTEM_ADMIN`, `CUSTOMER` |
| `PATCH` | `/api/appointments/{id}/cancel` | Hủy lịch hẹn (chỉ cho phép khi trạng thái là CHO_XAC_NHAN hoặc DA_XAC_NHAN) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `CUSTOMER` |

### Vehicle Management Endpoints (`VehicleController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/brands` | Danh sách hãng xe hoạt động cho dropdown | Public |
| `GET` | `/api/brands/{brandId}/models` | Danh sách model hoạt động thuộc hãng đã chọn | Public |
| `GET` | `/api/vehicles` | Danh sách xe (SYSTEM_ADMIN: toàn bộ, CUSTOMER: chỉ xe của mình) | `SYSTEM_ADMIN`, `CUSTOMER` |
| `GET` | `/api/vehicles/{id}` | Chi tiết xe (ownership check) | `SYSTEM_ADMIN`, `CUSTOMER` |
| `POST` | `/api/vehicles` | Tạo xe mới bằng `maHangXe`/`maModel` (owner tự động từ JWT đối với CUSTOMER) | `SYSTEM_ADMIN`, `CUSTOMER` |
| `PUT` | `/api/vehicles/{id}` | Cập nhật xe (ownership check) | `SYSTEM_ADMIN`, `CUSTOMER` |
| `DELETE` | `/api/vehicles/{id}` | Xóa xe (ownership check + business constraint) | `SYSTEM_ADMIN`, `CUSTOMER` |
| `POST` | `/api/vehicles/{id}/image` | Tải lên hoặc thay thế một ảnh hồ sơ xe (`multipart/form-data`, JPEG/PNG/WebP, tối đa 8 MB) | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `CUSTOMER` (ownership check) |
| `GET` | `/api/vehicles/{id}/image` | Đọc nội dung ảnh hồ sơ xe | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `CUSTOMER` (ownership check) |
| `DELETE` | `/api/vehicles/{id}/image` | Xóa ảnh hồ sơ xe | `SYSTEM_ADMIN`, `BRANCH_MANAGER`, `CUSTOMER` (ownership check) |

### Customer Management Endpoints (`CustomerController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/customers/me` | Lấy hồ sơ cá nhân của khách hàng đăng nhập | `CUSTOMER`, `SYSTEM_ADMIN` |
| `PUT` | `/api/customers/me` | Cập nhật hồ sơ cá nhân của khách hàng | `CUSTOMER`, `SYSTEM_ADMIN` |
| `GET` | `/api/customers` | Lấy danh sách toàn bộ khách hàng | `SYSTEM_ADMIN` |
| `GET` | `/api/customers/{id}` | Lấy chi tiết khách hàng theo ID | `SYSTEM_ADMIN` hoặc chính chủ `CUSTOMER` |
| `POST` | `/api/customers` | Tạo khách hàng mới | `SYSTEM_ADMIN` |
| `PUT` | `/api/customers/{id}` | Cập nhật thông tin khách hàng | `SYSTEM_ADMIN` hoặc chính chủ `CUSTOMER` |
| `PATCH` | `/api/customers/{id}/status` | Khóa/kích hoạt tài khoản khách hàng | `SYSTEM_ADMIN` |

### Employee Management Endpoints (`EmployeeController`)
| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/employees` | Lấy danh sách nhân viên | `SYSTEM_ADMIN` (toàn hệ thống), `BRANCH_MANAGER` (chỉ chi nhánh mình) |
| `GET` | `/api/employees/{id}` | Lấy chi tiết nhân viên | `SYSTEM_ADMIN` (toàn hệ thống), `BRANCH_MANAGER` (chỉ chi nhánh mình) |
| `POST` | `/api/employees` | Tạo nhân viên mới | `SYSTEM_ADMIN` (bất kỳ chi nhánh), `BRANCH_MANAGER` (chỉ chi nhánh mình) |
| `PUT` | `/api/employees/{id}` | Cập nhật nhân viên | `SYSTEM_ADMIN` (bất kỳ chi nhánh), `BRANCH_MANAGER` (chỉ chi nhánh mình) |
| `PATCH` | `/api/employees/{id}/status` | Khóa/kích hoạt nhân viên | `SYSTEM_ADMIN` (bất kỳ chi nhánh), `BRANCH_MANAGER` (chỉ chi nhánh mình) |

### Admin User Management Endpoints (`AdminUserController`) — SYSTEM_ADMIN Only
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/users` | Lấy danh sách tài khoản người dùng và vai trò |
| `GET` | `/api/admin/users/{id}` | Lấy chi tiết thông tin và vai trò của tài khoản |
| `POST` | `/api/admin/users` | Tạo tài khoản mới (BCrypt hash mật khẩu, gán vai trò) |
| `PUT` | `/api/admin/users/{id}` | Cập nhật thông tin tài khoản và vai trò |
| `PATCH` | `/api/admin/users/{id}/status` | Khóa/vô hiệu hóa hoặc kích hoạt lại tài khoản |

## 7. Security & Authorization Architecture
| Layer | Convention |
|---|---|
| Authority prefix | `ROLE_SYSTEM_ADMIN`, `ROLE_CUSTOMER`, etc. |
| Customer Ownership | Khách hàng chỉ truy cập/sửa thông tin chính mình (`JWT → NguoiDung → KhachHang`), chặn truy cập profile khách hàng khác (403) |
| Employee Authorization | `SYSTEM_ADMIN` (global), `BRANCH_MANAGER` (own branch only), other roles denied (403) |
| User Management Authorization | `SYSTEM_ADMIN` only (`@PreAuthorize("hasRole('SYSTEM_ADMIN')")`) |
| Password Security | `BCryptPasswordEncoder` (never plaintext, never exposed in API) |
| 401 Unauthorized | Chưa đăng nhập / JWT không hợp lệ / hết hạn |
| 403 Forbidden | Đã đăng nhập nhưng không đủ quyền vai trò, sai chi nhánh, hoặc truy cập trái phép profile khách hàng khác |
| 404 Not Found | Tài nguyên không tồn tại |
| 409 Conflict | Mã nhân viên, tên đăng nhập hoặc email đã tồn tại |

## 8. Completed Tasks
- **TASK 01**: Project Foundation — PASS
- **TASK 02**: Database Mapping (35 JPA Entities) — PASS
- **TASK 03**: Authentication / JWT — PASS
- **TASK 03.1**: Development Seed Data & Auth Validation — PASS
- **TASK 04**: Authorization / RBAC — PASS (19/19 tests)
- **TASK 05**: Branch Authorization — PASS (31/31 tests)
- **TASK 06A**: User Management (`NguoiDung`) — PASS (48/48 tests)
- **TASK 06B**: Employee Management (`NhanVien`) — PASS (64/64 tests)
- **TASK 06C**: Customer Management (`KhachHang`) — PASS (76/76 tests)
- **TASK 07**: Vehicle Management (`Xe`) — PASS (101/101 tests)
- **TASK 08**: Appointment Management (`DatLich`) — PASS (132/132 tests)
- **TASK 09**: Reception / Check-in (`PhieuTiepNhan`) — PASS (151/151 tests)
- **TASK 10**: Repair Order Management (`PhieuSuaChua`) — PASS (174/174 tests)
- **TASK 11**: Technician Assignment (`PhanCong`) — PASS (215/215 tests)
- **EXTRA TASK**: Service / Repair Items Management (`PhieuSuaChua_DichVu`) — PASS (195/195 tests)
- **TASK 12**: Repair Progress / Service Execution (`TienDoSuaChua`) — PASS (234/234 tests)
- **TASK 13**: Parts / Inventory Management (`PhuTung`, `TonKho`, `PhieuSuaChua_PhuTung`, `GiaoDichKho`) — PASS (263/263 tests)
- **TASK 14**: Additional Quotation (`BaoGiaPhatSinh`, `BaoGiaPhatSinh_DichVu`, `BaoGiaPhatSinh_PhuTung`) — PASS (280/280 tests)
- **TASK 15**: Invoice / Payment (`HoaDon`, `HoaDon_DichVu`, `HoaDon_PhuTung`, `ThanhToan`) — PASS (298/298 tests)
- **TASK 16**: Notification Management (`ThongBao`) — PASS (313/313 tests)
- **TASK 17**: WebSocket Realtime (`WebSocketConfig`, `WebSocketAuthChannelInterceptor`, `WebSocketEventPublisher`) — PASS (326/326 tests)
- **TASK 18**: Chat / Realtime Conversation (`CuocHoiThoai`, `TinNhan`) — PASS (341/341 tests)
- **TASK 19**: Reports / Statistics (`ReportService`, `ReportController`) — PASS (**357/357 tests PASS**)
- **FRONTEND TASK 01**: Frontend Foundation (React 18, TypeScript, Vite, Router, JWT Auth, API Client, Layout Foundation) — PASS
- **FRONTEND TASK 02**: Authentication UI & User Experience (AutoCare Theme, Login UX, Show/Hide Password, User Dropdown, Role Navigation, Dashboard KPIs) — PASS
- **FRONTEND TASK 03**: Dashboard & Real Data Integration (Role-Specific Dashboards for Admin, Manager, Receptionist, Technician, Customer; Live Backend Reports API `/api/reports/*`, Vehicles `/api/vehicles`, Appointments `/api/appointments`) — PASS
- **FRONTEND TASK 05**: User / Employee / Customer Management (Employee List/Detail/Form/Status, Customer List/Detail/Form/Status/Vehicles, User List/Detail/Form/Status, RoleGuards for `/app/employees`, `/app/customers`, `/app/users`) — PASS
- **FRONTEND TASK 06**: Vehicle Management (Vehicle List/Detail/Form/Delete, Customer Ownership Protection, License Plate/VIN validation, RoleGuards for `/app/vehicles` for `ROLE_ADMIN` & `ROLE_CUSTOMER`) — PASS
- **FRONTEND TASK 07**: Appointment Management (role-scoped list, KPI/filter/search/date views, detail, create for `ROLE_ADMIN`/`ROLE_CUSTOMER`, cancel/confirm/receive theo quyền backend, loading/error/empty states, Real Data API `/api/appointments` & `/api/branches`, Customer/Branch Isolation, RoleGuards for `/app/appointments` cho `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_FRONT_DESK`, `ROLE_CUSTOMER`) — PASS (frontend production build)
- **MOBILE CUSTOMER REGISTRATION & LOGIN PIN STATE**: Public registration UI, phone-as-username contract, transactional customer account creation without `MaKhachHangCode`, fixed `ROLE_CUSTOMER`, BCrypt password hashing, login/session exposes `hasPin` from `NguoiDung.MaPinHash` — PASS (87 targeted backend tests, backend compile, 6 Flutter tests, Flutter analyze clean)
- **FRONTEND TASK 08**: Reception / Check-in Management (Vehicle Check-in Modal with ODO & exterior condition tracking, Reception Slips List/Detail, Direct Appointment-to-Reception Check-in, One-click Repair Order Creation, RoleGuards for `/app/reception` for `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_FRONT_DESK`) — PASS
- **INFRASTRUCTURE TASK 01**: Docker Development Environment (Docker Compose, Multi-stage Backend Dockerfile, React/Vite Frontend Dockerfile, MSSQL Container with Auto-Init & Named Volume Persistence, Zero Source Code Regressions) — PASS (381/381 backend tests, 0 build errors)

## 9. Next Step
**FRONTEND TASK 09 — REPAIR ORDER MANAGEMENT (LỆNH SỬA CHỮA & PHÂN CÔNG KỸ THUẬT)**



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

## Bàn giao nhóm web — 01/10/2026

Đọc [hướng dẫn lấy code, chạy và tích hợp](docs/WEB_TEAM_QUICKSTART.md), [contract hóa đơn/thanh toán](docs/PAYMENT_SEPAY_WEB_HANDOFF.md) và [cấu hình SePay](docs/SEPAY_SETUP.md). Hướng dẫn có migration cho DB hiện hữu, nạp .env vào backend Maven, ngrok/webhook và phân chia công việc frontend. Dữ liệu local và khóa bí mật không đi theo Git.

## Lịch sử sửa chữa CUSTOMER — 13/10/2026

- Mobile: Tài khoản → Lịch sử sửa chữa (`/account/repair-history`), lọc xe, phân trang 20 lần, kéo tải lại và chi tiết `/account/repair-history/{receptionId}`. Giữ navbar 5 mục và tab Tài khoản; guest/TECHNICIAN không vào được route khách.
- API mới chỉ đọc: `GET /api/repair-history?vehicleId=&page=0&size=20` (size 1–50) và `GET /api/repair-history/{id}`, chỉ ROLE_CUSTOMER. Backend lấy khách từ tài khoản đang hoạt động; lọc chủ xe trong truy vấn, không nhận owner/branch từ client. Chi tiết không thuộc quyền trả 404. Không hiển thị lần có hóa đơn của khách khác khi xe chuyển chủ.
- Mỗi MaTiepNhan là một lần sửa. Từ 07/11/2026, lịch sử hiển thị khi các phiếu sửa chữa không hủy đã hoàn tất và hóa đơn hợp lệ đã thanh toán đủ, không cần xác nhận bàn giao riêng. Gom chi phí theo từng hóa đơn thực tế, không cộng lại phiếu con đã gộp hóa đơn. Danh sách dùng Slice (không count), projection và một truy vấn hóa đơn theo cả trang; chi tiết mới tải dòng hóa đơn qua InvoiceService với kiểm tra quyền hiện hữu.
- Chi tiết có ngày tiếp nhận và ngày bàn giao nếu đã ghi nhận, km lúc tiếp nhận, yêu cầu khách, dịch vụ/phụ tùng trên hóa đơn và liên kết hóa đơn. Giá lấy từ chứng từ; không hiển thị chat/ghi chú nội bộ. Thiếu hóa đơn thì chi phí chưa có thông tin, không giả định bằng 0.
- Không thêm/sửa bảng, schema, migration, index hoặc dữ liệu; không cần migration cho tính năng này. Dữ liệu cũ thiếu bản ghi bàn giao không tự suy ra là đã giao.
- Kiểm tra: 34 targeted backend tests đạt (service/controller/query mapping, hồi quy hóa đơn/bàn giao); Flutter toàn bộ 175 tests đạt, 11 targeted tests lịch sử chạy lại ở viewport 390×844 đạt; analyze sạch. Query mapping kiểm tra offline với SQLServerDialect, chưa chạy truy vấn trên SQL Server thật hoặc E2E thiết bị.
- Flutter SDK local tự resolve meta/test_api khi analyze; đã hoàn nguyên thay đổi pubspec.lock ngoài phạm vi. Không nâng dependency trong source. Không run/build Flutter, commit/push/deploy.
## Điều chỉnh bot tư vấn — 13/10/2026

- Người dùng chốt dịch vụ + triệu chứng cơ bản + đặt lịch. Sửa prompt/FAQ, không fine-tune mô hình và không thêm bảng DB.
- Câu mở đầu như “hãy tư vấn giúp tôi”, không dấu/chữ hoa, được trả câu hỏi làm rõ tại local, handoff=false, không gọi Gemini. Triệu chứng cơ bản hỏi hãng/model và thời điểm xuất hiện, không chẩn đoán hoặc tự kê phụ tùng. Dấu hiệu nghiêm trọng chuyển hỗ trợ trực tiếp. Giá vẫn theo danh mục thật; lịch vẫn cần khách xác nhận và backend validate.
- Provider HTTP lỗi/quota, timeout hoặc JSON không hợp lệ dùng FAQ thay cho thông báo sai “ngoài khả năng”. Log chỉ HTTP status/loại exception, không log key, nội dung khách hoặc response body. Worker/context gián đoạn có thông báo riêng; bỏ lời hứa nhân viên trả lời ngay.
- Kiểm tra SupportBotServiceTest, SupportChatServiceTest, SupportBookingDraftsTest, SupportChatControllerTest đạt. Không gọi Gemini thật, chưa E2E mobile/web. Không sửa .env/application.properties/model/key hoặc database, không tự restart backend.
- Cần restart backend. Phòng đã WAITING/HUMAN cần tiếp tân xử lý và resolve về BOT theo luồng hiện hữu trước khi thử lại; không sửa DB hay xóa lịch sử.
- FAQ vẫn là từ khóa, không hiểu đầy đủ phủ định/ngữ cảnh; chất lượng Gemini thật cần nghiệm thu riêng. Bộ quy tắc và tình huống: docs/SUPPORT_BOT_PLAYBOOK.md.