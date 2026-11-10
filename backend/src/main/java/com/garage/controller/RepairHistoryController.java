package com.garage.controller;

import com.garage.dto.*;
import com.garage.service.RepairHistoryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/repair-history")
@PreAuthorize("hasRole('CUSTOMER')")
public class RepairHistoryController {
    private final RepairHistoryService service;
    public RepairHistoryController(RepairHistoryService service) { this.service = service; }
    @GetMapping
    public ApiResponse<RepairHistoryResponse.Page> list(@RequestParam(required = false) Integer vehicleId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success("Lịch sử sửa chữa", service.list(vehicleId, page, size));
    }
    @GetMapping("/{id}")
    public ApiResponse<RepairHistoryResponse.Detail> detail(@PathVariable Integer id) {
        return ApiResponse.success("Chi tiết lần sửa chữa", service.detail(id));
    }
}
