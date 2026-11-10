import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../data/technician_service.dart';
import '../domain/technician_models.dart';
import 'technician_home_page.dart';

class TechnicianRepairDetailPage extends StatefulWidget {
  const TechnicianRepairDetailPage({
    super.key,
    required this.repairOrderId,
    this.gateway,
  });

  final int repairOrderId;
  final TechnicianGateway? gateway;

  @override
  State<TechnicianRepairDetailPage> createState() =>
      _TechnicianRepairDetailPageState();
}

class _TechnicianRepairDetailPageState
    extends State<TechnicianRepairDetailPage> {
  late TechnicianGateway _gateway;
  bool _initialized = false;
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  TechnicianRepairDetail? _detail;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _gateway = widget.gateway ?? context.read<TechnicianGateway>();
    _initialized = true;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final detail = await _gateway.loadRepairDetail(widget.repairOrderId);
      if (mounted) setState(() => _detail = detail);
    } on TechnicianException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openProgressSheet() async {
    final order = _detail?.order;
    if (order == null || order.isLocked) return;

    final result = await showModalBottomSheet<_ProgressInput>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _ProgressSheet(currentStatus: order.status),
    );
    if (result == null || !mounted) return;

    setState(() => _isSubmitting = true);
    try {
      await _gateway.updateProgress(
        repairOrderId: order.id,
        status: result.status,
        percent: result.percent,
        description: result.description,
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã cập nhật tiến độ sửa chữa.')),
        );
      }
    } on TechnicianException catch (error) {
      if (mounted) _showError(error.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _updateItem(TechnicianRepairItem item, String status) async {
    if (_detail?.order.isLocked == true || item.status == status) return;
    setState(() => _isSubmitting = true);
    try {
      await _gateway.updateItemStatus(
        repairOrderId: item.repairOrderId,
        itemId: item.id,
        status: status,
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã cập nhật hạng mục dịch vụ.')),
        );
      }
    } on TechnicianException catch (error) {
      if (mounted) _showError(error.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.danger),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Phiếu #${widget.repairOrderId}')),
      bottomNavigationBar: _detail?.order.isLocked == false
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
                child: FilledButton.icon(
                  onPressed: _isSubmitting ? null : _openProgressSheet,
                  icon: _isSubmitting
                      ? const SizedBox.square(
                          dimension: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.edit_note_rounded),
                  label: const Text('Cập nhật tiến độ'),
                ),
              ),
            )
          : null,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            key: const ValueKey('technician-repair-detail'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              if (_isLoading)
                const _DetailMessage(
                  key: ValueKey('technician-detail-loading'),
                  title: 'Đang tải phiếu sửa chữa',
                  message: 'Thông tin công việc đang được đồng bộ.',
                  showProgress: true,
                )
              else if (_error != null)
                _DetailMessage(
                  key: const ValueKey('technician-detail-error'),
                  title: 'Chưa tải được phiếu sửa chữa',
                  message: _error!,
                  actionLabel: 'Thử lại',
                  onAction: _load,
                )
              else if (_detail != null)
                ..._buildDetail(context, _detail!),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildDetail(
    BuildContext context,
    TechnicianRepairDetail detail,
  ) {
    final order = detail.order;
    final status = technicianStatusPresentation(order.status);
    final completedItems = detail.items
        .where((item) => item.status == 'HOAN_TAT')
        .length;

    return [
      Card(
        child: ListTile(
          leading: const Icon(
            Icons.chat_bubble_outline_rounded,
            color: AppColors.primary,
          ),
          title: const Text('Trao đổi với tiếp tân'),
          subtitle: const Text('Tin nhắn theo lần sửa chữa của xe'),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => context.push(
            '/technician/repair-orders/${widget.repairOrderId}/chat',
          ),
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.directions_car, color: Colors.white, size: 30),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    order.licensePlate.isEmpty
                        ? 'Phiếu #${order.id}'
                        : order.licensePlate,
                    style: Theme.of(
                      context,
                    ).textTheme.headlineMedium?.copyWith(color: Colors.white),
                  ),
                ),
              ],
            ),
            if (order.vehicleDescription.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                order.vehicleDescription,
                style: const TextStyle(color: Colors.white70),
              ),
            ],
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                status.label,
                style: TextStyle(
                  color: status.color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      _SectionCard(
        title: 'Thông tin tiếp nhận',
        children: [
          _InfoRow(
            icon: Icons.person_outline_rounded,
            text: order.customerName.isEmpty
                ? 'Khách hàng chưa cập nhật'
                : order.customerName,
          ),
          if (order.customerPhone.isNotEmpty)
            _InfoRow(icon: Icons.phone_outlined, text: order.customerPhone),
          if (order.branchName.isNotEmpty)
            _InfoRow(icon: Icons.store_outlined, text: order.branchName),
          if (order.note?.trim().isNotEmpty == true)
            _InfoRow(icon: Icons.notes_rounded, text: order.note!.trim()),
        ],
      ),
      const SizedBox(height: 16),
      _SectionCard(
        title: 'Hạng mục dịch vụ',
        trailing: Text('$completedItems/${detail.items.length} hoàn tất'),
        children: detail.items.isEmpty
            ? const [Text('Phiếu sửa chữa chưa có hạng mục dịch vụ.')]
            : _buildGroupedItems(context, detail),
      ),
      const SizedBox(height: 16),
      _SectionCard(
        title: 'Lịch sử tiến độ',
        children: detail.progressHistory.isEmpty
            ? const [Text('Chưa có lịch sử tiến độ.')]
            : [
                for (final progress in detail.progressHistory)
                  _ProgressTile(progress: progress),
              ],
      ),
    ];
  }

  List<Widget> _buildGroupedItems(
    BuildContext context,
    TechnicianRepairDetail detail,
  ) {
    final order = detail.order;
    final groups = <int, List<TechnicianRepairItem>>{};
    for (final item in detail.items) {
      groups.putIfAbsent(item.repairOrderId, () => []).add(item);
    }

    if (groups.length == 1 && groups.keys.first == order.id) {
      return [
        for (final item in detail.items)
          _RepairItemTile(
            item: item,
            enabled: !order.isLocked && !_isSubmitting,
            onChanged: (status) => _updateItem(item, status),
            parts: detail.parts
                .where((p) => p.serviceDetailId == item.id || (p.serviceDetailId == null && p.repairOrderId == item.repairOrderId && detail.items.length == 1))
                .toList(growable: false),
          ),
      ];
    }

    final widgets = <Widget>[];
    final sortedKeys = groups.keys.toList()
      ..sort((a, b) {
        if (a == order.id) return -1;
        if (b == order.id) return 1;
        return a.compareTo(b);
      });

    for (var i = 0; i < sortedKeys.length; i++) {
      final orderId = sortedKeys[i];
      final items = groups[orderId]!;
      final isMain = orderId == order.id;
      final groupCompleted = items
          .where((it) => it.status == 'HOAN_TAT')
          .length;

      if (i > 0) {
        widgets.add(const SizedBox(height: 14));
      }

      widgets.add(
        Container(
          margin: const EdgeInsets.only(bottom: 6),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isMain
                ? AppColors.primary.withValues(alpha: 0.08)
                : Colors.amber.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isMain
                ? AppColors.primary.withValues(alpha: 0.25)
                : Colors.amber.withValues(alpha: 0.35),
            ),
          ),
          child: Row(
            children: [
              Icon(
                isMain ? Icons.assignment_outlined : Icons.bolt_rounded,
                size: 18,
                color: isMain ? AppColors.primary : Colors.amber.shade800,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isMain
                      ? 'Hạng mục ban đầu (Phiếu #$orderId)'
                      : 'Hạng mục phát sinh (Phiếu #$orderId)',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: isMain ? AppColors.primary : Colors.amber.shade900,
                  ),
                ),
              ),
              Text(
                '$groupCompleted/${items.length} hoàn tất',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                  color: isMain ? AppColors.primary : Colors.amber.shade900,
                ),
              ),
            ],
          ),
        ),
      );

      for (final item in items) {
        final itemParts = detail.parts
            .where((p) => p.serviceDetailId == item.id || (p.serviceDetailId == null && p.repairOrderId == item.repairOrderId && items.length == 1))
            .toList(growable: false);
        widgets.add(
          _RepairItemTile(
            item: item,
            enabled: !order.isLocked && !_isSubmitting,
            onChanged: (status) => _updateItem(item, status),
            isAdditional: !isMain,
            parts: itemParts,
          ),
        );
      }
    }

    if (detail.items.isNotEmpty) {
      final totalLabor = detail.items.fold<double>(0, (sum, it) => sum + it.total);
      final totalParts = detail.parts.fold<double>(0, (sum, pt) => sum + pt.total);
      if (totalParts > 0) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Tiền công: ${_formatMoney(totalLabor)}',
                    style: const TextStyle(fontSize: 11.5, color: AppColors.onSurfaceVariant),
                  ),
                  Text(
                    'Phụ tùng: ${_formatMoney(totalParts)}',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ),
        );
      }
    }

    return widgets;
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.children,
    this.trailing,
  });

  final String title;
  final List<Widget> children;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                trailing ?? const SizedBox.shrink(),
              ],
            ),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class _RepairItemTile extends StatelessWidget {
  const _RepairItemTile({
    required this.item,
    required this.enabled,
    required this.onChanged,
    this.isAdditional = false,
    this.parts = const [],
  });

  final TechnicianRepairItem item;
  final bool enabled;
  final ValueChanged<String> onChanged;
  final bool isAdditional;
  final List<TechnicianRepairPart> parts;

  static const _statuses = [
    ('CHO_XU_LY', 'Chờ xử lý'),
    ('DANG_SUA', 'Đang sửa'),
    ('HOAN_TAT', 'Hoàn tất'),
    ('HUY', 'Hủy'),
  ];

  @override
  Widget build(BuildContext context) {
    final itemStatus = technicianStatusPresentation(item.status);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.outlineVariant)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(itemStatus.icon, color: itemStatus.color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.name,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    if (isAdditional)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        margin: const EdgeInsets.only(left: 6),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: Colors.amber.shade400,
                            width: 0.8,
                          ),
                        ),
                        child: Text(
                          'Phát sinh #${item.repairOrderId}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.amber.shade900,
                          ),
                        ),
                      ),
                  ],
                ),
                if (item.category.isNotEmpty) Text(item.category),
                Text(
                  'SL ${item.quantity} · ${_formatMoney(item.total)}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                if (parts.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainer,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.outlineVariant.withValues(alpha: 0.7),
                        width: 0.8,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.build_circle_outlined,
                              size: 13,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Phụ tùng kèm theo (${parts.length}):',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        for (final p in parts)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '• ${p.partName}',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Text(
                                  'x${p.quantity} ${p.unit.isNotEmpty ? p.unit : ''} · ${_formatMoney(p.total)}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          PopupMenuButton<String>(
            tooltip: 'Cập nhật trạng thái hạng mục',
            enabled: enabled,
            initialValue: item.status,
            onSelected: onChanged,
            itemBuilder: (context) => [
              for (final status in _statuses)
                PopupMenuItem(value: status.$1, child: Text(status.$2)),
            ],
            icon: const Icon(Icons.more_vert_rounded),
          ),
        ],
      ),
    );
  }
}

class _ProgressTile extends StatelessWidget {
  const _ProgressTile({required this.progress});

  final TechnicianRepairProgress progress;

  @override
  Widget build(BuildContext context) {
    final status = technicianStatusPresentation(progress.status);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: status.color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(status.icon, color: status.color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${status.label} · ${progress.percent}%',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                if (progress.description?.trim().isNotEmpty == true)
                  Text(progress.description!.trim()),
                if (progress.occurredAt != null)
                  Text(
                    _formatDateTime(progress.occurredAt!),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressInput {
  const _ProgressInput({
    required this.status,
    required this.percent,
    this.description,
  });

  final String status;
  final int percent;
  final String? description;
}

class _ProgressSheet extends StatefulWidget {
  const _ProgressSheet({required this.currentStatus});

  final String currentStatus;

  @override
  State<_ProgressSheet> createState() => _ProgressSheetState();
}

class _ProgressSheetState extends State<_ProgressSheet> {
  late String _status;
  // Keep the same status milestones as the backend progress response.
  int get _percent => switch (_status) {
    'HOAN_TAT' => 100,
    'DANG_SUA' => 50,
    _ => 0,
  };
  final _descriptionController = TextEditingController();

  static const _statuses = [
    ('DA_PHAN_CONG', 'Đã phân công'),
    ('DANG_SUA', 'Đang sửa'),
    ('TAM_DUNG', 'Tạm dừng'),
    ('HOAN_TAT', 'Hoàn tất'),
  ];

  @override
  void initState() {
    super.initState();
    _status = _statuses.any((item) => item.$1 == widget.currentStatus)
        ? widget.currentStatus
        : 'DA_PHAN_CONG';
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          20 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Cập nhật tiến độ',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Trạng thái'),
              items: [
                for (final status in _statuses)
                  DropdownMenuItem(value: status.$1, child: Text(status.$2)),
              ],
              onChanged: (value) {
                if (value == null) return;
                setState(() => _status = value);
              },
            ),
            const SizedBox(height: 18),
            Text('Tiến độ theo trạng thái: $_percent%'),
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: _percent / 100,
              minHeight: 8,
              borderRadius: BorderRadius.circular(999),
              semanticsLabel: 'Tiến độ theo trạng thái',
              semanticsValue: '$_percent',
            ),
            const SizedBox(height: 8),
            Text(
              'Tự động cập nhật theo trạng thái đã chọn. '
              'Đây là mức quy đổi, không phải tỷ lệ hạng mục đã làm.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              maxLength: 1000,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Ghi chú tiến độ',
                hintText: 'Mô tả kết quả kiểm tra hoặc công việc đã làm',
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Navigator.pop(
                  context,
                  _ProgressInput(
                    status: _status,
                    percent: _percent,
                    description: _descriptionController.text,
                  ),
                ),
                icon: const Icon(Icons.save_outlined),
                label: const Text('Lưu tiến độ'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailMessage extends StatelessWidget {
  const _DetailMessage({
    super.key,
    required this.title,
    required this.message,
    this.showProgress = false,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final bool showProgress;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.car_repair_rounded, size: 42),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center),
            if (showProgress) ...[
              const SizedBox(height: 18),
              const CircularProgressIndicator(),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 18),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

String _formatMoney(double value) {
  final digits = value.round().toString();
  final buffer = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) buffer.write('.');
    buffer.write(digits[index]);
  }
  return '${buffer.toString()} đ';
}

String _formatDateTime(DateTime value) {
  String twoDigits(int number) => number.toString().padLeft(2, '0');
  return '${twoDigits(value.hour)}:${twoDigits(value.minute)} · '
      '${twoDigits(value.day)}/${twoDigits(value.month)}/${value.year}';
}
