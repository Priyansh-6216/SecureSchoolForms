import React from 'react';

interface ToastProps {
  message: {
    text: string;
    type: 'info' | 'error' | 'success';
  } | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className={`toast-message ${message.type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {message.type === 'success' && '✓'}
          {message.type === 'error' && '✕'}
          {message.type === 'info' && 'ℹ'}
        </span>
        <p>{message.text}</p>
      </div>
    </div>
  );
};
