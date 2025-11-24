# Night Shift Cats 🐱🌙

A cozy 2D multiplayer browser game where players (Boy Cat and Girl Cat) explore different rooms in a night office environment.

## Features

### 🎮 Core Gameplay
- **Real-time Multiplayer**: See other players move instantly with 50ms sync rate
- **Multiple Rooms**: Explore the Office, Study Room, and Blueberry Restaurant
- **Smooth Movement**: WASD or Arrow Keys for keyboard, touch controls for mobile
- **Room Transitions**: Move between rooms through doors

### 🏢 Rooms & Activities

#### Office (Main Hub)
- Central room connecting to other areas
- Navigate to Study Room (left door) or Hangout Room (right door)

#### Study Room 📚
- **4 Study Desks**: Each with a computer and notes
- **Analog Clock**: Real-time wall clock
- **Personal Timer**: Approach any desk to start a focus timer (25/50 min options)
- Perfect for productivity sessions with friends!

#### Blueberry Restaurant 🫐
- **Themed Hangout**: Cozy blueberry-themed café
- **Shop Counter**: With "Blueberry" sign
- **3 Dining Tables**: Round tables with chairs and plates
- **Real-time Chat**: Talk with other players in the room

### 📱 Mobile Support
- **Touch Controls**: Virtual D-pad appears on mobile devices
- **Responsive Design**: Adapts to screen size automatically
- Play on phone, tablet, or desktop!

### 🎵 Music Player
- **Lofi Radio**: Background music for chill vibes
- **Play/Pause Control**: Toggle button in top-left corner
- Music continues as you move between rooms

### 🌐 Multiplayer Features
- **Ghost Prevention**: Inactive players auto-removed after 10 seconds
- **Late Join Support**: Join anytime and see existing players
- **Cross-Platform**: PC and mobile players can play together
- **Real-time Sync**: 20 updates per second when moving

## Setup Instructions

### 1. Create a Firebase Project
Since this is a multiplayer game, it needs a backend to sync positions. We use Firebase Realtime Database (free).

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and give it a name (e.g., "night-shift-cats").
3. Disable Google Analytics (not needed).
4. Create the project.

### 2. Set up Realtime Database
1. In your new project, go to **Build** -> **Realtime Database** in the left menu.
2. Click **Create Database**.
3. Choose a location (e.g., United States) and click **Next**.
4. Choose **Start in Test Mode** (this allows anyone to read/write for 30 days, perfect for a quick demo).
5. Click **Enable**.

### 3. Get Configuration
1. Click the **Project Overview** (gear icon) -> **Project settings**.
2. Scroll down to **Your apps**.
3. Click the **Web** icon (</\>).
4. Register the app (nickname: "Night Shift Cats").
5. You will see a `firebaseConfig` object. **Copy it.**

### 4. Configure the Game
1. Open `firebase-config.js` in this folder.
2. Replace the placeholder code with the config you just copied.

It should look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## How to Run

### Locally
You can just open `index.html` in your browser!
However, for better performance and to avoid some browser restrictions, it's better to run a local server.

If you have Python installed:
```bash
python -m http.server
```
Then open `http://localhost:8000`.

### Deploying (to play with a friend)
To play with a friend, you need to put the game on the internet.

**Option A: GitHub Pages**
1. Upload these files to a GitHub repository.
2. Go to Settings -> Pages.
3. Select the `main` branch and save.
4. Send the link to your friend!

**Option B: Netlify / Vercel**
1. Drag and drop this folder onto [Netlify Drop](https://app.netlify.com/drop).
2. It will give you a link instantly.

## How to Play

### Getting Started
1. Open the game link
2. Enter a nickname
3. Choose your character (Boy Cat or Girl Cat)

### Controls
- **Desktop**: WASD or Arrow Keys to move
- **Mobile**: Use the virtual D-pad in bottom-left corner
- **Music**: Click "🎵 Play Lofi" button to toggle background music

### Exploring Rooms
- **Move to doors** to transition between rooms
- **Office**: Central hub with doors to Study and Hangout
- **Study Room**: Approach desks to use the personal timer
- **Blueberry Restaurant**: Use the chat to talk with other players

### Tips
- Timer sessions are personal - each player can run their own
- Chat messages are only visible in the Hangout Room
- Other players appear as cats with their nicknames
- Mobile controls work on both touch and mouse (for testing)

## Troubleshooting

- **"Firebase config is missing"**: Make sure you pasted your config into `firebase-config.js`
- **Game doesn't load**: Check the browser console (F12) for errors
- **Can't see other players**: Ensure you're in the same room and both connected to Firebase
- **Music won't play**: Some browsers block autoplay - click the music button manually

## Technical Details

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Firebase Realtime Database
- **Network**: 50ms update rate when moving, 100ms when idle
- **Mobile**: Touch event support with virtual controls
- **Audio**: HTML5 Audio with royalty-free lofi track

Enjoy your night shift! 🌙✨

