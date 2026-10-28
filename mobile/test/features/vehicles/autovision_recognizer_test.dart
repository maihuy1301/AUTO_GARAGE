import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/features/vehicles/data/autovision_recognizer.dart';

void main() {
  const classes = <Map<String, dynamic>>[
    {'class_name': 'a', 'make': 'Toyota', 'model': 'Vios', 'rarity': 'COMMON'},
    {'class_name': 'b', 'make': 'Toyota', 'model': 'Yaris', 'rarity': 'COMMON'},
    {
      'class_name': 'background',
      'make': '_background',
      'model': '_background',
      'rarity': 'BACKGROUND',
    },
  ];
  const manifest = <String, dynamic>{
    'temperature': 1.0,
    'ood_threshold': 0.05,
    'confidence_thresholds': {'COMMON': 0.4},
    'confusion_pair_margin': 0.08,
  };

  test('accepts a confident car class and excludes background', () {
    final result = classifyAutoVision([8, 0, -8], classes, manifest, []);
    expect(result.accepted, isTrue);
    expect(result.suggestion?.make, 'Toyota');
    expect(result.suggestion?.model, 'Vios');
  });

  test('rejects background even when it has the highest confidence', () {
    final result = classifyAutoVision([0, 0, 8], classes, manifest, []);
    expect(result.accepted, isFalse);
    expect(result.reason, 'not_a_car');
  });

  test('rejects a known ambiguous pair below its margin', () {
    final result = classifyAutoVision(
      [3.1, 3, -8],
      classes,
      manifest,
      [
        {'class_a': 'a', 'class_b': 'b', 'margin_threshold': 0.15},
      ],
    );
    expect(result.accepted, isFalse);
    expect(result.reason, 'ambiguous');
  });
}
