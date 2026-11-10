package com.garage.service;

import com.garage.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CustomerProgressNotifierTest {
    private final NotificationService notifications = mock(NotificationService.class);
    private final CustomerProgressNotifier notifier = new CustomerProgressNotifier(notifications);
    private final NguoiDung customer = new NguoiDung();
    private final DatLich appointment = new DatLich();
    private final PhieuSuaChua order = new PhieuSuaChua();

    @BeforeEach
    void setup() {
        customer.setTrangThai(true);
        KhachHang owner = new KhachHang();
        owner.setNguoiDung(customer);
        Xe vehicle = new Xe();
        vehicle.setBienSo("51A-12345");
        vehicle.setKhachHang(owner);
        ChiNhanh branch = new ChiNhanh();
        branch.setTenChiNhanh("Garage Central");
        appointment.setMaDatLich(10);
        appointment.setKhachHang(owner);
        appointment.setXe(vehicle);
        appointment.setChiNhanh(branch);
        PhieuTiepNhan reception = new PhieuTiepNhan();
        reception.setXe(vehicle);
        order.setMaPhieuSuaChua(20);
        order.setPhieuTiepNhan(reception);
        order.setChiNhanh(branch);
    }

    @ParameterizedTest
    @ValueSource(strings = {"DA_XAC_NHAN", "DA_TIEP_NHAN", "HOAN_TAT", "HUY", "KHONG_DEN"})
    void appointmentStagesNotifyOnlyTheAppointmentOwner(String status) {
        appointment.setTrangThai(status);
        notifier.appointmentChanged(appointment, "CHO_XAC_NHAN");
        verify(notifications).sendNotification(same(customer), anyString(),
                contains("51A-12345"), eq("APPOINTMENT_" + status), eq(10));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CHO_XU_LY", "DA_PHAN_CONG", "DANG_SUA", "TAM_DUNG", "HOAN_TAT", "HUY"})
    void repairStagesNotifyTheVehicleOwnerWithBranch(String status) {
        order.setTrangThai(status);
        notifier.repairChanged(order, null);
        verify(notifications).sendNotification(same(customer), anyString(),
                contains("Garage Central"), eq("REPAIR_" + status), eq(20));
    }

    @Test
    void completedRepairInvitesCustomerToPickupVehicle() {
        order.setTrangThai("HOAN_TAT");
        notifier.repairChanged(order, "DANG_SUA");
        verify(notifications).sendNotification(same(customer), contains("Mời bạn đến nhận xe"),
                contains("thanh toán và nhận xe"), eq("REPAIR_HOAN_TAT"), eq(20));
    }

    @Test
    void completedSubRepairDoesNotInviteCustomerToPickupEarly() {
        order.setPhieuCha(new PhieuSuaChua());
        order.setTrangThai("HOAN_TAT");
        notifier.repairChanged(order, "DANG_SUA");
        verify(notifications).sendNotification(same(customer), eq("Hạng mục sửa chữa bổ sung đã hoàn tất"),
                anyString(), eq("REPAIR_HOAN_TAT"), eq(20));
    }

    @Test
    void repeatedStatesDoNotSendDuplicates() {
        appointment.setTrangThai("DA_XAC_NHAN");
        order.setTrangThai("DANG_SUA");
        notifier.appointmentChanged(appointment, "DA_XAC_NHAN");
        notifier.repairChanged(order, "DANG_SUA");
        verifyNoInteractions(notifications);
    }

    @Test
    void inactiveWalkInAccountDoesNotReceiveMobileNotifications() {
        customer.setTrangThai(false);
        order.setTrangThai("HOAN_TAT");
        notifier.repairChanged(order, "DANG_SUA");
        verifyNoInteractions(notifications);
    }
}
