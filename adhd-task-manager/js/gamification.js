// ==========================================
// Gamification Manager
// ==========================================

class GamificationManager {
    constructor() {
        this.stats = {
            points: 0,
            streak: 0,
            lastCompletedDate: null,
            totalTasksCompleted: 0
        };

        this.init();
    }

    init() {
        this.loadStats();
        this.updateDisplay();
        this.checkStreak();
    }

    loadStats() {
        this.stats = window.storageManager.getStats();
    }

    saveStats() {
        window.storageManager.saveStats(this.stats);
    }

    addPoints(points) {
        this.stats.points += points;
        this.saveStats();
        this.updateDisplay();
        this.animatePoints(points);
    }

    incrementStreak() {
        const today = new Date().toDateString();
        const lastCompleted = this.stats.lastCompletedDate;

        if (lastCompleted) {
            const lastDate = new Date(lastCompleted).toDateString();

            if (lastDate !== today) {
                // Check if it's consecutive
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toDateString();

                if (lastDate === yesterdayStr) {
                    // Consecutive day
                    this.stats.streak++;
                    this.checkStreakMilestones();
                } else {
                    // Streak broken, reset to 1
                    this.stats.streak = 1;
                }
            }
        } else {
            // First completion
            this.stats.streak = 1;
        }

        this.stats.lastCompletedDate = new Date().toISOString();
        this.stats.totalTasksCompleted++;
        this.saveStats();
        this.updateDisplay();
    }

    checkStreak() {
        const today = new Date().toDateString();
        const lastCompleted = this.stats.lastCompletedDate;

        if (lastCompleted) {
            const lastDate = new Date(lastCompleted).toDateString();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();

            // If last completed was not today or yesterday, reset streak
            if (lastDate !== today && lastDate !== yesterdayStr) {
                this.stats.streak = 0;
                this.saveStats();
                this.updateDisplay();
            }
        }
    }

    checkStreakMilestones() {
        if (this.stats.streak === 3) {
            this.showAchievement('3 Day Streak!', 'Keep up the momentum');
        } else if (this.stats.streak === 7) {
            this.showAchievement('Week Warrior!', '7 days in a row');
        } else if (this.stats.streak === 30) {
            this.showAchievement('Monthly Master!', '30 days strong');
        } else if (this.stats.streak === 100) {
            this.showAchievement('Century Club!', '100 day streak');
        }
    }

    updateDisplay() {
        document.getElementById('points-count').textContent = this.stats.points;
        document.getElementById('streak-count').textContent = this.stats.streak;
    }

    animatePoints(points) {
        // Create floating points animation
        const statItem = document.querySelector('.stat-item:has(#points-count)');
        if (!statItem) return;

        const floatingPoints = document.createElement('div');
        floatingPoints.textContent = `+${points}`;
        floatingPoints.style.cssText = `
            position: absolute;
            color: #fbbf24;
            font-weight: bold;
            font-size: 1.25rem;
            pointer-events: none;
            animation: float-up 1s ease-out forwards;
        `;

        statItem.style.position = 'relative';
        statItem.appendChild(floatingPoints);

        setTimeout(() => floatingPoints.remove(), 1000);
    }

    showAchievement(title, description) {
        const toast = document.getElementById('achievement-toast');
        toast.querySelector('.achievement-title').textContent = title;
        toast.querySelector('.achievement-description').textContent = description;

        toast.classList.add('show');

        // Play a subtle sound (if implemented)
        this.playAchievementSound();

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    playAchievementSound() {
        // Optional: Add a subtle achievement sound
        // This would require an audio file
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEA');
            audio.volume = 0.2;
            audio.play().catch(() => {});
        } catch (error) {
            // Silently fail if audio doesn't work
        }
    }

    // Get level based on points
    getLevel() {
        return Math.floor(this.stats.points / 500) + 1;
    }

    // Get progress to next level
    getLevelProgress() {
        const pointsInCurrentLevel = this.stats.points % 500;
        return (pointsInCurrentLevel / 500) * 100;
    }

    // Reset stats (for testing or user request)
    resetStats() {
        this.stats = {
            points: 0,
            streak: 0,
            lastCompletedDate: null,
            totalTasksCompleted: 0
        };
        this.saveStats();
        this.updateDisplay();
    }
}

// Add CSS for floating points animation
const style = document.createElement('style');
style.textContent = `
    @keyframes float-up {
        0% {
            transform: translateY(0) scale(1);
            opacity: 1;
        }
        100% {
            transform: translateY(-30px) scale(1.2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize gamification manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gamificationManager = new GamificationManager();
});
