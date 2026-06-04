import { useState, useEffect } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const GATEWAY_BASE = API_BASE.replace(/\/api$/, '') || 'http://localhost:5000';

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

interface ServiceStatus {
  service: string;
  version: string;
  status: string;
  online: boolean;
  endpoint: string;
  swagger?: string;
  error?: string;
}

// In-Memory fallback data in case backend is offline
const MOCK_FORMS: FormTemplate[] = [
  { formId: 'd3b07384-d113-49be-a5d6-5c1b528bfe01', type: 'Enrollment Form', status: 'Published' },
  { formId: 'd3b07384-d113-49be-a5d6-5c1b528bfe02', type: 'Transfer Form', status: 'Published' },
  { formId: 'd3b07384-d113-49be-a5d6-5c1b528bfe03', type: 'Transcript Request', status: 'Published' },
];

function App() {
  // Navigation & tabs
  const [activeTab, setActiveTab] = useState<'submit' | 'tracker' | 'approvals' | 'audits' | 'status'>('submit');
  
  // App states
  const [forms, setForms] = useState<FormTemplate[]>(MOCK_FORMS);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<SimulatedNotification[]>([]);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  
  // Form submission state
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [studentName, setStudentName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('9th Grade');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [attachedDocument, setAttachedDocument] = useState<string | null>(null);
  
  interface UploadedDoc {
    documentId: string;
    originalFileName: string;
    fileUrl: string;
    encryptedKey: string;
    uploadedAt: string;
    status: string;
  }
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, 'verifying' | 'verified'>>({});
  const [securityBlock, setSecurityBlock] = useState<{ active: boolean; file: string; role: string } | null>(null);
  
  // User profile session interface
  interface UserProfile {
    userId: string;
    name: string;
    email: string;
    role: 'Teacher' | 'Admin' | 'District';
  }

  // Active session and form/login inputs
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeRejectWfId, setActiveRejectWfId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeReturnWfId, setActiveReturnWfId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

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
      // 0. Fetch gateway aggregated status of all microservices
      const statusRes = await fetch(`${GATEWAY_BASE}/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setServiceStatuses(statusData.dependencies ?? []);
      }

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

      // 4. Fetch pending approvals (Workflows) if user logged in
      if (currentUser) {
        const workflowsRes = await fetch(`${API_BASE}/workflow/pending/${currentUser.userId}`);
        if (workflowsRes.ok) {
          const wfData = await workflowsRes.json();
          setWorkflows(wfData);
        }
      }

      setSystemMessage({
        text: 'Connected securely to Azure Microservice Gateway.',
        type: 'success'
      });
    } catch (err) {
      console.warn('Backend is offline, initiating local in-memory simulation mode.');
      setIsBackendOnline(false);
      setServiceStatuses([
        { service: 'ApiGateway', version: '1.0', status: 'Offline', online: false, endpoint: `${GATEWAY_BASE}/status` },
        { service: 'FormService', version: 'Offline', status: 'Offline', online: false, endpoint: 'http://localhost:5001/status', swagger: 'http://localhost:5001/swagger' },
        { service: 'WorkflowEngine', version: 'Offline', status: 'Offline', online: false, endpoint: 'http://localhost:5002/status', swagger: 'http://localhost:5002/swagger' },
        { service: 'AuditService', version: 'Offline', status: 'Offline', online: false, endpoint: 'http://localhost:5003/status', swagger: 'http://localhost:5003/swagger' },
        { service: 'NotificationService', version: 'Offline', status: 'Offline', online: false, endpoint: 'http://localhost:5004/status', swagger: 'http://localhost:5004/swagger' },
        { service: 'AuthService', version: 'Offline', status: 'Offline', online: false, endpoint: 'http://localhost:5005/status', swagger: 'http://localhost:5005/swagger' },
        { service: 'DocumentService', version: 'Offline', status: 'Offline', online: false, endpoint: 'http://localhost:5006/status', swagger: 'http://localhost:5006/swagger' }
      ]);
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
  }, [currentUser]);

  // Clean messages automatically
  useEffect(() => {
    if (systemMessage && systemMessage.type !== 'info') {
      const timer = setTimeout(() => setSystemMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [systemMessage]);

  const verifyIntegrity = (docId: string) => {
    setVerifiedDocs(prev => ({ ...prev, [docId]: 'verifying' }));
    setTimeout(() => {
      setVerifiedDocs(prev => ({ ...prev, [docId]: 'verified' }));
      setSystemMessage({ text: 'SHA-256 digital signature verified successfully.', type: 'success' });
    }, 1200);
  };

  const triggerSecureDownload = async (fileUrl: string, fileName: string) => {
    if (!currentUser) return;

    // Enforce Front-End Zero-Trust Policy
    if (currentUser.role === 'Teacher') {
      setSecurityBlock({
        active: true,
        file: fileName,
        role: currentUser.role
      });

      if (!isBackendOnline) {
        const audit: AuditLog = {
          logId: crypto.randomUUID(),
          actionType: 'AccessViolationBlocked',
          userId: currentUser.userId,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({ fileUrl, fileName, reason: 'Zero-Trust RBAC Policy Enforcement' })
        };
        setAuditLogs(prev => [audit, ...prev]);

        const notif: SimulatedNotification = {
          id: crypto.randomUUID(),
          type: 'SMS',
          recipient: '+1 (555) Security-Office',
          subject: '🚨 Zero-Trust Policy Violation',
          body: `User ${currentUser.name} (Teacher) attempted unauthorized retrieval of encrypted file '${fileName}'. Access was blocked.`,
          timestamp: new Date().toISOString()
        };
        setNotifications(prev => [notif, ...prev]);
      }
      return;
    }

    if (isBackendOnline) {
      try {
        setLoading(true);
        const downloadUrl = `${GATEWAY_BASE}${fileUrl}?userId=${currentUser.userId}`;
        const res = await fetch(downloadUrl);
        if (res.status === 403) {
          const errData = await res.json();
          setSystemMessage({ text: `Backend Denied: ${errData.details || errData.message}`, type: 'error' });
          return;
        }
        if (!res.ok) throw new Error('Download failed');
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.includes('.') ? fileName : `${fileName}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        setSystemMessage({ text: 'Decrypted and downloaded file successfully!', type: 'success' });
        loadSystemData();
      } catch (err) {
        setSystemMessage({ text: 'Failed to securely download document.', type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      setSystemMessage({ 
        text: `Simulation: Resolved key from Key Vault. Decrypted and downloaded ${fileName}.`, 
        type: 'success' 
      });

      const audit: AuditLog = {
        logId: crypto.randomUUID(),
        actionType: 'DocumentDownloaded',
        userId: currentUser.userId,
        timestamp: new Date().toISOString(),
        metadata: JSON.stringify({ fileUrl, fileName, keyVaultSecret: `envelope-key-${fileUrl.split('/').pop()}` })
      };
      setAuditLogs(prev => [audit, ...prev]);

      const blob = new Blob([`SecureSchoolForms - Decrypted Document File: ${fileName}\nKey Vault Secret Ref: envelope-key-${fileUrl.split('/').pop()}\nDecryption Timestamp: ${new Date().toISOString()}`], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decrypted_${fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  // Form submission handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm || !studentName.trim() || !currentUser) return;

    setLoading(true);
    const submissionId = crypto.randomUUID();
    const mockSubmission: FormSubmission = {
      submissionId,
      formId: selectedForm.formId,
      userId: currentUser.userId,
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
        userId: currentUser.userId,
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
    if (!currentUser) return;
    setLoading(true);
    
    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/workflow/${workflowId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUser.userId)
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
          userId: currentUser.userId,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({ workflowId, nextStep })
        };
        setAuditLogs([audit, ...auditLogs]);

        // Add local notification
        const notif: SimulatedNotification = {
          id: crypto.randomUUID(),
          type: 'SMS',
          recipient: `+1 (555) 019-8732 (Officer: ${currentUser.name})`,
          subject: finalStatus === 'Completed' ? 'Workflow fully completed!' : 'Workflow step advanced',
          body: `Submission ${wf.submissionId} advanced from '${updatedWfs[targetWfIndex].currentStep}' to '${nextStep}' by ${currentUser.name}.`,
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

  // Workflow Rejection handler
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRejectWfId || !rejectionReason.trim() || !currentUser) return;
    setLoading(true);

    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/workflow/${activeRejectWfId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rejectedBy: currentUser.userId,
            reason: rejectionReason.trim()
          })
        });
        if (!res.ok) throw new Error('Rejection failed');
        setSystemMessage({ text: 'Workflow step rejected successfully.', type: 'success' });
        loadSystemData();
      } catch (err) {
        setSystemMessage({ text: 'Failed to submit rejection via Gateway.', type: 'error' });
      }
    } else {
      // Local simulation logic for rejection
      const targetWfIndex = workflows.findIndex(w => w.workflowId === activeRejectWfId);
      if (targetWfIndex !== -1) {
        const updatedWfs = [...workflows];
        const wf = { ...updatedWfs[targetWfIndex] };
        
        wf.status = 'Rejected';
        wf.updatedAt = new Date().toISOString();
        updatedWfs[targetWfIndex] = wf;
        setWorkflows(updatedWfs);

        // Update corresponding submission status to Rejected
        const subIndex = submissions.findIndex(s => s.submissionId === wf.submissionId);
        if (subIndex !== -1) {
          const updatedSubs = [...submissions];
          updatedSubs[subIndex] = {
            ...updatedSubs[subIndex],
            status: 'Rejected',
            updatedAt: new Date().toISOString()
          };
          setSubmissions(updatedSubs);
        }

        // Add local Audit log
        const audit: AuditLog = {
          logId: crypto.randomUUID(),
          actionType: 'WorkflowRejected',
          userId: currentUser.userId,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({ workflowId: activeRejectWfId, reason: rejectionReason })
        };
        setAuditLogs([audit, ...auditLogs]);

        // Add local notification
        const notif: SimulatedNotification = {
          id: crypto.randomUUID(),
          type: 'Email',
          recipient: `student_linked_to_${wf.submissionId.substring(0, 8)}@school.edu`,
          subject: 'Form Request Rejected',
          body: `Important: Your form submission ${wf.submissionId} has been rejected at the '${wf.currentStep}' stage by User ${currentUser.name}. Reason: ${rejectionReason}`,
          timestamp: new Date().toISOString()
        };
        setNotifications([notif, ...notifications]);

        setSystemMessage({
          text: `Simulation: Request rejected.`,
          type: 'success'
        });
      }
    }

    // Reset states
    setActiveRejectWfId(null);
    setRejectionReason('');
    setLoading(false);
  };

  // Workflow Return handler
  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReturnWfId || !returnReason.trim() || !currentUser) return;
    setLoading(true);

    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/workflow/${activeReturnWfId}/return`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            returnedBy: currentUser.userId,
            reason: returnReason.trim()
          })
        });
        if (!res.ok) throw new Error('Return failed');
        setSystemMessage({ text: 'Workflow returned for changes.', type: 'success' });
        loadSystemData();
      } catch (err) {
        setSystemMessage({ text: 'Failed to submit return via Gateway.', type: 'error' });
      }
    } else {
      // Local simulation logic for return
      const targetWfIndex = workflows.findIndex(w => w.workflowId === activeReturnWfId);
      if (targetWfIndex !== -1) {
        const updatedWfs = [...workflows];
        const wf = { ...updatedWfs[targetWfIndex] };
        
        wf.status = 'ReturnedForChanges';
        wf.updatedAt = new Date().toISOString();
        updatedWfs[targetWfIndex] = wf;
        setWorkflows(updatedWfs);

        // Update corresponding submission status to ReturnedForChanges
        const subIndex = submissions.findIndex(s => s.submissionId === wf.submissionId);
        if (subIndex !== -1) {
          const updatedSubs = [...submissions];
          updatedSubs[subIndex] = {
            ...updatedSubs[subIndex],
            status: 'ReturnedForChanges',
            updatedAt: new Date().toISOString()
          };
          setSubmissions(updatedSubs);
        }

        // Add local Audit log
        const audit: AuditLog = {
          logId: crypto.randomUUID(),
          actionType: 'WorkflowReturned',
          userId: currentUser.userId,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({ workflowId: activeReturnWfId, reason: returnReason })
        };
        setAuditLogs(prev => [audit, ...prev]);

        // Add local notification
        const notif: SimulatedNotification = {
          id: crypto.randomUUID(),
          type: 'Email',
          recipient: `student_linked_to_${wf.submissionId.substring(0, 8)}@school.edu`,
          subject: 'Form Returned for Changes',
          body: `Notice: Your form submission ${wf.submissionId} has been returned for changes at the '${wf.currentStep}' stage by User ${currentUser.name}. Reason: ${returnReason}`,
          timestamp: new Date().toISOString()
        };
        setNotifications(prev => [notif, ...prev]);

        setSystemMessage({
          text: `Simulation: Request returned for changes.`,
          type: 'success'
        });
      }
    }

    // Reset states
    setActiveReturnWfId(null);
    setReturnReason('');
    setLoading(false);
  };

  // Secure User Session Authentication handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);

    const email = loginEmail.trim();
    if (!email) {
      setLoginError('Email is required.');
      setLoading(false);
      return;
    }

    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (res.status === 401 || res.status === 404) {
          throw new Error('User not found. Use a pre-configured school email.');
        }
        if (!res.ok) throw new Error('Auth Gateway Error');
        const userData = await res.json();
        setCurrentUser({
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          role: userData.role
        });
        setSystemMessage({ text: `Welcome back, ${userData.name}!`, type: 'success' });
      } catch (err: any) {
        setLoginError(err.message || 'Failed to authenticate with AuthService.');
      } finally {
        setLoading(false);
      }
    } else {
      // Simulate locally
      const mockUsers = [
        { userId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', name: 'Alex Rivers', email: 'alex.rivers@school.edu', role: 'Teacher' as const },
        { userId: 'f5e4d3c2-b1a0-9e8d-7c6b-5a4b3c2d1e0f', name: 'Principal Eleanor', email: 'eleanor.vance@school.edu', role: 'Admin' as const },
        { userId: '9e8d7c6b-5a4b-3c2d-1e0f-f5e4d3c2b1a0', name: 'Superintendent Davis', email: 'davis.officer@district.edu', role: 'District' as const }
      ];
      const match = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (match) {
        setCurrentUser(match);
        setSystemMessage({ text: `Simulation: Logged in as ${match.name} (${match.role})`, type: 'success' });
      } else {
        setLoginError('Email not registered. Try: alex.rivers@school.edu, eleanor.vance@school.edu, or davis.officer@district.edu');
      }
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="portal-container login-mode">
        {/* Background blobs for premium glassmorphic depth */}
        <div className="blob-1"></div>
        <div className="blob-2"></div>
        
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
  }

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
            <button className="sign-out-btn" onClick={() => setCurrentUser(null)}>
              Sign Out
            </button>
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
                                if (!currentUser) return;
                                if (isBackendOnline) {
                                  try {
                                    setLoading(true);
                                    const formData = new FormData();
                                    formData.append("file", file);
                                    formData.append("uploadedBy", currentUser.userId);
                                    const uploadRes = await fetch(`${API_BASE}/document/upload`, {
                                      method: "POST",
                                      body: formData
                                    });
                                    if (!uploadRes.ok) throw new Error("File upload failed");
                                    const docInfo = await uploadRes.json();
                                    setAttachedDocument(docInfo.fileUrl);
                                    setUploadedDocuments(prev => [
                                      {
                                        documentId: docInfo.documentId,
                                        originalFileName: docInfo.originalFileName,
                                        fileUrl: docInfo.fileUrl,
                                        encryptedKey: docInfo.encryptedKey,
                                        uploadedAt: docInfo.uploadedAt,
                                        status: docInfo.status
                                      },
                                      ...prev
                                    ]);
                                    setSystemMessage({ text: `Uploaded and encrypted ${file.name} successfully.`, type: "success" });
                                  } catch (err) {
                                    setSystemMessage({ text: "Failed to upload document to DocumentService.", type: "error" });
                                  } finally {
                                    setLoading(false);
                                  }
                                } else {
                                  const mockDocId = crypto.randomUUID();
                                  setAttachedDocument(`/api/document/download/${mockDocId}`);
                                  setUploadedDocuments(prev => [
                                    {
                                      documentId: mockDocId,
                                      originalFileName: file.name,
                                      fileUrl: `/api/document/download/${mockDocId}`,
                                      encryptedKey: `envelope-key-${mockDocId}`,
                                      uploadedAt: new Date().toISOString(),
                                      status: "Uploaded (Simulated)"
                                    },
                                    ...prev
                                  ]);
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
                        {subData.attachedDocument && subData.attachedDocument !== 'No attachment' && (
                          <p className="attachment-meta">
                            📎 Document:{" "}
                            <button 
                              className="download-link-btn"
                              onClick={() => triggerSecureDownload(
                                subData.attachedDocument, 
                                subData.attachedDocument.substring(subData.attachedDocument.lastIndexOf("/") + 1)
                              )}
                            >
                              Decrypt & Download PDF
                            </button>
                          </p>
                        )}
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
              <span className="banner-role-badge">{currentUser.role.toUpperCase()} VIEW</span>
              <p>You are logged in as <strong>{currentUser.name}</strong>. You see forms pending evaluation at the current stage.</p>
            </div>

            {workflows.filter(w => {
              if (w.status !== 'InProgress') return false;
              if (currentUser.role === 'Teacher' && w.currentStep === 'Teacher Review') return true;
              if (currentUser.role === 'Admin' && w.currentStep === 'School Admin Review') return true;
              if (currentUser.role === 'District' && w.currentStep === 'District Approval') return true;
              return false;
            }).length === 0 ? (
              <div className="empty-state glass-pane">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <p>No pending approvals found for the role <strong>{currentUser.role}</strong> at this time.</p>
              </div>
            ) : (
              <div className="approvals-grid">
                {workflows.filter(w => {
                  if (w.status !== 'InProgress') return false;
                  if (currentUser.role === 'Teacher' && w.currentStep === 'Teacher Review') return true;
                  if (currentUser.role === 'Admin' && w.currentStep === 'School Admin Review') return true;
                  if (currentUser.role === 'District' && w.currentStep === 'District Approval') return true;
                  return false;
                }).map(wf => {
                  const matchingSub = submissions.find(s => s.submissionId === wf.submissionId);
                  const matchingForm = forms.find(f => f.formId === matchingSub?.formId);
                  const subData = matchingSub ? JSON.parse(matchingSub.data) : { studentName: 'Unknown', gradeLevel: 'N/A' };
                  
                  return (
                    <div key={wf.workflowId} className="approval-card glass-pane animate-fade-in">
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
                        {subData.attachedDocument && subData.attachedDocument !== 'No attachment' && (
                          <div className="attachment-box">
                            <span>📎 Document Attachment: </span>
                            <button 
                              className="download-link-btn"
                              onClick={() => triggerSecureDownload(
                                subData.attachedDocument, 
                                subData.attachedDocument.substring(subData.attachedDocument.lastIndexOf("/") + 1)
                              )}
                            >
                              Decrypt & Download PDF
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="approval-card-actions">
                        <button className="reject-action-btn" onClick={() => setActiveRejectWfId(wf.workflowId)}>
                          Reject
                        </button>
                        <button className="return-action-btn" onClick={() => setActiveReturnWfId(wf.workflowId)}>
                          Return
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

        {/* TAB 4: SYSTEM STATUS & API DISCOVERY */}
        {activeTab === 'status' && (
          <section className="tab-pane">
            <div className="intro-text">
              <h2>System Status & API Discovery</h2>
              <p>View current microservice health and open individual Swagger documentation directly from the gateway.</p>
            </div>

            <div className="status-grid">
              {serviceStatuses.length === 0 ? (
                <div className="empty-state glass-pane">
                  <p>Waiting for gateway health status…</p>
                </div>
              ) : (
                serviceStatuses.map(status => (
                  <div key={status.service} className={`status-card glass-pane ${status.online ? 'online' : 'offline'}`}>
                    <div className="status-header">
                      <div>
                        <h3>{status.service}</h3>
                        <p className="status-meta">Version: {status.version}</p>
                      </div>
                      <span className={`status-pill ${status.online ? 'connected' : 'disconnected'}`}>
                        {status.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="status-body">
                      <p><strong>Health:</strong> {status.status}</p>
                      <p><strong>Endpoint:</strong> <a href={status.endpoint} target="_blank" rel="noreferrer">{status.endpoint}</a></p>
                      {status.swagger && (
                        <p><strong>Swagger:</strong> <a href={status.swagger} target="_blank" rel="noreferrer">{status.swagger}</a></p>
                      )}
                      {status.error && <p className="status-error">Error: {status.error}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="vault-header intro-text" style={{ marginTop: '2.5rem' }}>
              <h2>🛡️ Cryptographic Document Vault</h2>
              <p>Monitor AES-256 envelope-encrypted files and verify SHA-256 digital signatures inside the Secure Key Vault.</p>
            </div>

            <div className="vault-pane glass-pane">
              {uploadedDocuments.length === 0 ? (
                <div className="empty-state">
                  <p style={{ margin: 0, opacity: 0.8 }}>No documents uploaded in this session yet. Attach a PDF when submitting a form.</p>
                </div>
              ) : (
                <div className="vault-table-wrapper">
                  <table className="vault-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Document ID</th>
                        <th>Key Vault Secret Reference</th>
                        <th>Integrity Hash</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedDocuments.map(doc => {
                        const verifyStatus = verifiedDocs[doc.documentId];
                        return (
                          <tr key={doc.documentId}>
                            <td><strong>{doc.originalFileName}</strong></td>
                            <td><code className="guid-code" title={doc.documentId}>{doc.documentId.substring(0, 8)}...</code></td>
                            <td>
                              <span className="key-ref-badge">
                                🔑 envelope-key-{doc.documentId.substring(0, 8)}...
                              </span>
                            </td>
                            <td>
                              <code className="hash-code" title="SHA-256 Encrypted Hash">
                                e3b0c442...{doc.documentId.substring(0, 4)}
                              </code>
                            </td>
                            <td>
                              <div className="vault-actions">
                                <button 
                                  className={`verify-action-btn ${verifyStatus || ''}`}
                                  disabled={verifyStatus === 'verifying'}
                                  onClick={() => verifyIntegrity(doc.documentId)}
                                >
                                  {verifyStatus === 'verifying' ? (
                                    <>
                                      <span className="spinner-small"></span> Verifying...
                                    </>
                                  ) : verifyStatus === 'verified' ? (
                                    "✓ Verified Signature"
                                  ) : (
                                    "Verify Integrity"
                                  )}
                                </button>
                                <button 
                                  className="vault-download-btn"
                                  onClick={() => triggerSecureDownload(doc.fileUrl, doc.originalFileName)}
                                >
                                  Secure Download
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 5: REAL-TIME AUDIT LOGS & NOTIFICATIONS */}
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

      {/* Rejection Comments Modal */}
      {activeRejectWfId && (
        <div className="modal-backdrop" onClick={() => setActiveRejectWfId(null)}>
          <div className="modal-content glass-pane rejection-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => {
              setActiveRejectWfId(null);
              setRejectionReason('');
            }}>×</button>
            <div className="modal-header">
              <span className="pre-title red-accent">SECURITY REVIEW</span>
              <h2>Reject Administrative Request</h2>
            </div>
            
            <form onSubmit={handleReject} className="interactive-form">
              <div className="form-group">
                <label>Reason for Rejection (Mandatory)</label>
                <textarea 
                  rows={4} 
                  required
                  placeholder="Provide detailed security or administrative reasons for rejecting this request. E.g. Missing required proof of address document..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => {
                  setActiveRejectWfId(null);
                  setRejectionReason('');
                }}>Cancel</button>
                <button type="submit" className="submit-btn reject-submit-btn">Reject Submission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Comments Modal */}
      {activeReturnWfId && (
        <div className="modal-backdrop" onClick={() => setActiveReturnWfId(null)}>
          <div className="modal-content glass-pane rejection-modal returned-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => {
              setActiveReturnWfId(null);
              setReturnReason('');
            }}>×</button>
            <div className="modal-header">
              <span className="pre-title yellow-accent">ADMINISTRATIVE RETURN</span>
              <h2>Return Request for Changes</h2>
            </div>
            
            <form onSubmit={handleReturn} className="interactive-form">
              <div className="form-group">
                <label>Reason for Return (Mandatory)</label>
                <textarea 
                  rows={4} 
                  required
                  placeholder="Provide details on what needs to be changed. E.g. Please re-upload the parent signature with a clear scan..."
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => {
                  setActiveReturnWfId(null);
                  setReturnReason('');
                }}>Cancel</button>
                <button type="submit" className="submit-btn return-submit-btn">Return Submission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zero-Trust RBAC Block Dialog */}
      {securityBlock && (
        <div className="modal-backdrop security-block-backdrop" onClick={() => setSecurityBlock(null)}>
          <div className="modal-content glass-pane security-block-modal animate-shake" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSecurityBlock(null)}>×</button>
            <div className="security-block-header">
              <div className="security-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="lock-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <span className="alert-pre-title">Zero-Trust Policy Violation</span>
              <h2>ACCESS DENIED</h2>
            </div>
            <div className="security-block-body">
              <p className="violation-warning">
                Administrative security policy **[SSFP-RBAC-04]** prevents user role **{securityBlock.role}** from accessing raw or decrypted student data.
              </p>
              <div className="security-details-box">
                <p><strong>Attempted Resource:</strong> <code>{securityBlock.file}</code></p>
                <p><strong>Enforced By:</strong> <code>DocumentService (Port 5006)</code></p>
                <p><strong>Action Taken:</strong> Decryption key retrieval blocked; incident logged in Audit trail.</p>
              </div>
            </div>
            <div className="modal-actions central-action">
              <button className="submit-btn security-ok-btn" onClick={() => setSecurityBlock(null)}>
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
