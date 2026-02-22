import { auth, db } from '../lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * Remove a post (soft delete)
 */
export async function removePost(postId: string, adminId: string, note?: string): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    await updateDoc(postRef, {
      status: 'deleted',
      deletedAt: serverTimestamp(),
      deletedBy: adminId,
    });
  } catch (error: any) {
    console.error('Error removing post:', error);
    throw new Error(`Failed to remove post: ${error.message}`);
  }
}

/**
 * Suspend a user
 */
export async function suspendUser(userId: string, adminId: string, reason: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    await updateDoc(userRef, {
      isSuspended: true,
      suspendedAt: serverTimestamp(),
      suspendedBy: adminId,
      suspensionReason: reason,
    });
  } catch (error: any) {
    console.error('Error suspending user:', error);
    throw new Error(`Failed to suspend user: ${error.message}`);
  }
}

/**
 * Unsuspend a user
 */
export async function unsuspendUser(userId: string, adminId: string, note?: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    await updateDoc(userRef, {
      isSuspended: false,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
    });
  } catch (error: any) {
    console.error('Error unsuspending user:', error);
    throw new Error(`Failed to unsuspend user: ${error.message}`);
  }
}

/**
 * Check if current user is suspended
 */
export async function isUserSuspended(userId?: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    return false;
  }

  const targetUserId = userId || user.uid;

  try {
    const userRef = doc(db, 'users', targetUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data();
    return userData?.isSuspended === true;
  } catch (error: any) {
    console.error('Error checking user suspension status:', error);
    return false;
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    return false;
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data();
    const role = (userData?.role || '').toLowerCase();
    return role === 'admin';
  } catch (error: any) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

