import { registerSW } from "virtual:pwa-register";
import {
  PWA_OFFLINE_READY_EVENT,
  PWA_UPDATE_READY_EVENT,
} from "./constants";

export const initPwaRegistration = () => {
  if (typeof window === "undefined") {
    return;
  }

  const updateSW = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(
        new CustomEvent(PWA_UPDATE_READY_EVENT, {
          detail: {
            applyUpdate: () => updateSW(true),
          },
        }),
      );
    },
    onOfflineReady() {
      window.dispatchEvent(new Event(PWA_OFFLINE_READY_EVENT));
    },
  });
};
