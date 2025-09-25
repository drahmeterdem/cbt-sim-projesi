// --- Firebase Initialization ---
// FIX: Updated to Firebase v8 syntax to resolve module import error. The original code was using v9 syntax, which is incompatible with an older Firebase dependency version.
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

// TODO: Aşağıdaki yapılandırmayı Firebase projenizdeki ayarlarla değiştirin.
// Firebase konsolunda, Proje Ayarları > Genel sekmesinde bulabilirsiniz.
const firebaseConfig = {
  apiKey: "AIzaSyYOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "1:your-sender-id:web:your-app-id"
};

// Firebase'i başlat
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Diğer dosyalarda kullanmak için Auth ve Firestore servislerini al
const auth = firebase.auth();
const db = firebase.firestore();
const Timestamp = firebase.firestore.Timestamp;

// Servisleri dışa aktar
export { auth, db, Timestamp };
