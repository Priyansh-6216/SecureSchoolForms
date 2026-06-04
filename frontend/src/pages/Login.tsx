import React from 'react';
import { Toast } from '../components/Toast';

interface LoginProps {
  systemMessage: {
    text: string;
    type: 'info' | 'error' | 'success';
  } | null;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginError: string | null;
  loading: boolean;
  handleLogin: (e: React.FormEvent) => Promise<void> | void;
}

export const Login: React.FC<LoginProps> = ({
  systemMessage,
  loginEmail,
  setLoginEmail,
  loginError,
  loading,
  handleLogin
}) => {
  return (
    <div className="portal-container login-mode">
      {/* Background blobs for premium glassmorphic depth */}
      <div className="blob-1"></div>
      <div className="blob-2"></div>
      
      {/* Toast Alerts */}
      <Toast message={systemMessage} />

      <div className="login-card-container">
        <div className="login-card glass-pane animate-fade-in">
          <div className="secure-badge">
            <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>SHIELD SECURE SIGN-IN</span>
          </div>
          <h2>SecureSchoolForms</h2>
          <p className="login-subtitle">Zero-Trust Administrative Form Processing Dashboard</p>
          
          <form onSubmit={handleLogin} className="interactive-form login-form">
            <div className="form-group">
              <label>Administrative Email Address</label>
              <input 
                type="email" 
                required 
                placeholder="e.g. alex.rivers@school.edu" 
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </div>
            
            {loginError && <p className="login-error-text">⚠️ {loginError}</p>}
            
            <button type="submit" className="login-submit-btn">
              {loading ? "Authenticating..." : "Secure Sign In"}
            </button>
          </form>

          <div className="mock-accounts-helper">
            <h4>💡 Pre-registered Test Credentials:</h4>
            <ul>
              <li onClick={() => setLoginEmail('alex.rivers@school.edu')}>
                <strong>Teacher:</strong> <span>alex.rivers@school.edu</span>
              </li>
              <li onClick={() => setLoginEmail('eleanor.vance@school.edu')}>
                <strong>Principal:</strong> <span>eleanor.vance@school.edu</span>
              </li>
              <li onClick={() => setLoginEmail('davis.officer@district.edu')}>
                <strong>Superintendent:</strong> <span>davis.officer@district.edu</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
