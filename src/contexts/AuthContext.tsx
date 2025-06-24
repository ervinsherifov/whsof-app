import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { logSecurityEvent, getSecureErrorMessage, checkRateLimit } from '@/lib/security';

import { setUserContext } from '@/lib/sentry';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'WAREHOUSE_STAFF' | 'OFFICE_ADMIN' | 'SUPER_ADMIN';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Session timeout configuration (30 minutes)
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Force logout due to security event
  const forceLogout = useCallback(async (reason: string) => {
    logSecurityEvent('forced_logout', { 
      userId: user?.id, 
      reason,
      sessionDuration: Date.now() - lastActivity 
    });
    
    await logout();
    toast.error(`Session ended: ${reason}`);
  }, [user?.id, lastActivity]);

  // Check for session timeout
  const checkSessionTimeout = useCallback(() => {
    if (!isAuthenticated || !lastActivity) return;
    
    const timeSinceActivity = Date.now() - lastActivity;
    if (timeSinceActivity > SESSION_TIMEOUT_MS) {
      forceLogout('Session timeout due to inactivity');
    }
  }, [isAuthenticated, lastActivity, forceLogout]);

  // Set up session timeout monitoring
  useEffect(() => {
    if (isAuthenticated) {
      // Set up activity listeners
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      const handleActivity = () => updateActivity();
      
      activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
      });

      // Set up timeout checker
      const timeoutChecker = setInterval(checkSessionTimeout, ACTIVITY_CHECK_INTERVAL);
      setSessionTimeout(timeoutChecker);

      return () => {
        activityEvents.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
        if (timeoutChecker) clearInterval(timeoutChecker);
      };
    } else {
      if (sessionTimeout) {
        clearInterval(sessionTimeout);
        setSessionTimeout(null);
      }
    }
  }, [isAuthenticated, checkSessionTimeout, updateActivity]);

  // Detect potential session fixation attacks
  const detectSessionFixation = useCallback((newSession: Session) => {
    if (!session || !newSession) return false;
    
    // Check for suspicious session changes
    const timeSinceLastActivity = Date.now() - lastActivity;
    const sessionChanged = session.access_token !== newSession.access_token;
    const shortTimeSinceActivity = timeSinceLastActivity < 1000; // Less than 1 second
    
    return sessionChanged && shortTimeSinceActivity;
  }, [session, lastActivity]);

  const getUserProfile = async (userId: string) => {
    try {
      // Get user role and profile data
      const [roleResult, profileResult] = await Promise.all([
        supabase.rpc('get_user_role', { _user_id: userId }),
        supabase.from('profiles').select('display_name, email').eq('user_id', userId).maybeSingle()
      ]);

      if (roleResult.error) throw roleResult.error;

      return {
        role: roleResult.data || 'WAREHOUSE_STAFF',
        display_name: profileResult.data?.display_name,
        email: profileResult.data?.email
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let profileCache = new Map<string, any>();
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Security: Detect potential session fixation attacks
        if (session && event === 'TOKEN_REFRESHED') {
          setTimeout(() => {
            if (detectSessionFixation(session)) {
              forceLogout('Suspicious session activity detected');
              return;
            }
          }, 0);
        }
        
        // Only synchronous state updates here
        setSession(session);
        setIsAuthenticated(!!session?.user);
        updateActivity(); // Update activity on any auth state change
        
        if (session?.user && event === 'SIGNED_IN') {
          // Only fetch profile on initial sign in, not on token refresh
          const userId = session.user.id;
          const cached = profileCache.get(userId);
          
          if (cached) {
                  const userData = {
                    id: userId,
                    email: session.user.email || '',
                    name: cached.display_name || cached.email || session.user.email || '',
                    role: cached.role
                  };
                  setUser(userData);
                  // Set Sentry user context
                  setUserContext(userData);
            setIsLoading(false);
          } else {
            // Defer Supabase calls with setTimeout to prevent deadlock
            setTimeout(() => {
              if (!mounted) return;
              getUserProfile(userId).then(profile => {
                if (mounted && profile) {
                  profileCache.set(userId, profile);
                  setUser({
                    id: userId,
                    email: session.user.email || '',
                    name: profile.display_name || profile.email || session.user.email || '',
                    role: profile.role
                  });
                }
                if (mounted) {
                  setIsLoading(false);
                }
              });
            }, 0);
          }
        } else if (!session?.user) {
          setUser(null);
          profileCache.clear();
        }
        
        if (mounted && event !== 'TOKEN_REFRESHED') {
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      // Synchronous state updates
      setSession(existingSession);
      setIsAuthenticated(!!existingSession?.user);
      
      if (existingSession?.user) {
        const userId = existingSession.user.id;
        // Defer profile fetching to prevent blocking
        setTimeout(() => {
          if (!mounted) return;
          getUserProfile(userId).then(profile => {
            if (mounted && profile) {
              profileCache.set(userId, profile);
              setUser({
                id: userId,
                email: existingSession.user.email || '',
                name: profile.display_name || profile.email || existingSession.user.email || '',
                role: profile.role
              });
            }
            if (mounted) {
              setIsLoading(false);
            }
          });
        }, 0);
      } else {
        setUser(null);
        if (mounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Rate limiting check
      if (!checkRateLimit(`login_${email}`, 5, 15 * 60 * 1000)) {
        logSecurityEvent('login_rate_limit_exceeded', { email });
        return { error: 'Too many login attempts. Please try again in 15 minutes.' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logSecurityEvent('login_failed', { 
          email, 
          error: error.message,
          userAgent: navigator.userAgent 
        });
        return { error: getSecureErrorMessage(error) };
      }

      logSecurityEvent('login_successful', { email });
      updateActivity();
      return {};
    } catch (error) {
      logSecurityEvent('login_error', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { error: getSecureErrorMessage(error) };
    }
  };

  const logout = async () => {
    try {
      logSecurityEvent('logout', { userId: user?.id });
      
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      setLastActivity(0);
    } catch (error) {
      logSecurityEvent('logout_error', { 
        userId: user?.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Force logout even if signOut fails
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const checkIn = async () => {
    if (!user?.id) return;
    
    try {
      // Check if user is already checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in_time', `${today}T00:00:00.000Z`)
        .is('check_out_time', null)
        .maybeSingle();

      if (existingEntry) {
        throw new Error('Already checked in today');
      }

      // Create new check-in entry
      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          check_in_time: new Date().toISOString()
        });

      if (error) throw error;
      console.log('Checking in at:', new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Check-in failed:', error);
      throw error;
    }
  };

  const checkOut = async () => {
    if (!user?.id) return;
    
    try {
      // Find the latest uncompleted check-in for today
      const today = new Date().toISOString().split('T')[0];
      const { data: activeEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in_time', `${today}T00:00:00.000Z`)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .maybeSingle();

      if (!activeEntry) {
        throw new Error('No active check-in found. Please check in first.');
      }

      // Update entry with check-out time only - let the database trigger calculate hours
      const { error } = await supabase
        .from('time_entries')
        .update({
          check_out_time: new Date().toISOString()
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      console.log('Checking out at:', new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated,
      login,
      logout,
      checkIn,
      checkOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};