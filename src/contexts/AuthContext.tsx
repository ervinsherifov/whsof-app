import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { logSecurityEvent, getSecureErrorMessage, checkRateLimit } from '@/lib/security';
import { toast } from 'sonner';

interface User {
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Session timeout configuration (2 hours)
  const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Reset session timeout
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    const timeout = setTimeout(async () => {
      logSecurityEvent('session_timeout', { userId: user?.id });
      toast.error('Session expired due to inactivity. Please log in again.');
      // Force logout by clearing auth state
      await supabase.auth.signOut();
    }, SESSION_TIMEOUT_MS);

    setSessionTimeout(timeout);
  }, [user?.id]);

  // Set up activity monitoring
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      updateActivity();
      resetSessionTimeout();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    // Initial timeout setup
    resetSessionTimeout();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [isAuthenticated, updateActivity, resetSessionTimeout]);

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
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Only synchronous state updates here
        setSession(session);
        setIsAuthenticated(!!session?.user);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            if (!mounted) return;
            getUserProfile(session.user.id).then(profile => {
              if (mounted && profile) {
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  name: profile.display_name || profile.email || session.user.email || '',
                  role: profile.role
                });
              }
            });
          }, 0);
        } else {
          setUser(null);
        }
        
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
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
        // Defer profile fetching to prevent blocking
        setTimeout(() => {
          if (!mounted) return;
          getUserProfile(existingSession.user.id).then(profile => {
            if (mounted && profile) {
              setUser({
                id: existingSession.user.id,
                email: existingSession.user.email || '',
                name: profile.display_name || profile.email || existingSession.user.email || '',
                role: profile.role
              });
            }
          });
        }, 0);
      } else {
        setUser(null);
      }
      
      // Always set loading to false and initialized to true
      if (mounted) {
        setIsLoading(false);
        setIsInitialized(true);
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
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }

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

      const checkOutTime = new Date();
      const checkInTime = new Date(activeEntry.check_in_time);
      
      // Calculate worked hours and overtime
      const workedHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      const dayOfWeek = checkOutTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      let regularHours = 0;
      let overtimeHours = 0;
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Monday to Friday: 8 hours standard, rest is overtime
        regularHours = Math.min(workedHours, 8);
        overtimeHours = Math.max(workedHours - 8, 0);
      } else {
        // Saturday and Sunday: all hours are overtime
        overtimeHours = workedHours;
      }

      // Update entry with check-out time
      const { error } = await supabase
        .from('time_entries')
        .update({
          check_out_time: checkOutTime.toISOString(),
          regular_hours: regularHours,
          overtime_hours: overtimeHours
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      console.log('Checking out at:', checkOutTime.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      console.log(`Worked: ${workedHours.toFixed(2)}h (Regular: ${regularHours.toFixed(2)}h, Overtime: ${overtimeHours.toFixed(2)}h)`);
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading: isLoading || !isInitialized,
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