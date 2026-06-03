const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const getUserFromHeader = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.userId).select('-password');
  } catch (err) {
    return null;
  }
};

// Auth routes
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    next(err);
  }
});

app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication token missing' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } });
  } catch (err) {
    res.status(401).json({ message: 'Authentication failed' });
  }
});

// Products
app.get('/api/products', async (req, res, next) => {
  try {
    const filters = {};
    const { category, minPrice, maxPrice, search } = req.query;
    if (category) filters.category = category;
    if (search) filters.title = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }
    const products = await Product.find(filters).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

app.post('/api/products', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

app.put('/api/products/:id', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Orders
app.post('/api/orders', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ message: 'Authentication required' });
    const { products, totalPrice } = req.body;
    if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ message: 'Order must include at least one product' });
    const order = await Order.create({ userId: user._id, products, totalPrice });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders/my', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ message: 'Authentication required' });
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const orders = await Order.find().populate('userId', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Users
app.get('/api/users', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

app.put('/api/users/:id/role', async (req, res, next) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Role must be either user or admin' });
    const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// minimal error handler
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ message: err.message || 'Internal Server Error' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Uzum Market Clone API is running' });
});

module.exports = app;
