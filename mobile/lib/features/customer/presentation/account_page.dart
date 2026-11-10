import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/theme/app_colors.dart';

class AccountPage extends StatelessWidget {
  const AccountPage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final session = auth.session;
    if (session == null) return const SizedBox.shrink();
    final displayName = session.fullName?.trim().isNotEmpty == true
        ? session.fullName!
        : session.username;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Tài khoản', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 29,
                    backgroundColor: AppColors.surfaceContainer,
                    child: Text(
                      displayName.characters.first.toUpperCase(),
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          session.isCustomer ? 'Khách hàng' : 'Kỹ thuật viên',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          _AccountTile(
            icon: Icons.directions_car_outlined,
            title: 'Xe của tôi',
            subtitle: 'Quản lý thông tin xe cá nhân',
            onTap: () => context.push('/vehicles'),
          ),
          _AccountTile(
            icon: Icons.history_rounded,
            title: 'Lịch sử sửa chữa',
            subtitle: 'Xem các lần sửa chữa và bảo dưỡng',
            onTap: () => context.push('/account/repair-history'),
          ),
          _AccountTile(
            icon: Icons.receipt_long_outlined,
            title: 'Hóa đơn của tôi',
            subtitle: 'Chi tiết chi phí và lịch sử thanh toán',
            onTap: () => context.push('/invoices'),
          ),
          _AccountTile(
            icon: Icons.manage_accounts_outlined,
            title: 'Thông tin cá nhân',
            subtitle: 'Cập nhật hồ sơ khách hàng',
            onTap: () => context.push('/account/profile'),
          ),
          const SizedBox(height: 22),
          OutlinedButton.icon(
            onPressed: () async {
              try {
                await context.read<AuthController>().logout();
                if (context.mounted) context.go('/');
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Chưa thể đăng xuất. Vui lòng kiểm tra mạng và thử lại.',
                      ),
                    ),
                  );
                }
              }
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.danger,
              minimumSize: const Size.fromHeight(52),
              side: const BorderSide(color: AppColors.danger),
            ),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }
}

class _AccountTile extends StatelessWidget {
  const _AccountTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: onTap,
        minTileHeight: 68,
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}
