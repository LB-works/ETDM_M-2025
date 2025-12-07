import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEmigK4MkcFkePjDuiKFWXfjGG-wfm7u0",
  authDomain: "energy-meter---bd.firebaseapp.com",
  databaseURL: "https://energy-meter---bd-default-rtdb.firebaseio.com",
  projectId: "energy-meter---bd",
  storageBucket: "energy-meter---bd.firebasestorage.app",
  messagingSenderId: "1108819201",
  appId: "1:1108819201:web:39d7a6b44189e6243e6f00"
};
// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

