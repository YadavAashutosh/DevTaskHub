import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context';
import { AppLayout } from './components/layout';
import { ErrorBoundary, ProtectedRoute } from './components/common';
import { TasksPage, LoginPage, RegisterPage, NotFoundPage } from './pages';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* 🛡️ Protected Task Workspace (Requires Authenticated Session) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<TasksPage />} />
                <Route path="/tasks" element={<TasksPage />} />
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