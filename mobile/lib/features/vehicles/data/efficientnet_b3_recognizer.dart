import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:tflite_flutter/tflite_flutter.dart';

/// Interface cho bộ nhận diện xe bằng mô hình EfficientNet-B3.
abstract class EfficientNetB3VehicleRecognizer {
  Future<VehicleRecognitionResult> recognize(String imagePath);
}

/// Gợi ý Hãng xe và Dòng xe sau khi nhận diện.
class VehicleRecognitionSuggestion {
  const VehicleRecognitionSuggestion({
    required this.make,
    required this.model,
    required this.confidence,
  });

  final String make;
  final String model;
  final double confidence;
}

/// Kết quả nhận diện xe (kèm Unknown Guard: tự động gán vào xe 'Khác' nếu độ tin cậy thấp).
class VehicleRecognitionResult {
  const VehicleRecognitionResult({
    required this.suggestion,
    required this.reason,
  });

  final VehicleRecognitionSuggestion? suggestion;
  final String? reason;

  bool get accepted =>
      suggestion != null && reason == null && suggestion!.make != 'Khác';
  bool get isOther =>
      suggestion == null || suggestion!.make == 'Khác' || reason != null;
}

/// Triển khai nhận diện On-Device bằng mô hình TensorFlow Lite EfficientNet-B3 (870 lớp).
class OnDeviceEfficientNetB3Recognizer
    implements EfficientNetB3VehicleRecognizer {
  // Đường dẫn asset đăng ký trong pubspec.yaml được giữ nguyên để bảo đảm tính tương thích.
  static const _assetRoot = 'asset/autovision';

  @override
  Future<VehicleRecognitionResult> recognize(String imagePath) async {
    final manifest =
        jsonDecode(
              await rootBundle.loadString('$_assetRoot/model_manifest.json'),
            )
            as Map<String, dynamic>;
    final classes =
        (jsonDecode(
                  await rootBundle.loadString('$_assetRoot/class_mapping.json'),
                )
                as List)
            .cast<Map<String, dynamic>>();
    final pairs =
        (jsonDecode(
                  await rootBundle.loadString(
                    '$_assetRoot/confusion_pairs.json',
                  ),
                )
                as List)
            .cast<Map<String, dynamic>>();
    final bytes = await File(imagePath).readAsBytes();
    final pixels = await compute(_preprocessEfficientNetB3, bytes);
    final interpreter = await Interpreter.fromAsset(
      '$_assetRoot/car_classifier.tflite',
    );
    try {
      final shape = interpreter.getInputTensor(0).shape;
      final outputShape = interpreter.getOutputTensor(0).shape;
      final inputSize = (manifest['input_size'] as num?)?.toInt() ?? 300;
      if (shape.length != 4 ||
          shape[0] != 1 ||
          shape[1] != inputSize ||
          shape[2] != inputSize ||
          shape[3] != 3 ||
          outputShape.length != 2 ||
          outputShape[0] != 1 ||
          outputShape[1] != classes.length) {
        throw StateError('Mô hình nhận diện xe và danh sách lớp không khớp.');
      }
      final output = [List<double>.filled(classes.length, 0)];
      final worker = await IsolateInterpreter.create(
        address: interpreter.address,
      );
      try {
        await worker.run(pixels.reshape([1, inputSize, inputSize, 3]), output);
      } finally {
        await worker.close();
      }
      return classifyVehicleWithEfficientNetB3(
        output.first,
        classes,
        manifest,
        pairs,
      );
    } finally {
      interpreter.close();
    }
  }
}

Float32List _preprocessEfficientNetB3(Uint8List bytes) {
  final decoded = img.decodeImage(bytes);
  if (decoded == null) throw const FormatException('Ảnh không hợp lệ.');
  final oriented = img.bakeOrientation(decoded);
  final side = math.min(oriented.width, oriented.height);
  final cropped = img.copyCrop(
    oriented,
    x: (oriented.width - side) ~/ 2,
    y: (oriented.height - side) ~/ 2,
    width: side,
    height: side,
  );
  const inputSize = 300;
  final resized = img.copyResize(
    cropped,
    width: inputSize,
    height: inputSize,
    interpolation: img.Interpolation.linear,
  );
  final pixels = Float32List(inputSize * inputSize * 3);
  const means = [0.485, 0.456, 0.406];
  const stds = [0.229, 0.224, 0.225];
  var index = 0;
  for (var y = 0; y < inputSize; y++) {
    for (var x = 0; x < inputSize; x++) {
      final pixel = resized.getPixel(x, y);
      pixels[index++] = (pixel.rNormalized - means[0]) / stds[0];
      pixels[index++] = (pixel.gNormalized - means[1]) / stds[1];
      pixels[index++] = (pixel.bNormalized - means[2]) / stds[2];
    }
  }
  return pixels;
}

@visibleForTesting
VehicleRecognitionResult classifyVehicleWithEfficientNetB3(
  List<double> logits,
  List<Map<String, dynamic>> classes,
  Map<String, dynamic> manifest,
  List<Map<String, dynamic>> pairs,
) {
  if (logits.length != classes.length || logits.isEmpty) {
    throw ArgumentError('Output của mô hình và danh mục lớp không khớp.');
  }
  final temperature = (manifest['temperature'] as num?)?.toDouble() ?? 1.0;
  final maxLogit = logits.reduce(math.max);
  final exponentials = logits
      .map((value) => math.exp((value - maxLogit) / temperature))
      .toList();
  final total = exponentials.reduce((a, b) => a + b);
  final probabilities = exponentials.map((value) => value / total).toList();
  final order = List<int>.generate(logits.length, (index) => index)
    ..sort((a, b) => probabilities[b].compareTo(probabilities[a]));
  final topIndex = order.first;
  final runnerUpIndex = order.length > 1 ? order[1] : order[0];
  final top = classes[topIndex];
  final confidence = probabilities[topIndex];
  final runnerUpProb = probabilities[runnerUpIndex];
  final margin = confidence - runnerUpProb;

  final minProbability =
      (manifest['min_probability'] as num?)?.toDouble() ?? 0.50;
  final minMargin = (manifest['min_margin'] as num?)?.toDouble() ?? 0.10;

  // Unknown Guard: nếu độ tin cậy < 50% hoặc khoảng cách giữa top 1 và top 2 < 10%
  // thì xác định là xe lạ / không chắc chắn -> gán vào loại xe "Khác"
  if (confidence < minProbability || margin < minMargin) {
    return const VehicleRecognitionResult(
      suggestion: VehicleRecognitionSuggestion(
        make: 'Khác',
        model: 'Khác',
        confidence: 0.0,
      ),
      reason: 'unknown_or_low_confidence',
    );
  }

  return VehicleRecognitionResult(
    suggestion: VehicleRecognitionSuggestion(
      make: (top['make'] ?? 'Khác') as String,
      model: (top['model'] ?? top['model_variant'] ?? 'Khác') as String,
      confidence: confidence,
    ),
    reason: null,
  );
}

// =============================================================================
// ALIASES CHO TƯƠNG THÍCH NGƯỢC (Backward Compatibility)
// Giúp không làm xáo trộn các import trong giao diện vehicle_form_sheet.dart
// và đảm bảo toàn bộ nhóm khi pull code về không bị lỗi cú pháp.
// =============================================================================
typedef AutoVisionRecognizer = EfficientNetB3VehicleRecognizer;
typedef AutoVisionSuggestion = VehicleRecognitionSuggestion;
typedef AutoVisionResult = VehicleRecognitionResult;
typedef OnDeviceAutoVisionRecognizer = OnDeviceEfficientNetB3Recognizer;
const classifyAutoVision = classifyVehicleWithEfficientNetB3;

