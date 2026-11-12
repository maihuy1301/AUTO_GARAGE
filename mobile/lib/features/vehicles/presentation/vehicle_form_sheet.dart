import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/theme/app_colors.dart';
import '../data/autovision_recognizer.dart';
import '../data/vehicle_service.dart';
import '../data/vehicle_text_recognizer.dart';
import '../domain/vehicle_models.dart';

class VehicleFormResult {
  const VehicleFormResult(
    this.vehicle, {
    this.warning,
    this.imageUploaded = false,
  });

  final CustomerVehicle vehicle;
  final String? warning;
  final bool imageUploaded;
}

Future<VehicleFormResult?> showVehicleFormSheet(
  BuildContext context,
  VehicleGateway gateway, {
  CustomerVehicle? vehicle,
  AutoVisionRecognizer? recognizer,
  VehicleTextRecognizer? textRecognizer,
}) {
  return showModalBottomSheet<VehicleFormResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => _VehicleFormSheet(
      gateway: gateway,
      vehicle: vehicle,
      recognizer: recognizer ?? OnDeviceAutoVisionRecognizer(),
      textRecognizer: textRecognizer ?? MlKitVehicleTextRecognizer(),
    ),
  );
}

class _VehicleFormSheet extends StatefulWidget {
  const _VehicleFormSheet({
    required this.gateway,
    required this.recognizer,
    required this.textRecognizer,
    this.vehicle,
  });
  final VehicleGateway gateway;
  final AutoVisionRecognizer recognizer;
  final VehicleTextRecognizer textRecognizer;
  final CustomerVehicle? vehicle;

  @override
  State<_VehicleFormSheet> createState() => _VehicleFormSheetState();
}

class _VehicleFormSheetState extends State<_VehicleFormSheet> {
  static const _maxImageBytes = 8 * 1024 * 1024;

  final _formKey = GlobalKey<FormState>();
  final _imagePicker = ImagePicker();
  final _plate = TextEditingController();
  final _year = TextEditingController();
  final _color = TextEditingController();
  final _odometer = TextEditingController();
  final _vin = TextEditingController();
  List<VehicleBrand> _brands = const [];
  List<VehicleModel> _models = const [];
  int? _selectedBrandId;
  int? _selectedModelId;
  bool _isLoadingBrands = true;
  bool _isLoadingModels = false;
  bool _isSubmitting = false;
  String? _catalogError;
  String? _error;
  XFile? _selectedImage;
  AutoVisionResult? _recognition;
  String? _recognitionError;
  bool _isRecognizing = false;
  bool _isScanningText = false;
  String? _scanError;
  VehicleScanTarget? _scanTarget;
  int _imageVersion = 0;
  bool get _isEditing => widget.vehicle != null;

  @override
  void initState() {
    super.initState();
    final vehicle = widget.vehicle;
    if (vehicle != null) {
      _plate.text = vehicle.licensePlate;
      _year.text = vehicle.year?.toString() ?? '';
      _color.text = vehicle.color;
      _odometer.text = vehicle.odometer?.toString() ?? '';
      _vin.text = vehicle.vin;
    }
    _loadBrands();
  }

  @override
  void dispose() {
    for (final controller in [_plate, _year, _color, _odometer, _vin]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadBrands() async {
    setState(() {
      _isLoadingBrands = true;
      _catalogError = null;
      _brands = const [];
      _models = const [];
      _selectedBrandId = null;
      _selectedModelId = null;
    });
    try {
      final brands = await widget.gateway.loadBrands();
      if (!mounted) return;
      setState(() {
        _brands = brands;
        if (brands.isEmpty) {
          _catalogError = 'Garage chưa cấu hình hãng xe đang hoạt động.';
        }
      });
      final vehicle = widget.vehicle;
      if (vehicle != null &&
          brands.any((brand) => brand.id == vehicle.brandId)) {
        await _selectBrand(vehicle.brandId);
        if (!mounted) return;
        if (_models.any((model) => model.id == vehicle.modelId)) {
          setState(() => _selectedModelId = vehicle.modelId);
        }
      }
    } on VehicleException catch (error) {
      if (mounted) setState(() => _catalogError = error.message);
    } finally {
      if (mounted) setState(() => _isLoadingBrands = false);
    }
  }

  Future<void> _selectBrand(int? brandId) async {
    setState(() {
      _selectedBrandId = brandId;
      _selectedModelId = null;
      _models = const [];
      _catalogError = null;
      _isLoadingModels = brandId != null;
    });
    if (brandId == null) return;

    try {
      final models = await widget.gateway.loadModels(brandId);
      if (!mounted || _selectedBrandId != brandId) return;
      setState(() {
        _models = models;
        if (models.isEmpty) {
          _catalogError = 'Hãng xe đã chọn chưa có model đang hoạt động.';
        }
      });
    } on VehicleException catch (error) {
      if (mounted && _selectedBrandId == brandId) {
        setState(() => _catalogError = error.message);
      }
    } finally {
      if (mounted && _selectedBrandId == brandId) {
        setState(() => _isLoadingModels = false);
      }
    }
  }

  Future<void> _retryCatalog() async {
    final brandId = _selectedBrandId;
    if (brandId == null) {
      await _loadBrands();
    } else {
      await _selectBrand(brandId);
    }
  }

  String _formatLicensePlate(String raw) {
    final upper = raw.trim().toUpperCase().replaceAll(' ', '');
    if (RegExp(r'^\d{2}[A-Z]\d{5}$').hasMatch(upper)) {
      return '${upper.substring(0, 3)}-${upper.substring(3)}';
    }
    return upper;
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() => _error = null);
    final formattedPlate = _formatLicensePlate(_plate.text);
    if (_plate.text != formattedPlate) {
      _plate.text = formattedPlate;
    }
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      final vehicle = _isEditing
          ? await widget.gateway.updateVehicle(
              widget.vehicle!.id,
              UpdateCustomerVehicle(
                brandId: _selectedBrandId!,
                modelId: _selectedModelId!,
                year: int.tryParse(_year.text) ?? widget.vehicle!.year,
                color: _color.text,
                odometer:
                    int.tryParse(_odometer.text) ?? widget.vehicle!.odometer,
                vin: _vin.text,
              ),
            )
          : await widget.gateway.createVehicle(
              CreateCustomerVehicle(
                licensePlate: _plate.text,
                brandId: _selectedBrandId!,
                modelId: _selectedModelId!,
                year: int.tryParse(_year.text),
                color: _color.text,
                odometer: int.tryParse(_odometer.text),
                vin: _vin.text,
              ),
            );
      String? warning;
      var imageUploaded = false;
      if (_selectedImage != null) {
        try {
          await widget.gateway.uploadVehicleImage(
            vehicle.id,
            _selectedImage!.path,
          );
          imageUploaded = true;
        } on VehicleException catch (error) {
          warning =
              'Đã lưu thông tin xe nhưng ảnh chưa tải lên: ${error.message}';
        }
      }
      if (mounted) {
        Navigator.pop(
          context,
          VehicleFormResult(
            vehicle,
            warning: warning,
            imageUploaded: imageUploaded,
          ),
        );
      }
    } on VehicleException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String? _maxLength(String? value, int max, String label) {
    return (value?.trim().length ?? 0) > max
        ? '$label không được vượt quá $max ký tự.'
        : null;
  }

  Future<void> _chooseImageSource() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Thêm ảnh xe',
                style: Theme.of(
                  sheetContext,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('Chụp ảnh'),
                subtitle: const Text('Mở camera trên thiết bị'),
                onTap: () => Navigator.pop(sheetContext, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Chọn từ thư viện'),
                subtitle: const Text('JPEG, PNG hoặc WebP, tối đa 8 MB'),
                onTap: () => Navigator.pop(sheetContext, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null || !mounted) return;

    if (source == ImageSource.camera) {
      final permission = await Permission.camera.request();
      if (!permission.isGranted) {
        if (mounted) await _showCameraPermissionDialog(permission);
        return;
      }
    }

    try {
      final image = await _imagePicker.pickImage(
        source: source,
        imageQuality: 82,
        maxWidth: 1920,
        maxHeight: 1920,
      );
      if (image == null) return;
      if (await image.length() > _maxImageBytes) {
        if (mounted) {
          setState(() => _error = 'Ảnh xe không được vượt quá 8 MB.');
        }
        return;
      }
      if (mounted) {
        setState(() {
          _selectedImage = image;
          _imageVersion++;
          _isRecognizing = false;
          _recognition = null;
          _recognitionError = null;
          _error = null;
        });
      }
    } on Object {
      if (mounted) {
        setState(() => _error = 'Không thể mở ảnh. Vui lòng thử lại.');
      }
    }
  }

  Future<void> _recognizeImage() async {
    final image = _selectedImage;
    if (image == null) return;
    final version = _imageVersion;
    setState(() {
      _isRecognizing = true;
      _recognition = null;
      _recognitionError = null;
    });
    try {
      final result = await widget.recognizer.recognize(image.path);
      if (!mounted || version != _imageVersion) return;
      setState(() => _recognition = result);
    } on Object {
      if (mounted && version == _imageVersion) {
        setState(
          () => _recognitionError =
              'Không thể nhận diện ảnh xe trên thiết bị. Vui lòng chọn hãng và dòng xe thủ công.',
        );
      }
    } finally {
      if (mounted && version == _imageVersion) {
        setState(() => _isRecognizing = false);
      }
    }
  }

  Future<void> _applyRecognition() async {
    final rec = _recognition;
    if (rec == null) return;

    // Nếu mô hình nhận diện là xe lạ / không chắc chắn -> gán vào loại xe "Khác"
    if (rec.isOther || !rec.accepted || rec.suggestion == null) {
      final otherBrand = _brands.where(
        (b) =>
            b.name.toLowerCase().contains('khác') ||
            b.name.toLowerCase() == 'other',
      );
      if (otherBrand.isNotEmpty) {
        final otherBrandId = otherBrand.first.id;
        setState(() => _isLoadingModels = true);
        try {
          final models = await widget.gateway.loadModels(otherBrandId);
          if (!mounted) return;
          final otherModel = models.where(
            (m) =>
                m.name.toLowerCase().contains('khác') ||
                m.name.toLowerCase() == 'other',
          );
          setState(() {
            _selectedBrandId = otherBrandId;
            _models = models;
            _selectedModelId =
                otherModel.isNotEmpty ? otherModel.first.id : null;
            _catalogError = null;
            _recognitionError = null;
          });
        } on VehicleException catch (error) {
          if (mounted) setState(() => _recognitionError = error.message);
        } finally {
          if (mounted) setState(() => _isLoadingModels = false);
        }
      } else {
        setState(
          () => _recognitionError =
              'Danh mục garage chưa có hãng "Khác". Vui lòng chọn thủ công.',
        );
      }
      return;
    }

    final suggestion = rec.suggestion!;
    final brand = _brands.where(
      (item) => _sameCatalogName(item.name, suggestion.make),
    );
    if (brand.isEmpty) {
      // Nếu hãng nhận diện chưa có trong database -> fallback về "Khác"
      final otherBrand = _brands.where(
        (b) =>
            b.name.toLowerCase().contains('khác') ||
            b.name.toLowerCase() == 'other',
      );
      if (otherBrand.isNotEmpty) {
        final otherBrandId = otherBrand.first.id;
        setState(() => _isLoadingModels = true);
        try {
          final models = await widget.gateway.loadModels(otherBrandId);
          if (!mounted) return;
          final otherModel = models.where(
            (m) =>
                m.name.toLowerCase().contains('khác') ||
                m.name.toLowerCase() == 'other',
          );
          setState(() {
            _selectedBrandId = otherBrandId;
            _models = models;
            _selectedModelId =
                otherModel.isNotEmpty ? otherModel.first.id : null;
            _catalogError = null;
            _recognitionError = null;
          });
        } on VehicleException catch (error) {
          if (mounted) setState(() => _recognitionError = error.message);
        } finally {
          if (mounted) setState(() => _isLoadingModels = false);
        }
      } else {
        setState(
          () => _recognitionError =
              'Hãng ${suggestion.make} chưa có trong danh mục garage. Vui lòng chọn thủ công.',
        );
      }
      return;
    }

    final version = _imageVersion;
    final previousBrandId = _selectedBrandId;
    final previousModelId = _selectedModelId;
    setState(() => _isLoadingModels = true);
    try {
      final models = await widget.gateway.loadModels(brand.first.id);
      if (!mounted ||
          version != _imageVersion ||
          previousBrandId != _selectedBrandId ||
          previousModelId != _selectedModelId) {
        return;
      }
      final matched = models.where(
        (item) => _sameCatalogName(item.name, suggestion.model),
      );
      final modelId = matched.isNotEmpty
          ? matched.first.id
          : models
              .where(
                (m) =>
                    m.name.toLowerCase().contains('khác') ||
                    m.name.toLowerCase() == 'other',
              )
              .firstOrNull
              ?.id;

      setState(() {
        _selectedBrandId = brand.first.id;
        _models = models;
        _selectedModelId = modelId;
        _catalogError = null;
        _recognitionError = null;
      });
    } on VehicleException catch (error) {
      if (mounted) setState(() => _recognitionError = error.message);
    } finally {
      if (mounted) setState(() => _isLoadingModels = false);
    }
  }

  bool _sameCatalogName(String a, String b) =>
      a.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '') ==
      b.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');

  Future<void> _scanTextFromPhoto(VehicleScanTarget target) async {
    if (_isScanningText ||
        _isSubmitting ||
        (_isEditing && target == VehicleScanTarget.plate)) {
      return;
    }
    setState(() {
      _scanTarget = target;
      _scanError = null;
    });
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text('Quét ${_scanTargetLabel(target)}'),
              subtitle: const Text(
                'Chụp cận cảnh và đủ sáng để đọc rõ thông tin.',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Chụp ảnh trực tiếp'),
              onTap: () => Navigator.pop(sheetContext, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Chọn ảnh từ thư viện'),
              onTap: () => Navigator.pop(sheetContext, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    if (source == ImageSource.camera) {
      final permission = await Permission.camera.request();
      if (!permission.isGranted) {
        if (mounted) await _showCameraPermissionDialog(permission);
        return;
      }
    }

    try {
      final image = await _imagePicker.pickImage(
        source: source,
        imageQuality: 95,
        maxWidth: 2560,
        maxHeight: 2560,
      );
      if (image == null || !mounted) return;
      setState(() {
        _isScanningText = true;
        _scanError = null;
      });
      final text = await widget.textRecognizer.recognize(image.path);
      if (!mounted) return;
      final result = extractVehicleText(text, target);
      final details = <String>[
        if (!_isEditing && result.plate != null) 'Biển số: ${result.plate}',
        if (result.vin != null) 'Số khung / VIN: ${result.vin}',
        if (result.odometer != null) 'ODO: ${result.odometer} km',
        if (result.year != null) 'Năm sản xuất: ${result.year}',
      ];
      if (details.isEmpty) {
        setState(
          () => _scanError =
              'Không đọc được thông tin phù hợp từ ảnh. Hãy chụp gần hơn hoặc nhập thủ công.',
        );
        return;
      }
      final approved = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Kiểm tra kết quả quét'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final detail in details) Text(detail),
              const SizedBox(height: 12),
              const Text(
                'Hãy đối chiếu với ảnh gốc. Thông tin chỉ được lưu khi bạn bấm lưu xe.',
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Bỏ qua'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Điền vào form'),
            ),
          ],
        ),
      );
      if (approved != true || !mounted) return;
      setState(() {
        if (!_isEditing && result.plate != null) _plate.text = result.plate!;
        if (result.vin != null) _vin.text = result.vin!;
        if (result.odometer != null) {
          _odometer.text = result.odometer.toString();
        }
        if (result.year != null) _year.text = result.year.toString();
        _scanError = null;
      });
    } on Object {
      if (mounted) {
        setState(
          () => _scanError =
              'Không thể đọc chữ trong ảnh trên thiết bị. Hãy thử lại hoặc nhập thủ công.',
        );
      }
    } finally {
      if (mounted) setState(() => _isScanningText = false);
    }
  }

  String _scanTargetLabel(VehicleScanTarget target) => switch (target) {
    VehicleScanTarget.plate => 'biển số xe',
    VehicleScanTarget.vin => 'số khung / VIN',
    VehicleScanTarget.odometer => 'đồng hồ ODO',
    VehicleScanTarget.registration => 'giấy đăng ký xe',
    VehicleScanTarget.year => 'năm sản xuất',
  };

  Widget? _scanFieldAction(VehicleScanTarget target) {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return null;
    final isCurrentTarget = _scanTarget == target;
    final isReading = _isScanningText && isCurrentTarget;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        IconButton(
          key: ValueKey('vehicle-text-scan-${target.name}'),
          tooltip: _isEditing && target == VehicleScanTarget.plate
              ? 'Biển số xe đã lưu không thể thay đổi'
              : 'Chụp hoặc chọn ảnh ${_scanTargetLabel(target)}',
          onPressed:
              _isScanningText ||
                  _isSubmitting ||
                  (_isEditing && target == VehicleScanTarget.plate)
              ? null
              : () => _scanTextFromPhoto(target),
          iconSize: 20,
          color: AppColors.primaryContainer,
          icon: isReading
              ? const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.photo_camera_outlined),
        ),
        if (isCurrentTarget && _scanError != null)
          Text(
            _scanError!,
            key: const ValueKey('vehicle-text-scan-error'),
            style: const TextStyle(color: AppColors.danger, fontSize: 12),
          ),
      ],
    );
  }

  Future<void> _showCameraPermissionDialog(PermissionStatus status) {
    final canOpenSettings = status.isPermanentlyDenied || status.isRestricted;
    return showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(
          Icons.no_photography_outlined,
          color: AppColors.warning,
        ),
        title: const Text('Cần quyền sử dụng camera'),
        content: const Text(
          'AutoCare cần quyền camera để chụp ảnh xe, biển số, đồng hồ ODO hoặc số khung VIN. '
          'Bạn vẫn có thể chọn ảnh từ thư viện.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Để sau'),
          ),
          if (canOpenSettings)
            FilledButton(
              onPressed: () async {
                Navigator.pop(dialogContext);
                await openAppSettings();
              },
              child: const Text('Mở cài đặt'),
            ),
        ],
      ),
    );
  }

  InputDecoration _fieldDecoration({String? hintText, String? suffixText}) {
    return InputDecoration(
      hintText: hintText,
      suffixText: suffixText,
      filled: true,
      fillColor: const Color(0xFFFAFCFF),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentYear = DateTime.now().year;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.only(bottom: 14),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.directions_car_outlined,
                        color: AppColors.primaryContainer,
                        size: 21,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isEditing
                                ? 'Chỉnh sửa thông tin xe'
                                : 'Đăng ký xe mới',
                            style: const TextStyle(
                              color: Color(0xFF0F172A),
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            _isEditing
                                ? 'Cập nhật thông tin phương tiện của bạn'
                                : 'Thêm phương tiện để tự động nhận lịch định kỳ',
                            style: const TextStyle(
                              color: Color(0xFF64748B),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF4FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Bảo mật xe',
                        style: TextStyle(
                          color: AppColors.primaryContainer,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (_catalogError != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_catalogError!)),
                      TextButton(
                        key: const ValueKey('vehicle-catalog-retry-button'),
                        onPressed: _isLoadingBrands || _isLoadingModels
                            ? null
                            : _retryCatalog,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _VehicleFormField(
                      label: 'Biển số xe',
                      required: true,
                      footer: _scanFieldAction(VehicleScanTarget.plate),
                      child: TextFormField(
                        key: const ValueKey('vehicle-license-plate-field'),
                        controller: _plate,
                        readOnly: _isEditing,
                        enabled: !_isSubmitting,
                        textCapitalization: TextCapitalization.characters,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        ),
                        decoration: _fieldDecoration(
                          hintText: 'VD: 30K-999.99',
                        ),
                        onChanged: (val) {
                          final upper = val.toUpperCase();
                          if (RegExp(r'^\d{2}[A-Z]\d{1,5}$').hasMatch(upper)) {
                            final formatted =
                                '${upper.substring(0, 3)}-${upper.substring(3)}';
                            _plate.value = TextEditingValue(
                              text: formatted,
                              selection: TextSelection.collapsed(
                                offset: formatted.length,
                              ),
                            );
                          }
                        },
                        validator: (value) {
                          final formatted = _formatLicensePlate(value ?? '');
                          if (_plate.text != formatted) {
                            _plate.value = TextEditingValue(
                              text: formatted,
                              selection: TextSelection.collapsed(
                                offset: formatted.length,
                              ),
                            );
                          }
                          final plateRegex = RegExp(r'^\d{2}[A-Z]-\d{5}$');
                          if (!plateRegex.hasMatch(formatted)) {
                            return 'Biển số Không hợp lệ.';
                          }
                          return null;
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _VehicleFormField(
                      label: 'Hãng xe',
                      required: true,
                      child: SizedBox(
                        key: const ValueKey('vehicle-brand-field'),
                        child: DropdownButtonFormField<int>(
                          key: ValueKey(
                            'vehicle-brand-dropdown-${_selectedBrandId ?? 0}',
                          ),
                          initialValue: _selectedBrandId,
                          isExpanded: true,
                          decoration: _fieldDecoration(
                            hintText: _isLoadingBrands
                                ? 'Đang tải hãng xe...'
                                : 'Chọn hãng xe',
                          ),
                          items: _brands
                              .map(
                                (brand) => DropdownMenuItem<int>(
                                  value: brand.id,
                                  child: Text(
                                    brand.name,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              )
                              .toList(growable: false),
                          onChanged:
                              _isSubmitting ||
                                  _isLoadingBrands ||
                                  _brands.isEmpty
                              ? null
                              : _selectBrand,
                          validator: (value) =>
                              value == null ? 'Vui lòng chọn hãng xe.' : null,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (_isEditing)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'Biển số được giữ nguyên. Liên hệ garage nếu cần đổi biển số.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 3,
                    child: _VehicleFormField(
                      label: 'Dòng xe / Model',
                      required: true,
                      child: SizedBox(
                        key: const ValueKey('vehicle-model-field'),
                        child: DropdownButtonFormField<int>(
                          key: ValueKey(
                            'vehicle-model-dropdown-${_selectedBrandId ?? 0}-${_selectedModelId ?? 0}',
                          ),
                          initialValue: _selectedModelId,
                          isExpanded: true,
                          decoration: _fieldDecoration(
                            hintText: _selectedBrandId == null
                                ? 'Chọn hãng trước'
                                : _isLoadingModels
                                ? 'Đang tải model...'
                                : 'Chọn model xe',
                          ),
                          items: _models
                              .map(
                                (model) => DropdownMenuItem<int>(
                                  value: model.id,
                                  child: Text(
                                    model.name,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              )
                              .toList(growable: false),
                          onChanged:
                              _isSubmitting ||
                                  _isLoadingModels ||
                                  _models.isEmpty
                              ? null
                              : (value) =>
                                    setState(() => _selectedModelId = value),
                          validator: (value) =>
                              value == null ? 'Vui lòng chọn model xe.' : null,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: _VehicleFormField(
                      label: 'Năm SX',
                      child: TextFormField(
                        controller: _year,
                        enabled: !_isSubmitting,
                        keyboardType: TextInputType.number,
                        decoration: _fieldDecoration(
                          hintText: currentYear.toString(),
                        ),
                        validator: (value) {
                          if (value?.trim().isEmpty ?? true) return null;
                          final year = int.tryParse(value!.trim());
                          return year == null ||
                                  year < 1950 ||
                                  year > currentYear + 1
                              ? 'Năm không hợp lệ.'
                              : null;
                        },
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _VehicleFormField(
                      label: 'Số ODO hiện tại',
                      footer: _scanFieldAction(VehicleScanTarget.odometer),
                      child: TextFormField(
                        controller: _odometer,
                        enabled: !_isSubmitting,
                        keyboardType: TextInputType.number,
                        decoration: _fieldDecoration(
                          hintText: '12,500',
                          suffixText: 'km',
                        ),
                        validator: (value) {
                          if (value?.trim().isEmpty ?? true) return null;
                          final number = int.tryParse(value!.trim());
                          return number == null || number < 0
                              ? 'Số không hợp lệ.'
                              : null;
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _VehicleFormField(
                      label: 'Số khung / VIN',
                      optional: true,
                      footer: _scanFieldAction(VehicleScanTarget.vin),
                      child: TextFormField(
                        controller: _vin,
                        enabled: !_isSubmitting,
                        textCapitalization: TextCapitalization.characters,
                        style: const TextStyle(letterSpacing: 0.5),
                        decoration: _fieldDecoration(hintText: '17 ký tự VIN'),
                        validator: (value) {
                          final normalized = value?.trim() ?? '';
                          if (normalized.isEmpty) return null;
                          final vinRegex = RegExp(r'^[a-zA-Z0-9]{1,17}$');
                          return !vinRegex.hasMatch(normalized)
                              ? 'Số khung không hợp lệ.'
                              : null;
                        },
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _VehicleFormField(
                label: 'Màu xe',
                optional: true,
                child: TextFormField(
                  controller: _color,
                  enabled: !_isSubmitting,
                  textCapitalization: TextCapitalization.words,
                  decoration: _fieldDecoration(hintText: 'VD: Trắng'),
                  validator: (value) {
                    final normalized = value?.trim() ?? '';
                    if (normalized.isEmpty) return null;
                    final colorRegex = RegExp(r'^[a-zA-ZÀ-ỹ\s]{1,50}$');
                    return !colorRegex.hasMatch(normalized)
                        ? 'Màu xe không hợp lệ.'
                        : null;
                  },
                ),
              ),
              const SizedBox(height: 14),
              _VehicleFormField(
                label: 'Ảnh xe',
                optional: true,
                child: _VehicleImagePlaceholder(
                  enabled: !_isSubmitting,
                  selectedImage: _selectedImage,
                  onTap: _chooseImageSource,
                  onRemove: () => setState(() {
                    _selectedImage = null;
                    _imageVersion++;
                    _isRecognizing = false;
                    _recognition = null;
                    _recognitionError = null;
                  }),
                ),
              ),
              if (_selectedImage != null) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  key: const ValueKey('vehicle-autovision-recognize'),
                  onPressed: _isRecognizing || _isSubmitting
                      ? null
                      : _recognizeImage,
                  icon: _isRecognizing
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome_outlined),
                  label: Text(
                    _isRecognizing
                        ? 'Đang nhận diện...'
                        : 'Nhận diện hãng và dòng từ ảnh xe',
                  ),
                ),
              ],
              if (_recognition != null) ...[
                const SizedBox(height: 8),
                Text(
                  _recognition!.isOther || _recognition!.suggestion == null
                      ? 'Không nhận diện được xe (đã liệt kê vào loại xe: Khác). Hãy kiểm tra trước khi áp dụng.'
                      : 'Nhận diện được: ${_recognition!.suggestion!.make} ${_recognition!.suggestion!.model} (${(_recognition!.suggestion!.confidence * 100).toStringAsFixed(0)}%). Hãy kiểm tra trước khi áp dụng.',
                  key: const ValueKey('vehicle-autovision-result'),
                ),
                TextButton(
                  key: const ValueKey('vehicle-autovision-apply'),
                  onPressed:
                      _isLoadingBrands || _isLoadingModels || _isSubmitting
                          ? null
                          : _applyRecognition,
                  child: const Text('Áp dụng thông tin hãng và dòng xe'),
                ),
              ],
              if (_recognitionError != null)
                Text(
                  _recognitionError!,
                  key: const ValueKey('vehicle-autovision-error'),
                  style: const TextStyle(color: AppColors.danger),
                ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline_rounded,
                        color: AppColors.danger,
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              FilledButton.icon(
                key: const ValueKey('vehicle-submit-button'),
                onPressed:
                    _isSubmitting ||
                        _isScanningText ||
                        _isLoadingBrands ||
                        _isLoadingModels
                    ? null
                    : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primaryContainer,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(56),
                ),
                icon: _isSubmitting
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        _isEditing
                            ? Icons.save_outlined
                            : Icons.add_circle_outline_rounded,
                      ),
                label: Text(
                  _isSubmitting
                      ? (_isEditing ? 'Đang lưu...' : 'Đang thêm xe...')
                      : (_isEditing ? 'Lưu thay đổi' : 'Thêm xe vào danh sách'),
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF4F8FF),
                  border: Border.all(color: const Color(0xFFD7E5FF)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.help_outline_rounded,
                      size: 18,
                      color: AppColors.primaryContainer,
                    ),
                    SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        'Cần hỗ trợ tra cứu lịch sử sửa chữa xe đời cũ? '
                        'Vui lòng liên hệ garage để được hỗ trợ liên kết.',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 11,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VehicleFormField extends StatelessWidget {
  const _VehicleFormField({
    required this.label,
    required this.child,
    this.footer,
    this.required = false,
    this.optional = false,
  });

  final String label;
  final Widget child;
  final Widget? footer;
  final bool required;
  final bool optional;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            text: label,
            children: [
              if (required)
                const TextSpan(
                  text: ' *',
                  style: TextStyle(color: AppColors.danger),
                ),
              if (optional)
                const TextSpan(
                  text: ' (Tùy chọn)',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontWeight: FontWeight.w400,
                  ),
                ),
            ],
          ),
          style: const TextStyle(
            color: Color(0xFF334155),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        child,
        if (footer != null)
          Align(alignment: Alignment.centerRight, child: footer!),
      ],
    );
  }
}

class _VehicleImagePlaceholder extends StatelessWidget {
  const _VehicleImagePlaceholder({
    required this.enabled,
    required this.selectedImage,
    required this.onTap,
    required this.onRemove,
  });

  final bool enabled;
  final XFile? selectedImage;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: enabled,
      label: selectedImage == null ? 'Thêm ảnh xe' : 'Thay đổi ảnh xe',
      child: InkWell(
        key: const ValueKey('vehicle-image-placeholder'),
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: CustomPaint(
          painter: _DashedBorderPainter(
            color: const Color(0xFFCBD5E1),
            radius: 12,
          ),
          child: selectedImage != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    children: [
                      AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Image.file(
                          File(selectedImage!.path),
                          key: const ValueKey('vehicle-image-preview'),
                          fit: BoxFit.cover,
                          width: double.infinity,
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: IconButton.filledTonal(
                          tooltip: 'Bỏ ảnh đã chọn',
                          onPressed: enabled ? onRemove : null,
                          icon: const Icon(Icons.close_rounded),
                        ),
                      ),
                      const Positioned(
                        left: 10,
                        bottom: 10,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Color(0xB3000000),
                            borderRadius: BorderRadius.all(Radius.circular(8)),
                          ),
                          child: Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 5,
                            ),
                            child: Text(
                              'Nhấn để thay đổi ảnh',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC).withValues(alpha: 0.72),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          borderRadius: BorderRadius.circular(9),
                        ),
                        child: const Icon(
                          Icons.add_a_photo_outlined,
                          color: AppColors.primaryContainer,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Chụp hoặc chọn ảnh xe',
                              style: TextStyle(
                                color: Color(0xFF1E293B),
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'JPEG, PNG hoặc WebP • tối đa 8 MB',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Tải lên',
                          style: TextStyle(
                            color: AppColors.primaryContainer,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  const _DashedBorderPainter({required this.color, required this.radius});

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)),
      );

    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final end = distance + 6 < metric.length ? distance + 6 : metric.length;
        canvas.drawPath(metric.extractPath(distance, end), paint);
        distance += 10;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedBorderPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.radius != radius;
  }
}
