# Home Finder

Web prototype of Home Finder, Phase 1 (MVP) from the concept doc: an app that knows where every object in the house is.

- Inventory: room → furniture → compartment → box → item
- Tag scanning: scan a location, then an item, and the item moves there. NFC is simulated by typing the tag ID.
- Search that handles diacritics, synonyms and one typo per word ("maișina de găurit" finds "Bormașină"), plus reverse questions ("Ce am în cutia de sub pat?")
- Move history and data age ("acum 3 luni")
- Simple 3D view of the house that highlights the furniture holding the item
- Jarvis: a 3D head with contour lines that answers by voice (Romanian TTS) and follows you via the webcam or the mouse

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # search tests
npm run build
```

The webcam only works on `localhost` or HTTPS, after you allow access in the browser.

## Structure

```
src/
  App.jsx                 state and actions (scan, move, add, delete)
  lib/inventory.js        data model, sample data, localStorage
  lib/search.js           search, synonyms, Jarvis' answer
  lib/avatar.js           Jarvis' head (Three.js + contour-line shader)
  lib/house.js            3D view of the house
  lib/tracking.js         webcam tracking (motion)
  hooks/useJarvis.js      Jarvis' line, state and voice
  components/             Jarvis, Results, ScanPanel, Inventory, House3D
```

## Known limits

- Data lives only in this browser's localStorage. Next step: Supabase, as in the doc.
- The camera tracks movement, not your face. For real face tracking, use MediaPipe Face Landmarker.
- No voice input yet (speech-to-text).
- Rooms, furniture and compartments can't be deleted from the UI.

## Jarvis in Unity

The avatar also exists as a Unity project in `unity/JarvisAvatar`: a procedural head with a contour-line shader. The web app loads its WebGL build from `public/unity`. Without a build, it uses the three.js version.

1. Unity Hub → **Add project from disk** → `unity/JarvisAvatar`. Use Unity 6 or 2022.3 LTS, with the **WebGL Build Support** module installed.
2. In Unity, open the **Jarvis → Build WebGL for the web app** menu. It creates the scene and builds into `public/unity`.
3. `npm run dev`. The avatar is now rendered by Unity.

The page drives the avatar with `SendMessage("Jarvis", "SetMode", "idle|thinking|speaking")` and `SendMessage("Jarvis", "SetLook", "x,y" | "off")`. The same API works from React Native with Unity as a Library.
