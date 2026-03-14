import { useState, useEffect } from 'react';
import { fetchSchoolScheduleNotifications } from '../schools/utils/schoolScheduleApi';
import { fetchStudentExamNotifications } from '../schools/utils/examsApi';

type LocalNotification = {
  id: string;
  isRead?: boolean;
  title?: string;
  message?: string;
  time?: string;
  type?: 'assignment' | 'grade' | 'announcement' | 'reminder' | 'achievement';
  priority?: 'high' | 'medium' | 'low';
  createdAt?: string;
  source?: 'seed' | 'schedule' | 'local' | 'exam';
};

const readLocalNotifications = (): LocalNotification[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = window.localStorage.getItem('notifications');
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalNotification[]) : [];
  } catch {
    return [];
  }
};

const writeLocalNotifications = (notifications: LocalNotification[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem('notifications', JSON.stringify(notifications));
  window.dispatchEvent(new Event('notificationsUpdated'));
};

const formatRelativeLabel = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Recently';
  }

  const diffMinutes = Math.round((Date.now() - timestamp) / 60000);
  if (diffMinutes <= 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return new Date(value).toLocaleString();
};

/**
 * Custom hook to get and sync notification count across components
 * This hook listens for changes to localStorage notifications and updates automatically
 */
export const useNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const notifications = readLocalNotifications();
    return notifications.filter((notification) => !notification.isRead).length;
  });

  useEffect(() => {
    // Function to update count from localStorage
    const updateCount = () => {
      const notifications = readLocalNotifications();
      const count = notifications.filter((notification) => !notification.isRead).length;
      setUnreadCount(count);
    };

    const syncScheduleNotifications = async () => {
      try {
        const [schedulePayload, examPayload] = await Promise.all([
          fetchSchoolScheduleNotifications().catch(() => null),
          fetchStudentExamNotifications().catch(() => null),
        ]);
        const existing = readLocalNotifications();
        const byId = new Map(existing.map((notification) => [notification.id, notification]));

        schedulePayload?.notifications.forEach((notification) => {
          byId.set(`schedule:${notification.id}`, {
            id: `schedule:${notification.id}`,
            type: notification.kind === 'canceled' ? 'reminder' : 'announcement',
            title: notification.title,
            message: notification.message,
            time: notification.createdAtLabel,
            isRead: notification.isRead,
            priority: notification.priority,
            createdAt: notification.createdAt,
            source: 'schedule',
          });
        });

        examPayload?.notifications.forEach((notification) => {
          byId.set(`exam:${notification.id}`, {
            id: `exam:${notification.id}`,
            type: 'grade',
            title: notification.title,
            message: notification.message,
            time: formatRelativeLabel(notification.createdAt),
            isRead: notification.isRead,
            priority: notification.isRead ? 'low' : 'medium',
            createdAt: notification.createdAt,
            source: 'exam',
          });
        });

        const merged = Array.from(byId.values()).sort((a, b) => {
          const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTs - aTs;
        });

        writeLocalNotifications(merged);
      } catch {
        // Keep local notifications unchanged when schedule feed is unavailable.
      } finally {
        updateCount();
      }
    };

    // Listen for custom notification update events
    window.addEventListener('notificationsUpdated', updateCount);
    
    // Also listen for storage events (for multi-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'notifications') {
        updateCount();
      }
    };
    window.addEventListener('storage', handleStorage);

    void syncScheduleNotifications();

    // Cleanup listeners
    return () => {
      window.removeEventListener('notificationsUpdated', updateCount);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return unreadCount;
};
