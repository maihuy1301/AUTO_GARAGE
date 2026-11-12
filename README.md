# Garage Management System (Hệ Thống Quản Lý Garage Ô Tô)

Hệ thống quản lý dịch vụ sửa chữa và bảo dưỡng xe ô tô đa chi nhánh, bao gồm Database, Backend (REST API / WebSocket), Frontend Web (dành cho Admin, Quản lý, Tiếp tân).

---

## 1. Công nghệ & Thư viện sử dụng

### 1.1. Cơ sở dữ liệu (Database)
- **Hệ quản trị CSDL**: Microsoft SQL Server 2022.
- **Triển khai**: Chạy qua Docker Container (`garage-sqlserver`).
- **Khởi tạo & Dữ liệu mẫu**: Script DDL `GarageManagementSystem.sql` và các script seed tự động trong thư mục `database/seed/`.

### 1.2. Backend
- **Ngôn ngữ & Môi trường**: Java 17, Maven 3.8+.
- **Framework cốt lõi**: Spring Boot 3.2.5.
- **Các thư viện chính**:
  - `spring-boot-starter-web`: Xây dựng RESTful Web API.
  - `spring-boot-starter-data-jpa` & `Hibernate`: Quản lý truy vấn và ánh xạ dữ liệu ORM.
  - `spring-boot-starter-security`: Phân quyền & bảo mật hệ thống (RBAC).
  - `jjwt-api`, `jjwt-impl`, `jjwt-jackson` (v0.12.5): Xác thực người dùng qua JSON Web Token (JWT).
  - `spring-boot-starter-websocket`: Giao thức STOMP/WebSocket xử lý sự kiện realtime (thông báo, cập nhật tiến độ, chat).
  - `spring-boot-starter-validation`: Kiểm tra tính hợp lệ dữ liệu đầu vào (Jakarta Bean Validation).
  - `mssql-jdbc`: Driver JDBC kết nối SQL Server.
  - `firebase-admin` (v9.10.0): Tích hợp dịch vụ Firebase Cloud Messaging (FCM).
  - `spring-boot-starter-test` & `spring-security-test`: Bộ công cụ kiểm thử tự động (Unit & Integration tests).

### 1.3. Frontend (Web Application)
- **Nền tảng**: Node.js (khuyên dùng Node 18, 20 hoặc 22), Vite 5, TypeScript.
- **Thư viện giao diện & tiện ích**:
  - `react` & `react-dom` (v18.3.1): Thư viện xây dựng giao diện người dùng.
  - `react-router-dom` (v6.23.0): Quản lý điều hướng trang (Routing).
  - `axios` (v1.6.8): Xử lý các HTTP Request gọi đến REST API.
  - `xlsx` (v0.18.5): Đọc, xuất và xử lý file Excel báo cáo, thống kê.
- **Công cụ phát triển**: ESLint, TypeScript Compiler, `@vitejs/plugin-react`.

---

## 2. Yêu cầu môi trường cài đặt (Prerequisites)

Trước khi tiến hành chạy hệ thống lần đầu, máy tính cần cài đặt sẵn:
- **Docker Desktop** (khuyên dùng để chạy SQL Server nhanh chóng).
- **JDK 17** (Java Development Kit 17).
- **Apache Maven** (hoặc dùng trình bao bọc Maven có sẵn).
- **Node.js** (phiên bản `>= 18.x`) và **npm**.

---

## 3. Hướng dẫn chạy lần đầu (First-Time Setup)

Quy trình khởi chạy chuẩn theo thứ tự: **Cấu hình môi trường → Database → Backend → Frontend**.

### Bước 1: Chuẩn bị file biến môi trường (`.env`)
Tại thư mục gốc của dự án (`AUTO_GARAGE/`), sao chép file `.env.example` thành `.env`:

```bash
# Trên Linux / macOS / Git Bash
cp .env.example .env

# Trên Windows PowerShell
Copy-Item .env.example .env
```

*(Các giá trị mặc định trong `.env` đã được thiết lập sẵn cho môi trường Local / Development, bạn có thể giữ nguyên).*

---

### Bước 2: Khởi chạy Database (Microsoft SQL Server)

Hệ thống đã đóng gói sẵn container SQL Server 2022 kèm tính năng tự động tạo bảng và nạp dữ liệu mẫu ban đầu:

1. Mở terminal tại thư mục gốc của dự án (`AUTO_GARAGE/`).
2. Khởi động container:
   ```bash
   docker compose up -d --build
   ```
3. Chờ khoảng 15 - 30 giây để SQL Server khởi động hoàn tất và tự nạp schema cùng dữ liệu mẫu ban đầu.
4. Kiểm tra trạng thái container:
   ```bash
   docker ps
   ```
   *Bạn sẽ thấy container `garage-sqlserver` đang chạy ở cổng `1433`.*

> **Lưu ý (Nếu không dùng Docker):** Nếu cài trực tiếp SQL Server trên máy host, hãy tạo cơ sở dữ liệu `GarageManagementSystem`, chạy lần lượt script `database/GarageManagementSystem.sql` rồi đến các script trong thư mục `database/seed/` (hoặc chạy script PowerShell `.\database\apply-dev-seed.ps1`).

---

### Bước 3: Khởi chạy Backend (Spring Boot)

1. Mở terminal mới và chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Build và khởi chạy ứng dụng Spring Boot:
   ```bash
   mvn clean spring-boot:run
   ```
   *(Backend sẽ tự động đọc các cấu hình từ file `.env` ở thư mục gốc và kết nối đến database SQL Server tại cổng 1433).*
3. Sau khi khởi động thành công, Backend sẽ sẵn sàng phục vụ tại:
   - **Base API URL**: `http://localhost:8080/api`
   - **WebSocket Endpoint**: `http://localhost:8080/ws`

---

### Bước 4: Khởi chạy Frontend (React + Vite)

1. Mở một terminal mới và chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói phụ thuộc (dependencies):
   ```bash
   npm install
   ```
3. Chạy môi trường phát triển (Dev Server):
   ```bash
   npm run dev
   ```
4. Mở trình duyệt web và truy cập vào địa chỉ:
   - **Giao diện Web**: `http://localhost:3001`

---

## 4. Thông tin tài khoản đăng nhập thử nghiệm

Dữ liệu seed mẫu đã tạo sẵn các tài khoản tương ứng với các vai trò trong hệ thống:

- **Mật khẩu chung cho tất cả tài khoản**: `Password123@`

| Tên đăng nhập | Vai trò (Role) | Chi nhánh | Mô tả quyền hạn |
|---|---|---|---|
| `admin` | `ROLE_ADMIN` | Toàn hệ thống | Quản trị viên tối cao, xem toàn bộ hệ thống |
| `manager` | `ROLE_MANAGER` | Chi Nhánh 1 (Central) | Quản lý chi nhánh 1 |
| `frontdesk` | `ROLE_FRONT_DESK` | Chi Nhánh 1 (Central) | Tiếp tân: tiếp nhận xe, tạo phiếu, đặt lịch |
| `technician` | `ROLE_TECHNICIAN` | Chi Nhánh 1 (Central) | Kỹ thuật viên: nhận việc, cập nhật tiến độ |
| `customer` | `ROLE_CUSTOMER` | — | Khách hàng mẫu (Sở hữu xe `51A-11111`) |

---

## 5. Tóm tắt danh sách Ports

| Dịch vụ | Nền tảng | Port | URL / Kết nối |
|---|---|---|---|
| **Database** | SQL Server 2022 (Docker) | `1433` | `localhost:1433` |
| **Backend** | Spring Boot 3.2.5 | `8080` | `http://localhost:8080/api` |
| **Frontend** | React 18 / Vite 5 | `3001` | `http://localhost:3001` |
