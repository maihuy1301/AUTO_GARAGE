package com.garage.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public class UpdateServiceRequest {

    @NotBlank(message = "Tên dịch vụ không được để trống")
    @Size(max = 150, message = "Tên dịch vụ tối đa 150 ký tự")
    private String tenDichVu;

    @NotNull(message = "Loại dịch vụ không được để trống")
    private Integer maLoaiDichVu;

    @Size(max = 500, message = "Mô tả dịch vụ tối đa 500 ký tự")
    private String moTa;

    @NotNull(message = "Đơn giá dịch vụ không được để trống")
    @DecimalMin(value = "0.0", inclusive = true, message = "Đơn giá dịch vụ không được âm")
    private BigDecimal donGia;

    @Min(value = 1, message = "Thời gian dự kiến không hợp lệ")
    private Integer thoiGianDuKien;

    private List<ServicePartItemRequest> defaultParts;

    public UpdateServiceRequest() {}

    public String getTenDichVu() {
        return tenDichVu;
    }

    public void setTenDichVu(String tenDichVu) {
        this.tenDichVu = tenDichVu;
    }

    public Integer getMaLoaiDichVu() {
        return maLoaiDichVu;
    }

    public void setMaLoaiDichVu(Integer maLoaiDichVu) {
        this.maLoaiDichVu = maLoaiDichVu;
    }

    public String getMoTa() {
        return moTa;
    }

    public void setMoTa(String moTa) {
        this.moTa = moTa;
    }

    public BigDecimal getDonGia() {
        return donGia;
    }

    public void setDonGia(BigDecimal donGia) {
        this.donGia = donGia;
    }

    public Integer getThoiGianDuKien() {
        return thoiGianDuKien;
    }

    public void setThoiGianDuKien(Integer thoiGianDuKien) {
        this.thoiGianDuKien = thoiGianDuKien;
    }

    public List<ServicePartItemRequest> getDefaultParts() {
        return defaultParts;
    }

    public void setDefaultParts(List<ServicePartItemRequest> defaultParts) {
        this.defaultParts = defaultParts;
    }
}
