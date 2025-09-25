// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
