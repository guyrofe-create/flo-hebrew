import React from 'react';
import { isDebugUIEnabled } from '../lib/debug';

export function DebugGate({ children }: { children: React.ReactNode }) {
  if (!isDebugUIEnabled) return null;
  return <>{children}</>;
}
