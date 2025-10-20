// server.js
const express = require('express');
const dotenv = require('dotenv');
const mongoDB = require('./db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

dotenv.config({ path: './config.env' });

const app = express();
app.use(express.json());

// ✅ CORS for both local dev and deployed frontend
const allowedOrigins = [
  "http://localhost:3000",
  "https://eat-fit-flame.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ✅ Express session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ✅ Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  const user = {
    googleId: profile.id,
    name: profile.displayName,
    email: profile.emails[0].value,
    avatar: profile.photos[0].value
  };
  return done(null, user);
}));

// ✅ Google auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login-failure', session: true }), (req, res) => {
  const user = req.user;
  res.redirect(`${process.env.FRONTEND_URL}/google-login-success?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&avatar=${encodeURIComponent(user.avatar)}`);
});

app.get('/login-failure', (req, res) => res.send('Login failed'));

// ✅ API routes
app.use('/api/orders', require('./Routes/orderRoutes'));
app.use('/api', require('./Routes/CreateUser'));
app.use('/api', require('./Routes/DisplayData'));

// ✅ Test route
app.get('/', (req, res) => res.send('🚀 EatFit Server Running'));

// ✅ Database + Socket.io
mongoDB()
  .then(() => {
    const port = process.env.PORT || 5000;
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    app.set('io', io);

    io.on('connection', (socket) => {
      console.log('✅ New client connected:', socket.id);
      socket.on('join_order', (orderId) => socket.join(orderId));
      socket.on('disconnect', () => console.log('❌ Client disconnected:', socket.id));
    });

    server.listen(port, () => console.log(`✅ Server running on port ${port}`));
  })
  .catch((err) => console.error("❌ DB connection failed:", err));
