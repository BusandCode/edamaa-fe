import { useState, useEffect } from 'react';

/**
 * Custom hook to get and sync notification count across components
 * This hook listens for changes to localStorage notifications and updates automatically
 */
export const useNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        try {
          const notifications = JSON.parse(stored);
          return notifications.filter((n: any) => !n.isRead).length;
        } catch (error) {
          console.error('Error parsing notifications:', error);
          return 0;
        }
      }
    }
    return 0;
  });

  useEffect(() => {
    // Function to update count from localStorage
    const updateCount = () => {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        try {
          const notifications = JSON.parse(stored);
          const count = notifications.filter((n: any) => !n.isRead).length;
          setUnreadCount(count);
        } catch (error) {
          console.error('Error parsing notifications:', error);
          setUnreadCount(0);
        }
      } else {
        setUnreadCount(0);
      }
    };

    // Listen for custom notification update events
    window.addEventListener('notificationsUpdated', updateCount);
    
    // Also listen for storage events (for multi-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'notifications') {
        updateCount();
      }
    });

    // Cleanup listeners
    return () => {
      window.removeEventListener('notificationsUpdated', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  return unreadCount;
};