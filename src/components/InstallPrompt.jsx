import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const dismissed = window.localStorage.getItem('gg-install-dismissed') === '1';
    if (dismissed) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    window.localStorage.setItem('gg-install-dismissed', '1');
    setVisible(false);
  };

  return (
    <div className="install-banner" role="status" aria-live="polite">
      <div>
        <strong>Add GoldenGrain to your phone</strong>
        <p>Install the app for faster access and a cleaner mobile experience.</p>
      </div>
      <div className="install-banner-actions">
        <button type="button" className="btn btn-primary" onClick={handleInstall}>
          <Download size={16} />
          Install
        </button>
        <button type="button" className="install-dismiss-btn" onClick={handleDismiss} aria-label="Dismiss install prompt">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
