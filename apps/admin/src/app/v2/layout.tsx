import type { ReactNode } from 'react';
import { ui } from './ui';

export const metadata = { title: 'NetProphet v2 · Admin' };

export default function V2Layout({ children }: { children: ReactNode }) {
  return <div style={ui.page}>{children}</div>;
}
