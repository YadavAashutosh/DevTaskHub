import React, { useEffect, useState, useMemo } from 'react';
import { usersService } from '../services';
import type { UserDto } from '../types';
import { useDebounce } from '../hooks';
import styles from './UsersPage.module.css';

const INITIAL_VISIBLE_COUNT = 5;

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
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
    if (!debouncedSearch.trim()) return users;
    const q = debouncedSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.gitHubUsername?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, debouncedSearch]);

  // Reset lazy load visible count when debounced search value updates
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [debouncedSearch]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  const displayedUsers = useMemo(() => {
    return filteredUsers.slice(0, visibleCount);
  }, [filteredUsers, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + INITIAL_VISIBLE_COUNT, filteredUsers.length));
  };

  const handleShowAll = () => {
    setVisibleCount(filteredUsers.length);
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
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search member by name or email..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingBox}>Loading team members...</div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.loadingBox}>No team members matching your search.</div>
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
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const initial = u.fullName ? u.fullName.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase();

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
                          <span className={styles.userName}>{u.fullName || 'Unnamed Member'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.roleBadge} ${getRoleBadgeClass(u.role)}`}>
                          {u.role}
                        </span>
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
                        <span className={styles.statusPill}>Active</span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
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
