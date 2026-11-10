package com.garage.service;

import com.garage.dto.*;
import com.garage.entity.*;
import com.garage.exception.BadRequestException;
import com.garage.exception.DuplicateResourceException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.*;
import com.garage.security.BranchAuthorizationService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InvoiceService {

    private final HoaDonRepository hoaDonRepository;
    private final HoaDonDichVuRepository hoaDonDichVuRepository;
    private final HoaDonPhuTungRepository hoaDonPhuTungRepository;
    private final ThanhToanRepository thanhToanRepository;
    private final PhieuSuaChuaRepository phieuSuaChuaRepository;
    private final PhieuSuaChuaDichVuRepository phieuSuaChuaDichVuRepository;
    private final PhieuSuaChuaPhuTungRepository phieuSuaChuaPhuTungRepository;
    private final TonKhoRepository tonKhoRepository;
    private final GiaoDichKhoRepository giaoDichKhoRepository;
    private final NhanVienRepository nhanVienRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final KhachHangRepository khachHangRepository;
    private final BranchAuthorizationService branchAuthorizationService;

    public InvoiceService(HoaDonRepository hoaDonRepository,
                          HoaDonDichVuRepository hoaDonDichVuRepository,
                          HoaDonPhuTungRepository hoaDonPhuTungRepository,
                          ThanhToanRepository thanhToanRepository,
                          PhieuSuaChuaRepository phieuSuaChuaRepository,
                          PhieuSuaChuaDichVuRepository phieuSuaChuaDichVuRepository,
                          PhieuSuaChuaPhuTungRepository phieuSuaChuaPhuTungRepository,
                          TonKhoRepository tonKhoRepository,
                          GiaoDichKhoRepository giaoDichKhoRepository,
                          NhanVienRepository nhanVienRepository,
                          NguoiDungRepository nguoiDungRepository,
                          KhachHangRepository khachHangRepository,
                          BranchAuthorizationService branchAuthorizationService) {
        this.hoaDonRepository = hoaDonRepository;
        this.hoaDonDichVuRepository = hoaDonDichVuRepository;
        this.hoaDonPhuTungRepository = hoaDonPhuTungRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.phieuSuaChuaRepository = phieuSuaChuaRepository;
        this.phieuSuaChuaDichVuRepository = phieuSuaChuaDichVuRepository;
        this.phieuSuaChuaPhuTungRepository = phieuSuaChuaPhuTungRepository;
        this.tonKhoRepository = tonKhoRepository;
        this.giaoDichKhoRepository = giaoDichKhoRepository;
        this.nhanVienRepository = nhanVienRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.khachHangRepository = khachHangRepository;
        this.branchAuthorizationService = branchAuthorizationService;
    }

    /**
     * Tạo hóa đơn từ phiếu sửa chữa:
     * - Tìm kiếm root order và tập hợp toàn bộ cây phiếu sửa chữa phát sinh (cha - con nhiều cấp)
     * - Kiểm tra quyền hạn xuất hóa đơn (chỉ FRONT_DESK, MANAGER, ADMIN; chặn CUSTOMER & TECHNICIAN)
     * - Kiểm tra trạng thái hoàn tất: Toàn bộ phiếu trong cây phải ở trạng thái HOAN_TAT
     * - Chống duplicate: Kiểm tra nếu bất kỳ phiếu nào trong cây đã có hóa đơn thì từ chối (409)
     * - Kiểm tra và cập nhật tồn kho (TonKho):
     *     + Audit tránh double deduction: Chỉ trừ kho cho số lượng phụ tùng chưa được xuất trước đó
     *     + Nếu tồn kho không đủ: Reject và rollback toàn bộ, không tạo hóa đơn
     *     + Ghi nhận nhật ký GiaoDichKho (LoaiGiaoDich = XUAT) gắn đúng mã phiếu sửa chữa
     * - Sao chép toàn bộ PhieuSuaChua_DichVu sang HoaDon_DichVu (giữ nguyên đơn giá thời điểm sửa)
     * - Sao chép toàn bộ PhieuSuaChua_PhuTung sang HoaDon_PhuTung (ánh xạ đúng MaDichVuChiTiet từ HoaDon_DichVu)
     * - Tính toán chính xác TongTien, GiamGia, Thue và ThanhTien phía Backend
     */
    @Transactional
    public InvoiceResponse createInvoice(Integer repairOrderId, CreateInvoiceRequest request) {
        PhieuSuaChua targetOrder = phieuSuaChuaRepository.findById(repairOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu sửa chữa ID: " + repairOrderId));

        validateStaffAccessAuthorization(targetOrder.getChiNhanh().getMaChiNhanh());

        // Tìm phiếu sửa chữa gốc (root order) trong chuỗi cha-con
        PhieuSuaChua rootOrder = findRootRepairOrder(targetOrder);

        // Tập hợp toàn bộ danh sách phiếu sửa chữa trong cây phát sinh (không tính các phiếu đã hủy)
        List<PhieuSuaChua> familyOrders = getRepairOrderTree(rootOrder);

        if ("HUY".equalsIgnoreCase(targetOrder.getTrangThai()) || familyOrders.isEmpty()) {
            throw new BadRequestException("Không thể tạo hóa đơn cho phiếu sửa chữa đã bị hủy");
        }

        // Đồng bộ concurrency chống double-click tạo 2 hóa đơn đồng thời
        synchronized (("INVOICE_LOCK_" + rootOrder.getMaPhieuSuaChua()).intern()) {
            // Kiểm tra trạng thái hoàn tất: toàn bộ phiếu sửa chữa trong cây phải ở trạng thái HOAN_TAT
            boolean allCompleted = familyOrders.stream()
                    .allMatch(o -> "HOAN_TAT".equalsIgnoreCase(o.getTrangThai()));
            if (!allCompleted) {
                throw new BadRequestException("Lệnh sửa chữa chưa hoàn tất, không thể xuất hóa đơn");
            }

            // Chống duplicate: Kiểm tra nếu bất kỳ phiếu nào trong cây đã được xuất hóa đơn trước đó
            for (PhieuSuaChua ro : familyOrders) {
                if (hoaDonRepository.existsByPhieuSuaChuaMaPhieuSuaChua(ro.getMaPhieuSuaChua())) {
                    throw new DuplicateResourceException("Lệnh sửa chữa này đã được xuất hóa đơn trước đó");
                }
            }

            // Xác định thông tin khách hàng từ phiếu tiếp nhận của root order
            KhachHang customer = rootOrder.getPhieuTiepNhan() != null && rootOrder.getPhieuTiepNhan().getXe() != null
                    ? rootOrder.getPhieuTiepNhan().getXe().getKhachHang()
                    : null;

            if (customer == null) {
                throw new BadRequestException("Không xác định được thông tin khách hàng từ phiếu sửa chữa");
            }

            // Lấy nhân viên thu ngân từ tài khoản đang đăng nhập
            NhanVien cashier = getCurrentEmployee();

            // Gom toàn bộ dịch vụ và phụ tùng của tất cả các phiếu trong cây
            List<PhieuSuaChuaDichVu> repairServices = new ArrayList<>();
            List<PhieuSuaChuaPhuTung> repairParts = new ArrayList<>();
            for (PhieuSuaChua ro : familyOrders) {
                repairServices.addAll(phieuSuaChuaDichVuRepository.findByPhieuSuaChuaMaPhieuSuaChua(ro.getMaPhieuSuaChua()));
                repairParts.addAll(phieuSuaChuaPhuTungRepository.findByPhieuSuaChuaMaPhieuSuaChua(ro.getMaPhieuSuaChua()));
            }

            if (repairServices.isEmpty() && repairParts.isEmpty()) {
                throw new BadRequestException("Phiếu sửa chữa chưa có dịch vụ hoặc chi phí nào, không thể xuất hóa đơn");
            }

            // Xử lý tồn kho (TonKho) và nhật ký xuất kho (GiaoDichKho)
            // Kiểm tra số lượng phụ tùng thực tế cần trừ thêm để tránh double deduction
            for (PhieuSuaChuaPhuTung partItem : repairParts) {
                PhieuSuaChua orderOfPart = partItem.getPhieuSuaChua();
                PhuTung pt = partItem.getPhuTung();
                if (pt == null || orderOfPart == null) continue;

                List<GiaoDichKho> existingTx = giaoDichKhoRepository.findByPhieuSuaChuaMaPhieuSuaChua(orderOfPart.getMaPhieuSuaChua());
                int alreadyExported = 0;
                if (existingTx != null) {
                    for (GiaoDichKho tx : existingTx) {
                        if (tx.getPhuTung() != null && tx.getPhuTung().getMaPhuTung().equals(pt.getMaPhuTung())) {
                            if ("XUAT".equalsIgnoreCase(tx.getLoaiGiaoDich()) || "XUAT_SUA_CHUA".equalsIgnoreCase(tx.getLoaiGiaoDich())) {
                                alreadyExported += (tx.getSoLuong() != null ? tx.getSoLuong() : 0);
                            } else if ("HOAN_TRA".equalsIgnoreCase(tx.getLoaiGiaoDich())) {
                                alreadyExported -= (tx.getSoLuong() != null ? tx.getSoLuong() : 0);
                            }
                        }
                    }
                }

                int partQty = partItem.getSoLuong() != null ? partItem.getSoLuong() : 1;
                int needed = partQty - alreadyExported;
                if (needed > 0) {
                    Integer branchId = orderOfPart.getChiNhanh().getMaChiNhanh();
                    TonKho tonKho = tonKhoRepository.findByIdMaChiNhanhAndIdMaPhuTung(branchId, pt.getMaPhuTung())
                            .orElse(null);
                    if (tonKho == null || tonKho.getSoLuongTon() < needed) {
                        String ptName = pt.getTenPhuTung() != null ? pt.getTenPhuTung() : ("ID #" + pt.getMaPhuTung());
                        throw new BadRequestException("Phụ tùng '" + ptName + "' không đủ tồn kho tại chi nhánh");
                    }

                    tonKho.setSoLuongTon(tonKho.getSoLuongTon() - needed);
                    tonKhoRepository.save(tonKho);

                    GiaoDichKho gd = new GiaoDichKho();
                    gd.setChiNhanh(orderOfPart.getChiNhanh());
                    gd.setPhuTung(pt);
                    gd.setLoaiGiaoDich("XUAT");
                    gd.setSoLuong(needed);
                    gd.setPhieuSuaChua(orderOfPart);
                    gd.setGhiChu("Xuất phụ tùng khi tạo hóa đơn cho phiếu sửa chữa #" + orderOfPart.getMaPhieuSuaChua());
                    giaoDichKhoRepository.save(gd);
                }
            }

            // Tính toán tổng tiền từ danh sách dịch vụ và phụ tùng
            BigDecimal totalServiceAmount = BigDecimal.ZERO;
            for (PhieuSuaChuaDichVu s : repairServices) {
                int qty = s.getSoLuong() != null ? s.getSoLuong() : 1;
                BigDecimal donGia = s.getDonGia() != null ? s.getDonGia() : BigDecimal.ZERO;
                totalServiceAmount = totalServiceAmount.add(donGia.multiply(BigDecimal.valueOf(qty)));
            }

            BigDecimal totalPartAmount = BigDecimal.ZERO;
            for (PhieuSuaChuaPhuTung p : repairParts) {
                int qty = p.getSoLuong() != null ? p.getSoLuong() : 1;
                BigDecimal donGia = p.getDonGia() != null ? p.getDonGia() : BigDecimal.ZERO;
                totalPartAmount = totalPartAmount.add(donGia.multiply(BigDecimal.valueOf(qty)));
            }

            BigDecimal tongTien = totalServiceAmount.add(totalPartAmount);
            BigDecimal thanhTien = tongTien;

            HoaDon invoice = new HoaDon();
            invoice.setPhieuSuaChua(rootOrder);
            invoice.setKhachHang(customer);
            invoice.setChiNhanh(rootOrder.getChiNhanh());
            invoice.setNhanVienThuNgan(cashier);
            invoice.setTongTien(tongTien);
            invoice.setThanhTien(thanhTien);
            invoice.setTrangThai("CHUA_THANH_TOAN");
            invoice.setNgayLap(LocalDateTime.now());

            HoaDon savedInvoice = hoaDonRepository.save(invoice);

            // Lưu chi tiết dịch vụ và lưu mapping ID để liên kết với phụ tùng
            Map<Integer, HoaDonDichVu> repairServiceToInvoiceServiceMap = new HashMap<>();
            List<InvoiceServiceItemResponse> serviceResponses = new ArrayList<>();
            for (PhieuSuaChuaDichVu s : repairServices) {
                HoaDonDichVu item = new HoaDonDichVu();
                item.setHoaDon(savedInvoice);
                item.setPhieuDichVu(s);
                item.setDonGia(s.getDonGia() != null ? s.getDonGia() : BigDecimal.ZERO);
                HoaDonDichVu savedItem = hoaDonDichVuRepository.save(item);
                repairServiceToInvoiceServiceMap.put(s.getMaChiTiet(), savedItem);

                int qty = s.getSoLuong() != null ? s.getSoLuong() : 1;
                BigDecimal itemPrice = savedItem.getDonGia() != null ? savedItem.getDonGia() : item.getDonGia();
                BigDecimal lineTotal = itemPrice.multiply(BigDecimal.valueOf(qty));
                serviceResponses.add(new InvoiceServiceItemResponse(
                        savedItem.getMaChiTiet(),
                        s.getMaChiTiet(),
                        s.getDichVu() != null ? s.getDichVu().getMaDichVu() : null,
                        s.getDichVu() != null ? s.getDichVu().getTenDichVu() : null,
                        qty,
                        itemPrice,
                        lineTotal
                ));
            }

            // Lưu chi tiết phụ tùng và mapping MaDichVuChiTiet từ HoaDon_DichVu
            List<InvoicePartItemResponse> partResponses = new ArrayList<>();
            for (PhieuSuaChuaPhuTung p : repairParts) {
                HoaDonPhuTung item = new HoaDonPhuTung();
                item.setHoaDon(savedInvoice);
                item.setPhieuPhuTung(p);
                if (p.getDichVuChiTiet() != null && p.getDichVuChiTiet().getMaChiTiet() != null) {
                    item.setHoaDonDichVu(repairServiceToInvoiceServiceMap.get(p.getDichVuChiTiet().getMaChiTiet()));
                }
                item.setSoLuong(p.getSoLuong() != null ? p.getSoLuong() : 1);
                item.setDonGia(p.getDonGia() != null ? p.getDonGia() : BigDecimal.ZERO);
                HoaDonPhuTung savedItem = hoaDonPhuTungRepository.save(item);

                int partQty = savedItem.getSoLuong() != null ? savedItem.getSoLuong() : item.getSoLuong();
                BigDecimal partPrice = savedItem.getDonGia() != null ? savedItem.getDonGia() : item.getDonGia();
                BigDecimal lineTotal = partPrice.multiply(BigDecimal.valueOf(partQty));
                Integer maDichVuChiTiet = (savedItem.getHoaDonDichVu() != null) ? savedItem.getHoaDonDichVu().getMaChiTiet() : null;
                PhuTung pt = p.getPhuTung();

                partResponses.add(new InvoicePartItemResponse(
                        savedItem.getMaChiTiet(),
                        p.getMaChiTiet(),
                        maDichVuChiTiet,
                        pt != null ? pt.getMaPhuTung() : null,
                        pt != null ? pt.getMaPhuTungCode() : null,
                        pt != null ? pt.getTenPhuTung() : null,
                        pt != null ? pt.getDonViTinh() : null,
                        partQty,
                        partPrice,
                        lineTotal
                ));
            }

            return mapInvoiceToResponse(savedInvoice, serviceResponses, partResponses, new ArrayList<>());
        }
    }

    /**
     * Xem hóa đơn của phiếu sửa chữa (hỗ trợ tìm kiếm theo bất kỳ phiếu nào trong cây)
     */
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByRepairOrder(Integer repairOrderId) {
        PhieuSuaChua targetOrder = phieuSuaChuaRepository.findById(repairOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu sửa chữa ID: " + repairOrderId));

        PhieuSuaChua rootOrder = findRootRepairOrder(targetOrder);
        List<PhieuSuaChua> familyOrders = getRepairOrderTree(rootOrder);

        HoaDon invoice = null;
        for (PhieuSuaChua ro : familyOrders) {
            Optional<HoaDon> opt = hoaDonRepository.findByPhieuSuaChuaMaPhieuSuaChua(ro.getMaPhieuSuaChua());
            if (opt.isPresent()) {
                invoice = opt.get();
                break;
            }
        }

        if (invoice == null) {
            throw new ResourceNotFoundException("Chưa có hóa đơn cho phiếu sửa chữa ID: " + repairOrderId);
        }

        validateReadAuthorization(invoice);

        return loadAndMapInvoiceResponse(invoice);
    }

    /**
     * Xem chi tiết hóa đơn theo ID
     */
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Integer invoiceId) {
        HoaDon invoice = hoaDonRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn ID: " + invoiceId));

        validateReadAuthorization(invoice);

        return loadAndMapInvoiceResponse(invoice);
    }

    /**
     * Lấy danh sách hóa đơn (có filter theo quyền)
     */
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoices(Integer branchId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"))) {
            NguoiDung user = nguoiDungRepository.findByTenDangNhapOrEmail(auth.getName(), auth.getName()).orElse(null);
            if (user != null) {
                KhachHang cust = khachHangRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung()).orElse(null);
                if (cust != null) {
                    return hoaDonRepository.findByKhachHangMaKhachHang(cust.getMaKhachHang())
                            .stream()
                            .map(this::loadAndMapInvoiceResponse)
                            .collect(Collectors.toList());
                }
            }
            return List.of();
        }

        if (branchId != null) {
            validateStaffAccessAuthorization(branchId);
            return hoaDonRepository.findByChiNhanhMaChiNhanh(branchId)
                    .stream()
                    .map(this::loadAndMapInvoiceResponse)
                    .collect(Collectors.toList());
        }

        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return hoaDonRepository.findAll()
                    .stream()
                    .map(this::loadAndMapInvoiceResponse)
                    .collect(Collectors.toList());
        }

        NhanVien emp = getCurrentEmployee();
        if (emp != null && emp.getChiNhanh() != null) {
            return hoaDonRepository.findByChiNhanhMaChiNhanh(emp.getChiNhanh().getMaChiNhanh())
                    .stream()
                    .map(this::loadAndMapInvoiceResponse)
                    .collect(Collectors.toList());
        }

        return List.of();
    }

    // --- Helpers ---

    private PhieuSuaChua findRootRepairOrder(PhieuSuaChua order) {
        PhieuSuaChua current = order;
        Set<Integer> visited = new HashSet<>();
        while (current.getPhieuCha() != null && current.getPhieuCha().getMaPhieuSuaChua() != null) {
            if (!visited.add(current.getMaPhieuSuaChua())) {
                break;
            }
            Integer parentId = current.getPhieuCha().getMaPhieuSuaChua();
            current = phieuSuaChuaRepository.findById(parentId).orElse(current.getPhieuCha());
        }
        return current;
    }

    private List<PhieuSuaChua> getRepairOrderTree(PhieuSuaChua root) {
        List<PhieuSuaChua> allBranchOrders = phieuSuaChuaRepository.findByChiNhanhMaChiNhanh(root.getChiNhanh().getMaChiNhanh());
        Map<Integer, List<PhieuSuaChua>> childrenMap = new HashMap<>();
        for (PhieuSuaChua o : allBranchOrders) {
            if (o.getPhieuCha() != null && o.getPhieuCha().getMaPhieuSuaChua() != null) {
                childrenMap.computeIfAbsent(o.getPhieuCha().getMaPhieuSuaChua(), k -> new ArrayList<>()).add(o);
            }
        }

        List<PhieuSuaChua> result = new ArrayList<>();
        Queue<PhieuSuaChua> queue = new LinkedList<>();
        Set<Integer> visited = new HashSet<>();

        queue.add(root);
        visited.add(root.getMaPhieuSuaChua());

        while (!queue.isEmpty()) {
            PhieuSuaChua curr = queue.poll();
            if (!"HUY".equalsIgnoreCase(curr.getTrangThai())) {
                result.add(curr);
            }
            List<PhieuSuaChua> children = childrenMap.get(curr.getMaPhieuSuaChua());
            if (children != null) {
                for (PhieuSuaChua child : children) {
                    if (visited.add(child.getMaPhieuSuaChua())) {
                        queue.add(child);
                    }
                }
            }
        }
        return result;
    }

    private void validateStaffAccessAuthorization(Integer branchId) {
        if (!branchAuthorizationService.isAllowedBranch(branchId)) {
            throw new AccessDeniedException("Forbidden: Bạn không có quyền thao tác trên chi nhánh khác");
        }
    }

    private void validateReadAuthorization(HoaDon invoice) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"))) {
            validateCustomerOwnership(invoice, auth.getName());
            return;
        }
        validateStaffAccessAuthorization(invoice.getChiNhanh().getMaChiNhanh());
    }

    private void validateCustomerOwnership(HoaDon invoice, String username) {
        try {
            NguoiDung user = nguoiDungRepository.findByTenDangNhapOrEmail(username, username)
                    .orElseThrow(() -> new AccessDeniedException("Forbidden: Không tìm thấy tài khoản khách hàng"));

            KhachHang owner = invoice.getKhachHang();
            if (owner != null && owner.getNguoiDung() != null && owner.getNguoiDung().getMaNguoiDung().equals(user.getMaNguoiDung())) {
                return; // Ownership verified
            }
        } catch (Exception ignored) {}

        throw new AccessDeniedException("Forbidden: Bạn không có quyền truy cập hóa đơn của khách hàng khác");
    }

    private NhanVien getCurrentEmployee() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            NguoiDung user = nguoiDungRepository.findByTenDangNhapOrEmail(auth.getName(), auth.getName()).orElse(null);
            if (user != null) {
                return nhanVienRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung()).orElse(null);
            }
        }
        return null;
    }

    public InvoiceResponse loadAndMapInvoiceResponse(HoaDon invoice) {
        List<InvoiceServiceItemResponse> services = hoaDonDichVuRepository.findByHoaDonMaHoaDon(invoice.getMaHoaDon())
                .stream()
                .map(item -> {
                    PhieuSuaChuaDichVu psdv = item.getPhieuDichVu();
                    int qty = (psdv != null && psdv.getSoLuong() != null) ? psdv.getSoLuong() : 1;
                    BigDecimal lineTotal = item.getDonGia().multiply(BigDecimal.valueOf(qty));
                    Integer maPhieuDichVu = psdv != null ? psdv.getMaChiTiet() : null;
                    Integer maDichVu = (psdv != null && psdv.getDichVu() != null) ? psdv.getDichVu().getMaDichVu() : null;
                    String tenDichVu = (psdv != null && psdv.getDichVu() != null) ? psdv.getDichVu().getTenDichVu() : null;

                    return new InvoiceServiceItemResponse(
                            item.getMaChiTiet(),
                            maPhieuDichVu,
                            maDichVu,
                            tenDichVu,
                            qty,
                            item.getDonGia(),
                            lineTotal
                    );
                })
                .collect(Collectors.toList());

        List<InvoicePartItemResponse> parts = hoaDonPhuTungRepository.findByHoaDonMaHoaDon(invoice.getMaHoaDon())
                .stream()
                .map(item -> {
                    int qty = item.getSoLuong() != null ? item.getSoLuong() : 1;
                    BigDecimal lineTotal = item.getDonGia().multiply(BigDecimal.valueOf(qty));
                    PhieuSuaChuaPhuTung pspt = item.getPhieuPhuTung();
                    Integer maPhieuPhuTung = pspt != null ? pspt.getMaChiTiet() : null;
                    Integer maDichVuChiTiet = item.getHoaDonDichVu() != null ? item.getHoaDonDichVu().getMaChiTiet() : null;

                    PhuTung pt = (pspt != null) ? pspt.getPhuTung() : null;
                    Integer maPhuTung = pt != null ? pt.getMaPhuTung() : null;
                    String maPhuTungCode = pt != null ? pt.getMaPhuTungCode() : null;
                    String tenPhuTung = pt != null ? pt.getTenPhuTung() : null;
                    String donViTinh = pt != null ? pt.getDonViTinh() : null;

                    return new InvoicePartItemResponse(
                            item.getMaChiTiet(),
                            maPhieuPhuTung,
                            maDichVuChiTiet,
                            maPhuTung,
                            maPhuTungCode,
                            tenPhuTung,
                            donViTinh,
                            qty,
                            item.getDonGia(),
                            lineTotal
                    );
                })
                .collect(Collectors.toList());

        List<PaymentResponse> payments = thanhToanRepository.findByHoaDonMaHoaDon(invoice.getMaHoaDon())
                .stream()
                .map(p -> new PaymentResponse(
                        p.getMaThanhToan(),
                        p.getHoaDon().getMaHoaDon(),
                        p.getSoTien(),
                        p.getPhuongThuc(),
                        p.getMaGiaoDich(),
                        p.getThoiGianThanhToan(),
                        p.getTrangThai()
                ))
                .collect(Collectors.toList());

        return mapInvoiceToResponse(invoice, services, parts, payments);
    }

    private InvoiceResponse mapInvoiceToResponse(HoaDon invoice,
                                                 List<InvoiceServiceItemResponse> services,
                                                 List<InvoicePartItemResponse> parts,
                                                 List<PaymentResponse> payments) {
        BigDecimal daThanhToan = payments.stream()
                .filter(p -> "THANH_CONG".equalsIgnoreCase(p.getTrangThai()))
                .map(PaymentResponse::getSoTien)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal conLai = invoice.getThanhTien().subtract(daThanhToan);
        if (conLai.compareTo(BigDecimal.ZERO) < 0) {
            conLai = BigDecimal.ZERO;
        }

        KhachHang kh = invoice.getKhachHang();
        String tenKh = (kh != null && kh.getNguoiDung() != null) ? kh.getNguoiDung().getHoTen() : null;
        String sdtKh = (kh != null && kh.getNguoiDung() != null) ? kh.getNguoiDung().getSoDienThoai() : null;

        ChiNhanh cn = invoice.getChiNhanh();
        String tenCn = cn != null ? cn.getTenChiNhanh() : null;
        NhanVien cashier = invoice.getNhanVienThuNgan();
        String tenCashier = (cashier != null && cashier.getNguoiDung() != null) ? cashier.getNguoiDung().getHoTen() : null;

        String bienSoXe = null;
        String tenHangXe = null;
        String tenModel = null;

        if (invoice.getPhieuSuaChua() != null && invoice.getPhieuSuaChua().getPhieuTiepNhan() != null) {
            Xe xe = invoice.getPhieuSuaChua().getPhieuTiepNhan().getXe();
            if (xe != null) {
                bienSoXe = xe.getBienSo();
                if (xe.getModelXe() != null) {
                    tenModel = xe.getModelXe().getTenModel();
                    if (xe.getModelXe().getHangXe() != null) {
                        tenHangXe = xe.getModelXe().getHangXe().getTenHangXe();
                    }
                }
            }
        }

        InvoiceResponse response = new InvoiceResponse(
                invoice.getMaHoaDon(),
                invoice.getPhieuSuaChua() != null ? invoice.getPhieuSuaChua().getMaPhieuSuaChua() : null,
                kh != null ? kh.getMaKhachHang() : null,
                tenKh,
                cn != null ? cn.getMaChiNhanh() : null,
                tenCn,
                cashier != null ? cashier.getMaNhanVien() : null,
                tenCashier,
                invoice.getTongTien(),
                invoice.getThanhTien(),
                daThanhToan,
                conLai,
                invoice.getTrangThai(),
                invoice.getNgayLap(),
                services,
                parts,
                payments
        );

        response.setSoDienThoaiKhachHang(sdtKh);
        response.setBienSoXe(bienSoXe);
        response.setTenHangXe(tenHangXe);
        response.setTenModel(tenModel);

        return response;
    }
}
