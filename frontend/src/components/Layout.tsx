import React from 'react';

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: 'Teacher' | 'Admin' | 'District';
}

interface LayoutProps {
  currentUser: UserProfile;
  onSignOut: () => void;
  isBackendOnline: boolean | null;
  activeTab: 'submit' | 'tracker' | 'approvals' | 'audits' | 'status';
  setActiveTab: (tab: 'submit' | 'tracker' | 'approvals' | 'audits' | 'status') => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentUser,
  onSignOut,
  isBackendOnline,
  activeTab,
  setActiveTab,
  children
}) => {
  return (
    <div className="portal-container">
      {/* Background blobs for premium glassmorphic depth */}
      <div className="blob-1"></div>
      <div className="blob-2"></div>
      
      {/* Header bar */}
      <header className="portal-header">
        <div className="logo-section">
          <div className="secure-badge">
            <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>SHIELD</span>
          </div>
          <h1>SecureSchoolForms</h1>
        </div>

        {/* User context switches & network state indicator */}
        <div className="header-meta">
          <div className={`network-pill ${isBackendOnline ? 'online' : 'simulated'}`}>
            <span className="pulse"></span>
            <span>{isBackendOnline ? 'API GATEWAY CONNECTED' : 'LOCAL SIMULATION ACTIVE'}</span>
          </div>

          <div className="user-profile">
            <div className="avatar">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="user-details">
              <div className="username">{currentUser.name}</div>
              <div className="user-role-badge">{currentUser.role}</div>
            </div>
            <button className="sign-out-btn" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main glass navigation menu */}
      <nav className="glass-nav">
        <button 
          className={activeTab === 'submit' ? 'active' : ''} 
          onClick={() => setActiveTab('submit')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          Submit Forms
        </button>
        <button 
          className={activeTab === 'tracker' ? 'active' : ''} 
          onClick={() => setActiveTab('tracker')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Track Workflows
        </button>
        <button 
          className={activeTab === 'approvals' ? 'active' : ''} 
          onClick={() => setActiveTab('approvals')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Approvals Portal
        </button>
        <button 
          className={activeTab === 'audits' ? 'active' : ''} 
          onClick={() => setActiveTab('audits')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="2" y1="7" x2="7" y2="7"></line>
            <line x1="2" y1="17" x2="7" y2="17"></line>
            <line x1="17" y1="17" x2="22" y2="17"></line>
            <line x1="17" y1="7" x2="22" y2="7"></line>
          </svg>
          Real-time Logs
        </button>
        <button 
          className={activeTab === 'status' ? 'active' : ''} 
          onClick={() => setActiveTab('status')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M3 12h18"></path>
            <path d="M9 5l3 7-3 7"></path>
            <path d="M15 5l-3 7 3 7"></path>
          </svg>
          System Status
        </button>
      </nav>

      {/* Dynamic Content Body */}
      <main className="content-container">
        {children}
      </main>
    </div>
  );
};
