const router = require('express').Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    // 1. Check if user exists
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) return res.status(400).send('Email already exists');

    // 2. Hash password (security)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // 3. Create user
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword
    });
    const savedUser = await user.save();
    res.send({ user: savedUser._id });
  } catch (err) {
    res.status(400).send(err);
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    // 1. Check if email exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Email is not found');

    // 2. Check password
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(400).send('Invalid password');

    // 3. Create and assign token
    // ideally store 'SecretKey' in .env, but for now we use a string
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'SecretKey');
    res.header('auth-token', token).send({ token: token, userId: user._id, username: user.username });
    
  } catch (err) {
    res.status(400).send(err);
  }
});

module.exports = router; // <--- THIS EXPORT IS CRITICAL