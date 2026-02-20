import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler.middleware';
import { authRateLimiter } from './middleware/rateLimit.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import bookingRoutes from './routes/booking.routes';
import adminRoutes from './routes/admin.routes';
import otpRoutes from './routes/otp.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------------------- Swagger Config ---------------------------- */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Forsa App API',
      version: '1.0.0',
      description: `
# Forsa App Backend API – Checkpoint 1 ✅

## Authentication
Signin / Signup supports:
- Email + Password
- Phone + Password

JWT must be sent as:
\`\`\`
Authorization: Bearer <token>
\`\`\`
`,
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${PORT}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },

      schemas: {
        /* -------------------- AUTH SCHEMAS -------------------- */
        SignInRequest: {
          oneOf: [
            {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' },
              },
            },
            {
              type: 'object',
              required: ['phone', 'password'],
              properties: {
                phone: { type: 'string' },
                password: { type: 'string' },
              },
            },
          ],
        },

        /* -------------------- USER -------------------- */
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            role: {
              type: 'string',
              enum: ['player', 'agent', 'academy', 'parent', 'clinic', 'admin'],
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'suspended'],
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        /* -------------------- BOOKING -------------------- */
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            providerId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['requested', 'accepted', 'rejected', 'cancelled', 'completed'],
            },
            date: { type: 'string' },
            time: { type: 'string' },
            price: { type: 'number' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication' },
      { name: 'Users' },
      { name: 'Bookings' },
      { name: 'Admin' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/* ---------------------------- Middlewares ---------------------------- */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/* ---------------------------- Swagger UI ---------------------------- */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ---------------------------- Health Check ---------------------------- */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* ---------------------------- Routes ---------------------------- */
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/otp', otpRoutes);

/* ---------------------------- 404 ---------------------------- */
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found' },
  });
});

/* ---------------------------- Error Handler ---------------------------- */
app.use(errorHandler);

/* ---------------------------- Server ---------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📘 Swagger: http://localhost:${PORT}/api-docs`);
});

export default app;
