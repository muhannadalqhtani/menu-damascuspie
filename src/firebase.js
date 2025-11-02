// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyATd295AjGyoSRsqWT-xJMW3SAqvSfwUFs",
  authDomain: "damascuspie94.firebaseapp.com",
  projectId: "damascuspie94",
  storageBucket: "damascuspie94.firebasestorage.app",
  messagingSenderId: "421243809313",
  appId: "1:421243809313:web:670fefdadecd91dab47d60",
  measurementId: "G-Z08JWQ2364"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);