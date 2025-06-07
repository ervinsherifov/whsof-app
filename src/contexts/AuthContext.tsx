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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Get user role from database
          const { data: roleData } = await supabase
            .rpc('get_user_role', { _user_id: session.user.id });

          // Get user profile for display name
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', session.user.id)
            .single();

          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: profileData?.display_name || session.user.email?.split('@')[0] || '',
            role: roleData || 'WAREHOUSE_STAFF',
            isActive: true,
            createdAt: session.user.created_at,
          };
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: session.access_token } });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Get user role from database
        const { data: roleData } = await supabase
          .rpc('get_user_role', { _user_id: session.user.id });

        // Get user profile for display name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', session.user.id)
          .single();

        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: profileData?.display_name || session.user.email?.split('@')[0] || '',
          role: roleData || 'WAREHOUSE_STAFF',
          isActive: true,
          createdAt: session.user.created_at,
        };
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: session.access_token } });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        dispatch({ type: 'LOGIN_ERROR' });
        throw new Error(error.message);
      }

      // Auth state change will handle the login success
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR' });
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
  };

  const checkIn = async () => {
    // Mock check-in functionality
    console.log('Checking in at:', new Date().toLocaleTimeString('en-US', { hour12: false }));
  };

  const checkOut = async () => {
    // Mock check-out functionality
    console.log('Checking out at:', new Date().toLocaleTimeString('en-US', { hour12: false }));
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