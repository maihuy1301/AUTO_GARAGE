package com.garage.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.garage.dto.BrandResponse;
import com.garage.dto.CreateBrandRequest;
import com.garage.dto.CreateModelRequest;
import com.garage.dto.ModelResponse;
import com.garage.entity.NguoiDung;
import com.garage.entity.NguoiDungVaiTro;
import com.garage.entity.VaiTro;
import com.garage.repository.NguoiDungRepository;
import com.garage.repository.NguoiDungVaiTroRepository;
import com.garage.security.JwtService;
import com.garage.service.VehicleBrandModelService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VehicleBrandModelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VehicleBrandModelService brandModelService;

    @MockBean
    private NguoiDungRepository nguoiDungRepository;

    @MockBean
    private NguoiDungVaiTroRepository nguoiDungVaiTroRepository;

    private String createAdminToken() {
        NguoiDung admin = new NguoiDung();
        admin.setMaNguoiDung(1);
        admin.setTenDangNhap("admin");
        admin.setHoTen("Admin");
        admin.setTrangThai(true);

        VaiTro role = new VaiTro();
        role.setMaVaiTro(1);
        role.setTenVaiTro("ROLE_ADMIN");

        when(nguoiDungRepository.findByTenDangNhapOrEmail("admin", "admin")).thenReturn(Optional.of(admin));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(1)).thenReturn(List.of(new NguoiDungVaiTro(admin, role)));

        return jwtService.generateToken("admin", List.of("ROLE_ADMIN"));
    }

    private String createManagerToken() {
        NguoiDung manager = new NguoiDung();
        manager.setMaNguoiDung(2);
        manager.setTenDangNhap("manager");
        manager.setHoTen("Manager");
        manager.setTrangThai(true);

        VaiTro role = new VaiTro();
        role.setMaVaiTro(2);
        role.setTenVaiTro("ROLE_MANAGER");

        when(nguoiDungRepository.findByTenDangNhapOrEmail("manager", "manager")).thenReturn(Optional.of(manager));
        when(nguoiDungVaiTroRepository.findByNguoiDungMaNguoiDung(2)).thenReturn(List.of(new NguoiDungVaiTro(manager, role)));

        return jwtService.generateToken("manager", List.of("ROLE_MANAGER"));
    }

    @Test
    void getAllBrands_publicEndpoint_returns200() throws Exception {
        when(brandModelService.getAllActiveBrands()).thenReturn(List.of(
                new BrandResponse(1, "Toyota"),
                new BrandResponse(2, "Honda")
        ));

        mockMvc.perform(get("/api/brands"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].tenHangXe").value("Toyota"))
                .andExpect(jsonPath("$.data[1].tenHangXe").value("Honda"));
    }

    @Test
    void getModelsByBrand_publicEndpoint_returns200() throws Exception {
        when(brandModelService.getModelsByBrand(1)).thenReturn(List.of(
                new ModelResponse(101, "Camry", 1, "Toyota")
        ));

        mockMvc.perform(get("/api/brands/1/models"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].tenModel").value("Camry"))
                .andExpect(jsonPath("$.data[0].maHangXe").value(1));
    }

    @Test
    void createBrand_adminRole_returns201() throws Exception {
        String token = createAdminToken();
        CreateBrandRequest request = new CreateBrandRequest("Toyota");
        when(brandModelService.createBrand(any(CreateBrandRequest.class))).thenReturn(new BrandResponse(1, "Toyota"));

        mockMvc.perform(post("/api/brands")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tenHangXe").value("Toyota"));
    }

    @Test
    void createModel_adminRole_returns201() throws Exception {
        String token = createAdminToken();
        CreateModelRequest request = new CreateModelRequest("Camry");
        when(brandModelService.createModel(eq(1), any(CreateModelRequest.class)))
                .thenReturn(new ModelResponse(101, "Camry", 1, "Toyota"));

        mockMvc.perform(post("/api/brands/1/models")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tenModel").value("Camry"));
    }

    @Test
    void createBrand_managerRole_returns403() throws Exception {
        String token = createManagerToken();
        CreateBrandRequest request = new CreateBrandRequest("Toyota");

        mockMvc.perform(post("/api/brands")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createModel_managerRole_returns403() throws Exception {
        String token = createManagerToken();
        CreateModelRequest request = new CreateModelRequest("Camry");

        mockMvc.perform(post("/api/brands/1/models")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
