'use client';
import { useEffect } from 'react';

/** tries the app once on arrival; the button tries again (some browsers only follow a scheme on a tap) */
export function OpenApp({ label }: { label: string }) {
  useEffect(() => {
    window.location.href = 'netprophet://';
  }, []);
  return (
    <p>
      <a className="open-app" href="netprophet://">
        {label}
      </a>
    </p>
  );
}
