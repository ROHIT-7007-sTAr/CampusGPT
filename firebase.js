// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCgm6YGUK_W23omEdlB2v-1LBJmgU9VYBw",
  authDomain: "cep2025-f30b4.firebaseapp.com",
  projectId: "cep2025-f30b4",
  storageBucket: "cep2025-f30b4.firebasestorage.app",
  messagingSenderId: "249495059083",
  appId: "1:249495059083:web:4f727bb469879e6c44f28e",
  measurementId: "G-5SE4SJCXJ2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);