# GPA Calculator

A small browser app for estimating GPA on a 6 to 10 scale.

## Run Locally

From WSL:

```bash
cd /home/asan/projects/gpa
python3 -m http.server 8000
```

Open this on the computer:

```text
http://localhost:8000
```

## Open On Your Phone

Run the server from WSL so other devices can try to reach it:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Then find your Windows computer's local IP address and open this from your phone:

```text
http://YOUR_LOCAL_IP:8000
```

Your phone and computer must be on the same Wi-Fi network. Windows Firewall may ask for permission. If this does not work in WSL, the reliable options are to use VS Code's port forwarding feature or deploy the static site online.

## Share With Colleagues

This is a static app, so you can host the folder on GitHub Pages, Netlify, Vercel, Firebase Hosting, or any simple static web host.

## Google Sign-In Sync

The app is ready for Firebase Authentication and Firestore. Until Firebase is configured, it keeps using browser-only storage.

1. Create a Firebase project at:

```text
https://console.firebase.google.com
```

2. Add a Web app in Firebase Project settings.

3. Copy the Firebase config and paste it into `firebaseConfig` in `script.js`:

```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

4. In Firebase Authentication, enable the Google sign-in provider.

5. In Firestore Database, create a database and use these security rules:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/gpa/courses {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Run the app from a local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

After signing in, courses sync to the user's Google account and appear on their other devices after signing in with the same account.
