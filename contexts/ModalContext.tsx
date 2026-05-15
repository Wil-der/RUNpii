// contexts/ModalContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ModalType = 'info' | 'confirm';

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType>({
  showModal: () => {},
  hideModal: () => {},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ModalOptions | null>(null);

  const showModal = useCallback((opts: ModalOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
    setOptions(null);
  }, []);

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {options && (
        <AppModal
          visible={visible}
          title={options.title}
          message={options.message}
          type={options.type || 'info'}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          onConfirm={() => {
            options.onConfirm?.();
            hideModal();
          }}
          onCancel={() => {
            options.onCancel?.();
            hideModal();
          }}
          onClose={hideModal}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useAppModal() {
  return useContext(ModalContext);
}

// Necesitamos importar AppModal aquí, pero para evitar dependencias circulares
// lo hacemos lazy o lo importamos directamente (asumo que AppModal está en components/AppModal)
import AppModal from '@/components/AppModal';