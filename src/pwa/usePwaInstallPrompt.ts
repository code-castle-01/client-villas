import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const getManualInstallPlatform = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && (maxTouchPoints ?? 0) > 1);
  const isSafariBrowser =
    /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(userAgent);

  return isIosDevice && isSafariBrowser ? "ios" : null;
};

export const usePwaInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [manualInstallPlatform] = useState(() => getManualInstallPlatform());

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return {
    canInstall: Boolean(installPrompt),
    manualInstallPlatform,
    promptInstall: async () => {
      if (!installPrompt) {
        return false;
      }

      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      setInstallPrompt(null);
      return result.outcome === "accepted";
    },
  };
};
