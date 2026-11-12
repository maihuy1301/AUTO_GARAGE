import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

enum VehicleScanTarget { registration, plate, vin, odometer, year }

abstract class VehicleTextRecognizer {
  Future<String> recognize(String imagePath);
}

class MlKitVehicleTextRecognizer implements VehicleTextRecognizer {
  @override
  Future<String> recognize(String imagePath) async {
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final image = InputImage.fromFilePath(imagePath);
      return (await recognizer.processImage(image)).text;
    } finally {
      await recognizer.close();
    }
  }
}

class VehicleTextScanResult {
  const VehicleTextScanResult({this.plate, this.vin, this.odometer, this.year});

  final String? plate;
  final String? vin;
  final int? odometer;
  final int? year;

  bool get isEmpty =>
      plate == null && vin == null && odometer == null && year == null;
}

VehicleTextScanResult extractVehicleText(
  String text,
  VehicleScanTarget target, {
  int? currentYear,
}) {
  final lines = text
      .split(RegExp(r'\r?\n'))
      .map(_foldVietnamese)
      .where((line) => line.trim().isNotEmpty)
      .toList(growable: false);
  final registration = target == VehicleScanTarget.registration;
  return VehicleTextScanResult(
    plate: registration || target == VehicleScanTarget.plate
        ? _findPlate(lines)
        : null,
    vin: registration || target == VehicleScanTarget.vin
        ? _findVin(lines)
        : null,
    odometer: target == VehicleScanTarget.odometer
        ? _findOdometer(lines)
        : null,
    year: registration || target == VehicleScanTarget.year
        ? _findYear(lines, currentYear ?? DateTime.now().year)
        : null,
  );
}

String _foldVietnamese(String value) {
  var result = value.toUpperCase();
  const groups = <String, String>{
    'ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ': 'A',
    'ÈÉẺẼẸÊỀẾỂỄỆ': 'E',
    'ÌÍỈĨỊ': 'I',
    'ÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ': 'O',
    'ÙÚỦŨỤƯỪỨỬỮỰ': 'U',
    'ỲÝỶỸỴ': 'Y',
    'Đ': 'D',
  };
  for (final entry in groups.entries) {
    for (final character in entry.key.split('')) {
      result = result.replaceAll(character, entry.value);
    }
  }
  return result;
}

T? _single<T>(Set<T> values) => values.length == 1 ? values.single : null;

String? _findPlate(List<String> lines) {
  final candidates = <String>{};
  final pattern = RegExp(
    r'(^|[^A-Z0-9])(\d{2}[A-Z]{1,2})[-. ]?(\d{3}[. ]?\d{2}|\d{4,5})(?=$|[^A-Z0-9])',
  );
  for (final line in lines) {
    for (final match in pattern.allMatches(line)) {
      final prefix = match.group(2)!;
      final digits = match.group(3)!.replaceAll(RegExp(r'[^0-9]'), '');
      if (_isValidPlateParts(prefix, digits)) {
        candidates.add('$prefix-$digits');
      }
    }
  }
  return _single(candidates);
}

bool _isValidPlateParts(String prefix, String digits) {
  if (digits.length != 4 && digits.length != 5) return false;
  if (RegExp(r'^0+$').hasMatch(digits)) return false;
  final province = int.tryParse(prefix.substring(0, 2));
  if (province == null || province < 11 || province > 99) return false;
  return true;
}

String? _findVin(List<String> lines) {
  final candidates = <String>{};
  final pattern = RegExp(r'(^|[^A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?=$|[^A-Z0-9])');
  for (final line in lines) {
    for (final match in pattern.allMatches(line)) {
      final candidate = match.group(2)!;
      if (_isValidVin(candidate)) {
        candidates.add(candidate);
      }
    }
  }
  return _single(candidates);
}

bool _isValidVin(String vin) {
  if (vin.length != 17) return false;
  if (!RegExp(r'^[A-HJ-NPR-Z0-9]{17}$').hasMatch(vin)) return false;
  // Chuẩn ISO 3779: VIN bắt buộc phải có cả chữ cái và chữ số (chặn dãy 17 số hoặc 17 chữ)
  final letterCount = RegExp(r'[A-HJ-NPR-Z]').allMatches(vin).length;
  final digitCount = RegExp(r'[0-9]').allMatches(vin).length;
  if (letterCount < 2 || digitCount < 5) return false;
  // 4 ký tự cuối (VIS - số thứ tự xuất xưởng vị trí 14-17) theo chuẩn VIN phải là chữ số
  if (!RegExp(r'\d{4}$').hasMatch(vin)) return false;
  // Chặn chuỗi lặp bất thường (ví dụ 11111111111111111)
  if (RegExp(r'(.)\1{6,}').hasMatch(vin)) return false;
  return true;
}

int? _findOdometer(List<String> lines) {
  final labeledCandidates = <int>{};
  final unitCandidates = <int>{};
  const number = r'(\d{1,3}(?:[., ]\d{3})+|\d{1,7})';
  final odoLabelOnly = RegExp(r'\b(?:ODO|ODOMETER|SO\s*KM)\b');
  final labeledSameLine = RegExp(
    '(?:\\bODO\\b|\\bODOMETER\\b|\\bSO\\s*KM\\b)\\D{0,10}$number(?:\\s*KM\\b)?',
  );
  final withUnit = RegExp('$number\\s*KM\\b');
  final excludedContext = RegExp(
    r'\b(?:TRIP|RANGE|AVG|AVERAGE|FUEL|SPEED|RPM|TEMP|MAX|MIN|L/100|KM/L|KM/H|KM/KWH)\b',
  );

  for (var i = 0; i < lines.length; i++) {
    final line = lines[i];
    if (excludedContext.hasMatch(line)) continue;

    final labelMatch = labeledSameLine.firstMatch(line);
    if (labelMatch != null) {
      final tail = line.substring(labelMatch.end).trimLeft();
      if (!tail.startsWith('/H') && !tail.startsWith('/L')) {
        final value = _parseOdometer(labelMatch.group(1)!);
        if (value != null) labeledCandidates.add(value);
      }
      continue;
    }

    // Trường hợp chữ "ODO" nằm ở dòng trên và số km nằm ngay dòng dưới trên màn hình LCD
    if (odoLabelOnly.hasMatch(line) && i + 1 < lines.length) {
      final nextLine = lines[i + 1];
      if (!excludedContext.hasMatch(nextLine)) {
        final nextMatch = RegExp(
          '^\\s*$number(?:\\s*KM\\b)?\\s*\$',
        ).firstMatch(nextLine);
        if (nextMatch != null) {
          final value = _parseOdometer(nextMatch.group(1)!);
          if (value != null) labeledCandidates.add(value);
        }
      }
    }

    for (final match in withUnit.allMatches(line)) {
      final tail = line.substring(match.end).trimLeft();
      if (tail.startsWith('/H') ||
          tail.startsWith('/L') ||
          tail.startsWith('/KWH')) {
        continue;
      }
      final value = _parseOdometer(match.group(1)!);
      if (value != null) unitCandidates.add(value);
    }
  }

  // Ưu tiên số có nhãn ODO/ODOMETER/SO KM rõ ràng; tuyệt đối không nhận số trơ trọi không có ngữ cảnh
  if (labeledCandidates.isNotEmpty) {
    return _single(labeledCandidates);
  }
  return _single(unitCandidates);
}

int? _parseOdometer(String text) {
  final value = int.tryParse(text.replaceAll(RegExp(r'[^0-9]'), ''));
  return value != null && value <= 2000000 ? value : null;
}

int? _findYear(List<String> lines, int currentYear) {
  final candidates = <int>{};
  final label = RegExp(
    r'NAM\s*(?:SAN\s*XUAT|SX)|YEAR\s*(?:OF\s*)?MANUFACTURE|MFG\s*YEAR',
  );
  final yearPattern = RegExp(
    r'(^|[^0-9])(19[5-9][0-9]|20[0-9]{2})(?=$|[^0-9])',
  );
  for (var i = 0; i < lines.length; i++) {
    final match = label.firstMatch(lines[i]);
    if (match == null) continue;
    final afterLabel = lines[i].substring(match.end);
    final context = afterLabel.trim().isNotEmpty
        ? afterLabel
        : i + 1 < lines.length
        ? lines[i + 1]
        : '';
    for (final found in yearPattern.allMatches(context)) {
      final value = int.parse(found.group(2)!);
      if (value >= 1950 && value <= currentYear + 1) candidates.add(value);
    }
  }
  return _single(candidates);
}
