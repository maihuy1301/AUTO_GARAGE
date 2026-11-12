import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/features/vehicles/data/vehicle_text_recognizer.dart';

void main() {
  test('registration extracts plate, VIN and labeled production year', () {
    final result = extractVehicleText(
      'Biển số: 30K-999.99\n'
      'Số khung: 1HGCM82633A004352\n'
      'Ngày đăng ký lần đầu: 2022\n'
      'Năm sản xuất: 2020',
      VehicleScanTarget.registration,
      currentYear: 2026,
    );

    expect(result.plate, '30K-99999');
    expect(result.vin, '1HGCM82633A004352');
    expect(result.year, 2020);
    expect(result.odometer, isNull);
  });

  test('odometer reads total kilometers but ignores speed and trip values', () {
    final result = extractVehicleText(
      '100 km/h\nTRIP A 1,234 km\nODO 12,500 km',
      VehicleScanTarget.odometer,
    );

    expect(result.odometer, 12500);
    expect(result.plate, isNull);
  });

  test('year is not guessed from a registration date', () {
    final result = extractVehicleText(
      'Ngày đăng ký lần đầu: 2022\nHạn đăng kiểm: 2027',
      VehicleScanTarget.year,
      currentYear: 2026,
    );

    expect(result.isEmpty, isTrue);
  });

  test('ambiguous plates are not applied to the form', () {
    final result = extractVehicleText(
      '51A-11111\n51B-22222',
      VehicleScanTarget.plate,
    );

    expect(result.plate, isNull);
  });

  test('invalid VIN and implausible ODO are not accepted', () {
    expect(
      extractVehicleText('VIN: 1HGCM82633A00435O', VehicleScanTarget.vin).vin,
      isNull,
    );
    // Dãy 17 chữ số thuần túy (số tài khoản, mã vạch) hoặc 17 chữ cái bị từ chối
    expect(
      extractVehicleText('12345678901234567', VehicleScanTarget.vin).vin,
      isNull,
    );
    expect(
      extractVehicleText('ABCDEFGHJKLMNPRST', VehicleScanTarget.vin).vin,
      isNull,
    );
    expect(
      extractVehicleText(
        'ODO 9,999,999 km',
        VehicleScanTarget.odometer,
      ).odometer,
      isNull,
    );
    // Con số trơ trọi không có chữ ODO hoặc đơn vị km bị từ chối hoàn toàn
    expect(
      extractVehicleText('12500', VehicleScanTarget.odometer).odometer,
      isNull,
    );
    // Mã tỉnh không hợp lệ (< 11) hoặc số 00000 bị từ chối
    expect(
      extractVehicleText('05A-12345', VehicleScanTarget.plate).plate,
      isNull,
    );
    expect(
      extractVehicleText('30A-00000', VehicleScanTarget.plate).plate,
      isNull,
    );
  });
}
