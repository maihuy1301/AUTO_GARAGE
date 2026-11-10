package com.garage.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RepairHistoryResponse(Integer receptionId, Integer vehicleId, String plate,
        String branchName, LocalDateTime receivedAt, LocalDateTime handedOverAt,
        Integer odometer, String request, BigDecimal total, List<Integer> invoiceIds) {
    public record Page(List<RepairHistoryResponse> items, int page, boolean hasMore) {}
    public record Detail(RepairHistoryResponse visit, List<InvoiceResponse> invoices) {}
}
