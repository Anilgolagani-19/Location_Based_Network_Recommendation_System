import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your app's Firebase project configuration
// New Firebase configuration for Telecom project
const firebaseConfig = {
  apiKey: "AIzaSyCLSyjO2uXaEabBVFeZHoDv97v-jKtqygo",
  authDomain: "telecom-b8c7f.firebaseapp.com",
  projectId: "telecom-b8c7f",
  storageBucket: "telecom-b8c7f.firebasestorage.app",
  messagingSenderId: "325330030606",
  appId: "1:325330030606:web:e14c538b48484749c6ec5f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
