// ==========================================
// ADHD Task Manager - Main Application
// ==========================================

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentEditingTaskId = null;
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.render();
        this.updateProgress();
    }

    setupEventListeners() {
        // Quick add task
        const quickAddBtn = document.getElementById('quick-add-btn');
        const quickAddInput = document.getElementById('quick-add-input');

        quickAddBtn.addEventListener('click', () => this.addTask());
        quickAddInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Focus mode toggle
        const focusModeToggle = document.getElementById('focus-mode-toggle');
        focusModeToggle.addEventListener('click', () => this.toggleFocusMode());

        // Modal event listeners
        this.setupModalListeners();
    }

    setupModalListeners() {
        // Task detail modal
        const taskModal = document.getElementById('task-detail-modal');
        const taskModalClose = taskModal.querySelector('.modal-close');
        const saveTaskBtn = document.getElementById('save-task-btn');
        const deleteTaskBtn = document.getElementById('delete-task-btn');

        taskModalClose.addEventListener('click', () => this.closeModal('task-detail-modal'));
        saveTaskBtn.addEventListener('click', () => this.saveTaskEdit());
        deleteTaskBtn.addEventListener('click', () => this.deleteTask());

        // Close modal on backdrop click
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) {
                this.closeModal('task-detail-modal');
            }
        });
    }

    addTask() {
        const input = document.getElementById('quick-add-input');
        const title = input.value.trim();

        if (!title) return;

        const task = {
            id: Date.now().toString(),
            title: title,
            completed: false,
            priority: 'medium',
            createdAt: new Date().toISOString(),
            notes: ''
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.render();
        this.updateProgress();

        // Clear input
        input.value = '';
        input.focus();

        // Show achievement for first task
        if (this.tasks.length === 1) {
            window.gamificationManager.showAchievement('First Step!', 'You added your first task');
        }

        // Add points
        window.gamificationManager.addPoints(10);
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;

        if (task.completed) {
            task.completedAt = new Date().toISOString();
            window.gamificationManager.addPoints(20);
            window.gamificationManager.incrementStreak();

            // Check for achievements
            const completedCount = this.tasks.filter(t => t.completed).length;
            if (completedCount === 5) {
                window.gamificationManager.showAchievement('Getting Started!', 'Completed 5 tasks');
            } else if (completedCount === 10) {
                window.gamificationManager.showAchievement('On a Roll!', 'Completed 10 tasks');
            } else if (completedCount === 25) {
                window.gamificationManager.showAchievement('Task Master!', 'Completed 25 tasks');
            }
        }

        this.saveTasks();
        this.render();
        this.updateProgress();
    }

    openTaskDetail(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentEditingTaskId = taskId;

        // Populate modal fields
        document.getElementById('task-title-edit').value = task.title;
        document.getElementById('task-priority-edit').value = task.priority;
        document.getElementById('task-notes-edit').value = task.notes || '';

        // Open modal
        this.openModal('task-detail-modal');
    }

    saveTaskEdit() {
        const task = this.tasks.find(t => t.id === this.currentEditingTaskId);
        if (!task) return;

        task.title = document.getElementById('task-title-edit').value.trim();
        task.priority = document.getElementById('task-priority-edit').value;
        task.notes = document.getElementById('task-notes-edit').value.trim();

        this.saveTasks();
        this.render();
        this.closeModal('task-detail-modal');
    }

    deleteTask() {
        if (!confirm('Are you sure you want to delete this task?')) return;

        this.tasks = this.tasks.filter(t => t.id !== this.currentEditingTaskId);
        this.saveTasks();
        this.render();
        this.updateProgress();
        this.closeModal('task-detail-modal');
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.filter === filter) {
                tab.classList.add('active');
            }
        });

        this.render();
    }

    getFilteredTasks() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (this.currentFilter) {
            case 'today':
                return this.tasks.filter(task => {
                    const taskDate = new Date(task.createdAt);
                    return taskDate >= todayStart;
                });
            case 'active':
                return this.tasks.filter(task => !task.completed);
            case 'completed':
                return this.tasks.filter(task => task.completed);
            default:
                return this.tasks;
        }
    }

    render() {
        const container = document.getElementById('tasks-container');
        const emptyState = document.getElementById('empty-state');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        container.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''} priority-${task.priority}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"
                     onclick="taskManager.toggleTask('${task.id}')">
                </div>
                <div class="task-content" onclick="taskManager.openTaskDetail('${task.id}')">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span class="priority-badge priority-${task.priority}">
                            ${task.priority}
                        </span>
                        ${task.notes ? '<span>📝 Has notes</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateProgress() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.createdAt);
            return taskDate >= todayStart;
        });

        const completedTasks = todayTasks.filter(task => task.completed);
        const totalTasks = todayTasks.length;
        const percentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        document.getElementById('completed-tasks-count').textContent = completedTasks.length;
        document.getElementById('total-tasks-count').textContent = totalTasks;
        document.getElementById('progress-bar-fill').style.width = `${percentage}%`;

        // Show/hide progress section
        const progressSection = document.getElementById('progress-section');
        if (totalTasks > 0) {
            progressSection.style.display = 'block';
        } else {
            progressSection.style.display = 'none';
        }

        // Achievement for completing all today's tasks
        if (totalTasks > 0 && completedTasks.length === totalTasks) {
            window.gamificationManager.showAchievement('Perfect Day!', 'Completed all tasks for today');
        }
    }

    toggleFocusMode() {
        document.body.classList.toggle('focus-mode');
        const isEnabled = document.body.classList.contains('focus-mode');

        if (isEnabled) {
            window.gamificationManager.showAchievement('Focus Mode', 'Distractions minimized. Stay focused!');
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        this.currentEditingTaskId = null;
    }

    loadTasks() {
        this.tasks = window.storageManager.getTasks();
    }

    saveTasks() {
        window.storageManager.saveTasks(this.tasks);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
let taskManager;

document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();

    // Make taskManager globally accessible
    window.taskManager = taskManager;
});
