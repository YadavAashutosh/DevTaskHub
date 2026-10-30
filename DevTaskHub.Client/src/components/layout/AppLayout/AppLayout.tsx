import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'A';

  const userDisplayName = user?.fullName || user?.email?.split('@')[0] || 'User';
  const userRole = user?.role || 'Developer';

  // Dynamic Top Bar Title
  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/tasks')) return 'Tasks';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/users')) return 'Team Directory';
    if (path.startsWith('/profile')) return 'Profile';
    return 'DevTask Hub';
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.publicWrapper}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      {/* 1. Left Persistent Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logoRow}>
            <span className={styles.brandTitle}>DevTask Hub</span>
          </div>

          <nav className={styles.navMenu}>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/projects"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
              }
            >
              Projects
            </NavLink>
            <NavLink
              to="/tasks"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
              }
            >
              Tasks
            </NavLink>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
              }
            >
              Users
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
              }
            >
              Profile
            </NavLink>
          </nav>
        </div>

        {/* Bottom User Card */}
        <div className={styles.sidebarBottom}>
          <div
            className={styles.userCardInfo}
            onClick={() => navigate('/profile')}
            style={{ cursor: 'pointer' }}
            title="View personal profile"
          >
            <span className={styles.userName}>{userDisplayName}</span>
            <span className={styles.userRole}>{userRole}</span>
          </div>
          <button type="button" className={styles.signOutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <div className={styles.mainWrapper}>
        <header className={styles.topBar}>
          <h1 className={styles.topBarTitle}>{getPageTitle()}</h1>
          <div className={styles.topBarRight}>
            <div
              className={styles.avatarCircle}
              title={`${userDisplayName} (${userRole}) - Click to view profile`}
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer', overflow: 'hidden' }}
            >
              {user?.gitHubUsername ? (
                <>
                  <img
                    src={`https://github.com/${user.gitHubUsername}.png?size=64`}
                    alt={userDisplayName}
                    className={styles.avatarImg}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <span style={{ display: 'none' }}>{userInitial}</span>
                </>
              ) : (
                userInitial
              )}
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
