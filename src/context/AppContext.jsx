import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { appReducer, initState } from './appReducer.js';
import { persistData, loadTheme, saveTheme } from '../data/storage.js';
import { applyTheme, updateThemeColorMeta } from '../utils/theme.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, initState);
  const [modal, setModal] = useState({ activeModal: null, modalProps: null });
  const [activeTab, setActiveTabState] = useState('home');
  const [theme, setThemeState] = useState(loadTheme);

  useEffect(() => {
    persistData(state);
  }, [state]);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateThemeColorMeta);
    return () => mediaQuery.removeEventListener('change', updateThemeColorMeta);
  }, []);

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
    () => ({ state, dispatch, modal, openModal, closeModal, activeTab, setActiveTab, theme, setTheme }),
    [state, modal, openModal, closeModal, activeTab, setActiveTab, theme, setTheme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
