import { useState, useEffect } from 'react';

export const useDataPersistence = () => {
  const [isPersistent, setIsPersistent] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkAndRequestPersistence = async () => {
      if (navigator.storage && navigator.storage.persist) {
        // Check if already persistent
        let persistent = await navigator.storage.persisted();
        if (!persistent) {
          // Request persistence
          persistent = await navigator.storage.persist();
        }
        setIsPersistent(persistent);
        // If still not persistent, we might want to prompt user to bookmark the app
        if (!persistent) {
            setShowPrompt(true);
        }
      }
    };
    
    checkAndRequestPersistence();
  }, []);

  return { isPersistent, showPrompt, setShowPrompt };
};
