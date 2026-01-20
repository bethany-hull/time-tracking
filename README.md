# Time Tracker

A React Native app that helps you track how you spend your time using voice recordings and AI-powered analysis.

## Features

- 🎙️ **Voice Recording** - Record short audio clips describing what you've been doing
- 🤖 **AI Processing** - Uses Gemini AI to transcribe and categorize your activities
- 📊 **Statistics** - View charts and breakdowns of how you spend your time
- 🔔 **Reminders** - Periodic push notifications to remind you to log your time
- 📱 **Offline Storage** - All data stored locally on your device for privacy

## Tech Stack

- React Native with Expo
- TypeScript
- SQLite for local database
- Expo Notifications for reminders
- Expo AV for audio recording
- Google Gemini API for AI processing

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)
- A Google Gemini API key

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### Configuration

1. Open the app and go to **Settings**
2. Enter your **Gemini API key**
3. Configure notification interval (default: 30 minutes)
4. Test the connection

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy and paste it into the app settings

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── RecordButton.tsx
│   ├── EntryCard.tsx
│   └── CategoryChart.tsx
├── database/           # SQLite database layer
│   ├── index.ts        # Database initialization
│   ├── schema.ts       # Table definitions
│   ├── entries.ts      # Time entry CRUD operations
│   ├── categories.ts   # Category management
│   └── settings.ts     # App settings
├── hooks/              # Custom React hooks
│   ├── useDatabase.ts  # Database state hooks
│   └── useRecording.ts # Recording state management
├── navigation/         # React Navigation setup
├── screens/            # App screens
│   ├── HomeScreen.tsx  # Main recording interface
│   ├── StatsScreen.tsx # Statistics and charts
│   └── SettingsScreen.tsx
├── services/           # External service integrations
│   ├── notifications.ts # Push notification handling
│   ├── audio.ts        # Audio recording
│   └── gemini.ts       # Gemini API integration
└── utils/              # Helper functions
    └── helpers.ts
```

## How It Works

1. **Record**: Tap the record button and describe what you've been doing
2. **Process**: The audio is sent to Gemini AI which:
   - Transcribes your speech
   - Generates a summary
   - Categorizes the activity
   - Extracts relevant tags
3. **Store**: Everything is saved locally in SQLite
4. **Analyze**: View your time breakdown by category in the Stats tab

## Privacy

- All data is stored locally on your device
- Audio recordings are only sent to Gemini API for processing
- No personal data is collected or stored on any server
- You can delete all your data at any time

## Future Improvements

- [ ] Cloud backup/sync
- [ ] Export data to CSV
- [ ] Custom categories
- [ ] Detailed entry editing
- [ ] Weekly/monthly reports
- [ ] Widget for quick recording
- [ ] Apple Watch / Wear OS support

## License

MIT
