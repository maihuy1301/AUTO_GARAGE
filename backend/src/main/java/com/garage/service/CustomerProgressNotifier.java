package com.garage.service;

import com.garage.entity.*;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

/** Customer-facing stage messages shared by staff and technician workflows. */
@Service
public class CustomerProgressNotifier {
    private final NotificationService notifications;

    public CustomerProgressNotifier(NotificationService notifications) {
        this.notifications = notifications;
    }

    public void appointmentChanged(DatLich appointment, String previousStatus) {
        String status = appointment.getTrangThai();
        if (status == null || status.equalsIgnoreCase(previousStatus)) return;
        String title;
        String detail;
        switch (status) {
            case "DA_XAC_NHAN" -> {
                title = "Lịch hẹn đã được xác nhận";
                detail = "Garage đã xác nhận lịch hẹn của bạn"
                        + (appointment.getThoiGianHen() == null ? "." : " lúc "
                        + appointment.getThoiGianHen().format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")) + ".");
            }
            case "DA_TIEP_NHAN" -> {
                title = "Garage đã tiếp nhận xe";
                detail = "Xe đã được tiếp nhận và đang chờ kiểm tra, sửa chữa.";
            }
            case "HOAN_TAT" -> {
                title = "Lịch hẹn đã hoàn tất";
                detail = "Garage đã hoàn tất xử lý lịch hẹn của bạn.";
            }
            case "HUY" -> {
                title = "Lịch hẹn đã hủy";
                detail = "Lịch hẹn của bạn đã được hủy.";
            }
            case "KHONG_DEN" -> {
                title = "Bạn đã lỡ lịch hẹn";
                detail = "Garage chưa tiếp nhận được xe theo lịch hẹn. Vui lòng liên hệ để đặt lại lịch.";
            }
            default -> { return; }
        }
        NguoiDung recipient = appointment.getKhachHang() == null ? null : appointment.getKhachHang().getNguoiDung();
        send(recipient, appointment.getXe(), appointment.getChiNhanh(), title, detail,
                "APPOINTMENT_" + status, appointment.getMaDatLich());
    }

    public void repairChanged(PhieuSuaChua order, String previousStatus) {
        String status = order.getTrangThai();
        if (status == null || status.equalsIgnoreCase(previousStatus)) return;
        String title;
        String detail;
        switch (status) {
            case "CHO_XU_LY" -> {
                title = "Xe đang chờ xử lý";
                detail = "Garage đang sắp xếp kỹ thuật viên kiểm tra và sửa chữa xe.";
            }
            case "DA_PHAN_CONG" -> {
                title = "Đã phân công kỹ thuật viên";
                detail = "Kỹ thuật viên đã được phân công phụ trách xe của bạn.";
            }
            case "DANG_SUA" -> {
                title = "Xe đang được sửa chữa";
                detail = "Kỹ thuật viên đang thực hiện sửa chữa xe của bạn.";
            }
            case "TAM_DUNG" -> {
                title = "Sửa chữa đang tạm dừng";
                detail = "Việc sửa chữa xe đang tạm dừng. Vui lòng liên hệ garage để biết thêm chi tiết.";
            }
            case "HOAN_TAT" -> {
                title = "Xe đã sửa xong - Mời bạn đến nhận xe";
                detail = "Xe của bạn đã hoàn tất sửa chữa. Mời bạn đến garage để kiểm tra, thanh toán và nhận xe.";
            }
            case "HUY" -> {
                title = "Phiếu sửa chữa đã hủy";
                detail = "Garage đã hủy phiếu sửa chữa. Vui lòng liên hệ garage để được hỗ trợ.";
            }
            default -> { return; }
        }
        Xe vehicle = order.getPhieuTiepNhan() == null ? null : order.getPhieuTiepNhan().getXe();
        NguoiDung recipient = vehicle == null || vehicle.getKhachHang() == null
                ? null : vehicle.getKhachHang().getNguoiDung();
        // A completed child job does not mean the whole vehicle is ready for pickup.
        if (order.getPhieuCha() != null && "HOAN_TAT".equals(status)) {
            title = "Hạng mục sửa chữa bổ sung đã hoàn tất";
            detail = "Garage đã hoàn tất phiếu sửa chữa bổ sung. Bạn sẽ nhận thông báo khi xe sẵn sàng để nhận.";
        }
        send(recipient, vehicle, order.getChiNhanh(), title, detail,
                "REPAIR_" + status, order.getMaPhieuSuaChua());
    }

    private void send(NguoiDung recipient, Xe vehicle, ChiNhanh branch, String title,
                      String detail, String type, Integer referenceId) {
        if (recipient == null || Boolean.FALSE.equals(recipient.getTrangThai())) return;
        String context = (vehicle == null ? "" : "Xe " + vehicle.getBienSo() + ". ")
                + (branch == null ? "" : "Chi nhánh: " + branch.getTenChiNhanh() + ". ");
        notifications.sendNotification(recipient, title, context + detail, type, referenceId);
    }
}
