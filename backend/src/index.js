require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('./config/passport');
const helmet = require('helmet');

const { setupSocket } = require('./socket');
const { startScheduler } = require('./services/scheduler');

const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const transactionsRoutes = require('./routes/transactions');
const categoriesRoutes = require('./routes/categories');
const reportsRoutes = require('./routes/reports');
const pushRoutes = require('./routes/push');
const friendsRoutes = require('./routes/friends');
const messagesRoutes = require('./routes/messages');
const sharesRoutes = require('./routes/shares');
const commentsRoutes = require('./routes/comments');
const profileRoutes = require('./routes/profile');
const achievementsRoutes = require('./routes/achievements');
const debugRoutes = require('./routes/debug');
const framesRoutes = require('./routes/frames');

const app = express();
const server = http.createServer(app);

// CSP, разрешающий всё необходимое
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const prodOrigin = process.env.CLIENT_URL || 'https://useful-notes-ai.vercel.app';
const extraOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const allowedOrigins = [
  prodOrigin,
  ...extraOrigins,
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000',
  ] : []),
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use(session({
  secret: process.env.JWT_ACCESS_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/shares', sharesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/frames', framesRoutes);

setupSocket(io);
startScheduler();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));