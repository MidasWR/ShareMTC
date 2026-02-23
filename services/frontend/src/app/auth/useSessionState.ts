import { useEffect, useState } from "react";
import { clearSession, getRole, isTokenValid } from "../../lib/auth";

export function useSessionState() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isTokenValid());
  const [role, setRole] = useState(() => getRole());

  useEffect(() => {
    function onStorageUpdate() {
      setIsAuthenticated(isTokenValid());
      setRole(getRole());
    }
    window.addEventListener("storage", onStorageUpdate);
    return () => window.removeEventListener("storage", onStorageUpdate);
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
