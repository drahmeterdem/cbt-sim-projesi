// --- Firebase Initialization ---
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMOhPCumWJncjfch4GhdPEnwO03c_8o5E",
  authDomain: "cbt-sim-projesi.firebaseapp.com",
  projectId: "cbt-sim-projesi",
  storageBucket: "cbt-sim-projesi.firebasestorage.app",
  messagingSenderId: "869396190469",
  appId: "1:869396190469:web:c6db6adefbd2c17e86d36c",
  measurementId: "G-9S9PYC74LR"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Diğer dosyalarda kullanmak için Auth ve Firestore servislerini al
const auth = getAuth(app);
const db = getFirestore(app);

// Servisleri dışa aktar
export { auth, db };
