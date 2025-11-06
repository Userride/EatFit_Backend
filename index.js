const express = require('express');
const dotenv = require('dotenv');
const mongoDB = require('./db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');
const jwt = require('jsonwebtoken'); // <-- *** 1. IMPORT JWT ***

dotenv.config({ path: './config.env' });

// --- *** 2. DEFINE YOUR JWT SECRET (Must match userRoutes.js) *** ---
const JWT_SECRET = process.env.JWT_SECRET || 'qwertyuiopasdfghjklzxcvbnbnm'; 

const app = express();
app.use(express.json());

// ✅ CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "https://eat-fit-flame.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// ✅ Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

// ✅ Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ✅ Google OAuth Strategy with DB integration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, 
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({ email: profile.emails[0].value });

    if (!user) {
      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: '', // No password for OAuth users
        location: '',
        googleId: profile.id,
        avatar: profile.photos[0].value
      });
      console.log('✅ New Google user created:', user.email);
    } else {
      console.log('✅ Existing user logged in:', user.email);
    }

    return done(null, user); // user object (from DB) is passed to req.user
  } catch (err) {
    console.error("❌ Google Auth Error:", err);
    return done(err, null);
  }
}));

// ✅ Google Auth routes
app.get(
  '/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' 
  })
);

// --- *** 3. THIS IS THE CORRECTED CALLBACK *** ---
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failure', session: true }),
  (req, res) => {
    // req.user is now the full user object from our database
    const user = req.user;

    // Create a JWT payload just like in your email login
    const data = {
      user: {
        id: user.id // or user._id
      }
    };

    // Sign the token
    const authToken = jwt.sign(data, JWT_SECRET);
    const userId = user.id; // or user._id

    // Redirect to the frontend with the REAL authToken and userId
    res.redirect(
      `${process.env.FRONTEND_URL}/google-login-success?authToken=${authToken}&userId=${userId}`
    );
  }
);
// --------------------------------------------------

app.get('/login-failure', (req, res) => res.send('Login failed'));

// ✅ API routes
// (Assuming your CreateUser.js file is actually named userRoutes.js)
app.use('/api/orders', require('./Routes/orderRoutes'));
app.use('/api', require('./Routes/userRoutes')); // Using the file you provided
app.use('/api', require('./Routes/DisplayData'));

// ✅ Test route
app.get('/', (req, res) => res.send('🚀 EatFit Server Running'));

// ✅ Connect MongoDB + Socket.io
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
