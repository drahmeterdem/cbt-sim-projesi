// --- Firebase Initialization ---
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const app = initializeApp(firebaseConfig);

// Diğer dosyalarda kullanmak için Auth ve Firestore servislerini al
const auth = getAuth(app);
const db = getFirestore(app);

// Servisleri dışa aktar
export { auth, db };
