import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'purple' | 'green' | 'yellow' | 'neutral' | 'red';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'purple',
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
};

