import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { projectService, githubService, usersService } from '../services';
import type {
  ProjectDto,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectMemberDto,
  UserDto,
  GitHubRepoDetailsDto,
} from '../types';
import { Button } from '../components/common';
import { useAuth, useDebounce } from '../hooks';
import styles from './ProjectsPage.module.css';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // RBAC Access Control (Admin & ProjectManager only)
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isPM = user?.role?.toLowerCase() === 'projectmanager';
  const canManageProjects = isAdmin || isPM;

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [description, setDescription] = useState('');
  const [gitHubOwner, setGitHubOwner] = useState('');
  const [gitHubRepo, setGitHubRepo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State (RBAC Protected: Admin & ProjectManager Only)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editProjectKey, setEditProjectKey] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editGitHubOwner, setEditGitHubOwner] = useState('');
  const [editGitHubRepo, setEditGitHubRepo] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Project Members Modal State
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedProjectForMembers, setSelectedProjectForMembers] = useState<ProjectDto | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberDto[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<number | ''>('');
  const [selectedProjectRoleToAdd, setSelectedProjectRoleToAdd] = useState('Developer');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // GitHub Repos Discovery State
  const [userRepos, setUserRepos] = useState<GitHubRepoDetailsDto[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoLookupUsername, setRepoLookupUsername] = useState(user?.gitHubUsername || 'YadavAashutosh');

  const fetchProjects = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await projectService.getProjects();
      if (!signal?.aborted) {
        setProjects(data);
      }
    } catch {
      if (!signal?.aborted) {
        setErrorMessage('Failed to load projects.');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!debouncedSearch.trim()) return projects;
    const q = debouncedSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.projectKey.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.gitHubRepoName?.toLowerCase().includes(q) ||
        p.gitHubRepoOwner?.toLowerCase().includes(q)
    );
  }, [projects, debouncedSearch]);

  const handleFetchUserRepos = async () => {
    if (!repoLookupUsername.trim()) return;
    setIsLoadingRepos(true);
    try {
      const repos = await githubService.getUserRepositories(repoLookupUsername.trim());
      setUserRepos(repos);
    } catch {
      alert(`Could not fetch repositories for user "${repoLookupUsername}".`);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleSelectRepo = (repo: GitHubRepoDetailsDto, isEditing = false) => {
    const parts = repo.fullName.split('/');
    const targetOwner = parts.length === 2 ? parts[0] : '';
    const targetRepo = parts.length === 2 ? parts[1] : repo.name;

    if (isEditing) {
      setEditGitHubOwner(targetOwner);
      setEditGitHubRepo(targetRepo);
      if (!editName) setEditName(repo.name);
      if (!editDescription && repo.description) setEditDescription(repo.description);
    } else {
      setGitHubOwner(targetOwner);
      setGitHubRepo(targetRepo);
      if (!name) setName(repo.name);
      if (!projectKey) {
        const autoKey = repo.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'PRJ';
        setProjectKey(autoKey);
      }
      if (!description && repo.description) setDescription(repo.description);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectKey.trim() || !canManageProjects) return;

    setIsSubmitting(true);
    const dto: CreateProjectDto = {
      name: name.trim(),
      projectKey: projectKey.trim().toUpperCase(),
      description: description.trim() || undefined,
      gitHubRepoOwner: gitHubOwner.trim() || undefined,
      gitHubRepoName: gitHubRepo.trim() || undefined,
    };

    try {
      const created = await projectService.createProject(dto);
      setProjects((prev) => [...prev, created]);
      setIsModalOpen(false);
      setName('');
      setProjectKey('');
      setDescription('');
      setGitHubOwner('');
      setGitHubRepo('');
    } catch {
      alert('Failed to create project. Please ensure Project Key is unique.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (proj: ProjectDto) => {
    setEditingProjectId(proj.id);
    setEditName(proj.name);
    setEditProjectKey(proj.projectKey);
    setEditDescription(proj.description || '');
    setEditStatus(proj.status || 'Active');
    setEditGitHubOwner(proj.gitHubRepoOwner || '');
    setEditGitHubRepo(proj.gitHubRepoName || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId || !editName.trim() || !canManageProjects) return;

    setIsUpdating(true);
    const dto: UpdateProjectDto = {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      status: editStatus,
      gitHubRepoOwner: editGitHubOwner.trim() || undefined,
      gitHubRepoName: editGitHubRepo.trim() || undefined,
    };

    try {
      const updated = await projectService.updateProject(editingProjectId, dto);
      setProjects((prev) => prev.map((p) => (p.id === editingProjectId ? updated : p)));
      setIsEditModalOpen(false);
      setEditingProjectId(null);
    } catch {
      alert('Failed to update project details. Only Admins and Project Managers can modify projects.');
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // PROJECT MEMBERS HANDLERS (dbo.ProjectMembers)
  // -------------------------------------------------------------
  const handleOpenMembersModal = async (proj: ProjectDto) => {
    setSelectedProjectForMembers(proj);
    setIsMembersModalOpen(true);
    setIsLoadingMembers(true);
    setSelectedUserIdToAdd('');
    try {
      const [members, users] = await Promise.all([
        projectService.getProjectMembers(proj.id),
        usersService.getUsers(),
      ]);
      setProjectMembers(members);
      setAllUsers(users);
    } catch {
      setProjectMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleAddMemberToProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForMembers || !selectedUserIdToAdd || isAddingMember || !canManageProjects) return;

    setIsAddingMember(true);
    try {
      const created = await projectService.addProjectMember(selectedProjectForMembers.id, {
        userId: Number(selectedUserIdToAdd),
        projectRole: selectedProjectRoleToAdd,
      });

      setProjectMembers((prev) => [...prev, created]);
      setSelectedUserIdToAdd('');

      // Increment totalMembers on project card in real time
      setProjects((prev) =>
        prev.map((p) =>
          p.id === selectedProjectForMembers.id
            ? { ...p, totalMembers: (p.totalMembers || 0) + 1 }
            : p
        )
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr?.response?.data?.message || 'Failed to add member to project.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMemberFromProject = async (userId: number, memberName: string) => {
    if (!selectedProjectForMembers || !canManageProjects) return;
    if (!window.confirm(`Remove "${memberName}" from project "${selectedProjectForMembers.name}"?`)) return;

    try {
      await projectService.removeProjectMember(selectedProjectForMembers.id, userId);
      setProjectMembers((prev) => prev.filter((m) => m.userId !== userId));

      // Decrement totalMembers on project card in real time
      setProjects((prev) =>
        prev.map((p) =>
          p.id === selectedProjectForMembers.id
            ? { ...p, totalMembers: Math.max((p.totalMembers || 1) - 1, 0) }
            : p
        )
      );
    } catch {
      alert('Failed to remove member from project.');
    }
  };

  // Available users not yet in this project
  const availableUsersToAdd = useMemo(() => {
    const existingMemberIds = new Set(projectMembers.map((m) => m.userId));
    return allUsers.filter((u) => !existingMemberIds.has(u.userId));
  }, [allUsers, projectMembers]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.pageTitle}>Projects Management</h2>
          <p className={styles.pageSubtitle}>
            Configure development projects, track GitHub repository bindings, and assign team members.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search projects by name, key, or repo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {canManageProjects && (
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              + New Project
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.loadingBox}>Loading projects...</div>
      ) : errorMessage ? (
        <div className={styles.loadingBox} style={{ color: '#dc2626' }}>{errorMessage}</div>
      ) : filteredProjects.length === 0 ? (
        <div className={styles.emptyState}>
          <span>📁</span>
          <p>{projects.length === 0 ? 'No engineering projects found in the system.' : 'No projects matching your search.'}</p>
          {canManageProjects && projects.length === 0 && (
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              Create Your First Project
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.projectsGrid}>
          {filteredProjects.map((proj) => {
            const completionRate =
              proj.totalTasks > 0
                ? Math.round((proj.completedTasks / proj.totalTasks) * 100)
                : 0;

            return (
              <div key={proj.id} className={styles.projectCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.keyAndName}>
                    <span className={styles.keyBadge}>{proj.projectKey}</span>
                    <h3 className={styles.projectName}>{proj.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      className={`${styles.statusPill} ${
                        proj.status === 'Active' ? styles.statusActive : ''
                      }`}
                    >
                      {proj.status}
                    </span>
                    <button
                      type="button"
                      className={styles.membersBtn}
                      onClick={() => handleOpenMembersModal(proj)}
                      title="View & manage project team members"
                    >
                      👥 {proj.totalMembers || 0}
                    </button>
                    {canManageProjects && (
                      <button
                        type="button"
                        className={styles.editProjectBtn}
                        onClick={() => handleOpenEditModal(proj)}
                        title="Edit project details (Admin/PM only)"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>

                <p className={styles.projectDesc}>
                  {proj.description || 'No description provided for this project.'}
                </p>

                {proj.gitHubRepoOwner && proj.gitHubRepoName ? (
                  <a
                    href={`https://github.com/${proj.gitHubRepoOwner}/${proj.gitHubRepoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.repoBadge}
                    title="Open linked repository on GitHub"
                  >
                    <span>⎇</span>
                    <span>{proj.gitHubRepoOwner}/{proj.gitHubRepoName}</span>
                    <span>↗</span>
                  </a>
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    No GitHub repository linked
                  </span>
                )}

                <div className={styles.progressSection}>
                  <div className={styles.progressLabelRow}>
                    <span>{proj.completedTasks} / {proj.totalTasks} tasks complete</span>
                    <span style={{ fontWeight: 700 }}>{completionRate}%</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${Math.min(completionRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.dateText}>
                    Created {new Date(proj.createdAt).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className={styles.membersBtn}
                      onClick={() => handleOpenMembersModal(proj)}
                      style={{ border: 'none', background: 'none', color: '#2563eb', padding: 0 }}
                    >
                      👥 Team ({proj.totalMembers || 0})
                    </button>
                    <Link
                      to={`/tasks`}
                      style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
                    >
                      View Tasks →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECT MODAL (RBAC: Admin & ProjectManager) */}
      {isModalOpen && canManageProjects && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Project</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Project Name *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. DevTask Hub Web"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Project Key (e.g. DTH, API) *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. DTH"
                  maxLength={10}
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Core objectives and scope of this project..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* GitHub Repo Discovery Picker */}
              <div className={styles.repoPickerWrapper}>
                <span className={styles.repoPickerTitle}>
                  GitHub Repository Integration (Optional)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    style={{ flex: 1 }}
                    placeholder="GitHub username"
                    value={repoLookupUsername}
                    onChange={(e) => setRepoLookupUsername(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleFetchUserRepos}
                    disabled={isLoadingRepos}
                  >
                    {isLoadingRepos ? 'Loading...' : 'Browse Repos'}
                  </Button>
                </div>

                {userRepos.length > 0 && (
                  <div className={styles.repoSelectList}>
                    {userRepos.map((r) => (
                      <div
                        key={r.id}
                        className={styles.repoSelectItem}
                        onClick={() => handleSelectRepo(r, false)}
                        title="Click to select this repo"
                      >
                        <strong>{r.name}</strong> — {r.description || 'No description'} (⭐ {r.stargazersCount})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.twoColRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>GitHub Owner</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. YadavAashutosh"
                    value={gitHubOwner}
                    onChange={(e) => setGitHubOwner(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>GitHub Repo</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. DevTaskHub"
                    value={gitHubRepo}
                    onChange={(e) => setGitHubRepo(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL (RBAC: Admin & ProjectManager Only) */}
      {isEditModalOpen && canManageProjects && (
        <div className={styles.modalBackdrop} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Edit Project: <span style={{ color: '#2563eb' }}>{editProjectKey}</span>
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Project Name *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lifecycle Status</label>
                <select
                  className={styles.formInput}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formTextarea}
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              {/* GitHub Repo Discovery Picker for Editing */}
              <div className={styles.repoPickerWrapper}>
                <span className={styles.repoPickerTitle}>
                  GitHub Repository Integration
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    style={{ flex: 1 }}
                    placeholder="GitHub username"
                    value={repoLookupUsername}
                    onChange={(e) => setRepoLookupUsername(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleFetchUserRepos}
                    disabled={isLoadingRepos}
                  >
                    {isLoadingRepos ? 'Loading...' : 'Browse Repos'}
                  </Button>
                </div>

                {userRepos.length > 0 && (
                  <div className={styles.repoSelectList}>
                    {userRepos.map((r) => (
                      <div
                        key={r.id}
                        className={styles.repoSelectItem}
                        onClick={() => handleSelectRepo(r, true)}
                        title="Click to select this repo"
                      >
                        <strong>{r.name}</strong> — {r.description || 'No description'} (⭐ {r.stargazersCount})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.twoColRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>GitHub Owner</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. YadavAashutosh"
                    value={editGitHubOwner}
                    onChange={(e) => setEditGitHubOwner(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>GitHub Repo</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. DevTaskHub"
                    value={editGitHubRepo}
                    onChange={(e) => setEditGitHubRepo(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Update Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT MEMBERS MODAL (dbo.ProjectMembers) */}
      {isMembersModalOpen && selectedProjectForMembers && (
        <div className={styles.modalBackdrop} onClick={() => setIsMembersModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Team Members: <span style={{ color: '#2563eb' }}>{selectedProjectForMembers.name}</span>
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsMembersModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '4px 0 10px 0' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>
                Engineers and contributors assigned to project <strong>{selectedProjectForMembers.projectKey}</strong>.
              </p>

              {/* Members List */}
              <div className={styles.memberList}>
                {isLoadingMembers ? (
                  <p className={styles.loadingBox} style={{ padding: '20px' }}>Loading project members...</p>
                ) : projectMembers.length === 0 ? (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '16px' }}>
                    No members assigned to this project yet.
                  </p>
                ) : (
                  projectMembers.map((member) => {
                    const initial = member.fullName ? member.fullName.charAt(0).toUpperCase() : 'U';

                    return (
                      <div key={member.userId} className={styles.memberRow}>
                        <div className={styles.memberLeft}>
                          <div 
                            className={styles.memberAvatar}
                            style={{ overflow: 'hidden' }}
                            title={member.gitHubUsername ? `@${member.gitHubUsername}` : member.fullName}
                          >
                            {member.gitHubUsername ? (
                              <>
                                <img
                                  src={`https://github.com/${member.gitHubUsername}.png?size=64`}
                                  alt={member.fullName}
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
                          <div className={styles.memberMeta}>
                            <span className={styles.memberName}>{member.fullName}</span>
                            <span className={styles.memberEmail}>{member.email}</span>
                          </div>
                        </div>

                        <div className={styles.memberRight}>
                          <span className={styles.projectRoleBadge}>{member.projectRole}</span>
                          {canManageProjects && (
                            <button
                              type="button"
                              className={styles.removeMemberBtn}
                              onClick={() => handleRemoveMemberFromProject(member.userId, member.fullName)}
                              title="Remove from project"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Member Section (RBAC: Admin & ProjectManager Only) */}
              {canManageProjects && (
                <div className={styles.addMemberBox}>
                  <h4 className={styles.addMemberTitle}>Add Member to Project:</h4>
                  <form onSubmit={handleAddMemberToProject} className={styles.addMemberForm}>
                    <select
                      className={styles.formInput}
                      style={{ flex: 2, minWidth: '180px' }}
                      value={selectedUserIdToAdd}
                      onChange={(e) => setSelectedUserIdToAdd(e.target.value ? Number(e.target.value) : '')}
                      required
                    >
                      <option value="">Select a team member...</option>
                      {availableUsersToAdd.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.fullName} ({u.email}) — {u.role}
                        </option>
                      ))}
                    </select>

                    <select
                      className={styles.formInput}
                      style={{ flex: 1, minWidth: '110px' }}
                      value={selectedProjectRoleToAdd}
                      onChange={(e) => setSelectedProjectRoleToAdd(e.target.value)}
                    >
                      <option value="Lead">Lead</option>
                      <option value="Developer">Developer</option>
                      <option value="Contributor">Contributor</option>
                      <option value="QA">QA</option>
                      <option value="Viewer">Viewer</option>
                    </select>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isAddingMember || !selectedUserIdToAdd}
                    >
                      {isAddingMember ? 'Adding...' : '+ Add'}
                    </Button>
                  </form>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsMembersModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
