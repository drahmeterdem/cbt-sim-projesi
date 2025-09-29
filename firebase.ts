// This is a placeholder for Firebase SDK types.
// In a real project, you would install firebase and use its types.
declare const firebase: any;

// --- Firebase Initialization ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMOhPCumWJncjfch4GhdPEnwO03c_8o5E",
  authDomain: "cbt-sim-projesi.firebaseapp.com",
  projectId: "cbt-sim-projesi",
  storageBucket: "cbt-sim-projesi.firebasestorage.app",
  messagingSenderId: "869396190469",
  appId: "1:869396190469:web:c6db6adefbd2c17e86d36c",
  measurementId: "G-9S9PYC74LR"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


// --- Authentication Functions ---

/**
 * Creates a new user with username and password.
 * Stores user info in Firestore with 'pending' status.
 */
export async function registerUser(username: string, password: string): Promise<any> {
    // Firebase Auth doesn't support usernames directly, we'll use an email format.
    const email = `${username.toLowerCase()}@cbt-sim.app`;
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Create a corresponding user document in Firestore's 'users' collection
    if (user) {
        await db.collection('users').doc(user.uid).set({
            username: username,
            status: 'pending' // 'pending', 'approved', 'rejected'
        });
    }
    return user;
}

/**
 * Signs in a user with username and password.
 */
export async function loginUser(username: string, password: string): Promise<any> {
    const email = `${username.toLowerCase()}@cbt-sim.app`;
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential.user;
}

/**
 * Signs out the current user.
 */
export function logoutUser(): Promise<void> {
    return auth.signOut();
}

/**
 * Sets up a listener for authentication state changes.
 * The callback will receive the user object on login/logout.
 */
export function onAuthStateChanged(callback: (user: any) => void): () => void {
    return auth.onAuthStateChanged(callback);
}


// --- User & State Data Functions ---

/**
 * Gets a user's profile data (like status and username) from Firestore.
 */
export async function getUserData(userId: string): Promise<any | null> {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        return userDoc.data();
    }
    return null;
}

/**
 * Saves the entire student state object to their document in Firestore.
 */
export async function saveState(userId: string, state: object): Promise<void> {
    if (!userId) return;
    // We store student-specific data in a separate 'studentStates' collection
    await db.collection('studentStates').doc(userId).set(state, { merge: true });
}

/**
 * Loads the entire student state object from their document in Firestore.
 */
export async function loadState(userId: string): Promise<any | null> {
    if (!userId) return null;
    const stateDoc = await db.collection('studentStates').doc(userId).get();
    if (stateDoc.exists) {
        return stateDoc.data();
    }
    return null; // The main app logic will handle creating an initial state if this is null
}


// --- Teacher/Admin Functions ---

/**
 * Fetches all users who have a 'pending' status.
 */
export async function getPendingUsers(): Promise<any[]> {
    const snapshot = await db.collection('users').where('status', '==', 'pending').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetches all users who have an 'approved' status.
 */
export async function getApprovedStudents(): Promise<any[]> {
    const snapshot = await db.collection('users').where('status', '==', 'approved').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Updates a user's status in their Firestore document.
 */
export async function updateUserStatus(userId: string, status: 'approved' | 'rejected'): Promise<void> {
    await db.collection('users').doc(userId).update({ status });
}
