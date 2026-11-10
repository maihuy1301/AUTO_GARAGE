package com.garage.service;

import com.garage.dto.*;
import com.garage.entity.DichVu;
import com.garage.entity.DichVuPhuTung;
import com.garage.entity.LoaiDichVu;
import com.garage.entity.PhuTung;
import com.garage.exception.BadRequestException;
import com.garage.exception.DuplicateResourceException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.DatLichDichVuRepository;
import com.garage.repository.DichVuPhuTungRepository;
import com.garage.repository.DichVuRepository;
import com.garage.repository.LoaiDichVuRepository;
import com.garage.repository.PhieuSuaChuaDichVuRepository;
import com.garage.repository.PhuTungRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceCatalogService {

    private final DichVuRepository dichVuRepository;
    private final LoaiDichVuRepository loaiDichVuRepository;
    private final DichVuPhuTungRepository dichVuPhuTungRepository;
    private final PhuTungRepository phuTungRepository;
    private final PhieuSuaChuaDichVuRepository phieuSuaChuaDichVuRepository;
    private final DatLichDichVuRepository datLichDichVuRepository;

    public ServiceCatalogService(DichVuRepository dichVuRepository,
                                 LoaiDichVuRepository loaiDichVuRepository,
                                 DichVuPhuTungRepository dichVuPhuTungRepository,
                                 PhuTungRepository phuTungRepository,
                                 PhieuSuaChuaDichVuRepository phieuSuaChuaDichVuRepository,
                                 DatLichDichVuRepository datLichDichVuRepository) {
        this.dichVuRepository = dichVuRepository;
        this.loaiDichVuRepository = loaiDichVuRepository;
        this.dichVuPhuTungRepository = dichVuPhuTungRepository;
        this.phuTungRepository = phuTungRepository;
        this.phieuSuaChuaDichVuRepository = phieuSuaChuaDichVuRepository;
        this.datLichDichVuRepository = datLichDichVuRepository;
    }

    // ==========================================
    // SERVICE CATEGORY METHODS (Admin CRUD)
    // ==========================================

    @Transactional(readOnly = true)
    public List<ServiceCategoryResponse> getAllCategories(boolean onlyActive) {
        List<LoaiDichVu> categories = onlyActive
                ? loaiDichVuRepository.findByTrangThaiTrue()
                : loaiDichVuRepository.findAll();

        List<DichVu> allServices = dichVuRepository.findAll();

        return categories.stream().map(cat -> {
            long count = allServices.stream()
                    .filter(s -> s.getLoaiDichVu() != null && s.getLoaiDichVu().getMaLoaiDichVu().equals(cat.getMaLoaiDichVu()))
                    .count();
            return new ServiceCategoryResponse(
                    cat.getMaLoaiDichVu(),
                    cat.getTenLoai(),
                    cat.getMoTa(),
                    cat.getTrangThai(),
                    count
            );
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ServiceCategoryResponse getCategoryById(Integer id) {
        LoaiDichVu cat = loaiDichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại dịch vụ với ID: " + id));

        long count = dichVuRepository.findAll().stream()
                .filter(s -> s.getLoaiDichVu() != null && s.getLoaiDichVu().getMaLoaiDichVu().equals(cat.getMaLoaiDichVu()))
                .count();

        return new ServiceCategoryResponse(
                cat.getMaLoaiDichVu(),
                cat.getTenLoai(),
                cat.getMoTa(),
                cat.getTrangThai(),
                count
        );
    }

    @Transactional
    public ServiceCategoryResponse createCategory(ServiceCategoryRequest request) {
        if (loaiDichVuRepository.existsByTenLoaiIgnoreCase(request.getTenLoai().trim())) {
            throw new DuplicateResourceException("Tên loại dịch vụ '" + request.getTenLoai().trim() + "' đã tồn tại");
        }

        LoaiDichVu cat = new LoaiDichVu();
        cat.setTenLoai(request.getTenLoai().trim());
        cat.setMoTa(request.getMoTa());
        cat.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : true);

        LoaiDichVu saved = loaiDichVuRepository.save(cat);
        return new ServiceCategoryResponse(saved.getMaLoaiDichVu(), saved.getTenLoai(), saved.getMoTa(), saved.getTrangThai(), 0L);
    }

    @Transactional
    public ServiceCategoryResponse updateCategory(Integer id, ServiceCategoryRequest request) {
        LoaiDichVu cat = loaiDichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại dịch vụ với ID: " + id));

        if (loaiDichVuRepository.existsByTenLoaiIgnoreCaseAndMaLoaiDichVuNot(request.getTenLoai().trim(), id)) {
            throw new DuplicateResourceException("Tên loại dịch vụ '" + request.getTenLoai().trim() + "' đã tồn tại");
        }

        cat.setTenLoai(request.getTenLoai().trim());
        cat.setMoTa(request.getMoTa());
        if (request.getTrangThai() != null) {
            cat.setTrangThai(request.getTrangThai());
        }

        LoaiDichVu saved = loaiDichVuRepository.save(cat);
        return getCategoryById(saved.getMaLoaiDichVu());
    }

    @Transactional
    public ServiceCategoryResponse updateCategoryStatus(Integer id, Boolean trangThai) {
        LoaiDichVu cat = loaiDichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại dịch vụ với ID: " + id));

        cat.setTrangThai(trangThai);
        LoaiDichVu saved = loaiDichVuRepository.save(cat);

        // Tự động chuyển toàn bộ dịch vụ thuộc loại này sang trạng thái tương ứng (Bật hoặc Tạm ngưng)
        List<DichVu> relatedServices = dichVuRepository.findAll().stream()
                .filter(s -> s.getLoaiDichVu() != null && s.getLoaiDichVu().getMaLoaiDichVu().equals(id))
                .toList();

        for (DichVu service : relatedServices) {
            service.setTrangThai(trangThai);
            dichVuRepository.save(service);
        }

        return getCategoryById(saved.getMaLoaiDichVu());
    }

    @Transactional
    public void deleteCategory(Integer id) {
        LoaiDichVu cat = loaiDichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại dịch vụ với ID: " + id));

        boolean hasServices = dichVuRepository.findAll().stream()
                .anyMatch(s -> s.getLoaiDichVu() != null && s.getLoaiDichVu().getMaLoaiDichVu().equals(id));

        if (hasServices) {
            throw new BadRequestException("Không thể xóa loại dịch vụ này vì đang có các dịch vụ trực thuộc. Vui lòng chuyển hoặc xóa dịch vụ trước.");
        }

        loaiDichVuRepository.delete(cat);
    }

    // ==========================================
    // SERVICE METHODS (Admin CRUD, Manager Status Toggle)
    // ==========================================

    @Transactional(readOnly = true)
    public List<ServiceResponse> getAllServices(boolean onlyActive, Integer categoryId) {
        List<DichVu> services = onlyActive
                ? dichVuRepository.findByTrangThaiTrue()
                : dichVuRepository.findAll();

        if (categoryId != null) {
            services = services.stream()
                    .filter(s -> s.getLoaiDichVu() != null && s.getLoaiDichVu().getMaLoaiDichVu().equals(categoryId))
                    .collect(Collectors.toList());
        }

        return services.stream()
                .map(this::mapToServiceResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ServiceResponse getServiceById(Integer id) {
        DichVu dichVu = dichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));
        return mapToServiceResponse(dichVu);
    }

    @Transactional
    public ServiceResponse createService(CreateServiceRequest request) {
        LoaiDichVu category = loaiDichVuRepository.findById(request.getMaLoaiDichVu())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại dịch vụ với ID: " + request.getMaLoaiDichVu()));

        if (request.getThoiGianDuKien() != null && request.getThoiGianDuKien() <= 0) {
            throw new BadRequestException("Thời gian dự kiến không hợp lệ");
        }

        DichVu dichVu = new DichVu();
        dichVu.setTenDichVu(request.getTenDichVu().trim());
        dichVu.setLoaiDichVu(category);
        dichVu.setMoTa(request.getMoTa());
        dichVu.setDonGia(request.getDonGia());
        dichVu.setThoiGianDuKien(request.getThoiGianDuKien());
        dichVu.setTrangThai(true);

        DichVu saved = dichVuRepository.save(dichVu);

        // Save default parts
        saveServiceParts(saved, request.getDefaultParts());

        return mapToServiceResponse(saved);
    }

    @Transactional
    public ServiceResponse updateService(Integer id, UpdateServiceRequest request) {
        DichVu dichVu = dichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));

        LoaiDichVu category = loaiDichVuRepository.findById(request.getMaLoaiDichVu())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại dịch vụ với ID: " + request.getMaLoaiDichVu()));

        if (request.getThoiGianDuKien() != null && request.getThoiGianDuKien() <= 0) {
            throw new BadRequestException("Thời gian dự kiến không hợp lệ");
        }

        dichVu.setTenDichVu(request.getTenDichVu().trim());
        dichVu.setLoaiDichVu(category);
        dichVu.setMoTa(request.getMoTa());
        dichVu.setDonGia(request.getDonGia());
        dichVu.setThoiGianDuKien(request.getThoiGianDuKien());

        DichVu saved = dichVuRepository.save(dichVu);

        // Re-save default parts
        dichVuPhuTungRepository.deleteByDichVuMaDichVu(saved.getMaDichVu());
        dichVuPhuTungRepository.flush();
        saveServiceParts(saved, request.getDefaultParts());

        return mapToServiceResponse(saved);
    }

    @Transactional
    public ServiceResponse updateServiceStatus(Integer id, UpdateServiceStatusRequest request) {
        DichVu dichVu = dichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));

        dichVu.setTrangThai(request.getTrangThai());
        DichVu saved = dichVuRepository.save(dichVu);

        return mapToServiceResponse(saved);
    }

    @Transactional
    public void deleteService(Integer id) {
        DichVu dichVu = dichVuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));

        boolean isUsedInRepair = phieuSuaChuaDichVuRepository.findAll().stream()
                .anyMatch(pscdv -> pscdv.getDichVu() != null && pscdv.getDichVu().getMaDichVu().equals(id));

        boolean isUsedInAppointment = datLichDichVuRepository.findAll().stream()
                .anyMatch(dldv -> dldv.getDichVu() != null && dldv.getDichVu().getMaDichVu().equals(id));

        if (isUsedInRepair || isUsedInAppointment) {
            throw new BadRequestException("Dịch vụ này đã có dữ liệu trong lịch hẹn hoặc phiếu sửa chữa, không thể xóa vật lý. Vui lòng chuyển trạng thái sang Tạm ngưng hoạt động.");
        }

        dichVuPhuTungRepository.deleteByDichVuMaDichVu(id);
        dichVuRepository.delete(dichVu);
    }

    private void saveServiceParts(DichVu service, List<ServicePartItemRequest> parts) {
        if (parts == null || parts.isEmpty()) return;

        for (ServicePartItemRequest item : parts) {
            PhuTung part = phuTungRepository.findById(item.getMaPhuTung())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phụ tùng định mức với ID: " + item.getMaPhuTung()));

            DichVuPhuTung dp = new DichVuPhuTung(service, part, item.getSoLuong() != null ? item.getSoLuong() : 1);
            dichVuPhuTungRepository.save(dp);
        }
    }

    public ServiceResponse mapToServiceResponse(DichVu dv) {
        Integer maLoai = dv.getLoaiDichVu() != null ? dv.getLoaiDichVu().getMaLoaiDichVu() : null;
        String tenLoai = dv.getLoaiDichVu() != null ? dv.getLoaiDichVu().getTenLoai() : null;

        List<DichVuPhuTung> dichVuPhuTungs = dichVuPhuTungRepository.findByDichVuMaDichVu(dv.getMaDichVu());
        List<ServicePartResponse> parts = new ArrayList<>();
        BigDecimal totalPartPrice = BigDecimal.ZERO;

        if (dichVuPhuTungs != null) {
            for (DichVuPhuTung dp : dichVuPhuTungs) {
                PhuTung pt = dp.getPhuTung();
                if (pt != null) {
                    int qty = dp.getSoLuong() != null ? dp.getSoLuong() : 1;
                    BigDecimal partPrice = pt.getGiaBan() != null ? pt.getGiaBan() : BigDecimal.ZERO;
                    BigDecimal lineTotal = partPrice.multiply(BigDecimal.valueOf(qty));
                    totalPartPrice = totalPartPrice.add(lineTotal);

                    parts.add(new ServicePartResponse(
                            pt.getMaPhuTung(),
                            pt.getTenPhuTung(),
                            qty,
                            partPrice,
                            lineTotal,
                            pt.getDonViTinh()
                    ));
                }
            }
        }

        BigDecimal servicePrice = dv.getDonGia() != null ? dv.getDonGia() : BigDecimal.ZERO;
        BigDecimal estimatedTotal = servicePrice.add(totalPartPrice);

        return new ServiceResponse(
                dv.getMaDichVu(),
                maLoai,
                tenLoai,
                dv.getTenDichVu(),
                dv.getMoTa(),
                dv.getDonGia(),
                dv.getThoiGianDuKien(),
                dv.getTrangThai(),
                parts,
                totalPartPrice,
                estimatedTotal
        );
    }
}
