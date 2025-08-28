'use client';

import { createContext, useContext, useState } from 'react';

interface SuccessModalContextType {
    showSuccessModal: boolean;
    setShowSuccessModal: (show: boolean) => void;
}

const SuccessModalContext = createContext<SuccessModalContextType>({
    showSuccessModal: false,
    setShowSuccessModal: () => { },
});

export function useSuccessModal() {
    return useContext(SuccessModalContext);
}

export function SuccessModalProvider({ children }: { children: React.ReactNode }) {
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    return (
        <SuccessModalContext.Provider value={{
            showSuccessModal,
            setShowSuccessModal,
        }}>
            {children}
        </SuccessModalContext.Provider>
    );
}
