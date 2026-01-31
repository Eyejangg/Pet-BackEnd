const Booking = require('../models/Booking');
const Service = require('../models/Service');

//     สร้างการจองใหม่
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

        // 2. กฎเหล็ก: "ห้ามจองของตัวเอง"
        // ถ้าคนจอง (req.authorId) เป็นคนเดียวกับคนสร้าง Service (providerId) => ห้าม!
        if (service.providerId.toString() === req.authorId) {
            return res.status(400).json({ message: 'ไม่สามารถจองบริการของตนเองได้ (คุณเป็นเจ้าของบริการนี้)' });
        }

        // 3. กฎเหล็ก: "ห้ามจองซ้อน"
        // ไปค้นในตาราง Booking ว่า "มีใครจอง Service นี้ ในวันเวลานี้ไปแล้วหรือยัง?"
        // และสถานะต้องเป็น 'Confirmed' ด้วย (ถ้าแค่ Pending ยังจองได้ หรือรอคิวได้)
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

// @desc    ดึงประวัติการจองของผู้ใช้ (ฉันเป็นลูกค้า)
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

// @desc    ดึงรายการจองที่เข้ามาสำหรับบริการของฉัน (ฉันเป็นผู้ให้บริการ)
// @route   GET /api/bookings/provider-bookings
// @access  Private
const getProviderBookings = async (req, res) => {
    try {
        // 1. ค้นหาบริการทั้งหมดที่ฉันเป็นคนสร้าง
        const myServices = await Service.find({ providerId: req.authorId }).select('_id');

        // 2. ดึงเอาเฉพาะ ID ของบริการออกมา
        const serviceIds = myServices.map(s => s._id);

        // 3. ค้นหาการจองที่มี serviceId ตรงกับบริการของฉัน
        const bookings = await Booking.find({ serviceId: { $in: serviceIds } })
            .populate('userId', 'username') // ใครเป็นคนจอง?
            .populate('serviceId', 'title image') // จองบริการไหน?
            .sort({ createdAt: -1 });

        res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching provider bookings', error: error.message });
    }
};

// @desc    อัพเดทสถานะการจอง (อนุมัติ/ปฏิเสธ)
// @route   PUT /api/bookings/:id/status
// @access  Private (Provider Only)
const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const authorId = req.authorId;

    if (!id) return res.status(400).json({ message: "Booking Id is missing" });

    try {
        const { status } = req.body;
        // 1. หาใบจองนี้ในระบบก่อน
        const booking = await Booking.findById(id).populate('serviceId');
        if (!booking) {
            return res.status(404).json({ message: 'ไม่พบรายการจองนี้ (Booking not found)' });
        }

        // 2. ระบุตัวตน: "ใครเป็นคนเรียกใช้ API นี้?"
        const isCustomer = String(booking.userId) === authorId; // คนจอง?
        const isProvider = booking.serviceId && String(booking.serviceId.providerId) === authorId; // เจ้าของร้าน?

        if (!isProvider && !isCustomer) {
            return res.status(403).json({
                message: "Unauthorized: You are not associated with this booking"
            });
        }

        // 1. ลูกค้า (Customer) สามารถทำได้แค่ "ยกเลิก" เท่านั้น
        if (isCustomer && !isProvider) {
            if (status !== 'Cancelled') {
                return res.status(403).json({ message: 'Customers can only cancel their own bookings' });
            }
        }

        // 2. Provider can do anything logic...

        booking.status = status;
        await booking.save();

        // อัพเดทสถานะความว่างของ Service (Availability)
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

// @desc    ยกเลิกการจอง (สำหรับลูกค้า)
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Owner only)
const cancelBooking = async (req, res) => {
    const { id } = req.params;
    const authorId = req.authorId;

    // เช็คว่าส่ง ID มาไหม? ถ้าไม่ส่งก็จบเลย
    if (!id) return res.status(400).json({ message: "Booking Id is missing" });

    try {
        // 1. ค้นหาแบบ "เจาะจงเจ้าของ" (Best Practice ของอาจารย์) ✅
        // หา Booking ID นี้ โดยที่ userId ต้องตรงกับคน Login เท่านั้น
        // ถ้าหาเจอ แปลว่าเป็นเจ้าของตัวจริงชัวร์ๆ
        const booking = await Booking.findOne({ _id: id, userId: authorId });

        if (!booking) {
            // ถ้าหาไม่เจอ มี 2 กรณี:
            // ก. ไม่มี Booking นี้ในโลก -> 404 Not Found
            // ข. มี Booking แต่คุณไม่ใช่เจ้าของ -> 403 Forbidden
            const exists = await Booking.findById(id);
            if (!exists) return res.status(404).json({ message: 'ไม่พบรายการจองนี้' });
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ยกเลิกการจองของคนอื่น' });
        }

        // Check status
        if (booking.status === 'Completed' || booking.status === 'Cancelled') {
            return res.status(400).json({ message: `Cannot cancel booking with status: ${booking.status}` });
        }

        booking.status = 'Cancelled';
        await booking.save();

        // คืนค่าความว่างให้ Service (Revert Availability)
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
