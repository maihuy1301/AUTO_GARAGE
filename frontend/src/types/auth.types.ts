import { RoleType } from './role.types';

export interface LoginRequest {
  tenDangNhap: string;
  matKhau: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  maNguoiDung: number;
  tenDangNhap: string;
  hoTen: string;
  hasPin?: boolean;
}

export interface CurrentUser {
  maNguoiDung: number;
  tenDangNhap: string;
  hoTen: string;
  email?: string;
  roles: RoleType[];
  maChiNhanh?: number | null;
  tenChiNhanh?: string | null;
}

export interface AuthState {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
