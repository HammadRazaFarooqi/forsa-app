import { Router } from 'express';
import { sendOTP, verifyOTP, resendOTP, sendPhoneOTP, verifyPhoneOTP } from '../controllers/otp.controller';

const router = Router();

router.post('/send', sendOTP);
router.post('/verify', verifyOTP);
router.post('/resend', resendOTP);

/**
 * Pre-registration OTP — call BEFORE creating Firebase user
 * Body: { phone: string }
 * Returns: { success, docId }
 */
router.post('/send-phone', sendPhoneOTP);

/**
 * Verify pre-registration OTP, then mark user as phoneVerified
 * Body: { docId: string, otp: string, uid: string }
 */
router.post('/verify-phone', verifyPhoneOTP);

export default router;
