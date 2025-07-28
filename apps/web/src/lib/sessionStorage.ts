// Session storage utility functions for NetProphet

// Session storage keys
export const SESSION_KEYS = {
    PREDICTIONS: 'netprophet_predictions',
    SLIP_COLLAPSED: 'netprophet_slip_collapsed',
    FORM_PREDICTIONS: 'netprophet_form_predictions',
    WALLET: 'netprophet_wallet'
} as const;

// Helper to load from session storage
export function loadFromSessionStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
        const stored = sessionStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn(`Failed to load ${key} from session storage:`, error);
    }
    return defaultValue;
}

// Helper to save to session storage
export function saveToSessionStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to save ${key} to session storage:`, error);
    }
}

// Helper to remove from session storage
export function removeFromSessionStorage(key: string): void {
    if (typeof window === 'undefined') return;
    
    try {
        sessionStorage.removeItem(key);
    } catch (error) {
        console.warn(`Failed to remove ${key} from session storage:`, error);
    }
}

// Helper to clear form predictions for a specific match
export function clearFormPredictionsForMatch(matchId: number): void {
    if (typeof window === 'undefined') return;
    
    try {
        const stored = sessionStorage.getItem(SESSION_KEYS.FORM_PREDICTIONS);
        if (stored) {
            const allFormData = JSON.parse(stored);
            delete allFormData[matchId];
            sessionStorage.setItem(SESSION_KEYS.FORM_PREDICTIONS, JSON.stringify(allFormData));
        }
    } catch (error) {
        console.warn('Failed to clear form predictions from session storage:', error);
    }
}

// Helper to clear all form predictions
export function clearAllFormPredictions(): void {
    removeFromSessionStorage(SESSION_KEYS.FORM_PREDICTIONS);
}

// Helper to clear all NetProphet session data
export function clearAllNetProphetSessionData(): void {
    Object.values(SESSION_KEYS).forEach(key => {
        removeFromSessionStorage(key);
    });
} 