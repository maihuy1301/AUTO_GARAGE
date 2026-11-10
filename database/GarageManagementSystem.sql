SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

create database GarageManagementSystem
go
use GarageManagementSystem

go

--ROLE
CREATE TABLE VaiTro (
    MaVaiTro INT IDENTITY(1,1) PRIMARY KEY,
    TenVaiTro VARCHAR(50) UNIQUE NOT NULL,
    MoTa NVARCHAR(255)
);

CREATE TABLE NguoiDung (
	MaNguoiDung INT IDENTITY(1,1) PRIMARY KEY,
	TenDangNhap VARCHAR(50) UNIQUE NOT NULL,
	MatKhauHash VARCHAR(255) NOT NULL,
    HoTen NVARCHAR(100) NOT NULL,
    Email VARCHAR(100),
	SoDienThoai VARCHAR(20),
    AnhDaiDien NVARCHAR(500),
    TrangThai BIT DEFAULT 1,
    NgayTao DATETIME2 DEFAULT SYSDATETIME()
);

CREATE TABLE NguoiDung_VaiTro (
	MaNguoiDung INT NOT NULL,
    MaVaiTro INT NOT NULL,
    PRIMARY KEY (MaNguoiDung, MaVaiTro),
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung),
    FOREIGN KEY (MaVaiTro) REFERENCES VaiTro(MaVaiTro)
);

CREATE TABLE ChiNhanh (
	MaChiNhanh INT IDENTITY(1,1) PRIMARY KEY,
	TenChiNhanh NVARCHAR(150) NOT NULL,
    DiaChi NVARCHAR(255) NOT NULL,
	SoDienThoai VARCHAR(20),
    Email VARCHAR(100),
    TrangThai BIT DEFAULT 1,
    NgayTao DATETIME2 DEFAULT SYSDATETIME()

);

CREATE TABLE NhanVien (
    MaNhanVien INT IDENTITY(1,1) PRIMARY KEY,
	MaNguoiDung INT UNIQUE NOT NULL,
    MaChiNhanh INT NOT NULL,
    ChucVu NVARCHAR(100),
    NgayVaoLam DATE,
    TrangThai BIT DEFAULT 1,
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung),
    FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh)
);

CREATE TABLE KhachHang (
	MaKhachHang INT IDENTITY(1,1) PRIMARY KEY,
	MaNguoiDung INT UNIQUE NOT NULL,
    DiaChi NVARCHAR(255),
    NgaySinh DATE,
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung)
);

CREATE TABLE HangXe (
    MaHangXe INT IDENTITY(1,1) PRIMARY KEY,
    TenHangXe NVARCHAR(255) NOT NULL,
    TrangThai BIT NOT NULL DEFAULT 1
);

CREATE TABLE ModelXe (
    MaModel INT IDENTITY(1,1) PRIMARY KEY,
    MaHangXe INT NOT NULL,
    TenModel NVARCHAR(100) NOT NULL,
    TrangThai BIT NOT NULL DEFAULT 1,

    FOREIGN KEY (MaHangXe) REFERENCES HangXe(MaHangXe),
    CONSTRAINT UQ_ModelXe_HangXe UNIQUE (MaHangXe, TenModel)
);

CREATE TABLE Xe (
    MaXe INT IDENTITY(1,1) PRIMARY KEY,
	MaKhachHang INT NOT NULL,
    BienSo VARCHAR(20) UNIQUE NOT NULL,
    MaModel INT, --note: Backend cần xử lí các model thuộc về HangXe nào!
    NamSanXuat INT,
    MauXe NVARCHAR(50),
    SoVIN VARCHAR(50), --Số khung xe
	SoKmHienTai INT DEFAULT 0,
    NgayTao DATETIME2 DEFAULT SYSDATETIME(),
    TrangThai BIT DEFAULT 1,
    FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang),
	FOREIGN KEY (MaModel) REFERENCES ModelXe(MaModel) 
);

CREATE TABLE HinhAnhXe (
    MaHinhAnhXe INT IDENTITY(1,1) PRIMARY KEY,
    MaXe INT NOT NULL UNIQUE,
    DuongDanAnh NVARCHAR(500) NOT NULL,
    TenTepGoc NVARCHAR(255) NOT NULL,
    LoaiNoiDung VARCHAR(100) NOT NULL,
    KichThuoc BIGINT NOT NULL,
    NgayCapNhat DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaXe) REFERENCES Xe(MaXe) ON DELETE CASCADE
);

CREATE TABLE LoaiDichVu (
	MaLoaiDichVu INT IDENTITY(1,1) PRIMARY KEY,
    TenLoai NVARCHAR(100) NOT NULL,
    MoTa NVARCHAR(255),
    TrangThai BIT DEFAULT 1
);

CREATE TABLE DichVu (
    MaDichVu INT IDENTITY(1,1) PRIMARY KEY,
    MaLoaiDichVu INT NOT NULL,
    TenDichVu NVARCHAR(150) NOT NULL,
    MoTa NVARCHAR(500),
    DonGia DECIMAL(18,2) NOT NULL,
    ThoiGianDuKien INT, --tính bằng giờ
    TrangThai BIT DEFAULT 1,
    FOREIGN KEY (MaLoaiDichVu) REFERENCES LoaiDichVu(MaLoaiDichVu)
);


CREATE TABLE DatLich (
    MaDatLich INT IDENTITY(1,1) PRIMARY KEY,
	MaKhachHang INT NOT NULL,
	MaNhanVienXacNhan INT,
    MaXe INT NOT NULL,
    MaChiNhanh INT NOT NULL,
	ThoiGianHen DATETIME2 NOT NULL,
    TrangThai VARCHAR(30) NOT NULL DEFAULT 'CHO_XAC_NHAN',
    GhiChu NVARCHAR(500),
    NgayDat DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang),
    FOREIGN KEY (MaXe) REFERENCES Xe(MaXe),
    FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh),
	FOREIGN KEY (MaNhanVienXacNhan) REFERENCES NhanVien(MaNhanVien)
);

--CHO_XAC_NHAN | DA_XAC_NHAN | DA_TIEP_NHAN | DANG_XU_LY | HOAN_TAT | HUY
-- Một lịch có thể chọn nhiều dịch vụ.
-- Mỗi dịch vụ chỉ được chọn 1 lần trong một lịch.
CREATE TABLE DatLich_DichVu (
    MaDatLich INT NOT NULL,
    MaDichVu INT NOT NULL,
    GhiChu NVARCHAR(255),
    PRIMARY KEY (MaDatLich, MaDichVu),
    FOREIGN KEY (MaDatLich) REFERENCES DatLich(MaDatLich),
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu)
);

CREATE TABLE PhieuTiepNhan (
    MaTiepNhan INT IDENTITY(1,1) PRIMARY KEY,
    MaDatLich INT NULL,
    MaXe INT NOT NULL,
    MaChiNhanh INT NOT NULL,
	MaNhanVienTiepNhan INT NOT NULL,
    ThoiGianTiepNhan DATETIME2 DEFAULT SYSDATETIME(),
    SoKm INT,
	TinhTrangNgoaiThat NVARCHAR(1000),
	YeuCauKhachHang NVARCHAR(1000),
    TrangThai VARCHAR(30) DEFAULT 'DA_TIEP_NHAN',
    FOREIGN KEY (MaDatLich) REFERENCES DatLich(MaDatLich),
    FOREIGN KEY (MaXe) REFERENCES Xe(MaXe),
    FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh),
    FOREIGN KEY (MaNhanVienTiepNhan) REFERENCES NhanVien(MaNhanVien)
);

CREATE TABLE PhieuSuaChua (
	MaPhieuSuaChua INT IDENTITY(1,1) PRIMARY KEY,
    MaTiepNhan INT NOT NULL,
    MaChiNhanh INT NOT NULL,
	MaPhieuCha INT NULL,
	ThoiGianBatDau DATETIME2,
	ThoiGianHoanTat DATETIME2,
    TrangThai VARCHAR(30) DEFAULT 'CHO_XU_LY',
    GhiChu NVARCHAR(1000),
    FOREIGN KEY (MaTiepNhan) REFERENCES PhieuTiepNhan(MaTiepNhan),
    FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh),
	FOREIGN KEY (MaPhieuCha) REFERENCES PhieuSuaChua(MaPhieuSuaChua)
);
--CHO_XU_LY | DA_PHAN_CONG | DANG_SUA | CHO_KH_DUYET | TAM_DUNG | HOAN_TAT | HUY

CREATE TABLE PhieuSuaChua_DichVu (
    MaChiTiet INT IDENTITY(1,1) PRIMARY KEY,
    MaPhieuSuaChua INT NOT NULL,
    MaDichVu INT NOT NULL,
    DonGia DECIMAL(18,2) NOT NULL,
    ThanhTien AS (DonGia) PERSISTED,
    TrangThai VARCHAR(30) DEFAULT 'CHO_XU_LY',
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua),
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu)
);

CREATE TABLE PhanCong (
    MaPhanCong INT IDENTITY(1,1) PRIMARY KEY,
    MaPhieuSuaChua INT NOT NULL,
    MaNguoiPhanCong INT NOT NULL,
    MaNguoiDuyet INT NULL,
    MaNhanVienDuocPhanCong INT NOT NULL,
    ThoiGianTao DATETIME2 DEFAULT SYSDATETIME(),
    ThoiGianDuyet DATETIME2 NULL,
    TrangThai VARCHAR(30) NOT NULL DEFAULT 'CHO_DUYET',
    GhiChu NVARCHAR(500),
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua),
    FOREIGN KEY (MaNguoiPhanCong) REFERENCES NhanVien(MaNhanVien),
    FOREIGN KEY (MaNguoiDuyet) REFERENCES NhanVien(MaNhanVien),
    FOREIGN KEY (MaNhanVienDuocPhanCong) REFERENCES NhanVien(MaNhanVien)
);

CREATE TABLE HinhAnhSuaChua (
    MaHinhAnh INT IDENTITY(1,1) PRIMARY KEY,
	MaPhieuSuaChua INT NOT NULL,
    MaNhanVien INT NOT NULL,
	DuongDanAnh NVARCHAR(500) NOT NULL,
    LoaiAnh VARCHAR(30),
    MoTa NVARCHAR(500),
	ThoiGianChup DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua),
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNhanVien)
);

CREATE TABLE PhuTung (
    MaPhuTung INT IDENTITY(1,1) PRIMARY KEY,
    MaPhuTungCode VARCHAR(30) NOT NULL,
    TenPhuTung NVARCHAR(150) NOT NULL,
    DonViTinh NVARCHAR(30),
    GiaNhap DECIMAL(18,2),
    GiaBan DECIMAL(18,2),
    TrangThai BIT DEFAULT 1
);
CREATE TABLE PhieuSuaChua_PhuTung (
    MaChiTiet INT IDENTITY(1,1) PRIMARY KEY,
	MaPhieuSuaChua INT NOT NULL,
    MaPhuTung INT NOT NULL,
	MaDichVuChiTiet INT NULL,
    SoLuong INT NOT NULL,
    DonGia DECIMAL(18,2) NOT NULL,
    ThanhTien AS (SoLuong * DonGia) PERSISTED,
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua),
    FOREIGN KEY (MaPhuTung) REFERENCES PhuTung(MaPhuTung),
	FOREIGN KEY (MaDichVuChiTiet) REFERENCES PhieuSuaChua_DichVu(MaChiTiet)
);
CREATE TABLE DichVu_PhuTung (
    MaDichVu INT NOT NULL,
    MaPhuTung INT NOT NULL,
	SoLuong INT, --Đại diện cho số lượng phụ tùng sử dụng
    PRIMARY KEY (MaDichVu, MaPhuTung),
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu),
    FOREIGN KEY (MaPhuTung) REFERENCES PhuTung(MaPhuTung)
);

CREATE TABLE GiaoDichKho ( --Tự động lưu khi có giao dịch nhập xuất đối với phụ tùng
    MaGiaoDich INT IDENTITY(1,1) PRIMARY KEY,
	MaChiNhanh INT NOT NULL,
    MaPhuTung INT NOT NULL,
	LoaiGiaoDich VARCHAR(30) NOT NULL, --NHAP (MANAGER), XUAT(TECHNICIAN)
    SoLuong INT NOT NULL,
	MaPhieuSuaChua INT NULL,
    GhiChu NVARCHAR(500),
    ThoiGian DATETIME2 DEFAULT SYSDATETIME(),
	FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh),
    FOREIGN KEY (MaPhuTung) REFERENCES PhuTung(MaPhuTung),
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua)
);

CREATE TABLE TonKho (
    MaChiNhanh INT NOT NULL,
    MaPhuTung INT NOT NULL,
    SoLuongTon INT NOT NULL DEFAULT 0,
    SoLuongToiThieu INT NOT NULL DEFAULT 0,
    PRIMARY KEY (MaChiNhanh, MaPhuTung),
    FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh),
    FOREIGN KEY (MaPhuTung) REFERENCES PhuTung(MaPhuTung)
);

CREATE TABLE HoaDon (
    MaHoaDon INT IDENTITY(1,1) PRIMARY KEY,
	MaPhieuSuaChua INT,
	MaKhachHang INT,
    MaChiNhanh INT NOT NULL,
	MaNhanVienThuNgan INT,
    TongTien DECIMAL(18,2) NOT NULL DEFAULT 0,
    ThanhTien DECIMAL(18,2) NOT NULL,
    TrangThai VARCHAR(30) DEFAULT 'CHUA_THANH_TOAN',
    NgayLap DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua),
    FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang),
    FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh),
    FOREIGN KEY (MaNhanVienThuNgan) REFERENCES NhanVien(MaNhanVien)
);

CREATE TABLE HoaDon_DichVu (
    MaChiTiet INT IDENTITY(1,1) PRIMARY KEY,
    MaHoaDon INT NOT NULL,
    MaPhieuDichVu INT NOT NULL,
    DonGia DECIMAL(18,2) NOT NULL,
    ThanhTien AS (DonGia) PERSISTED,
    FOREIGN KEY (MaHoaDon) REFERENCES HoaDon(MaHoaDon),
    FOREIGN KEY (MaPhieuDichVu) REFERENCES PhieuSuaChua_DichVu(MaChiTiet)
);

CREATE TABLE HoaDon_PhuTung (
    MaChiTiet INT IDENTITY(1,1) PRIMARY KEY,
    MaHoaDon INT NOT NULL,
	MaDichVuChiTiet INT NULL,
    MaPhieuPhuTung INT NULL,
    SoLuong INT NOT NULL,
    DonGia DECIMAL(18,2) NOT NULL,
    ThanhTien AS (SoLuong * DonGia) PERSISTED,
    FOREIGN KEY (MaHoaDon) REFERENCES HoaDon(MaHoaDon),
	FOREIGN KEY (MaDichVuChiTiet) REFERENCES HoaDon_DichVu(MaChiTiet),
    FOREIGN KEY (MaPhieuPhuTung) REFERENCES PhieuSuaChua_PhuTung(MaChiTiet)
	
);

CREATE TABLE ThanhToan (
	MaThanhToan INT IDENTITY(1,1) PRIMARY KEY,
    MaHoaDon INT NOT NULL,
    SoTien DECIMAL(18,2) NOT NULL,
    PhuongThuc VARCHAR(30) NOT NULL,
    MaGiaoDich VARCHAR(100),
	ThoiGianThanhToan DATETIME2 DEFAULT SYSDATETIME(),
    TrangThai VARCHAR(30) DEFAULT 'THANH_CONG',
    FOREIGN KEY (MaHoaDon) REFERENCES HoaDon(MaHoaDon)
);

CREATE TABLE DanhGia (
    MaDanhGia INT IDENTITY(1,1) PRIMARY KEY,
	MaKhachHang INT NOT NULL,
	MaPhieuSuaChua INT NOT NULL UNIQUE,
    SoSao INT NOT NULL,
    NoiDung NVARCHAR(1000),
	NgayDanhGia DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang),
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua),
    CONSTRAINT CK_DanhGia_SoSao CHECK (SoSao BETWEEN 1 AND 5)
);

CREATE TABLE NhacBaoDuong (
    MaNhac INT IDENTITY(1,1) PRIMARY KEY,
    MaXe INT NOT NULL,
    MaDichVu INT NULL,
    MaPhieuSuaChua INT NULL,
    NgayDuKien DATE,
    KmDuKien INT,
    TrangThai VARCHAR(30) DEFAULT 'CHO_NHAC',
    DaGuiThongBao BIT DEFAULT 0,
    FOREIGN KEY (MaXe) REFERENCES Xe(MaXe),
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu),
    FOREIGN KEY (MaPhieuSuaChua) REFERENCES PhieuSuaChua(MaPhieuSuaChua)
);


CREATE TABLE ThongBao (
    MaThongBao INT IDENTITY(1,1) PRIMARY KEY,
	MaNguoiDung INT NOT NULL,
    TieuDe NVARCHAR(200) NOT NULL,
    NoiDung NVARCHAR(1000),
	LoaiThongBao VARCHAR(50),
	MaThamChieu INT NULL,
    DaDoc BIT DEFAULT 0,
    NgayTao DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung)
);

CREATE TABLE ThietBiPush (
    TokenHash CHAR(64) NOT NULL PRIMARY KEY,
    FcmToken VARCHAR(2048) NOT NULL,
    MaNguoiDung INT NOT NULL,
    CapNhatLuc DATETIME2 NOT NULL,
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung)
);
CREATE INDEX IX_ThietBiPush_NguoiDung ON ThietBiPush(MaNguoiDung);

CREATE TABLE BanGiaoXe (
    MaTiepNhan INT NOT NULL PRIMARY KEY,
    MaNguoiBanGiao INT NOT NULL,
    ThoiGianBanGiao DATETIME2 NOT NULL,
    GhiChu NVARCHAR(500) NULL,
    FOREIGN KEY (MaTiepNhan) REFERENCES PhieuTiepNhan(MaTiepNhan),
    FOREIGN KEY (MaNguoiBanGiao) REFERENCES NguoiDung(MaNguoiDung)
);

CREATE TABLE CuocHoiThoai (
	MaCuocHoiThoai INT IDENTITY(1,1) PRIMARY KEY,
	MaKhachHang INT NOT NULL,
    MaNhanVien INT NULL, -- Có thể NULL lúc đầu, nhân viên nào vào chat thì gán ID sau
    MaTiepNhan INT NULL, -- Tham chiếu tới phiếu tiếp nhận (nếu chat về đợt sửa chữa này)
    TrangThai VARCHAR(30) DEFAULT 'DANG_MO', -- 'DANG_MO', 'DA_DONG'
    NgayTao DATETIME2 DEFAULT SYSDATETIME(),
	NgayCapNhatCuoi DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang),
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNhanVien),
    FOREIGN KEY (MaTiepNhan) REFERENCES PhieuTiepNhan(MaTiepNhan)
);

CREATE TABLE TinNhan (
    MaTinNhan INT IDENTITY(1,1) PRIMARY KEY,
	MaCuocHoiThoai INT NOT NULL,
    MaNguoiGui INT NOT NULL, -- MaNguoiDung của người gửi (Khách hoặc Nhân viên)
    NoiDung NVARCHAR(2000),
	DuongDanTep NVARCHAR(500), -- Nếu muốn gửi kèm hình ảnh/file báo giá
    DaDoc BIT DEFAULT 0,
	ThoiGianGui DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (MaCuocHoiThoai) REFERENCES CuocHoiThoai(MaCuocHoiThoai),
    FOREIGN KEY (MaNguoiGui) REFERENCES NguoiDung(MaNguoiDung)
);

--XÓA CÁC BẢNG LIÊN QUAN ĐỂ DỄ TEST LẠI
Delete from HoaDon_PhuTung
Delete from HoaDon_DichVu
Delete from HoaDon
Delete from PhieuSuaChua_PhuTung
Delete from PhieuSuaChua_DichVu
Delete from PhanCong
Delete from PhieuSuaChua
Delete from PhieuTiepNhan
Delete from DatLich_DichVu
Delete from DatLich

-- SePay payment sessions (approved 2026-09-30).
-- Additive migration approved on 2026-09-30.
-- Database: GarageManagementSystem. No existing rows/tables are changed.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.PhienThanhToan', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PhienThanhToan (
        MaPhien VARCHAR(36) NOT NULL PRIMARY KEY,
        MaHoaDon INT NOT NULL REFERENCES dbo.HoaDon(MaHoaDon),
        SoTien DECIMAL(18,2) NOT NULL CHECK (SoTien > 0),
        NoiDung VARCHAR(40) NOT NULL UNIQUE,
        MoiTruong VARCHAR(10) NOT NULL,
        MaNganHang VARCHAR(50) NOT NULL,
        TenNganHang NVARCHAR(100) NOT NULL,
        SoTaiKhoan VARCHAR(50) NOT NULL,
        TenChuTaiKhoan NVARCHAR(150) NOT NULL,
        TrangThai VARCHAR(30) NOT NULL,
        TaoLuc DATETIME2 NOT NULL,
        HetHanLuc DATETIME2 NOT NULL
    );
    CREATE INDEX IX_PhienThanhToan_HoaDon ON dbo.PhienThanhToan(MaHoaDon);
END;
IF OBJECT_ID('dbo.GiaoDichSePay', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GiaoDichSePay (
        MaGiaoDich VARCHAR(100) NOT NULL PRIMARY KEY,
        MaPhien VARCHAR(36) NULL REFERENCES dbo.PhienThanhToan(MaPhien),
        SoTien DECIMAL(18,2) NOT NULL,
        MaNganHang VARCHAR(50) NOT NULL,
        SoTaiKhoan VARCHAR(50) NOT NULL,
        NoiDung NVARCHAR(1000) NOT NULL,
        MaThamChieu VARCHAR(100) NULL,
        KetQua VARCHAR(40) NOT NULL,
        NhanLuc DATETIME2 NOT NULL
    );
END;
COMMIT;

GO

-- Support chat (approved 2026-10-02).
-- Approved by user on 2026-10-02. Additive support chat migration.
-- Apply only to GarageManagementSystem; existing business data is preserved.
IF DB_NAME() <> N'GarageManagementSystem' THROW 51001, 'Unexpected database.', 1;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.HoiThoaiHoTro', N'U') IS NOT NULL
   OR OBJECT_ID(N'dbo.TinNhanHoTro', N'U') IS NOT NULL
   OR OBJECT_ID(N'dbo.TrangThaiDocHoTro', N'U') IS NOT NULL
BEGIN
    ROLLBACK TRANSACTION;
    THROW 51000, 'Support chat tables already exist. Inspect schema before applying.', 1;
END;
CREATE TABLE dbo.HoiThoaiHoTro (
    MaHoiThoai INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customerId INT NOT NULL REFERENCES dbo.NguoiDung(MaNguoiDung),
    MaChiNhanh INT NOT NULL REFERENCES dbo.ChiNhanh(MaChiNhanh),
    agentId INT NULL REFERENCES dbo.NguoiDung(MaNguoiDung),
    TrangThai VARCHAR(20) NOT NULL,
    ThoiDiemCapNhat DATETIME2 NOT NULL,
    MaTinNhanCuoi BIGINT NULL,
    MaTinNhanChoBotXuLy BIGINT NULL,
    CONSTRAINT UQ_HoiThoaiHoTro_KhachChiNhanh UNIQUE (customerId, MaChiNhanh),
    CONSTRAINT CK_HoiThoaiHoTro_TrangThai CHECK (TrangThai IN ('BOT','WAITING','HUMAN')),
    CONSTRAINT CK_HoiThoaiHoTro_NguoiHoTro CHECK
       ((TrangThai = 'HUMAN' AND agentId IS NOT NULL) OR (TrangThai IN ('BOT','WAITING') AND agentId IS NULL))
);
CREATE INDEX IX_HoiThoaiHoTro_ChiNhanhCapNhat ON dbo.HoiThoaiHoTro(MaChiNhanh, ThoiDiemCapNhat DESC);
CREATE TABLE dbo.TinNhanHoTro (
    MaTinNhan BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaHoiThoai INT NOT NULL REFERENCES dbo.HoiThoaiHoTro(MaHoiThoai),
    MaNguoiGui INT NULL REFERENCES dbo.NguoiDung(MaNguoiDung),
    LoaiNguoiGui VARCHAR(12) NOT NULL,
    NoiDung NVARCHAR(2000) NOT NULL,
    MaChongTrung VARCHAR(100) NOT NULL,
    ThoiDiemGui DATETIME2 NOT NULL,
    MaDatLich INT NULL REFERENCES dbo.DatLich(MaDatLich),
    MaBamYeuCau VARCHAR(64) NULL,
    CONSTRAINT UQ_TinNhanHoTro_ChongTrung UNIQUE (MaHoiThoai, MaChongTrung),
    CONSTRAINT CK_TinNhanHoTro_NguoiGui CHECK
       ((LoaiNguoiGui IN ('BOT','SYSTEM') AND MaNguoiGui IS NULL) OR
        (LoaiNguoiGui IN ('CUSTOMER','STAFF') AND MaNguoiGui IS NOT NULL))
);
CREATE INDEX IX_TinNhanHoTro_LichSu ON dbo.TinNhanHoTro(MaHoiThoai, MaTinNhan DESC);
CREATE TABLE dbo.TrangThaiDocHoTro (
    MaTrangThaiDoc BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaHoiThoai INT NOT NULL REFERENCES dbo.HoiThoaiHoTro(MaHoiThoai),
    MaNguoiDung INT NOT NULL REFERENCES dbo.NguoiDung(MaNguoiDung),
    MaTinNhanDaDocCuoi BIGINT NOT NULL,
    CONSTRAINT UQ_TrangThaiDocHoTro_ThanhVien UNIQUE (MaHoiThoai, MaNguoiDung),
    CONSTRAINT CK_TrangThaiDocHoTro_MaTinNhan CHECK (MaTinNhanDaDocCuoi >= 0)
);
COMMIT TRANSACTION;
GO

-- Repair chat (approved 2026-10-09)
-- Approved by user on 2026-10-09. Additive repair chat migration.
IF DB_NAME() <> N'GarageManagementSystem' THROW 51001, 'Unexpected database.', 1;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.PhongChatSuaChua', N'U') IS NOT NULL
   OR OBJECT_ID(N'dbo.TinNhanSuaChua', N'U') IS NOT NULL
BEGIN
    ROLLBACK TRANSACTION;
    THROW 51002, 'Repair chat tables already exist. Inspect schema before applying.', 1;
END;

CREATE TABLE dbo.PhongChatSuaChua (
    MaTiepNhan INT NOT NULL PRIMARY KEY,
    ThoiDiemXoa DATETIME2 NULL,
    MaNguoiXoa INT NULL,
    CONSTRAINT FK_PhongChatSuaChua_TiepNhan FOREIGN KEY (MaTiepNhan) REFERENCES dbo.PhieuTiepNhan(MaTiepNhan),
    CONSTRAINT FK_PhongChatSuaChua_NguoiXoa FOREIGN KEY (MaNguoiXoa) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_PhongChatSuaChua_ThongTinXoa CHECK (
        (ThoiDiemXoa IS NULL AND MaNguoiXoa IS NULL) OR (ThoiDiemXoa IS NOT NULL AND MaNguoiXoa IS NOT NULL))
);

CREATE TABLE dbo.TinNhanSuaChua (
    MaTinNhan BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaTiepNhan INT NOT NULL,
    MaNguoiGui INT NOT NULL,
    VaiTroNguoiGui VARCHAR(20) NOT NULL,
    MaChongTrung VARCHAR(64) NOT NULL,
    NoiDung NVARCHAR(2000) NOT NULL,
    ThoiDiemGui DATETIME2 NOT NULL,
    CONSTRAINT FK_TinNhanSuaChua_Phong FOREIGN KEY (MaTiepNhan) REFERENCES dbo.PhongChatSuaChua(MaTiepNhan),
    CONSTRAINT FK_TinNhanSuaChua_NguoiGui FOREIGN KEY (MaNguoiGui) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_TinNhanSuaChua_VaiTro CHECK (VaiTroNguoiGui IN ('ADMIN','MANAGER','FRONT_DESK','TECHNICIAN')),
    CONSTRAINT CK_TinNhanSuaChua_NoiDung CHECK (LEN(LTRIM(RTRIM(NoiDung))) > 0),
    CONSTRAINT UQ_TinNhanSuaChua_ChongTrung UNIQUE (MaTiepNhan, MaNguoiGui, MaChongTrung)
);
CREATE INDEX IX_TinNhanSuaChua_LichSu ON dbo.TinNhanSuaChua(MaTiepNhan, MaTinNhan);

COMMIT;
-- Xoa vinh vien: DELETE cac tin cua phong; giu marker MaTiepNhan/ThoiDiemXoa/MaNguoiXoa
-- de audit va ngan tai tao phong cu. Khong xoa anh ho so xe/chung tu.

GO
