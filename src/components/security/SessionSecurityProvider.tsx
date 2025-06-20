import React from 'react';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';

interface SessionSecurityProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes session security monitoring
 * Should be placed inside AuthProvider but outside main app content
 */
export const SessionSecurityProvider: React.FC<SessionSecurityProviderProps> = ({ children }) => {
  // Initialize session security monitoring
  useSessionSecurity();
  
  return <>{children}</>;
};