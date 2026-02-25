// Firebase Operators Data Service
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Collection names
const OPERATORS_COLLECTION = 'operators';
const USERS_COLLECTION = 'users';

/**
 * Fetch all operators from Firebase
 * @returns {Promise<Array>} Array of operator objects
 */
export async function fetchOperators() {
    try {
        const operatorsCol = collection(db, OPERATORS_COLLECTION);
        const operatorSnapshot = await getDocs(operatorsCol);
        const operators = operatorSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return operators;
    } catch (error) {
        console.error('Error fetching operators:', error);
        // Fallback to local JSON if Firebase fails
        return fetchLocalOperators();
    }
}

/**
 * Fetch a specific operator by ID
 * @param {string} operatorId - ID of the operator
 * @returns {Promise<Object>} Operator object
 */
export async function fetchOperator(operatorId) {
    try {
        const operatorDoc = doc(db, OPERATORS_COLLECTION, operatorId);
        const operatorSnapshot = await getDoc(operatorDoc);

        if (operatorSnapshot.exists()) {
            return {
                id: operatorSnapshot.id,
                ...operatorSnapshot.data()
            };
        } else {
            throw new Error('Operator not found');
        }
    } catch (error) {
        console.error('Error fetching operator:', error);
        // Fallback to local JSON
        const operators = await fetchLocalOperators();
        return operators.find(op => op.id === operatorId);
    }
}

/**
 * Fallback: Fetch operators from local JSON file
 * @returns {Promise<Array>} Array of operator objects
 */
async function fetchLocalOperators() {
    try {
        // Determine path based on current location
        const isDashboard = window.location.pathname.includes('/dashboards/');
        const path = isDashboard ? '../data/operators.json' : 'data/operators.json';

        const response = await fetch(path);
        if (!response.ok) {
            // Try alternative path if first fails (robustness)
            const altPath = isDashboard ? '../../data/operators.json' : './data/operators.json';
            const retry = await fetch(altPath);
            if (!retry.ok) throw new Error(`Failed to load operators data from ${path} or ${altPath}`);
            return (await retry.json()).operators || [];
        }

        const data = await response.json();
        return data.operators || [];
    } catch (error) {
        console.error('Error fetching local operators:', error);
        return [];
    }
}

/**
 * Initialize Firebase with operator data from local JSON
 * Call this once to seed Firebase database
 */
export async function seedOperatorsToFirebase() {
    try {
        // Determine path based on current location
        const isDashboard = window.location.pathname.includes('/dashboards/');
        const path = isDashboard ? '../data/operators.json' : 'data/operators.json';

        const response = await fetch(path);
        const data = await response.json();
        const operators = data.operators || [];

        for (const operator of operators) {
            const operatorRef = doc(db, OPERATORS_COLLECTION, operator.id);
            await setDoc(operatorRef, operator);
            console.log(`Seeded operator: ${operator.name}`);
        }

        console.log('All operators seeded to Firebase successfully!');
    } catch (error) {
        console.error('Error seeding operators to Firebase:', error);
    }
}

/**
 * Add a new plan to an operator
 * @param {string} operatorId - ID of the operator
 * @param {Object} planData - Plan data object
 */
export async function addPlan(operatorId, planData) {
    try {
        const operatorRef = doc(db, OPERATORS_COLLECTION, operatorId);
        const operatorSnap = await getDoc(operatorRef);

        if (operatorSnap.exists()) {
            const operatorData = operatorSnap.data();
            const updatedPlans = [...(operatorData.plans || []), planData];

            await updateDoc(operatorRef, {
                plans: updatedPlans
            });

            console.log('Plan added successfully!');
        }
    } catch (error) {
        console.error('Error adding plan:', error);
    }
}

/**
 * Update operator description
 * @param {string} operatorId - ID of the operator
 * @param {string} description - New description
 */
export async function updateOperatorDescription(operatorId, description) {
    try {
        const operatorRef = doc(db, OPERATORS_COLLECTION, operatorId);
        await updateDoc(operatorRef, {
            description: description
        });
        console.log('Description updated successfully!');
    } catch (error) {
        console.error('Error updating description:', error);
    }
}

/**
 * Listen to real-time updates for operators
 * @param {Function} callback - Callback function to handle updates
 */
export function subscribeToOperators(callback) {
    const operatorsCol = collection(db, OPERATORS_COLLECTION);
    return onSnapshot(operatorsCol, (snapshot) => {
        const operators = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(operators);
    }, (error) => {
        console.error('Error listening to operators:', error);
    });
}

/**
 * Save user login data to Firebase
 * @param {string} userId - User ID
 * @param {Object} userData - User data to save
 */
export async function saveUserLogin(userId, userData) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await setDoc(userRef, {
            ...userData,
            lastLogin: new Date().toISOString(),
            loginCount: (userData.loginCount || 0) + 1
        }, { merge: true });

        console.log('User login data saved successfully!');
    } catch (error) {
        console.error('Error saving user login:', error);
    }
}

/**
 * Create a new user profile in Firestore
 * @param {string} userId - User ID
 * @param {Object} profileData - User profile data (name, email, role, etc.)
 * @returns {Promise<boolean>} Success status
 */
export async function createUserProfile(userId, profileData) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await setDoc(userRef, {
            ...profileData,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            loginCount: 1
        });

        console.log('✅ User profile created successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error creating user profile:', error);
        return false;
    }
}

/**
 * Get user profile from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile data or null
 */
export async function getUserProfile(userId) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return {
                id: userSnap.id,
                ...userSnap.data()
            };
        } else {
            console.log('No user profile found');
            return null;
        }
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Update user profile in Firestore
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserProfile(userId, updates) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });

        console.log('✅ User profile updated successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error updating user profile:', error);
        return false;
    }
}

/**
 * Check if user exists in Firestore
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User data if exists, null otherwise
 */
export async function getUserByEmail(email) {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const snapshot = await getDocs(usersRef);

        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return users.find(user => user.email === email) || null;
    } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
    }
}
