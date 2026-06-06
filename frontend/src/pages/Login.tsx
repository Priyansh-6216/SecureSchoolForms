import React, { useState } from 'react';
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
  handleRegister: (name: string, email: string, role: 'Teacher' | 'Admin' | 'District', schoolId: string) => Promise<void> | void;
}

export const Login: React.FC<LoginProps> = ({
  systemMessage,
  loginEmail,
  setLoginEmail,
  loginError,
  loading,
  handleLogin,
  handleRegister
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerRole, setRegisterRole] = useState<'Teacher' | 'Admin' | 'District'>('Teacher');
  const [registerSchoolId, setRegisterSchoolId] = useState('');

  const onRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim() || !registerSchoolId.trim()) return;
    await handleRegister(registerName.trim(), registerEmail.trim(), registerRole, registerSchoolId.trim());
  };

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
            <span>SHIELD SECURE {isRegisterMode ? 'REGISTRATION' : 'SIGN-IN'}</span>
          </div>
          <h2>SecureSchoolForms</h2>
          <p className="login-subtitle">
            {isRegisterMode 
              ? "Register a new administrative account on the zero-trust form dashboard" 
              : "Zero-Trust Administrative Form Processing Dashboard"}
          </p>
          
          {!isRegisterMode ? (
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
          ) : (
            <form onSubmit={onRegisterSubmit} className="interactive-form login-form">
              <div className="form-group">
                <label>Full Administrative Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Priyansh Sharma" 
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Administrative Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="e.g. priyansh.sharma@school.edu" 
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Administrative Role</label>
                  <select 
                    value={registerRole} 
                    onChange={e => {
                      const selected = e.target.value as 'Teacher' | 'Admin' | 'District';
                      setRegisterRole(selected);
                      // Autofill helper school IDs
                      if (selected === 'District') {
                        setRegisterSchoolId('District-Office');
                      } else {
                        setRegisterSchoolId('HighSchool-01');
                      }
                    }}
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Admin">Admin</option>
                    <option value="District">District</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{registerRole === 'District' ? 'District ID' : 'School ID'}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder={registerRole === 'District' ? 'e.g. District-Office' : 'e.g. HighSchool-01'} 
                    value={registerSchoolId}
                    onChange={e => setRegisterSchoolId(e.target.value)}
                  />
                </div>
              </div>
              
              {loginError && <p className="login-error-text">⚠️ {loginError}</p>}
              
              <button type="submit" className="login-submit-btn">
                {loading ? "Registering..." : "Create Account & Sign In"}
              </button>
            </form>
          )}

          <button 
            type="button" 
            className="auth-toggle-link" 
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setLoginEmail('');
            }}
          >
            {isRegisterMode 
              ? <span>Already have an account? <strong>Sign In</strong></span>
              : <span>Need to register? <strong>Create an Account</strong></span>
            }
          </button>

          {!isRegisterMode && (
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
          )}
        </div>
      </div>
    </div>
  );
};

