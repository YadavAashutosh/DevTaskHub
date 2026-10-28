import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import type { RegisterRequestDto } from '../../../types';
import styles from './RegisterForm.module.css';

interface RegisterFormProps {
  onSubmit: (data: RegisterRequestDto) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  isLoading = false,
  errorMessage = null,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'Developer' | 'Admin' | 'ProjectManager'>('Developer');
  const [gitHubUsername, setGitHubUsername] = useState('');
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    gitHubUsername?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      gitHubUsername?: string;
    } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Corporate email is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // .NET NIST regex: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character (@$!%*?&)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!passwordRegex.test(password)) {
      newErrors.password = 'Must contain uppercase, lowercase, number & special char (@$!%*?&)';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      role,
      gitHubUsername: gitHubUsername.trim() || null,
    });
  };

  return (
    <div className={styles.authCard}>
      <div className={styles.header}>
        <h2 className={styles.title}>Create Account</h2>
        <p className={styles.subtitle}>Join DevTask Hub to start tracking engineering tasks</p>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          label="Full Name"
          placeholder="e.g. Alex Henderson"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          disabled={isLoading}
        />

        <Input
          label="Corporate Email"
          type="email"
          placeholder="alex@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          placeholder="•••••••• (Min 8 chars, mixed case, symbol)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isLoading}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          disabled={isLoading}
        />

        {/* GitHub Username (Optional: used for PR tracking) */}
        <Input
          label="GitHub Username (Optional)"
          placeholder="e.g. octocat (for PR sync)"
          value={gitHubUsername}
          onChange={(e) => setGitHubUsername(e.target.value)}
          error={errors.gitHubUsername}
          disabled={isLoading}
        />

        {/* Corporate Role Selector */}
        <div className={styles.roleGroup}>
          <label className={styles.roleLabel}>Corporate Role</label>
          <div className={styles.roleOptions}>
            {(['Developer', 'Admin', 'ProjectManager'] as const).map((r) => (
              <label
                key={r}
                className={`${styles.roleOption} ${
                  role === r ? styles.roleActive : ''
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  disabled={isLoading}
                  style={{ accentColor: 'var(--accent, #aa3bff)' }}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className={styles.submitBtn}
        >
          Register Account
        </Button>
      </form>

      <div className={styles.footerText}>
        Already registered?{' '}
        <Link to="/login" className={styles.link}>
          Sign in here
        </Link>
      </div>
    </div>
  );
};