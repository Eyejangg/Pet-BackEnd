const express = require('express');
const router = express.Router();
const {
    createBooking,
    getMyBookings,
    getProviderBookings,
    updateBookingStatus,
    getBookedDates,
    cancelBooking
} = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

// Debug Logger
router.use((req, res, next) => {
    console.log(`[BookingRouter] ${req.method} ${req.url}`);
    next();
});

router.route('/')
    .post(protect, createBooking);

console.log('Booking Routes Loaded: Cancellation Route /:id/cancel Registered');

router.route('/my-bookings')
    .get(protect, getMyBookings);

// New Routes for Provider
router.route('/provider-bookings')
    .get(protect, getProviderBookings);

// Specific ID Routes (Ordered carefully)
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/status', protect, updateBookingStatus);

router.route('/service/:serviceId/availability')
    .get(getBookedDates);

module.exports = router;
