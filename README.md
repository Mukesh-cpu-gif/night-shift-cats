# Night Shift Cats 🐱🌙

A cozy 2D multiplayer browser game where two players (Boy Cat and Girl Cat) hang out in a night office.

## Features
- **Real-time Multiplayer**: See your friend move instantly.
- **Cute Visuals**: Night office theme with glowing screens and stars.
- **Simple Controls**: WASD or Arrow Keys.
- **No Installation**: Runs in the browser.

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
3. Click the **Web** icon (</>).
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
1. Open the game link.
2. Enter a nickname.
3. Choose your character (Boy Cat or Girl Cat).
4. Use **WASD** or **Arrow Keys** to move.
5. Watch your friend move in real-time!
