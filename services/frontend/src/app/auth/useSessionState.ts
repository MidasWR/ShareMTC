import { useEffect, useState } from "react";
import { clearSession, getRole, isTokenValid, onAuthChange } from "../../lib/auth";

export function useSessionState() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isTokenValid());
  const [role, setRole] = useState(() => getRole());

  useEffect(() => {
    function syncSession() {
      setIsAuthenticated(isTokenValid());
      setRole(getRole());
    }
    window.addEventListener("storage", syncSession);
    const unsubscribe = onAuthChange(syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      unsubscribe();
    };
  }, []);

  function refreshSession() {
    setIsAuthenticated(isTokenValid());
    setRole(getRole());
  }

  function logout() {
    clearSession();
    setIsAuthenticated(false);
    setRole("guest");
  }

  return {
    isAuthenticated,
    role,
    refreshSession,
    logout
  };
}
