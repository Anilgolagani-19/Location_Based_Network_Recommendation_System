import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your app's Firebase project configuration
// Successfully retrieved from user-provided firebase-con.js
const firebaseConfig = {
    apiKey: "AIzaSyAlMVg5rg-YRNKn7znbvVxnZQ7L64sx9U8",
    authDomain: "tele-signal-7ddae.firebaseapp.com",
    projectId: "tele-signal-7ddae",
    storageBucket: "tele-signal-7ddae.firebasestorage.app",
    messagingSenderId: "915231401181",
    appId: "1:915231401181:web:6dcf3ef7c78cbf0481a734",
    measurementId: "G-6R0L0FCVVG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
