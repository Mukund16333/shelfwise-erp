import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3 seconds according to Design Brief
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => {
          let Icon = Info;
          let className = 'toast-info';
          if (toast.type === 'success') {
            Icon = CheckCircle2;
            className = 'toast-success';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            className = 'toast-error';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            className = 'toast';
          }

          return (
            <div key={toast.id} className={`toast ${className}`}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', color: 'white', padding: 2, cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
