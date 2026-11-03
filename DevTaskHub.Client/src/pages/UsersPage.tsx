import React, { useEffect, useState, useMemo } from 'react';
import { usersService } from '../services';
import type { UserDto } from '../types';
import { useAuth, useDebounce } from '../hooks';
import styles from './UsersPage.module.css';

const INITIAL_VISIBLE_COUNT = 5;

export const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filtering states
  const [roleFilter, setRoleFilter] = useState<'All' | 'Admin' | 'ProjectManager' | 'Developer'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Deactivated'>('All');
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const data = await usersService.getUsers(controller.signal);
        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (roleFilter !== 'All') {
      list = list.filter((u) => u.role?.toLowerCase() === roleFilter.toLowerCase());
    }
    if (statusFilter === 'Active') {
      list = list.filter((u) => u.isActive !== false);
    } else if (statusFilter === 'Deactivated') {
      list = list.filter((u) => u.isActive === false);
    }
    if (!debouncedSearch.trim()) return list;
    const q = debouncedSearch.toLowerCase();
    return list.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.gitHubUsername?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, roleFilter, statusFilter, debouncedSearch]);

  // Reset lazy load visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const displayedUsers = useMemo(() => {
    return filteredUsers.slice(0, visibleCount);
  }, [filteredUsers, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + INITIAL_VISIBLE_COUNT, filteredUsers.length));
  };

  const handleShowAll = () => {
    setVisibleCount(filteredUsers.length);
  };

  // -------------------------------------------------------------
  // ADMIN USER MANAGEMENT HANDLERS (Role, Status, Soft-Delete)
  // -------------------------------------------------------------
  const handleRoleChange = async (userId: number, nextRole: string) => {
    if (!isAdmin) return;
    try {
      const updated = await usersService.updateUserRole(userId, nextRole);
      setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, role: updated.role } : u)));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr?.response?.data?.message || 'Failed to update user role.');
    }
  };

  const handleToggleStatus = async (userId: number, currentIsActive: boolean, userEmail: string) => {
    if (!isAdmin) return;
    const nextStatus = !currentIsActive;
    const action = nextStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} user "${userEmail}"?`)) return;

    try {
      const updated = await usersService.updateUserStatus(userId, nextStatus);
      setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, isActive: updated.isActive } : u)));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr?.response?.data?.message || `Failed to ${action} user.`);
    }
  };

  const handleDeleteUser = async (userId: number, userEmail: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to delete user "${userEmail}"? This user will no longer be able to log in.`)) return;

    try {
      await usersService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr?.response?.data?.message || 'Failed to delete user.');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return styles.roleAdmin;
      case 'projectmanager':
        return styles.rolePM;
      case 'developer':
      default:
        return styles.roleDeveloper;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.pageTitle}>Team Directory</h2>
          <p className={styles.pageSubtitle}>
            Engineers, administrators, and contributors registered across the DevTaskHub workspace.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className={styles.filterRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search member by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            title="Filter members by role"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="ProjectManager">Project Manager</option>
            <option value="Developer">Developer</option>
          </select>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            title="Filter members by status"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingBox}>Loading team members...</div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.loadingBox}>No team members matching your search/filters.</div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>GitHub Account</th>
                  <th>Status</th>
                  <th>Joined</th>
                  {isAdmin && <th>Admin Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const initial = u.fullName ? u.fullName.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase();
                  const isCurrentAuthUser = Number(user?.userId ?? (user as any)?.id) === Number(u.userId);
                  const isUserActive = u.isActive !== false;

                  return (
                    <tr key={u.userId}>
                      <td>
                        <div className={styles.userCell}>
                          <div 
                            className={styles.avatar} 
                            title={u.gitHubUsername ? `${u.fullName || u.email} (@${u.gitHubUsername})` : (u.fullName || u.email)}
                          >
                            {u.gitHubUsername ? (
                              <>
                                <img
                                  src={`https://github.com/${u.gitHubUsername}.png?size=64`}
                                  alt={u.fullName || u.email}
                                  className={styles.avatarImg}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'inline';
                                  }}
                                />
                                <span style={{ display: 'none' }}>{initial}</span>
                              </>
                            ) : (
                              initial
                            )}
                          </div>
                          <div>
                            <span className={styles.userName}>{u.fullName || 'Unnamed Member'}</span>
                            {isCurrentAuthUser && (
                              <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, marginLeft: '6px' }}>
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {isAdmin && !isCurrentAuthUser ? (
                          <select
                            className={styles.roleSelectInTable}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                            title="Change user role"
                          >
                            <option value="Developer">Developer</option>
                            <option value="ProjectManager">ProjectManager</option>
                            <option value="Admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`${styles.roleBadge} ${getRoleBadgeClass(u.role)}`}>
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#475569' }}>{u.email}</td>
                      <td>
                        {u.gitHubUsername ? (
                          <a
                            href={`https://github.com/${u.gitHubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.githubLink}
                          >
                            <span>@{u.gitHubUsername}</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Not configured</span>
                        )}
                      </td>
                      <td>
                        <span className={isUserActive ? styles.statusPill : `${styles.statusPill} ${styles.statusDeactivated}`}>
                          {isUserActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td>
                          {isCurrentAuthUser ? (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Current User</span>
                          ) : (
                            <div className={styles.adminActionsCell}>
                              <button
                                type="button"
                                className={styles.toggleStatusBtn}
                                onClick={() => handleToggleStatus(u.userId, isUserActive, u.email)}
                                title={isUserActive ? 'Deactivate account' : 'Reactivate account'}
                              >
                                {isUserActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                className={styles.deleteUserBtn}
                                onClick={() => handleDeleteUser(u.userId, u.email)}
                                title="Soft-delete user"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Lazy Load / Chunked Navigation Footer */}
            <div className={styles.tableFooter}>
              <span className={styles.footerInfo}>
                Showing {displayedUsers.length} of {filteredUsers.length} team members
              </span>

              {visibleCount < filteredUsers.length ? (
                <div className={styles.footerActions}>
                  <button
                    type="button"
                    className={styles.loadMoreBtn}
                    onClick={handleLoadMore}
                  >
                    ⬇️ Load More Members ({filteredUsers.length - visibleCount} more)
                  </button>
                  <button
                    type="button"
                    className={styles.showAllBtn}
                    onClick={handleShowAll}
                  >
                    Show All ({filteredUsers.length})
                  </button>
                </div>
              ) : (
                <span className={styles.footerInfo} style={{ color: '#16a34a' }}>
                  ✓ All members loaded
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
