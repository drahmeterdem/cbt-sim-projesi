// --- Firebase Initialization ---
// FIX: Updated to Firebase v9 compat syntax to resolve build error.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';


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
