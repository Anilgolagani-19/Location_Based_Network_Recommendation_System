import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Import Analytics
import { analytics } from './analytics.js';

// DOM References
const elements = {
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    googleSignupBtn: document.getElementById('googleSignupBtn'),
    errorBox: null
};

/**
 * Robust Error Reporting
 */
function reportError(message, type = 'error') {
    console.error(`[Auth] ${type.toUpperCase()}:`, message);

    // Protocol Check
    if (window.location.protocol === 'file:') {
        message = "⚠️ Firebase Auth requires a local server. Please use 'Live Server' extension.";
        type = 'error';
    }

    // Config Check
    if (auth.config && auth.config.apiKey && auth.config.apiKey.includes('PASTE_YOUR_API_KEY')) {
        message = "⚠️ Firebase API Key is missing. Update 'js/firebase-config.js'.";
        type = 'error';
    }

    if (!elements.errorBox) {
        elements.errorBox = document.createElement('div');
        elements.errorBox.className = 'auth-status-box'; // Custom class for styling
        elements.errorBox.style.cssText = `
            padding: 12px; margin-bottom: 20px; border-radius: 8px; font-weight: 500; text-align: center;
        `;
        const form = document.querySelector('form');
        if (form) form.prepend(elements.errorBox);
    }

    elements.errorBox.style.background = type === 'success' ? '#d1fae5' : '#fee2e2';
    elements.errorBox.style.color = type === 'success' ? '#065f46' : '#991b1b';
    elements.errorBox.style.border = `1px solid ${type === 'success' ? '#10b981' : '#ef4444'}`;
    elements.errorBox.textContent = message;
}

/**
 * Centralized Redirection Logic
 */
function handleAuthRedirect(userEmail) {
    const isAdmin = userEmail === 'manikanta25632563@gmail.com';
    const isOperator = userEmail === 'operators@gmail.com';
    const pathPrefix = window.location.pathname.includes('dashboards') ? '' : 'dashboards/';

    if (isAdmin || isOperator) {
        console.log(`[Auth] Redirecting to Dashboard: ${isAdmin ? 'Admin' : 'Operator'}`);
        window.location.href = `${pathPrefix}admin-dashboard.html`;
    } else {
        console.log("[Auth] Redirecting to User Dashboard");
        window.location.href = `${pathPrefix}user-dashboard.html`;
    }
}

/**
 * Email/Password Sign Up
 */
if (elements.signupForm) {
    elements.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = elements.signupForm.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });
            await sendEmailVerification(user);

            // Sync with Firestore
            await setDoc(doc(db, "users", user.uid), {
                name, email, createdAt: new Date(), uid: user.uid
            }, { merge: true });

            // Analytics: Increment Total Users
            await analytics.incrementTotalUsers();

            reportError("Success! Check your email for verification.", 'success');
            setTimeout(() => handleAuthRedirect(email), 2500);

        } catch (err) {
            reportError(parseAuthError(err.code));
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    });
}

/**
 * Email/Password Login
 */
if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = elements.loginForm.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            // Hardcoded Admin Login
            if (email === 'manikanta25632563@gmail.com' && password === 'Admin@123') {
                console.log("[Auth] Default Admin Login Successful");
                localStorage.setItem('userLoggedIn', 'true');
                localStorage.setItem('userName', 'Admin');
                localStorage.setItem('userEmail', email);
                handleAuthRedirect(email);
                return;
            }

            // Hardcoded Operator Login
            if (email === 'operators@gmail.com' && password === 'Operator@123') {
                console.log("[Auth] Default Operator Login Successful");
                localStorage.setItem('userLoggedIn', 'true');
                localStorage.setItem('userName', 'Operator');
                localStorage.setItem('userEmail', email);
                handleAuthRedirect(email);
                return;
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            handleAuthRedirect(userCredential.user.email);

        } catch (err) {
            reportError(parseAuthError(err.code));
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}

/**
 * Google Sign In
 */
async function triggerGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        console.log("[Auth] Starting Google Sign-In (Popup)...");
        // Using signInWithPopup for better feedback and to avoid redirect issues
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Sync with Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName,
            email: user.email,
            lastLogin: new Date(),
            uid: user.uid
        }, { merge: true });

        handleAuthRedirect(user.email);

    } catch (err) {
        console.error("[Auth] Google Sign-In Error:", err);
        reportError(parseAuthError(err.code));
    }
}

/**
 * Handle Redirect Result (Special for signInWithRedirect)
 */
onAuthStateChanged(auth, async (user) => {
    // Only handle redirect results once
    if (user && !localStorage.getItem('userLoggedIn')) {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                const user = result.user;
                await setDoc(doc(db, "users", user.uid), {
                    name: user.displayName,
                    email: user.email,
                    lastLogin: new Date(),
                    uid: user.uid
                }, { merge: true });
                handleAuthRedirect(user.email);
            }
        } catch (err) {
            console.error("[Auth] Redirect Error:", err);
        }
    }
});

if (elements.googleLoginBtn) elements.googleLoginBtn.addEventListener('click', triggerGoogleSignIn);
if (elements.googleSignupBtn) elements.googleSignupBtn.addEventListener('click', triggerGoogleSignIn);

/**
 * Auth State Listener & Profile Sync
 */

/**
 * Global Logout Handler
 */
window.handleLogout = async function () {
    try {
        const user = auth.currentUser;
        if (user) {
            await analytics.endSession(user.uid);
        }
        await signOut(auth);

        // Clear local session markers
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('sessionStart');

        const rootPrefix = window.location.pathname.includes('dashboards') ? '../' : '';
        window.location.href = `${rootPrefix}index.html`;
    } catch (err) {
        console.error("Logout failed", err);
    }
};

/**
 * Auth State Listener & Profile Sync
 */
/**
 * Navbar UI State Manager
 */
function updateNavbarUI(user) {
    const loggedOutBtns = document.getElementById('loggedOutButtons');
    const loggedInProfile = document.getElementById('loggedInProfile');
    const navProfileCircle = document.getElementById('navProfileCircle');
    const authContainer = document.getElementById('authContainer');

    const currentUserEmail = user ? user.email : localStorage.getItem('userEmail');
    const isLoggedIn = user || localStorage.getItem('userLoggedIn') === 'true';

    if (isLoggedIn) {
        if (loggedOutBtns) loggedOutBtns.style.display = 'none';
        if (loggedInProfile) {
            loggedInProfile.style.display = 'flex';
            if (navProfileCircle) {
                const name = user ? (user.displayName || user.email) : (localStorage.getItem('userName') || 'U');
                navProfileCircle.textContent = name.charAt(0).toUpperCase();
            }
        }

        const isAdmin = currentUserEmail === 'manikanta25632563@gmail.com';
        const isOperator = currentUserEmail === 'operators@gmail.com';
        const dashboardLink = (isAdmin || isOperator) ? 'dashboards/admin-dashboard.html' : 'dashboards/user-dashboard.html';
        const dashboardText = (isAdmin || isOperator) ? 'Admin Dashboard' : 'My Dashboard';

        // Ensure navDashboardBtn is removed if it exists (cleanup)
        const existingBtn = document.getElementById('navDashboardBtn');
        if (existingBtn) existingBtn.remove();

        // 2. Sync Profile Dropdown Dashboard Link (for Mobile menu and consistency)
        const profileDropdownDashboard = document.querySelector('#profileDropdown .dropdown-item:first-child');
        if (profileDropdownDashboard) {
            // Adjust final link based on current depth
            const finalLink = window.location.pathname.includes('dashboards') ?
                dashboardLink.replace('dashboards/', '') :
                dashboardLink;

            profileDropdownDashboard.setAttribute('onclick', `window.location.href='${finalLink}'`);
            profileDropdownDashboard.innerHTML = `<ion-icon name="grid-outline"></ion-icon> ${dashboardText}`;
        }

        // 3. Dynamic Page CTAs (Hero/Footer buttons)
        const pageCTAs = ['hero-cta', 'footer-cta', 'features-cta'];
        pageCTAs.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                // Adjust final link based on current depth (index/features are at root)
                const finalLink = window.location.pathname.includes('dashboards') ?
                    dashboardLink.replace('dashboards/', '') :
                    dashboardLink;

                btn.href = finalLink;
                btn.textContent = 'Go to Dashboard';
            }
        });
    } else {
        if (loggedOutBtns) loggedOutBtns.style.display = 'block';
        if (loggedInProfile) loggedInProfile.style.display = 'none';
        const dashboardBtn = document.getElementById('navDashboardBtn');
        if (dashboardBtn) dashboardBtn.remove();

        // Reset Page CTAs to default logout state
        const ctaDefaults = {
            'hero-cta': { text: 'Get Started Free', href: 'signup.html' },
            'footer-cta': { text: 'Start Your Free Trial', href: 'signup.html' },
            'features-cta': { text: 'View Demo Dashboard', href: 'login.html' }
        };
        Object.keys(ctaDefaults).forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.href = ctaDefaults[id].href;
                btn.textContent = ctaDefaults[id].text;
            }
        });
    }
}

// Global Toggle for Dropdown
window.toggleProfileDropdown = function () {
    const dd = document.getElementById('profileDropdown');
    if (dd) {
        dd.classList.toggle('show');
    }
};

// Close dropdown on click outside
window.addEventListener('click', (e) => {
    const dd = document.getElementById('profileDropdown');
    const circle = document.getElementById('navProfileCircle');
    // If click is NOT on circle AND NOT on dropdown, close it
    if (dd && circle && !circle.contains(e.target) && !dd.contains(e.target)) {
        dd.classList.remove('show');
    }
});

/**
 * Auth State Listener & Profile Sync
 */
onAuthStateChanged(auth, (user) => {

    const isDashboardPage = window.location.pathname.includes('user-dashboard.html');
    const isAdminDashboard = window.location.pathname.includes('admin-dashboard.html');
    const isProtectedPage = window.location.pathname.includes('dashboard') || window.location.pathname.includes('-plans.html');
    const hasFilters = localStorage.getItem('dashboardFilters');
    const pathPrefix = window.location.pathname.includes('dashboards') ? '' : 'dashboards/';
    const rootPrefix = window.location.pathname.includes('dashboards') ? '../' : '';

    // Check for hardcoded admin session
    const isHardcodedAdmin = localStorage.getItem('userLoggedIn') === 'true' &&
        localStorage.getItem('userEmail') === 'manikanta25632563@gmail.com';

    if (user || isHardcodedAdmin) {
        const currentUserEmail = user ? user.email : localStorage.getItem('userEmail');
        console.log("[Auth] User is signed in:", currentUserEmail);

        // Analytics: Start Session
        if (!localStorage.getItem('sessionStart')) {
            analytics.startSession();
        }

        // Sync Local Storage if Firebase user exists
        if (user) {
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userName', user.displayName || 'User');
            localStorage.setItem('userEmail', user.email);
        }

        // Update Dashboard UI if elements exist
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');
        const userAvatarEl = document.getElementById('userAvatar');

        if (userNameEl) userNameEl.textContent = user ? (user.displayName || 'User') : 'Admin';
        if (userEmailEl) userEmailEl.textContent = currentUserEmail;
        if (userAvatarEl) userAvatarEl.textContent = user ? (user.displayName || 'U').charAt(0).toUpperCase() : 'A';

        // Check if user needs to fill filters (Admins bypass filters)
        const isAdmin = currentUserEmail === 'manikanta25632563@gmail.com';
        if (isProtectedPage && !window.location.pathname.includes('user-filters.html')) {
            if (isAdmin) {
                // allow admin to roam, but ensure they are on admin dashboard if that's the intent
                if (!isAdminDashboard && isProtectedPage && !window.location.pathname.includes('user-dashboard.html')) {
                    // console.log("[Auth] Admin on a protected non-admin page.");
                }
            }
            else if (!isAdmin && !hasFilters) {
                console.log("[Auth] Redirecting user to filters.");
                window.location.href = `${pathPrefix}user-filters.html`;
            }
        }

    } else {
        console.log("[Auth] No user signed in.");
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');

        if (isProtectedPage) {
            window.location.href = `${rootPrefix}login.html`;
        }
    }

    // Final UI Sync after state logic
    updateNavbarUI(user);
});

// Hook into Signup to increment user count
if (elements.signupForm) {
    elements.signupForm.addEventListener('submit', async (e) => {
        // ... (existing code, just need to hook into the success block)
        // Actually, easiest to just wrap the listener in a way that doesn't break existing code,
        // but `replace_file_content` is strict.
        // Let's assume the user uses the existing listener I provided in previous turns.
        // I will re-implement the listener here briefly to inject the call, OR just use the hook in `createUser` success.
    });
}
// Modifying the `createUser` success block in the `signupForm` listener:
/* 
   Since I cannot easily target just the success block without replacing the whole listener, 
   I will just rely on the existing code structure.
   
   Wait, I need to match the StartLine/EndLine correctly.
   The `onAuthStateChanged` is distinct.
   The `handleLogout` is distinct.
   
   I will replace the Logout and AuthStateListener blocks. For Signup, I'll do a separate replacement or let it be (Total Users is less critical than session time for the tricky part).
   Actually, the user asked for Total Users. I MUST implement it.
   
   Let's replace `handleLogout` and `onAuthStateChanged`.
   And I will try to find the signup block to inject `analytics.incrementTotalUsers()`.
*/


/**
 * Error Parser
 */
function parseAuthError(code) {
    switch (code) {
        case 'auth/email-already-in-use': return "Email already registered.";
        case 'auth/weak-password': return "Password too weak (min 6 chars).";
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password': return "Invalid email or password.";
        case 'auth/popup-closed-by-user': return "Popup closed. Try again.";
        case 'auth/cancelled-popup-request': return "One popup at a time, please.";
        default: return "Authentication failed. See console.";
    }
}

