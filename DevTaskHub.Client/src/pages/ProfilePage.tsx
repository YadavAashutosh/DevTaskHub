import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks';
import { usersService } from '../services';
import type { UserDto } from '../types';
import { Button } from '../components/common';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<UserDto | null>(authUser);
  const [isEditingGitHub, setIsEditingGitHub] = useState(false);
  const [gitHubUsername, setGitHubUsername] = useState(authUser?.gitHubUsername || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const data = await usersService.getMyProfile();
        setProfile(data);
        setGitHubUsername(data.gitHubUsername || '');
      } catch {
        // Fall back to auth context session
      }
    };

    fetchLatestProfile();
  }, []);

  const handleSaveGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      await usersService.updateMyGitHubUsername(gitHubUsername.trim() || null);
      setProfile((prev) => (prev ? { ...prev, gitHubUsername: gitHubUsername.trim() || null } : prev));
      setIsEditingGitHub(false);
      setFeedback('GitHub username updated successfully!');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || 'Failed to update GitHub username.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const initial = profile?.fullName
    ? profile.fullName.charAt(0).toUpperCase()
    : profile?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        {/* Top Profile Header */}
        <div className={styles.cardTop}>
          <div className={styles.largeAvatar} style={{ overflow: 'hidden' }} title={profile?.gitHubUsername ? `@${profile.gitHubUsername}` : profile?.fullName}>
            {profile?.gitHubUsername ? (
              <>
                <img
                  src={`https://github.com/${profile.gitHubUsername}.png?size=128`}
                  alt={profile.fullName || profile.email}
                  className={styles.avatarImg}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <span style={{ display: 'none' }}>{initial}</span>
              </>
            ) : (
              initial
            )}
          </div>
          <div className={styles.nameBlock}>
            <h2 className={styles.userName}>{profile?.fullName || 'User Profile'}</h2>
            <p className={styles.userEmail}>{profile?.email}</p>
            <span className={styles.rolePill}>{profile?.role || 'Developer'}</span>
          </div>
        </div>

        {/* Profile Info Fields */}
        <div className={styles.sectionBlock}>
          <h3 className={styles.sectionTitle}>Account Details</h3>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Full Name</span>
            <span className={styles.fieldValue}>{profile?.fullName || 'Not provided'}</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Corporate Email</span>
            <span className={styles.fieldValue}>{profile?.email}</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Access Role</span>
            <span className={styles.fieldValue}>{profile?.role}</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Member Since</span>
            <span className={styles.fieldValue}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* GitHub Integration Preferences */}
        <div className={styles.sectionBlock}>
          <h3 className={styles.sectionTitle}>Developer Integration</h3>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>GitHub Username</span>

            {isEditingGitHub ? (
              <form onSubmit={handleSaveGitHub} className={styles.editForm}>
                <input
                  type="text"
                  placeholder="e.g. YadavAashutosh"
                  className={styles.inputField}
                  value={gitHubUsername}
                  onChange={(e) => {
                    setGitHubUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoFocus
                />
                <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                  {isSaving ? 'Validating...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditingGitHub(false);
                    setErrorMessage(null);
                  }}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={styles.fieldValue}>
                  {profile?.gitHubUsername ? `@${profile.gitHubUsername}` : 'Not configured'}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditingGitHub(true);
                    setErrorMessage(null);
                  }}
                >
                  ✏️ Edit
                </Button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div style={{ color: '#dc2626', background: '#fee2e2', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginTop: '10px', border: '1px solid #fecaca' }}>
              ⚠️ {errorMessage}
            </div>
          )}
          {feedback && <div className={styles.feedbackSuccess}>{feedback}</div>}
        </div>

        {/* Sign Out */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="danger" size="sm" onClick={() => logout()}>
            Sign Out of DevTaskHub
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
