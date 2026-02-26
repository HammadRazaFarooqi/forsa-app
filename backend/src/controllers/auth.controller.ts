import { Request, Response, NextFunction } from 'express';
import { db, auth } from '../config/firebase';
import { hashPassword, comparePassword } from '../utils/bcrypt.util';
import { generateToken, generateRefreshToken } from '../utils/jwt.util';
import { sendSuccess, sendError } from '../utils/response.util';
import { UserRole, AccountStatus } from '../types';
import { z } from 'zod';
import { sendOtp as twilioSendOtp, verifyOtp as twilioVerifyOtp } from '../utils/twilio.util';

// Validation schemas
const signupSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
});

const signinSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = signupSchema.parse(req.body);
    const { email, phone, password, role } = validatedData;

    // Check if user already exists
    let userQuery = db.collection('users');
    if (email) {
      const emailSnapshot = await userQuery.where('email', '==', email).get();
      if (!emailSnapshot.empty) {
        sendError(res, 'CONFLICT', 'Email already exists', null, 409);
        return;
      }
    }

    const phoneSnapshot = await userQuery.where('phone', '==', phone).get();
    if (!phoneSnapshot.empty) {
      sendError(res, 'CONFLICT', 'Phone number already exists', null, 409);
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email if not provided (for phone-based auth)
    const userEmail = email || `user_${phone.replace(/\D/g, '')}@forsa.app`;

    // Create Firebase Auth user
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: userEmail,
        password: password,
        phoneNumber: phone.startsWith('+') ? phone : `+${phone}`,
      });
    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/email-already-exists' || firebaseError.code === 'auth/phone-number-already-exists') {
        sendError(res, 'CONFLICT', 'User already exists', null, 409);
        return;
      }
      throw firebaseError;
    }

    // Create user document in Firestore
    const userData = {
      email: userEmail,
      phone,
      passwordHash, // Store hashed password for backend verification
      role,
      status: AccountStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('users').doc(firebaseUser.uid).set(userData);

    // Generate tokens
    const token = generateToken({
      userId: firebaseUser.uid,
      email: userEmail,
      role,
    });

    const refreshToken = generateRefreshToken({
      userId: firebaseUser.uid,
      email: userEmail,
      role,
    });

    sendSuccess(
      res,
      {
        user: {
          id: firebaseUser.uid,
          email: userEmail,
          phone,
          role,
          status: AccountStatus.PENDING,
        },
        token,
        refreshToken,
      },
      'User created successfully',
      201
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input data', error.errors, 400);
      return;
    }
    next(error);
  }
}

// ─── OTP: Step 1 — Send OTP ──────────────────────────────────────────────────

const sendOtpSchema = z.object({
  phone: z.string().min(10),
  role: z.nativeEnum(UserRole),
});

export async function sendOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    console.log(`📱 [OTP] Send OTP request for phone: ${phone}`);

    // Normalize phone to E.164
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Check if phone already registered
    const phoneSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (!phoneSnapshot.empty) {
      console.log(`⚠️  [OTP] Phone already registered: ${phone}`);
      sendError(res, 'CONFLICT', 'Phone number already registered', null, 409);
      return;
    }

    // Send OTP via Twilio Verify
    console.log(`📤 [OTP] Sending OTP via Twilio to ${normalizedPhone}...`);
    // [DEV BYPASS]: Allow skipping actual SMS logic if testing (e.g. for +923074639523)
    // Twilio blocks some numbers (like +923360166888) on trial accounts due to fraud filters
    if (process.env.NODE_ENV === 'development' && (phone === '+923074639523' || phone === '+923360166888')) {
      console.log(`⚠️  [DEV BYPASS] Skipping Twilio SMS for test number ${phone}. Use OTP: 123456`);
    } else {
      await twilioSendOtp(normalizedPhone);
    }
    console.log(`✅ [OTP] OTP sent successfully to ${normalizedPhone}`);

    sendSuccess(res, { phone: normalizedPhone }, 'OTP sent successfully');
  } catch (error: any) {
    if (error.name === 'ZodError') {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input data', error.errors, 400);
      return;
    }
    console.error(`❌ [OTP] Failed to send OTP:`, error.message || error);
    next(error);
  }
}

// ─── OTP: Step 2 — Verify OTP & Register ─────────────────────────────────────

const verifyOtpSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  email: z.string().email().optional(),
});

export async function verifyOtpAndRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = verifyOtpSchema.parse(req.body);
    const { phone, otp, password, role, email } = validatedData;
    console.log(`🔐 [OTP] Verify OTP request — phone: ${phone}, role: ${role}`);

    // Normalize phone to E.164
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Verify OTP via Twilio Verify
    console.log(`🔍 [OTP] Checking OTP code with Twilio...`);

    // [DEV BYPASS]: Skip Twilio validation if using the universal test OTP "123456" in dev mode
    let isValid = false;
    if (process.env.NODE_ENV === 'development' && otp === '123456') {
      console.log(`⚠️  [DEV BYPASS] Universal OTP "123456" used. Bypassing Twilio verification.`);
      isValid = true;
    } else {
      isValid = await twilioVerifyOtp(normalizedPhone, otp);
    }

    if (!isValid) {
      console.warn(`❌ [OTP] Invalid/expired OTP for ${normalizedPhone}`);
      sendError(res, 'INVALID_OTP', 'Invalid or expired OTP code', null, 400);
      return;
    }
    console.log(`✅ [OTP] OTP verified for ${normalizedPhone}`);

    // Double-check phone not already registered (race condition guard)
    const phoneSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (!phoneSnapshot.empty) {
      console.warn(`⚠️  [OTP] Phone already registered (race condition): ${phone}`);
      sendError(res, 'CONFLICT', 'Phone number already registered', null, 409);
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email for Firebase Auth if not provided
    const userEmail = email || `user_${phone.replace(/\D/g, '')}@forsa.app`;

    // Create Firebase Auth user
    console.log(`👤 [OTP] Creating Firebase Auth user for ${normalizedPhone}...`);
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: userEmail,
        password,
        phoneNumber: normalizedPhone,
      });
      console.log(`✅ [OTP] Firebase user created — UID: ${firebaseUser.uid}`);
    } catch (firebaseError: any) {
      if (
        firebaseError.code === 'auth/email-already-exists' ||
        firebaseError.code === 'auth/phone-number-already-exists'
      ) {
        console.warn(`⚠️  [OTP] Firebase: user already exists — ${firebaseError.code}`);
        sendError(res, 'CONFLICT', 'User already exists', null, 409);
        return;
      }
      throw firebaseError;
    }

    // Save user document to Firestore
    console.log(`💾 [OTP] Saving user to Firestore — UID: ${firebaseUser.uid}`);
    const userData = {
      email: userEmail,
      phone,
      passwordHash,
      role,
      status: AccountStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection('users').doc(firebaseUser.uid).set(userData);
    console.log(`✅ [OTP] User saved to Firestore. Signup complete!`);

    // Generate JWT tokens
    const token = generateToken({ userId: firebaseUser.uid, email: userEmail, role });
    const refreshToken = generateRefreshToken({ userId: firebaseUser.uid, email: userEmail, role });

    sendSuccess(
      res,
      {
        user: {
          id: firebaseUser.uid,
          email: userEmail,
          phone,
          role,
          status: AccountStatus.PENDING,
        },
        token,
        refreshToken,
      },
      'User registered successfully',
      201
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input data', error.errors, 400);
      return;
    }
    console.error(`❌ [OTP] Error in verifyOtpAndRegister:`, error.message || error);
    next(error);
  }
}

export async function signin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = signinSchema.parse(req.body);
    const { email, phone, password } = validatedData;

    if (!email && !phone) {
      sendError(res, 'VALIDATION_ERROR', 'Email or phone is required', null, 400);
      return;
    }

    // Find user in Firestore
    let userDoc;
    if (email) {
      const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
      if (snapshot.empty) {
        sendError(res, 'UNAUTHORIZED', 'Invalid credentials', null, 401);
        return;
      }
      userDoc = snapshot.docs[0];
    } else if (phone) {
      const snapshot = await db.collection('users').where('phone', '==', phone).limit(1).get();
      if (snapshot.empty) {
        sendError(res, 'UNAUTHORIZED', 'Invalid credentials', null, 401);
        return;
      }
      userDoc = snapshot.docs[0];
    }

    if (!userDoc) {
      sendError(res, 'UNAUTHORIZED', 'Invalid credentials', null, 401);
      return;
    }

    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if account is suspended
    if (userData.status === AccountStatus.SUSPENDED || userData.status === AccountStatus.BANNED) {
      sendError(res, 'FORBIDDEN', 'Account is suspended or banned', null, 403);
      return;
    }

    // Verify password
    if (!userData.passwordHash) {
      // If password hash is missing, this user cannot login with password
      // This might happen for users created via social login incorrectly or data migration issues
      console.error(`Login failed: Missing passwordHash for user ${userId}`);
      sendError(res, 'UNAUTHORIZED', 'Invalid credentials', null, 401);
      return;
    }

    const isValidPassword = await comparePassword(password, userData.passwordHash);
    if (!isValidPassword) {
      sendError(res, 'UNAUTHORIZED', 'Invalid credentials', null, 401);
      return;
    }

    // Generate tokens
    const token = generateToken({
      userId,
      email: userData.email,
      role: userData.role,
    });

    const refreshToken = generateRefreshToken({
      userId,
      email: userData.email,
      role: userData.role,
    });

    sendSuccess(
      res,
      {
        user: {
          id: userId,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          status: userData.status,
        },
        token,
        refreshToken,
      },
      'Login successful'
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input data', error.errors, 400);
      return;
    }
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      sendError(res, 'VALIDATION_ERROR', 'Refresh token is required', null, 400);
      return;
    }

    const { verifyRefreshToken } = await import('../utils/jwt.util');
    const decoded = verifyRefreshToken(refreshToken);

    // Generate new tokens
    const token = generateToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    sendSuccess(
      res,
      {
        token,
        refreshToken: newRefreshToken,
      },
      'Token refreshed successfully'
    );
  } catch (error: any) {
    sendError(res, 'UNAUTHORIZED', 'Invalid refresh token', null, 401);
  }
}

export async function getMe(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const userDoc = await db.collection('users').doc(req.user.userId).get();
    if (!userDoc.exists) {
      sendError(res, 'NOT_FOUND', 'User not found', null, 404);
      return;
    }

    const userData = userDoc.data();
    sendSuccess(
      res,
      {
        id: userDoc.id,
        email: userData?.email,
        phone: userData?.phone,
        role: userData?.role,
        status: userData?.status,
        profilePhoto: userData?.profilePhoto,
        createdAt: userData?.createdAt,
        updatedAt: userData?.updatedAt,
      },
      'User retrieved successfully'
    );
  } catch (error) {
    _next(error);
  }
}

