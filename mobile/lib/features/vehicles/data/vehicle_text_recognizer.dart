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
    r'(^|[^A-Z0-9])(\d{2}[A-Z]{1,2})[-. ]?(\d{3}[. ]?\d{2}|\d{4})(?=$|[^A-Z0-9])',
  );
  for (final line in lines) {
    for (final match in pattern.allMatches(line)) {
      final digits = match.group(3)!.replaceAll(RegExp(r'[^0-9]'), '');
      candidates.add('${match.group(2)}-$digits');
    }
  }
  return _single(candidates);
}

String? _findVin(List<String> lines) {
  final candidates = <String>{};
  final pattern = RegExp(r'(^|[^A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?=$|[^A-Z0-9])');
  for (final line in lines) {
    for (final match in pattern.allMatches(line)) {
      candidates.add(match.group(2)!);
    }
  }
  return _single(candidates);
}

int? _findOdometer(List<String> lines) {
  final candidates = <int>{};
  final number = r'(\d{1,3}(?:[., ]\d{3})+|\d{3,7})';
  final labeled = RegExp('(?:ODO|ODOMETER|SO\\s*KM)\\D{0,10}$number');
  final withUnit = RegExp('$number\\s*KM\\b');
  for (final line in lines) {
    if (RegExp(r'\bTRIP\b').hasMatch(line)) continue;
    final label = labeled.firstMatch(line);
    if (label != null) {
      final value = _parseOdometer(label.group(1)!);
      if (value != null) candidates.add(value);
      continue;
    }
    for (final match in withUnit.allMatches(line)) {
      if (line.substring(match.end).trimLeft().startsWith('/H')) continue;
      final value = _parseOdometer(match.group(1)!);
      if (value != null) candidates.add(value);
    }
  }
  if (candidates.isEmpty && lines.length == 1) {
    final onlyNumber = RegExp(
      r'^\s*(\d{1,3}(?:[., ]\d{3})+|\d{3,7})\s*$',
    ).firstMatch(lines.single);
    if (onlyNumber != null) {
      final value = _parseOdometer(onlyNumber.group(1)!);
      if (value != null) candidates.add(value);
    }
  }
  return _single(candidates);
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
