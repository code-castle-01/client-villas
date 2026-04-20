import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type ManualInstallPlatform = "ios" | "android-manual" | null;

type InstallPromptSnapshot = {
  installPrompt: BeforeInstallPromptEvent | null;
  manualInstallPlatform: ManualInstallPlatform;
};

let isInstallPromptCaptureInitialized = false;
let currentInstallPrompt: BeforeInstallPromptEvent | null = null;
let currentManualInstallPlatform: ManualInstallPlatform = null;

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const getManualInstallPlatform = (): ManualInstallPlatform => {
  if (typeof window === "undefined") {
    return null;
  }

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && (maxTouchPoints ?? 0) > 1);
  const isSafariBrowser =
    /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(userAgent);

  if (isIosDevice && isSafariBrowser) {
    return "ios";
  }

  return /Android/i.test(userAgent) ? "android-manual" : null;
};

const readSnapshot = (): InstallPromptSnapshot => ({
  installPrompt: currentInstallPrompt,
  manualInstallPlatform: currentManualInstallPlatform,
});

export const initPwaInstallPromptCapture = () => {
  if (typeof window === "undefined" || isInstallPromptCaptureInitialized) {
    return;
  }

  isInstallPromptCaptureInitialized = true;
  currentManualInstallPlatform = getManualInstallPlatform();

  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    currentInstallPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  };

  const handleAppInstalled = () => {
    currentInstallPrompt = null;
    notifyListeners();
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
};

export const usePwaInstallPrompt = () => {
  const [snapshot, setSnapshot] = useState<InstallPromptSnapshot>(() => readSnapshot());

  useEffect(() => {
    initPwaInstallPromptCapture();

    const handleSnapshotChange = () => {
      setSnapshot(readSnapshot());
    };

    listeners.add(handleSnapshotChange);
    handleSnapshotChange();

    return () => {
      listeners.delete(handleSnapshotChange);
    };
  }, []);

  return {
    canInstall: Boolean(snapshot.installPrompt),
    manualInstallPlatform: snapshot.manualInstallPlatform,
    promptInstall: async () => {
      if (!currentInstallPrompt) {
        return false;
      }

      await currentInstallPrompt.prompt();
      const result = await currentInstallPrompt.userChoice;
      currentInstallPrompt = null;
      notifyListeners();
      return result.outcome === "accepted";
    },
  };
};
