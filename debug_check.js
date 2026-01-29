const bookingController = require('./controllers/bookingController');

console.log('Exported keys from bookingController:', Object.keys(bookingController));

if (typeof bookingController.cancelBooking === 'function') {
    console.log('SUCCESS: cancelBooking is a function.');
} else {
    console.log('FAILURE: cancelBooking is NOT a function. type:', typeof bookingController.cancelBooking);
}
