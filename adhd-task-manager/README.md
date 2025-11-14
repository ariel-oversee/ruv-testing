# Focus Task Manager

A Progressive Web App (PWA) designed specifically for people with ADHD, featuring task management, Pomodoro timer, and gamification elements.

## Features

### 🎯 ADHD-Friendly Design
- **Minimal Distractions**: Clean, focused interface with optional focus mode
- **Color-Coded Priorities**: Visual task breakdown with clear priority indicators
- **Quick Task Capture**: Fast input for capturing fleeting thoughts
- **Visual Progress**: Clear visualization of daily progress

### ⏱️ Pomodoro Timer
- **Customizable Intervals**: Adjust focus time, short breaks, and long breaks
- **Visual Timer**: Large, easy-to-read circular progress indicator
- **Gentle Notifications**: Non-intrusive reminders when sessions complete
- **Auto-Start Options**: Configurable auto-start for breaks

### 🎮 Gamification
- **Points System**: Earn points for completing tasks and focus sessions
- **Streak Tracking**: Build and maintain daily completion streaks
- **Achievements**: Unlock achievements for reaching milestones
- **Visual Rewards**: Animated feedback for accomplishments

### 📱 Progressive Web App
- **Offline Support**: Works without internet connection
- **Install to Home Screen**: Add as a standalone app
- **Mobile-First Design**: Optimized for phones and tablets
- **Cross-Platform**: Works on any device with a modern browser

### 🔒 Privacy-Focused
- **Local Storage Only**: All data stays on your device
- **No Tracking**: No analytics or third-party services
- **Export/Import**: Backup and restore your data anytime

## Getting Started

### Installation

1. **Open the app** in a modern web browser
2. **Install to device**:
   - **Desktop**: Click the install button in the browser's address bar
   - **iOS**: Tap the Share button, then "Add to Home Screen"
   - **Android**: Tap the menu, then "Install App" or "Add to Home Screen"

### Usage

#### Quick Add Tasks
- Type your task in the input field at the top
- Press Enter or click "Add" to create a task
- Tasks appear instantly in your list

#### Managing Tasks
- **Complete**: Click the checkbox to mark a task as done
- **Edit**: Click on a task to open details and edit
- **Priority**: Set priority levels (Low, Medium, High, Urgent)
- **Notes**: Add additional notes to tasks
- **Delete**: Remove tasks from the detail view

#### Using the Pomodoro Timer
1. Click "Start" to begin a focus session (default: 25 minutes)
2. Work without distractions until the timer completes
3. Take a break when prompted
4. Repeat the cycle
5. Customize intervals in timer settings (⚙️ icon)

#### Focus Mode
- Click the 🎯 icon in the header to enable Focus Mode
- Everything except the timer is hidden
- Perfect for deep work sessions
- Click again to exit

#### Tracking Progress
- View your daily progress bar below the task list
- Monitor your streak in the header (🔥 icon)
- Track your points (⭐ icon)
- Earn achievements for milestones

## Keyboard Shortcuts

- `Enter` in quick add input: Add task
- `Escape`: Close modals

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Technical Details

### Built With
- Vanilla JavaScript (no frameworks)
- CSS3 with custom properties
- Service Worker API
- Web Storage API
- Notifications API
- Web App Manifest

### File Structure
```
adhd-task-manager/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support
├── css/
│   └── styles.css         # All styles
├── js/
│   ├── app.js             # Main app logic
│   ├── storage.js         # Local storage management
│   ├── pomodoro.js        # Timer functionality
│   ├── gamification.js    # Points and achievements
│   └── notifications.js   # Notification system
└── icons/
    ├── icon-192.svg       # App icon (192x192)
    └── icon-512.svg       # App icon (512x512)
```

## Privacy & Data

All data is stored locally on your device using the browser's Local Storage API. No information is sent to any server. To backup your data:

1. Open browser developer tools (F12)
2. Go to Application > Local Storage
3. Find `adhd-task-manager` key
4. Copy the value to save elsewhere

Or use the export feature (coming soon).

## Tips for ADHD Users

1. **Start Small**: Add just 3-5 tasks for the day
2. **Use Priorities**: Mark urgent items to stay focused on what matters
3. **Break Tasks Down**: Large tasks can be broken into smaller subtasks
4. **Celebrate Wins**: Enjoy the points and achievements - you earned them!
5. **Consistent Timing**: Try to complete tasks at the same time each day
6. **Focus Mode**: Use when you need maximum concentration
7. **Pomodoro Method**: 25 minutes is just a suggestion - adjust to your needs
8. **Streaks**: Don't stress if you break a streak - just start fresh

## Roadmap

Future enhancements being considered:
- [ ] Subtasks/checklist support
- [ ] Tags and categories
- [ ] Calendar integration
- [ ] Dark mode
- [ ] Sound options for timer
- [ ] Cloud sync (optional)
- [ ] Team/shared tasks (optional)
- [ ] Eisenhower Matrix view
- [ ] Weekly/monthly statistics
- [ ] Custom themes

## Contributing

This is a standalone PWA. To modify:
1. Edit the files locally
2. Test in a modern browser
3. The service worker will update automatically

## License

MIT License - feel free to use and modify for your needs

## Support

If you find this app helpful, consider:
- Sharing it with others who might benefit
- Providing feedback for improvements
- Contributing enhancements

## Acknowledgments

Designed with input from the ADHD community, inspired by:
- Pomodoro Technique by Francesco Cirillo
- Gamification principles for habit formation
- ADHD-friendly UX patterns

---

**Made with 💜 for the ADHD community**
