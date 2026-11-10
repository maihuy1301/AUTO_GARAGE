package com.garage.controller;

import com.garage.dto.*;
import com.garage.service.VehicleBrandModelService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
public class VehicleBrandModelController {

    private final VehicleBrandModelService vehicleBrandModelService;

    public VehicleBrandModelController(VehicleBrandModelService vehicleBrandModelService) {
        this.vehicleBrandModelService = vehicleBrandModelService;
    }

    /**
     * GET /api/brands — Lấy danh sách tất cả các hãng xe hoạt động (cho dropdown)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getActiveBrands() {
        List<BrandResponse> list = vehicleBrandModelService.getAllActiveBrands();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hãng xe thành công", list));
    }

    /**
     * GET /api/brands/{brandId} — Chi tiết hãng xe
     */
    @GetMapping("/{brandId}")
    public ResponseEntity<ApiResponse<BrandResponse>> getBrandById(@PathVariable Integer brandId) {
        BrandResponse response = vehicleBrandModelService.getBrandById(brandId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết hãng xe thành công", response));
    }

    /**
     * POST /api/brands — Quản trị viên thêm hãng xe mới
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BrandResponse>> createBrand(@Valid @RequestBody CreateBrandRequest request) {
        BrandResponse response = vehicleBrandModelService.createBrand(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo hãng xe thành công", response));
    }

    /**
     * GET /api/brands/{brandId}/models — Lấy danh sách model theo hãng xe (Cascading dropdown)
     */
    @GetMapping("/{brandId}/models")
    public ResponseEntity<ApiResponse<List<ModelResponse>>> getModelsByBrand(@PathVariable Integer brandId) {
        List<ModelResponse> list = vehicleBrandModelService.getModelsByBrand(brandId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách model xe thành công", list));
    }

    /**
     * POST /api/brands/{brandId}/models — Quản trị viên thêm model xe mới
     */
    @PostMapping("/{brandId}/models")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ModelResponse>> createModel(
            @PathVariable Integer brandId,
            @Valid @RequestBody CreateModelRequest request) {
        ModelResponse response = vehicleBrandModelService.createModel(brandId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo model xe thành công", response));
    }
}
