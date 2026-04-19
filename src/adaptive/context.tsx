import React, {
  createContext,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getAdaptiveDeviceSnapshot,
  getIsStandalone,
  getIsTouchLike,
  getViewportWidth,
  readAdaptiveOverrideMode,
  resolveAdaptiveMode,
  writeAdaptiveOverrideMode,
} from "./detection";
import type { AdaptiveUIState } from "./types";

const defaultState: AdaptiveUIState = {
  resolvedMode: "desktop",
  overrideMode: "auto",
  isStandalone: false,
  isTouchLike: false,
  viewportWidth: 1024,
  setOverrideMode: () => undefined,
};

export const AdaptiveUIContext = createContext<AdaptiveUIState>(defaultState);

type AdaptiveUIProviderProps = PropsWithChildren<{
  roleType?: string;
}>;

export const AdaptiveUIProvider: React.FC<AdaptiveUIProviderProps> = ({
  children,
  roleType,
}) => {
  const [overrideMode, setOverrideModeState] = useState(() =>
    readAdaptiveOverrideMode(),
  );
  const [deviceSnapshot, setDeviceSnapshot] = useState(() =>
    getAdaptiveDeviceSnapshot(),
  );

  useEffect(() => {
    const handleSnapshotChange = () => {
      setDeviceSnapshot({
        isStandalone: getIsStandalone(),
        isTouchLike: getIsTouchLike(),
        viewportWidth: getViewportWidth(),
      });
    };

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");

    handleSnapshotChange();

    window.addEventListener("resize", handleSnapshotChange);
    window.addEventListener("pageshow", handleSnapshotChange);
    standaloneQuery.addEventListener("change", handleSnapshotChange);
    pointerQuery.addEventListener("change", handleSnapshotChange);

    return () => {
      window.removeEventListener("resize", handleSnapshotChange);
      window.removeEventListener("pageshow", handleSnapshotChange);
      standaloneQuery.removeEventListener("change", handleSnapshotChange);
      pointerQuery.removeEventListener("change", handleSnapshotChange);
    };
  }, []);

  const setOverrideMode = (mode: AdaptiveUIState["overrideMode"]) => {
    setOverrideModeState(mode);
    writeAdaptiveOverrideMode(mode);
  };

  const value = useMemo<AdaptiveUIState>(
    () => ({
      ...deviceSnapshot,
      overrideMode,
      resolvedMode: resolveAdaptiveMode({
        ...deviceSnapshot,
        overrideMode,
        roleType,
      }),
      setOverrideMode,
    }),
    [deviceSnapshot, overrideMode, roleType],
  );

  return (
    <AdaptiveUIContext.Provider value={value}>
      {children}
    </AdaptiveUIContext.Provider>
  );
};
