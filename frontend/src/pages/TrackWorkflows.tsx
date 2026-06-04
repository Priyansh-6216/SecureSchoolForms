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

interface TrackWorkflowsProps {
  submissions: FormSubmission[];
  forms: FormTemplate[];
  workflows: WorkflowInstance[];
  triggerSecureDownload: (fileUrl: string, fileName: string) => Promise<void> | void;
}

export const TrackWorkflows: React.FC<TrackWorkflowsProps> = ({
  submissions,
  forms,
  workflows,
  triggerSecureDownload
}) => {
  return (
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

                      <div className={`timeline-step ${
                        matchingWf.status === 'Completed' 
                          ? 'completed' 
                          : matchingWf.status === 'Rejected' 
                            ? 'rejected' 
                            : matchingWf.status === 'ReturnedForChanges' 
                              ? 'returned' 
                              : 'upcoming'
                      }`}>
                        <span className="step-number">
                          {matchingWf.status === 'Completed' ? '✓' : matchingWf.status === 'Rejected' ? '✕' : matchingWf.status === 'ReturnedForChanges' ? '↩' : '●'}
                        </span>
                        <span className="step-text">
                          {matchingWf.status === 'Completed' ? 'Completed' : matchingWf.status === 'Rejected' ? 'Rejected' : matchingWf.status === 'ReturnedForChanges' ? 'Returned' : 'Completed'}
                        </span>
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
  );
};
