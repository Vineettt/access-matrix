// Example Express-style routes for auto-loading demonstration
// This file contains various route patterns that should be detected

const express = require('express');
const router = express.Router();

// GET routes
router.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

router.get('/api/users/:id', (req, res) => {
  res.json({ user: req.params.id });
});

// POST routes  
router.post('/api/users', (req, res) => {
  res.status(201).json({ message: 'User created' });
});

router.post('/api/auth/login', (req, res) => {
  res.json({ token: 'jwt-token' });
});

// PUT routes
router.put('/api/users/:id', (req, res) => {
  res.json({ message: 'User updated' });
});

// DELETE routes
router.delete('/api/users/:id', (req, res) => {
  res.json({ message: 'User deleted' });
});

// PATCH routes
router.patch('/api/users/:id/profile', (req, res) => {
  res.json({ message: 'Profile updated' });
});

// Additional routes for testing
router.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

router.post('/webhooks/github', (req, res) => {
  res.json({ message: 'Webhook received' });
});

module.exports = router;
