import React from 'react';

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

interface RealTimeLogsProps {
  auditLogs: AuditLog[];
  notifications: SimulatedNotification[];
}

export const RealTimeLogs: React.FC<RealTimeLogsProps> = ({
  auditLogs,
  notifications
}) => {
  return (
    <section className="tab-pane">
      <div className="intro-text">
        <h2>Real-Time Microservices Audit Trail & Notification Dispatch</h2>
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
                  <span className={`action-badge ${
                    log.actionType.toLowerCase().startsWith('step') || log.actionType.toLowerCase().includes('complete')
                      ? 'approve' 
                      : log.actionType.toLowerCase().includes('reject') || log.actionType.toLowerCase().includes('violation')
                        ? 'reject'
                        : 'submit'
                  }`}>
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
  );
};
