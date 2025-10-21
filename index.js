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

// ✅ CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "https://eat-fit-flame.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
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
        password: '',
        location: '',
        googleId: profile.id,
        avatar: profile.photos[0].value
      });
      console.log('✅ New Google user created:', user.email);
    } else {
      console.log('✅ Existing user logged in:', user.email);
    }

    return done(null, user);
  } catch (err) {
    console.error("❌ Google Auth Error:", err);
    return done(err, null);
  }
}));

// ✅ Google Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failure', session: true }),
  (req, res) => {
    const user = req.user;
    res.redirect(`${process.env.FRONTEND_URL}/google-login-success?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&avatar=${encodeURIComponent(user.avatar)}`);
  }
);
// ✅ Google Auth routes
app.get(
  '/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' // ✅ Forces user to choose or sign in again every time
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failure', session: true }),
  (req, res) => {
    const user = req.user;
    res.redirect(
      `${process.env.FRONTEND_URL}/google-login-success?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&avatar=${encodeURIComponent(user.avatar)}`
    );
  }
);



app.get('/login-failure', (req, res) => res.send('Login failed'));

// ✅ API routes
app.use('/api/orders', require('./Routes/orderRoutes'));
app.use('/api', require('./Routes/CreateUser'));
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
