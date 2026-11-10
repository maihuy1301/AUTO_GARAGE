package com.garage.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class InvoiceResponse {

    private Integer maHoaDon;
    private Integer maPhieuSuaChua;
    private Integer maKhachHang;
    private String tenKhachHang;
    private Integer maChiNhanh;
    private String tenChiNhanh;
    private Integer maNhanVienThuNgan;
    private String tenThuNgan;
    private BigDecimal tongTien;
    private BigDecimal thanhTien;
    private BigDecimal daThanhToan;
    private BigDecimal conLai;
    private String trangThai;
    private LocalDateTime ngayLap;

    private String soDienThoaiKhachHang;
    private String bienSoXe;
    private String tenHangXe;
    private String tenModel;

    private List<InvoiceServiceItemResponse> services = new ArrayList<>();
    private List<InvoicePartItemResponse> parts = new ArrayList<>();
    private List<PaymentResponse> payments = new ArrayList<>();

    public InvoiceResponse() {}

    public InvoiceResponse(Integer maHoaDon, Integer maPhieuSuaChua,
                           Integer maKhachHang, String tenKhachHang,
                           Integer maChiNhanh, String tenChiNhanh,
                           Integer maNhanVienThuNgan, String tenThuNgan,
                           BigDecimal tongTien, BigDecimal thanhTien,
                           BigDecimal daThanhToan, BigDecimal conLai,
                           String trangThai, LocalDateTime ngayLap,
                           List<InvoiceServiceItemResponse> services,
                           List<InvoicePartItemResponse> parts,
                           List<PaymentResponse> payments) {
        this.maHoaDon = maHoaDon;
        this.maPhieuSuaChua = maPhieuSuaChua;
        this.maKhachHang = maKhachHang;
        this.tenKhachHang = tenKhachHang;
        this.maChiNhanh = maChiNhanh;
        this.tenChiNhanh = tenChiNhanh;
        this.maNhanVienThuNgan = maNhanVienThuNgan;
        this.tenThuNgan = tenThuNgan;
        this.tongTien = tongTien;
        this.thanhTien = thanhTien;
        this.daThanhToan = daThanhToan;
        this.conLai = conLai;
        this.trangThai = trangThai;
        this.ngayLap = ngayLap;
        this.services = services != null ? services : new ArrayList<>();
        this.parts = parts != null ? parts : new ArrayList<>();
        this.payments = payments != null ? payments : new ArrayList<>();
    }

    public Integer getMaHoaDon() { return maHoaDon; }
    public void setMaHoaDon(Integer maHoaDon) { this.maHoaDon = maHoaDon; }

    public Integer getMaPhieuSuaChua() { return maPhieuSuaChua; }
    public void setMaPhieuSuaChua(Integer maPhieuSuaChua) { this.maPhieuSuaChua = maPhieuSuaChua; }

    public Integer getMaKhachHang() { return maKhachHang; }
    public void setMaKhachHang(Integer maKhachHang) { this.maKhachHang = maKhachHang; }

    public String getTenKhachHang() { return tenKhachHang; }
    public void setTenKhachHang(String tenKhachHang) { this.tenKhachHang = tenKhachHang; }

    public Integer getMaChiNhanh() { return maChiNhanh; }
    public void setMaChiNhanh(Integer maChiNhanh) { this.maChiNhanh = maChiNhanh; }

    public String getTenChiNhanh() { return tenChiNhanh; }
    public void setTenChiNhanh(String tenChiNhanh) { this.tenChiNhanh = tenChiNhanh; }

    public Integer getMaNhanVienThuNgan() { return maNhanVienThuNgan; }
    public void setMaNhanVienThuNgan(Integer maNhanVienThuNgan) { this.maNhanVienThuNgan = maNhanVienThuNgan; }

    public String getTenThuNgan() { return tenThuNgan; }
    public void setTenThuNgan(String tenThuNgan) { this.tenThuNgan = tenThuNgan; }

    public BigDecimal getTongTien() { return tongTien; }
    public void setTongTien(BigDecimal tongTien) { this.tongTien = tongTien; }

    public BigDecimal getThanhTien() { return thanhTien; }
    public void setThanhTien(BigDecimal thanhTien) { this.thanhTien = thanhTien; }

    public BigDecimal getDaThanhToan() { return daThanhToan; }
    public void setDaThanhToan(BigDecimal daThanhToan) { this.daThanhToan = daThanhToan; }

    public BigDecimal getConLai() { return conLai; }
    public void setConLai(BigDecimal conLai) { this.conLai = conLai; }

    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String trangThai) { this.trangThai = trangThai; }

    public LocalDateTime getNgayLap() { return ngayLap; }
    public void setNgayLap(LocalDateTime ngayLap) { this.ngayLap = ngayLap; }

    public String getSoDienThoaiKhachHang() { return soDienThoaiKhachHang; }
    public void setSoDienThoaiKhachHang(String soDienThoaiKhachHang) { this.soDienThoaiKhachHang = soDienThoaiKhachHang; }

    public String getBienSoXe() { return bienSoXe; }
    public void setBienSoXe(String bienSoXe) { this.bienSoXe = bienSoXe; }

    public String getTenHangXe() { return tenHangXe; }
    public void setTenHangXe(String tenHangXe) { this.tenHangXe = tenHangXe; }

    public String getTenModel() { return tenModel; }
    public void setTenModel(String tenModel) { this.tenModel = tenModel; }

    public List<InvoiceServiceItemResponse> getServices() { return services; }
    public void setServices(List<InvoiceServiceItemResponse> services) { this.services = services; }

    public List<InvoicePartItemResponse> getParts() { return parts; }
    public void setParts(List<InvoicePartItemResponse> parts) { this.parts = parts; }

    public List<PaymentResponse> getPayments() { return payments; }
    public void setPayments(List<PaymentResponse> payments) { this.payments = payments; }
}
