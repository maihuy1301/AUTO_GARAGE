import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export const LoginForm: React.FC = () => {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/app/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUser = tenDangNhap.trim();
    if (!trimmedUser) {
      setFormError('Vui lòng nhập tên đăng nhập hoặc email.');
      return;
    }
    if (!matKhau) {
      setFormError('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({
        tenDangNhap: trimmedUser,
        matKhau,
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setFormError((err as { message: string }).message);
      } else {
        setFormError('Không kết nối được với máy chủ. Kiểm tra mạng và thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="login-form">
      <ErrorMessage message={formError || authError} />

      <Input
        label="Tên đăng nhập / Email"
        id="username-input"
        type="text"
        placeholder="admin, manager, frontdesk..."
        leftIcon="mail"
        value={tenDangNhap}
        onChange={(e) => setTenDangNhap(e.target.value)}
        disabled={isSubmitting}
        required
        autoComplete="username"
        autoFocus
      />

      <Input
        label="Mật khẩu"
        id="password-input"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        leftIcon="lock"
        rightAction={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
            tabIndex={-1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-outline)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {showPassword ? 'visibility' : 'visibility_off'}
            </span>
          </button>
        }
        value={matKhau}
        onChange={(e) => setMatKhau(e.target.value)}
        disabled={isSubmitting}
        required
        autoComplete="current-password"
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '4px',
          marginBottom: '20px',
          fontSize: '0.85rem',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{
              accentColor: 'var(--color-primary-container)',
              width: '16px',
              height: '16px',
              borderRadius: '4px',
            }}
          />
          <span>Ghi nhớ đăng nhập</span>
        </label>

        <a
          href="#forgot"
          onClick={(e) => {
            e.preventDefault();
            alert('Liên hệ quản trị viên để đặt lại mật khẩu.');
          }}
          style={{
            color: 'var(--color-primary-container)',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          Quên mật khẩu?
        </a>
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={isSubmitting}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '0.95rem',
          fontWeight: 600,
          borderRadius: 'var(--radius-md)',
        }}
      >
        Đăng nhập
      </Button>

      {/* Quick Test Accounts Helper */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: 'var(--color-surface-container-low)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-outline-variant)',
          fontSize: '0.775rem',
          color: 'var(--color-on-surface-variant)',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-primary-container)' }}>
          Tài khoản kiểm thử nhanh:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[
            { label: 'Admin', u: 'admin' },
            { label: 'Manager (CN001)', u: 'manager' },
            { label: 'Frontdesk', u: 'frontdesk' },
          ].map((acc) => (
            <button
              key={acc.u}
              type="button"
              onClick={() => {
                setTenDangNhap(acc.u);
                setMatKhau('Password123@');
              }}
              style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-outline-variant)',
                fontSize: '0.75rem',
                color: 'var(--color-on-surface)',
                cursor: 'pointer',
              }}
              title={`Điền nhanh: ${acc.u} / Password123@`}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
};
