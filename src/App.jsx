import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import CollectorLogin from './pages/CollectorLogin';
import { useAuth } from './context/useAuth';
import { useTheme } from './context/useTheme'; // Import useTheme
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Estates = React.lazy(() => import('./pages/Estates'));
const Collections = React.lazy(() => import('./pages/Collections'));
const CollectorDashboard = React.lazy(() => import('./pages/CollectorDashboard'));
const TeamAndSecurity = React.lazy(() => import('./pages/TeamAndSecurity'));
const PrivateRoute = React.lazy(() => import('./components/PrivateRoute'));

const AuthenticatedLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen transition-colors duration-300">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'md:pl-64' : 'md:pl-20'}`}>
        <Header 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          isMobileMenuOpen={isSidebarOpen} 
        />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const { currentUser: user, loading } = useAuth();
  const { activePalette } = useTheme(); // Get activePalette

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors"> 
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${activePalette.activeBorder}`}></div>
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors">
          <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${activePalette.activeBorder}`}></div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <SignUp />} />
          <Route path="/collector-login" element={<CollectorLogin />} />
          <Route 
            path="/app" 
            element={
              <ErrorBoundary>
                <CollectorDashboard />
              </ErrorBoundary>
            } 
          />
          <Route
            path="/dashboard/*"
            element={
              <PrivateRoute>
                <ErrorBoundary> {/* Wrap AuthenticatedLayout with ErrorBoundary */}
                  <AuthenticatedLayout>
                    <Dashboard />
                  </AuthenticatedLayout>
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/estates/*"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <AuthenticatedLayout>
                    <Estates />
                  </AuthenticatedLayout>
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/collections/*"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <AuthenticatedLayout>
                    <Collections />
                  </AuthenticatedLayout>
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/collector/*"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <AuthenticatedLayout>
                    <CollectorDashboard />
                  </AuthenticatedLayout>
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/team/*"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <AuthenticatedLayout>
                    <TeamAndSecurity />
                  </AuthenticatedLayout>
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App
