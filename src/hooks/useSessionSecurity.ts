import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logSecurityEvent } from '@/lib/security';

/**
 * Hook to monitor session security and detect suspicious activities
 */
export const useSessionSecurity = () => {
  const { user, isAuthenticated, logout } = useAuth();

  // Detect multiple tabs/windows (potential session hijacking)
  const detectMultipleTabs = useCallback(() => {
    const sessionKey = 'app_session_active';
    const currentTime = Date.now().toString();
    
    // Set session marker
    localStorage.setItem(sessionKey, currentTime);
    
    // Check if another tab overwrote our marker
    setTimeout(() => {
      const storedTime = localStorage.getItem(sessionKey);
      if (storedTime !== currentTime) {
        logSecurityEvent('multiple_session_detected', { 
          userId: user?.id,
          detected_at: new Date().toISOString()
        });
        // Optionally force logout or warn user
      }
    }, 1000);
  }, [user?.id]);

  // Detect suspicious navigation patterns
  const detectSuspiciousNavigation = useCallback(() => {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    
    // Whitelist of legitimate referrers
    const legitimateReferrers = [
      'https://lovable.dev',
      'https://www.lovable.dev',
      'https://app.lovable.dev',
      currentOrigin
    ];
    
    // Check for external referrers that might indicate XSS/CSRF
    if (referrer && !legitimateReferrers.some(allowed => referrer.startsWith(allowed))) {
      logSecurityEvent('external_referrer_detected', {
        userId: user?.id,
        referrer,
        current_url: window.location.href
      });
    }
  }, [user?.id]);

  // Monitor for console manipulation (potential XSS) - DISABLED to prevent interference
  const detectConsoleManipulation = useCallback(() => {
    // Disabled to prevent blocking navigation
    return () => {};
  }, [user?.id]);

  useEffect(() => {
    // Only run security checks if user is authenticated and we have user data
    if (!isAuthenticated || !user?.id) return;

    // Run security checks
    detectMultipleTabs();
    detectSuspiciousNavigation();
    const cleanup = detectConsoleManipulation();

    // Set up periodic security checks
    const securityInterval = setInterval(() => {
      detectMultipleTabs();
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(securityInterval);
      cleanup();
    };
  }, [isAuthenticated, user?.id, detectMultipleTabs, detectSuspiciousNavigation, detectConsoleManipulation]);

  return {
    detectMultipleTabs,
    detectSuspiciousNavigation
  };
};