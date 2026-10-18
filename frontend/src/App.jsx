import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import StoreSetup from './pages/StoreSetup';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ExpiryAlerts from './pages/ExpiryAlerts';
import AIAdvisor from './pages/AIAdvisor';
import DemandForecast from './pages/DemandForecast';
import B2BHub from './pages/B2BHub';
import FraudWatch from './pages/FraudWatch';
import Analytics from './pages/Analytics';
import Suppliers from './pages/Suppliers';
import StoreSettings from './pages/StoreSettings';

export default function App() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/dashboard');

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    // Scroll content to top per Global Behavior in App Flow
    const content = document.querySelector('.content-area');
    if (content) content.scrollTop = 0;
  };

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
          color: 'var(--txm)',
          fontSize: 14,
        }}
      >
        Initializing ShelfWise ERP...
      </div>
    );
  }

  // Parse path & search query
  const [route, queryString] = currentPath.split('?');
  const searchParams = new URLSearchParams(queryString || '');

  // Unauthenticated routes
  if (!user) {
    if (route === '/signup') {
      return <Signup onNavigate={navigate} />;
    }
    return <Login onNavigate={navigate} />;
  }

  // Setup route for newly created stores
  if (route === '/setup') {
    return <StoreSetup onNavigate={navigate} />;
  }

  const role = user.role || 'staff';

  // Role Access Mapping from Section 2 of App Flow
  const roleAccess = {
    '/dashboard': ['owner', 'manager', 'staff'],
    '/inventory': ['owner', 'manager', 'staff'],
    '/alerts': ['owner', 'manager', 'staff'],
    '/advisor': ['owner', 'manager', 'staff'],
    '/demand': ['owner', 'manager'],
    '/b2b': ['owner', 'manager'],
    '/fraud': ['owner', 'manager'],
    '/analytics': ['owner', 'manager'],
    '/suppliers': ['owner', 'manager'],
    '/settings': ['owner', 'manager'],
  };

  const allowedRoles = roleAccess[route] || ['owner', 'manager', 'staff'];
  const hasAccess = allowedRoles.includes(role);

  // Top bar titles
  const pageTitles = {
    '/dashboard': 'Store Operations Dashboard',
    '/inventory': 'Batch Inventory Management',
    '/alerts': 'Expiry Waste Prevention & Markdown Alerts',
    '/advisor': 'AI Retail Advisor (What-If Simulation)',
    '/demand': 'Sales Demand Forecast & Reorders',
    '/b2b': 'B2B Wholesale Hub & Quotes',
    '/fraud': 'Transactions Flagged for Review',
    '/analytics': 'Retail Performance Analytics',
    '/suppliers': 'Supplier Directory & Reliability',
    '/settings': 'Store Settings & Model Governance',
  };

  const currentTitle = pageTitles[route] || 'ShelfWise ERP';

  return (
    <div className="app-frame">
      {/* Fixed Left Sidebar */}
      <Sidebar currentRoute={route} onNavigate={navigate} />

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* Top Bar */}
        <TopBar title={currentTitle} onNavigate={navigate} />

        {/* Scrolling Content Area */}
        <main className="content-area">
          {!hasAccess ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 500, margin: '40px auto' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>
                You don't have access to this page
              </h2>
              <p style={{ fontSize: 13, color: 'var(--txm)', marginBottom: 20 }}>
                This section requires manager or owner privileges.
              </p>
              <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              {route === '/dashboard' && <Dashboard onNavigate={navigate} />}
              {route === '/inventory' && (
                <Inventory
                  onNavigate={navigate}
                  initialSearch={searchParams.get('search') || ''}
                />
              )}
              {route === '/alerts' && <ExpiryAlerts onNavigate={navigate} />}
              {route === '/advisor' && (
                <AIAdvisor
                  initialParams={{
                    days_left: searchParams.get('days_left'),
                    stock: searchParams.get('stock'),
                    price: searchParams.get('price'),
                    cost: searchParams.get('cost'),
                    category: searchParams.get('category'),
                  }}
                />
              )}
              {route === '/demand' && <DemandForecast onNavigate={navigate} />}
              {route === '/b2b' && <B2BHub />}
              {route === '/fraud' && <FraudWatch />}
              {route === '/analytics' && <Analytics />}
              {route === '/suppliers' && <Suppliers />}
              {route === '/settings' && <StoreSettings />}
              {/* Fallback default route */}
              {route === '/' && <Dashboard onNavigate={navigate} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
