import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a generated image to Firebase Storage
 * 
 * @param userId - The user ID who generated the image
 * @param blob - The image blob to upload
 * @param thumbnailId - The thumbnail document ID
 * @returns Promise with the download URL
 */
export const uploadGeneratedImage = async (
  userId: string,
  blob: Blob,
  thumbnailId: string
): Promise<string> => {
  try {
    // Create storage reference: /thumbnails/{userId}/{thumbnailId}.png
    const storageRef = ref(storage, `thumbnails/${userId}/${thumbnailId}.png`);
    
    // Upload the blob with metadata
    const metadata = {
      contentType: 'image/png',
      customMetadata: {
        generatedAt: new Date().toISOString(),
        userId: userId,
      },
    };
    
    await uploadBytes(storageRef, blob, metadata);
    
    // Get and return the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    throw error;
  }
};

/**
 * Delete an image from Firebase Storage
 * 
 * @param userId - The user ID
 * @param thumbnailId - The thumbnail document ID
 */
export const deleteGeneratedImage = async (
  userId: string,
  thumbnailId: string
): Promise<void> => {
  try {
    const storageRef = ref(storage, `thumbnails/${userId}/${thumbnailId}.png`);
    await deleteObject(storageRef);
    console.log('Image deleted successfully');
  } catch (error) {
    console.error('Error deleting image from Firebase Storage:', error);
    throw error;
  }
};

/**
 * Get a reference to a thumbnail image
 * 
 * @param userId - The user ID
 * @param thumbnailId - The thumbnail document ID
 * @returns Storage reference
 */
export const getThumbnailRef = (userId: string, thumbnailId: string) => {
  return ref(storage, `thumbnails/${userId}/${thumbnailId}.png`);
};

/**
 * Check if an image exists in storage
 * 
 * @param userId - The user ID
 * @param thumbnailId - The thumbnail document ID
 * @returns Promise<boolean>
 */
export const imageExists = async (
  userId: string,
  thumbnailId: string
): Promise<boolean> => {
  try {
    const storageRef = ref(storage, `thumbnails/${userId}/${thumbnailId}.png`);
    await getDownloadURL(storageRef);
    return true;
  } catch {
    return false;
  }
};
