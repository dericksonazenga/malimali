import { useState, useEffect } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as unknown as { MSStream?: unknown }).MSStream;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

export function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const canInstall = !installed && (!!installEvent || isIOS());

  const promptInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    if (isIOS()) {
      setShowIOSHint(true);
    }
  };

  return { canInstall, installed, promptInstall, showIOSHint, dismissIOSHint: () => setShowIOSHint(false) };
}
