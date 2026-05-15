import { createContext, useContext, useEffect, useMemo, useState } from "react";
import useAccount from "../hooks/useAccount";

const STORAGE_KEY = "altadill.selectedAccountId";

const AccountContext = createContext(null);

/**
 * Provee el estado de cuenta del usuario actual al árbol de React.
 * Wrap fino sobre useAccount + persistencia opcional de selectedId
 * (relevante a futuro cuando un superuser pertenezca a varias cuentas).
 */
export function AccountProvider({ children }) {
  const acct = useAccount();

  const [selectedId, setSelectedIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // Si el usuario tiene una cuenta y no hay selectedId, sincroniza.
  useEffect(() => {
    if (acct.accountId && selectedId !== acct.accountId) {
      setSelectedIdState(acct.accountId);
      try { localStorage.setItem(STORAGE_KEY, acct.accountId); } catch {}
    }
    if (!acct.accountId && selectedId) {
      setSelectedIdState(null);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, [acct.accountId, selectedId]);

  const setSelectedId = (id) => {
    setSelectedIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else    localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(
    () => ({ ...acct, selectedId, setSelectedId }),
    [acct, selectedId],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

/**
 * Hook seguro: si no hay provider devuelve defaults neutros para no romper
 * tests existentes ni hooks que se monten sin el provider.
 */
export function useAccountContext() {
  return useContext(AccountContext) || {
    account: null,
    accountId: null,
    accountRole: null,
    members: [],
    loading: false,
    selectedId: null,
    setSelectedId: () => {},
    createAccount:    async () => {},
    inviteMember:     async () => {},
    removeMember:     async () => {},
    updateMemberRole: async () => {},
    transferOwnership: async () => {},
  };
}
