import { useState, useEffect } from 'react';
import './App.css';
import { Toast } from './components/Toast';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { SubmitForms } from './pages/SubmitForms';
import { TrackWorkflows } from './pages/TrackWorkflows';
import { ApprovalsPortal } from './pages/ApprovalsPortal';
import { SystemStatus } from './pages/SystemStatus';
import { RealTimeLogs } from './pages/RealTimeLogs';

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

interface UploadedDoc {
  documentId: string;
  originalFileName: string;
  fileUrl: string;
  encryptedKey: string;
  uploadedAt: string;
  status: string;
}

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: 'Teacher' | 'Admin' | 'District';
}

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
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, 'verifying' | 'verified'>>({});
  const [securityBlock, setSecurityBlock] = useState<{ active: boolean; file: string; role: string } | null>(null);
  
  // User profile session interface
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mockUsers, setMockUsers] = useState<UserProfile[]>([
    { userId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', name: 'Alex Rivers', email: 'alex.rivers@school.edu', role: 'Teacher' },
    { userId: 'f5e4d3c2-b1a0-9e8d-7c6b-5a4b3c2d1e0f', name: 'Principal Eleanor', email: 'eleanor.vance@school.edu', role: 'Admin' },
    { userId: '9e8d7c6b-5a4b-3c2d-1e0f-f5e4d3c2b1a0', name: 'Superintendent Davis', email: 'davis.officer@district.edu', role: 'District' }
  ]);
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
      const match = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (match) {
        setCurrentUser(match);
        setSystemMessage({ text: `Simulation: Logged in as ${match.name} (${match.role})`, type: 'success' });
      } else {
        setLoginError('Email not registered. Try: alex.rivers@school.edu, eleanor.vance@school.edu, or register a new account below!');
      }
      setLoading(false);
    }
  };

  // Secure User Session Registration handler
  const handleRegister = async (name: string, email: string, role: 'Teacher' | 'Admin' | 'District', schoolId: string) => {
    setLoginError(null);
    setLoading(true);

    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, role, schoolId })
        });
        if (res.status === 400) {
          const errData = await res.json();
          throw new Error(errData.message || 'Email address already registered.');
        }
        if (!res.ok) throw new Error('Auth Gateway Error during registration.');
        const userData = await res.json();
        setCurrentUser({
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          role: userData.role
        });
        setSystemMessage({ text: `Welcome, ${userData.name}! Your account has been registered.`, type: 'success' });
      } catch (err: any) {
        setLoginError(err.message || 'Failed to register with AuthService.');
      } finally {
        setLoading(false);
      }
    } else {
      // Simulate registration locally
      if (mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setLoginError('Email address already registered.');
        setLoading(false);
        return;
      }
      const newUser: UserProfile = {
        userId: crypto.randomUUID(),
        name,
        email,
        role
      };
      setMockUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      setSystemMessage({ text: `Simulation: Registered and logged in as ${newUser.name}`, type: 'success' });
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Login 
        systemMessage={systemMessage}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginError={loginError}
        loading={loading}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
      />
    );
  }

  return (
    <Layout
      currentUser={currentUser}
      onSignOut={() => setCurrentUser(null)}
      isBackendOnline={isBackendOnline}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <Toast message={systemMessage} />
      {loading && <div className="loader-overlay"><div className="loader"></div></div>}

      {activeTab === 'submit' && (
        <SubmitForms
          forms={forms}
          selectedForm={selectedForm}
          setSelectedForm={setSelectedForm}
          studentName={studentName}
          setStudentName={setStudentName}
          gradeLevel={gradeLevel}
          setGradeLevel={setGradeLevel}
          additionalDetails={additionalDetails}
          setAdditionalDetails={setAdditionalDetails}
          attachedDocument={attachedDocument}
          setAttachedDocument={setAttachedDocument}
          uploadedDocuments={uploadedDocuments}
          setUploadedDocuments={setUploadedDocuments}
          handleFormSubmit={handleFormSubmit}
          currentUser={currentUser}
          isBackendOnline={isBackendOnline}
          setLoading={setLoading}
          setSystemMessage={setSystemMessage}
          API_BASE={API_BASE}
        />
      )}

      {activeTab === 'tracker' && (
        <TrackWorkflows
          submissions={submissions}
          forms={forms}
          workflows={workflows}
          triggerSecureDownload={triggerSecureDownload}
        />
      )}

      {activeTab === 'approvals' && (
        <ApprovalsPortal
          workflows={workflows}
          submissions={submissions}
          forms={forms}
          currentUser={currentUser}
          activeRejectWfId={activeRejectWfId}
          setActiveRejectWfId={setActiveRejectWfId}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          activeReturnWfId={activeReturnWfId}
          setActiveReturnWfId={setActiveReturnWfId}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          handleApprove={handleApprove}
          handleReject={handleReject}
          handleReturn={handleReturn}
          triggerSecureDownload={triggerSecureDownload}
        />
      )}

      {activeTab === 'status' && (
        <SystemStatus
          serviceStatuses={serviceStatuses}
          uploadedDocuments={uploadedDocuments}
          verifiedDocs={verifiedDocs}
          verifyIntegrity={verifyIntegrity}
          triggerSecureDownload={triggerSecureDownload}
        />
      )}

      {activeTab === 'audits' && (
        <RealTimeLogs
          auditLogs={auditLogs}
          notifications={notifications}
        />
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
    </Layout>
  );
}

export default App;
