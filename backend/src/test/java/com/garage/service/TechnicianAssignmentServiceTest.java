package com.garage.service;

import com.garage.dto.AssignmentResponse;
import com.garage.dto.CreateAssignmentRequest;
import com.garage.dto.RejectAssignmentRequest;
import com.garage.entity.*;
import com.garage.exception.BadRequestException;
import com.garage.exception.DuplicateResourceException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.*;
import com.garage.security.BranchAuthorizationService;
import com.garage.security.CustomUserDetails;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TechnicianAssignmentServiceTest {

    @Mock
    private CustomerProgressNotifier customerProgressNotifier;

    @Mock
    private PhanCongRepository phanCongRepository;

    @Mock
    private PhieuSuaChuaRepository phieuSuaChuaRepository;

    @Mock
    private NhanVienRepository nhanVienRepository;

    @Mock
    private NguoiDungRepository nguoiDungRepository;

    @Mock
    private NguoiDungVaiTroRepository nguoiDungVaiTroRepository;

    @Mock
    private BranchAuthorizationService branchAuthorizationService;

    @InjectMocks
    private TechnicianAssignmentService technicianAssignmentService;

    // Fixtures
    private ChiNhanh branch1;
    private ChiNhanh branch2;
    private PhieuSuaChua order1;

    private NguoiDung userTech1;
    private NhanVien tech1;
    private VaiTro roleTech;
    private NguoiDungVaiTro userRoleTech;

    private NguoiDung userManager;
    private NhanVien manager1;
    private VaiTro roleMgr;
    private NguoiDungVaiTro userRoleMgr;

    private NguoiDung userReceptionist;
    private NhanVien receptionist1;
    private VaiTro roleFrontDesk;
    private NguoiDungVaiTro userRoleFrontDesk;

    private NguoiDung userAdmin;

    private PhanCong assignmentPending;
    private PhanCong assignmentApproved;

    @BeforeEach
    void setUp() {
        branch1 = new ChiNhanh();
        branch1.setMaChiNhanh(1);
        branch1.setTenChiNhanh("Chi Nhánh 1");

        branch2 = new ChiNhanh();
        branch2.setMaChiNhanh(2);
        branch2.setTenChiNhanh("Chi Nhánh 2");

        order1 = new PhieuSuaChua();
        order1.setMaPhieuSuaChua(601);
        order1.setChiNhanh(branch1);
        order1.setTrangThai("CHO_XU_LY");

        // Technician
        userTech1 = new NguoiDung();
        userTech1.setMaNguoiDung(10);
        userTech1.setTenDangNhap("technician1");
        userTech1.setHoTen("Nguyễn Văn Kỹ Thuật");
        userTech1.setTrangThai(true);

        tech1 = new NhanVien();
        tech1.setMaNhanVien(100);
        tech1.setChiNhanh(branch1);
        tech1.setNguoiDung(userTech1);
        tech1.setTrangThai(true);

        roleTech = new VaiTro();
        roleTech.setMaVaiTro(4);
        roleTech.setTenVaiTro("ROLE_TECHNICIAN");
        userRoleTech = new NguoiDungVaiTro(userTech1, roleTech);

        // Manager
        userManager = new NguoiDung();
        userManager.setMaNguoiDung(2);
        userManager.setTenDangNhap("manager1");
        userManager.setHoTen("Trần Quản Lý");
        userManager.setTrangThai(true);

        manager1 = new NhanVien();
        manager1.setMaNhanVien(20);
        manager1.setChiNhanh(branch1);
        manager1.setNguoiDung(userManager);
        manager1.setTrangThai(true);

        roleMgr = new VaiTro();
        roleMgr.setMaVaiTro(2);
        roleMgr.setTenVaiTro("ROLE_MANAGER");
        userRoleMgr = new NguoiDungVaiTro(userManager, roleMgr);

        // Receptionist
        userReceptionist = new NguoiDung();
        userReceptionist.setMaNguoiDung(3);
        userReceptionist.setTenDangNhap("receptionist1");
        userReceptionist.setHoTen("Lê Tiếp Nhận");
        userReceptionist.setTrangThai(true);

        receptionist1 = new NhanVien();
        receptionist1.setMaNhanVien(30);
        receptionist1.setChiNhanh(branch1);
        receptionist1.setNguoiDung(userReceptionist);
        receptionist1.setTrangThai(true);

        roleFrontDesk = new VaiTro();
        roleFrontDesk.setMaVaiTro(3);
        roleFrontDesk.setTenVaiTro("ROLE_FRONT_DESK");
        userRoleFrontDesk = new NguoiDungVaiTro(userReceptionist, roleFrontDesk);

        // Admin
        userAdmin = new NguoiDung();
        userAdmin.setMaNguoiDung(1);
        userAdmin.setTenDangNhap("admin");
        userAdmin.setHoTen("Hệ Thống Admin");
        userAdmin.setTrangThai(true);

        // Assignments
        assignmentPending = new PhanCong();
        assignmentPending.setMaPhanCong(801);
        assignmentPending.setPhieuSuaChua(order1);
        assignmentPending.setNhanVienDuocPhanCong(tech1);
        assignmentPending.setNguoiPhanCong(receptionist1);
        assignmentPending.setTrangThai("CHO_DUYET");
        assignmentPending.setThoiGianTao(LocalDateTime.now());

        assignmentApproved = new PhanCong();
        assignmentApproved.setMaPhanCong(802);
        assignmentApproved.setPhieuSuaChua(order1);
        assignmentApproved.setNhanVienDuocPhanCong(tech1);
        assignmentApproved.setNguoiPhanCong(manager1);
        assignmentApproved.setNguoiDuyet(manager1);
        assignmentApproved.setTrangThai("DA_DUYET");
        assignmentApproved.setThoiGianTao(LocalDateTime.now());
        assignmentApproved.setThoiGianDuyet(LocalDateTime.now());
    }

    private void stubAuth(NguoiDung user, NhanVien emp, String roleName) {
        CustomUserDetails userDetails = new CustomUserDetails(user, List.of(new SimpleGrantedAuthority(roleName)));
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                userDetails, "pass", userDetails.getAuthorities()
        ));
        SecurityContextHolder.setContext(ctx);

        lenient().when(nhanVienRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung()))
                .thenReturn(Optional.ofNullable(emp));
    }

    // ==========================================
    // 1. CREATE ASSIGNMENT TESTS
    // ==========================================

    @Test
    void receptionist_createAssignment_success_setsPendingApproval() {
        stubAuth(userReceptionist, receptionist1, "ROLE_FRONT_DESK");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleTech));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(601, 100)).thenReturn(false);
        when(phanCongRepository.save(any(PhanCong.class))).thenAnswer(i -> {
            PhanCong p = i.getArgument(0);
            p.setMaPhanCong(801);
            return p;
        });

        CreateAssignmentRequest req = new CreateAssignmentRequest(100, "Kiểm tra hệ thống phanh");
        AssignmentResponse res = technicianAssignmentService.createAssignment(601, req);

        assertThat(res).isNotNull();
        assertThat(res.getMaPhanCong()).isEqualTo(801);
        assertThat(res.getTrangThai()).isEqualTo("CHO_DUYET");
        assertThat(res.getMaNguoiPhanCong()).isEqualTo(30);
        assertThat(res.getTenNguoiPhanCong()).isEqualTo("Lê Tiếp Nhận");
        assertThat(res.getMaNguoiDuyet()).isNull();
        assertThat(res.getThoiGianDuyet()).isNull();
        // Order remains CHO_XU_LY until approved
        assertThat(order1.getTrangThai()).isEqualTo("CHO_XU_LY");
        verify(phanCongRepository).save(any(PhanCong.class));
        verify(phieuSuaChuaRepository, never()).save(order1);
    }

    @Test
    void manager_createAssignment_success_automaticallyApproved() {
        stubAuth(userManager, manager1, "ROLE_MANAGER");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleTech));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(601, 100)).thenReturn(false);
        when(phanCongRepository.save(any(PhanCong.class))).thenAnswer(i -> {
            PhanCong p = i.getArgument(0);
            p.setMaPhanCong(802);
            return p;
        });

        CreateAssignmentRequest req = new CreateAssignmentRequest(100, "Manager giao việc trực tiếp");
        AssignmentResponse res = technicianAssignmentService.createAssignment(601, req);

        assertThat(res).isNotNull();
        assertThat(res.getMaPhanCong()).isEqualTo(802);
        verify(customerProgressNotifier).repairChanged(order1, "CHO_XU_LY");
        assertThat(res.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(res.getMaNguoiPhanCong()).isEqualTo(20);
        assertThat(res.getMaNguoiDuyet()).isEqualTo(20);
        assertThat(res.getThoiGianDuyet()).isNotNull();
        // Order changes to DA_PHAN_CONG
        assertThat(order1.getTrangThai()).isEqualTo("DA_PHAN_CONG");
        verify(phieuSuaChuaRepository).save(order1);
    }

    @Test
    void createAssignment_crossBranch_throws403() {
        tech1.setChiNhanh(branch2); // Technician belongs to CN002, order is CN001
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleTech));

        CreateAssignmentRequest req = new CreateAssignmentRequest(100);

        assertThatThrownBy(() -> technicianAssignmentService.createAssignment(601, req))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("chi nhánh");
    }

    @Test
    void createAssignment_duplicateTechnician_throws409() {
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleTech));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(601, 100)).thenReturn(true);

        CreateAssignmentRequest req = new CreateAssignmentRequest(100);

        assertThatThrownBy(() -> technicianAssignmentService.createAssignment(601, req))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("đã được phân công");
    }

    @Test
    void createAssignment_employeeNotTechnicianRole_throws400() {
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleMgr));

        CreateAssignmentRequest req = new CreateAssignmentRequest(100);

        assertThatThrownBy(() -> technicianAssignmentService.createAssignment(601, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ROLE_TECHNICIAN");
    }

    // ==========================================
    // 2. APPROVE / REJECT ASSIGNMENT TESTS
    // ==========================================

    @Test
    void approveAssignment_success_changesStatusToApprovedAndUpdatesOrder() {
        stubAuth(userManager, manager1, "ROLE_MANAGER");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(phanCongRepository.findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(801, 601))
                .thenReturn(Optional.of(assignmentPending));
        when(phanCongRepository.save(any(PhanCong.class))).thenReturn(assignmentPending);

        AssignmentResponse res = technicianAssignmentService.approveAssignment(601, 801);

        assertThat(res).isNotNull();
        assertThat(assignmentPending.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(assignmentPending.getNguoiDuyet()).isEqualTo(manager1);
        assertThat(assignmentPending.getThoiGianDuyet()).isNotNull();
        assertThat(order1.getTrangThai()).isEqualTo("DA_PHAN_CONG");
        verify(phieuSuaChuaRepository).save(order1);
        verify(phanCongRepository).save(assignmentPending);
    }

    @Test
    void approveAssignment_alreadyApproved_throws400() {
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(phanCongRepository.findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(802, 601))
                .thenReturn(Optional.of(assignmentApproved));

        assertThatThrownBy(() -> technicianAssignmentService.approveAssignment(601, 802))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("CHO_DUYET");
    }

    @Test
    void rejectAssignment_success_changesStatusToRejected() {
        stubAuth(userManager, manager1, "ROLE_MANAGER");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(phanCongRepository.findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(801, 601))
                .thenReturn(Optional.of(assignmentPending));
        when(phanCongRepository.save(any(PhanCong.class))).thenReturn(assignmentPending);

        RejectAssignmentRequest req = new RejectAssignmentRequest("Kỹ thuật viên đang bận ca khác");
        AssignmentResponse res = technicianAssignmentService.rejectAssignment(601, 801, req);

        assertThat(res).isNotNull();
        assertThat(assignmentPending.getTrangThai()).isEqualTo("TU_CHOI");
        assertThat(assignmentPending.getNguoiDuyet()).isEqualTo(manager1);
        assertThat(assignmentPending.getThoiGianDuyet()).isNotNull();
        assertThat(assignmentPending.getGhiChu()).isEqualTo("Kỹ thuật viên đang bận ca khác");
        verify(phanCongRepository).save(assignmentPending);
    }

    @Test
    void rejectAssignment_notPending_throws400() {
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(phanCongRepository.findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(802, 601))
                .thenReturn(Optional.of(assignmentApproved));

        RejectAssignmentRequest req = new RejectAssignmentRequest("Lý do từ chối");
        assertThatThrownBy(() -> technicianAssignmentService.rejectAssignment(601, 802, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("CHO_DUYET");
    }

    // ==========================================
    // 3. PENDING ASSIGNMENTS LIST
    // ==========================================

    @Test
    void getPendingAssignments_forBranchManager_returnsPendingForBranch() {
        stubAuth(userManager, manager1, "ROLE_MANAGER");
        when(branchAuthorizationService.resolveUserBranchId(any())).thenReturn(Optional.of(1));
        when(phanCongRepository.findByTrangThaiAndPhieuSuaChuaChiNhanhMaChiNhanh("CHO_DUYET", 1))
                .thenReturn(List.of(assignmentPending));

        List<AssignmentResponse> pending = technicianAssignmentService.getPendingAssignments();

        assertThat(pending).hasSize(1);
        assertThat(pending.get(0).getMaPhanCong()).isEqualTo(801);
        assertThat(pending.get(0).getTrangThai()).isEqualTo("CHO_DUYET");
    }

    // ==========================================
    // 4. DELETE ASSIGNMENT
    // ==========================================

    @Test
    void deleteAssignment_lastApprovedAssignment_revertsStatusToPending() {
        order1.setTrangThai("DA_PHAN_CONG");
        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(phanCongRepository.findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(802, 601))
                .thenReturn(Optional.of(assignmentApproved));
        when(phanCongRepository.countByPhieuSuaChuaMaPhieuSuaChuaAndTrangThai(601, "DA_DUYET")).thenReturn(0L);

        technicianAssignmentService.deleteAssignment(601, 802);

        verify(phanCongRepository).delete(assignmentApproved);
        assertThat(order1.getTrangThai()).isEqualTo("CHO_XU_LY");
        verify(phieuSuaChuaRepository).save(order1);
    }

    // ==========================================
    // 5. PARENT - CHILD ASSIGNMENT SYNC TESTS
    // ==========================================

    @Test
    void receptionist_createAssignment_onParentOrder_syncsPendingToChildOrders() {
        stubAuth(userReceptionist, receptionist1, "ROLE_FRONT_DESK");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleTech));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(601, 100)).thenReturn(false);

        PhieuSuaChua childOrder = new PhieuSuaChua();
        childOrder.setMaPhieuSuaChua(602);
        childOrder.setPhieuCha(order1);
        childOrder.setChiNhanh(branch1);
        childOrder.setTrangThai("CHO_XU_LY");

        when(phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(601)).thenReturn(List.of(childOrder));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(602, 100)).thenReturn(false);

        when(phanCongRepository.save(any(PhanCong.class))).thenAnswer(i -> i.getArgument(0));

        CreateAssignmentRequest req = new CreateAssignmentRequest(100, "Phân công phiếu gốc");
        AssignmentResponse res = technicianAssignmentService.createAssignment(601, req);

        assertThat(res).isNotNull();
        assertThat(res.getTrangThai()).isEqualTo("CHO_DUYET");
        // Verify 2 saves: 1 for parent, 1 for child
        verify(phanCongRepository, times(2)).save(any(PhanCong.class));
    }

    @Test
    void manager_createAssignment_onParentOrder_syncsApprovedToChildOrdersAndUpdatesStatus() {
        stubAuth(userManager, manager1, "ROLE_MANAGER");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleTech));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(601, 100)).thenReturn(false);

        PhieuSuaChua childOrder = new PhieuSuaChua();
        childOrder.setMaPhieuSuaChua(602);
        childOrder.setPhieuCha(order1);
        childOrder.setChiNhanh(branch1);
        childOrder.setTrangThai("CHO_XU_LY");

        when(phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(601)).thenReturn(List.of(childOrder));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(602, 100)).thenReturn(false);
        when(phanCongRepository.save(any(PhanCong.class))).thenAnswer(i -> i.getArgument(0));

        CreateAssignmentRequest req = new CreateAssignmentRequest(100, "Quản lý giao việc");
        AssignmentResponse res = technicianAssignmentService.createAssignment(601, req);

        assertThat(res).isNotNull();
        assertThat(res.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(order1.getTrangThai()).isEqualTo("DA_PHAN_CONG");
        assertThat(childOrder.getTrangThai()).isEqualTo("DA_PHAN_CONG");
        verify(phieuSuaChuaRepository).save(childOrder);
    }

    @Test
    void manager_approveAssignment_syncsToChildOrderPendingAssignments() {
        stubAuth(userManager, manager1, "ROLE_MANAGER");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(phanCongRepository.findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(801, 601))
                .thenReturn(Optional.of(assignmentPending));

        PhieuSuaChua childOrder = new PhieuSuaChua();
        childOrder.setMaPhieuSuaChua(602);
        childOrder.setPhieuCha(order1);
        childOrder.setChiNhanh(branch1);
        childOrder.setTrangThai("CHO_XU_LY");

        PhanCong childPending = new PhanCong();
        childPending.setMaPhanCong(803);
        childPending.setPhieuSuaChua(childOrder);
        childPending.setNhanVienDuocPhanCong(tech1);
        childPending.setTrangThai("CHO_DUYET");

        when(phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(601)).thenReturn(List.of(childOrder));
        when(phanCongRepository.findByPhieuSuaChuaMaPhieuSuaChua(602)).thenReturn(List.of(childPending));
        when(phanCongRepository.save(any(PhanCong.class))).thenAnswer(i -> i.getArgument(0));

        AssignmentResponse res = technicianAssignmentService.approveAssignment(601, 801);

        assertThat(res).isNotNull();
        assertThat(assignmentPending.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(childPending.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(childOrder.getTrangThai()).isEqualTo("DA_PHAN_CONG");
    }

    @Test
    void admin_createAssignment_success_resolvesStaffFromBranchAndAutomaticallyApproved() {
        stubAuth(userAdmin, null, "ROLE_ADMIN");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(nhanVienRepository.findById(100)).thenReturn(Optional.of(tech1));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(10)).thenReturn(List.of(userRoleTech));
        when(phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(601, 100)).thenReturn(false);
        when(nhanVienRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(manager1));
        when(phanCongRepository.save(any(PhanCong.class))).thenAnswer(i -> {
            PhanCong p = i.getArgument(0);
            p.setMaPhanCong(805);
            return p;
        });

        CreateAssignmentRequest req = new CreateAssignmentRequest(100, "Admin giao việc trực tiếp");
        AssignmentResponse res = technicianAssignmentService.createAssignment(601, req);

        assertThat(res).isNotNull();
        assertThat(res.getMaPhanCong()).isEqualTo(805);
        assertThat(res.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(res.getMaNguoiPhanCong()).isEqualTo(20);
        assertThat(res.getMaNguoiDuyet()).isEqualTo(20);
        assertThat(res.getThoiGianDuyet()).isNotNull();
        assertThat(order1.getTrangThai()).isEqualTo("DA_PHAN_CONG");
        verify(phieuSuaChuaRepository).save(order1);
    }

    @Test
    void admin_approveAssignment_resolvesStaffFromBranchAndSyncsToChildOrder() {
        stubAuth(userAdmin, null, "ROLE_ADMIN");

        when(phieuSuaChuaRepository.findById(601)).thenReturn(Optional.of(order1));
        when(branchAuthorizationService.isAllowedBranch(1)).thenReturn(true);
        when(phanCongRepository.findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(801, 601))
                .thenReturn(Optional.of(assignmentPending));
        when(nhanVienRepository.findByChiNhanhMaChiNhanh(1)).thenReturn(List.of(manager1));

        PhieuSuaChua childOrder = new PhieuSuaChua();
        childOrder.setMaPhieuSuaChua(602);
        childOrder.setPhieuCha(order1);
        childOrder.setChiNhanh(branch1);
        childOrder.setTrangThai("CHO_XU_LY");

        PhanCong childPending = new PhanCong();
        childPending.setMaPhanCong(803);
        childPending.setPhieuSuaChua(childOrder);
        childPending.setNhanVienDuocPhanCong(tech1);
        childPending.setTrangThai("CHO_DUYET");

        when(phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(601)).thenReturn(List.of(childOrder));
        when(phanCongRepository.findByPhieuSuaChuaMaPhieuSuaChua(602)).thenReturn(List.of(childPending));
        when(phanCongRepository.save(any(PhanCong.class))).thenAnswer(i -> i.getArgument(0));

        AssignmentResponse res = technicianAssignmentService.approveAssignment(601, 801);

        assertThat(res).isNotNull();
        assertThat(assignmentPending.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(assignmentPending.getNguoiDuyet()).isEqualTo(manager1);
        assertThat(childPending.getTrangThai()).isEqualTo("DA_DUYET");
        assertThat(childPending.getNguoiDuyet()).isEqualTo(manager1);
        assertThat(childOrder.getTrangThai()).isEqualTo("DA_PHAN_CONG");
    }
}

