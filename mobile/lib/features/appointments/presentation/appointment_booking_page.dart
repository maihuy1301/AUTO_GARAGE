import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../data/appointment_service.dart';
import '../domain/appointment_models.dart';
import '../../vehicles/data/vehicle_service.dart';
import '../../vehicles/presentation/vehicle_form_sheet.dart';

class AppointmentBookingPage extends StatefulWidget {
  const AppointmentBookingPage({
    super.key,
    this.gateway,
    this.vehicleGateway,
    this.initialVehicleId,
    this.initialBranchId,
    this.confirmBeforeSubmit = false,
    this.onBooked,
  });

  final AppointmentGateway? gateway;
  final VehicleGateway? vehicleGateway;
  final int? initialVehicleId;
  final int? initialBranchId;
  final bool confirmBeforeSubmit;
  final ValueChanged<AppointmentBookingResult>? onBooked;

  @override
  State<AppointmentBookingPage> createState() => _AppointmentBookingPageState();
}

class _AppointmentBookingPageState extends State<AppointmentBookingPage> {
  final _formKey = GlobalKey<FormState>();
  final _noteController = TextEditingController();
  final _dateController = TextEditingController();
  final _timeController = TextEditingController();

  late AppointmentGateway _gateway;
  bool _initialized = false;
  bool _isLoading = true;
  bool _isLoadingAppointments = true;
  bool _isSubmitting = false;
  bool _confirming = false;
  String? _loadError;
  String? _appointmentsError;
  String? _submitError;
  AppointmentBookingOptions? _options;
  List<AppointmentBookingResult> _appointments = const [];
  AppointmentBookingResult? _result;
  final Set<int> _cancellingIds = {};
  Set<int> _selectedServiceIds = {};
  int _selectedView = 0;
  int? _vehicleId;
  int? _branchId;
  DateTime? _appointmentTime;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _gateway = widget.gateway ?? context.read<AppointmentGateway>();
    _initialized = true;
    _loadOptions();
    _loadAppointments();
  }

  @override
  void dispose() {
    _noteController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    super.dispose();
  }

  Future<void> _loadOptions({int? preferredVehicleId}) async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });
    try {
      final options = await _gateway.loadBookingOptions();
      if (!mounted) return;
      setState(() {
        _options = options;
        final currentVehicleIsAvailable = options.vehicles.any(
          (vehicle) => vehicle.id == _vehicleId,
        );
        final requestedVehicleId =
            preferredVehicleId ?? widget.initialVehicleId;
        final preferredVehicleIsAvailable = options.vehicles.any(
          (vehicle) => vehicle.id == requestedVehicleId,
        );
        _vehicleId = preferredVehicleIsAvailable
            ? requestedVehicleId
            : currentVehicleIsAvailable
            ? _vehicleId
            : options.vehicles.length == 1
            ? options.vehicles.first.id
            : null;
        _branchId = options.branches.any((b) => b.id == widget.initialBranchId)
            ? widget.initialBranchId
            : options.branches.length == 1
            ? options.branches.first.id
            : null;
      });
    } on AppointmentException catch (error) {
      if (mounted) setState(() => _loadError = error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _addVehicle() async {
    final vehicleGateway =
        widget.vehicleGateway ?? context.read<VehicleGateway>();
    final result = await showVehicleFormSheet(context, vehicleGateway);
    if (result == null || !mounted) return;
    await _loadOptions(preferredVehicleId: result.vehicle.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.warning ?? 'Đã thêm xe. Bạn có thể tiếp tục đặt lịch.',
        ),
        backgroundColor: result.warning == null ? null : AppColors.warning,
      ),
    );
  }

  Future<void> _loadAppointments() async {
    setState(() {
      _isLoadingAppointments = true;
      _appointmentsError = null;
    });
    try {
      final appointments = await _gateway.loadMyAppointments();
      if (!mounted) return;
      setState(() => _appointments = appointments);
    } on AppointmentException catch (error) {
      if (mounted) setState(() => _appointmentsError = error.message);
    } finally {
      if (mounted) setState(() => _isLoadingAppointments = false);
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final initial = _appointmentTime != null && _appointmentTime!.isAfter(now)
        ? _appointmentTime!
        : now.add(const Duration(days: 1));
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime(initial.year, initial.month, initial.day),
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 1, now.month, now.day),
      helpText: 'Chọn ngày hẹn',
    );
    if (date == null || !mounted) return;
    final currentTime = _appointmentTime == null
        ? const TimeOfDay(hour: 8, minute: 0)
        : TimeOfDay.fromDateTime(_appointmentTime!);
    _setAppointmentTime(date, currentTime);
  }

  Future<void> _pickTime() async {
    final now = DateTime.now();
    final initial = _appointmentTime == null
        ? const TimeOfDay(hour: 8, minute: 0)
        : TimeOfDay.fromDateTime(_appointmentTime!);
    final time = await showTimePicker(
      context: context,
      initialTime: initial,
      helpText: 'Chọn giờ hẹn',
    );
    if (time == null || !mounted) return;
    final date = _appointmentTime ?? now.add(const Duration(days: 1));
    _setAppointmentTime(date, time);
  }

  Future<void> _openServiceSelectionSheet(List<ServiceOption> services) async {
    final result = await showModalBottomSheet<Set<int>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _ServiceSelectionSheet(
        services: services,
        initialSelectedIds: _selectedServiceIds,
      ),
    );
    if (result != null && mounted) {
      setState(() {
        _selectedServiceIds = result;
      });
    }
  }

  void _setAppointmentTime(DateTime date, TimeOfDay time) {
    final value = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      _appointmentTime = value;
      _dateController.text = _formatDate(value);
      _timeController.text = _formatTime(value);
      _submitError = null;
    });
    _formKey.currentState?.validate();
  }

  Future<void> _submit() async {
    if (_isSubmitting || _confirming) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _submitError = null;
      _result = null;
    });
    if (!_formKey.currentState!.validate()) return;

    if (widget.confirmBeforeSubmit) {
      _confirming = true;
      final vehicle = _options!.vehicles.firstWhere((v) => v.id == _vehicleId);
      final branch = _options!.branches.firstWhere((b) => b.id == _branchId);
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Xác nhận gửi yêu cầu đặt lịch'),
          content: SingleChildScrollView(
            child: Text(
              '${vehicle.licensePlate}\n${branch.name}\n${_dateController.text} ${_timeController.text}\n${_options!.services.where((s) => _selectedServiceIds.contains(s.id)).map((s) => s.name).join(', ')}\n${_noteController.text}\n\nTiếp tân sẽ kiểm tra và xác nhận lịch sau.',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Kiểm tra lại'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Gửi yêu cầu'),
            ),
          ],
        ),
      );
      _confirming = false;
      if (confirmed != true || !mounted) return;
    }

    setState(() => _isSubmitting = true);
    try {
      final result = await _gateway.createAppointment(
        vehicleId: _vehicleId!,
        branchId: _branchId!,
        appointmentTime: _appointmentTime!,
        note: _noteController.text,
        serviceIds: _selectedServiceIds.isEmpty
            ? null
            : _selectedServiceIds.toList(),
      );
      if (!mounted) return;
      setState(() {
        _result = result;
        _appointments = [
          result,
          ..._appointments.where((appointment) => appointment.id != result.id),
        ];
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đặt lịch hẹn thành công.')));
      widget.onBooked?.call(result);
    } on AppointmentException catch (error) {
      if (mounted) setState(() => _submitError = error.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _cancelAppointment(AppointmentBookingResult appointment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hủy lịch hẹn?'),
        content: Text(
          'Bạn có muốn hủy lịch #${appointment.id} cho xe ${appointment.vehicleLicensePlate} không?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Giữ lịch'),
          ),
          FilledButton(
            key: const ValueKey('confirm-cancel-appointment'),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Hủy lịch'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _cancellingIds.add(appointment.id));
    try {
      final cancelled = await _gateway.cancelAppointment(appointment.id);
      if (!mounted) return;
      setState(() {
        _appointments = [
          for (final current in _appointments)
            if (current.id == cancelled.id) cancelled else current,
        ];
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đã hủy lịch hẹn.')));
    } on AppointmentException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _cancellingIds.remove(appointment.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => _selectedView == 0
            ? Future.wait([_loadOptions(), _loadAppointments()])
            : _loadAppointments(),
        child: ListView(
          key: const ValueKey('appointment-booking-page'),
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            _AppointmentHeader(
              appointmentCount: _appointments.length,
              onAddVehicle: _addVehicle,
            ),
            const SizedBox(height: 16),
            SegmentedButton<int>(
              key: const ValueKey('appointment-view-selector'),
              segments: const [
                ButtonSegment(
                  value: 0,
                  icon: Icon(Icons.add_circle_outline_rounded),
                  label: Text('Đặt lịch'),
                ),
                ButtonSegment(
                  value: 1,
                  icon: Icon(Icons.event_note_rounded),
                  label: Text('Lịch của tôi'),
                ),
              ],
              selected: {_selectedView},
              onSelectionChanged: (selection) {
                setState(() => _selectedView = selection.first);
              },
            ),
            const SizedBox(height: 20),
            if (_selectedView == 0) ..._buildBookingContent(context),
            if (_selectedView == 1) ..._buildAppointmentsContent(context),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildBookingContent(BuildContext context) {
    if (_isLoading) return const [_LoadingCard()];
    if (_loadError != null) {
      return [
        _MessageCard(
          icon: Icons.cloud_off_rounded,
          title: 'Chưa tải được dữ liệu',
          message: _loadError!,
          actionLabel: 'Thử lại',
          onAction: _loadOptions,
        ),
      ];
    }
    if (_options!.vehicles.isEmpty) {
      return [_NoVehicleCard(onAdd: _addVehicle)];
    }
    if (_options!.branches.isEmpty) {
      return const [
        _MessageCard(
          icon: Icons.store_mall_directory_outlined,
          title: 'Chưa có chi nhánh hoạt động',
          message: 'Vui lòng quay lại sau hoặc liên hệ garage để được hỗ trợ.',
        ),
      ];
    }
    return [_buildForm(context)];
  }

  List<Widget> _buildAppointmentsContent(BuildContext context) {
    if (_isLoadingAppointments) return const [_LoadingCard()];
    if (_appointmentsError != null) {
      return [
        _MessageCard(
          icon: Icons.cloud_off_rounded,
          title: 'Chưa tải được lịch hẹn',
          message: _appointmentsError!,
          actionLabel: 'Thử lại',
          onAction: _loadAppointments,
        ),
      ];
    }
    if (_appointments.isEmpty) {
      return const [
        _MessageCard(
          icon: Icons.event_busy_rounded,
          title: 'Chưa có lịch hẹn',
          message: 'Các lịch bạn tạo sẽ xuất hiện tại đây.',
        ),
      ];
    }
    return [
      for (final appointment in _appointments) ...[
        _AppointmentCard(
          appointment: appointment,
          isCancelling: _cancellingIds.contains(appointment.id),
          onCancel: () => _cancelAppointment(appointment),
          onDetails: () => context.push('/tracking/${appointment.id}'),
          formatDateTime: _formatDateTime,
        ),
        const SizedBox(height: 12),
      ],
    ];
  }

  Widget _buildForm(BuildContext context) {
    final options = _options!;
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionTitle(
                    icon: Icons.directions_car_filled_rounded,
                    title: 'Xe và chi nhánh',
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
                    key: const ValueKey('appointment-vehicle-field'),
                    initialValue: _vehicleId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Xe của bạn'),
                    items: [
                      for (final vehicle in options.vehicles)
                        DropdownMenuItem(
                          value: vehicle.id,
                          child: Text(
                            vehicle.description.isEmpty
                                ? vehicle.licensePlate
                                : '${vehicle.licensePlate} · ${vehicle.description}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: _isSubmitting
                        ? null
                        : (value) => setState(() => _vehicleId = value),
                    validator: (value) => value == null
                        ? 'Vui lòng chọn xe cần bảo dưỡng hoặc sửa chữa.'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<int>(
                    key: const ValueKey('appointment-branch-field'),
                    initialValue: _branchId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Chi nhánh'),
                    items: [
                      for (final branch in options.branches)
                        DropdownMenuItem(
                          value: branch.id,
                          child: Text(
                            branch.name,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: _isSubmitting
                        ? null
                        : (value) => setState(() => _branchId = value),
                    validator: (value) => value == null
                        ? 'Vui lòng chọn chi nhánh tiếp nhận.'
                        : null,
                  ),
                  if (_branchId != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      options.branches
                          .firstWhere((branch) => branch.id == _branchId)
                          .address,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionTitle(
                    icon: Icons.schedule_rounded,
                    title: 'Thời gian hẹn',
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 3,
                        child: TextFormField(
                          key: const ValueKey('appointment-date-field'),
                          controller: _dateController,
                          readOnly: true,
                          onTap: _isSubmitting ? null : _pickDate,
                          decoration: const InputDecoration(
                            labelText: 'Ngày',
                            suffixIcon: Icon(Icons.calendar_today_outlined),
                          ),
                          validator: (_) => _validateAppointmentTime(),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          key: const ValueKey('appointment-time-field'),
                          controller: _timeController,
                          readOnly: true,
                          onTap: _isSubmitting ? null : _pickTime,
                          decoration: const InputDecoration(
                            labelText: 'Giờ',
                            suffixIcon: Icon(Icons.access_time_rounded),
                          ),
                          validator: (_) =>
                              _appointmentTime == null ? 'Chọn giờ.' : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    key: const ValueKey('appointment-note-field'),
                    controller: _noteController,
                    enabled: !_isSubmitting,
                    minLines: 3,
                    maxLines: 5,
                    maxLength: 500,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      labelText: 'Ghi chú (không bắt buộc)',
                      alignLabelWithHint: true,
                      hintText: 'Mô tả nhu cầu bảo dưỡng hoặc tình trạng xe...',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: _SectionTitle(
                          icon: Icons.miscellaneous_services_rounded,
                          title: 'Đặt dịch vụ',
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Không bắt buộc',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Bạn có thể chọn trước các dịch vụ cần làm để garage chuẩn bị phụ tùng và kỹ thuật viên.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 14),
                  if (options.services.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Hiện chưa có danh sách dịch vụ chọn trước.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                      ),
                    )
                  else if (_selectedServiceIds.isEmpty)
                    InkWell(
                      key: const ValueKey('appointment-select-services-button'),
                      onTap: _isSubmitting
                          ? null
                          : () => _openServiceSelectionSheet(options.services),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.outlineVariant,
                            style: BorderStyle.solid,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primaryContainer.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.add_rounded,
                                color: AppColors.primary,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Chọn dịch vụ bạn muốn làm',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall
                                        ?.copyWith(
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary,
                                        ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Duyệt ${options.services.length} dịch vụ theo danh mục...',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                          color: AppColors.onSurfaceVariant,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.chevron_right_rounded,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ],
                        ),
                      ),
                    )
                  else ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.25),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.checklist_rounded,
                                size: 20,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Đã chọn ${_selectedServiceIds.length} dịch vụ',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                              TextButton.icon(
                                key: const ValueKey('appointment-select-services-button'),
                                onPressed: _isSubmitting
                                    ? null
                                    : () => _openServiceSelectionSheet(options.services),
                                icon: const Icon(Icons.edit_outlined, size: 16),
                                label: const Text('Thay đổi'),
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final sId in _selectedServiceIds) ...[
                                () {
                                  final service = options.services.firstWhere(
                                    (s) => s.id == sId,
                                    orElse: () => ServiceOption(
                                      id: sId,
                                      name: 'Dịch vụ #$sId',
                                    ),
                                  );
                                  return InputChip(
                                    label: Text(
                                      service.name,
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    deleteIcon: const Icon(Icons.close_rounded, size: 14),
                                    onDeleted: _isSubmitting
                                        ? null
                                        : () {
                                            setState(() {
                                              _selectedServiceIds.remove(sId);
                                            });
                                          },
                                  );
                                }(),
                              ],
                            ],
                          ),
                          if (_selectedServiceIds.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            () {
                              double totalLabor = 0;
                              double totalParts = 0;
                              final List<ServicePartOption> allSelectedParts = [];
                              for (final sId in _selectedServiceIds) {
                                final s = options.services.cast<ServiceOption?>().firstWhere(
                                      (srv) => srv?.id == sId,
                                      orElse: () => null,
                                    );
                                if (s != null) {
                                  totalLabor += s.price ?? 0;
                                  totalParts += s.estimatedPartsCost ?? 0;
                                  allSelectedParts.addAll(s.parts);
                                }
                              }
                              final grandTotal = totalLabor + totalParts;
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceContainer,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.5)),
                                ),
                                child: Column(
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('Tiền công (${_selectedServiceIds.length} dịch vụ):', style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
                                        Text(_formatCurrency(totalLabor), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                    if (allSelectedParts.isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: AppColors.surfaceContainerLow,
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.3)),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                const Icon(Icons.build_circle_outlined, size: 13, color: AppColors.primary),
                                                const SizedBox(width: 4),
                                                Text(
                                                  'Phụ tùng định mức (${allSelectedParts.length} món):',
                                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            for (final part in allSelectedParts)
                                              Padding(
                                                padding: const EdgeInsets.only(top: 2),
                                                child: Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        '• ${part.name} (x${part.quantity}${part.unit != null && part.unit!.isNotEmpty ? ' ${part.unit}' : ''})',
                                                        style: const TextStyle(fontSize: 10),
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                    Text(
                                                      _formatCurrency(part.totalPrice),
                                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                    ],
                                    if (totalParts > 0) ...[
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Tổng tiền phụ tùng dự kiến:', style: TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
                                          Text(_formatCurrency(totalParts), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                        ],
                                      ),
                                    ],
                                    const Divider(height: 12),
                                    const Text(
                                      'Báo giá sơ bộ theo dịch vụ đã chọn, có thể thay đổi '
                                      'sau khi kiểm tra xe. Số tiền thanh toán được thể hiện '
                                      'trên hóa đơn của garage.',
                                      style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        const Text('Tổng chi phí ước tính:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
                                        Text(_formatCurrency(grandTotal), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            }(),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (_submitError != null) ...[
            const SizedBox(height: 14),
            _InlineStatus(
              icon: Icons.error_outline_rounded,
              color: AppColors.danger,
              message: _submitError!,
            ),
          ],
          if (_result != null) ...[
            const SizedBox(height: 14),
            _InlineStatus(
              key: const ValueKey('appointment-success'),
              icon: Icons.check_circle_outline_rounded,
              color: AppColors.success,
              message:
                  'Đã tạo lịch #${_result!.id} cho xe ${_result!.vehicleLicensePlate} tại ${_result!.branchName}. Trạng thái: Chờ xác nhận.',
            ),
          ],
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const ValueKey('appointment-submit-button'),
            onPressed: _isSubmitting ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.secondaryContainer,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(56),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: _isSubmitting
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.event_available_rounded),
            label: Text(_isSubmitting ? 'Đang gửi...' : 'Xác nhận đặt lịch'),
          ),
          const SizedBox(height: 10),
          Text(
            'Xe thuộc tài khoản và quyền tạo lịch sẽ được máy chủ kiểm tra trước khi ghi nhận.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  String? _validateAppointmentTime() {
    final value = _appointmentTime;
    if (value == null) return 'Vui lòng chọn ngày.';
    if (!value.isAfter(DateTime.now())) {
      return 'Thời gian hẹn phải ở tương lai.';
    }
    return null;
  }

  String _formatDate(DateTime value) =>
      '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year}';

  String _formatTime(DateTime value) =>
      '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';

  String _formatDateTime(DateTime value) =>
      '${_formatTime(value)} · ${_formatDate(value)}';
}

class _AppointmentHeader extends StatelessWidget {
  const _AppointmentHeader({
    required this.appointmentCount,
    required this.onAddVehicle,
  });

  final int appointmentCount;
  final VoidCallback onAddVehicle;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.18),
            blurRadius: 14,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.primaryContainer,
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AUTOCARE SYSTEM',
                        style: TextStyle(
                          color: Color(0xFFBFDBFE),
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                        ),
                      ),
                      Text(
                        'Lịch hẹn dịch vụ',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  key: const ValueKey('appointment-header-add-vehicle-button'),
                  onPressed: onAddVehicle,
                  color: Colors.white,
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.13),
                    minimumSize: const Size.square(48),
                  ),
                  icon: const Icon(Icons.add_rounded, size: 28),
                  tooltip: 'Thêm xe',
                ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1E40AF), Color(0xFF2563EB)],
              ),
            ),
            child: Stack(
              children: [
                const Positioned(
                  right: -4,
                  bottom: -20,
                  child: Icon(
                    Icons.calendar_month_rounded,
                    color: Color(0x24FFFFFF),
                    size: 100,
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Chăm sóc xe đúng hẹn',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Chọn xe · Chọn chi nhánh · Chọn thời gian',
                      style: TextStyle(color: Color(0xFFDCE8FF), fontSize: 12),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.13),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '$appointmentCount lịch hẹn trong tài khoản',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({
    required this.appointment,
    required this.isCancelling,
    required this.onCancel,
    required this.onDetails,
    required this.formatDateTime,
  });

  final AppointmentBookingResult appointment;
  final bool isCancelling;
  final VoidCallback onCancel;
  final VoidCallback onDetails;
  final String Function(DateTime) formatDateTime;

  @override
  Widget build(BuildContext context) {
    final status = _statusPresentation(appointment.status);
    return Card(
      key: ValueKey('appointment-card-${appointment.id}'),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    appointment.vehicleLicensePlate,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                _StatusBadge(label: status.$1, color: status.$2),
              ],
            ),
            if (appointment.vehicleDescription.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(appointment.vehicleDescription),
            ],
            const SizedBox(height: 14),
            _AppointmentDetail(
              icon: Icons.store_mall_directory_outlined,
              text: appointment.branchName,
            ),
            const SizedBox(height: 8),
            _AppointmentDetail(
              icon: Icons.schedule_rounded,
              text: formatDateTime(appointment.appointmentTime),
            ),
            if (appointment.note?.trim().isNotEmpty == true) ...[
              const SizedBox(height: 8),
              _AppointmentDetail(
                icon: Icons.notes_rounded,
                text: appointment.note!.trim(),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  key: ValueKey('appointment-details-${appointment.id}'),
                  onPressed: onDetails,
                  icon: const Icon(Icons.arrow_forward_rounded),
                  label: const Text('Chi tiết'),
                ),
                if (appointment.canCancel) ...[
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    key: ValueKey('cancel-appointment-${appointment.id}'),
                    onPressed: isCancelling ? null : onCancel,
                    icon: isCancelling
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.cancel_outlined),
                    label: Text(isCancelling ? 'Đang hủy...' : 'Hủy lịch'),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  (String, Color) _statusPresentation(String status) {
    return switch (status) {
      'CHO_XAC_NHAN' => ('Chờ xác nhận', AppColors.warning),
      'DA_XAC_NHAN' => ('Đã xác nhận', AppColors.primary),
      'DA_TIEP_NHAN' => ('Đã tiếp nhận', AppColors.primary),
      'HOAN_TAT' => ('Hoàn tất', AppColors.success),
      'HUY' || 'DA_HUY' => ('Đã hủy', AppColors.danger),
      'KHONG_DEN' => ('Không đến', AppColors.danger),
      _ => (status.replaceAll('_', ' '), AppColors.onSurfaceVariant),
    };
  }
}

class _AppointmentDetail extends StatelessWidget {
  const _AppointmentDetail({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 19, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 9),
        Expanded(child: Text(text)),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary),
        const SizedBox(width: 10),
        Text(title, style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(icon, size: 42, color: AppColors.primary),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center),
            if (onAction != null) ...[
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: onAction,
                child: Text(actionLabel ?? 'Thử lại'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _NoVehicleCard extends StatelessWidget {
  const _NoVehicleCard({required this.onAdd});
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
        child: Column(
          children: [
            InkWell(
              key: const ValueKey('appointment-empty-add-vehicle-button'),
              onTap: onAdd,
              customBorder: const CircleBorder(),
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [Color(0xFFF97316), Color(0xFFEA580C)],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.22),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.add_rounded,
                  color: Colors.white,
                  size: 44,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Bạn chưa có xe',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 6),
            const Text(
              'Nhấn dấu cộng để điền thông tin xe. Sau khi thêm, form đặt lịch sẽ hiện ngay tại đây.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.directions_car_outlined),
              label: const Text('Thêm xe để đặt lịch'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InlineStatus extends StatelessWidget {
  const _InlineStatus({
    super.key,
    required this.icon,
    required this.color,
    required this.message,
  });

  final IconData icon;
  final Color color;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}

class _ServiceSelectionSheet extends StatefulWidget {
  const _ServiceSelectionSheet({
    required this.services,
    required this.initialSelectedIds,
  });

  final List<ServiceOption> services;
  final Set<int> initialSelectedIds;

  @override
  State<_ServiceSelectionSheet> createState() => _ServiceSelectionSheetState();
}

class _ServiceSelectionSheetState extends State<_ServiceSelectionSheet> {
  late final Set<int> _tempSelectedIds;
  late final TextEditingController _searchController;
  String _searchQuery = '';
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _tempSelectedIds = Set<int>.from(widget.initialSelectedIds);
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<String> get _categories {
    final categories = <String>{};
    for (final s in widget.services) {
      final cat = s.categoryName?.trim();
      if (cat != null && cat.isNotEmpty) {
        categories.add(cat);
      }
    }
    return ['Tất cả', ...categories];
  }

  List<ServiceOption> get _filteredServices {
    return widget.services.where((service) {
      final matchesSearch = _searchQuery.isEmpty ||
          service.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (service.description ?? '')
              .toLowerCase()
              .contains(_searchQuery.toLowerCase());

      final matchesCategory = _selectedCategory == null ||
          _selectedCategory == 'Tất cả' ||
          service.categoryName == _selectedCategory;

      return matchesSearch && matchesCategory;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categories = _categories;
    final filteredServices = _filteredServices;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.outlineVariant,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Chọn dịch vụ',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Bạn có thể chọn một hoặc nhiều dịch vụ',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_tempSelectedIds.isNotEmpty)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _tempSelectedIds.clear();
                      });
                    },
                    child: const Text('Bỏ chọn tất cả'),
                  ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'Đóng',
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Search & Filter
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              key: const ValueKey('service-search-input'),
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm theo tên hoặc mô tả...',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                          });
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                filled: true,
                fillColor: AppColors.surfaceContainerLow,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value.trim();
                });
              },
            ),
          ),
          if (categories.length > 2)
            SizedBox(
              height: 42,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: categories.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = categories[index];
                  final isSelected = (_selectedCategory == null && cat == 'Tất cả') ||
                      _selectedCategory == cat;
                  return ChoiceChip(
                    label: Text(cat),
                    selected: isSelected,
                    onSelected: (_) {
                      setState(() {
                        _selectedCategory = cat == 'Tất cả' ? null : cat;
                      });
                    },
                  );
                },
              ),
            ),
          const SizedBox(height: 6),
          // Service List
          Expanded(
            child: filteredServices.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.search_off_rounded,
                            size: 48,
                            color: AppColors.onSurfaceVariant,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Không tìm thấy dịch vụ phù hợp',
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Thử tìm với từ khóa khác hoặc chuyển danh mục.',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: filteredServices.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final service = filteredServices[index];
                      final isSelected = _tempSelectedIds.contains(service.id);
                      return _ServiceOptionTile(
                        key: ValueKey('service-option-${service.id}'),
                        service: service,
                        isSelected: isSelected,
                        isDisabled: false,
                        onToggle: () {
                          setState(() {
                            if (isSelected) {
                              _tempSelectedIds.remove(service.id);
                            } else {
                              _tempSelectedIds.add(service.id);
                            }
                          });
                        },
                      );
                    },
                  ),
          ),
          // Bottom Footer Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Đã chọn: ${_tempSelectedIds.length} dịch vụ',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: _tempSelectedIds.isNotEmpty
                                ? AppColors.primary
                                : AppColors.onSurfaceVariant,
                          ),
                        ),
                        if (_tempSelectedIds.isNotEmpty)
                          Text(
                            'Chạm "Áp dụng" để lưu lựa chọn',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    key: const ValueKey('apply-selected-services-button'),
                    onPressed: () {
                      Navigator.pop(context, _tempSelectedIds);
                    },
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 14,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      _tempSelectedIds.isEmpty
                          ? 'Đóng'
                          : 'Áp dụng (${_tempSelectedIds.length})',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceOptionTile extends StatelessWidget {
  const _ServiceOptionTile({
    super.key,
    required this.service,
    required this.isSelected,
    required this.isDisabled,
    required this.onToggle,
  });

  final ServiceOption service;
  final bool isSelected;
  final bool isDisabled;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isDisabled ? null : onToggle,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primaryContainer.withValues(alpha: 0.22)
                : AppColors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.outlineVariant,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(
                  isSelected
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.onSurfaceVariant,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            service.name,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: isSelected
                                  ? FontWeight.w700
                                  : FontWeight.w600,
                              color: isSelected ? AppColors.primary : null,
                            ),
                          ),
                        ),
                        if (service.price != null && service.price! > 0) ...[
                          const SizedBox(width: 8),
                          Text(
                            _formatCurrency(service.price!),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (service.categoryName != null &&
                        service.categoryName!.trim().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainer,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          service.categoryName!.trim(),
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                    if (service.description != null &&
                        service.description!.trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        service.description!.trim(),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (service.estimatedDurationMinutes != null &&
                        service.estimatedDurationMinutes! > 0) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(
                            Icons.timer_outlined,
                            size: 14,
                            color: AppColors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Thời gian dự kiến: ${_formatDuration(service.estimatedDurationMinutes!)}',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (service.parts.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainer,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: AppColors.outlineVariant.withValues(alpha: 0.5),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.build_circle_outlined,
                                  size: 14,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Phụ tùng định mức kèm theo (${service.parts.length}):',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 11,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            for (final part in service.parts)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '• ${part.name} (x${part.quantity}${part.unit != null && part.unit!.isNotEmpty ? ' ${part.unit}' : ''})',
                                        style: theme.textTheme.bodySmall?.copyWith(
                                          fontSize: 11,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Text(
                                      _formatCurrency(part.totalPrice),
                                      style: theme.textTheme.bodySmall?.copyWith(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                    if (service.estimatedTotalCost != null &&
                        service.estimatedTotalCost! > 0 &&
                        service.parts.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '💰 Tổng dự kiến:',
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                                color: AppColors.primary,
                              ),
                            ),
                            Text(
                              _formatCurrency(service.estimatedTotalCost!),
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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

String _formatCurrency(double amount) {
  final whole = amount.toInt();
  final formatted = whole.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]}.',
      );
  return '$formatted đ';
}

String _formatDuration(int minutes) {
  if (minutes < 60) {
    return '$minutes phút';
  }
  final hours = minutes ~/ 60;
  final remainingMinutes = minutes % 60;
  if (remainingMinutes == 0) {
    return '$hours giờ';
  }
  return '$hours giờ $remainingMinutes phút';
}

