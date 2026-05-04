// ============================================================
// FIREBASE CONFIG — Fill in your values after creating your
// Firebase project at https://console.firebase.google.com
// ============================================================
import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBPPnmDA3u6-45VVIFH1lCaOrvxK_tgUeo",
  authDomain: "dealer-trainer.firebaseapp.com",
  projectId: "dealer-trainer",
  storageBucket: "dealer-trainer.firebasestorage.app",
  messagingSenderId: "451951941984",
  appId: "1:451951941984:web:bd9f194918a28f832f6605",
}

const app = initializeApp(firebaseConfig)

// Persistent local cache for offline PWA support (Firebase v10+)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

export default app
