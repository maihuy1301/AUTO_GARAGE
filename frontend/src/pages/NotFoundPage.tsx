import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '24px',
      }}
      className="animate-fade-in"
    >
      <div
        style={{
          fontSize: '4.5rem',
          fontWeight: 900,
          color: 'var(--primary-500)',
          lineHeight: 1,
          marginBottom: '12px',
          letterSpacing: '-0.03em',
        }}
      >
        404
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '8px' }}>
        Trang không tồn tại
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: '24px', fontSize: '0.95rem' }}>
        Không tìm thấy trang này. Bạn hãy kiểm tra lại đường dẫn.
      </p>

      <Button variant="primary" onClick={() => navigate('/app/dashboard')}>
        Về Bảng điều khiển
      </Button>
    </div>
  );
};
