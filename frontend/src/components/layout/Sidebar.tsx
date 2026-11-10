import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWaitingChatCount } from '@/hooks/useWaitingChatCount';
import { RoleLabels, RoleType } from '@/types/role.types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItemConfig {
  label: string;
  path: string;
  icon: string;
  roles: RoleType[];
}

const ALL_NAV_ITEMS: NavItemConfig[] = [
  // Common
  {
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: 'dashboard',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK'],
  },
  // Admin specific
  {
    label: 'Chi nhánh',
    path: '/app/branches',
    icon: 'store_mall_directory',
    roles: ['ROLE_ADMIN'],
  },
  {
    label: 'Quản lý tài khoản',
    path: '/app/users',
    icon: 'manage_accounts',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
  },
  {
    label: 'Danh mục dịch vụ',
    path: '/app/services',
    icon: 'build',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
  },
  // Staff / Branch operations
  {
    label: 'Nhân viên',
    path: '/app/employees',
    icon: 'badge',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
  },
  {
    label: 'Lịch hẹn',
    path: '/app/appointments',
    icon: 'calendar_month',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK'],
  },
  {
    label: 'Tiếp nhận xe và tạo lệnh sửa chữa ',
    path: '/app/reception',
    icon: 'car_repair',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK'],
  },
  {
    label: 'Phân công kỹ thuật viên',
    path: '/app/repair-orders',
    icon: 'assignment',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK'],
  },
  {
    label: 'Khách hàng',
    path: '/app/customers',
    icon: 'groups',
    roles: ['ROLE_ADMIN'],
  },
  {
    label: 'Phương tiện',
    path: '/app/vehicles',
    icon: 'directions_car',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
  },
  {
    label: 'Hãng & Dòng xe',
    path: '/app/brands-models',
    icon: 'category',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
  },
  {
    label: 'Kho & Phụ tùng',
    path: '/app/inventory',
    icon: 'inventory_2',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
  },
  {
    label: 'Hóa đơn',
    path: '/app/invoices',
    icon: 'receipt_long',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK'],
  },
  {
    label: 'Chat trao đổi',
    path: '/app/chat',
    icon: 'chat',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK'],
  },
  {
    label: 'Báo cáo & Thống kê',
    path: '/app/reports',
    icon: 'assessment',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user } = useAuth();
  const waitingCount = useWaitingChatCount();
  const userRoles = (user?.roles || []) as RoleType[];

  const filteredNavItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.some((role) => userRoles.includes(role))
  );

  const primaryRole = userRoles[0] as RoleType | undefined;
  const roleLabel = primaryRole ? (RoleLabels[primaryRole] || primaryRole) : 'Người dùng';
  const initial = user?.hoTen?.charAt(0)?.toUpperCase() || user?.tenDangNhap?.charAt(0)?.toUpperCase() || 'U';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">AC</div>
        <div>
          <div className="sidebar-brand-title">AutoCare Admin</div>
          <div className="sidebar-brand-subtitle">Multi-Branch Console</div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu chức năng</div>
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.path === '/app/chat' && waitingCount > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginLeft: 'auto',
                }}
                title={`${waitingCount} khách hàng đang chờ tiếp tân`}
              >
                {waitingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Card */}
      {user && (
        <div className="sidebar-user-footer">
          <div className="sidebar-avatar">{initial}</div>
          <div className="sidebar-user-details">
            <div className="sidebar-user-name" title={user.hoTen || user.tenDangNhap}>
              {user.hoTen || user.tenDangNhap}
            </div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
        </div>
      )}
    </aside>
  );
};
