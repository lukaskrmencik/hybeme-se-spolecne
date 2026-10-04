import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import { apiFetch, ApiError, onSessionExpired } from '../services/api';
import { getToken, saveToken, removeToken } from '../services/storage';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  password_confirmation: string;
}

/** The account exists but its e-mail is not confirmed yet; a code was sent to it. */
export interface VerificationRequired {
  email: string;
  /** Seconds until another code can be requested. */
  resendIn: number;
}

/** Login refused because the e-mail is not verified yet (a new code was sent). */
export function getVerificationRequired(err: unknown): VerificationRequired | null {
  if (!(err instanceof ApiError) || err.code !== 'email_not_verified' || !err.data?.email) return null;
  return { email: String(err.data.email), resendIn: Number(err.data.resend_in) || 60 };
}

interface AuthContextType {
  token: string | null;
  userId: number | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Creates the account and sends a verification code; signing in follows after verifyEmail. */
  register: (data: RegisterData) => Promise<VerificationRequired>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  /** Returns seconds until the next code can be requested. */
  resendVerificationCode: (email: string) => Promise<number>;
  /** Exchanges a Google ID token for our own token; creates the account on first sign-in. */
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: (options?: { localOnly?: boolean }) => Promise<void>;
}

interface TokenResponse {
  data: { token: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The web Google sign-in returns from Google to the login page with our token in the URL fragment
 * (see GoogleSignInButton.web). Takes it and removes it from the address bar and the history.
 */
function takeGoogleRedirectToken(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('google_token');
  if (!token) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return token;
}

/** The role is in the token claims; the backend checks it again on every admin request. */
function isAdminToken(token: string | null): boolean {
  if (!token) return false;
  try {
    return jwtDecode<{ user_role?: string }>(token).user_role === 'admin';
  } catch {
    return false;
  }
}

function userIdFromToken(token: string | null): number | null {
  if (!token) return null;
  try {
    const decoded = jwtDecode<{ sub?: string | number; user_id?: number }>(token);
    const id = Number(decoded.sub ?? decoded.user_id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fromRedirect = takeGoogleRedirectToken();
    (fromRedirect ? saveToken(fromRedirect).then(() => fromRedirect) : getToken())
      .then((saved) => {
        if (active && saved) setToken(saved);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => onSessionExpired(() => setToken(null)), []);

  const authenticate = useCallback(async (endpoint: string, body: object) => {
    const res = await apiFetch<TokenResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await saveToken(res.data.token);
    setToken(res.data.token);
  }, []);

  const login = useCallback(
    (credentials: LoginCredentials) =>
      authenticate('auth/login', { ...credentials, email: credentials.email.trim() }),
    [authenticate]
  );

  const register = useCallback(async (data: RegisterData): Promise<VerificationRequired> => {
    const res = await apiFetch<{ data: { email: string; resend_in: number } }>('auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, name: data.name.trim(), email: data.email.trim() }),
    });
    return { email: res.data.email, resendIn: Number(res.data.resend_in) || 60 };
  }, []);

  const verifyEmail = useCallback(
    (email: string, code: string) => authenticate('auth/verify-email', { email, code }),
    [authenticate]
  );

  const resendVerificationCode = useCallback(async (email: string) => {
    const res = await apiFetch<{ data: { resend_in: number } }>('auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return Number(res.data.resend_in) || 60;
  }, []);

  const loginWithGoogle = useCallback(
    (idToken: string) => authenticate('auth/google', { id_token: idToken }),
    [authenticate]
  );

  const logout = useCallback(async (options?: { localOnly?: boolean }) => {
    if (!options?.localOnly) {
      try {
        await apiFetch('auth/logout', { method: 'POST' });
      } catch {
        // Logging out locally must work offline too; the token simply expires on its own.
      }
    }
    await removeToken();
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      userId: userIdFromToken(token),
      isAdmin: isAdminToken(token),
      isLoading,
      login,
      register,
      verifyEmail,
      resendVerificationCode,
      loginWithGoogle,
      logout,
    }),
    [token, isLoading, login, register, verifyEmail, resendVerificationCode, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth musí být použit uvnitř AuthProvideru');
  return context;
};
