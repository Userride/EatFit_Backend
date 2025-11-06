const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import the User model
const { body, validationResult } = require('express-validator'); // Import validation functions
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for JWT

const JWT_SECRET = process.env.JWT_SECRET || 'qwertyuiopasdfghjklzxcvbnbnm'; // Secret key

// **Signup Endpoint**
router.post(
  '/createuser',
  [
    body('name').isLength({ min: 5 }).withMessage('Name must be at least 5 characters long'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if the user already exists
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({ errors: [{ msg: 'Email is already registered.' }] });
      }

      // Hash the password and create a new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        location: req.body.location || '',
      });

      // Generate a JWT token
      const data = { user: { id: user.id } };
      const authToken = jwt.sign(data, JWT_SECRET);

      // *** FIX: Send back the userId along with the token ***
      res.status(201).json({ success: true, authToken, userId: user.id });

    } catch (error) {
      console.error('Error during signup:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);


// **Login Endpoint**
router.post(
  '/loginuser',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ errors: 'Invalid email or password.' });
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ errors: 'Invalid email or password.' });
      }

      // Generate JWT token
      const data = { user: { id: user.id } };
      const authToken = jwt.sign(data, JWT_SECRET);

      // *** FIX: Send back the userId along with the token ***
      res.status(200).json({ success: true, authToken, userId: user.id });

    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

module.exports = router;
