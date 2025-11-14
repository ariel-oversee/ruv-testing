// ==========================================
// Pomodoro Timer
// ==========================================

class PomodoroTimer {
    constructor() {
        this.state = 'focus'; // 'focus', 'shortBreak', 'longBreak'
        this.isRunning = false;
        this.timeLeft = 0;
        this.totalTime = 0;
        this.timerInterval = null;
        this.pomodorosCompleted = 0;
        this.settings = {};

        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.resetTimer();
    }

    loadSettings() {
        this.settings = window.storageManager.getSettings();
        this.applySettings();
    }

    applySettings() {
        // Apply settings to input fields
        document.getElementById('focus-duration').value = this.settings.focusDuration;
        document.getElementById('short-break-duration').value = this.settings.shortBreakDuration;
        document.getElementById('long-break-duration').value = this.settings.longBreakDuration;
        document.getElementById('auto-start-breaks').checked = this.settings.autoStartBreaks;
        document.getElementById('notifications-enabled').checked = this.settings.notificationsEnabled;
    }

    setupEventListeners() {
        // Timer controls
        document.getElementById('timer-start').addEventListener('click', () => this.start());
        document.getElementById('timer-pause').addEventListener('click', () => this.pause());
        document.getElementById('timer-reset').addEventListener('click', () => this.reset());

        // Timer settings
        document.getElementById('timer-settings').addEventListener('click', () => this.openSettings());
        document.getElementById('save-timer-settings').addEventListener('click', () => this.saveSettings());

        // Settings modal
        const settingsModal = document.getElementById('timer-settings-modal');
        const settingsClose = settingsModal.querySelector('.modal-close');

        settingsClose.addEventListener('click', () => this.closeSettings());
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeSettings();
            }
        });
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        document.getElementById('timer-start').style.display = 'none';
        document.getElementById('timer-pause').style.display = 'inline-block';

        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        document.getElementById('timer-start').style.display = 'inline-block';
        document.getElementById('timer-pause').style.display = 'none';

        clearInterval(this.timerInterval);
    }

    reset() {
        this.pause();
        this.resetTimer();
    }

    resetTimer() {
        this.state = 'focus';
        this.timeLeft = this.settings.focusDuration * 60;
        this.totalTime = this.timeLeft;
        this.updateDisplay();
    }

    tick() {
        this.timeLeft--;

        if (this.timeLeft <= 0) {
            this.onTimerComplete();
        }

        this.updateDisplay();
    }

    onTimerComplete() {
        this.pause();

        // Show notification
        if (this.settings.notificationsEnabled) {
            this.showNotification();
        }

        // Award points and achievements
        if (this.state === 'focus') {
            this.pomodorosCompleted++;
            window.gamificationManager.addPoints(50);

            if (this.pomodorosCompleted === 1) {
                window.gamificationManager.showAchievement('Focused!', 'Completed your first Pomodoro');
            } else if (this.pomodorosCompleted === 10) {
                window.gamificationManager.showAchievement('Focus Master!', 'Completed 10 Pomodoros');
            }
        }

        // Move to next state
        this.advanceState();

        // Auto-start break if enabled
        if (this.settings.autoStartBreaks && this.state !== 'focus') {
            setTimeout(() => this.start(), 1000);
        }
    }

    advanceState() {
        if (this.state === 'focus') {
            // After focus, take a break
            if (this.pomodorosCompleted % 4 === 0) {
                this.state = 'longBreak';
                this.timeLeft = this.settings.longBreakDuration * 60;
            } else {
                this.state = 'shortBreak';
                this.timeLeft = this.settings.shortBreakDuration * 60;
            }
        } else {
            // After break, start focus
            this.state = 'focus';
            this.timeLeft = this.settings.focusDuration * 60;
        }

        this.totalTime = this.timeLeft;
        this.updateDisplay();
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        document.getElementById('timer-display').textContent = timeString;

        // Update label
        const labels = {
            focus: 'Focus Time',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        document.getElementById('timer-label').textContent = labels[this.state];

        // Update progress circle
        const progress = this.totalTime > 0 ? (this.timeLeft / this.totalTime) : 1;
        const circumference = 2 * Math.PI * 90;
        const dashoffset = circumference * (1 - progress);

        document.getElementById('timer-progress').style.strokeDashoffset = dashoffset;

        // Update page title
        if (this.isRunning) {
            document.title = `${timeString} - Focus`;
        } else {
            document.title = 'Focus Task Manager';
        }
    }

    showNotification() {
        window.notificationManager.show(
            this.state === 'focus' ? 'Time for a break!' : 'Back to work!',
            this.state === 'focus'
                ? 'You completed a focus session. Take a break!'
                : 'Break time is over. Ready to focus?'
        );
    }

    openSettings() {
        document.getElementById('timer-settings-modal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('timer-settings-modal').classList.remove('active');
    }

    saveSettings() {
        const newSettings = {
            focusDuration: parseInt(document.getElementById('focus-duration').value),
            shortBreakDuration: parseInt(document.getElementById('short-break-duration').value),
            longBreakDuration: parseInt(document.getElementById('long-break-duration').value),
            autoStartBreaks: document.getElementById('auto-start-breaks').checked,
            notificationsEnabled: document.getElementById('notifications-enabled').checked
        };

        this.settings = newSettings;
        window.storageManager.saveSettings(newSettings);

        // If timer is not running and in focus state, update the timer
        if (!this.isRunning && this.state === 'focus') {
            this.resetTimer();
        }

        this.closeSettings();

        window.gamificationManager.showAchievement('Customized!', 'Timer settings updated');
    }
}

// Initialize Pomodoro timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pomodoroTimer = new PomodoroTimer();
});
