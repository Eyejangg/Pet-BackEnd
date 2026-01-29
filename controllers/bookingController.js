const Booking = require('../models/Booking');
const Service = require('../models/Service');

// @desc    Create a new booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
    try {
        const { serviceId, bookingDate, petName, petType, petWeight, specialNotes } = req.body;

        if (!serviceId || !bookingDate || !petName || !petType || !petWeight) {
            return res.status(400).json({ message: 'Please details: petName, petType, petWeight, bookingDate' });
        }

        // Check for self-booking
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        if (service.providerId.toString() === req.authorId) {
            return res.status(400).json({ message: 'You cannot book your own service' });
        }

        // Check if date is already booked (Confirmed)
        // If status is "Pending", multiple can apply? User said "Must show someone booked it".
        // Let's block "Confirmed" strictly.
        // Actually, if it's "Confirmed" -> It's taken.
        const existingBooking = await Booking.findOne({
            serviceId,
            bookingDate: new Date(bookingDate),
            status: 'Confirmed'
        });

        if (existingBooking) {
            return res.status(400).json({ message: 'This date is already booked and confirmed.' });
        }

        const booking = await Booking.create({
            userId: req.authorId,
            serviceId,
            bookingDate,
            petName,
            petType,
            petWeight,
            specialNotes
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error creating booking' });
    }
};

// @desc    Get logged in user bookings (My History as a Client)
// @route   GET /api/bookings/my-bookings
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.authorId })
            .populate('serviceId', 'title image')
            .sort({ bookingDate: -1 });

        res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching history' });
    }
};

// @desc    Get bookings for my services (I am the Provider)
// @route   GET /api/bookings/provider-bookings
// @access  Private
const getProviderBookings = async (req, res) => {
    try {
        // 1. Find all services created by me
        const myServices = await Service.find({ providerId: req.authorId }).select('_id');

        // 2. Extract IDs
        const serviceIds = myServices.map(s => s._id);

        // 3. Find bookings that link to these services
        const bookings = await Booking.find({ serviceId: { $in: serviceIds } })
            .populate('userId', 'username') // Who booked it?
            .populate('serviceId', 'title image') // Which service?
            .sort({ createdAt: -1 });

        res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching provider bookings' });
    }
};

// @desc    Update booking status (Approve/Reject)
// @route   PUT /api/bookings/:id/status
// @access  Private (Provider Only)
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        console.log(`Update Status Request: ID=${req.params.id}, Status=${status}, User=${req.authorId}`);

        const booking = await Booking.findById(req.params.id).populate('serviceId');

        if (!booking) {
            console.log('Booking not found');
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Debug Logs
        console.log('Booking Data:', {
            bookingId: booking._id,
            bookingUserId: booking.userId,
            serviceId: booking.serviceId ? booking.serviceId._id : 'NULL',
            reqUserId: req.authorId
        });

        // Determine Roles
        const bookingUserId = String(booking.userId);
        const reqUserId = String(req.authorId);

        const isCustomer = bookingUserId === reqUserId;
        let isProvider = false;

        if (booking.serviceId) {
            // Check if providerId exists (it should)
            if (booking.serviceId.providerId) {
                isProvider = String(booking.serviceId.providerId) === reqUserId;
            }
        } else {
            console.log('Warning: Service for this booking seems to be deleted.');
        }

        console.log(`Debug Roles: Customer=${isCustomer} (${bookingUserId} vs ${reqUserId}), Provider=${isProvider}`);

        // Authorization Logic
        if (!isProvider && !isCustomer) {
            console.log('Unauthorized: Not Provider and Not Customer');
            // Return verbose error for debugging
            return res.status(401).json({
                message: `Not authorized. You are not the owner or provider. MyID: ${reqUserId}, OwnerID: ${bookingUserId}`
            });
        }

        // Specific Rules
        // 1. Customer can ONLY cancel
        if (isCustomer && !isProvider) {
            if (status !== 'Cancelled') {
                console.log('Unauthorized: Customer tried to set non-Cancelled status');
                return res.status(401).json({ message: 'Customers can only cancel their own bookings' });
            }
        }

        // 2. Provider can do anything (Confirm, Reject, Complete, Cancel)
        // (Logic allows it)

        booking.status = status;
        await booking.save();

        // Single-Use Logic (Only if Service exists)
        if (booking.serviceId) {
            if (status === 'Confirmed') {
                await Service.findByIdAndUpdate(booking.serviceId._id, { isBooked: true });
            }
            else if (status === 'Cancelled' || status === 'Rejected' || status === 'Completed') {
                await Service.findByIdAndUpdate(booking.serviceId._id, { isBooked: false });
            }
        }

        res.status(200).json(booking);
    } catch (error) {
        console.error('Error in updateBookingStatus:', error);
        res.status(500).json({ message: 'Server Error updating status', error: error.message });
    }
};

const getBookedDates = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const bookings = await Booking.find({
            serviceId,
            status: 'Confirmed'
        }).select('bookingDate');

        const dates = bookings.map(b => b.bookingDate);
        res.status(200).json(dates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching availability' });
    }
};

// @desc    Cancel booking (Customer)
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Owner only)
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking ID not found in database' });
        }

        // Check ownership
        if (booking.userId.toString() !== req.authorId) {
            return res.status(401).json({ message: 'Not authorized to cancel this booking' });
        }

        // Check status
        if (booking.status === 'Completed' || booking.status === 'Cancelled') {
            return res.status(400).json({ message: `Cannot cancel booking with status: ${booking.status}` });
        }

        booking.status = 'Cancelled';
        await booking.save();

        // Revert Service Availability
        await Service.findByIdAndUpdate(booking.serviceId, { isBooked: false });

        res.status(200).json({ message: 'Booking cancelled successfully', booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error cancelling booking' });
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getProviderBookings,
    updateBookingStatus,
    getBookedDates,
    cancelBooking
};
