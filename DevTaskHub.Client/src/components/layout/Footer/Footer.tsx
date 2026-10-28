import React from 'react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div>
          © {new Date().getFullYear()} <strong>DevTask Hub</strong>. Enterprise Architecture (.NET 10 + React 19).
        </div>
        <div className={styles.statusIndicator}>
          <span className={styles.dot} />
          <span>API Connected: <strong>https://localhost:7092</strong></span>
        </div>
      </div>
    </footer>
  );
};