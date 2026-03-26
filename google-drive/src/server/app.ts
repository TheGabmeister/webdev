import express from 'express';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './middleware/auth.js';
import { csrfMiddleware } from './middleware/csrf.js';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import storageRoutes from './routes/storage.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);
app.use(csrfMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/storage', storageRoutes);

export default app;
