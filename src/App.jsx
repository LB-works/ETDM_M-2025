import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import FleetOverview from './pages/FleetOverview';
import CustomerManagement from './pages/CustomerManagement';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import { useState, useEffect } from 'react';
import CustomerSignup from './pages/CustomerSignup';
import UsageHistory from './pages/UsageHistory';
import AlertsNotifications from './pages/AlertsNotifications';
import AccountSettings from './pages/AccountSettings';

function App() {
  const [user, setUser] = useState(() => {
    // Check localStorage for user session
    const stored = localStorage.getItem('energyMeterUser');
    return stored ? JSON.parse(stored) : null;
  });

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('userRole') || 'customer';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('energyMeterUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('energyMeterUser');
    }
  }, [user]);

  return (
    <Router>
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? (
                userRole === 'provider' ? 
                  <Navigate to="/fleet-overview" replace /> : 
                  <Navigate to="/dashboard" replace />
              ) : (
                <Login setUser={setUser} setUserRole={setUserRole} />
              )
            } 
          />
          <Route 
            path="/signup"
            element={
              user ? (
                <Navigate to={userRole === 'provider' ? '/fleet-overview' : '/dashboard'} replace />
              ) : (
                <CustomerSignup />
              )
            }
          />
          <Route 
            path="/dashboard" 
            element={
              user ? (
                <CustomerDashboard user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/usage" 
            element={
              user ? (
                <UsageHistory user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route 
            path="/alerts" 
            element={
              user ? (
                <AlertsNotifications user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route 
            path="/account" 
            element={
              user ? (
                <AccountSettings user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route 
            path="/fleet-overview" 
            element={
              user && userRole === 'provider' ? (
                <FleetOverview user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/customers" 
            element={
              user && userRole === 'provider' ? (
                <CustomerManagement user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/analytics" 
            element={
              user && userRole === 'provider' ? (
                <Analytics user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/reports" 
            element={
              user && userRole === 'provider' ? (
                <Reports user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route path="/" element={<Navigate to={user ? (userRole === 'provider' ? '/fleet-overview' : '/dashboard') : '/login'} replace />} />
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a2e2e',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#13ecec',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;

