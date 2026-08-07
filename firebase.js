/* Shared Firebase bootstrap — App + Auth + Firestore via CDN modules.
   Include on any page that needs Firebase:
     <script src="firebase.js"></script>
   Exposes window.FB = {
     ready        → Promise<{ auth, authMod, db, fs, app }>  (rejects if SDK fails to load)
     auth / authMod / db / fs   → getters (null until ready)
     currentUser() → signed-in user or null
     onUser(cb)    → cb(user | null) on every auth change (safe when Firebase failed)
   }
   Initializes the app exactly once — pages must NOT call initializeApp themselves. */
(function () {
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAET8iPctXTXcPhTu4CtMLxZAZ-AXBZg2o",
    authDomain: "vannilatravels-7e104.firebaseapp.com",
    projectId: "vannilatravels-7e104",
    storageBucket: "vannilatravels-7e104.firebasestorage.app",
    messagingSenderId: "455786245355",
    appId: "1:455786245355:web:122f64340e39f6e94762ae",
  };
  const SDK = "https://www.gstatic.com/firebasejs/12.17.1";

  let auth = null, authMod = null, db = null, fsMod = null, app = null, fbError = null;

  const ready = (async () => {
    try {
      const appMod = await import(SDK + "/firebase-app.js");
      authMod = await import(SDK + "/firebase-auth.js");
      fsMod = await import(SDK + "/firebase-firestore.js");
      app = appMod.initializeApp(FIREBASE_CONFIG);
      auth = authMod.getAuth(app);
      db = fsMod.getFirestore(app);
      window.__fbReady = true;
      return { auth, authMod, db, fs: fsMod, app };
    } catch (e) {
      fbError = e;
      window.__fbError = String((e && e.message) || e);
      console.error("Firebase failed to load:", e);
      throw e;
    }
  })();

  window.FB = {
    config: FIREBASE_CONFIG,
    SDK,
    ready,
    get auth() { return auth; },
    get authMod() { return authMod; },
    get db() { return db; },
    get fs() { return fsMod; },
    get error() { return fbError; },
    currentUser() {
      try { return auth && auth.currentUser ? auth.currentUser : null; } catch (e) { return null; }
    },
    onUser(cb) {
      ready
        .then(({ auth: a, authMod: m }) => m.onAuthStateChanged(a, cb))
        .catch(() => cb(null));
    },
  };
})();
