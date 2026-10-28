import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import type { LoginRequestDto } from '../../../types';
import styles from './LoginForm.module.css';

interface LoginFormProps {
  onSubmit: (credentials: LoginRequestDto) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isLoading = false,
  errorMessage = null,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Corporate email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please provide a valid corporate email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      email: email.trim(),
      password,
    });
  };

  return (
    <div className={styles.authCard}>
      <div className={styles.header}>
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Sign in with your enterprise credentials</p>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          label="Corporate Email"
          type="email"
          placeholder="developer@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className={styles.submitBtn}
        >
          Sign In
        </Button>
      </form>

      <div className={styles.footerText}>
        New team member?{' '}
        <Link to="/register" className={styles.link}>
          Register enterprise account
        </Link>
      </div>
    </div>
  );
};