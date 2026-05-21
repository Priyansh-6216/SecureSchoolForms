import { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

interface FormTemplate {
  formId: string;
  type: string;
  status: string;
}

interface FormSubmission {
  submissionId: string;
  formId: string;
  userId: string;
  data: string; // JSON
  status: string;
  createdAt: string;
  updatedAt?: string;
}

interface WorkflowInstance {
  workflowId: string;
  submissionId: string;
  currentStep: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AuditLog {
  logId: string;
  actionType: string;
  userId: string;
  timestamp: string;
  metadata?: string;
}

interface SimulatedNotification {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
}

// In-Memory fallback data in case backend is offline
const MOCK_FORMS: FormTemplate[] = [
  { formId: 'd3b07384-d113-49be-a5d6-5c1b528bfe01', type: 'Enrollment Form', status: 'Published' },
  { formId: 'd3b07384-d113-49be-a5d6-5c1b528bfe02', type: 'Transfer Form', status: 'Published' },
  { formId: 'd3b07384-d113-49be-a5d6-5c1b528bfe03', type: 'Transcript Request', status: 'Published' },
];

function App() {
  // Navigation & tabs
  const [activeTab, setActiveTab] = useState<'submit' | 'tracker' | 'approvals' | 'audits'>('submit');
  
  // App states
  const [forms, setForms] = useState<FormTemplate[]>(MOCK_FORMS);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<SimulatedNotification[]>([]);
  
  // Form submission state
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [studentName, setStudentName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('9th Grade');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [attachedDocument, setAttachedDocument] = useState<string | null>(null);
  
  // System configurations
  const [currentUserRole, setCurrentUserRole] = useState<'Teacher' | 'Admin' | 'District'>('Teacher');
  const [currentUserId, setCurrentUserId] = useState('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
  const [currentUserName, setCurrentUserName] = useState('Alex Rivers');
  
  // Status flags
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>({
    text: 'Loading system configuration...',
    type: 'info'
  });

  // Check backend health and fetch initial data
  const loadSystemData = async () => {
    setLoading(true);
    try {
      // 1. Fetch available forms
      const formsRes = await fetch(`${API_BASE}/form`);
      if (!formsRes.ok) throw new Error('API Gateway offline');
      const formsData = await formsRes.json();
      setForms(formsData.length > 0 ? formsData : MOCK_FORMS);
      setIsBackendOnline(true);
      
      // 2. Fetch audit logs
      const auditRes = await fetch(`${API_BASE}/audit`);
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }

      // 3. Fetch notifications
      const notifRes = await fetch(`${API_BASE}/notification`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }

      // 4. Fetch pending approvals (Workflows)
      const workflowsRes = await fetch(`${API_BASE}/workflow/pending/${currentUserId}`);
      if (workflowsRes.ok) {
        const wfData = await workflowsRes.json();
        setWorkflows(wfData);
      }

      setSystemMessage({
        text: 'Connected securely to Azure Microservice Gateway.',
        type: 'success'
      });
    } catch (err) {
      console.warn('Backend is offline, initiating local in-memory simulation mode.');
      setIsBackendOnline(false);
      setSystemMessage({
        text: 'Backend unreachable. Running in local-first interactive simulation mode.',
        type: 'info'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemData();
  }, [currentUserId]);

  // Clean messages automatically
  useEffect(() => {
    if (systemMessage && systemMessage.type !== 'info') {
      const timer = setTimeout(() => setSystemMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [systemMessage]);

  // Form submission handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm || !studentName.trim()) return;

    setLoading(true);
    const submissionId = crypto.randomUUID();
    const mockSubmission: FormSubmission = {
      submissionId,
      formId: selectedForm.formId,
      userId: currentUserId,
      data: JSON.stringify({
        studentName,
        gradeLevel,
        additionalDetails,
        attachedDocument: attachedDocument || 'No attachment'
      }),
      status: 'Submitted',
      createdAt: new Date().toISOString()
    };

    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/form/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockSubmission)
        });
        if (!res.ok) throw new Error('Submission failed');
        
        setSystemMessage({ text: 'Form submitted successfully! Workflow initiated.', type: 'success' });
        loadSystemData(); // Refresh all lists
      } catch (err) {
        setSystemMessage({ text: 'API error. Failed to send form to gateway.', type: 'error' });
      }
    } else {
      // Simulate locally
      const updatedSubmissions = [mockSubmission, ...submissions];
      setSubmissions(updatedSubmissions);

      // Create workflow
      const workflowId = crypto.randomUUID();
      const mockWf: WorkflowInstance = {
        workflowId,
        submissionId,
        currentStep: 'Teacher Review',
        status: 'InProgress',
        createdAt: new Date().toISOString()
      };
      setWorkflows([mockWf, ...workflows]);

      // Add local Audit Log
      const audit: AuditLog = {
        logId: crypto.randomUUID(),
        actionType: 'FormSubmitted',
        userId: currentUserId,
        timestamp: new Date().toISOString(),
        metadata: JSON.stringify(mockSubmission)
      };
      setAuditLogs([audit, ...auditLogs]);

      // Add local Notification
      const notif: SimulatedNotification = {
        id: crypto.randomUUID(),
        type: 'Email',
        recipient: `${studentName.toLowerCase().replace(/ /g, '')}@school.edu`,
        subject: 'Form Submitted Successfully',
        body: `Dear student, your '${selectedForm.type}' was submitted successfully and has entered the evaluation workflow. Tracking ID: ${submissionId}`,
        timestamp: new Date().toISOString()
      };
      setNotifications([notif, ...notifications]);

      setSystemMessage({
        text: 'Simulation Mode: Form submitted and event routed to Workflow Engine.',
        type: 'success'
      });
    }

    // Reset inputs
    setSelectedForm(null);
    setStudentName('');
    setAdditionalDetails('');
    setAttachedDocument(null);
    setLoading(false);
  };

  // Workflow Approval handler
  const handleApprove = async (workflowId: string) => {
    setLoading(true);
    
    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/workflow/${workflowId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUserId)
        });
        if (!res.ok) throw new Error('Approval failed');
        
        setSystemMessage({ text: 'Workflow step advanced successfully!', type: 'success' });
        loadSystemData();
      } catch (err) {
        setSystemMessage({ text: 'Failed to approve via Gateway.', type: 'error' });
      }
    } else {
      // Local simulation logic
      const targetWfIndex = workflows.findIndex(w => w.workflowId === workflowId);
      if (targetWfIndex !== -1) {
        const updatedWfs = [...workflows];
        const wf = { ...updatedWfs[targetWfIndex] };
        
        let nextStep = '';
        let finalStatus = 'InProgress';
        
        if (wf.currentStep === 'Teacher Review') {
          nextStep = 'School Admin Review';
        } else if (wf.currentStep === 'School Admin Review') {
          nextStep = 'District Approval';
        } else if (wf.currentStep === 'District Approval') {
          nextStep = 'Completed';
          finalStatus = 'Completed';
        } else {
          nextStep = 'Completed';
          finalStatus = 'Completed';
        }
        
        wf.currentStep = nextStep;
        wf.status = finalStatus;
        wf.updatedAt = new Date().toISOString();
        updatedWfs[targetWfIndex] = wf;
        setWorkflows(updatedWfs);

        // Update corresponding submission status
        const subIndex = submissions.findIndex(s => s.submissionId === wf.submissionId);
        if (subIndex !== -1) {
          const updatedSubs = [...submissions];
          updatedSubs[subIndex] = {
            ...updatedSubs[subIndex],
            status: finalStatus === 'Completed' ? 'Approved' : `Review (${nextStep})`,
            updatedAt: new Date().toISOString()
          };
          setSubmissions(updatedSubs);
        }

        // Add local Audit log
        const audit: AuditLog = {
          logId: crypto.randomUUID(),
          actionType: finalStatus === 'Completed' ? 'WorkflowCompleted' : `StepApproved: ${updatedWfs[targetWfIndex].currentStep}`,
          userId: currentUserId,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({ workflowId, nextStep })
        };
        setAuditLogs([audit, ...auditLogs]);

        // Add local notification
        const notif: SimulatedNotification = {
          id: crypto.randomUUID(),
          type: 'SMS',
          recipient: `+1 (555) 019-8732 (Officer: ${currentUserName})`,
          subject: finalStatus === 'Completed' ? 'Workflow fully completed!' : 'Workflow step advanced',
          body: `Submission ${wf.submissionId} advanced from '${updatedWfs[targetWfIndex].currentStep}' to '${nextStep}' by ${currentUserName}.`,
          timestamp: new Date().toISOString()
        };
        setNotifications([notif, ...notifications]);

        setSystemMessage({
          text: `Simulation: Step approved! Moved to ${nextStep}.`,
          type: 'success'
        });
      }
    }
    setLoading(false);
  };

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
              {currentUserName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="user-details">
              <div className="username">{currentUserName}</div>
              <div className="role-selector">
                <select 
                  value={currentUserRole} 
                  onChange={(e) => {
                    const role = e.target.value as any;
                    setCurrentUserRole(role);
                    if (role === 'Teacher') {
                      setCurrentUserName('Alex Rivers');
                      setCurrentUserId('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
                    } else if (role === 'Admin') {
                      setCurrentUserName('Principal Eleanor');
                      setCurrentUserId('f5e4d3c2-b1a0-9e8d-7c6b-5a4b3c2d1e0f');
                    } else {
                      setCurrentUserName('Superintendent Davis');
                      setCurrentUserId('9e8d7c6b-5a4b-3c2d-1e0f-f5e4d3c2b1a0');
                    }
                  }}
                >
                  <option value="Teacher">Teacher (Alex)</option>
                  <option value="Admin">Principal (Eleanor)</option>
                  <option value="District">Superintendent (Davis)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Realtime dynamic toast notification alerts */}
      {systemMessage && (
        <div className={`toast-message ${systemMessage.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {systemMessage.type === 'success' && '✓'}
              {systemMessage.type === 'error' && '✕'}
              {systemMessage.type === 'info' && 'ℹ'}
            </span>
            <p>{systemMessage.text}</p>
          </div>
        </div>
      )}

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
      </nav>

      {/* Dynamic Content Body */}
      <main className="content-container">
        {loading && <div className="loader-overlay"><div className="loader"></div></div>}

        {/* TAB 1: SUBMIT FORMS */}
        {activeTab === 'submit' && (
          <section className="tab-pane">
            <div className="intro-text">
              <h2>Select and Submit a Secure Administrative Request</h2>
              <p>All forms are processed locally using zero-trust encryption and automatic multi-stage administrative event workflows.</p>
            </div>

            <div className="cards-grid">
              {forms.map(form => (
                <div 
                  key={form.formId} 
                  className={`form-card ${form.type.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => setSelectedForm(form)}
                >
                  <div className="card-glare"></div>
                  <div className="form-icon-wrap">
                    {form.type.includes('Enrollment') && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="card-icon">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    )}
                    {form.type.includes('Transfer') && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="card-icon">
                        <polyline points="16 3 21 3 21 8"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                        <polyline points="8 21 3 21 3 16"></polyline>
                        <line x1="3" y1="21" x2="14" y2="10"></line>
                      </svg>
                    )}
                    {form.type.includes('Transcript') && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="card-icon">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        <polygon points="12 11 12 17 17 14"></polygon>
                      </svg>
                    )}
                  </div>
                  <h3>{form.type}</h3>
                  <p>Secure routing via gateway, triggering notifications and multi-stage audit trails.</p>
                  <span className="submit-action-btn">Fill Request →</span>
                </div>
              ))}
            </div>

            {/* Form Overlay Modal */}
            {selectedForm && (
              <div className="modal-backdrop" onClick={() => setSelectedForm(null)}>
                <div className="modal-content glass-pane" onClick={e => e.stopPropagation()}>
                  <button className="close-btn" onClick={() => setSelectedForm(null)}>×</button>
                  <div className="modal-header">
                    <span className="pre-title">FORM PORTAL</span>
                    <h2>Submit {selectedForm.type}</h2>
                  </div>
                  
                  <form onSubmit={handleFormSubmit} className="interactive-form">
                    <div className="form-group">
                      <label>Student Full Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Priyansh Sharma"
                        value={studentName}
                        onChange={e => setStudentName(e.target.value)}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Grade Level</label>
                        <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}>
                          <option>9th Grade</option>
                          <option>10th Grade</option>
                          <option>11th Grade</option>
                          <option>12th Grade</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Upload Supporting PDF</label>
                        <div className="file-uploader-mock">
                          <input 
                            type="file" 
                            id="file-input" 
                            accept=".pdf" 
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                if (isBackendOnline) {
                                  try {
                                    setLoading(true);
                                    const formData = new FormData();
                                    formData.append("file", file);
                                    formData.append("uploadedBy", currentUserId);
                                    const uploadRes = await fetch(`${API_BASE}/document/upload`, {
                                      method: "POST",
                                      body: formData
                                    });
                                    if (!uploadRes.ok) throw new Error("File upload failed");
                                    const docInfo = await uploadRes.json();
                                    setAttachedDocument(docInfo.fileUrl);
                                    setSystemMessage({ text: `Uploaded and encrypted ${file.name} successfully.`, type: "success" });
                                  } catch (err) {
                                    setSystemMessage({ text: "Failed to upload document to DocumentService.", type: "error" });
                                  } finally {
                                    setLoading(false);
                                  }
                                } else {
                                  setAttachedDocument(file.name);
                                  setSystemMessage({ text: `Attached ${file.name} successfully (Simulation).`, type: "success" });
                                }
                              }
                            }}
                          />
                          <label htmlFor="file-input" className="file-label">
                            <span className="icon">📎</span>
                            <span className="text">
                              {attachedDocument 
                                ? attachedDocument.startsWith("http") || attachedDocument.startsWith("/") 
                                  ? `Uploaded: ${attachedDocument.substring(attachedDocument.lastIndexOf("/") + 1)}`
                                  : attachedDocument
                                : "Choose PDF File"}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Reason / Additional Details</label>
                      <textarea 
                        rows={4} 
                        placeholder="Please elaborate on your request details. E.g. transferring schools due to family relocation..."
                        value={additionalDetails}
                        onChange={e => setAdditionalDetails(e.target.value)}
                      />
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="cancel-btn" onClick={() => setSelectedForm(null)}>Cancel</button>
                      <button type="submit" className="submit-btn">Submit to Secure Gateway</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: WORKFLOW TRACKER */}
        {activeTab === 'tracker' && (
          <section className="tab-pane">
            <div className="intro-text">
              <h2>Real-time Administrative Workflow Visualizer</h2>
              <p>Monitor your submissions as they traverse the multi-stage validation engine in real time.</p>
            </div>

            {submissions.length === 0 ? (
              <div className="empty-state glass-pane">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p>No submissions found. Submit a school form under the <strong>Submit Forms</strong> tab to start a workflow!</p>
              </div>
            ) : (
              <div className="submissions-list">
                {submissions.map(sub => {
                  const matchingForm = forms.find(f => f.formId === sub.formId);
                  const matchingWf = workflows.find(w => w.submissionId === sub.submissionId);
                  const subData = JSON.parse(sub.data);
                  
                  return (
                    <div key={sub.submissionId} className="submission-row glass-pane">
                      <div className="submission-row-header">
                        <div className="sub-meta-left">
                          <span className="sub-type-badge">{matchingForm?.type || 'School Form'}</span>
                          <span className="sub-id">ID: {sub.submissionId.substring(0, 8)}...</span>
                        </div>
                        <div className="sub-meta-right">
                          <span className="sub-date">{new Date(sub.createdAt).toLocaleString()}</span>
                          <span className={`status-badge ${sub.status.toLowerCase().replace(/ /g, '-')}`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      <div className="submission-details">
                        <p><strong>Student:</strong> {subData.studentName} ({subData.gradeLevel})</p>
                        {subData.additionalDetails && <p><strong>Details:</strong> {subData.additionalDetails}</p>}
                        {subData.attachedDocument && <p className="attachment-meta">📎 Document: <span>{subData.attachedDocument}</span></p>}
                      </div>

                      {/* Visual progress bar timeline */}
                      {matchingWf && (
                        <div className="workflow-timeline-wrapper">
                          <div className="workflow-timeline-title">Workflow Progress (Engine Instantiated)</div>
                          <div className="workflow-timeline">
                            <div className="timeline-step completed">
                              <span className="step-number">✓</span>
                              <span className="step-text">Submitted</span>
                            </div>

                            <div className={`timeline-step ${
                              matchingWf.currentStep !== 'Teacher Review' || matchingWf.status === 'Completed' ? 'completed' : 'active'
                            }`}>
                              <span className="step-number">
                                {matchingWf.currentStep !== 'Teacher Review' || matchingWf.status === 'Completed' ? '✓' : '●'}
                              </span>
                              <span className="step-text">Teacher Review</span>
                            </div>

                            <div className={`timeline-step ${
                              (matchingWf.currentStep !== 'Teacher Review' && matchingWf.currentStep !== 'School Admin Review') || matchingWf.status === 'Completed'
                                ? 'completed' 
                                : matchingWf.currentStep === 'School Admin Review' && matchingWf.status !== 'Completed' ? 'active' : 'upcoming'
                            }`}>
                              <span className="step-number">
                                {(matchingWf.currentStep !== 'Teacher Review' && matchingWf.currentStep !== 'School Admin Review') || matchingWf.status === 'Completed' ? '✓' : '●'}
                              </span>
                              <span className="step-text">Admin Review</span>
                            </div>

                            <div className={`timeline-step ${
                              matchingWf.status === 'Completed' 
                                ? 'completed' 
                                : matchingWf.currentStep === 'District Approval' ? 'active' : 'upcoming'
                            }`}>
                              <span className="step-number">
                                {matchingWf.status === 'Completed' ? '✓' : '●'}
                              </span>
                              <span className="step-text">District Officer</span>
                            </div>

                            <div className={`timeline-step ${matchingWf.status === 'Completed' ? 'completed' : 'upcoming'}`}>
                              <span className="step-number">
                                {matchingWf.status === 'Completed' ? '✓' : '●'}
                              </span>
                              <span className="step-text">Completed</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: APPROVALS PORTAL */}
        {activeTab === 'approvals' && (
          <section className="tab-pane">
            <div className="intro-text">
              <h2>Secure Approvals Portal</h2>
              <p>View and manage pending approvals matching your active administrative role.</p>
            </div>

            <div className="role-banner glass-pane">
              <span className="banner-role-badge">{currentUserRole.toUpperCase()} VIEW</span>
              <p>You are logged in as <strong>{currentUserName}</strong>. You see forms pending evaluation at the current stage.</p>
            </div>

            {workflows.filter(w => {
              if (w.status === 'Completed') return false;
              if (currentUserRole === 'Teacher' && w.currentStep === 'Teacher Review') return true;
              if (currentUserRole === 'Admin' && w.currentStep === 'School Admin Review') return true;
              if (currentUserRole === 'District' && w.currentStep === 'District Approval') return true;
              return false;
            }).length === 0 ? (
              <div className="empty-state glass-pane">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <p>No pending approvals found for the role <strong>{currentUserRole}</strong> at this time.</p>
              </div>
            ) : (
              <div className="approvals-grid">
                {workflows.filter(w => {
                  if (w.status === 'Completed') return false;
                  if (currentUserRole === 'Teacher' && w.currentStep === 'Teacher Review') return true;
                  if (currentUserRole === 'Admin' && w.currentStep === 'School Admin Review') return true;
                  if (currentUserRole === 'District' && w.currentStep === 'District Approval') return true;
                  return false;
                }).map(wf => {
                  const matchingSub = submissions.find(s => s.submissionId === wf.submissionId);
                  const matchingForm = forms.find(f => f.formId === matchingSub?.formId);
                  const subData = matchingSub ? JSON.parse(matchingSub.data) : { studentName: 'Unknown', gradeLevel: 'N/A' };
                  
                  return (
                    <div key={wf.workflowId} className="approval-card glass-pane">
                      <div className="approval-card-header">
                        <h4>{matchingForm?.type || 'Secure Form'}</h4>
                        <span className="step-indicator-pill">{wf.currentStep}</span>
                      </div>
                      
                      <div className="approval-card-body">
                        <p><strong>Student Name:</strong> {subData.studentName}</p>
                        <p><strong>Grade:</strong> {subData.gradeLevel}</p>
                        <p><strong>Submission ID:</strong> {wf.submissionId.substring(0, 8)}...</p>
                        {subData.additionalDetails && (
                          <div className="details-box">
                            <span className="title">Relocation Details/Reason:</span>
                            <p>"{subData.additionalDetails}"</p>
                          </div>
                        )}
                        {subData.attachedDocument && (
                          <div className="attachment-box">
                            <span>📎 Document Attachment: <strong>{subData.attachedDocument}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="approval-card-actions">
                        <button className="reject-action-btn" onClick={() => setSystemMessage({ text: 'Rejections require additional notes (Feature coming in Day 4).', type: 'info' })}>
                          Reject
                        </button>
                        <button className="approve-action-btn" onClick={() => handleApprove(wf.workflowId)}>
                          Approve and Advance
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: REAL-TIME AUDIT LOGS & NOTIFICATIONS */}
        {activeTab === 'audits' && (
          <section className="tab-pane">
            <div className="intro-text">
              <h2>Real-Time Microservices Audit Trail & Notification dispatch</h2>
              <p>Explore generated events in real-time processed across the decentralized microservices.</p>
            </div>

            <div className="monitoring-split-pane">
              {/* Left Side: Audit Trail */}
              <div className="monitor-column glass-pane">
                <div className="monitor-header">
                  <h3>🛡️ Secure Audit logs (AuditService)</h3>
                  <span className="service-tag">PORT 5003</span>
                </div>
                
                <div className="monitor-terminal">
                  {auditLogs.length === 0 ? (
                    <div className="terminal-empty">Waiting for auditable actions...</div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.logId} className="terminal-line">
                        <span className="timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`action-badge ${log.actionType.toLowerCase().startsWith('step') ? 'approve' : 'submit'}`}>
                          {log.actionType}
                        </span>
                        <span className="text">
                          triggered by user {log.userId.substring(0, 8)}...
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Notification Logs */}
              <div className="monitor-column glass-pane">
                <div className="monitor-header">
                  <h3>🔔 Dispatched alerts (NotificationService)</h3>
                  <span className="service-tag">PORT 5004</span>
                </div>

                <div className="monitor-terminal notification-view">
                  {notifications.length === 0 ? (
                    <div className="terminal-empty">No sent notifications logged.</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="notification-card-wrap">
                        <div className="notif-top">
                          <span className={`channel-pill ${notif.type.toLowerCase()}`}>{notif.type}</span>
                          <span className="recipient">{notif.recipient}</span>
                        </div>
                        <div className="notif-title">{notif.subject}</div>
                        <div className="notif-body">"{notif.body}"</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
