// ==========================================
// Local Storage Manager
// ==========================================

class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'adhd-task-manager';
        this.init();
    }

    init() {
        // Initialize default data structure if not exists
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            this.saveData({
                tasks: [],
                stats: {
                    points: 0,
                    streak: 0,
                    lastCompletedDate: null,
                    totalTasksCompleted: 0
                },
                settings: {
                    focusDuration: 25,
                    shortBreakDuration: 5,
                    longBreakDuration: 15,
                    autoStartBreaks: false,
                    notificationsEnabled: true
                }
            });
        }
    }

    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : this.getDefaultData();
        } catch (error) {
            console.error('Error loading data:', error);
            return this.getDefaultData();
        }
    }

    saveData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    getDefaultData() {
        return {
            tasks: [],
            stats: {
                points: 0,
                streak: 0,
                lastCompletedDate: null,
                totalTasksCompleted: 0
            },
            settings: {
                focusDuration: 25,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                autoStartBreaks: false,
                notificationsEnabled: true
            }
        };
    }

    // Task methods
    getTasks() {
        const data = this.getData();
        return data.tasks || [];
    }

    saveTasks(tasks) {
        const data = this.getData();
        data.tasks = tasks;
        this.saveData(data);
    }

    // Stats methods
    getStats() {
        const data = this.getData();
        return data.stats || this.getDefaultData().stats;
    }

    saveStats(stats) {
        const data = this.getData();
        data.stats = stats;
        this.saveData(data);
    }

    // Settings methods
    getSettings() {
        const data = this.getData();
        return data.settings || this.getDefaultData().settings;
    }

    saveSettings(settings) {
        const data = this.getData();
        data.settings = settings;
        this.saveData(data);
    }

    // Clear all data
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.init();
    }

    // Export data
    exportData() {
        const data = this.getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focus-tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import data
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.saveData(data);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Initialize storage manager
window.storageManager = new StorageManager();
