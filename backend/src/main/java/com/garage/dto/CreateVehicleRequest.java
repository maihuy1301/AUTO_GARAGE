package com.garage.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO tạo xe mới.
 * Cascading Dropdown: maHangXe và maModel đều được gửi từ client.
 * Backend tự xác định owner từ JWT (hoặc maKhachHang nếu là SYSTEM_ADMIN).
 */
public class CreateVehicleRequest {

    /**
     * Chỉ SYSTEM_ADMIN cần truyền field này khi tạo xe cho khách hàng cụ thể.
     * CUSTOMER: backend tự xác định owner từ JWT — field này bị bỏ qua.
     */
    private Integer maKhachHang;

    @NotBlank(message = "Biển số xe không được để trống")
    @Size(max = 20, message = "Biển số xe không được vượt quá 20 ký tự")
    private String bienSo;

    @NotNull(message = "Hãng xe không được để trống")
    private Integer maHangXe;

    @NotNull(message = "Model xe không được để trống")
    private Integer maModel;

    private Integer namSanXuat;

    @Size(max = 50, message = "Màu xe không được vượt quá 50 ký tự")
    private String mauXe;

    @Size(max = 50, message = "Số VIN không được vượt quá 50 ký tự")
    private String soVIN;

    @Min(value = 0, message = "Số KM hiện tại không thể là số âm")
    private Integer soKmHienTai;

    public CreateVehicleRequest() {}

    public Integer getMaKhachHang() { return maKhachHang; }
    public void setMaKhachHang(Integer maKhachHang) { this.maKhachHang = maKhachHang; }

    public String getBienSo() { return bienSo; }
    public void setBienSo(String bienSo) { this.bienSo = bienSo; }

    public Integer getMaHangXe() { return maHangXe; }
    public void setMaHangXe(Integer maHangXe) { this.maHangXe = maHangXe; }

    public void setHangXe(String hangXe) { /* fallback */ }

    public Integer getMaModel() { return maModel; }
    public void setMaModel(Integer maModel) { this.maModel = maModel; }

    public Integer getNamSanXuat() { return namSanXuat; }
    public void setNamSanXuat(Integer namSanXuat) { this.namSanXuat = namSanXuat; }

    public String getMauXe() { return mauXe; }
    public void setMauXe(String mauXe) { this.mauXe = mauXe; }

    public String getSoVIN() { return soVIN; }
    public void setSoVIN(String soVIN) { this.soVIN = soVIN; }

    public Integer getSoKmHienTai() { return soKmHienTai; }
    public void setSoKmHienTai(Integer soKmHienTai) { this.soKmHienTai = soKmHienTai; }
}
