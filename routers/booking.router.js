const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authJwt = require('../middlewares/authJwt');

//http://localhost:5000/api/bookings
router.post(
    "",
    authJwt.verifyToken,
    bookingController.createBooking
);

//http://localhost:5000/api/bookings/my-bookings
router.get(
    "/my-bookings",
    authJwt.verifyToken,
    bookingController.getMyBookings
);

//http://localhost:5000/api/bookings/provider-bookings
router.get(
    "/provider-bookings",
    authJwt.verifyToken,
    bookingController.getProviderBookings
);

//http://localhost:5000/api/bookings/:id/cancel
router.put(
    "/:id/cancel",
    authJwt.verifyToken,
    bookingController.cancelBooking
);

//http://localhost:5000/api/bookings/:id/status
router.put(
    "/:id/status",
    authJwt.verifyToken,
    bookingController.updateBookingStatus
);

//http://localhost:5000/api/bookings/service/:serviceId/availability
router.get(
    "/service/:serviceId/availability",
    bookingController.getBookedDates
);

module.exports = router;
