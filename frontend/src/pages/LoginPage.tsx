import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface-gray)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: 'var(--color-on-surface)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo Area */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--color-primary-container)',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            AutoCare{' '}
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontSize: '1.4rem',
                fontWeight: 600,
                color: 'var(--color-industrial-slate)',
                letterSpacing: '-0.01em',
              }}
            >
              Multi-Branch
            </span>
          </h1>
        </div>

        {/* Login Card */}
        <div
          className="card animate-fade-in"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(197, 197, 211, 0.4)',
            boxShadow: 'var(--shadow-md)',
            padding: '32px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                marginBottom: '4px',
              }}
            >
              Đăng nhập hệ thống
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
              Dành cho quản trị viên, quản lý chi nhánh và lễ tân.
            </p>
          </div>

          <LoginForm />

          {/* Support Text */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-outline)' }}>
              Cần hỗ trợ?{' '}
              <a
                href="#support"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Bạn có thể liên hệ quản trị viên hoặc người phụ trách chi nhánh để được hỗ trợ.');
                }}
                style={{
                  fontWeight: 600,
                  color: 'var(--color-primary-container)',
                  textDecoration: 'underline',
                }}
              >
                Liên hệ hỗ trợ
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
