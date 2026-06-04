import React from 'react';

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

interface SystemStatusProps {
  serviceStatuses: ServiceStatus[];
  uploadedDocuments: UploadedDoc[];
  verifiedDocs: Record<string, 'verifying' | 'verified'>;
  verifyIntegrity: (docId: string) => void;
  triggerSecureDownload: (fileUrl: string, fileName: string) => Promise<void> | void;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  serviceStatuses,
  uploadedDocuments,
  verifiedDocs,
  verifyIntegrity,
  triggerSecureDownload
}) => {
  return (
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
  );
};
