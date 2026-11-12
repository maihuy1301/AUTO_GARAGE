package com.garage.service;

import com.garage.dto.AssignmentResponse;
import com.garage.dto.CreateAssignmentRequest;
import com.garage.dto.RejectAssignmentRequest;
import com.garage.entity.*;
import com.garage.exception.BadRequestException;
import com.garage.exception.DuplicateResourceException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.NguoiDungRepository;
import com.garage.repository.NguoiDungVaiTroRepository;
import com.garage.repository.NhanVienRepository;
import com.garage.repository.PhanCongRepository;
import com.garage.repository.PhieuSuaChuaRepository;
import com.garage.security.BranchAuthorizationService;
import com.garage.security.CustomUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TechnicianAssignmentService {

    private final PhanCongRepository phanCongRepository;
    private final PhieuSuaChuaRepository phieuSuaChuaRepository;
    private final NhanVienRepository nhanVienRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final NguoiDungVaiTroRepository nguoiDungVaiTroRepository;
    private final BranchAuthorizationService branchAuthorizationService;
    private final CustomerProgressNotifier customerProgressNotifier;

    public TechnicianAssignmentService(PhanCongRepository phanCongRepository,
                                       PhieuSuaChuaRepository phieuSuaChuaRepository,
                                       NhanVienRepository nhanVienRepository,
                                       NguoiDungRepository nguoiDungRepository,
                                       NguoiDungVaiTroRepository nguoiDungVaiTroRepository,
                                       BranchAuthorizationService branchAuthorizationService,
                                       CustomerProgressNotifier customerProgressNotifier) {
        this.phanCongRepository = phanCongRepository;
        this.phieuSuaChuaRepository = phieuSuaChuaRepository;
        this.nhanVienRepository = nhanVienRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.nguoiDungVaiTroRepository = nguoiDungVaiTroRepository;
        this.branchAuthorizationService = branchAuthorizationService;
        this.customerProgressNotifier = customerProgressNotifier;
    }

    /**
     * Lấy danh sách phân công kỹ thuật viên của phiếu sửa chữa
     */
    @Transactional(readOnly = true)
    public List<AssignmentResponse> getAssignments(Integer repairOrderId) {
        PhieuSuaChua order = findAndValidateRepairOrder(repairOrderId);
        return phanCongRepository.findByPhieuSuaChuaMaPhieuSuaChua(order.getMaPhieuSuaChua())
                .stream()
                .map(this::mapToAssignmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách phân công chờ duyệt (CHO_DUYET) cho MANAGER / ADMIN
     */
    @Transactional(readOnly = true)
    public List<AssignmentResponse> getPendingAssignments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (isAdmin(auth)) {
            return phanCongRepository.findByTrangThai("CHO_DUYET")
                    .stream()
                    .map(this::mapToAssignmentResponse)
                    .collect(Collectors.toList());
        }

        Optional<Integer> branchIdOpt = branchAuthorizationService.resolveUserBranchId(auth);
        if (branchIdOpt.isEmpty()) {
            throw new AccessDeniedException("Forbidden: Bạn không thuộc chi nhánh nào để xem phân công chờ duyệt");
        }

        return phanCongRepository.findByTrangThaiAndPhieuSuaChuaChiNhanhMaChiNhanh("CHO_DUYET", branchIdOpt.get())
                .stream()
                .map(this::mapToAssignmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Tạo phân công kỹ thuật viên cho phiếu sửa chữa:
     * - Receptionist tạo -> Trạng thái: CHO_DUYET, MaNguoiDuyet: NULL, ThoiGianDuyet: NULL
     * - Manager tự tạo -> Trạng thái: DA_DUYET, MaNguoiDuyet: Manager, ThoiGianDuyet: now
     */
    @Transactional
    public AssignmentResponse createAssignment(Integer repairOrderId, CreateAssignmentRequest request) {
        PhieuSuaChua order = findAndValidateRepairOrder(repairOrderId);
        validateOrderNotCompletedOrCancelled(order, "phân công");

        // 1. Kiểm tra Kỹ thuật viên
        NhanVien technician = nhanVienRepository.findById(request.getTechnicianId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên kỹ thuật với ID: " + request.getTechnicianId()));

        if (Boolean.FALSE.equals(technician.getTrangThai())) {
            String name = (technician.getNguoiDung() != null) ? technician.getNguoiDung().getHoTen() : ("ID " + technician.getMaNhanVien());
            throw new BadRequestException("Nhân viên '" + name + "' hiện đang ngưng hoạt động");
        }

        NguoiDung techUser = technician.getNguoiDung();
        if (techUser == null || Boolean.FALSE.equals(techUser.getTrangThai())) {
            throw new BadRequestException("Tài khoản người dùng của nhân viên này không hợp lệ hoặc đã bị khóa");
        }

        // 2. Kiểm tra vai trò ROLE_TECHNICIAN
        boolean isTechnician = nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(techUser.getMaNguoiDung())
                .stream()
                .anyMatch(nvt -> {
                    String roleName = nvt.getVaiTro().getTenVaiTro();
                    return "ROLE_TECHNICIAN".equalsIgnoreCase(roleName) || "TECHNICIAN".equalsIgnoreCase(roleName);
                });

        if (!isTechnician) {
            String name = techUser.getHoTen() != null ? techUser.getHoTen() : ("ID " + technician.getMaNhanVien());
            throw new BadRequestException("Nhân viên '" + name + "' không có vai trò Kỹ thuật viên (ROLE_TECHNICIAN)");
        }

        // 3. Kiểm tra chi nhánh khớp nhau
        Integer orderBranchId = order.getChiNhanh().getMaChiNhanh();
        Integer techBranchId = technician.getChiNhanh() != null ? technician.getChiNhanh().getMaChiNhanh() : null;

        if (techBranchId == null || !techBranchId.equals(orderBranchId)) {
            throw new AccessDeniedException("Forbidden: Kỹ thuật viên không thuộc chi nhánh của phiếu sửa chữa");
        }

        // 4. Chống phân công trùng lặp
        if (phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(repairOrderId, request.getTechnicianId())) {
            String name = techUser.getHoTen() != null ? techUser.getHoTen() : ("ID " + technician.getMaNhanVien());
            throw new DuplicateResourceException("Kỹ thuật viên '" + name + "' đã được phân công cho phiếu sửa chữa này");
        }

        // 5. Xác định người phân công từ Authenticated User
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        NhanVien currentStaff = resolveStaff(auth, order.getChiNhanh());

        PhanCong phanCong = new PhanCong();
        phanCong.setPhieuSuaChua(order);
        phanCong.setNhanVienDuocPhanCong(technician);
        phanCong.setNguoiPhanCong(currentStaff);
        phanCong.setThoiGianTao(LocalDateTime.now());
        phanCong.setGhiChu(request.getGhiChu());

        boolean isManagerOrAdmin = isManagerOrAdmin(auth);

        if (isManagerOrAdmin) {
            // FLOW 2: Manager tự phân công -> DA_DUYET ngay
            phanCong.setNguoiDuyet(currentStaff);
            phanCong.setTrangThai("DA_DUYET");
            phanCong.setThoiGianDuyet(LocalDateTime.now());

            // Đồng bộ trạng thái phiếu sửa chữa sang DA_PHAN_CONG nếu đang là CHO_XU_LY
            if ("CHO_XU_LY".equalsIgnoreCase(order.getTrangThai())) {
                order.setTrangThai("DA_PHAN_CONG");
                phieuSuaChuaRepository.save(order);
                customerProgressNotifier.repairChanged(order, "CHO_XU_LY");
            }
        } else {
            // FLOW 1: Receptionist tạo -> CHO_DUYET
            phanCong.setNguoiDuyet(null);
            phanCong.setTrangThai("CHO_DUYET");
            phanCong.setThoiGianDuyet(null);
        }

        PhanCong saved = phanCongRepository.save(phanCong);

        // Đồng bộ phân công sang các phiếu con nếu order là phiếu cha (maPhieuCha == null)
        if (order.getPhieuCha() == null) {
            List<PhieuSuaChua> childOrders = phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(order.getMaPhieuSuaChua());
            for (PhieuSuaChua childOrder : childOrders) {
                if ("HUY".equalsIgnoreCase(childOrder.getTrangThai()) || "HOAN_TAT".equalsIgnoreCase(childOrder.getTrangThai())) {
                    continue;
                }
                boolean alreadyAssigned = phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVien(
                        childOrder.getMaPhieuSuaChua(),
                        technician.getMaNhanVien()
                );
                if (!alreadyAssigned) {
                    PhanCong childPc = new PhanCong();
                    childPc.setPhieuSuaChua(childOrder);
                    childPc.setNhanVienDuocPhanCong(technician);
                    childPc.setNguoiPhanCong(currentStaff);
                    childPc.setThoiGianTao(LocalDateTime.now());
                    childPc.setGhiChu(request.getGhiChu() != null ? request.getGhiChu() : ("Đồng bộ phân công từ Phiếu cha #" + order.getMaPhieuSuaChua()));

                    if (isManagerOrAdmin) {
                        childPc.setNguoiDuyet(currentStaff);
                        childPc.setTrangThai("DA_DUYET");
                        childPc.setThoiGianDuyet(LocalDateTime.now());

                        if ("CHO_XU_LY".equalsIgnoreCase(childOrder.getTrangThai())) {
                            childOrder.setTrangThai("DA_PHAN_CONG");
                            phieuSuaChuaRepository.save(childOrder);
                            customerProgressNotifier.repairChanged(childOrder, "CHO_XU_LY");
                        }
                    } else {
                        childPc.setNguoiDuyet(null);
                        childPc.setTrangThai("CHO_DUYET");
                        childPc.setThoiGianDuyet(null);
                    }
                    phanCongRepository.save(childPc);
                }
            }
        }

        return mapToAssignmentResponse(saved);
    }

    /**
     * MANAGER duyệt phân công của RECEPTIONIST:
     * CHO_DUYET -> DA_DUYET
     */
    @Transactional
    public AssignmentResponse approveAssignment(Integer repairOrderId, Integer assignmentId) {
        PhieuSuaChua order = findAndValidateRepairOrder(repairOrderId);
        validateOrderNotCompletedOrCancelled(order, "duyệt phân công");

        PhanCong assignment = phanCongRepository
                .findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(assignmentId, repairOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phân công với ID: " + assignmentId + " trong phiếu sửa chữa này"));

        if (!"CHO_DUYET".equalsIgnoreCase(assignment.getTrangThai())) {
            throw new BadRequestException("Chỉ có thể duyệt phân công đang ở trạng thái chờ duyệt (CHO_DUYET). Trạng thái hiện tại: " + assignment.getTrangThai());
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        NhanVien manager = resolveStaff(auth, order.getChiNhanh());

        assignment.setNguoiDuyet(manager);
        assignment.setTrangThai("DA_DUYET");
        assignment.setThoiGianDuyet(LocalDateTime.now());

        PhanCong updated = phanCongRepository.save(assignment);

        // Đồng bộ trạng thái phiếu sửa chữa nếu đang là CHO_XU_LY
        if ("CHO_XU_LY".equalsIgnoreCase(order.getTrangThai())) {
            order.setTrangThai("DA_PHAN_CONG");
            phieuSuaChuaRepository.save(order);
            customerProgressNotifier.repairChanged(order, "CHO_XU_LY");
        }

        // Đồng bộ duyệt phân công ở các phiếu con nếu đây là phiếu cha
        if (order.getPhieuCha() == null && assignment.getNhanVienDuocPhanCong() != null) {
            Integer techId = assignment.getNhanVienDuocPhanCong().getMaNhanVien();
            List<PhieuSuaChua> childOrders = phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(order.getMaPhieuSuaChua());
            for (PhieuSuaChua childOrder : childOrders) {
                if ("HUY".equalsIgnoreCase(childOrder.getTrangThai()) || "HOAN_TAT".equalsIgnoreCase(childOrder.getTrangThai())) {
                    continue;
                }
                List<PhanCong> childAssignments = phanCongRepository.findByPhieuSuaChuaMaPhieuSuaChua(childOrder.getMaPhieuSuaChua());
                boolean foundChildAssignment = false;
                for (PhanCong childPc : childAssignments) {
                    if (childPc.getNhanVienDuocPhanCong() != null
                            && childPc.getNhanVienDuocPhanCong().getMaNhanVien().equals(techId)) {
                        foundChildAssignment = true;
                        if ("CHO_DUYET".equalsIgnoreCase(childPc.getTrangThai())) {
                            childPc.setNguoiDuyet(manager);
                            childPc.setTrangThai("DA_DUYET");
                            childPc.setThoiGianDuyet(LocalDateTime.now());
                            phanCongRepository.save(childPc);

                            if ("CHO_XU_LY".equalsIgnoreCase(childOrder.getTrangThai())) {
                                childOrder.setTrangThai("DA_PHAN_CONG");
                                phieuSuaChuaRepository.save(childOrder);
                                customerProgressNotifier.repairChanged(childOrder, "CHO_XU_LY");
                            }
                        }
                    }
                }

                if (!foundChildAssignment) {
                    PhanCong childPc = new PhanCong();
                    childPc.setPhieuSuaChua(childOrder);
                    childPc.setNhanVienDuocPhanCong(assignment.getNhanVienDuocPhanCong());
                    childPc.setNguoiPhanCong(assignment.getNguoiPhanCong() != null ? assignment.getNguoiPhanCong() : manager);
                    childPc.setNguoiDuyet(manager);
                    childPc.setTrangThai("DA_DUYET");
                    childPc.setThoiGianTao(LocalDateTime.now());
                    childPc.setThoiGianDuyet(LocalDateTime.now());
                    childPc.setGhiChu(assignment.getGhiChu() != null ? assignment.getGhiChu() : ("Đồng bộ duyệt phân công từ Phiếu cha #" + order.getMaPhieuSuaChua()));
                    phanCongRepository.save(childPc);

                    if ("CHO_XU_LY".equalsIgnoreCase(childOrder.getTrangThai())) {
                        childOrder.setTrangThai("DA_PHAN_CONG");
                        phieuSuaChuaRepository.save(childOrder);
                        customerProgressNotifier.repairChanged(childOrder, "CHO_XU_LY");
                    }
                }
            }
        }

        return mapToAssignmentResponse(updated);
    }

    /**
     * MANAGER từ chối phân công:
     * CHO_DUYET -> TU_CHOI
     */
    @Transactional
    public AssignmentResponse rejectAssignment(Integer repairOrderId, Integer assignmentId, RejectAssignmentRequest request) {
        PhieuSuaChua order = findAndValidateRepairOrder(repairOrderId);
        validateOrderNotCompletedOrCancelled(order, "từ chối phân công");

        PhanCong assignment = phanCongRepository
                .findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(assignmentId, repairOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phân công với ID: " + assignmentId + " trong phiếu sửa chữa này"));

        if (!"CHO_DUYET".equalsIgnoreCase(assignment.getTrangThai())) {
            throw new BadRequestException("Chỉ có thể từ chối phân công đang ở trạng thái chờ duyệt (CHO_DUYET). Trạng thái hiện tại: " + assignment.getTrangThai());
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        NhanVien manager = resolveStaff(auth, order.getChiNhanh());

        assignment.setNguoiDuyet(manager);
        assignment.setTrangThai("TU_CHOI");
        assignment.setThoiGianDuyet(LocalDateTime.now());
        if (request != null && request.getGhiChu() != null && !request.getGhiChu().isBlank()) {
            assignment.setGhiChu(request.getGhiChu());
        }

        PhanCong updated = phanCongRepository.save(assignment);

        // Đồng bộ từ chối phân công ở các phiếu con nếu đây là phiếu cha
        if (order.getPhieuCha() == null && assignment.getNhanVienDuocPhanCong() != null) {
            Integer techId = assignment.getNhanVienDuocPhanCong().getMaNhanVien();
            List<PhieuSuaChua> childOrders = phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(order.getMaPhieuSuaChua());
            for (PhieuSuaChua childOrder : childOrders) {
                List<PhanCong> childAssignments = phanCongRepository.findByPhieuSuaChuaMaPhieuSuaChua(childOrder.getMaPhieuSuaChua());
                for (PhanCong childPc : childAssignments) {
                    if ("CHO_DUYET".equalsIgnoreCase(childPc.getTrangThai())
                            && childPc.getNhanVienDuocPhanCong() != null
                            && childPc.getNhanVienDuocPhanCong().getMaNhanVien().equals(techId)) {
                        childPc.setNguoiDuyet(manager);
                        childPc.setTrangThai("TU_CHOI");
                        childPc.setThoiGianDuyet(LocalDateTime.now());
                        if (request != null && request.getGhiChu() != null && !request.getGhiChu().isBlank()) {
                            childPc.setGhiChu(request.getGhiChu());
                        }
                        phanCongRepository.save(childPc);
                    }
                }
            }
        }

        return mapToAssignmentResponse(updated);
    }

    /**
     * Hủy/xóa phân công kỹ thuật viên khỏi phiếu sửa chữa
     */
    @Transactional
    public void deleteAssignment(Integer repairOrderId, Integer assignmentId) {
        PhieuSuaChua order = findAndValidateRepairOrder(repairOrderId);
        validateOrderNotCompletedOrCancelled(order, "hủy phân công");

        PhanCong assignment = phanCongRepository
                .findByMaPhanCongAndPhieuSuaChuaMaPhieuSuaChua(assignmentId, repairOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phân công với ID: " + assignmentId + " trong phiếu sửa chữa này"));

        phanCongRepository.delete(assignment);

        // Đồng bộ xóa phân công tương ứng ở phiếu con nếu đây là phiếu cha
        if (order.getPhieuCha() == null && assignment.getNhanVienDuocPhanCong() != null) {
            Integer techId = assignment.getNhanVienDuocPhanCong().getMaNhanVien();
            List<PhieuSuaChua> childOrders = phieuSuaChuaRepository.findByPhieuChaMaPhieuSuaChua(order.getMaPhieuSuaChua());
            for (PhieuSuaChua childOrder : childOrders) {
                List<PhanCong> childAssignments = phanCongRepository.findByPhieuSuaChuaMaPhieuSuaChua(childOrder.getMaPhieuSuaChua());
                for (PhanCong childPc : childAssignments) {
                    if (childPc.getNhanVienDuocPhanCong() != null
                            && childPc.getNhanVienDuocPhanCong().getMaNhanVien().equals(techId)) {
                        phanCongRepository.delete(childPc);

                        long remainingChildApproved = phanCongRepository.countByPhieuSuaChuaMaPhieuSuaChuaAndTrangThai(childOrder.getMaPhieuSuaChua(), "DA_DUYET");
                        if (remainingChildApproved == 0 && "DA_PHAN_CONG".equalsIgnoreCase(childOrder.getTrangThai())) {
                            childOrder.setTrangThai("CHO_XU_LY");
                            phieuSuaChuaRepository.save(childOrder);
                            customerProgressNotifier.repairChanged(childOrder, "DA_PHAN_CONG");
                        }
                    }
                }
            }
        }

        // Nếu sau khi xóa không còn phân công đã duyệt nào và trạng thái đang là DA_PHAN_CONG -> rollback về CHO_XU_LY
        long remainingApproved = phanCongRepository.countByPhieuSuaChuaMaPhieuSuaChuaAndTrangThai(repairOrderId, "DA_DUYET");
        if (remainingApproved == 0 && "DA_PHAN_CONG".equalsIgnoreCase(order.getTrangThai())) {
            order.setTrangThai("CHO_XU_LY");
            phieuSuaChuaRepository.save(order);
            customerProgressNotifier.repairChanged(order, "DA_PHAN_CONG");
        }
    }

    // --- Private Helpers ---

    private PhieuSuaChua findAndValidateRepairOrder(Integer repairOrderId) {
        PhieuSuaChua order = phieuSuaChuaRepository.findById(repairOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu sửa chữa với ID: " + repairOrderId));

        if (!branchAuthorizationService.isAllowedBranch(order.getChiNhanh().getMaChiNhanh())) {
            throw new AccessDeniedException("Forbidden: Bạn không có quyền truy cập phiếu sửa chữa của chi nhánh khác");
        }

        return order;
    }

    private void validateOrderNotCompletedOrCancelled(PhieuSuaChua order, String action) {
        String status = order.getTrangThai();
        if ("HOAN_TAT".equalsIgnoreCase(status) || "HUY".equalsIgnoreCase(status)) {
            throw new BadRequestException("Không thể " + action + " kỹ thuật viên khi phiếu sửa chữa đã ở trạng thái: " + status);
        }
    }

    private NhanVien resolveStaff(Authentication auth, ChiNhanh branch) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Unauthorized: Bạn chưa đăng nhập");
        }

        NguoiDung user;
        if (auth.getPrincipal() instanceof CustomUserDetails) {
            user = ((CustomUserDetails) auth.getPrincipal()).getNguoiDung();
        } else {
            String username = auth.getName();
            user = nguoiDungRepository.findByTenDangNhapOrEmail(username, username)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + username));
        }

        Optional<NhanVien> empOpt = nhanVienRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung());
        if (empOpt.isPresent()) {
            return empOpt.get();
        }

        if (isAdmin(auth) && branch != null) {
            List<NhanVien> staffList = nhanVienRepository.findByChiNhanhMaChiNhanh(branch.getMaChiNhanh());
            if (!staffList.isEmpty()) {
                return staffList.stream()
                        .filter(nv -> nv.getChucVu() != null && nv.getChucVu().toLowerCase().contains("quản lý"))
                        .findFirst()
                        .orElse(staffList.get(0));
            }
            throw new BadRequestException("Không tìm thấy nhân viên nào thuộc chi nhánh " + branch.getTenChiNhanh() + " để thực hiện phân công");
        }

        throw new AccessDeniedException("Forbidden: Tài khoản này không được liên kết với nhân viên garage");
    }

    private boolean isManagerOrAdmin(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> "ROLE_ADMIN".equalsIgnoreCase(role) || "ROLE_MANAGER".equalsIgnoreCase(role));
    }

    private boolean isAdmin(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equalsIgnoreCase);
    }

    private AssignmentResponse mapToAssignmentResponse(PhanCong pc) {
        NhanVien tech = pc.getNhanVienDuocPhanCong();
        NguoiDung techUser = (tech != null) ? tech.getNguoiDung() : null;
        ChiNhanh cn = (tech != null) ? tech.getChiNhanh() : null;

        NhanVien creator = pc.getNguoiPhanCong();
        NguoiDung creatorUser = (creator != null) ? creator.getNguoiDung() : null;

        NhanVien approver = pc.getNguoiDuyet();
        NguoiDung approverUser = (approver != null) ? approver.getNguoiDung() : null;

        return new AssignmentResponse(
                pc.getMaPhanCong(),
                pc.getPhieuSuaChua() != null ? pc.getPhieuSuaChua().getMaPhieuSuaChua() : null,
                creator != null ? creator.getMaNhanVien() : null,
                creatorUser != null ? creatorUser.getHoTen() : null,
                approver != null ? approver.getMaNhanVien() : null,
                approverUser != null ? approverUser.getHoTen() : null,
                tech != null ? tech.getMaNhanVien() : null,
                techUser != null ? techUser.getHoTen() : null,
                cn != null ? cn.getMaChiNhanh() : null,
                cn != null ? cn.getTenChiNhanh() : null,
                pc.getGhiChu(),
                pc.getThoiGianTao(),
                pc.getThoiGianDuyet(),
                pc.getTrangThai()
        );
    }
}

