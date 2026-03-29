// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDY8zgTZIjUX0Rj51Lt_obN6neldKTwIS4",
  authDomain: "easyrecall-21386.firebaseapp.com",
  projectId: "easyrecall-21386",
  storageBucket: "easyrecall-21386.firebasestorage.app",
  messagingSenderId: "891556655202",
  appId: "1:891556655202:web:abc371d6af8b3d35f2a13b",
  measurementId: "G-6FSN6QD9FS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
// Ensure user stays logged in until explicit logout
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;