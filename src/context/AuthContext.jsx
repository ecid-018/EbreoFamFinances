import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../data/supabaseClient.js';
import { findDeviceProfile, saveDeviceProfile } from '../data/deviceProfiles.js';

const AuthContext = createContext(null);

const MIN_PIN_LENGTH = 8;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [error, setError] = useState('');
  // Bumped after a sign-in writes to the device store, so currentProfile
  // recomputes with the display name we just learned.
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const currentProfile = useMemo(() => {
    const email = session?.user?.email;
    if (!email) return null;
    // Fall back to the email itself so the UI always has something to show on
    // a device that hasn't completed a sign-in yet (or had its storage cleared).
    return findDeviceProfile(email) ?? { email, displayName: email };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileVersion]);

  // Returns { ok, pinLength } — the lock screen uses pinLength to nudge
  // members still on a short PIN.
  const signIn = useCallback(async (email, pin) => {
    setError('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password: pin });
    if (signInError) {
      setError(signInError.message);
      return { ok: false, pinLength: pin.length };
    }

    const userId = data?.user?.id;
    let displayName = findDeviceProfile(email)?.displayName;
    if (userId) {
      // profiles is readable by any signed-in member (RLS: select using true),
      // so this is the first moment the app can learn the real display name.
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
      if (profileRow?.display_name) displayName = profileRow.display_name;
    }
    saveDeviceProfile({ email, displayName: displayName ?? email, userId, pinLength: pin.length });
    setProfileVersion((v) => v + 1);
    return { ok: true, pinLength: pin.length };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const changePassword = useCallback(async (newPin) => {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPin });
    if (updateError) return false;
    const email = session?.user?.email;
    if (email) {
      saveDeviceProfile({ email, pinLength: newPin.length });
      setProfileVersion((v) => v + 1);
    }
    return true;
  }, [session]);

  const sendPasswordReset = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return !resetError;
  }, []);

  const value = useMemo(
    () => ({ session, currentProfile, error, signIn, signOut, changePassword, sendPasswordReset, MIN_PIN_LENGTH }),
    [session, currentProfile, error, signIn, signOut, changePassword, sendPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
