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
const { verifyToken } = require('../middlewares/authJwt');

// Debug Logger
router.use((req, res, next) => {
    console.log(`[BookingRouter] ${req.method} ${req.url}`);
    next();
});

router.route('/')
    .post(verifyToken, createBooking);

console.log('Booking Routes Loaded: Cancellation Route /:id/cancel Registered');

router.route('/my-bookings')
    .get(verifyToken, getMyBookings);

// New Routes for Provider
router.route('/provider-bookings')
    .get(verifyToken, getProviderBookings);

// Specific ID Routes (Ordered carefully)
// Ensure :id doesn't catch "my-bookings" if defined after
router.put('/:id/cancel', verifyToken, cancelBooking);
router.put('/:id/status', verifyToken, updateBookingStatus);

router.route('/service/:serviceId/availability')
    .get(getBookedDates);

module.exports = router;
