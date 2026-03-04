import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your app's Firebase project configuration
// Successfully retrieved from user-provided firebase-con.js
const firebaseConfig = {
  apiKey: "AIzaSyBZ6P6C7bW_POIC3DI0S8jYtWl0Y9hfQ5c",
  authDomain: "telecom-197a6.firebaseapp.com",
  projectId: "telecom-197a6",
  storageBucket: "telecom-197a6.firebasestorage.app",
  messagingSenderId: "138754050234",
  appId: "1:138754050234:web:31e2f44cd91ce76ad7da83"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
