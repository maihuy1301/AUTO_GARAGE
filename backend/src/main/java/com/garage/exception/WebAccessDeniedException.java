package com.garage.exception;

import org.springframework.security.access.AccessDeniedException;

public class WebAccessDeniedException extends AccessDeniedException {
    public WebAccessDeniedException() {
        super("Tài khoản này không được đăng nhập web. Khách hàng và kỹ thuật viên vui lòng sử dụng ứng dụng di động.");
    }
}
