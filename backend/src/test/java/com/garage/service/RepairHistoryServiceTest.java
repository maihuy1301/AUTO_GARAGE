package com.garage.service;

import com.garage.dto.InvoiceResponse;
import com.garage.entity.*;
import com.garage.exception.*;
import com.garage.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class RepairHistoryServiceTest {
    final RepairHistoryRepository history = mock(RepairHistoryRepository.class);
    final NguoiDungRepository users = mock(NguoiDungRepository.class);
    final KhachHangRepository customers = mock(KhachHangRepository.class);
    final InvoiceService invoices = mock(InvoiceService.class);
    final RepairHistoryService service = new RepairHistoryService(history, users, customers, invoices);
    @BeforeEach void setup() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            "customer", null, List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        var user = new NguoiDung(); user.setMaNguoiDung(5); user.setTrangThai(true);
        var customer = new KhachHang(); customer.setMaKhachHang(7);
        when(users.findByTenDangNhapOrEmail("customer", "customer")).thenReturn(Optional.of(user));
        when(customers.findByNguoiDungMaNguoiDung(5)).thenReturn(Optional.of(customer));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    RepairHistoryRepository.Visit visit(int id) {
        var v = mock(RepairHistoryRepository.Visit.class); when(v.getReceptionId()).thenReturn(id); return v;
    }
    RepairHistoryRepository.Bill bill(int visit, int id, String total) {
        var b = mock(RepairHistoryRepository.Bill.class);
        when(b.getReceptionId()).thenReturn(visit); when(b.getInvoiceId()).thenReturn(id);
        when(b.getTotal()).thenReturn(new BigDecimal(total)); return b;
    }
    @Test void listUsesAuthenticatedOwnerAndBatchesTotalsWithoutLoadingInvoiceDetails() {
        doReturn(new SliceImpl<>(List.of(visit(10), visit(11)), PageRequest.of(0, 2), true))
            .when(history).findVisits(eq(7), eq(42), isNull(), any());
        doReturn(List.of(bill(10, 100, "100.50"), bill(10, 101, "200"), bill(11, 102, "100.50")))
            .when(history).findBills(7, List.of(10, 11));
        var page = service.list(42, 0, 2);
        assertThat(page.hasMore()).isTrue();
        assertThat(page.items().get(0).total()).isEqualByComparingTo("300.50");
        assertThat(page.items().get(0).invoiceIds()).containsExactly(100, 101);
        assertThat(page.items().get(1).total()).isEqualByComparingTo("100.50");
        verify(history, times(1)).findBills(anyInt(), anyList()); verifyNoInteractions(invoices);
    }
    @Test void emptyPageDoesNotQueryBills() {
        when(history.findVisits(eq(7), isNull(), isNull(), any())).thenReturn(new SliceImpl<>(List.of()));
        assertThat(service.list(null, 0, 20).items()).isEmpty();
        verify(history, never()).findBills(anyInt(), anyList());
    }
    @Test void absentOrOtherOwnersOrNotHandedOverVisitReturns404BeforeInvoiceAccess() {
        when(history.findVisits(eq(7), isNull(), eq(999), any())).thenReturn(new SliceImpl<>(List.of()));
        assertThatThrownBy(() -> service.detail(999)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(invoices); verify(history, never()).findBills(anyInt(), anyList());
    }
    @Test void detailLoadsEachActualInvoiceOnceIncludingConsolidatedInvoice() {
        doReturn(new SliceImpl<>(List.of(visit(10)))).when(history).findVisits(eq(7), isNull(), eq(10), any());
        doReturn(List.of(bill(10, 100, "300"))).when(history).findBills(7, List.of(10));
        var invoice = new InvoiceResponse(); when(invoices.getInvoiceById(100)).thenReturn(invoice);
        assertThat(service.detail(10).invoices()).containsExactly(invoice);
        verify(invoices, times(1)).getInvoiceById(100);
    }
    @Test void missingBillsAreUnknownCostNotZero() {
        doReturn(new SliceImpl<>(List.of(visit(10)))).when(history).findVisits(eq(7), isNull(), isNull(), any());
        when(history.findBills(7, List.of(10))).thenReturn(List.of());
        assertThat(service.list(null, 0, 20).items().get(0).total()).isNull();
    }
    @Test void rejectsInvalidPagination() {
        assertThatThrownBy(() -> service.list(null, -1, 20)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.list(null, 0, 51)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.list(null, 0, 0)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(history);
    }
    @Test void staffCannotUseCustomerHistoryEvenThroughService() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            "staff", null, List.of(new SimpleGrantedAuthority("ROLE_FRONT_DESK"))));
        assertThatThrownBy(() -> service.list(null, 0, 20)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(history);
    }
    @Test void disabledCustomerCannotReadHistory() {
        users.findByTenDangNhapOrEmail("customer", "customer").orElseThrow().setTrangThai(false);
        assertThatThrownBy(() -> service.detail(10)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(history);
    }
}
