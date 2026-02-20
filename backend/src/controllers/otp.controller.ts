import { Request, Response } from 'express';
import { generateOTP, sendOTPviaSMS, storeOTPInFirestore, verifyOTPFromFirestore } from '../utils/otp.util';
import { db } from '../config/firebase';

/**
 * POST /api/otp/send-phone
 * Body: { phone: string }
 * Pre-registration OTP — sends OTP using the phone number as the key (no uid yet)
 * Call this BEFORE creating the Firebase user so orphan accounts are avoided
 */
export const sendPhoneOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone } = req.body;

        if (!phone) {
            res.status(400).json({ success: false, error: 'phone is required' });
            return;
        }

        const digits = phone.replace(/\D/g, '');
        if (digits.length < 7) {
            res.status(400).json({ success: false, error: 'Invalid phone number' });
            return;
        }

        // Use the phone digits as the Firestore doc ID (no uid yet)
        const docId = `phone_${digits}`;
        const otp = generateOTP();
        await storeOTPInFirestore(docId, phone, otp);
        await sendOTPviaSMS(phone, otp);

        const response: any = {
            success: true,
            message: 'OTP sent successfully',
            docId,
        };

        // Return OTP in development mode for testing
        if (process.env.NODE_ENV === 'development') {
            response.devOtp = otp;
        }

        res.status(200).json(response);
    } catch (error: any) {
        console.error('❌ sendPhoneOTP error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send OTP',
        });
    }
};

/**
 * POST /api/otp/send
 * Body: { uid: string, phone: string }
 * Generates and sends an OTP to the phone number
 */
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uid, phone } = req.body;

        if (!uid || !phone) {
            res.status(400).json({
                success: false,
                error: 'uid and phone are required',
            });
            return;
        }

        // Validate phone has digits
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 7) {
            res.status(400).json({
                success: false,
                error: 'Invalid phone number',
            });
            return;
        }

        // Generate and send OTP
        const otp = generateOTP();
        await storeOTPInFirestore(uid, phone, otp);
        await sendOTPviaSMS(phone, otp);

        const response: any = {
            success: true,
            message: 'OTP sent successfully',
        };

        // Return OTP in development mode for testing
        if (process.env.NODE_ENV === 'development') {
            response.devOtp = otp;
        }

        res.status(200).json(response);
    } catch (error: any) {
        console.error('❌ sendOTP error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send OTP',
        });
    }
};

/**
 * POST /api/otp/verify
 * Body: { uid: string, otp: string }
 * Verifies OTP and marks user as phoneVerified in Firestore
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uid, otp } = req.body;

        if (!uid || !otp) {
            res.status(400).json({
                success: false,
                error: 'uid and otp are required',
            });
            return;
        }

        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            res.status(400).json({
                success: false,
                error: 'OTP must be a 6-digit number',
            });
            return;
        }

        const result = await verifyOTPFromFirestore(uid, otp);

        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Phone number verified successfully',
        });
    } catch (error: any) {
        console.error('❌ verifyOTP error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify OTP',
        });
    }
};

/**
 * POST /api/otp/verify-phone
 * Body: { docId: string, otp: string, uid: string }
 * Verifies pre-registration OTP (stored by phone key) then updates users/{uid}
 */
export const verifyPhoneOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { docId, otp, uid } = req.body;

        if (!docId || !otp || !uid) {
            res.status(400).json({
                success: false,
                error: 'docId, otp, and uid are required',
            });
            return;
        }

        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            res.status(400).json({
                success: false,
                error: 'OTP must be a 6-digit number',
            });
            return;
        }

        // Verify OTP using phone-based docId
        const result = await verifyOTPFromFirestore(docId, otp);

        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
            });
            return;
        }

        // Update user's phoneVerified flag now that we have the uid
        await db.collection('users').doc(uid).update({
            phoneVerified: true,
            updatedAt: new Date().toISOString(),
        });

        // Clean up the phone-based OTP doc (already marked verified above)
        // Also remove the temp doc to keep Firestore clean
        await db.collection('otpVerifications').doc(docId).delete();

        res.status(200).json({
            success: true,
            message: 'Phone number verified successfully',
        });
    } catch (error: any) {
        console.error('❌ verifyPhoneOTP error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify OTP',
        });
    }
};

/**
 * POST /api/otp/resend
 * Body: { uid: string, phone: string }
 * Resends a new OTP (rate-limited by not being too frequent)
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uid, phone } = req.body;

        if (!uid || !phone) {
            res.status(400).json({
                success: false,
                error: 'uid and phone are required',
            });
            return;
        }

        // Check if last OTP was sent less than 60 seconds ago
        const docSnap = await db.collection('otpVerifications').doc(uid).get();
        if (docSnap.exists) {
            const data = docSnap.data()!;
            const createdAt: Date = data.createdAt.toDate();
            const secondsElapsed = (Date.now() - createdAt.getTime()) / 1000;
            if (secondsElapsed < 60) {
                const waitSeconds = Math.ceil(60 - secondsElapsed);
                res.status(429).json({
                    success: false,
                    error: `Please wait ${waitSeconds} seconds before requesting a new OTP`,
                    waitSeconds,
                });
                return;
            }
        }

        // Generate and send new OTP
        const otp = generateOTP();
        await storeOTPInFirestore(uid, phone, otp);
        await sendOTPviaSMS(phone, otp);

        const response: any = {
            success: true,
            message: 'New OTP sent successfully',
        };

        // Return OTP in development mode for testing
        if (process.env.NODE_ENV === 'development') {
            response.devOtp = otp;
        }

        res.status(200).json(response);
    } catch (error: any) {
        console.error('❌ resendOTP error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to resend OTP',
        });
    }
};
