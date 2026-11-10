package com.garage.service;

import com.garage.dto.RepairHistoryResponse;
import com.garage.exception.BadRequestException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class RepairHistoryService {
    private final RepairHistoryRepository history;
    private final NguoiDungRepository users;
    private final KhachHangRepository customers;
    private final InvoiceService invoices;
    public RepairHistoryService(RepairHistoryRepository history, NguoiDungRepository users,
            KhachHangRepository customers, InvoiceService invoices) {
        this.history = history; this.users = users; this.customers = customers; this.invoices = invoices;
    }
    public RepairHistoryResponse.Page list(Integer vehicleId, int page, int size) {
        int customer = customerId();
        if (page < 0 || size < 1 || size > 50 || (vehicleId != null && vehicleId < 1))
            throw new BadRequestException("Tham số phân trang hoặc xe không hợp lệ");
        var visits = history.findVisits(customer, vehicleId, null, PageRequest.of(page, size));
        return new RepairHistoryResponse.Page(map(customer, visits.getContent()), page, visits.hasNext());
    }
    public RepairHistoryResponse.Detail detail(Integer id) {
        int customer = customerId();
        var visits = history.findVisits(customer, null, id, PageRequest.of(0, 1));
        if (visits.isEmpty()) throw new ResourceNotFoundException("Không tìm thấy lần sửa chữa trong lịch sử");
        var visit = map(customer, visits.getContent()).get(0);
        return new RepairHistoryResponse.Detail(visit,
            visit.invoiceIds().stream().map(invoices::getInvoiceById).toList());
    }
    private List<RepairHistoryResponse> map(int customer, List<RepairHistoryRepository.Visit> visits) {
        if (visits.isEmpty()) return List.of();
        var bills = history.findBills(customer, visits.stream().map(RepairHistoryRepository.Visit::getReceptionId).toList())
            .stream().collect(Collectors.groupingBy(RepairHistoryRepository.Bill::getReceptionId));
        return visits.stream().map(v -> {
            var rows = bills.getOrDefault(v.getReceptionId(), List.of());
            return new RepairHistoryResponse(v.getReceptionId(), v.getVehicleId(), v.getPlate(), v.getBranchName(),
                v.getReceivedAt(), v.getHandedOverAt(), v.getOdometer(), v.getRequest(),
                rows.isEmpty() ? null : rows.stream().map(RepairHistoryRepository.Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add),
                rows.stream().map(RepairHistoryRepository.Bill::getInvoiceId).toList());
        }).toList();
    }
    private int customerId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER")))
            throw new AccessDeniedException("Chỉ khách hàng được xem lịch sử xe của mình");
        var user = users.findByTenDangNhapOrEmail(auth.getName(), auth.getName())
            .filter(u -> Boolean.TRUE.equals(u.getTrangThai()))
            .orElseThrow(() -> new AccessDeniedException("Tài khoản không hoạt động"));
        return customers.findByNguoiDungMaNguoiDung(user.getMaNguoiDung())
            .orElseThrow(() -> new AccessDeniedException("Không tìm thấy hồ sơ khách hàng")).getMaKhachHang();
    }
}
