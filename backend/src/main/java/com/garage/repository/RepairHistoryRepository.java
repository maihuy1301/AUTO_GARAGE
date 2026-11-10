package com.garage.repository;

import com.garage.entity.PhieuTiepNhan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Read-only projections: no history table and no collection fetch pagination. */
public interface RepairHistoryRepository extends Repository<PhieuTiepNhan, Integer> {
    interface Visit {
        Integer getReceptionId();
        Integer getVehicleId();
        String getPlate();
        String getBranchName();
        LocalDateTime getReceivedAt();
        LocalDateTime getHandedOverAt();
        Integer getOdometer();
        String getRequest();
    }
    interface Bill {
        Integer getReceptionId();
        Integer getInvoiceId();
        BigDecimal getTotal();
    }

    @Query("""
        select r.maTiepNhan as receptionId, v.maXe as vehicleId, v.bienSo as plate,
          r.chiNhanh.tenChiNhanh as branchName, r.thoiGianTiepNhan as receivedAt,
          h.thoiGianBanGiao as handedOverAt, r.soKm as odometer, r.yeuCauKhachHang as request
        from PhieuTiepNhan r join r.xe v left join BanGiaoXe h on h.maTiepNhan = r.maTiepNhan
        where v.khachHang.maKhachHang = :customerId and r.trangThai <> 'HUY'
          and (:vehicleId is null or v.maXe = :vehicleId)
          and (:receptionId is null or r.maTiepNhan = :receptionId)
          and exists (select i.maHoaDon from HoaDon i
            where i.phieuSuaChua.phieuTiepNhan.maTiepNhan = r.maTiepNhan
              and i.trangThai = 'DA_THANH_TOAN')
          and not exists (select i.maHoaDon from HoaDon i
            where i.phieuSuaChua.phieuTiepNhan.maTiepNhan = r.maTiepNhan
              and (i.khachHang is null or i.khachHang.maKhachHang <> :customerId
                or i.trangThai not in ('DA_THANH_TOAN', 'HUY')))
          and not exists (select p.maPhieuSuaChua from PhieuSuaChua p
            left join p.phieuCha parent
            where p.phieuTiepNhan.maTiepNhan = r.maTiepNhan and p.trangThai <> 'HUY'
              and (p.trangThai <> 'HOAN_TAT' or not exists (select i.maHoaDon from HoaDon i
                where i.trangThai = 'DA_THANH_TOAN'
                  and i.khachHang.maKhachHang = :customerId
                  and i.phieuSuaChua.phieuTiepNhan.maTiepNhan = r.maTiepNhan
                  and (i.phieuSuaChua.maPhieuSuaChua = p.maPhieuSuaChua
                    or (i.phieuSuaChua.maPhieuSuaChua = parent.maPhieuSuaChua
                      and not exists (select own.maHoaDon from HoaDon own
                        where own.phieuSuaChua.maPhieuSuaChua = p.maPhieuSuaChua))))))
        order by coalesce(h.thoiGianBanGiao, r.thoiGianTiepNhan) desc, r.maTiepNhan desc
        """)
    Slice<Visit> findVisits(@Param("customerId") Integer customerId,
        @Param("vehicleId") Integer vehicleId, @Param("receptionId") Integer receptionId, Pageable pageable);

    @Query("""
        select i.phieuSuaChua.phieuTiepNhan.maTiepNhan as receptionId,
          i.maHoaDon as invoiceId, i.thanhTien as total from HoaDon i
        where i.phieuSuaChua.phieuTiepNhan.maTiepNhan in :ids
          and i.khachHang.maKhachHang = :customerId and i.trangThai = 'DA_THANH_TOAN'
        order by i.maHoaDon
        """)
    List<Bill> findBills(@Param("customerId") Integer customerId, @Param("ids") List<Integer> ids);
}
