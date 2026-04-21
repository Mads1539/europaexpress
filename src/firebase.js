import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDFWsF1feRKK13KLWSzSTmftu5v8VXSrRk",
  authDomain: "europa-express-9eedf.firebaseapp.com",
  projectId: "europa-express-9eedf",
  storageBucket: "europa-express-9eedf.firebasestorage.app",
  messagingSenderId: "349243075315",
  appId: "1:349243075315:web:3c0a6155b4875ffcfd2586",
  measurementId: "G-Y44TZV7BVQ",
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const appId = "europa-express-9eedf";
