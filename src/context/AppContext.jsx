import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { appReducer, initState } from './appReducer.js';
import { persistData } from '../data/storage.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, initState);
  const [modal, setModal] = useState({ activeModal: null, modalProps: null });
  const [activeTab, setActiveTabState] = useState('home');

  useEffect(() => {
    persistData(state);
  }, [state]);

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

  const value = useMemo(
    () => ({ state, dispatch, modal, openModal, closeModal, activeTab, setActiveTab }),
    [state, modal, openModal, closeModal, activeTab, setActiveTab]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
