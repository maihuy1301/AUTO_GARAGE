package com.garage.controller;

import com.garage.dto.ApiResponse;
import com.garage.dto.CreateVehicleRequest;
import com.garage.dto.UpdateVehicleRequest;
import com.garage.dto.VehicleResponse;
import com.garage.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Vehicle REST Controller — /api/vehicles
 *
 * RBAC Matrix:
 *   SYSTEM_ADMIN   → List (all), Detail (any), Create (with maKhachHang), Update (any), Delete (any)
 *   CUSTOMER       → List (own), Detail (own), Create (own — owner from JWT), Update (own), Delete (own)
 *   Others         → 403
 */
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    /** GET /api/vehicles — Danh sách xe (ADMIN/MANAGER/FRONT_DESK: toàn bộ hoặc theo customerId, CUSTOMER: xe của mình) */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'FRONT_DESK', 'CUSTOMER')")
    public ResponseEntity<ApiResponse<List<VehicleResponse>>> getVehicles(
            @RequestParam(required = false) Integer customerId) {
        List<VehicleResponse> vehicles = (customerId != null)
                ? vehicleService.getVehicles(customerId)
                : vehicleService.getVehicles();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách xe thành công", vehicles));
    }

    /** GET /api/vehicles/{id} — Chi tiết xe */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'FRONT_DESK', 'CUSTOMER')")
    public ResponseEntity<ApiResponse<VehicleResponse>> getVehicleById(@PathVariable Integer id) {
        VehicleResponse vehicle = vehicleService.getVehicleById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin xe thành công", vehicle));
    }

    /** POST /api/vehicles — Tạo xe mới */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CUSTOMER')")
    public ResponseEntity<ApiResponse<VehicleResponse>> createVehicle(
            @Valid @RequestBody CreateVehicleRequest request) {
        VehicleResponse vehicle = vehicleService.createVehicle(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo xe thành công", vehicle));
    }

    /** PUT /api/vehicles/{id} — Cập nhật xe */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CUSTOMER')")
    public ResponseEntity<ApiResponse<VehicleResponse>> updateVehicle(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateVehicleRequest request) {
        VehicleResponse vehicle = vehicleService.updateVehicle(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật xe thành công", vehicle));
    }

    /** DELETE /api/vehicles/{id} — Xóa xe (nếu không có business dependency) */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(@PathVariable Integer id) {
        vehicleService.deleteVehicle(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa xe thành công", null));
    }
}
