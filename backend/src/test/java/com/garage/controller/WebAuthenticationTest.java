package com.garage.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.garage.dto.LoginRequest;
import com.garage.entity.NguoiDung;
import com.garage.entity.NguoiDungVaiTro;
import com.garage.entity.VaiTro;
import com.garage.repository.*;
import com.garage.security.*;
import com.garage.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, AuthService.class, CustomUserDetailsService.class,
        JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class WebAuthenticationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockBean NguoiDungRepository users;
    @MockBean NguoiDungVaiTroRepository userRoles;
    @MockBean VaiTroRepository roles;
    @MockBean KhachHangRepository customers;
    @MockBean NhanVienRepository employees;
    @MockBean PasswordEncoder passwords;
    @MockBean JwtService jwt;

    private void account(String... names) {
        NguoiDung user = new NguoiDung();
        user.setMaNguoiDung(51);
        user.setTenDangNhap("test-account");
        user.setMatKhauHash("test-hash");
        user.setTrangThai(true);
        when(users.findByTenDangNhapOrEmail("test-account", "test-account")).thenReturn(Optional.of(user));
        when(userRoles.findByNguoiDungMaNguoiDung(51)).thenReturn(Arrays.stream(names).map(name -> {
            VaiTro role = new VaiTro();
            role.setTenVaiTro(name);
            return new NguoiDungVaiTro(user, role);
        }).toList());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ROLE_ADMIN", "ROLE_MANAGER", "ROLE_FRONT_DESK"})
    void staffCanLoginWithoutExistingBearer(String role) throws Exception {
        account(role);
        when(passwords.matches("test-password", "test-hash")).thenReturn(true);
        when(jwt.generateToken("test-account", List.of(role))).thenReturn("staff-session");
        mvc.perform(post("/api/auth/web/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new LoginRequest("test-account", "test-password"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").value("staff-session"))
                .andExpect(jsonPath("$.data.matKhauHash").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ROLE_CUSTOMER", "ROLE_TECHNICIAN"})
    void webLoginRejectsMobileRolesButMobileLoginStillWorks(String role) throws Exception {
        account(role);
        when(passwords.matches("test-password", "test-hash")).thenReturn(true);
        String body = json.writeValueAsString(new LoginRequest("test-account", "test-password"));
        mvc.perform(post("/api/auth/web/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("ứng dụng di động")))
                .andExpect(jsonPath("$.data.accessToken").doesNotExist());
        verify(jwt, never()).generateToken(anyString(), anyList());
        when(jwt.generateToken("test-account", List.of(role))).thenReturn("mobile-session");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").value("mobile-session"));
    }

    @Test
    void webProfileRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/auth/web/me")).andExpect(status().isUnauthorized());
    }

    private void storedSession() {
        when(jwt.validateToken("stored-session")).thenReturn(true);
        when(jwt.extractUsername("stored-session")).thenReturn("test-account");
    }

    @Test
    void webProfileUsesCurrentDatabaseRolesInsteadOfOldTokenRoles() throws Exception {
        account("ROLE_MANAGER");
        storedSession();
        mvc.perform(get("/api/auth/web/me").header("Authorization", "Bearer stored-session"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.roles[0]").value("ROLE_MANAGER"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ROLE_CUSTOMER", "ROLE_TECHNICIAN"})
    void storedOrMixedMobileSessionCannotRestoreWebButCanUseMobileProfile(String role) throws Exception {
        account("ROLE_ADMIN", role);
        storedSession();
        mvc.perform(get("/api/auth/web/me").header("Authorization", "Bearer stored-session"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.data.roles").doesNotExist());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer stored-session"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.maNguoiDung").value(51));
    }

    @Test
    void webLoginValidatesInputBeforeAuthenticating() throws Exception {
        mvc.perform(post("/api/auth/web/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tenDangNhap\":\"\",\"matKhau\":\"\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(users, jwt);
    }
}
