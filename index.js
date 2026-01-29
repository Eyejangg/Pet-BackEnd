const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Global Debug Logger
app.use((req, res, next) => {
    console.log(`[Global] Request: ${req.method} ${req.originalUrl}`);
    next();
});

// Static folder for local uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routers/user.router'));
app.use('/api/services', require('./routers/service.router'));
app.use('/api/bookings', require('./routers/booking.router'));


// ---------------------------------------------

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
