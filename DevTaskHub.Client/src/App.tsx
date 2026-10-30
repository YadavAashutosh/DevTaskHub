import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context';
import { AppLayout } from './components/layout';
import { ErrorBoundary, ProtectedRoute } from './components/common';
import { LoginPage, RegisterPage, NotFoundPage } from './pages';

// Lazy-loaded code-split protected workspace pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b', fontSize: '14px' }}>
    Loading view...
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* 🛡️ Protected Task Workspace (Requires Authenticated Session) */}
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <TasksPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ProjectsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <UsersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ProfilePage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Public Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* 404 Fallback */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
