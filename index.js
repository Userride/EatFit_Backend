const express = require('express');
const dotenv = require('dotenv');
const mongoDB = require('./db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User'); // ✅ Import User model

dotenv.config({ path: './config.env' });

const app = express();
app.use(express.json());

// ✅ Allowed frontend URLs
const allowedOrigins = [
  "http://localhost:3000",
  "https://eat-fit-flame.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ✅ Express session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

// ✅ Initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

/* ----------------------------------------------------------------
   ✅ FIXED GOOGLE OAUTH STRATEGY — Reuses same MongoDB user if email exists
------------------------------------------------------------------ */
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, 
async (accessToken, refreshToken, profile, done) => {
  try {
    // 🧠 Find user by email first
    let user = await User.findOne({ email: profile.emails[0].value });

    if (!user) {
      // ✅ Create only if user doesn’t exist
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: '', // not needed for Google
        location: '',
        googleId: profile.id,
        avatar: profile.photos[0].value
      });
      console.log('✅ New Google user created:', user.email);
    } else {
      // ✅ If same email user exists (from normal signup), update googleId
      if (!user.googleId) {
        user.googleId = profile.id;
        user.avatar = profile.photos[0].value;
        await user.save();
      }
      console.log('✅ Existing user reused:', user.email);
    }

    return done(null, user);
  } catch (err) {
    console.error("❌ Google Auth Error:", err);
    return done(err, null);
  }
}));

/* ----------------------------------------------------------------
   ✅ GOOGLE AUTH ROUTES
------------------------------------------------------------------ */
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failure', session: true }),
  (req, res) => {
    const user = req.user;

    // ✅ Send user info + userId to frontend
    const redirectUrl = `${process.env.FRONTEND_URL}/google-login-success?` +
      `name=${encodeURIComponent(user.name)}&` +
      `email=${encodeURIComponent(user.email)}&` +
      `avatar=${encodeURIComponent(user.avatar || '')}&` +
      `userId=${user._id.toString()}`;

    console.log("✅ Google user logged in:", {
      name: user.name,
      email: user.email,
      userId: user._id
    });

    res.redirect(redirectUrl);
  }
);

app.get('/login-failure', (req, res) => res.send('Google login failed'));

/* ----------------------------------------------------------------
   ✅ API ROUTES
------------------------------------------------------------------ */
app.use('/api/orders', require('./Routes/orderRoutes'));
app.use('/api', require('./Routes/CreateUser'));
app.use('/api', require('./Routes/DisplayData'));

/* ----------------------------------------------------------------
   ✅ TEST ROUTE
------------------------------------------------------------------ */
app.get('/', (req, res) => res.send('🚀 EatFit Server Running'));

/* ----------------------------------------------------------------
   ✅ CONNECT MONGODB + SOCKET.IO SERVER
------------------------------------------------------------------ */
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

      socket.on('join_order', (orderId) => {
        socket.join(orderId);
        console.log(`📦 User joined room: ${orderId}`);
      });

      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });
    });

    server.listen(port, () => console.log(`✅ Server running on port ${port}`));
  })
  .catch((err) => console.error("❌ DB connection failed:", err));
