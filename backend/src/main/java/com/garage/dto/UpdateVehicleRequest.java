package com.garage.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * DTO cập nhật thông tin xe.
 * Hỗ trợ cập nhật maHangXe và maModel (Backend validate model thuộc hãng).
 */
public class UpdateVehicleRequest {

    private Integer maHangXe;
    private Integer maModel;
    private Integer namSanXuat;

    @Size(max = 50, message = "Màu xe không được vượt quá 50 ký tự")
    private String mauXe;

    @Size(max = 50, message = "Số VIN không được vượt quá 50 ký tự")
    private String soVIN;

    @Min(value = 0, message = "Số KM hiện tại không thể là số âm")
    private Integer soKmHienTai;

    public UpdateVehicleRequest() {}

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
