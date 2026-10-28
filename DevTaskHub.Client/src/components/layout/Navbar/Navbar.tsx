import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '../../common/Button';
import styles from './Navbar.module.css';

interface NavbarProps {
  isAuthenticated?: boolean;
  username?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated = false,
  username = '',
  onLogout
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Brand Logo */}
        <Link to="/" className={styles.brand}>
          <div className={styles.brandIcon}>D</div>
          <span>DevTask<span style={{ color: 'var(--accent, #aa3bff)' }}>Hub</span></span>
        </Link>

        {/* Center Nav Links */}
        <nav>
          <ul className={styles.navLinks}>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
                }
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/tasks"
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
                }
              >
                Tasks
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Right Auth Section */}
        <div className={styles.authSection}>
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted, #71717a)' }}>
                Welcome, <strong>{username}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};