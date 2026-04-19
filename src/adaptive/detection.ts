import type {
  AdaptiveUIOverrideMode,
  AdaptiveUIResolvedMode,
} from "./types";

export const ADAPTIVE_UI_BREAKPOINT = 768;
export const ADAPTIVE_UI_STORAGE_KEY = "uiModeOverride";

export type AdaptiveDeviceSnapshot = {
  isStandalone: boolean;
  isTouchLike: boolean;
  viewportWidth: number;
};

export type ResolveAdaptiveModeInput = AdaptiveDeviceSnapshot & {
  overrideMode: AdaptiveUIOverrideMode;
  roleType?: string;
};

const getMatchMedia = (query: string) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia(query);
};

export const getViewportWidth = () => {
  if (typeof window === "undefined") {
    return ADAPTIVE_UI_BREAKPOINT + 1;
  }

  return window.innerWidth;
};

export const getIsStandalone = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneMatch = getMatchMedia("(display-mode: standalone)")?.matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );

  return Boolean(standaloneMatch || iosStandalone);
};

export const getIsTouchLike = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const coarsePointer = getMatchMedia("(pointer: coarse)")?.matches;
  const touchPoints = window.navigator.maxTouchPoints ?? 0;

  return Boolean(coarsePointer || touchPoints > 0);
};

export const readAdaptiveOverrideMode = (): AdaptiveUIOverrideMode => {
  if (typeof window === "undefined") {
    return "auto";
  }

  const stored = window.localStorage.getItem(ADAPTIVE_UI_STORAGE_KEY);
  if (stored === "mobile" || stored === "desktop" || stored === "auto") {
    return stored;
  }

  return "auto";
};

export const writeAdaptiveOverrideMode = (mode: AdaptiveUIOverrideMode) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADAPTIVE_UI_STORAGE_KEY, mode);
};

export const getAdaptiveDeviceSnapshot = (): AdaptiveDeviceSnapshot => ({
  isStandalone: getIsStandalone(),
  isTouchLike: getIsTouchLike(),
  viewportWidth: getViewportWidth(),
});

export const resolveAdaptiveMode = ({
  overrideMode,
  roleType,
  isStandalone,
  isTouchLike,
  viewportWidth,
}: ResolveAdaptiveModeInput): AdaptiveUIResolvedMode => {
  if (overrideMode === "mobile" || overrideMode === "desktop") {
    return overrideMode;
  }

  if (roleType === "admin-app") {
    return "desktop";
  }

  return viewportWidth <= ADAPTIVE_UI_BREAKPOINT && (isTouchLike || isStandalone)
    ? "mobile"
    : "desktop";
};
