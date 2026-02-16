import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// Firebase Admin initialization
if (!admin.apps.length) {
  try {
    // File path to your service account JSON
    const serviceAccountPath = path.join(__dirname, 'forsa-2923d-firebase-adminsdk-fbsvc-3c39df6d41.json');

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('Firebase service account JSON not found at ' + serviceAccountPath);
    }

    // Read the JSON file
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Export Firestore DB and Auth
export const db = getFirestore();
export const auth = admin.auth();
export default admin;
