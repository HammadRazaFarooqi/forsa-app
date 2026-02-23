import { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase';
import { sendSuccess, sendError } from '../utils/response.util';
import { createNotificationForUser } from '../utils/notification.util';
import { BookingStatus, BookingType } from '../types';
import { z } from 'zod';

// Validation schemas
const createBookingSchema = z.object({
  providerId: z.string().min(1),
  bookingType: z.nativeEnum(BookingType),
  serviceId: z.string().optional(),
  programId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().optional(),
  price: z.number().positive(),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
});

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 */
export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const validatedData = createBookingSchema.parse(req.body);
    const { providerId, bookingType, serviceId, programId, date, time, price, notes } = validatedData;

    // Check if provider exists
    const providerDoc = await db.collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      sendError(res, 'NOT_FOUND', 'Provider not found', null, 404);
      return;
    }

    const providerData = providerDoc.data();
    if (providerData?.role !== bookingType) {
      sendError(res, 'VALIDATION_ERROR', `Provider must be of type ${bookingType}`, null, 400);
      return;
    }

    // Check for double booking (same provider, same date/time)
    if (time) {
      const existingBookings = await db
        .collection('bookings')
        .where('providerId', '==', providerId)
        .where('date', '==', date)
        .where('time', '==', time)
        .where('status', 'in', ['requested', 'accepted'])
        .get();

      if (!existingBookings.empty) {
        sendError(res, 'CONFLICT', 'Time slot already booked', null, 409);
        return;
      }
    }

    // Create booking
    const bookingData = {
      userId: req.user.userId,
      providerId,
      bookingType,
      serviceId: serviceId || null,
      programId: programId || null,
      date,
      time: time || null,
      status: BookingStatus.REQUESTED,
      price,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const bookingRef = await db.collection('bookings').add(bookingData);

    sendSuccess(
      res,
      {
        id: bookingRef.id,
        ...bookingData,
      },
      'Booking created successfully',
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

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get user's bookings
 */
export async function getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const { status, type } = req.query;
    let query = db.collection('bookings').where('userId', '==', req.user.userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    if (type) {
      query = query.where('bookingType', '==', type);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    sendSuccess(res, bookings, 'Bookings retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 */
export async function getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const { id } = req.params;
    const bookingDoc = await db.collection('bookings').doc(id).get();

    if (!bookingDoc.exists) {
      sendError(res, 'NOT_FOUND', 'Booking not found', null, 404);
      return;
    }

    const bookingData = bookingDoc.data();
    // Check if user owns this booking or is the provider
    if (
      bookingData?.userId !== req.user.userId &&
      bookingData?.providerId !== req.user.userId
    ) {
      sendError(res, 'FORBIDDEN', 'Access denied', null, 403);
      return;
    }

    sendSuccess(
      res,
      {
        id: bookingDoc.id,
        ...bookingData,
      },
      'Booking retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   put:
 *     summary: Update booking status
 */
export async function updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const { id } = req.params;
    const validatedData = updateStatusSchema.parse(req.body);
    const { status } = validatedData;

    const bookingDoc = await db.collection('bookings').doc(id).get();

    if (!bookingDoc.exists) {
      sendError(res, 'NOT_FOUND', 'Booking not found', null, 404);
      return;
    }

    const bookingData = bookingDoc.data();

    // Only provider can update status
    if (bookingData?.providerId !== req.user.userId) {
      sendError(res, 'FORBIDDEN', 'Only provider can update booking status', null, 403);
      return;
    }

    // Validate status transition
    const currentStatus = bookingData?.status;
    if (currentStatus === BookingStatus.CANCELLED || currentStatus === BookingStatus.COMPLETED) {
      sendError(res, 'VALIDATION_ERROR', 'Cannot update cancelled or completed booking', null, 400);
      return;
    }

    // Update booking
    await db.collection('bookings').doc(id).update({
      status: status as BookingStatus,
      updatedAt: new Date(),
    });

    // Notify the booker about status change
    const bookerId = bookingData?.userId as string;
    const statusMessages: Record<string, { title: string; body: string }> = {
      [BookingStatus.ACCEPTED]: { title: 'Booking accepted', body: 'Your booking request has been accepted.' },
      [BookingStatus.REJECTED]: { title: 'Booking rejected', body: 'Your booking request was declined.' },
      [BookingStatus.COMPLETED]: { title: 'Booking completed', body: 'Your booking has been marked as completed.' },
    };
    const msg = statusMessages[status];
    if (bookerId && msg) {
      createNotificationForUser({
        userId: bookerId,
        title: msg.title,
        body: msg.body,
        type: 'booking',
        data: { bookingId: id, status },
        createdBy: req.user!.userId,
      }).catch((err) => console.error('Booking status notification failed:', err));
    }

    const updatedDoc = await db.collection('bookings').doc(id).get();

    sendSuccess(
      res,
      {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
      'Booking status updated successfully'
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input data', error.errors, 400);
      return;
    }
    next(error);
  }
}

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   put:
 *     summary: Cancel booking
 */
export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const { id } = req.params;
    const bookingDoc = await db.collection('bookings').doc(id).get();

    if (!bookingDoc.exists) {
      sendError(res, 'NOT_FOUND', 'Booking not found', null, 404);
      return;
    }

    const bookingData = bookingDoc.data();

    // User or provider can cancel
    if (
      bookingData?.userId !== req.user.userId &&
      bookingData?.providerId !== req.user.userId
    ) {
      sendError(res, 'FORBIDDEN', 'Access denied', null, 403);
      return;
    }

    // Cannot cancel already cancelled or completed bookings
    if (
      bookingData?.status === BookingStatus.CANCELLED ||
      bookingData?.status === BookingStatus.COMPLETED
    ) {
      sendError(res, 'VALIDATION_ERROR', 'Booking is already cancelled or completed', null, 400);
      return;
    }

    // Update booking
    await db.collection('bookings').doc(id).update({
      status: BookingStatus.CANCELLED,
      updatedAt: new Date(),
    });

    // Notify the other party about cancellation (booker or provider)
    const bookerId = bookingData?.userId as string;
    const providerId = bookingData?.providerId as string;
    const notifyUserId = req.user!.userId === bookerId ? providerId : bookerId;
    if (notifyUserId) {
      createNotificationForUser({
        userId: notifyUserId,
        title: 'Booking cancelled',
        body: 'A booking has been cancelled.',
        type: 'booking',
        data: { bookingId: id, status: 'cancelled' },
        createdBy: req.user!.userId,
      }).catch((err) => console.error('Booking cancel notification failed:', err));
    }

    const updatedDoc = await db.collection('bookings').doc(id).get();

    sendSuccess(
      res,
      {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
      'Booking cancelled successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/bookings/provider:
 *   get:
 *     summary: Get provider's bookings
 */
export async function getProviderBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
      return;
    }

    const { status } = req.query;
    let query = db.collection('bookings').where('providerId', '==', req.user.userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    sendSuccess(res, bookings, 'Provider bookings retrieved successfully');
  } catch (error) {
    next(error);
  }
}

