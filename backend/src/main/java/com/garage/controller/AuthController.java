package com.garage.controller;

import com.garage.dto.ApiResponse;
import com.garage.dto.CurrentUserResponse;
import com.garage.dto.LoginRequest;
import com.garage.dto.LoginResponse;
import com.garage.dto.RegisterRequest;
import com.garage.dto.RegisterResponse;
import com.garage.dto.WebCurrentUserResponse;
import com.garage.entity.NhanVien;
import com.garage.repository.NhanVienRepository;
import com.garage.security.CustomUserDetails;
import com.garage.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final NhanVienRepository nhanVienRepository;

    public AuthController(AuthService authService, NhanVienRepository nhanVienRepository) {
        this.authService = authService;
        this.nhanVienRepository = nhanVienRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        LoginResponse loginResponse = authService.login(loginRequest);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", loginResponse));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        RegisterResponse registerResponse = authService.registerCustomer(registerRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng ký tài khoản thành công", registerResponse));
    }

    @PostMapping("/web/login")
    public ResponseEntity<ApiResponse<LoginResponse>> loginWeb(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", authService.loginWeb(request)));
    }

    @GetMapping("/web/me")
    public ResponseEntity<ApiResponse<WebCurrentUserResponse>> getCurrentWebUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        var roles = userDetails.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        authService.validateWebAccess(roles);
        return ResponseEntity.ok(ApiResponse.success("Thông tin tài khoản", new WebCurrentUserResponse(
                buildCurrentUser(userDetails), roles)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserResponse>> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Thông tin người dùng hiện tại", buildCurrentUser(userDetails)));
    }

    private CurrentUserResponse buildCurrentUser(CustomUserDetails userDetails) {
        var user = userDetails.getNguoiDung();
        NhanVien employee = nhanVienRepository.findByNguoiDungMaNguoiDung(user.getMaNguoiDung())
                .orElse(null);
        return new CurrentUserResponse(
                user.getMaNguoiDung(),
                user.getTenDangNhap(),
                user.getHoTen(),
                user.getEmail(),
                false,
                employee != null && employee.getChiNhanh() != null
                        ? employee.getChiNhanh().getMaChiNhanh()
                        : null,
                employee != null && employee.getChiNhanh() != null
                        ? employee.getChiNhanh().getTenChiNhanh()
                        : null
        );

    }
}
