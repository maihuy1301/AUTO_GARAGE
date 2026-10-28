import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:tflite_flutter/tflite_flutter.dart';

abstract class AutoVisionRecognizer {
  Future<AutoVisionResult> recognize(String imagePath);
}

class AutoVisionSuggestion {
  const AutoVisionSuggestion({
    required this.make,
    required this.model,
    required this.confidence,
  });

  final String make;
  final String model;
  final double confidence;
}

class AutoVisionResult {
  const AutoVisionResult({required this.suggestion, required this.reason});

  final AutoVisionSuggestion? suggestion;
  final String? reason;
  bool get accepted => suggestion != null && reason == null;
}

class OnDeviceAutoVisionRecognizer implements AutoVisionRecognizer {
  static const _assetRoot = 'asset/autovision';

  @override
  Future<AutoVisionResult> recognize(String imagePath) async {
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
    final pixels = await compute(_preprocess, bytes);
    final interpreter = await Interpreter.fromAsset(
      '$_assetRoot/car_classifier.tflite',
    );
    try {
      final shape = interpreter.getInputTensor(0).shape;
      final outputShape = interpreter.getOutputTensor(0).shape;
      if (shape.length != 4 ||
          shape[0] != 1 ||
          shape[1] != 384 ||
          shape[2] != 384 ||
          shape[3] != 3 ||
          outputShape.length != 2 ||
          outputShape[0] != 1 ||
          outputShape[1] != classes.length) {
        throw StateError('AutoVision model và class mapping không khớp.');
      }
      final output = [List<double>.filled(classes.length, 0)];
      final worker = await IsolateInterpreter.create(
        address: interpreter.address,
      );
      try {
        await worker.run(pixels.reshape([1, 384, 384, 3]), output);
      } finally {
        await worker.close();
      }
      return classifyAutoVision(output.first, classes, manifest, pairs);
    } finally {
      interpreter.close();
    }
  }
}

Float32List _preprocess(Uint8List bytes) {
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
  final resized = img.copyResize(
    cropped,
    width: 384,
    height: 384,
    interpolation: img.Interpolation.linear,
  );
  final pixels = Float32List(384 * 384 * 3);
  const means = [0.485, 0.456, 0.406];
  const stds = [0.229, 0.224, 0.225];
  var index = 0;
  for (var y = 0; y < 384; y++) {
    for (var x = 0; x < 384; x++) {
      final pixel = resized.getPixel(x, y);
      pixels[index++] = (pixel.rNormalized - means[0]) / stds[0];
      pixels[index++] = (pixel.gNormalized - means[1]) / stds[1];
      pixels[index++] = (pixel.bNormalized - means[2]) / stds[2];
    }
  }
  return pixels;
}

@visibleForTesting
AutoVisionResult classifyAutoVision(
  List<double> logits,
  List<Map<String, dynamic>> classes,
  Map<String, dynamic> manifest,
  List<Map<String, dynamic>> pairs,
) {
  if (logits.length != classes.length || logits.isEmpty) {
    throw ArgumentError('AutoVision output và class mapping không khớp.');
  }
  final temperature = (manifest['temperature'] as num).toDouble();
  final maxLogit = logits.reduce(math.max);
  final exponentials = logits
      .map((value) => math.exp((value - maxLogit) / temperature))
      .toList();
  final total = exponentials.reduce((a, b) => a + b);
  final probabilities = exponentials.map((value) => value / total).toList();
  final order = List<int>.generate(logits.length, (index) => index)
    ..sort((a, b) => probabilities[b].compareTo(probabilities[a]));
  final topIndex = order.first;
  final top = classes[topIndex];
  final confidence = probabilities[topIndex];
  if (top['rarity'] == 'BACKGROUND' ||
      confidence < (manifest['ood_threshold'] as num).toDouble()) {
    return const AutoVisionResult(suggestion: null, reason: 'not_a_car');
  }
  final thresholds = manifest['confidence_thresholds'] as Map<String, dynamic>;
  final threshold = (thresholds[top['rarity']] as num?)?.toDouble() ?? 0.5;
  if (confidence < threshold) {
    return const AutoVisionResult(suggestion: null, reason: 'low_confidence');
  }
  final carOrder = order
      .where((index) => classes[index]['rarity'] != 'BACKGROUND')
      .toList();
  if (carOrder.length > 1) {
    final firstName = classes[carOrder[0]]['class_name'];
    final secondName = classes[carOrder[1]]['class_name'];
    for (final pair in pairs) {
      if ((pair['class_a'] == firstName && pair['class_b'] == secondName) ||
          (pair['class_a'] == secondName && pair['class_b'] == firstName)) {
        final margin =
            (pair['margin_threshold'] as num?)?.toDouble() ??
            (manifest['confusion_pair_margin'] as num).toDouble();
        if (confidence - probabilities[carOrder[1]] < margin) {
          return const AutoVisionResult(suggestion: null, reason: 'ambiguous');
        }
      }
    }
  }
  return AutoVisionResult(
    suggestion: AutoVisionSuggestion(
      make: top['make'] as String,
      model: top['model'] as String,
      confidence: confidence,
    ),
    reason: null,
  );
}
