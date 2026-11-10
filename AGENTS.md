---
description: Tự động nạp ngữ cảnh dự án Garage Management và quy tắc an toàn cốt lõi
trigger: always_on
---

# Tự Động Nạp Ngữ Cảnh Dự Án Garage Management

Bạn đang làm việc trong dự án **Garage Management** (Hệ thống quản lý garage ô tô đa chi nhánh).

## 1. Nguồn Tài Liệu Chuẩn Cần Đọc
Khi bắt đầu phiên hoặc giải quyết các task liên quan đến dự án (cả lập trình lẫn viết báo cáo Khóa luận), luôn đối chiếu các tài liệu:
- **`AI_MASTER_CONTEXT.md`** (File trung tâm dùng chung cho ChatGPT & Antigravity: tổng hợp kiến trúc, ma trận tính năng, schema DB, từ điển thuật ngữ học thuật và quy tắc viết đồ án)
- `README.md` & `docs/PROJECT_CONTEXT.md` (Hiện trạng backend, frontend, mobile, DB)
- `d:\KLCN\Garage_Management_Agent_Pack\PROJECT_STATUS_SNAPSHOT.md` (Snapshot tiến độ)
- `d:\KLCN\Garage_Management_Agent_Pack\DO_NOT_BREAK_CHECKLIST.md` (Checklist an toàn)
- `d:\KLCN\Garage_Management_Agent_Pack\garage-management\references\business-workflow.md` (Luồng nghiệp vụ)
- Khi thêm hoặc thiết kế lại form/chức năng giao diện, đọc thư mục màn hình tương ứng trong `D:\KLCN\stitch_stitch_garage_design_system\` (`DESIGN.md`, `code.html`, `screen.png` nếu có) trước khi sửa source.

## 2. Bất Biến Cốt Lõi (Tuyệt đối tuân thủ)
- **Không tự ý sửa Database**: `database/GarageSystemDB.sql` là single source of truth, chỉ sửa khi người dùng duyệt rõ ràng.
- **Backend Authority**: RBAC, Branch Isolation và Ownership bắt buộc kiểm tra ở Backend (Spring Boot), không tin tưởng role/branch gửi từ client.
- **Kiến trúc chuẩn**:
  - Backend: `Controller -> Service -> Repository -> Entity/DTO` (dùng `ApiResponse`).
  - Frontend: `src/features/<domain>`, gọi API qua service tập trung (`apiClient`, `API_ENDPOINTS`), bảo vệ route qua `ProtectedRoute` / `RoleGuard`.
- **An toàn Git & Hệ thống**: Không tự ý `git reset --hard`, không xóa file, không xóa Docker volume, không tự động deploy/push nếu chưa có yêu cầu.
- **Flutter do người dùng khởi chạy**: Không tự chạy `flutter run` hoặc `flutter build`; chỉ chạy khi người dùng yêu cầu rõ trong tác vụ hiện tại. Vẫn được chạy `flutter analyze` và `flutter test` để kiểm tra thay đổi.
- **Stitch là tài liệu tham khảo UI**: triển khai vào source production, tái sử dụng design token/pattern hiện hành và giữ nguyên navbar, route, role cùng API contract của ứng dụng khi mockup Stitch khác source đang chạy.

## 3. Tự Động Cập Nhật Tiến Độ
- Khi hoàn thành hoặc thay đổi tính năng mới, chủ động đối chiếu và cập nhật `AI_MASTER_CONTEXT.md` cùng `PROJECT_STATUS_SNAPSHOT.md` trong Agent Pack.
- Ghi chép tài liệu phiên làm việc vào `d:\KLCN\Garage_Management_Work_Sessions\` khi kết thúc các task quan trọng.
