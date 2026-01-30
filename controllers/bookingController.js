const Booking = require('../models/Booking');
const Service = require('../models/Service');

// @desc    Create a new booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
    try {
        const { serviceId, bookingDate, petName, petType, petWeight, specialNotes } = req.body;

        if (!serviceId || !bookingDate || !petName || !petType || !petWeight) {
            return res.status(400).json({ message: 'Please provide all booking details' });
        }

        // Check for self-booking
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Owner cannot book own service
        if (service.providerId.toString() === req.authorId) {
            return res.status(400).json({ message: 'You cannot book your own service' });
        }

        // Check if date is already booked and confirmed
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

        if (!booking) {
            return res.status(500).json({ message: "Cannot create booking" });
        }

        res.status(201).json(booking);
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ message: 'Server Error creating booking', error: error.message });
    }
};

// @desc    Get logged in user bookings (My History as a Client)
// @route   GET /api/bookings/my-bookings
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.authorId })
            .populate('serviceId', 'title image')
            .sort({ bookingDate: -1 });

        if (!bookings) {
            return res.status(404).json({ message: "No bookings found" });
        }

        res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching history', error: error.message });
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
        res.status(500).json({ message: 'Server Error fetching provider bookings', error: error.message });
    }
};

// @desc    Update booking status (Approve/Reject)
// @route   PUT /api/bookings/:id/status
// @access  Private (Provider Only)
const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const authorId = req.authorId;

    if (!id) return res.status(400).json({ message: "Booking Id is missing" });

    try {
        const { status } = req.body;
        const booking = await Booking.findById(id).populate('serviceId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Determine Roles
        const isCustomer = String(booking.userId) === authorId;
        const isProvider = booking.serviceId && String(booking.serviceId.providerId) === authorId;

        if (!isProvider && !isCustomer) {
            return res.status(403).json({
                message: "Unauthorized: You are not associated with this booking"
            });
        }

        // 1. Customer can ONLY cancel
        if (isCustomer && !isProvider) {
            if (status !== 'Cancelled') {
                return res.status(403).json({ message: 'Customers can only cancel their own bookings' });
            }
        }

        // 2. Provider can do anything logic...

        booking.status = status;
        await booking.save();

        // Update Service Availability
        if (booking.serviceId) {
            if (status === 'Confirmed') {
                await Service.findByIdAndUpdate(booking.serviceId._id, { isBooked: true });
            }
            else if (['Cancelled', 'Rejected', 'Completed'].includes(status)) {
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
    const { id } = req.params;
    const authorId = req.authorId;

    if (!id) return res.status(400).json({ message: "Booking Id is missing" });

    try {
        // Use precise query to check ownership immediately (Professor's style)
        const booking = await Booking.findOne({ _id: id, userId: authorId });

        if (!booking) {
            // If not found by ID+User, check if it exists at all to give correct error
            const exists = await Booking.findById(id);
            if (!exists) return res.status(404).json({ message: 'Booking not found' });
            return res.status(403).json({ message: 'Unauthorized: You are not the owner of this booking' });
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
        res.status(500).json({ message: 'Server Error cancelling booking', error: error.message });
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
