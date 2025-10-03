// This file assumes firebase-app-compat.js and firebase-firestore-compat.js are loaded in index.html
// We declare firebase here to inform TypeScript that it will be available globally.
declare const firebase: any;

let db: any = null;
let auth: any = null;

// Hardcoded Firebase configuration to automate database connection
const firebaseConfig = {
  apiKey: "AIzaSyBMOhPCumWJncjfch4GhdPEnwO03c_8o5E",
  authDomain: "cbt-sim-projesi.firebaseapp.com",
  projectId: "cbt-sim-projesi",
  storageBucket: "cbt-sim-projesi.appspot.com",
  messagingSenderId: "869396190469",
  appId: "1:869396190469:web:c6db6adefbd2c17e86d36c",
  measurementId: "G-9S9PYC74LR"
};


export function isDbConnected(): boolean {
    return db !== null;
}

/**
 * Initializes the Firebase application and Firestore database using the hardcoded config.
 * This function should be called once when the application starts.
 * @returns True if initialization is successful, false otherwise.
 */
export function initializeFirebase(): boolean {
    try {
        // Avoid re-initializing the app
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("Firebase, Firestore, and Auth initialized successfully.");
        return true;
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        db = null;
        auth = null;
        return false;
    }
}

// --- Auth Functions ---

/**
 * Listens for changes in the user's authentication state.
 * @param callback - A function to call with the user object (or null) when the state changes.
 * @returns The unsubscribe function.
 */
export function onAuthStateChanged(callback: (user: any) => void): () => void {
    if (!auth) throw new Error("Auth not initialized.");
    return auth.onAuthStateChanged(callback);
}

/**
 * Signs up a new user with email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns The user credential object.
 */
export async function signUpWithEmail(email: string, password: string): Promise<any> {
    if (!auth) throw new Error("Auth not initialized.");
    return await auth.createUserWithEmailAndPassword(email, password);
}

/**
 * Signs in a user with email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns The user credential object.
 */
export async function signInWithEmail(email: string, password: string): Promise<any> {
    if (!auth) throw new Error("Auth not initialized.");
    return await auth.signInWithEmailAndPassword(email, password);
}

/**
 * Signs out the current user.
 */
export async function signOut(): Promise<void> {
    if (!auth) throw new Error("Auth not initialized.");
    await auth.signOut();
}


// --- Generic Data Access Functions ---

/**
 * Sets or overwrites a document with a specific ID in a collection.
 * @param collectionPath - The path to the collection (e.g., 'users').
 * @param docId - The ID for the document.
 * @param data - The data to save.
 */
export async function setData(collectionPath: string, docId: string, data: any): Promise<void> {
    if (!db) throw new Error("Database not initialized.");
    await db.collection(collectionPath).doc(docId).set(data, { merge: true });
}

/**
 * Updates an existing document. Fails if the document doesn't exist.
 * @param collectionPath - The path to the collection.
 * @param docId - The ID of the document to update.
 * @param data - An object containing the fields to update.
 */
export async function updateData(collectionPath: string, docId: string, data: any): Promise<void> {
    if (!db) throw new Error("Database not initialized.");
    await db.collection(collectionPath).doc(docId).update(data);
}

/**
 * Retrieves a single document by its ID from a collection.
 * @param collectionPath - The path to the collection.
 * @param docId - The ID of the document.
 * @returns The document data if it exists, otherwise null.
 */
export async function getData(collectionPath: string, docId: string): Promise<any | null> {
    if (!db) throw new Error("Database not initialized.");
    const doc = await db.collection(collectionPath).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Retrieves all documents from a collection.
 * @param collectionPath - The path to the collection.
 * @returns An array of document data.
 */
export async function getCollection(collectionPath: string): Promise<any[]> {
    if (!db) throw new Error("Database not initialized.");
    const snapshot = await db.collection(collectionPath).get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Retrieves documents from a collection based on a query.
 * @param collectionPath - The path to the collection.
 * @param field - The field to query on.
 * @param operator - The query operator (e.g., '==', '>', '<').
 * @param value - The value to compare against.
 * @returns An array of matching document data.
 */
export async function getCollectionWhere(collectionPath: string, field: string, operator: string, value: any): Promise<any[]> {
    if (!db) throw new Error("Database not initialized.");
    const snapshot = await db.collection(collectionPath).where(field, operator, value).get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Deletes a document from a collection.
 * @param collectionPath - The path to the collection.
 * @param docId - The ID of the document to delete.
 */
export async function deleteData(collectionPath: string, docId: string): Promise<void> {
    if (!db) throw new Error("Database not initialized.");
    await db.collection(collectionPath).doc(docId).delete();
}


/**
 * Gets all documents from a subcollection.
 * @param parentCollection - The path of the parent collection.
 * @param parentDocId - The ID of the parent document.
 * @param subcollection - The name of the subcollection.
 * @returns An array of document data from the subcollection.
 */
export async function getSubcollection(parentCollection: string, parentDocId: string, subcollection: string): Promise<any[]> {
    if (!db) throw new Error("Database not initialized.");
    const snapshot = await db.collection(parentCollection).doc(parentDocId).collection(subcollection).get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}


/**
 * Sets or overwrites a document with a specific ID in a subcollection.
 * @param parentCollection - The path of the parent collection.
 * @param parentDocId - The ID of the parent document.
 * @param subcollection - The name of the subcollection.
 * @param docId - The ID for the document within the subcollection.
 * @param data - The data to save.
 */
export async function setDataInSubcollection(parentCollection: string, parentDocId: string, subcollection: string, docId: string, data: any): Promise<void> {
    if (!db) throw new Error("Database not initialized.");
    await db.collection(parentCollection).doc(parentDocId).collection(subcollection).doc(docId).set(data);
}

/**
 * Updates an existing document in a subcollection.
 * @param parentCollection - The path of the parent collection.
 * @param parentDocId - The ID of the parent document.
 * @param subcollection - The name of the subcollection.
 * @param docId - The ID of the document to update.
 * @param data - An object containing the fields to update.
 */
export async function updateDataInSubcollection(parentCollection: string, parentDocId: string, subcollection: string, docId: string, data: any): Promise<void> {
    if (!db) throw new Error("Database not initialized.");
    await db.collection(parentCollection).doc(parentDocId).collection(subcollection).doc(docId).update(data);
}
