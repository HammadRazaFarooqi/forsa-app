import { Router } from 'express';
import { deleteMedia } from '../controllers/media.controller';
import { verifyFirebaseToken } from '../middleware/firebaseAuth.middleware';

const router = Router();

/**
 * POST /api/media/delete
 * Delete media from Cloudinary. Requires Firebase ID token + admin role.
 * Body: { publicId: string, resourceType?: 'image' | 'video' }
 */
router.post('/delete', verifyFirebaseToken, deleteMedia);

export default router;
