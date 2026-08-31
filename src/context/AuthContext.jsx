import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../data/supabaseClient.js';
import { AUTH_PROFILES } from '../data/authProfiles.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const currentProfile = useMemo(() => {
    if (!session?.user?.email) return null;
    return AUTH_PROFILES.find((p) => p.email === session.user.email) ?? null;
  }, [session]);

  const signIn = useCallback(async (email, pin) => {
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pin });
    if (signInError) {
      setError(signInError.message);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const changePassword = useCallback(async (newPin) => {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPin });
    return !updateError;
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return !resetError;
  }, []);

  const value = useMemo(
    () => ({ session, currentProfile, error, signIn, signOut, changePassword, sendPasswordReset }),
    [session, currentProfile, error, signIn, signOut, changePassword, sendPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
