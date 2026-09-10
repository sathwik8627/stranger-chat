# Stranger Chat

A starter Omegle-style anonymous random video/text chat app using React, Node.js, Socket.IO and browser WebRTC.

## Requirements
- Node.js 18+
- Modern browser with camera/microphone support

## Run locally

From the project root:

```bash
npm install
npm run install:all
npm run dev
```

Open the Vite URL shown in the terminal (usually http://localhost:5173) in two browser windows/tabs to test matchmaking.

## Production

Set `VITE_SIGNAL_URL` in the client build to the public HTTPS URL of the Socket.IO server.

For reliable WebRTC across restrictive networks, configure a TURN server and add its credentials to `ICE` in `client/src/main.jsx`. Production video requires HTTPS (except localhost).

## Included
- Random matchmaking queue
- WebRTC audio/video
- Text chat
- Next stranger
- Mute/camera controls
- Report/disconnect flow
- Responsive UI
- Basic rate-limiting point noted for production hardening

## Production hardening
Before opening this to the public, add authentication/anonymous session controls, rate limiting, abuse prevention, moderation, persistent report handling, secure CORS/origins, HTTPS, TURN, logging/monitoring, privacy/terms/age controls, and a real report-review workflow. Do not store video/audio by default.
