import React from 'react';

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

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: 'Teacher' | 'Admin' | 'District';
}

interface ApprovalsPortalProps {
  workflows: WorkflowInstance[];
  submissions: FormSubmission[];
  forms: FormTemplate[];
  currentUser: UserProfile;
  activeRejectWfId: string | null;
  setActiveRejectWfId: (wfId: string | null) => void;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  activeReturnWfId: string | null;
  setActiveReturnWfId: (wfId: string | null) => void;
  returnReason: string;
  setReturnReason: (reason: string) => void;
  handleApprove: (workflowId: string) => Promise<void> | void;
  handleReject: (e: React.FormEvent) => Promise<void> | void;
  handleReturn: (e: React.FormEvent) => Promise<void> | void;
  triggerSecureDownload: (fileUrl: string, fileName: string) => Promise<void> | void;
}

export const ApprovalsPortal: React.FC<ApprovalsPortalProps> = ({
  workflows,
  submissions,
  forms,
  currentUser,
  activeRejectWfId,
  setActiveRejectWfId,
  rejectionReason,
  setRejectionReason,
  activeReturnWfId,
  setActiveReturnWfId,
  returnReason,
  setReturnReason,
  handleApprove,
  handleReject,
  handleReturn,
  triggerSecureDownload
}) => {
  const filteredWorkflows = workflows.filter(w => {
    if (w.status !== 'InProgress') return false;
    if (currentUser.role === 'Teacher' && w.currentStep === 'Teacher Review') return true;
    if (currentUser.role === 'Admin' && w.currentStep === 'School Admin Review') return true;
    if (currentUser.role === 'District' && w.currentStep === 'District Approval') return true;
    return false;
  });

  return (
    <section className="tab-pane">
      <div className="intro-text">
        <h2>Secure Approvals Portal</h2>
        <p>View and manage pending approvals matching your active administrative role.</p>
      </div>

      <div className="role-banner glass-pane">
        <span className="banner-role-badge">{currentUser.role.toUpperCase()} VIEW</span>
        <p>You are logged in as <strong>{currentUser.name}</strong>. You see forms pending evaluation at the current stage.</p>
      </div>

      {filteredWorkflows.length === 0 ? (
        <div className="empty-state glass-pane">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p>No pending approvals found for the role <strong>{currentUser.role}</strong> at this time.</p>
        </div>
      ) : (
        <div className="approvals-grid">
          {filteredWorkflows.map(wf => {
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
    </section>
  );
};
