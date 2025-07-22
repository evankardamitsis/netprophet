import * as React from 'react';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ checked, onCheckedChange, className = '', ...props }, ref) => (
        <label className={`inline-flex items-center cursor-pointer ${className}`}>
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={e => onCheckedChange(e.target.checked)}
                ref={ref}
                {...props}
            />
            <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors relative">
                <div
                    className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-4' : ''}`}
                />
            </div>
        </label>
    )
);
Switch.displayName = 'Switch'; 