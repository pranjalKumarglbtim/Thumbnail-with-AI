import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration - User provided credentials
const firebaseConfig = {
  apiKey: "AIzaSyAZx9596wEHEGDRAFVZ9YIOe3REKbbFGV4",
  authDomain: "ai-thumbnail-generator-3a3c0.firebaseapp.com",
  projectId: "ai-thumbnail-generator-3a3c0",
  storageBucket: "ai-thumbnail-generator-3a3c0.firebasestorage.app",
  messagingSenderId: "1011498742189",
  appId: "1:1011498742189:web:b5e85c0159ebd8c717b124"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Collection names
export const THUMBNAILS_COLLECTION = 'thumbnails';

// Thumbnail interface
export interface Thumbnail {
  id?: string;
  userId: string;
  url: string;
  config: {
    style: string;
    overlayText: string;
    characterAction: string;
    backgroundDetails: string;
    facialExpression: string;
    textStyle: string;
    aspectRatio: string;
    quality: string;
    imageSize: string;
  };
  styleName: string;
  timestamp: number;
}

// Save thumbnail to Firestore
export const saveThumbnail = async (thumbnail: Thumbnail): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, THUMBNAILS_COLLECTION), {
      ...thumbnail,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving thumbnail:', error);
    throw error;
  }
};

// Get thumbnails for a user (real-time listener)
export const getUserThumbnails = (userId: string, callback: (thumbnails: Thumbnail[]) => void) => {
  const q = query(
    collection(db, THUMBNAILS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const thumbnails: Thumbnail[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      thumbnails.push({
        id: doc.id,
        ...data
      } as Thumbnail);
    });
    callback(thumbnails);
  }, (error) => {
    console.error('Error fetching thumbnails:', error);
  });
};

// Delete thumbnail from Firestore
export const deleteThumbnail = async (thumbnailId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, THUMBNAILS_COLLECTION, thumbnailId));
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    throw error;
  }
};
