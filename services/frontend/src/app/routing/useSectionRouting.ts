import { useEffect, useMemo, useState } from "react";
import { AppTab, menu, isTab } from "../navigation/menu";
import { featureFlags } from "../../config/featureFlags";

function canAccess(item: (typeof menu)[number], isAdmin: boolean) {
  if (item.flag && !featureFlags[item.flag]) return false;
  if (item.requiresAdmin && !isAdmin) return false;
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
    return "myTemplates";
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
      navigateToTab("myTemplates", false);
    }
  }, [tab, enabledMenu]);

  useEffect(() => {
    function onPopState() {
      const fromURL = new URLSearchParams(window.location.search).get("section");
      if (isTab(fromURL) && canAccessTab(fromURL)) setTab(fromURL);
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
