import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react';
import { appReducer } from './appReducer.js';
import { useAuth } from './AuthContext.jsx';
import { fetchAll } from '../data/repo.js';
import { syncEffects, ACTIONS_NEEDING_ID } from '../data/syncEffects.js';
import { generateId } from '../utils/id.js';
import { loadTheme, saveTheme } from '../data/storage.js';
import { applyTheme, updateThemeColorMeta } from '../utils/theme.js';
import { toISODateString, getCurrentMonth } from '../utils/date.js';

const AppContext = createContext(null);

const EMPTY_DOMAIN_STATE = {
  envelopes: [],
  transactions: [],
  income: [],
  accounts: [],
  goals: [],
  ledger: [],
  profiles: [],
  month: getCurrentMonth(),
};

export function AppProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [state, dispatch] = useReducer(appReducer, EMPTY_DOMAIN_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [modal, setModal] = useState({ activeModal: null, modalProps: null });
  const [activeTab, setActiveTabState] = useState('home');
  const [theme, setThemeState] = useState(loadTheme);
  const [viewMode, setViewMode] = useState('month');
  const [viewDay, setViewDay] = useState(() => toISODateString());

  const refetchAll = useCallback(async () => {
    if (!userId) return;
    try {
      let data;
      try {
        data = await fetchAll();
      } catch (err) {
        // A fresh sign-in's token can very briefly race Supabase's own
        // Auth/PostgREST clock sync (PGRST303 "JWT issued at future") —
        // one short retry clears it without surfacing a scary error.
        if (err?.code !== 'PGRST303') throw err;
        await new Promise((resolve) => setTimeout(resolve, 800));
        data = await fetchAll();
      }
      dispatch({ type: 'bootstrap/loaded', payload: data });
      setSyncError('');
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
      setSyncError("Couldn't load your data — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') refetchAll();
    }
    window.addEventListener('focus', refetchAll);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refetchAll);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refetchAll]);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateThemeColorMeta);
    return () => mediaQuery.removeEventListener('change', updateThemeColorMeta);
  }, []);

  const dispatchWithSync = useCallback(
    (action) => {
      const prevState = stateRef.current;
      let finalAction = action;
      if (ACTIONS_NEEDING_ID.has(action.type) && !action.payload?.id) {
        finalAction = { ...action, payload: { ...action.payload, id: generateId() } };
      }
      if (finalAction.type === 'account/add') {
        finalAction = { ...finalAction, payload: { ...finalAction.payload, ownerId: userId } };
      }

      dispatch(finalAction);

      const effect = syncEffects[finalAction.type];
      if (!effect || !userId) return;
      Promise.resolve(effect(finalAction.payload, { userId, prevState })).catch((err) => {
        console.error(`Sync failed for ${finalAction.type}:`, err);
        setSyncError("Couldn't save your last change — refreshing to reconnect…");
        refetchAll();
      });
    },
    [userId, refetchAll]
  );

  const openModal = useCallback((activeModal, modalProps = null) => {
    setModal({ activeModal, modalProps });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ activeModal: null, modalProps: null });
  }, []);

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    window.scrollTo(0, 0);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch: dispatchWithSync,
      loading,
      syncError,
      modal,
      openModal,
      closeModal,
      activeTab,
      setActiveTab,
      theme,
      setTheme,
      viewMode,
      setViewMode,
      viewDay,
      setViewDay,
    }),
    [state, dispatchWithSync, loading, syncError, modal, openModal, closeModal, activeTab, setActiveTab, theme, setTheme, viewMode, viewDay]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
