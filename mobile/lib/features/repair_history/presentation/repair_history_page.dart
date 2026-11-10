import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../vehicles/data/vehicle_service.dart';
import '../../vehicles/domain/vehicle_models.dart';
import '../../invoices/presentation/invoices_page.dart' show invoiceMoney;
import '../data/repair_history_service.dart';

class RepairHistoryPage extends StatefulWidget {
  const RepairHistoryPage({super.key, this.receptionId});
  final int? receptionId;
  @override
  State<RepairHistoryPage> createState() => _RepairHistoryPageState();
}

class _RepairHistoryPageState extends State<RepairHistoryPage> {
  List<CustomerVehicle> _vehicles = [];
  List<RepairVisit> _visits = [];
  RepairHistoryDetail? _detail;
  int? _vehicleId;
  int _page = 0, _generation = 0;
  bool _loading = true, _hasMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool more = false}) async {
    final generation = ++_generation;
    final nextPage = more ? _page + 1 : 0;
    setState(() {
      _loading = true;
      _error = null;
      if (!more) {
        _visits = [];
        _detail = null;
        _hasMore = false;
      }
    });
    try {
      final api = context.read<RepairHistoryGateway>();
      if (widget.receptionId != null) {
        final detail = await api.detail(widget.receptionId!);
        if (!mounted || generation != _generation) return;
        setState(() => _detail = detail);
      } else {
        final vehiclesApi = context.read<VehicleGateway>();
        final vehicles = more ? _vehicles : await vehiclesApi.loadVehicles();
        if (!mounted || generation != _generation) return;
        if (_vehicleId != null && !vehicles.any((v) => v.id == _vehicleId)) {
          _vehicleId = null;
        }
        final result = await api.list(vehicleId: _vehicleId, page: nextPage);
        if (!mounted || generation != _generation) return;
        setState(() {
          _vehicles = vehicles;
          _visits = more ? [..._visits, ...result.items] : result.items;
          _page = nextPage;
          _hasMore = result.hasMore;
        });
      }
    } catch (error) {
      if (!mounted || generation != _generation) return;
      setState(() {
        // Clear stale private data on every failure, including load-more failures.
        _visits = [];
        _detail = null;
        _vehicles = [];
        _hasMore = false;
        _error = error is RepairHistoryException || error is VehicleException
            ? error.toString()
            : 'Dữ liệu lịch sử chưa hợp lệ. Vui lòng thử lại.';
      });
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 96),
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Quay lại',
                onPressed: () =>
                    context.canPop() ? context.pop() : context.go('/account'),
                icon: const Icon(Icons.arrow_back),
              ),
              Expanded(
                child: Text(
                  widget.receptionId == null
                      ? 'Lịch sử sửa chữa'
                      : 'Chi tiết lần sửa',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Các lần sửa chữa và bảo dưỡng đã thanh toán đầy đủ.'),
          const SizedBox(height: 20),
          if (widget.receptionId == null && _vehicles.isNotEmpty)
            DropdownButtonFormField<int>(
              initialValue: _vehicleId ?? 0,
              key: ValueKey(_vehicleId),
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Xe của bạn'),
              items: [
                const DropdownMenuItem(value: 0, child: Text('Tất cả xe')),
                for (final vehicle in _vehicles)
                  DropdownMenuItem(
                    value: vehicle.id,
                    child: Text(
                      '${vehicle.licensePlate} · ${vehicle.description}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: _loading
                  ? null
                  : (id) {
                      _vehicleId = id == 0 ? null : id;
                      _load();
                    },
            ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (_error != null) ...[
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            TextButton(onPressed: () => _load(), child: const Text('Thử lại')),
          ],
          if (!_loading && _error == null && _detail == null && _visits.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Column(
                children: [
                  Icon(Icons.history_rounded, size: 48),
                  SizedBox(height: 16),
                  Text('Chưa có lịch sử sửa chữa'),
                  SizedBox(height: 8),
                  Text(
                    'Lần sửa đã hoàn tất sẽ xuất hiện sau khi thanh toán đủ.',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          for (final visit in _visits) _visitCard(visit, open: true),
          if (_hasMore && !_loading)
            OutlinedButton(
              onPressed: () => _load(more: true),
              child: const Text('Xem thêm'),
            ),
          if (_detail case final detail?) ...[
            _visitCard(detail.visit),
            if (detail.invoices.isEmpty)
              const Text('Chưa có thông tin hóa đơn cho lần sửa này.'),
            for (final bill in detail.invoices)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hóa đơn #${bill.id}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      const Text('Dịch vụ'),
                      for (final item in bill.services)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(item.name),
                          subtitle: Text(
                            '${item.quantity} × ${invoiceMoney(item.price)}',
                          ),
                          trailing: Text(invoiceMoney(item.total)),
                        ),
                      if (bill.services.isEmpty)
                        const Text('Không có dịch vụ trên hóa đơn.'),
                      const Text('Phụ tùng'),
                      for (final item in bill.parts)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(item.name),
                          subtitle: Text(
                            '${item.quantity} ${item.unit} × ${invoiceMoney(item.price)}',
                          ),
                          trailing: Text(invoiceMoney(item.total)),
                        ),
                      if (bill.parts.isEmpty)
                        const Text('Không có phụ tùng trên hóa đơn.'),
                      const Divider(),
                      Text('Thành tiền: ${invoiceMoney(bill.total)}'),
                      TextButton(
                        onPressed: () => context.push('/invoices/${bill.id}'),
                        child: const Text('Xem chi tiết hóa đơn'),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    ),
  );

  Widget _visitCard(RepairVisit visit, {bool open = false}) => Card(
    margin: const EdgeInsets.only(top: 16),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
            const Icon(Icons.check_circle_outline, color: AppColors.success),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  visit.plate,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              const Text('Đã thanh toán'),
            ],
          ),
          const SizedBox(height: 10),
          Text(visit.branch),
          if (visit.handedOverAt != null)
            Text('Bàn giao: ${_date(visit.handedOverAt)}'),
          if (!open || visit.handedOverAt == null)
            Text('Tiếp nhận: ${_date(visit.receivedAt)}'),
          if (visit.odometer != null)
            Text('Số km khi tiếp nhận: ${visit.odometer} km'),
          if (visit.request.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                visit.request,
                maxLines: open ? 2 : null,
                overflow: open ? TextOverflow.ellipsis : null,
              ),
            ),
          const Divider(),
          Text(
            visit.total == null
                ? 'Chưa có thông tin chi phí'
                : 'Tổng chi phí: ${invoiceMoney(visit.total!)}',
          ),
          if (open)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () =>
                    context.push('/account/repair-history/${visit.id}'),
                child: const Text('Xem chi tiết →'),
              ),
            ),
        ],
      ),
    ),
  );
  String _date(DateTime? date) => date == null
      ? 'Chưa có thông tin'
      : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}
