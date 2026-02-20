import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';

// OTP expiry in minutes
const OTP_EXPIRY_MINUTES = 5;

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via SMS (Twilio if configured, otherwise log to console)
 */
export async function sendOTPviaSMS(phone: string, otp: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromPhone) {
        // Use Twilio
        try {
            // Dynamic require to avoid crashing if twilio not installed
            const twilio = require('twilio');
            const client = twilio(accountSid, authToken);
            await client.messages.create({
                body: `Your Forsa verification code is: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
                from: fromPhone,
                to: phone,
            });
            console.log(`✅ OTP SMS sent to ${phone}`);
        } catch (smsError) {
            console.error('❌ Twilio SMS error:', smsError);
            // Don't throw — fall back to console logging for dev
            console.log(`⚠️  [DEV FALLBACK] OTP for ${phone}: ${otp}`);
        }
    } else {
        // No Twilio configured — log OTP to console (development mode)
        console.log('=====================================');
        console.log(`📱 OTP for ${phone}: ${otp}`);
        console.log(`⏰ Expires in ${OTP_EXPIRY_MINUTES} minutes`);
        console.log('=====================================');
    }
}

/**
 * Store OTP in Firestore with expiry
 * @param docId - The Firestore document ID (uid after registration, or phone before registration)
 * @param phone - The phone number to send OTP to
 * @param otp - The OTP to store
 */
export async function storeOTPInFirestore(docId: string, phone: string, otp: string): Promise<void> {
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await db.collection('otpVerifications').doc(docId).set({
        otp,
        phone,
        docId,
        expiresAt: Timestamp.fromDate(expiresAt),
        verified: false,
        createdAt: Timestamp.now(),
    });
}

/**
 * Verify OTP from Firestore and mark as verified
 * Returns: { success, error? }
 */
export async function verifyOTPFromFirestore(
    uid: string,
    otp: string
): Promise<{ success: boolean; error?: string }> {
    const docRef = db.collection('otpVerifications').doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return { success: false, error: 'OTP not found. Please request a new code.' };
    }

    const data = docSnap.data()!;

    // Check already verified
    if (data.verified === true) {
        return { success: false, error: 'OTP already used. Please request a new code.' };
    }

    // Check expiry
    const expiresAt: Date = data.expiresAt.toDate();
    if (new Date() > expiresAt) {
        return { success: false, error: 'OTP has expired. Please request a new code.' };
    }

    // Check OTP match
    if (data.otp !== otp) {
        return { success: false, error: 'Incorrect OTP. Please try again.' };
    }

    // Mark as verified
    await docRef.update({ verified: true, verifiedAt: Timestamp.now() });

    // Update user's phoneVerified flag in Firestore
    await db.collection('users').doc(uid).update({
        phoneVerified: true,
        updatedAt: new Date().toISOString(),
    });

    return { success: true };
}
