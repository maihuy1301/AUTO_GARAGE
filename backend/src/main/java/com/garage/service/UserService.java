package com.garage.service;

import com.garage.dto.*;
import com.garage.entity.NguoiDung;
import com.garage.entity.NguoiDungVaiTro;
import com.garage.entity.VaiTro;
import com.garage.exception.BadRequestException;
import com.garage.exception.DuplicateResourceException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.repository.NguoiDungRepository;
import com.garage.repository.NguoiDungVaiTroRepository;
import com.garage.repository.VaiTroRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final NguoiDungRepository nguoiDungRepository;
    private final NguoiDungVaiTroRepository nguoiDungVaiTroRepository;
    private final VaiTroRepository vaiTroRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(NguoiDungRepository nguoiDungRepository,
                       NguoiDungVaiTroRepository nguoiDungVaiTroRepository,
                       VaiTroRepository vaiTroRepository,
                       PasswordEncoder passwordEncoder) {
        this.nguoiDungRepository = nguoiDungRepository;
        this.nguoiDungVaiTroRepository = nguoiDungVaiTroRepository;
        this.vaiTroRepository = vaiTroRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        List<NguoiDung> users = nguoiDungRepository.findAll();
        return users.stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Integer id) {
        NguoiDung user = nguoiDungRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
        return mapToUserResponse(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (nguoiDungRepository.existsByTenDangNhap(request.getTenDangNhap())) {
            throw new DuplicateResourceException("Tên đăng nhập '" + request.getTenDangNhap() + "' đã tồn tại");
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (nguoiDungRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email '" + request.getEmail() + "' đã được sử dụng");
            }
        }

        // Validate roles
        validateRoleAssignmentPermission(request.getRoles());
        List<VaiTro> rolesToAssign = new ArrayList<>();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            for (String roleName : request.getRoles()) {
                VaiTro vaiTro = vaiTroRepository.findByTenVaiTro(roleName)
                        .orElseThrow(() -> new BadRequestException("Vai trò không tồn tại trong hệ thống: " + roleName));
                rolesToAssign.add(vaiTro);
            }
        }

        NguoiDung newUser = new NguoiDung();
        newUser.setTenDangNhap(request.getTenDangNhap());
        newUser.setMatKhauHash(passwordEncoder.encode(request.getMatKhau()));
        newUser.setHoTen(request.getHoTen());
        newUser.setEmail(request.getEmail());
        newUser.setSoDienThoai(request.getSoDienThoai());
        newUser.setAnhDaiDien(request.getAnhDaiDien());
        newUser.setTrangThai(true);

        NguoiDung savedUser = nguoiDungRepository.save(newUser);

        for (VaiTro vaiTro : rolesToAssign) {
            NguoiDungVaiTro link = new NguoiDungVaiTro(savedUser, vaiTro);
            nguoiDungVaiTroRepository.save(link);
        }

        return mapToUserResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUser(Integer id, UpdateUserRequest request) {
        NguoiDung user = nguoiDungRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            Optional<NguoiDung> existingEmailUser = nguoiDungRepository.findByEmail(request.getEmail());
            if (existingEmailUser.isPresent() && !existingEmailUser.get().getMaNguoiDung().equals(id)) {
                throw new DuplicateResourceException("Email '" + request.getEmail() + "' đã được sử dụng bởi tài khoản khác");
            }
        }

        user.setHoTen(request.getHoTen());
        user.setEmail(request.getEmail());
        user.setSoDienThoai(request.getSoDienThoai());
        user.setAnhDaiDien(request.getAnhDaiDien());

        if (request.getRoles() != null) {
            validateRoleAssignmentPermission(request.getRoles());
            List<VaiTro> newRoles = new ArrayList<>();
            for (String roleName : request.getRoles()) {
                VaiTro vaiTro = vaiTroRepository.findByTenVaiTro(roleName)
                        .orElseThrow(() -> new BadRequestException("Vai trò không tồn tại trong hệ thống: " + roleName));
                newRoles.add(vaiTro);
            }

            // Safety check: Cannot remove ROLE_ADMIN if this is the only active ROLE_ADMIN
            List<NguoiDungVaiTro> currentLinks = nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(id);
            boolean currentlyAdmin = currentLinks.stream().anyMatch(l -> "ROLE_ADMIN".equals(l.getVaiTro().getTenVaiTro()));
            boolean willBeAdmin = newRoles.stream().anyMatch(r -> "ROLE_ADMIN".equals(r.getTenVaiTro()));

            if (currentlyAdmin && !willBeAdmin) {
                long activeAdminCount = nguoiDungVaiTroRepository.countActiveUsersByRoleName("ROLE_ADMIN");
                if (activeAdminCount <= 1) {
                    throw new BadRequestException("Không thể gỡ bỏ vai trò ROLE_ADMIN của quản trị viên duy nhất trong hệ thống");
                }
            }

            nguoiDungVaiTroRepository.deleteByNguoiDungMaNguoiDung(id);
            for (VaiTro vaiTro : newRoles) {
                NguoiDungVaiTro link = new NguoiDungVaiTro(user, vaiTro);
                nguoiDungVaiTroRepository.save(link);
            }
        }

        NguoiDung updatedUser = nguoiDungRepository.save(user);
        return mapToUserResponse(updatedUser);
    }

    @Transactional
    public UserResponse updateUserStatus(Integer id, UpdateUserStatusRequest request) {
        NguoiDung user = nguoiDungRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        // Safety check: Cannot disable last ROLE_ADMIN
        if (Boolean.FALSE.equals(request.getTrangThai())) {
            List<NguoiDungVaiTro> currentLinks = nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(id);
            boolean isSystemAdmin = currentLinks.stream().anyMatch(l -> "ROLE_ADMIN".equals(l.getVaiTro().getTenVaiTro()));
            if (isSystemAdmin) {
                long activeAdminCount = nguoiDungVaiTroRepository.countActiveUsersByRoleName("ROLE_ADMIN");
                if (activeAdminCount <= 1) {
                    throw new BadRequestException("Không thể vô hiệu hóa tài khoản ROLE_ADMIN duy nhất đang hoạt động");
                }
            }
        }

        user.setTrangThai(request.getTrangThai());
        NguoiDung savedUser = nguoiDungRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    private void validateRoleAssignmentPermission(List<String> roleNames) {
        if (roleNames == null || roleNames.isEmpty()) {
            return;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return;
        }
        boolean isAdmin = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        if (!isAdmin) {
            boolean hasRestrictedRole = roleNames.stream()
                    .anyMatch(r -> "ROLE_ADMIN".equals(r) || "ROLE_MANAGER".equals(r));
            if (hasRestrictedRole) {
                throw new AccessDeniedException("Forbidden: Bạn không có quyền tạo hoặc gán vai trò Quản trị viên / Quản lý");
            }
        }
    }

    private UserResponse mapToUserResponse(NguoiDung user) {
        List<NguoiDungVaiTro> links = nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung());
        List<String> roles = links.stream()
                .map(link -> link.getVaiTro().getTenVaiTro())
                .collect(Collectors.toList());

        return new UserResponse(
                user.getMaNguoiDung(),
                user.getTenDangNhap(),
                user.getHoTen(),
                user.getEmail(),
                user.getSoDienThoai(),
                user.getAnhDaiDien(),
                user.getTrangThai(),
                user.getNgayTao(),
                roles
        );
    }
}
