import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/features/vehicles/data/autovision_recognizer.dart';

void main() {
  // Cấu trúc class_mapping.json của EfficientNet-B3 (870 lớp, không có lớp background).
  const classes = <Map<String, dynamic>>[
    {'index': 0, 'label': 'Toyota Vios', 'make': 'Toyota', 'model': 'Vios'},
    {'index': 1, 'label': 'Toyota Yaris', 'make': 'Toyota', 'model': 'Yaris'},
    {'index': 2, 'label': 'VinFast VF 6', 'make': 'VinFast', 'model': 'VF 6'},
  ];
  const manifest = <String, dynamic>{
    'temperature': 1.0,
    'min_probability': 0.5,
    'min_margin': 0.1,
  };

  test('accepts a confident class', () {
    final result = classifyAutoVision([8, 0, -8], classes, manifest, []);
    expect(result.accepted, isTrue);
    expect(result.isOther, isFalse);
    expect(result.suggestion?.make, 'Toyota');
    expect(result.suggestion?.model, 'Vios');
  });

  test('low confidence falls back to "Khác"', () {
    final result = classifyAutoVision([0, 0, 0], classes, manifest, []);
    expect(result.accepted, isFalse);
    expect(result.isOther, isTrue);
    expect(result.reason, 'unknown_or_low_confidence');
    expect(result.suggestion?.make, 'Khác');
    expect(result.suggestion?.model, 'Khác');
  });

  test('small margin between top-1 and top-2 falls back to "Khác"', () {
    // Top-1 ≈ 52.5%, top-2 ≈ 47.5% -> vượt min_probability nhưng margin < 10%.
    final result = classifyAutoVision([3.1, 3, -8], classes, manifest, []);
    expect(result.accepted, isFalse);
    expect(result.isOther, isTrue);
    expect(result.reason, 'unknown_or_low_confidence');
  });

  test('thresholds are read from the model manifest', () {
    // Top-1 ≈ 88% vẫn bị từ chối khi manifest yêu cầu 90%.
    final strict = {...manifest, 'min_probability': 0.9};
    final result = classifyAutoVision([2, 0, -8], classes, strict, []);
    expect(result.accepted, isFalse);
    expect(result.isOther, isTrue);
  });

  test('throws when model output does not match class mapping', () {
    expect(
      () => classifyAutoVision([1, 2], classes, manifest, []),
      throwsArgumentError,
    );
  });
}
