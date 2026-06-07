import React, { useState } from 'react';

interface FormTemplate {
  formId: string;
  type: string;
  status: string;
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

interface SubmitFormsProps {
  forms: FormTemplate[];
  selectedForm: FormTemplate | null;
  setSelectedForm: (form: FormTemplate | null) => void;
  studentName: string;
  setStudentName: (name: string) => void;
  gradeLevel: string;
  setGradeLevel: (level: string) => void;
  additionalDetails: string;
  setAdditionalDetails: (details: string) => void;
  attachedDocument: string | null;
  setAttachedDocument: (doc: string | null) => void;
  uploadedDocuments: UploadedDoc[];
  setUploadedDocuments: React.Dispatch<React.SetStateAction<UploadedDoc[]>>;
  handleFormSubmit: (e: React.FormEvent) => Promise<void> | void;
  currentUser: UserProfile;
  isBackendOnline: boolean | null;
  setLoading: (loading: boolean) => void;
  setSystemMessage: (msg: { text: string; type: 'info' | 'error' | 'success' } | null) => void;
  API_BASE: string;
  handleCreateFormTemplate: (type: string, status: string) => Promise<void> | void;
}

export const SubmitForms: React.FC<SubmitFormsProps> = ({
  forms,
  selectedForm,
  setSelectedForm,
  studentName,
  setStudentName,
  gradeLevel,
  setGradeLevel,
  additionalDetails,
  setAdditionalDetails,
  attachedDocument,
  setAttachedDocument,
  setUploadedDocuments,
  handleFormSubmit,
  currentUser,
  isBackendOnline,
  setLoading,
  setSystemMessage,
  API_BASE,
  handleCreateFormTemplate
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormType, setNewFormType] = useState('');
  const [newFormStatus, setNewFormStatus] = useState('Published');

  return (
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
              {!form.type.includes('Enrollment') && !form.type.includes('Transfer') && !form.type.includes('Transcript') && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="card-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              )}
            </div>
            <h3>{form.type}</h3>
            <p>Secure routing via gateway, triggering notifications and multi-stage audit trails.</p>
            <span className="submit-action-btn">Fill Request →</span>
          </div>
        ))}

        {currentUser.role !== 'Teacher' && (
          <div 
            className="form-card create-template-card"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <div className="card-glare"></div>
            <div className="form-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="card-icon">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <h3>Create Form Template</h3>
            <p>Define a new type of administrative request form for school office submissions.</p>
            <span className="submit-action-btn">+ Create Template</span>
          </div>
        )}
      </div>

      {/* Form Submission Modal */}
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

      {/* Form Template Creation Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content glass-pane" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
            <div className="modal-header">
              <span className="pre-title">ADMIN CONTROL PORTAL</span>
              <h2>Create Request Form Template</h2>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newFormType.trim()) return;
              await handleCreateFormTemplate(newFormType.trim(), newFormStatus);
              setNewFormType('');
              setNewFormStatus('Published');
              setIsCreateModalOpen(false);
            }} className="interactive-form">
              <div className="form-group">
                <label>Form Type / Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Immunization Record Form, Field Trip Authorization"
                  value={newFormType}
                  onChange={e => setNewFormType(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Initial Template Status</label>
                <select value={newFormStatus} onChange={e => setNewFormStatus(e.target.value)}>
                  <option value="Published">Published (Active)</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Publish Form Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

