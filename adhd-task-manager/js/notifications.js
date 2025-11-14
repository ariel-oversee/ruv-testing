// ==========================================
// Notification Manager
// ==========================================

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.init();
    }

    init() {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }

        this.permission = Notification.permission;

        // Request permission if not yet determined
        if (this.permission === 'default') {
            this.requestPermission();
        }
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                this.show('Notifications Enabled', 'You will receive gentle reminders');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }

    show(title, body, options = {}) {
        // Check if notifications are enabled in settings
        const settings = window.storageManager.getSettings();
        if (!settings.notificationsEnabled) {
            return;
        }

        // Check permission
        if (this.permission !== 'granted') {
            return;
        }

        try {
            const notification = new Notification(title, {
                body: body,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: options.tag || 'focus-notification',
                requireInteraction: false,
                silent: true, // Gentle, non-intrusive
                ...options
            });

            // Auto-close after 4 seconds (gentle reminder)
            setTimeout(() => notification.close(), 4000);

            // Optional click handler
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    // Schedule a notification
    scheduleNotification(title, body, delayMs) {
        return setTimeout(() => {
            this.show(title, body);
        }, delayMs);
    }

    // Show task reminder
    showTaskReminder(task) {
        this.show(
            'Task Reminder',
            task.title,
            {
                tag: `task-${task.id}`,
                icon: '/icons/icon-192.png'
            }
        );
    }

    // Show break reminder
    showBreakReminder() {
        this.show(
            'Time for a break',
            'You\'ve been working hard. Take a moment to rest.',
            { tag: 'break-reminder' }
        );
    }

    // Show focus reminder
    showFocusReminder() {
        this.show(
            'Stay focused',
            'You\'re doing great! Keep going.',
            { tag: 'focus-reminder' }
        );
    }
}

// Initialize notification manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
});
