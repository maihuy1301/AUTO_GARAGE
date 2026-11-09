import type { RoleType } from '@/types/role.types';

export const WEB_ACCESS_MESSAGE =
  'Tài khoản này không được đăng nhập web. Khách hàng và kỹ thuật viên vui lòng sử dụng ứng dụng di động.';

export function canAccessWeb(roles: readonly RoleType[] = []): boolean {
  if (roles.includes('ROLE_CUSTOMER') || roles.includes('ROLE_TECHNICIAN')) return false;
  return roles.some(role => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER' || role === 'ROLE_FRONT_DESK');
}
