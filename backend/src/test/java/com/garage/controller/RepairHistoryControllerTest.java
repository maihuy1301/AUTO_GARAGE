package com.garage.controller;

import com.garage.security.*;
import com.garage.service.RepairHistoryService;
import com.garage.dto.RepairHistoryResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;

@WebMvcTest(RepairHistoryController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class RepairHistoryControllerTest {
    @Autowired MockMvc mvc;
    @MockBean RepairHistoryService service;
    @MockBean JwtService jwt;
    @MockBean CustomUserDetailsService users;
    @Test void anonymousDenied() throws Exception {
        mvc.perform(get("/api/repair-history")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/repair-history/10")).andExpect(status().isUnauthorized());
    }
    @Test @WithMockUser(roles = "TECHNICIAN") void technicianDenied() throws Exception {
        mvc.perform(get("/api/repair-history")).andExpect(status().isForbidden());
        mvc.perform(get("/api/repair-history/10")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test @WithMockUser(roles = "FRONT_DESK") void staffDenied() throws Exception {
        mvc.perform(get("/api/repair-history")).andExpect(status().isForbidden()); verifyNoInteractions(service);
    }
    @Test @WithMockUser(roles = "CUSTOMER") void customerCanFilterWithBoundedDefaults() throws Exception {
        when(service.list(42, 0, 20)).thenReturn(new RepairHistoryResponse.Page(List.of(), 0, false));
        mvc.perform(get("/api/repair-history?vehicleId=42&customerId=999"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.hasMore").value(false));
        verify(service).list(42, 0, 20);
    }
    @Test @WithMockUser(roles = "CUSTOMER") void customerDetailPassesThroughServiceAuthorization() throws Exception {
        mvc.perform(get("/api/repair-history/10")).andExpect(status().isOk()); verify(service).detail(10);
    }
}
