import { auth, db } from './firebase-config.js';

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithRedirect,
    signOut,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { analytics } from './analytics.js';

/* =========================
   INSTANT PROFILE INIT
========================= */
(function initializeProfile() {
    const loggedInProfile = document.getElementById('loggedInProfile');
    const loggedOutButtons = document.getElementById('loggedOutButtons');
    const navProfileCircle = document.getElementById('navProfileCircle');

    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    const storedName = localStorage.getItem('userName') || 'U';

    if (isLoggedIn && loggedInProfile && loggedOutButtons && navProfileCircle) {
        loggedInProfile.style.display = 'flex';
        loggedOutButtons.style.display = 'none';
        navProfileCircle.textContent = storedName.charAt(0).toUpperCase();
    }
})();

/* =========================
   DOM
========================= */
const elements = {
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    googleSignupBtn: document.getElementById('googleSignupBtn'),
    errorBox: null
};

/* =========================
   ERROR BOX
========================= */
function reportError(message, type = 'error') {
    console.error(`[Auth] ${type.toUpperCase()}:`, message);

    if (!elements.errorBox) {
        elements.errorBox = document.createElement('div');
        elements.errorBox.className = 'auth-status-box';
        elements.errorBox.style.cssText = `
            padding: 12px; margin-bottom: 20px; border-radius: 8px;
            font-weight: 500; text-align: center;
        `;
        const form = document.querySelector('form');
        if (form) form.prepend(elements.errorBox);
    }

    elements.errorBox.style.background = type === 'success' ? '#d1fae5' : '#fee2e2';
    elements.errorBox.style.color = type === 'success' ? '#065f46' : '#991b1b';
    elements.errorBox.textContent = message;
}

/* =========================
   ⭐ UNIVERSAL REDIRECT
========================= */
window.handleAuthRedirect = function () {

    // If user just signed up from the signup page, send them to their dashboard.
    if (window.location.pathname.toLowerCase().includes('signup')) {
        window.location.href = "/dashboards/user-dashboard.html";
        return;
    }

    // If we have a known role/name in localStorage, route accordingly
    const name = (localStorage.getItem('userName') || '').toLowerCase();

    if (name === 'admin') {
        window.location.href = "/dashboards/admin-dashboard.html";
        return;
    }

    if (name === 'operator') {
        window.location.href = "/dashboards/user-dashboard.html";
        return;
    }

    // Default fallback
    window.location.href = "/index.html";
}

/* =========================
   SIGNUP
========================= */
if (elements.signupForm) {
    elements.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[SIGNUP] submit event');

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = elements.signupForm.querySelector('button[type="submit"]');

        // disable button immediately
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('[SIGNUP] created user', user.uid);

            await updateProfile(user, { displayName: name });
            sendEmailVerification(user).catch(() => {});

            await setDoc(doc(db, "users", user.uid), {
                name,
                email,
                createdAt: serverTimestamp(),
                uid: user.uid
            }, { merge: true });

            // update local state
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userName', name);
            localStorage.setItem('userEmail', email);

            analytics.incrementTotalUsers().catch(() => {});

            reportError("✅ Account created successfully!", 'success');

            // final button state before redirect
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Redirecting...';
            }

            
            console.log('[SIGNUP] scheduling final redirect');
            setTimeout(() => {
                // always send new signups straight to dashboard
                window.location.href = '/dashboards/user-dashboard.html';
            }, 500);

        } catch (err) {
            console.error('[SIGNUP] error', err);
            reportError(parseAuthError(err.code));
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        }
    });
}

/* =========================
   LOGIN
========================= */
if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = elements.loginForm.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            // Hardcoded Admin
            if (email === 'manikanta25632563@gmail.com' && password === 'Admin@123') {
                localStorage.setItem('userLoggedIn', 'true');
                localStorage.setItem('userName', 'Admin');
                localStorage.setItem('userEmail', email);
                handleAuthRedirect();
                return;
            }

            // Hardcoded Operator
            if (email === 'operators@gmail.com' && password === 'Operator@123') {
                localStorage.setItem('userLoggedIn', 'true');
                localStorage.setItem('userName', 'Operator');
                localStorage.setItem('userEmail', email);
                handleAuthRedirect();
                return;
            }

            await signInWithEmailAndPassword(auth, email, password);
            handleAuthRedirect();

        } catch (err) {
            reportError(parseAuthError(err.code));
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}

/* =========================
   GOOGLE LOGIN
========================= */
async function triggerGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        await signInWithRedirect(auth, provider);
    } catch (err) {
        reportError(parseAuthError(err.code));
    }
}

if (elements.googleLoginBtn) elements.googleLoginBtn.addEventListener('click', triggerGoogleSignIn);
if (elements.googleSignupBtn) elements.googleSignupBtn.addEventListener('click', triggerGoogleSignIn);

/* =========================
   LOGOUT
========================= */
window.handleLogout = async function () {
    try {
        const user = auth.currentUser;
        if (user) await analytics.endSession(user.uid);

        await signOut(auth);

        localStorage.clear();

        const rootPrefix = window.location.pathname.includes('dashboards') ? '../' : '';
        window.location.href = `${rootPrefix}index.html`;
    } catch (err) {
        console.error("Logout failed", err);
    }
};

/* =========================
   NAVBAR UI
========================= */
function updateNavbarUI(user) {
    const loggedOutBtns = document.getElementById('loggedOutButtons');
    const loggedInProfile = document.getElementById('loggedInProfile');
    const navProfileCircle = document.getElementById('navProfileCircle');

    if (user) {
        if (loggedOutBtns) loggedOutBtns.style.display = 'none';
        if (loggedInProfile) loggedInProfile.style.display = 'flex';

        if (navProfileCircle) {
            const name = user.displayName || user.email;
            navProfileCircle.textContent = name.charAt(0).toUpperCase();
        }
    } else {
        if (loggedOutBtns) loggedOutBtns.style.display = 'block';
        if (loggedInProfile) loggedInProfile.style.display = 'none';
    }
}

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, (user) => {

    if (user) {
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userName', user.displayName || 'User');
        localStorage.setItem('userEmail', user.email);

        if (!localStorage.getItem('sessionStart')) {
            analytics.startSession();
        }

    } else {
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
    }

    updateNavbarUI(user);
});

/* =========================
   ERROR PARSER
========================= */
function parseAuthError(code) {
    switch (code) {
        case 'auth/email-already-in-use': return "Email already registered.";
        case 'auth/weak-password': return "Password too weak.";
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password': return "Invalid email or password.";
        default: return "Authentication failed.";
    }
}

/* =========================
   PROFILE DROPDOWN (global)
========================= */
window.toggleProfileDropdown = function () {
    const dropdown = document.getElementById('profileDropdown');
    if (!dropdown) return;
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
};

// Close profile dropdown when clicking outside (safe no-op if elements missing)
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    const profileCircle = document.getElementById('navProfileCircle');
    if (!dropdown || !profileCircle) return;
    if (!dropdown.contains(e.target) && !profileCircle.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});