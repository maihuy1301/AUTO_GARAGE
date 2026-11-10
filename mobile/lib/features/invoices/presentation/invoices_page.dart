import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../data/invoice_service.dart';
import '../domain/invoice_models.dart';

class InvoicesPage extends StatefulWidget {
  const InvoicesPage({super.key, this.invoiceId, this.gateway});
  final int? invoiceId;
  final InvoiceGateway? gateway;

  @override
  State<InvoicesPage> createState() => _InvoicesPageState();
}

class _InvoicesPageState extends State<InvoicesPage> {
  List<CustomerInvoice> _invoices = [];
  bool _loading = true;
  String? _error;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant InvoicesPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.invoiceId != widget.invoiceId ||
        oldWidget.gateway != widget.gateway) {
      _load();
    }
  }

  Future<void> _load() async {
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _invoices = [];
    });
    try {
      final gateway = widget.gateway ?? context.read<InvoiceGateway>();
      final id = widget.invoiceId;
      if (id != null && id <= 0) {
        throw const InvoiceException('Mã hóa đơn không hợp lệ.');
      }
      final invoices = id == null
          ? await gateway.loadInvoices()
          : [await gateway.loadInvoice(id)];
      if (!mounted || request != _request) return;
      setState(() => _invoices = invoices);
    } on Object catch (error) {
      if (!mounted || request != _request) return;
      setState(
        () => _error = error is InvoiceException
            ? error.message
            : 'Không thể tải hóa đơn. Vui lòng thử lại.',
      );
    } finally {
      if (mounted && request == _request) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = widget.invoiceId != null;
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Quay lại',
                  onPressed: () {
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go(detail ? '/invoices' : '/account');
                    }
                  },
                  icon: const Icon(Icons.arrow_back),
                ),
                Expanded(
                  child: Text(
                    detail ? 'Chi tiết hóa đơn' : 'Hóa đơn của tôi',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  if (_loading)
                    const Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_error != null)
                    _Section(
                      title: 'Chưa thể hiển thị hóa đơn',
                      children: [
                        Text(_error!, key: const ValueKey('invoice-error')),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _load,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    )
                  else if (_invoices.isEmpty)
                    const _Section(
                      title: 'Chưa có hóa đơn',
                      children: [
                        Text(
                          'Hóa đơn sẽ xuất hiện sau khi garage lập hóa đơn cho bạn.',
                        ),
                      ],
                    )
                  else if (detail)
                    ..._details(_invoices.single)
                  else
                    for (final invoice in _invoices)
                      Card(
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          key: ValueKey('invoice-${invoice.id}'),
                          onTap: () async {
                            await context.push('/invoices/${invoice.id}');
                            if (mounted) await _load();
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        'Hóa đơn #${invoice.id}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleLarge,
                                      ),
                                    ),
                                    const Icon(Icons.chevron_right),
                                  ],
                                ),
                                Text(
                                  '${invoice.branchName} · ${invoiceDate(invoice.createdAt)}',
                                ),
                                const SizedBox(height: 8),
                                _Status(invoice.status),
                                const SizedBox(height: 12),
                                _Amount('Tổng thanh toán', invoice.total),
                                _Amount('Đã thanh toán', invoice.paid),
                                _Amount(
                                  'Còn lại',
                                  invoice.remaining,
                                  emphasis: true,
                                ),
                              ],
                            ),
                          ),
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

  List<Widget> _details(CustomerInvoice invoice) => [
    _Section(
      title: 'Hóa đơn #${invoice.id}',
      children: [
        _Status(invoice.status),
        const SizedBox(height: 12),
        Text(invoice.branchName),
        Text('Phiếu sửa chữa #${invoice.repairOrderId}'),
        Text('Ngày lập: ${invoiceDate(invoice.createdAt)}'),
      ],
    ),
    _Section(
      title: 'Dịch vụ',
      children: _lineItems(invoice.services, 'Không có dịch vụ.'),
    ),
    _Section(
      title: 'Phụ tùng',
      children: _lineItems(invoice.parts, 'Không có phụ tùng.'),
    ),
    _Section(
      title: 'Tổng cộng',
      children: [
        _Amount('Tổng chi phí dịch vụ & phụ tùng', invoice.subtotal),
        const Divider(),
        _Amount('Tổng thanh toán', invoice.total, emphasis: true),
        _Amount('Đã thanh toán', invoice.paid),
        _Amount('Còn lại', invoice.remaining, emphasis: true),
        if (invoice.remaining > 0 &&
            {
              'CHUA_THANH_TOAN',
              'THANH_TOAN_MOT_PHAN',
            }.contains(invoice.status)) ...[
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () async {
              await context.push('/invoices/${invoice.id}/payment');
              if (mounted) await _load();
            },
            icon: const Icon(Icons.account_balance),
            label: const Text('Thanh toán ngân hàng'),
          ),
        ],
      ],
    ),
    _Section(
      title: 'Lịch sử thanh toán',
      children: [
        if (invoice.payments.isEmpty)
          const Text('Chưa có giao dịch thanh toán.'),
        for (final payment in invoice.payments) ...[
          Text(
            'Giao dịch #${payment.id}',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          _Amount(paymentMethod(payment.method), payment.amount),
          Text(invoiceDate(payment.paidAt)),
          _Status(payment.status),
          if (payment.reference?.trim().isNotEmpty == true)
            Text('Mã giao dịch: ${payment.reference}'),
          const Divider(height: 24),
        ],
      ],
    ),
  ];

  List<Widget> _lineItems(List<InvoiceItem> items, String empty) => [
    if (items.isEmpty) Text(empty),
    for (final item in items) ...[
      Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
      Text(
        'SL: ${item.quantity}${item.unit.isEmpty ? '' : ' ${item.unit}'} × ${invoiceMoney(item.price)}',
      ),
      _Amount('Thành tiền', item.total),
      const Divider(height: 20),
    ],
  ];
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    ),
  );
}

class _Amount extends StatelessWidget {
  const _Amount(this.label, this.amount, {this.emphasis = false});
  final String label;
  final double amount;
  final bool emphasis;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Wrap(
      alignment: WrapAlignment.spaceBetween,
      spacing: 16,
      runSpacing: 4,
      children: [
        Text(label),
        Text(
          invoiceMoney(amount),
          style: TextStyle(
            fontWeight: emphasis ? FontWeight.w800 : FontWeight.w600,
            color: emphasis ? AppColors.primary : null,
          ),
        ),
      ],
    ),
  );
}

class _Status extends StatelessWidget {
  const _Status(this.status);
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'CHUA_THANH_TOAN' => ('Chưa thanh toán', AppColors.warning),
      'THANH_TOAN_MOT_PHAN' => ('Thanh toán một phần', AppColors.warning),
      'DA_THANH_TOAN' => ('Đã thanh toán', AppColors.success),
      'THANH_CONG' => ('Thành công', AppColors.success),
      'THAT_BAI' => ('Thất bại', AppColors.danger),
      'HUY' || 'DA_HUY' => ('Đã hủy', AppColors.danger),
      'CHO_XU_LY' => ('Chờ xử lý', AppColors.warning),
      _ => (status, AppColors.onSurfaceVariant),
    };
    return Align(
      alignment: Alignment.centerLeft,
      child: Chip(
        avatar: Icon(Icons.receipt_long_outlined, color: color, size: 18),
        label: Text(label),
        backgroundColor: color.withValues(alpha: 0.10),
        side: BorderSide.none,
      ),
    );
  }
}

String invoiceMoney(double amount) {
  final parts = amount.toStringAsFixed(2).split('.');
  final whole = parts.first.replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]}.',
  );
  return '$whole${parts.last == '00' ? '' : ',${parts.last}'} đ';
}

String invoiceDate(DateTime? date) {
  if (date == null) return 'Chưa có thời gian';
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(date.day)}/${two(date.month)}/${date.year} ${two(date.hour)}:${two(date.minute)}';
}

String paymentMethod(String value) => switch (value) {
  'TIEN_MAT' => 'Tiền mặt',
  'CHUYEN_KHOAN' => 'Chuyển khoản',
  'THE' => 'Thẻ',
  _ => value.isEmpty ? 'Chưa có phương thức' : value,
};
