export type AdaptiveUIOverrideMode = "auto" | "mobile" | "desktop";

export type AdaptiveUIResolvedMode = "mobile" | "desktop";

export type AdaptiveUIState = {
  resolvedMode: AdaptiveUIResolvedMode;
  overrideMode: AdaptiveUIOverrideMode;
  isStandalone: boolean;
  isTouchLike: boolean;
  screenShortSide: number;
  viewportWidth: number;
  setOverrideMode: (mode: AdaptiveUIOverrideMode) => void;
};
