# Concordia — Source

```
Concordia-source/
├── index.html    ← markup (947 lines) — opens the app
├── styles.css    ← all styles (1,745 lines)
└── app.js        ← all logic (1,651 lines): audio engine, generative composer,
                    AI integration, auth, history, scheduler, UI navigation
```

## Run it

Open `index.html` in any browser. That's it.

> Note: when opening directly from your file system, some browsers block
> Google Fonts and other cross-origin requests. The app still runs; fonts
> will just fall back to system fonts. To get the full styling locally,
> serve the folder with any tiny static server, e.g.:
> ```
> npx serve .          # or:  python3 -m http.server
> ```

## How app.js is organised (in this order, top-to-bottom)

1. **CLAUDE_CONFIG**  – API proxy URL for AI features (deployment)
2. **AUTH_CONFIG**    – Google OAuth client ID (deployment)
3. **Storage helpers** – safe localStorage wrapper
4. **Auth** – Google Identity Services sign-in, user chip, sign-out
5. **History** – per-user session history, end-session check-in
6. **Home page** – greeting, journey stats, quick-start
7. **Navigation** – `go()` between flow screens
8. **Conditions** – mental-health / neurodivergent profiles
9. **CFG / KEY_ROOTS / NAME_POOLS / AUTO_KEYS** – session config & key library
10. **Resolve key, build scales / chord roots, applyTrackMeta**
11. **Custom instrument** – AI-built instrument via JSON params
12. **PROGRESSIONS** – per-session chord progressions
13. **Generative melody engine** – rhythm banks, ornaments, contour walker, varyCell
14. **buildSection + cellToBar + cellToNotes**
15. **composeWithAI + sanitizeComposition** – Claude-composed melodies
16. **Flow** – `startAnalysis`, `setupPlayer`
17. **Audio engine** – `getInstrumentPlayer` (12 instruments + custom), reverb, master chain
18. **`startMusic`** – the live look-ahead scheduler, `playChordBar`, `playMelodyNote`, `playCounterNote`
19. **`stopMusic`, MediaSession, Wake Lock, visibility resume**
20. **UI controls** – volume, tempo, key picker, reverb, warmth, nature, instrument switch
21. **`genInsight`, `doAsk`, `streamAI`** – AI panels in the player
22. **Trend chart** (wellbeing)
23. **Boot** – `initAuth()` at the very bottom

## Deploy

For real Google sign-in and AI composition on a live site, see the
separate `concordia-site.zip` (Supabase Edge Function + setup steps).
