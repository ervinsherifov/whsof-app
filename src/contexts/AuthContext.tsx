import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, User, LoginCredentials } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false };
    case 'LOGOUT':
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const fetchUserProfile = async (userId: string, currentToken: string) => {
    try {
      // Get current session to get user email
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      
      // Get user role and profile data
      const [roleResult, profileResult] = await Promise.all([
        supabase.rpc('get_user_role', { _user_id: userId }),
        supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle()
      ]);

      // Create complete user object with fetched data
      const updatedUser: User = {
        id: userId,
        email: sessionUser?.email || '',
        name: profileResult.data?.display_name || sessionUser?.email?.split('@')[0] || '',
        role: roleResult.data || 'WAREHOUSE_STAFF',
        isActive: true,
        createdAt: sessionUser?.created_at || '',
      };
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user: updatedUser, token: currentToken } 
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Create fallback user in case of error
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      const fallbackUser: User = {
        id: userId,
        email: sessionUser?.email || '',
        name: sessionUser?.email?.split('@')[0] || '',
        role: 'WAREHOUSE_STAFF',
        isActive: true,
        createdAt: sessionUser?.created_at || '',
      };
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user: fallbackUser, token: currentToken } 
      });
    }
  };

  useEffect(() => {
    // Set initial loading state
    dispatch({ type: 'SET_LOADING', payload: true });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Only set loading if we don't already have a user
          if (!state.user) {
            dispatch({ type: 'SET_LOADING', payload: true });
          }
          
          // Fetch user profile data
          fetchUserProfile(session.user.id, session.access_token);
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.access_token);
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Auth state change will handle the login success
  };

  const logout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
  };

  const checkIn = async () => {
    if (!state.user?.id) return;
    
    try {
      // Check if user is already checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', state.user.id)
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
          user_id: state.user.id,
          check_in_time: new Date().toISOString()
        });

      if (error) throw error;
      console.log('Checking in at:', new Date().toLocaleTimeString('en-US', { hour12: false }));
    } catch (error) {
      console.error('Check-in failed:', error);
      throw error;
    }
  };

  const checkOut = async () => {
    if (!state.user?.id) return;
    
    try {
      // Find the latest uncompleted check-in for today
      const today = new Date().toISOString().split('T')[0];
      const { data: activeEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', state.user.id)
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
        // Monday to Friday: 9 hours standard, rest is overtime
        regularHours = Math.min(workedHours, 9);
        overtimeHours = Math.max(workedHours - 9, 0);
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
      console.log('Checking out at:', checkOutTime.toLocaleTimeString('en-US', { hour12: false }));
      console.log(`Worked: ${workedHours.toFixed(2)}h (Regular: ${regularHours.toFixed(2)}h, Overtime: ${overtimeHours.toFixed(2)}h)`);
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        checkIn,
        checkOut,
      }}
    >
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