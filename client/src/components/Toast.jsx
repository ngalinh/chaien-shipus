import { useState, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

let _addToast = null;

export function toast(message, type = 'info') {
  if (_addToast) _addToast(message, type);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onRemove }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-danger-600 flex-shrink-0" />,
    info: <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />,
  };

  const colors = {
    success: 'border-success-200 bg-success-50',
    error: 'border-danger-200 bg-danger-50',
    info: 'border-primary-200 bg-primary-50',
    warning: 'border-warning-200 bg-warning-50',
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm toast-enter ${colors[t.type] || colors.info}`}
    >
      {icons[t.type] || icons.info}
      <span className="text-sm text-gray-800 flex-1">{t.message}</span>
      <button
        onClick={() => onRemove(t.id)}
        className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
