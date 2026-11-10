package com.garage.service;

import com.garage.dto.CreateInvoiceRequest;
import com.garage.dto.InvoiceResponse;
import com.garage.entity.*;
import com.garage.exception.BadRequestException;
import com.garage.exception.DuplicateResourceException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.*;
import com.garage.security.BranchAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock
    private HoaDonRepository hoaDonRepository;

    @Mock
    private HoaDonDichVuRepository hoaDonDichVuRepository;

    @Mock
    private HoaDonPhuTungRepository hoaDonPhuTungRepository;

    @Mock
    private ThanhToanRepository thanhToanRepository;

    @Mock
    private PhieuSuaChuaRepository phieuSuaChuaRepository;

    @Mock
    private PhieuSuaChuaDichVuRepository phieuSuaChuaDichVuRepository;

    @Mock
    private PhieuSuaChuaPhuTungRepository phieuSuaChuaPhuTungRepository;

    @Mock
    private TonKhoRepository tonKhoRepository;

    @Mock
    private GiaoDichKhoRepository giaoDichKhoRepository;

    @Mock
    private NhanVienRepository nhanVienRepository;

    @Mock
    private NguoiDungRepository nguoiDungRepository;

    @Mock
    private KhachHangRepository khachHangRepository;

    @Mock
    private BranchAuthorizationService branchAuthorizationService;

    @InjectMocks
    private InvoiceService invoiceService;

    private ChiNhanh branch1;
    private NguoiDung userCustomer1;
    private KhachHang customer1;
    private Xe vehicle1;
    private PhieuTiepNhan ptn1;
    private PhieuSuaChua order1;
    private DichVu service1;
    private DichVu service2;
    private PhuTung part1;
    private PhuTung part2;
    private PhieuSuaChuaDichVu repairSvc1;
    private PhieuSuaChuaDichVu repairSvc2;
    private PhieuSuaChuaPhuTung repairPart1;
    private PhieuSuaChuaPhuTung repairPart2;
    private HoaDon invoice1;

    @BeforeEach
    void setUp() {
        branch1 = new ChiNhanh();
        branch1.setMaChiNhanh(1);
        branch1.setTenChiNhanh("Chi Nhánh 1");

        userCustomer1 = new NguoiDung();
        userCustomer1.setMaNguoiDung(10);
        userCustomer1.setTenDangNhap("customer1");
        userCustomer1.setHoTen("Nguyễn Văn Khách");
        userCustomer1.setSoDienThoai("0901234567");

        customer1 = new KhachHang();
        customer1.setMaKhachHang(1);
        customer1.setNguoiDung(userCustomer1);

        vehicle1 = new Xe();
        vehicle1.setMaXe(100);
        vehicle1.setBienSo("51A-11111");
        vehicle1.setKhachHang(customer1);

        ptn1 = new PhieuTiepNhan();
        ptn1.setMaTiepNhan(501);
        ptn1.setXe(vehicle1);
        ptn1.setChiNhanh(branch1);

        order1 = new PhieuSuaChua();
        order1.setMaPhieuSuaChua(601);
        order1.setPhieuTiepNhan(ptn1);
        order1.setChiNhanh(branch1);
        order1.setTrangThai("HOAN_TAT");

        service1 = new DichVu();
        service1.setMaDichVu(10);
        service1.setTenDichVu("Thay dầu");
        service1.setDonGia(new BigDecimal("300000.00"));

        service2 = new DichVu();
        service2.setMaDichVu(11);
        service2.setTenDichVu("Cân chỉnh thước lái");
        service2.setDonGia(new BigDecimal("200000.00"));

        repairSvc1 = new PhieuSuaChuaDichVu();
        repairSvc1.setMaChiTiet(1);
        repairSvc1.setPhieuSuaChua(order1);
        repairSvc1.setDichVu(service1);
        repairSvc1.setSoLuong(1);
        repairSvc1.setDonGia(new BigDecimal("300000.00"));

        repairSvc2 = new PhieuSuaChuaDichVu();
        repairSvc2.setMaChiTiet(2);
        repairSvc2.setPhieuSuaChua(order1);
        repairSvc2.setDichVu(service2);
        repairSvc2.setSoLuong(1);
        repairSvc2.setDonGia(new BigDecimal("200000.00"));

        part1 = new PhuTung();
        part1.setMaPhuTung(20);
        part1.setMaPhuTungCode("PT001");
        part1.setTenPhuTung("Dầu nhớt");
        part1.setDonViTinh("Chai");
        part1.setGiaBan(new BigDecimal("150000.00"));

        part2 = new PhuTung();
        part2.setMaPhuTung(21);
        part2.setMaPhuTungCode("PT002");
        part2.setTenPhuTung("Lọc dầu");
        part2.setDonViTinh("Cái");
        part2.setGiaBan(new BigDecimal("80000.00"));

        repairPart1 = new PhieuSuaChuaPhuTung();
        repairPart1.setMaChiTiet(101);
        repairPart1.setPhieuSuaChua(order1);
        repairPart1.setPhuTung(part1);
        repairPart1.setDichVuChiTiet(repairSvc1);
        repairPart1.setSoLuong(2);
        repairPart1.setDonGia(new BigDecimal("150000.00"));

        repairPart2 = new PhieuSuaChuaPhuTung();
        repairPart2.setMaChiTiet(102);
        repairPart2.setPhieuSuaChua(order1);
        repairPart2.setPhuTung(part2);
        repairPart2.setDichVuChiTiet(repairSvc1);
        repairPart2.setSoLuong(1);
        repairPart2.setDonGia(new BigDecimal("80000.00"));

        invoice1 = new HoaDon();
        invoice1.setMaHoaDon(701);
        invoice1.setPhieuSuaChua(order1);
        invoice1.setKhachHang(customer1);
        invoice1.setChiNhanh(branch1);
        invoice1.setTongTien(new BigDecimal("880000.00"));
        invoice1.setThanhTien(new BigDecimal("880000.00"));
        invoice1.setTrangThai("CHUA_THANH_TOAN");
        invoice1.setNgayLap(LocalDateTime.now());
    }

    private void stubStaffAuth() {
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                "manager", "password", List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))
        ));
        SecurityContextHolder.setContext(ctx);
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
    }

    private void stubCustomerAuth(String username, NguoiDung user) {
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                username, "password", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        ));
        SecurityContextHolder.setContext(ctx);
        when(nguoiDungRepository.findByTenDangNhapOrEmail(username, username)).thenReturn(Optional.of(user));
    }

    /**
     * Case 1 – Hóa đơn cơ bản:
     * 1 PhieuSuaChua, 2 dịch vụ, 2 phụ tùng
     * Expected: 1 HoaDon, 2 HoaDon_DichVu, 2 HoaDon_PhuTung, tính tổng tiền đúng.
     */
    @Test
    void createInvoice_case1_basicOrder_2Services_2Parts_success() {
        stubStaffAuth();
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order1));
        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(false);

        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(repairSvc1, repairSvc2));
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(repairPart1, repairPart2));

        // Mock đã trừ kho từ trước qua GiaoDichKho
        GiaoDichKho gd1 = new GiaoDichKho();
        gd1.setPhuTung(part1);
        gd1.setLoaiGiaoDich("XUAT_SUA_CHUA");
        gd1.setSoLuong(2);

        GiaoDichKho gd2 = new GiaoDichKho();
        gd2.setPhuTung(part2);
        gd2.setLoaiGiaoDich("XUAT_SUA_CHUA");
        gd2.setSoLuong(1);

        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(gd1, gd2));

        when(hoaDonRepository.save(any(HoaDon.class))).thenReturn(invoice1);

        HoaDonDichVu hdSvc1 = new HoaDonDichVu();
        hdSvc1.setMaChiTiet(11);
        hdSvc1.setPhieuDichVu(repairSvc1);
        hdSvc1.setDonGia(new BigDecimal("300000.00"));

        HoaDonDichVu hdSvc2 = new HoaDonDichVu();
        hdSvc2.setMaChiTiet(12);
        hdSvc2.setPhieuDichVu(repairSvc2);
        hdSvc2.setDonGia(new BigDecimal("200000.00"));

        when(hoaDonDichVuRepository.save(any(HoaDonDichVu.class))).thenReturn(hdSvc1, hdSvc2);

        HoaDonPhuTung hdPart1 = new HoaDonPhuTung();
        hdPart1.setMaChiTiet(21);
        hdPart1.setPhieuPhuTung(repairPart1);
        hdPart1.setHoaDonDichVu(hdSvc1);
        hdPart1.setSoLuong(2);
        hdPart1.setDonGia(new BigDecimal("150000.00"));

        HoaDonPhuTung hdPart2 = new HoaDonPhuTung();
        hdPart2.setMaChiTiet(22);
        hdPart2.setPhieuPhuTung(repairPart2);
        hdPart2.setHoaDonDichVu(hdSvc1);
        hdPart2.setSoLuong(1);
        hdPart2.setDonGia(new BigDecimal("80000.00"));

        when(hoaDonPhuTungRepository.save(any(HoaDonPhuTung.class))).thenReturn(hdPart1, hdPart2);

        CreateInvoiceRequest req = new CreateInvoiceRequest(BigDecimal.ZERO, BigDecimal.ZERO);
        InvoiceResponse res = invoiceService.createInvoice(601, req);

        assertThat(res).isNotNull();
        assertThat(res.getMaHoaDon()).isEqualTo(701);
        assertThat(res.getServices()).hasSize(2);
        assertThat(res.getParts()).hasSize(2);

        verify(hoaDonRepository).save(any(HoaDon.class));
        verify(hoaDonDichVuRepository, times(2)).save(any(HoaDonDichVu.class));
        verify(hoaDonPhuTungRepository, times(2)).save(any(HoaDonPhuTung.class));
    }

    /**
     * Case 2 – Có phát sinh:
     * PSC 100, PSC 101 -> MaPhieuCha = 100, PSC 102 -> MaPhieuCha = 100
     * Expected: HoaDon chứa toàn bộ dữ liệu của 100 + 101 + 102
     */
    @Test
    void createInvoice_case2_withDerivedOrders_aggregatesAll() {
        stubStaffAuth();

        PhieuSuaChua order100 = order1; // 601
        PhieuSuaChua order101 = new PhieuSuaChua();
        order101.setMaPhieuSuaChua(602);
        order101.setPhieuCha(order100);
        order101.setPhieuTiepNhan(ptn1);
        order101.setChiNhanh(branch1);
        order101.setTrangThai("HOAN_TAT");

        PhieuSuaChua order102 = new PhieuSuaChua();
        order102.setMaPhieuSuaChua(603);
        order102.setPhieuCha(order100);
        order102.setPhieuTiepNhan(ptn1);
        order102.setChiNhanh(branch1);
        order102.setTrangThai("HOAN_TAT");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order100));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order100, order101, order102));

        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(false);
        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(602)).thenReturn(false);
        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(603)).thenReturn(false);

        // PSC 100 có 1 service, 1 part
        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(repairSvc1));
        PhieuSuaChuaPhuTung roPart1 = new PhieuSuaChuaPhuTung();
        roPart1.setMaChiTiet(101);
        roPart1.setPhieuSuaChua(order100);
        roPart1.setPhuTung(part1);
        roPart1.setDichVuChiTiet(repairSvc1);
        roPart1.setSoLuong(2);
        roPart1.setDonGia(new BigDecimal("150000.00"));
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(roPart1));

        // PSC 101 có 1 service
        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(602)).thenReturn(List.of(repairSvc2));
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(602)).thenReturn(List.of());

        // PSC 102 có 1 part
        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(603)).thenReturn(List.of());
        PhieuSuaChuaPhuTung roPart2 = new PhieuSuaChuaPhuTung();
        roPart2.setMaChiTiet(102);
        roPart2.setPhieuSuaChua(order102);
        roPart2.setPhuTung(part2);
        roPart2.setSoLuong(1);
        roPart2.setDonGia(new BigDecimal("80000.00"));
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(603)).thenReturn(List.of(roPart2));

        // Mock đã trừ kho từ trước qua GiaoDichKho
        GiaoDichKho gd1 = new GiaoDichKho();
        gd1.setPhuTung(part1);
        gd1.setLoaiGiaoDich("XUAT_SUA_CHUA");
        gd1.setSoLuong(2);

        GiaoDichKho gd2 = new GiaoDichKho();
        gd2.setPhuTung(part2);
        gd2.setLoaiGiaoDich("XUAT_SUA_CHUA");
        gd2.setSoLuong(1);

        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(gd1));
        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(603)).thenReturn(List.of(gd2));

        when(hoaDonRepository.save(any(HoaDon.class))).thenReturn(invoice1);

        HoaDonDichVu hdSvc = new HoaDonDichVu();
        hdSvc.setMaChiTiet(11);
        when(hoaDonDichVuRepository.save(any(HoaDonDichVu.class))).thenReturn(hdSvc);

        HoaDonPhuTung hdPart = new HoaDonPhuTung();
        hdPart.setMaChiTiet(21);
        when(hoaDonPhuTungRepository.save(any(HoaDonPhuTung.class))).thenReturn(hdPart);

        InvoiceResponse res = invoiceService.createInvoice(601, new CreateInvoiceRequest());

        assertThat(res).isNotNull();
        // Gom tổng cộng 2 services (từ 100 + 101) và 2 parts (từ 100 + 102)
        assertThat(res.getServices()).hasSize(2);
        assertThat(res.getParts()).hasSize(2);
        verify(hoaDonDichVuRepository, times(2)).save(any(HoaDonDichVu.class));
        verify(hoaDonPhuTungRepository, times(2)).save(any(HoaDonPhuTung.class));
    }

    /**
     * Case 3 – Phát sinh nhiều cấp:
     * 100 -> 101 -> 102 -> 103
     * Khi gọi xuất hóa đơn từ PSC con 102, backend leo lên root 100 và gom toàn bộ 100, 101, 102, 103.
     */
    @Test
    void createInvoice_case3_multiLevelTree_aggregatesEntireChain() {
        stubStaffAuth();

        PhieuSuaChua order100 = order1; // 601
        PhieuSuaChua order101 = new PhieuSuaChua();
        order101.setMaPhieuSuaChua(602);
        order101.setPhieuCha(order100);
        order101.setPhieuTiepNhan(ptn1);
        order101.setChiNhanh(branch1);
        order101.setTrangThai("HOAN_TAT");

        PhieuSuaChua order102 = new PhieuSuaChua();
        order102.setMaPhieuSuaChua(603);
        order102.setPhieuCha(order101);
        order102.setPhieuTiepNhan(ptn1);
        order102.setChiNhanh(branch1);
        order102.setTrangThai("HOAN_TAT");

        PhieuSuaChua order103 = new PhieuSuaChua();
        order103.setMaPhieuSuaChua(604);
        order103.setPhieuCha(order102);
        order103.setPhieuTiepNhan(ptn1);
        order103.setChiNhanh(branch1);
        order103.setTrangThai("HOAN_TAT");

        when(phieuSuaChuaRepository.findById(603)).thenReturn(Optional.of(order102));
        when(phieuSuaChuaRepository.findById(602)).thenReturn(Optional.of(order101));
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order100));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order100, order101, order102, order103));

        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(anyInt())).thenReturn(false);

        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(repairSvc1));
        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(602)).thenReturn(List.of(repairSvc2));
        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(603)).thenReturn(List.of());
        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(604)).thenReturn(List.of());

        PhieuSuaChuaPhuTung roPart1 = new PhieuSuaChuaPhuTung();
        roPart1.setMaChiTiet(101);
        roPart1.setPhieuSuaChua(order102);
        roPart1.setPhuTung(part1);
        roPart1.setSoLuong(2);
        roPart1.setDonGia(new BigDecimal("150000.00"));

        PhieuSuaChuaPhuTung roPart2 = new PhieuSuaChuaPhuTung();
        roPart2.setMaChiTiet(102);
        roPart2.setPhieuSuaChua(order103);
        roPart2.setPhuTung(part2);
        roPart2.setSoLuong(1);
        roPart2.setDonGia(new BigDecimal("80000.00"));

        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of());
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(602)).thenReturn(List.of());
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(603)).thenReturn(List.of(roPart1));
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(604)).thenReturn(List.of(roPart2));

        GiaoDichKho gd1 = new GiaoDichKho();
        gd1.setPhuTung(part1);
        gd1.setLoaiGiaoDich("XUAT_SUA_CHUA");
        gd1.setSoLuong(2);

        GiaoDichKho gd2 = new GiaoDichKho();
        gd2.setPhuTung(part2);
        gd2.setLoaiGiaoDich("XUAT_SUA_CHUA");
        gd2.setSoLuong(1);

        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(603)).thenReturn(List.of(gd1));
        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(604)).thenReturn(List.of(gd2));

        when(hoaDonRepository.save(any(HoaDon.class))).thenReturn(invoice1);

        HoaDonDichVu hdSvc = new HoaDonDichVu();
        hdSvc.setMaChiTiet(11);
        when(hoaDonDichVuRepository.save(any(HoaDonDichVu.class))).thenReturn(hdSvc);

        HoaDonPhuTung hdPart = new HoaDonPhuTung();
        hdPart.setMaChiTiet(21);
        when(hoaDonPhuTungRepository.save(any(HoaDonPhuTung.class))).thenReturn(hdPart);

        // Gọi từ lệnh con 603 (order102)
        InvoiceResponse res = invoiceService.createInvoice(603, new CreateInvoiceRequest());

        assertThat(res).isNotNull();
        assertThat(res.getServices()).hasSize(2);
        assertThat(res.getParts()).hasSize(2);
    }

    /**
     * Case 4 – Không đủ tồn kho:
     * Phụ tùng chưa xuất kho và tồn kho < số lượng yêu cầu
     * Expected: Throw BadRequestException("Phụ tùng '...' không đủ tồn kho tại chi nhánh")
     * Không tạo HoaDon, không trừ TonKho, không tạo GiaoDichKho.
     */
    @Test
    void createInvoice_case4_insufficientStock_throwsBadRequest_noInvoiceCreated() {
        stubStaffAuth();
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order1));
        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(false);

        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of());
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(repairPart1));

        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of()); // Chưa trừ kho

        TonKho tonKho = new TonKho();
        tonKho.setSoLuongTon(1); // Chỉ còn 1 mà yêu cầu 2
        when(tonKhoRepository.findByIdMaChiNhanhAndIdMaPhuTung(1, 20)).thenReturn(Optional.of(tonKho));

        assertThatThrownBy(() -> invoiceService.createInvoice(601, new CreateInvoiceRequest()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không đủ tồn kho tại chi nhánh");

        verify(hoaDonRepository, never()).save(any(HoaDon.class));
        verify(tonKhoRepository, never()).save(any(TonKho.class));
        verify(giaoDichKhoRepository, never()).save(any(GiaoDichKho.class));
    }

    /**
     * Case 5 – Xuất hóa đơn lần 2:
     * Lệnh sửa chữa hoặc một phiếu trong cây đã được xuất hóa đơn trước đó
     * Expected: Reject với DuplicateResourceException, không tạo hóa đơn mới, không trừ kho.
     */
    @Test
    void createInvoice_case5_duplicateInvoice_throwsDuplicateResourceException() {
        stubStaffAuth();
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order1));
        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(true);

        CreateInvoiceRequest req = new CreateInvoiceRequest();
        assertThatThrownBy(() -> invoiceService.createInvoice(601, req))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("đã được xuất hóa đơn");

        verify(hoaDonRepository, never()).save(any(HoaDon.class));
        verify(tonKhoRepository, never()).save(any(TonKho.class));
    }

    /**
     * Lệnh sửa chữa chưa hoàn tất (ví dụ: DANG_SUA, CHO_XU_LY) -> Chặn xuất hóa đơn
     */
    @Test
    void createInvoice_uncompletedOrder_throwsBadRequest() {
        stubStaffAuth();
        order1.setTrangThai("DANG_SUA");
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order1));

        CreateInvoiceRequest req = new CreateInvoiceRequest();
        assertThatThrownBy(() -> invoiceService.createInvoice(601, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lệnh sửa chữa chưa hoàn tất");

        verify(hoaDonRepository, never()).save(any(HoaDon.class));
    }

    /**
     * Lệnh sửa chữa hoàn tất nhưng không có bất kỳ dịch vụ hay chi phí nào -> Chặn xuất hóa đơn 0đ
     */
    @Test
    void createInvoice_emptyServicesAndParts_throwsBadRequest() {
        stubStaffAuth();
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order1));
        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of());
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of());

        CreateInvoiceRequest req = new CreateInvoiceRequest();
        assertThatThrownBy(() -> invoiceService.createInvoice(601, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("chưa có dịch vụ hoặc chi phí nào");

        verify(hoaDonRepository, never()).save(any(HoaDon.class));
    }

    /**
     * Tránh trừ kho hai lần:
     * Nếu phụ tùng ĐÃ được trừ kho lúc kỹ thuật viên thao tác (đã có GiaoDichKho = XUAT_SUA_CHUA)
     * thì khi xuất hóa đơn KHÔNG được trừ TonKho thêm lần nữa và KHÔNG tạo thêm GiaoDichKho.
     */
    @Test
    void createInvoice_partsAlreadyDeducted_doesNotDeductAgain() {
        stubStaffAuth();
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order1));
        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(false);

        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of());
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(repairPart1)); // qty = 2

        GiaoDichKho gd = new GiaoDichKho();
        gd.setPhuTung(part1);
        gd.setLoaiGiaoDich("XUAT_SUA_CHUA");
        gd.setSoLuong(2);
        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(gd));

        when(hoaDonRepository.save(any(HoaDon.class))).thenReturn(invoice1);
        when(hoaDonPhuTungRepository.save(any(HoaDonPhuTung.class))).thenReturn(new HoaDonPhuTung());

        invoiceService.createInvoice(601, new CreateInvoiceRequest());

        // Verify: Không có thao tác save TonKho hay save GiaoDichKho mới nào
        verify(tonKhoRepository, never()).save(any(TonKho.class));
        verify(giaoDichKhoRepository, never()).save(any(GiaoDichKho.class));
    }

    /**
     * Trừ kho khi phụ tùng chưa được trừ trước đó:
     * Nếu phụ tùng CHƯA được trừ kho (chưa có GiaoDichKho) -> trừ TonKho và tạo GiaoDichKho với MaPhieuSuaChua đúng.
     */
    @Test
    void createInvoice_partsNotYetDeducted_deductsStockAndRecordsTransaction() {
        stubStaffAuth();
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order1));
        when(hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(false);

        when(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of());
        when(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of(repairPart1)); // qty = 2

        when(giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(List.of()); // Chưa trừ kho

        TonKho tonKho = new TonKho();
        tonKho.setSoLuongTon(10);
        when(tonKhoRepository.findByIdMaChiNhanhAndIdMaPhuTung(1, 20)).thenReturn(Optional.of(tonKho));

        when(hoaDonRepository.save(any(HoaDon.class))).thenReturn(invoice1);
        when(hoaDonPhuTungRepository.save(any(HoaDonPhuTung.class))).thenReturn(new HoaDonPhuTung());

        invoiceService.createInvoice(601, new CreateInvoiceRequest());

        // Verify: Đã trừ tồn kho 10 -> 8
        assertThat(tonKho.getSoLuongTon()).isEqualTo(8);
        verify(tonKhoRepository).save(tonKho);
        verify(giaoDichKhoRepository).save(any(GiaoDichKho.class));
    }

    @Test
    void createInvoice_crossBranch_throws403() {
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                "manager", "password", List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))
        ));
        SecurityContextHolder.setContext(ctx);
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(false);
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));

        CreateInvoiceRequest req = new CreateInvoiceRequest();
        assertThatThrownBy(() -> invoiceService.createInvoice(601, req))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("chi nhánh khác");
    }

    @Test
    void getInvoice_customerOwner_success() {
        stubCustomerAuth("customer1", userCustomer1);
        when(hoaDonRepository.findById(701)).thenReturn(Optional.of(invoice1));
        when(hoaDonDichVuRepository.findByHoaDonMaHoaDon(701)).thenReturn(List.of());
        when(hoaDonPhuTungRepository.findByHoaDonMaHoaDon(701)).thenReturn(List.of());
        when(thanhToanRepository.findByHoaDonMaHoaDon(701)).thenReturn(List.of());

        InvoiceResponse res = invoiceService.getInvoiceById(701);
        assertThat(res).isNotNull();
        assertThat(res.getMaHoaDon()).isEqualTo(701);
    }

    @Test
    void getInvoice_crossCustomer_throws403() {
        NguoiDung otherCustUser = new NguoiDung();
        otherCustUser.setMaNguoiDung(99);
        otherCustUser.setTenDangNhap("customer2");

        stubCustomerAuth("customer2", otherCustUser);
        when(hoaDonRepository.findById(701)).thenReturn(Optional.of(invoice1));

        assertThatThrownBy(() -> invoiceService.getInvoiceById(701))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("khách hàng khác");
    }

    @Test
    void getInvoiceByRepairOrder_fromChildOrder_findsTreeInvoice() {
        stubStaffAuth();

        PhieuSuaChua order100 = order1; // 601
        PhieuSuaChua order101 = new PhieuSuaChua();
        order101.setMaPhieuSuaChua(602);
        order101.setPhieuCha(order100);
        order101.setChiNhanh(branch1);
        order101.setPhieuTiepNhan(ptn1);

        when(phieuSuaChuaRepository.findById(602)).thenReturn(Optional.of(order101));
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order100));
        when(phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(order100, order101));

        when(hoaDonRepository.findByPhieuSuaChuaMaPhieuSuaChua(601)).thenReturn(Optional.of(invoice1));
        when(hoaDonDichVuRepository.findByHoaDonMaHoaDon(701)).thenReturn(List.of());
        when(hoaDonPhuTungRepository.findByHoaDonMaHoaDon(701)).thenReturn(List.of());
        when(thanhToanRepository.findByHoaDonMaHoaDon(701)).thenReturn(List.of());

        InvoiceResponse res = invoiceService.getInvoiceByRepairOrder(602);
        assertThat(res).isNotNull();
        assertThat(res.getMaHoaDon()).isEqualTo(701);
    }
}
