'use client';

import { createContext, useContext, useState } from 'react';

interface ProfileSetupModalContextType {
    showProfileSetup: boolean;
    setShowProfileSetup: (show: boolean) => void;
    profileRefreshKey: number;
    setProfileRefreshKey: (key: number) => void;
}

const ProfileSetupModalContext = createContext<ProfileSetupModalContextType>({
    showProfileSetup: false,
    setShowProfileSetup: () => { },
    profileRefreshKey: 0,
    setProfileRefreshKey: () => { },
});

export function useProfileSetupModal() {
    return useContext(ProfileSetupModalContext);
}

export function ProfileSetupModalProvider({ children }: { children: React.ReactNode }) {
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [profileRefreshKey, setProfileRefreshKey] = useState(0);

    return (
        <ProfileSetupModalContext.Provider value={{
            showProfileSetup,
            setShowProfileSetup,
            profileRefreshKey,
            setProfileRefreshKey,
        }}>
            {children}
        </ProfileSetupModalContext.Provider>
    );
}
