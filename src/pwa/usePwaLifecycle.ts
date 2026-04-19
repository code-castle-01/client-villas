import { useEffect, useState } from "react";
import {
  PWA_OFFLINE_READY_EVENT,
  PWA_UPDATE_READY_EVENT,
} from "./constants";

type PwaUpdateEvent = CustomEvent<{
  applyUpdate: () => void;
}>;

export const usePwaLifecycle = () => {
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handleOfflineReady = () => {
      setIsOfflineReady(true);
    };

    const handleUpdateReady = (event: Event) => {
      const customEvent = event as PwaUpdateEvent;
      setApplyUpdate(() => customEvent.detail?.applyUpdate ?? null);
      setIsUpdateReady(true);
    };

    window.addEventListener(PWA_OFFLINE_READY_EVENT, handleOfflineReady);
    window.addEventListener(PWA_UPDATE_READY_EVENT, handleUpdateReady);

    return () => {
      window.removeEventListener(PWA_OFFLINE_READY_EVENT, handleOfflineReady);
      window.removeEventListener(PWA_UPDATE_READY_EVENT, handleUpdateReady);
    };
  }, []);

  return {
    applyUpdate,
    isOfflineReady,
    isUpdateReady,
    resetUpdateReady: () => setIsUpdateReady(false),
  };
};
