// NotificationContext.tsx - Context for managing notifications across the app

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'assignment' | 'grade' | 'announcement' | 'reminder' | 'achievement';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'assignment',
    title: 'New Assignment Posted',
    message: 'Mathematics: Calculus Problem Set Due in 2 days',
    time: '5 minutes ago',
    isRead: false,
    priority: 'high',
  },
  {
    id: '2',
    type: 'grade',
    title: 'Grade Published',
    message: 'Your Physics Lab Report score is now available: 95/100',
    time: '1 hour ago',
    isRead: false,
    priority: 'medium',
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Achievement Unlocked! 🎉',
    message: 'You\'ve completed 10 assignments this month!',
    time: '3 hours ago',
    isRead: false,
    priority: 'low',
  },
  {
    id: '4',
    type: 'announcement',
    title: 'Class Rescheduled',
    message: 'Chemistry class moved to 3:00 PM tomorrow',
    time: '5 hours ago',
    isRead: true,
    priority: 'high',
  },
  {
    id: '5',
    type: 'reminder',
    title: 'Upcoming Deadline',
    message: 'English Essay submission deadline is tomorrow at 11:59 PM',
    time: '1 day ago',
    isRead: true,
    priority: 'high',
  },
  {
    id: '6',
    type: 'announcement',
    title: 'New Study Material',
    message: 'Professor Lee uploaded lecture notes for Chapter 5',
    time: '2 days ago',
    isRead: true,
    priority: 'medium',
  },
  {
    id: '7',
    type: 'grade',
    title: 'Quiz Results',
    message: 'Biology Quiz 3 results: 88/100 - Great job!',
    time: '3 days ago',
    isRead: true,
    priority: 'medium',
  },
];

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return initialNotifications;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};