// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOKwYccC4KIoGGn1jHNGiemGXE9HZdii4",
  authDomain: "planner-1f69b.firebaseapp.com",
  projectId: "planner-1f69b",
  storageBucket: "planner-1f69b.appspot.com",
  messagingSenderId: "614015386244",
  appId: "1:614015386244:web:8ce963966a72646b0778d1",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app)