import { useEffect, useMemo, useState } from "react";
import { AppTab, menu, isTab, mapLegacySection } from "../navigation/menu";

function canAccess(item: (typeof menu)[number], _isAdmin: boolean) {
  if (item.id === "admin") return true;
  return true;
}

export function useSectionRouting(isAdmin: boolean) {
  const enabledMenu = useMemo(() => menu.filter((item) => canAccess(item, isAdmin)), [isAdmin]);
  const [tab, setTab] = useState<AppTab>(() => {
    const fromURL = new URLSearchParams(window.location.search).get("section");
    if (isTab(fromURL)) {
      const item = menu.find((entry) => entry.id === fromURL);
      if (item && canAccess(item, isAdmin)) return fromURL;
    }
    const mappedLegacy = mapLegacySection(fromURL);
    if (mappedLegacy) return mappedLegacy;
    return "marketplace";
  });

  function canAccessTab(nextTab: AppTab) {
    return enabledMenu.some((item) => item.id === nextTab);
  }

  function navigateToTab(nextTab: AppTab, pushHistory = true) {
    if (!canAccessTab(nextTab)) return;
    setTab(nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set("section", nextTab);
    if (pushHistory) {
      window.history.pushState({}, "", url);
      return;
    }
    window.history.replaceState({}, "", url);
  }

  useEffect(() => {
    const fromURL = new URLSearchParams(window.location.search).get("section");
    if (isTab(fromURL) && fromURL !== tab && canAccessTab(fromURL)) {
      setTab(fromURL);
      return;
    }
    const url = new URL(window.location.href);
    if (!isTab(fromURL)) {
      url.searchParams.set("section", tab);
      window.history.replaceState({}, "", url);
    }
  }, [tab, enabledMenu]);

  useEffect(() => {
    if (!canAccessTab(tab)) {
      navigateToTab("marketplace", false);
    }
  }, [tab, enabledMenu]);

  useEffect(() => {
    function onPopState() {
      const fromURL = new URLSearchParams(window.location.search).get("section");
      if (isTab(fromURL) && canAccessTab(fromURL)) setTab(fromURL);
      const mappedLegacy = mapLegacySection(fromURL);
      if (mappedLegacy && canAccessTab(mappedLegacy)) setTab(mappedLegacy);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabledMenu]);

  return {
    tab,
    enabledMenu,
    navigateToTab
  };
}
