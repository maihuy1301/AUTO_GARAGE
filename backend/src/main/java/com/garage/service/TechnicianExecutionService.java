package com.garage.service;

import com.garage.dto.*;
import com.garage.entity.*;
import com.garage.exception.BadRequestException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TechnicianExecutionService {

    private final PhieuSuaChuaRepository phieuSuaChuaRepository;
    private final PhanCongRepository phanCongRepository;
    private final PhieuSuaChuaDichVuRepository phieuSuaChuaDichVuRepository;
    private final NhanVienRepository nhanVienRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final NguoiDungVaiTroRepository nguoiDungVaiTroRepository;
    private final CustomerProgressNotifier customerProgressNotifier;

    public TechnicianExecutionService(PhieuSuaChuaRepository phieuSuaChuaRepository,
                                      PhanCongRepository phanCongRepository,
                                      PhieuSuaChuaDichVuRepository phieuSuaChuaDichVuRepository,
                                      NhanVienRepository nhanVienRepository,
                                      NguoiDungRepository nguoiDungRepository,
                                      NguoiDungVaiTroRepository nguoiDungVaiTroRepository,
                                      CustomerProgressNotifier customerProgressNotifier) {
        this.phieuSuaChuaRepository = phieuSuaChuaRepository;
        this.phanCongRepository = phanCongRepository;
        this.phieuSuaChuaDichVuRepository = phieuSuaChuaDichVuRepository;
        this.nhanVienRepository = nhanVienRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.nguoiDungVaiTroRepository = nguoiDungVaiTroRepository;
        this.customerProgressNotifier = customerProgressNotifier;
    }

    /**
     * Kỹ thuật viên xem danh sách các phiếu sửa chữa được phân công cho mình (chỉ xem các phân công DA_DUYET và gộp về phiếu gốc)
     */
    @Transactional(readOnly = true)
    public List<RepairOrderResponse> getMyRepairOrders() {
        NhanVien tech = getCurrentTechnician();
        return phanCongRepository.findByNhanVienDuocPhanCongMaNhanVienAndTrangThai(tech.getMaNhanVien(), "DA_DUYET")
                .stream()
                .map(PhanCong::getPhieuSuaChua)
                .filter(java.util.Objects::nonNull)
                .map(this::findRootRepairOrder)
                .distinct()
                .map(this::mapToRepairOrderResponse)
                .collect(Collectors.toList());
    }

    /**
     * Kỹ thuật viên xem chi tiết phiếu sửa chữa được phân công cho mình
     */
    @Transactional(readOnly = true)
    public RepairOrderResponse getRepairOrderDetail(Integer repairOrderId) {
        NhanVien tech = getCurrentTechnician();
        PhieuSuaChua order = validateTechnicianAssignment(tech, repairOrderId);
        return mapToRepairOrderResponse(order);
    }

    /**
     * Kỹ thuật viên xem danh sách các hạng mục dịch vụ thuộc phiếu sửa chữa của mình (bao gồm cả các phiếu phát sinh / phiếu con liên quan)
     */
    @Transactional(readOnly = true)
    public List<RepairItemResponse> getRepairOrderItems(Integer repairOrderId) {
        NhanVien tech = getCurrentTechnician();
        PhieuSuaChua order = validateTechnicianAssignment(tech, repairOrderId);
        List<PhieuSuaChua> relatedOrders = getRelatedRepairOrders(order);

        List<RepairItemResponse> result = new java.util.ArrayList<>();
        for (PhieuSuaChua ro : relatedOrders) {
            List<PhieuSuaChuaDichVu> items = phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(ro.getMaPhieuSuaChua());
            if (items != null) {
                for (PhieuSuaChuaDichVu it : items) {
                    result.add(mapToRepairItemResponse(it));
                }
            }
        }
        return result;
    }

    /**
     * Kỹ thuật viên cập nhật tiến độ thực hiện sửa chữa:
     * - Kiểm tra phân công hợp lệ
     * - Bảo vệ phiếu sửa chữa đã hoàn tất/hủy (400)
     * - Cập nhật trạng thái phiếu sửa chữa (DANG_SUA, TAM_DUNG, CHO_KH_DUYET, HOAN_TAT)
     * - Tự động ghi nhận thoiGianBatDau / thoiGianHoanTat khi tương ứng
     */
    @Transactional
    public RepairProgressResponse updateProgress(Integer repairOrderId, UpdateRepairProgressRequest request) {
        NhanVien tech = getCurrentTechnician();
        PhieuSuaChua order = validateTechnicianAssignment(tech, repairOrderId);
        validateOrderNotCompletedOrCancelled(order, "cập nhật tiến độ");

        String previousStatus = order.getTrangThai();
        String newStatus = request.getTrangThai();
        if ("DANG_SUA".equalsIgnoreCase(newStatus)) {
            if (order.getThoiGianBatDau() == null) {
                order.setThoiGianBatDau(LocalDateTime.now());
            }
            order.setTrangThai("DANG_SUA");
        } else if ("HOAN_TAT".equalsIgnoreCase(newStatus) || (request.getPhanTramHoanThanh() != null && request.getPhanTramHoanThanh() == 100)) {
            if (order.getThoiGianBatDau() == null) {
                order.setThoiGianBatDau(LocalDateTime.now());
            }
            order.setThoiGianHoanTat(LocalDateTime.now());
            order.setTrangThai("HOAN_TAT");
        } else if ("TAM_DUNG".equalsIgnoreCase(newStatus) || "DA_PHAN_CONG".equalsIgnoreCase(newStatus)) {
            order.setTrangThai(newStatus);
        } else {
            throw new BadRequestException("Trạng thái tiến độ không hợp lệ: " + newStatus);
        }

        PhieuSuaChua saved = phieuSuaChuaRepository.save(order);
        customerProgressNotifier.repairChanged(saved, previousStatus);

        // Nếu hoàn tất, cập nhật tất cả dịch vụ của phiếu chính sang HOAN_TAT
        if ("HOAN_TAT".equalsIgnoreCase(order.getTrangThai())) {
            List<PhieuSuaChuaDichVu> mainItems = phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(order.getMaPhieuSuaChua());
            if (mainItems != null) {
                for (PhieuSuaChuaDichVu mi : mainItems) {
                    if (!"HUY".equalsIgnoreCase(mi.getTrangThai()) && !"HOAN_TAT".equalsIgnoreCase(mi.getTrangThai())) {
                        mi.setTrangThai("HOAN_TAT");
                        phieuSuaChuaDichVuRepository.save(mi);
                    }
                }
            }
        }

        // Đồng bộ cập nhật tiến độ sang tất cả các phiếu con / phiếu phát sinh liên quan
        List<PhieuSuaChua> relatedOrders = getRelatedRepairOrders(order);
        for (PhieuSuaChua ro : relatedOrders) {
            if (ro.getMaPhieuSuaChua().equals(order.getMaPhieuSuaChua())) {
                continue;
            }
            if ("HUY".equalsIgnoreCase(ro.getTrangThai())) {
                continue;
            }
            String prevChildStatus = ro.getTrangThai();
            if ("HOAN_TAT".equalsIgnoreCase(order.getTrangThai())) {
                if (ro.getThoiGianBatDau() == null) {
                    ro.setThoiGianBatDau(order.getThoiGianBatDau() != null ? order.getThoiGianBatDau() : LocalDateTime.now());
                }
                ro.setThoiGianHoanTat(LocalDateTime.now());
                ro.setTrangThai("HOAN_TAT");

                // Cập nhật tất cả dịch vụ trong phiếu con sang HOAN_TAT
                List<PhieuSuaChuaDichVu> childItems = phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(ro.getMaPhieuSuaChua());
                if (childItems != null) {
                    for (PhieuSuaChuaDichVu ci : childItems) {
                        if (!"HUY".equalsIgnoreCase(ci.getTrangThai()) && !"HOAN_TAT".equalsIgnoreCase(ci.getTrangThai())) {
                            ci.setTrangThai("HOAN_TAT");
                            phieuSuaChuaDichVuRepository.save(ci);
                        }
                    }
                }
                phieuSuaChuaRepository.save(ro);
                customerProgressNotifier.repairChanged(ro, prevChildStatus);
            } else if ("DANG_SUA".equalsIgnoreCase(order.getTrangThai())) {
                if (ro.getThoiGianBatDau() == null) {
                    ro.setThoiGianBatDau(LocalDateTime.now());
                }
                if (!"HOAN_TAT".equalsIgnoreCase(ro.getTrangThai())) {
                    ro.setTrangThai("DANG_SUA");
                    phieuSuaChuaRepository.save(ro);
                    customerProgressNotifier.repairChanged(ro, prevChildStatus);
                }
            } else if ("TAM_DUNG".equalsIgnoreCase(order.getTrangThai())) {
                if (!"HOAN_TAT".equalsIgnoreCase(ro.getTrangThai())) {
                    ro.setTrangThai(order.getTrangThai());
                    phieuSuaChuaRepository.save(ro);
                    customerProgressNotifier.repairChanged(ro, prevChildStatus);
                }
            }
        }

        String techName = (tech.getNguoiDung() != null && tech.getNguoiDung().getHoTen() != null)
                ? tech.getNguoiDung().getHoTen()
                : "NV #" + tech.getMaNhanVien();

        return new RepairProgressResponse(
                saved.getMaPhieuSuaChua(),
                order.getMaPhieuSuaChua(),
                tech.getMaNhanVien(),
                techName,
                saved.getTrangThai(),
                request.getPhanTramHoanThanh() != null ? request.getPhanTramHoanThanh() : 0,
                request.getMoTa(),
                LocalDateTime.now()
        );
    }

    /**
     * Lấy lịch sử tiến độ của phiếu sửa chữa
     */
    public List<RepairProgressResponse> getProgressHistory(Integer repairOrderId) {
        NhanVien tech = getCurrentTechnician();
        PhieuSuaChua order = validateTechnicianAssignment(tech, repairOrderId);

        String techName = (tech.getNguoiDung() != null && tech.getNguoiDung().getHoTen() != null)
                ? tech.getNguoiDung().getHoTen()
                : "NV #" + tech.getMaNhanVien();

        int percent = "HOAN_TAT".equalsIgnoreCase(order.getTrangThai()) ? 100
                : ("DANG_SUA".equalsIgnoreCase(order.getTrangThai()) ? 50 : 0);

        return List.of(new RepairProgressResponse(
                order.getMaPhieuSuaChua(),
                order.getMaPhieuSuaChua(),
                tech.getMaNhanVien(),
                techName,
                order.getTrangThai(),
                percent,
                "Trạng thái hiện tại: " + order.getTrangThai(),
                order.getThoiGianHoanTat() != null ? order.getThoiGianHoanTat()
                        : (order.getThoiGianBatDau() != null ? order.getThoiGianBatDau() : LocalDateTime.now())
        ));
    }

    /**
     * Kỹ thuật viên cập nhật trạng thái hạng mục dịch vụ trong phiếu sửa chữa (hoặc các phiếu phát sinh liên quan)
     */
    @Transactional
    public RepairItemResponse updateItemStatus(Integer repairOrderId, Integer itemId, UpdateServiceItemStatusRequest request) {
        NhanVien tech = getCurrentTechnician();
        PhieuSuaChua order = validateTechnicianAssignment(tech, repairOrderId);
        validateOrderNotCompletedOrCancelled(order, "cập nhật trạng thái dịch vụ");

        PhieuSuaChuaDichVu item = phieuSuaChuaDichVuRepository
                .findByMaChiTietAndPhieuSuaChuaMaPhieuSuaChua(itemId, repairOrderId)
                .orElse(null);

        if (item == null) {
            List<PhieuSuaChua> relatedOrders = getRelatedRepairOrders(order);
            for (PhieuSuaChua ro : relatedOrders) {
                if (!ro.getMaPhieuSuaChua().equals(repairOrderId)) {
                    java.util.Optional<PhieuSuaChuaDichVu> found = phieuSuaChuaDichVuRepository
                            .findByMaChiTietAndPhieuSuaChuaMaPhieuSuaChua(itemId, ro.getMaPhieuSuaChua());
                    if (found.isPresent()) {
                        item = found.get();
                        break;
                    }
                }
            }
        }

        if (item == null) {
            throw new ResourceNotFoundException("Không tìm thấy hạng mục dịch vụ ID " + itemId + " trong phiếu sửa chữa này hoặc các phiếu liên quan");
        }

        if (item.getPhieuSuaChua() != null) {
            validateOrderNotCompletedOrCancelled(item.getPhieuSuaChua(), "cập nhật trạng thái dịch vụ");
        }

        item.setTrangThai(request.getTrangThai());
        PhieuSuaChuaDichVu updated = phieuSuaChuaDichVuRepository.save(item);
        return mapToRepairItemResponse(updated);
    }

    // --- Private Helpers ---

    private NhanVien getCurrentTechnician() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new AccessDeniedException("Unauthorized: Bạn chưa đăng nhập");
        }

        NguoiDung user = nguoiDungRepository.findByTenDangNhapOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + auth.getName()));

        if (Boolean.FALSE.equals(user.getTrangThai())) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa");
        }

        NhanVien employee = nhanVienRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung())
                .orElseThrow(() -> new AccessDeniedException("Forbidden: Tài khoản này không được liên kết với nhân viên garage"));

        if (Boolean.FALSE.equals(employee.getTrangThai())) {
            throw new BadRequestException("Hồ sơ nhân viên hiện đang ngưng hoạt động");
        }

        boolean isTechnician = nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung())
                .stream()
                .anyMatch(nvt -> {
                    String r = nvt.getVaiTro().getTenVaiTro();
                    return "TECHNICIAN".equalsIgnoreCase(r) || "ROLE_TECHNICIAN".equalsIgnoreCase(r);
                });

        if (!isTechnician) {
            throw new AccessDeniedException("Forbidden: Chỉ Kỹ thuật viên (TECHNICIAN) mới có quyền truy cập module này");
        }

        return employee;
    }

    private PhieuSuaChua validateTechnicianAssignment(NhanVien tech, Integer repairOrderId) {
        PhieuSuaChua order = phieuSuaChuaRepository.findById(repairOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu sửa chữa với ID: " + repairOrderId));

        // Kiểm tra chi nhánh
        Integer techBranchId = (tech.getChiNhanh() != null) ? tech.getChiNhanh().getMaChiNhanh() : null;
        Integer orderBranchId = (order.getChiNhanh() != null) ? order.getChiNhanh().getMaChiNhanh() : null;

        if (techBranchId == null || !techBranchId.equals(orderBranchId)) {
            throw new AccessDeniedException("Forbidden: Phiếu sửa chữa thuộc chi nhánh khác");
        }

        // Kiểm tra phân công (Technician được truy cập nếu phân công đã được DA_DUYET cho chính phiếu này hoặc phiếu gốc)
        boolean isAssigned = phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVienAndTrangThai(
                repairOrderId, tech.getMaNhanVien(), "DA_DUYET"
        );

        if (!isAssigned && order.getPhieuCha() != null) {
            PhieuSuaChua root = findRootRepairOrder(order);
            isAssigned = phanCongRepository.existsByPhieuSuaChuaMaPhieuSuaChuaAndNhanVienDuocPhanCongMaNhanVienAndTrangThai(
                    root.getMaPhieuSuaChua(), tech.getMaNhanVien(), "DA_DUYET"
            );
        }

        if (!isAssigned) {
            throw new AccessDeniedException("Forbidden: Bạn không được phân công hoặc phân công chưa được duyệt cho phiếu sửa chữa này");
        }

        return order;
    }

    private PhieuSuaChua findRootRepairOrder(PhieuSuaChua order) {
        PhieuSuaChua current = order;
        java.util.Set<Integer> visited = new java.util.HashSet<>();
        while (current.getPhieuCha() != null && current.getPhieuCha().getMaPhieuSuaChua() != null) {
            if (!visited.add(current.getMaPhieuSuaChua())) {
                break;
            }
            Integer parentId = current.getPhieuCha().getMaPhieuSuaChua();
            current = phieuSuaChuaRepository.findById(parentId).orElse(current.getPhieuCha());
        }
        return current;
    }

    private List<PhieuSuaChua> getRelatedRepairOrders(PhieuSuaChua order) {
        if (order == null) return List.of();
        List<PhieuSuaChua> list = new java.util.ArrayList<>();
        list.add(order);

        if (order.getPhieuTiepNhan() != null && order.getPhieuTiepNhan().getMaTiepNhan() != null) {
            List<PhieuSuaChua> ptnOrders = phieuSuaChuaRepository.findAllByPhieuTiepNhanMaTiepNhan(order.getPhieuTiepNhan().getMaTiepNhan());
            if (ptnOrders != null && !ptnOrders.isEmpty()) {
                return ptnOrders.stream()
                        .filter(o -> !"HUY".equalsIgnoreCase(o.getTrangThai()))
                        .distinct()
                        .collect(Collectors.toList());
            }
        }
        return list;
    }

    private void validateOrderNotCompletedOrCancelled(PhieuSuaChua order, String action) {
        String status = order.getTrangThai();
        if ("HOAN_TAT".equalsIgnoreCase(status) || "HUY".equalsIgnoreCase(status)) {
            throw new BadRequestException("Không thể " + action + " khi phiếu sửa chữa đã ở trạng thái: " + status);
        }
    }

    private RepairOrderResponse mapToRepairOrderResponse(PhieuSuaChua order) {
        PhieuTiepNhan ptn = order.getPhieuTiepNhan();
        ChiNhanh cn = order.getChiNhanh();

        Integer maTiepNhan = null;
        Integer maDatLich = null;
        Integer maXe = null;
        String bienSoXe = null;
        Integer maHangXe = null;
        String tenHangXe = null;
        Integer maModel = null;
        String tenModel = null;

        Integer maKhachHang = null;
        String tenKhachHang = null;
        String soDienThoaiKhachHang = null;

        if (ptn != null) {
            maTiepNhan = ptn.getMaTiepNhan();
            if (ptn.getDatLich() != null) {
                maDatLich = ptn.getDatLich().getMaDatLich();
            }
            Xe xe = ptn.getXe();
            if (xe != null) {
                maXe = xe.getMaXe();
                bienSoXe = xe.getBienSo();
                if (xe.getModelXe() != null) {
                    maModel = xe.getModelXe().getMaModel();
                    tenModel = xe.getModelXe().getTenModel();
                    if (xe.getModelXe().getHangXe() != null) {
                        maHangXe = xe.getModelXe().getHangXe().getMaHangXe();
                        tenHangXe = xe.getModelXe().getHangXe().getTenHangXe();
                    }
                }

                if (xe.getKhachHang() != null) {
                    KhachHang kh = xe.getKhachHang();
                    maKhachHang = kh.getMaKhachHang();
                    if (kh.getNguoiDung() != null) {
                        tenKhachHang = kh.getNguoiDung().getHoTen();
                        soDienThoaiKhachHang = kh.getNguoiDung().getSoDienThoai();
                    }
                }
            }
        }

        Integer maPhieuCha = (order.getPhieuCha() != null) ? order.getPhieuCha().getMaPhieuSuaChua() : null;

        return new RepairOrderResponse(
                order.getMaPhieuSuaChua(),
                maPhieuCha,
                maTiepNhan,
                maDatLich,
                maXe,
                bienSoXe,
                maHangXe,
                tenHangXe,
                maModel,
                tenModel,
                maKhachHang,
                tenKhachHang,
                soDienThoaiKhachHang,
                cn != null ? cn.getMaChiNhanh() : null,
                cn != null ? cn.getTenChiNhanh() : null,
                order.getThoiGianBatDau(),
                order.getThoiGianHoanTat(),
                order.getTrangThai(),
                order.getGhiChu()
        );
    }

    private RepairItemResponse mapToRepairItemResponse(PhieuSuaChuaDichVu item) {
        DichVu dv = item.getDichVu();
        Integer maLoaiDichVu = null;
        String tenLoaiDichVu = null;
        if (dv != null && dv.getLoaiDichVu() != null) {
            maLoaiDichVu = dv.getLoaiDichVu().getMaLoaiDichVu();
            tenLoaiDichVu = dv.getLoaiDichVu().getTenLoai();
        }

        BigDecimal thanhTien = BigDecimal.ZERO;
        if (item.getDonGia() != null && item.getSoLuong() != null) {
            thanhTien = item.getDonGia().multiply(BigDecimal.valueOf(item.getSoLuong()));
        }

        return new RepairItemResponse(
                item.getMaChiTiet(),
                item.getPhieuSuaChua() != null ? item.getPhieuSuaChua().getMaPhieuSuaChua() : null,
                dv != null ? dv.getMaDichVu() : null,
                dv != null ? dv.getTenDichVu() : null,
                maLoaiDichVu,
                tenLoaiDichVu,
                item.getSoLuong(),
                item.getDonGia(),
                thanhTien,
                item.getTrangThai()
        );
    }
}
