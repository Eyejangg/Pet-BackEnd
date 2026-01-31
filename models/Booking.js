const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    bookingDate: {
        type: Date,
        required: [true, 'Please select a date']
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rejected'],
        default: 'Pending'
    },
    // รายละเอียดสัตว์เลี้ยง (บังคับกรอก)
    petName: {
        type: String,
        required: [true, 'Please add pet name']
    },
    petType: {
        type: String,
        enum: ['Dog', 'Cat', 'Other'],
        required: [true, 'Please select pet type']
    },
    petWeight: {
        type: Number,
        required: [true, 'Please add pet weight']
    },
    specialNotes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
