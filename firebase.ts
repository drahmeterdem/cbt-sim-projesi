// This file assumes firebase-app-compat.js and firebase-firestore-compat.js are loaded in index.html
// We declare firebase here to inform TypeScript that it will be available globally.
declare const firebase: any;

let db: any = null;

export function isDbConnected(): boolean {
    return db !== null;
}

/**
 * Initializes the Firebase application and Firestore database.
 * @param config - The Firebase configuration object from your project settings.
 * @returns True if initialization is successful, false otherwise.
 */
export function initializeFirebase(config: object): boolean {
    try {
        // Avoid re-initializing the app
        if (firebase.apps.length === 0) {
            firebase.initializeApp(config);
        }
        db = firebase.firestore();
        console.log("Firebase and Firestore initialized successfully.");
        return true;
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        db = null;
        return false;
    }
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
    await db.collection(collectionPath).doc(docId).set(data);
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
 * Adds a new document to a subcollection.
 * @param parentCollection - The path of the parent collection.
 * @param parentDocId - The ID of the parent document.
 * @param subcollection - The name of the subcollection.
 * @param data - The data for the new document.
 * @returns The ID of the newly created document.
 */
export async function addDataToSubcollection(parentCollection: string, parentDocId: string, subcollection: string, data: any): Promise<string> {
    if (!db) throw new Error("Database not initialized.");
    const docRef = await db.collection(parentCollection).doc(parentDocId).collection(subcollection).add(data);
    return docRef.id;
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
