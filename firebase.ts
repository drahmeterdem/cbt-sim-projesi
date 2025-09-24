// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// TODO: Add your own Firebase configuration from your Firebase project settings
// https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
  apiKey: "AIzaSyBMOhPCumWJncjfch4GhdPEnwO03c_8o5E",
  authDomain: "cbt-sim-projesi.firebaseapp.com",
  projectId: "cbt-sim-projesi",
  storageBucket: "cbt-sim-projesi.firebasestorage.app",
  messagingSenderId: "869396190469",
  appId: "1:869396190469:web:c6db6adefbd2c17e86d36c",
  measurementId: "G-9S9PYC74LR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
