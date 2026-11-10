CREATE 
USE GarageManagementSystem;
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

DECLARE @PasswordHash VARCHAR(255) = '$2a$10$ClEFdX0R7SanUp/08zNDYOFUdflLGCXChrTo25Hwo2OZAD80z/NjO';

IF OBJECT_ID(N'dbo.GiaDichVuChiNhanh', N'U') IS NOT NULL
BEGIN
    THROW 51000, 'Development seed must not depend on legacy table GiaDichVuChiNhanh. Use DichVu.DonGia from GarageManagementSystem.sql.', 1;
END;

IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE TenVaiTro = 'ROLE_ADMIN')
    INSERT INTO VaiTro (TenVaiTro, MoTa) VALUES ('ROLE_ADMIN', N'Quản trị hệ thống');
IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE TenVaiTro = 'ROLE_MANAGER')
    INSERT INTO VaiTro (TenVaiTro, MoTa) VALUES ('ROLE_MANAGER', N'Quản lý chi nhánh');
IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE TenVaiTro = 'ROLE_FRONT_DESK')
    INSERT INTO VaiTro (TenVaiTro, MoTa) VALUES ('ROLE_FRONT_DESK', N'Nhân viên tiếp nhận');
IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE TenVaiTro = 'ROLE_TECHNICIAN')
    INSERT INTO VaiTro (TenVaiTro, MoTa) VALUES ('ROLE_TECHNICIAN', N'Kỹ thuật viên');
IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE TenVaiTro = 'ROLE_CUSTOMER')
    INSERT INTO VaiTro (TenVaiTro, MoTa) VALUES ('ROLE_CUSTOMER', N'Khách hàng');

IF NOT EXISTS (SELECT 1 FROM ChiNhanh WHERE TenChiNhanh = N'Garage Central Chi Nhánh 1')
BEGIN
    INSERT INTO ChiNhanh (TenChiNhanh, DiaChi, SoDienThoai, Email, TrangThai)
    VALUES (N'Garage Central Chi Nhánh 1', N'123 Nguyễn Văn Linh, Quận 7, TP.HCM', '02873000001', 'branch1@autocare.local', 1);
END;

IF NOT EXISTS (SELECT 1 FROM ChiNhanh WHERE TenChiNhanh = N'Garage Chi Nhánh 2 Bình Thạnh')
BEGIN
    INSERT INTO ChiNhanh (TenChiNhanh, DiaChi, SoDienThoai, Email, TrangThai)
    VALUES (N'Garage Chi Nhánh 2 Bình Thạnh', N'45 Điện Biên Phủ, Bình Thạnh, TP.HCM', '02873000002', 'branch2@autocare.local', 1);
END;

DECLARE @Branch1 INT = (SELECT MaChiNhanh FROM ChiNhanh WHERE TenChiNhanh = N'Garage Central Chi Nhánh 1');
DECLARE @Branch2 INT = (SELECT MaChiNhanh FROM ChiNhanh WHERE TenChiNhanh = N'Garage Chi Nhánh 2 Bình Thạnh');

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE TenDangNhap = 'admin')
    INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, TrangThai)
    VALUES ('admin', @PasswordHash, N'Quản trị hệ thống', 'admin@autocare.local', '0900000001', 1);
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE TenDangNhap = 'manager')
    INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, TrangThai)
    VALUES ('manager', @PasswordHash, N'Quản lý Chi Nhánh 1', 'manager@autocare.local', '0900000002', 1);
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE TenDangNhap = 'frontdesk')
    INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, TrangThai)
    VALUES ('frontdesk', @PasswordHash, N'Nhân viên tiếp nhận Chi Nhánh 1', 'receptionist@autocare.local', '0900000003', 1);
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE TenDangNhap = 'technician')
    INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, TrangThai)
    VALUES ('technician', @PasswordHash, N'Kỹ thuật viên Chi Nhánh 1', 'technician@autocare.local', '0900000004', 1);
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE TenDangNhap = 'manager2')
    INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, TrangThai)
    VALUES ('manager2', @PasswordHash, N'Quản lý Chi Nhánh 2', 'manager2@autocare.local', '0900000005', 1);
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE TenDangNhap = 'technician2')
    INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, TrangThai)
    VALUES ('technician2', @PasswordHash, N'Kỹ thuật viên Chi Nhánh 2', 'technician2@autocare.local', '0900000006', 1);

INSERT INTO NguoiDung_VaiTro (MaNguoiDung, MaVaiTro)
SELECT u.MaNguoiDung, r.MaVaiTro
FROM (VALUES
    ('admin', 'ROLE_ADMIN'),
    ('manager', 'ROLE_MANAGER'),
    ('frontdesk', 'ROLE_FRONT_DESK'),
    ('technician', 'ROLE_TECHNICIAN'),
    ('manager2', 'ROLE_MANAGER'),
    ('technician2', 'ROLE_TECHNICIAN')
) AS seed(TenDangNhap, TenVaiTro)
JOIN NguoiDung u ON u.TenDangNhap = seed.TenDangNhap
JOIN VaiTro r ON r.TenVaiTro = seed.TenVaiTro
WHERE NOT EXISTS (
    SELECT 1
    FROM NguoiDung_VaiTro ur
    WHERE ur.MaNguoiDung = u.MaNguoiDung
      AND ur.MaVaiTro = r.MaVaiTro
);

IF NOT EXISTS (SELECT 1 FROM NhanVien nv JOIN NguoiDung u ON u.MaNguoiDung = nv.MaNguoiDung WHERE u.TenDangNhap = 'manager')
    INSERT INTO NhanVien (MaNguoiDung, MaChiNhanh, ChucVu, NgayVaoLam, TrangThai)
    SELECT MaNguoiDung, @Branch1, N'Quản lý chi nhánh', '2024-01-01', 1 FROM NguoiDung WHERE TenDangNhap = 'manager';
IF NOT EXISTS (SELECT 1 FROM NhanVien nv JOIN NguoiDung u ON u.MaNguoiDung = nv.MaNguoiDung WHERE u.TenDangNhap = 'frontdesk')
    INSERT INTO NhanVien (MaNguoiDung, MaChiNhanh, ChucVu, NgayVaoLam, TrangThai)
    SELECT MaNguoiDung, @Branch1, N'Nhân viên tiếp nhận', '2024-01-05', 1 FROM NguoiDung WHERE TenDangNhap = 'frontdesk';
IF NOT EXISTS (SELECT 1 FROM NhanVien nv JOIN NguoiDung u ON u.MaNguoiDung = nv.MaNguoiDung WHERE u.TenDangNhap = 'technician')
    INSERT INTO NhanVien (MaNguoiDung, MaChiNhanh, ChucVu, NgayVaoLam, TrangThai)
    SELECT MaNguoiDung, @Branch1, N'Kỹ thuật viên', '2024-01-10', 1 FROM NguoiDung WHERE TenDangNhap = 'technician';
IF NOT EXISTS (SELECT 1 FROM NhanVien nv JOIN NguoiDung u ON u.MaNguoiDung = nv.MaNguoiDung WHERE u.TenDangNhap = 'manager2')
    INSERT INTO NhanVien (MaNguoiDung, MaChiNhanh, ChucVu, NgayVaoLam, TrangThai)
    SELECT MaNguoiDung, @Branch2, N'Quản lý chi nhánh', '2024-02-01', 1 FROM NguoiDung WHERE TenDangNhap = 'manager2';
IF NOT EXISTS (SELECT 1 FROM NhanVien nv JOIN NguoiDung u ON u.MaNguoiDung = nv.MaNguoiDung WHERE u.TenDangNhap = 'technician2')
    INSERT INTO NhanVien (MaNguoiDung, MaChiNhanh, ChucVu, NgayVaoLam, TrangThai)
    SELECT MaNguoiDung, @Branch2, N'Kỹ thuật viên', '2024-02-10', 1 FROM NguoiDung WHERE TenDangNhap = 'technician2';

COMMIT TRANSACTION;
GO
