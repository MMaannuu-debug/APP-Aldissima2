// ================================
// DATABASE MODULE - Firebase Firestore
// ================================

// Firebase configuration - Replace with your own config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db = null;

export function initDatabase() {
    return new Promise((resolve, reject) => {
        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                console.warn('Firebase not loaded, using localStorage fallback');
                resolve(false);
                return;
            }

            // Initialize if not already done
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            db = firebase.firestore();
            console.log('Firebase initialized');
            resolve(true);
        } catch (error) {
            console.warn('Firebase init failed, using localStorage:', error);
            resolve(false);
        }
    });
}

// ================================
// LocalStorage Fallback for Development
// ================================

class LocalDB {
    constructor() {
        this.prefix = 'calcetto_';
    }

    getCollection(name) {
        const data = localStorage.getItem(this.prefix + name);
        return data ? JSON.parse(data) : [];
    }

    saveCollection(name, data) {
        localStorage.setItem(this.prefix + name, JSON.stringify(data));
    }

    // Get all documents
    async getAll(collection) {
        return this.getCollection(collection);
    }

    // Get document by ID
    async getById(collection, id) {
        const items = this.getCollection(collection);
        return items.find(item => item.id === id) || null;
    }

    // Add document
    async add(collection, data) {
        const items = this.getCollection(collection);
        const newItem = {
            ...data,
            id: data.id || this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        items.push(newItem);
        this.saveCollection(collection, items);
        return newItem;
    }

    // Update document
    async update(collection, id, data) {
        const items = this.getCollection(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) throw new Error('Document not found');

        items[index] = {
            ...items[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        this.saveCollection(collection, items);
        return items[index];
    }

    // Delete document
    async delete(collection, id) {
        const items = this.getCollection(collection);
        const filtered = items.filter(item => item.id !== id);
        this.saveCollection(collection, filtered);
    }

    // Query by field
    async query(collection, field, operator, value) {
        const items = this.getCollection(collection);
        return items.filter(item => {
            switch (operator) {
                case '==': return item[field] === value;
                case '!=': return item[field] !== value;
                case '>': return item[field] > value;
                case '>=': return item[field] >= value;
                case '<': return item[field] < value;
                case '<=': return item[field] <= value;
                case 'in': return value.includes(item[field]);
                default: return false;
            }
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Export database instance
export const localDB = new LocalDB();

// ================================
// Firestore wrapper with same interface
// ================================

export const firestoreDB = {
    async getAll(collection) {
        if (!db) return localDB.getAll(collection);
        const snapshot = await db.collection(collection).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getById(collection, id) {
        if (!db) return localDB.getById(collection, id);
        const doc = await db.collection(collection).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async add(collection, data) {
        if (!db) return localDB.add(collection, data);
        const docRef = data.id
            ? db.collection(collection).doc(data.id)
            : db.collection(collection).doc();

        const newData = {
            ...data,
            id: docRef.id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await docRef.set(newData);
        return { ...newData, id: docRef.id };
    },

    async update(collection, id, data) {
        if (!db) return localDB.update(collection, id, data);
        const docRef = db.collection(collection).doc(id);
        await docRef.update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const updated = await docRef.get();
        return { id: updated.id, ...updated.data() };
    },

    async delete(collection, id) {
        if (!db) return localDB.delete(collection, id);
        await db.collection(collection).doc(id).delete();
    },

    async query(collection, field, operator, value) {
        if (!db) return localDB.query(collection, field, operator, value);
        const snapshot = await db.collection(collection).where(field, operator, value).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// Default export - uses localStorage until Firebase is configured
export default localDB;
