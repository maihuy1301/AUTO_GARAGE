package com.garage.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.garage.dto.*;
import com.garage.entity.NguoiDung;
import com.garage.entity.NguoiDungVaiTro;
import com.garage.entity.VaiTro;
import com.garage.repository.NguoiDungRepository;
import com.garage.repository.NguoiDungVaiTroRepository;
import com.garage.security.JwtService;
import com.garage.service.InvoiceService;
import com.garage.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class InvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InvoiceService invoiceService;

    @MockBean
    private PaymentService paymentService;

    @MockBean
    private NguoiDungRepository nguoiDungRepository;

    @MockBean
    private NguoiDungVaiTroRepository nguoiDungVaiTroRepository;

    private NguoiDung mockUser(Integer id, String username) {
        NguoiDung u = new NguoiDung();
        u.setMaNguoiDung(id);
        u.setTenDangNhap(username);
        u.setHoTen(username + " FullName");
        u.setEmail(username + "@garage.com");
        u.setMatKhauHash("$2a$10$ClEFdX0R7SanUp/08zNDYOFUdflLGCXChrTo25Hwo2OZAD80z/NjO");
        u.setTrangThai(true);
        return u;
    }

    private void stubUser(NguoiDung user, String roleName) {
        VaiTro role = new VaiTro();
        role.setMaVaiTro(user.getMaNguoiDung());
        role.setTenVaiTro(roleName);
        when(nguoiDungRepository.findByTenDangNhapOrEmail(user.getTenDangNhap(), user.getTenDangNhap()))
                .thenReturn(Optional.of(user));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung()))
                .thenReturn(List.of(new NguoiDungVaiTro(user, role)));
    }

    private InvoiceResponse sampleInvoice(Integer id, Integer orderId) {
        return new InvoiceResponse(
                id, orderId, 1, "Nguyễn Văn Khách",
                1, "Chi Nhánh 1", 2, "Thu Ngân A",
                new BigDecimal("600000.00"), new BigDecimal("600000.00"),
                BigDecimal.ZERO, new BigDecimal("600000.00"),
                "CHUA_THANH_TOAN", LocalDateTime.now(),
                List.of(new InvoiceServiceItemResponse(1, 10, "Thay dầu", 1, new BigDecimal("300000.00"), new BigDecimal("300000.00"))),
                List.of(new InvoicePartItemResponse(2, 20, "PT001", "Dầu nhớt", "Chai", 2, new BigDecimal("150000.00"), new BigDecimal("300000.00"))),
                List.of()
        );
    }

    // ==========================================
    // 1. Unauthenticated (401)
    // ==========================================

    @Test
    void unauthenticated_getInvoice_returns401() throws Exception {
        mockMvc.perform(get("/api/invoices/701"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_createInvoice_returns401() throws Exception {
        mockMvc.perform(post("/api/repair-orders/601/invoice")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // ==========================================
    // 2. Unauthorized Roles: ROLE_CUSTOMER & ROLE_TECHNICIAN (403)
    // ==========================================

    @Test
    void customer_createInvoice_returns403() throws Exception {
        NguoiDung cust = mockUser(5, "customer");
        stubUser(cust, "ROLE_CUSTOMER");
        String token = jwtService.generateToken("customer", List.of("ROLE_CUSTOMER"));

        mockMvc.perform(post("/api/repair-orders/601/invoice")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void technician_createInvoice_returns403() throws Exception {
        NguoiDung tech = mockUser(4, "technician");
        stubUser(tech, "ROLE_TECHNICIAN");
        String token = jwtService.generateToken("technician", List.of("ROLE_TECHNICIAN"));

        mockMvc.perform(post("/api/repair-orders/601/invoice")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void customer_getInvoice_returns200() throws Exception {
        NguoiDung cust = mockUser(5, "customer");
        stubUser(cust, "ROLE_CUSTOMER");
        String token = jwtService.generateToken("customer", List.of("ROLE_CUSTOMER"));

        when(invoiceService.getInvoiceById(701)).thenReturn(sampleInvoice(701, 601));

        mockMvc.perform(get("/api/invoices/701").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.maHoaDon").value(701));
    }

    // ==========================================
    // 3. Authorized Roles: FRONT_DESK, MANAGER, ADMIN (201)
    // ==========================================

    @Test
    void receptionist_createInvoice_returns201() throws Exception {
        NguoiDung recep = mockUser(3, "receptionist");
        stubUser(recep, "ROLE_FRONT_DESK");
        String token = jwtService.generateToken("receptionist", List.of("ROLE_FRONT_DESK"));

        CreateInvoiceRequest req = new CreateInvoiceRequest();
        when(invoiceService.createInvoice(eq(601), any(CreateInvoiceRequest.class)))
                .thenReturn(sampleInvoice(701, 601));

        mockMvc.perform(post("/api/repair-orders/601/invoice")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.maHoaDon").value(701));
    }

    @Test
    void manager_createInvoice_fromRepairOrderAlias_returns201() throws Exception {
        NguoiDung manager = mockUser(2, "manager");
        stubUser(manager, "ROLE_MANAGER");
        String token = jwtService.generateToken("manager", List.of("ROLE_MANAGER"));

        when(invoiceService.createInvoice(eq(601), any(CreateInvoiceRequest.class)))
                .thenReturn(sampleInvoice(701, 601));

        mockMvc.perform(post("/api/invoices/from-repair-order/601")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.maHoaDon").value(701));
    }

    @Test
    void admin_createInvoice_fromRepairOrderAlias_returns201() throws Exception {
        NguoiDung admin = mockUser(1, "admin");
        stubUser(admin, "ROLE_ADMIN");
        String token = jwtService.generateToken("admin", List.of("ROLE_ADMIN"));

        when(invoiceService.createInvoice(eq(601), any(CreateInvoiceRequest.class)))
                .thenReturn(sampleInvoice(701, 601));

        mockMvc.perform(post("/api/invoices/from-repair-order/601")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.maHoaDon").value(701));
    }

    @Test
    void receptionist_createPayment_returns201() throws Exception {
        NguoiDung recep = mockUser(3, "receptionist");
        stubUser(recep, "ROLE_FRONT_DESK");
        String token = jwtService.generateToken("receptionist", List.of("ROLE_FRONT_DESK"));

        CreatePaymentRequest req = new CreatePaymentRequest(new BigDecimal("600000.00"), "TIEN_MAT", null);
        PaymentResponse payRes = new PaymentResponse(
                901, 701, new BigDecimal("600000.00"), "TIEN_MAT", null, LocalDateTime.now(), "THANH_CONG"
        );
        when(paymentService.createPayment(eq(701), any(CreatePaymentRequest.class)))
                .thenReturn(payRes);

        mockMvc.perform(post("/api/invoices/701/payments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.maThanhToan").value(901))
                .andExpect(jsonPath("$.data.soTien").value(600000.00));
    }
}
