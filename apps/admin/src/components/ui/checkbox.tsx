import * as React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    checked: boolean;
    indeterminate?: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ checked, indeterminate, onCheckedChange, className = '', ...props }, ref) => {
        React.useEffect(() => {
            if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.indeterminate = !!indeterminate;
            }
        }, [ref, indeterminate]);
        return (
            <input
                type="checkbox"
                className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
                checked={checked}
                ref={ref}
                onChange={e => onCheckedChange(e.target.checked)}
                aria-checked={indeterminate ? 'mixed' : checked}
                {...props}
            />
        );
    }
);
Checkbox.displayName = 'Checkbox'; 