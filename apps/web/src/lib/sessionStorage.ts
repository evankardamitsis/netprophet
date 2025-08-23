// Session storage utility functions for NetProphet

// Session storage keys
export const SESSION_KEYS = {
    PREDICTIONS: 'netprophet_predictions',
    OUTRIGHTS_PREDICTIONS: 'netprophet_outrights_predictions',
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
export function clearFormPredictionsForMatch(matchId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
        // Clear from main form predictions key (record format)
        const stored = sessionStorage.getItem(SESSION_KEYS.FORM_PREDICTIONS);
        if (stored) {
            const allFormData = JSON.parse(stored);
            delete allFormData[matchId];
            sessionStorage.setItem(SESSION_KEYS.FORM_PREDICTIONS, JSON.stringify(allFormData));
        }
        
        // Also clear the individual key (used by PredictionForm)
        const individualKey = `${SESSION_KEYS.FORM_PREDICTIONS}_${matchId}`;
        sessionStorage.removeItem(individualKey);
    } catch (error) {
        console.warn('Failed to clear form predictions from session storage:', error);
    }
}

// Helper to clear all form predictions
export function clearAllFormPredictions(): void {
    if (typeof window === 'undefined') return;
    
    try {
        // Clear the main form predictions key
        removeFromSessionStorage(SESSION_KEYS.FORM_PREDICTIONS);
        
        // Clear all individual form prediction keys
        const allKeys = Object.keys(sessionStorage);
        const formPredictionKeys = allKeys.filter(key => 
            key.startsWith(`${SESSION_KEYS.FORM_PREDICTIONS}_`) && 
            !key.includes('_outrights_')
        );
        
        formPredictionKeys.forEach(key => {
            sessionStorage.removeItem(key);
        });
    } catch (error) {
        console.warn('Failed to clear all form predictions:', error);
    }
}

// Helper to clear all NetProphet session data
export function clearAllNetProphetSessionData(): void {
    Object.values(SESSION_KEYS).forEach(key => {
        removeFromSessionStorage(key);
    });
} 