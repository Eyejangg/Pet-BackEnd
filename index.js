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
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

// --- NUCLEAR DEBUG: DIRECT ROUTE INJECTION ---
const Booking = require('./models/Booking');
const Service = require('./models/Service');
const { protect } = require('./middlewares/authMiddleware');

app.put('/api/bookings/:id/cancel', protect, async (req, res) => {
    console.log('[NUCLEAR] Direct Route Hit:', req.params.id);
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking ID not found (Nuclear)' });

        // Ownership check
        if (booking.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: `Unauthorized. You: ${req.user.id}, Owner: ${booking.userId}` });
        }

        if (booking.status === 'Completed' || booking.status === 'Cancelled') {
            return res.status(400).json({ message: `Cannot cancel status: ${booking.status}` });
        }

        booking.status = 'Cancelled';
        await booking.save();
        await Service.findByIdAndUpdate(booking.serviceId, { isBooked: false });

        console.log('[NUCLEAR] Cancel Success');
        res.json({ message: 'Cancelled successfully (Nuclear)' });
    } catch (e) {
        console.error('[NUCLEAR] Error:', e);
        res.status(500).json({ message: 'Error (Nuclear)', error: e.message });
    }
});
// ---------------------------------------------

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
