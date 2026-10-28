import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5rem 1rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent, #aa3bff)', margin: 0 }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-h, #08060d)', marginTop: '0.5rem' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text, #6b6375)', maxWidth: '400px', margin: '0.75rem 0 1.5rem 0' }}>
        The route you are looking for does not exist or has been moved to another location.
      </p>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Button variant="primary">Back to Dashboard</Button>
      </Link>
    </div>
  );
};