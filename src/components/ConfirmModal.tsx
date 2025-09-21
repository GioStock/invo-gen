import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  type = 'danger',
  loading = false
}: ConfirmModalProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-red-500';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'info': return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      default: return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-opacity duration-300 ease-out
        ${isOpen ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div 
        className={`
          w-full max-w-md transform transition-all duration-300 ease-out
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <div 
          className="rounded-xl shadow-xl border"
          style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--card-border)' 
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`w-6 h-6 ${getIconColor()}`} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-color)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm leading-6" style={{ color: 'var(--text-color)' }}>
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 p-6 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50"
              style={{ 
                borderColor: 'var(--card-border)',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-color)'
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`
                w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg
                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${getConfirmButtonStyle()}
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Attendere...</span>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook per gestire facilmente i modal di conferma
export function useConfirmModal() {
  const [modal, setModal] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback((options: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
  }) => {
    setModal({
      isOpen: true,
      ...options,
      onConfirm: async () => {
        setLoading(true);
        try {
          await options.onConfirm();
        } finally {
          setLoading(false);
          setModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }, []);

  const close = React.useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmModalComponent = React.useCallback(() => (
    <ConfirmModal
      isOpen={modal.isOpen}
      onClose={close}
      onConfirm={modal.onConfirm}
      title={modal.title}
      message={modal.message}
      type={modal.type}
      confirmText={modal.confirmText}
      cancelText={modal.cancelText}
      loading={loading}
    />
  ), [modal, loading, close]);

  return {
    confirm,
    ConfirmModal: ConfirmModalComponent
  };
}
