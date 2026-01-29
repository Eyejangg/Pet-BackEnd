const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a service title'],
        trim: true
    },
    serviceTypes: {
        type: [String],
        enum: ['Pet Boarding', 'Pet Sitting', 'Dog Walking', 'Grooming', 'Training'],
        required: [true, 'Please select at least one service type']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    location: { // NEW FIELD
        type: String,
        required: [true, 'Please add a location (e.g. District, City)'],
        trim: true
    },
    image: {
        type: String, // Supabase URL
        required: [true, 'Please upload an image']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    isBooked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
