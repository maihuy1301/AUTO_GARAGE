import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/auth/auth_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/brand_mark.dart';
import '../data/technician_service.dart';
import '../domain/technician_models.dart';

class TechnicianHomePage extends StatefulWidget {
  const TechnicianHomePage({super.key, this.gateway});

  final TechnicianGateway? gateway;

  @override
  State<TechnicianHomePage> createState() => _TechnicianHomePageState();
}

class _TechnicianHomePageState extends State<TechnicianHomePage> {
  late TechnicianGateway _gateway;
  bool _initialized = false;
  bool _isLoading = true;
  String? _error;
  String _filter = 'ACTIVE';
  List<TechnicianRepairOrder> _orders = const [];

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
      final orders = await _gateway.loadRepairOrders();
      if (mounted) setState(() => _orders = orders);
    } on TechnicianException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<TechnicianRepairOrder> get _visibleOrders => switch (_filter) {
    'ACTIVE' => _orders.where((order) => !order.isLocked).toList(),
    'DONE' => _orders.where((order) => order.status == 'HOAN_TAT').toList(),
    _ => _orders,
  };

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final activeCount = _orders.where((order) => !order.isLocked).length;
    final visibleOrders = _visibleOrders;

    return Scaffold(
      appBar: AppBar(
        title: const BrandMark(compact: true),
        actions: [
          IconButton(
            tooltip: 'Đăng xuất',
            onPressed: () async {
              try {
                await context.read<AuthController>().logout();
                if (context.mounted) context.go('/');
              } on AuthException catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(error.message)),
                  );
                }
              }
            },
            icon: const Icon(Icons.logout_rounded),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            key: const ValueKey('technician-work-list'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            children: [
              Text(
                'Công việc hôm nay',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 4),
              Text(
                '${auth.session?.fullName ?? auth.session?.username ?? 'Kỹ thuật viên'} · $activeCount việc đang xử lý',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 18),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'ACTIVE',
                      label: Text('Đang xử lý'),
                      icon: Icon(Icons.handyman_rounded),
                    ),
                    ButtonSegment(
                      value: 'DONE',
                      label: Text('Hoàn tất'),
                      icon: Icon(Icons.task_alt_rounded),
                    ),
                    ButtonSegment(
                      value: 'ALL',
                      label: Text('Tất cả'),
                      icon: Icon(Icons.list_alt_rounded),
                    ),
                  ],
                  selected: {_filter},
                  onSelectionChanged: (selection) {
                    setState(() => _filter = selection.first);
                  },
                ),
              ),
              const SizedBox(height: 18),
              if (_isLoading)
                const _WorkListMessage(
                  key: ValueKey('technician-loading'),
                  icon: Icons.sync_rounded,
                  title: 'Đang tải công việc',
                  message: 'Danh sách phân công đang được đồng bộ.',
                  showProgress: true,
                )
              else if (_error != null)
                _WorkListMessage(
                  key: const ValueKey('technician-error'),
                  icon: Icons.cloud_off_rounded,
                  title: 'Chưa tải được công việc',
                  message: _error!,
                  actionLabel: 'Thử lại',
                  onAction: _load,
                )
              else if (visibleOrders.isEmpty)
                _WorkListMessage(
                  key: const ValueKey('technician-empty'),
                  icon: Icons.assignment_turned_in_rounded,
                  title: _orders.isEmpty
                      ? 'Chưa có công việc được phân công'
                      : 'Không có công việc trong nhóm này',
                  message: 'Kéo xuống để kiểm tra phân công mới từ garage.',
                )
              else
                for (final order in visibleOrders) ...[
                  _RepairOrderCard(
                    order: order,
                    onTap: () async {
                      await context.push(
                        '/technician/repair-orders/${order.id}',
                      );
                      if (mounted) _load();
                    },
                  ),
                  const SizedBox(height: 12),
                ],
            ],
          ),
        ),
      ),
    );
  }
}

class _RepairOrderCard extends StatelessWidget {
  const _RepairOrderCard({required this.order, required this.onTap});

  final TechnicianRepairOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final presentation = technicianStatusPresentation(order.status);
    return Card(
      key: ValueKey('technician-order-${order.id}'),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: presentation.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.car_repair_rounded,
                      color: presentation.color,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.licensePlate.isEmpty
                              ? 'Phiếu #${order.id}'
                              : order.licensePlate,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        if (order.vehicleDescription.isNotEmpty)
                          Text(order.vehicleDescription),
                      ],
                    ),
                  ),
                  _StatusBadge(presentation: presentation),
                ],
              ),
              const Divider(height: 28),
              _CompactInfo(
                icon: Icons.person_outline_rounded,
                text: order.customerName.isEmpty
                    ? 'Khách hàng chưa cập nhật'
                    : order.customerName,
              ),
              if (order.branchName.isNotEmpty)
                _CompactInfo(
                  icon: Icons.store_outlined,
                  text: order.branchName,
                ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onTap,
                  iconAlignment: IconAlignment.end,
                  icon: const Icon(Icons.chevron_right_rounded),
                  label: const Text('Xem chi tiết'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompactInfo extends StatelessWidget {
  const _CompactInfo({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.onSurfaceVariant),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class _WorkListMessage extends StatelessWidget {
  const _WorkListMessage({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.showProgress = false,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
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
            Icon(icon, size: 42, color: AppColors.primary),
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

class TechnicianStatusPresentation {
  const TechnicianStatusPresentation(this.label, this.color, this.icon);

  final String label;
  final Color color;
  final IconData icon;
}

TechnicianStatusPresentation technicianStatusPresentation(String status) {
  return switch (status) {
    'DA_PHAN_CONG' => const TechnicianStatusPresentation(
      'Đã phân công',
      AppColors.primary,
      Icons.assignment_ind_rounded,
    ),
    'DANG_SUA' => const TechnicianStatusPresentation(
      'Đang sửa',
      AppColors.secondary,
      Icons.handyman_rounded,
    ),
    'TAM_DUNG' => const TechnicianStatusPresentation(
      'Tạm dừng',
      AppColors.warning,
      Icons.pause_circle_outline_rounded,
    ),
    'HOAN_TAT' => const TechnicianStatusPresentation(
      'Hoàn tất',
      AppColors.success,
      Icons.task_alt_rounded,
    ),
    'HUY' => const TechnicianStatusPresentation(
      'Đã hủy',
      AppColors.danger,
      Icons.cancel_outlined,
    ),
    _ => TechnicianStatusPresentation(
      status.replaceAll('_', ' '),
      AppColors.onSurfaceVariant,
      Icons.info_outline_rounded,
    ),
  };
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.presentation});

  final TechnicianStatusPresentation presentation;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: presentation.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        presentation.label,
        style: TextStyle(
          color: presentation.color,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
