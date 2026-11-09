package com.garage.service;

import com.garage.dto.LoginRequest;
import com.garage.dto.LoginResponse;
import com.garage.dto.RegisterRequest;
import com.garage.dto.RegisterResponse;
import com.garage.entity.KhachHang;
import com.garage.entity.NguoiDung;
import com.garage.entity.NguoiDungVaiTro;
import com.garage.entity.VaiTro;
import com.garage.exception.DuplicateResourceException;
import com.garage.exception.ResourceNotFoundException;
import com.garage.exception.WebAccessDeniedException;
import com.garage.repository.KhachHangRepository;
import com.garage.repository.NguoiDungRepository;
import com.garage.repository.NguoiDungVaiTroRepository;
import com.garage.repository.VaiTroRepository;
import com.garage.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Collection;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final NguoiDungRepository nguoiDungRepository;
    private final NguoiDungVaiTroRepository nguoiDungVaiTroRepository;
    private final VaiTroRepository vaiTroRepository;
    private final KhachHangRepository khachHangRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(NguoiDungRepository nguoiDungRepository,
                       NguoiDungVaiTroRepository nguoiDungVaiTroRepository,
                       VaiTroRepository vaiTroRepository,
                       KhachHangRepository khachHangRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.nguoiDungRepository = nguoiDungRepository;
        this.nguoiDungVaiTroRepository = nguoiDungVaiTroRepository;
        this.vaiTroRepository = vaiTroRepository;
        this.khachHangRepository = khachHangRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        return authenticate(request, false);
    }

    public LoginResponse loginWeb(LoginRequest request) {
        return authenticate(request, true);
    }

    public void validateWebAccess(Collection<String> roles) {
        List<String> normalized = roles.stream()
                .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                .toList();
        boolean mobileRole = normalized.contains("ROLE_CUSTOMER") || normalized.contains("ROLE_TECHNICIAN");
        boolean webRole = normalized.contains("ROLE_ADMIN") || normalized.contains("ROLE_MANAGER")
                || normalized.contains("ROLE_FRONT_DESK");
        if (mobileRole || !webRole) {
            throw new WebAccessDeniedException();
        }
    }

    private LoginResponse authenticate(LoginRequest request, boolean webLogin) {
        String identifier = request.getTenDangNhap().trim();
        NguoiDung nguoiDung = nguoiDungRepository.findByTenDangNhapOrEmail(identifier, identifier)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getMatKhau(), nguoiDung.getMatKhauHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        if (!Boolean.TRUE.equals(nguoiDung.getTrangThai())) {
            throw new DisabledException("Tài khoản đã bị khóa hoặc ngưng hoạt động");
        }

        List<NguoiDungVaiTro> userRoles = nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(nguoiDung.getMaNguoiDung());
        List<String> roleNames = userRoles.stream()
                .map(vr -> vr.getVaiTro().getTenVaiTro())
                .collect(Collectors.toList());

        if (webLogin) {
            validateWebAccess(roleNames);
        }

        String token = jwtService.generateToken(nguoiDung.getTenDangNhap(), roleNames);
        return new LoginResponse(
                token,
                nguoiDung.getMaNguoiDung(),
                nguoiDung.getTenDangNhap(),
                nguoiDung.getHoTen(),
                false
        );
    }

    @Transactional
    public RegisterResponse registerCustomer(RegisterRequest request) {
        String phone = request.getSoDienThoai().trim();
        String email = normalizeEmail(request.getEmail());

        if (nguoiDungRepository.existsByTenDangNhap(phone)) {
            throw new DuplicateResourceException("Số điện thoại đã được sử dụng để đăng ký tài khoản");
        }
        if (email != null && nguoiDungRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email đã được sử dụng để đăng ký tài khoản");
        }

        VaiTro customerRole = vaiTroRepository.findByTenVaiTro("ROLE_CUSTOMER")
                .orElseThrow(() -> new ResourceNotFoundException("Vai trò khách hàng chưa được cấu hình trong hệ thống"));

        NguoiDung user = new NguoiDung();
        user.setTenDangNhap(phone);
        user.setMatKhauHash(passwordEncoder.encode(request.getMatKhau()));
        user.setHoTen(request.getHoTen().trim());
        user.setEmail(email);
        user.setSoDienThoai(phone);
        user.setTrangThai(true);
        NguoiDung savedUser = nguoiDungRepository.save(user);

        nguoiDungVaiTroRepository.save(new NguoiDungVaiTro(savedUser, customerRole));

        KhachHang customer = new KhachHang();
        customer.setNguoiDung(savedUser);
        KhachHang savedCustomer = khachHangRepository.save(customer);

        return new RegisterResponse(
                savedUser.getMaNguoiDung(),
                savedCustomer.getMaKhachHang(),
                savedUser.getTenDangNhap(),
                savedUser.getHoTen(),
                savedUser.getEmail(),
                savedUser.getSoDienThoai()
        );
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
