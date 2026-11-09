package com.garage.dto;

import java.util.List;

public class WebCurrentUserResponse extends CurrentUserResponse {
    private final List<String> roles;

    public WebCurrentUserResponse(CurrentUserResponse user, List<String> roles) {
        super(user.getMaNguoiDung(), user.getTenDangNhap(), user.getHoTen(), user.getEmail(),
                user.isHasPin(), user.getMaChiNhanh(), user.getTenChiNhanh());
        this.roles = List.copyOf(roles);
    }

    public List<String> getRoles() {
        return roles;
    }
}
