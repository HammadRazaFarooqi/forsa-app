import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase-admin/firestore';
import { sendError } from '../utils/response.util';

// Configure Cloudinary (uses env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Delete media from Cloudinary by public_id.
 * Requires Firebase token + user must be admin.
 */
export async function deleteMedia(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUser = (req as any).firebaseUser;
    if (!firebaseUser?.uid) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const { publicId } = req.body;
    if (!publicId || typeof publicId !== 'string') {
      sendError(res, 'BAD_REQUEST', 'publicId is required', null, 400);
      return;
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
    if (!userDoc.exists) {
      sendError(res, 'UNAUTHORIZED', 'User not found', null, 401);
      return;
    }
    const role = (userDoc.data()?.role || '').toLowerCase();
    if (role !== 'admin') {
      sendError(res, 'FORBIDDEN', 'Admin access required', null, 403);
      return;
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      sendError(res, 'SERVICE_UNAVAILABLE', 'Cloudinary not configured for delete', null, 503);
      return;
    }

    // Determine resource type from public_id or default to image
    const resourceType = (req.body.resourceType as string) || 'image';

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'video' ? 'video' : 'image',
    });

    if (result.result === 'not found') {
      res.status(200).json({ success: true, message: 'Already deleted or not found' });
      return;
    }

    res.status(200).json({ success: true, result: result.result });
  } catch (error: any) {
    console.error('Media delete error:', error);
    sendError(res, 'INTERNAL_ERROR', error.message || 'Failed to delete media', null, 500);
  }
}
