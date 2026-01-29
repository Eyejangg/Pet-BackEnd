const Service = require('../models/Service');
const Booking = require('../models/Booking');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
    try {
        const services = await Service.find()
            .populate('providerId', 'username') // Only populate username, no email
            .sort({ createdAt: -1 });
        res.status(200).json(services);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id).populate('providerId', 'username');
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.status(200).json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private
const createService = async (req, res) => {
    try {
        const { title, price, location, description, serviceTypes } = req.body;
        const image = req.file ? req.file.publicUrl : null;

        // Note: serviceTypes might come as a JSON string from FormData
        let parsedServiceTypes = serviceTypes;
        if (typeof serviceTypes === 'string') {
            try {
                parsedServiceTypes = JSON.parse(serviceTypes);
            } catch (e) {
                // If not JSON, maybe a single value or comma separated, but frontend sends JSON array string.
                parsedServiceTypes = [serviceTypes];
            }
        }

        if (!title || !price || !location || !description || !image || !parsedServiceTypes || parsedServiceTypes.length === 0) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        const service = await Service.create({
            providerId: req.user.id,
            title,
            serviceTypes: parsedServiceTypes,
            price,
            location,
            image,
            description
        });

        res.status(201).json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Owner)
const updateService = async (req, res) => {
    try {
        const { title, price, location, description, serviceTypes } = req.body;

        let service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Check ownership
        if (service.providerId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to update this service' });
        }

        // Handle Image Update
        let image = service.image;
        if (req.file) {
            image = req.file.publicUrl;
        }

        // Handle Service Types
        let parsedServiceTypes = service.serviceTypes;
        if (serviceTypes) {
            if (typeof serviceTypes === 'string') {
                try {
                    parsedServiceTypes = JSON.parse(serviceTypes);
                } catch (e) {
                    parsedServiceTypes = [serviceTypes];
                }
            } else {
                parsedServiceTypes = serviceTypes;
            }
        }

        service.title = title || service.title;
        service.price = price || service.price;
        service.location = location || service.location;
        service.description = description || service.description;
        service.serviceTypes = parsedServiceTypes;
        service.image = image;

        const updatedService = await service.save();
        res.status(200).json(updatedService);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error updating service' });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Owner or Admin)
const deleteService = async (req, res) => {
    try {
        console.log('Attempting to delete service:', req.params.id);
        const service = await Service.findById(req.params.id);

        if (!service) {
            console.log('Service not found in DB');
            return res.status(404).json({ message: 'Service not found' });
        }

        console.log('Service found:', service.title);
        // Check user ownership
        if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to delete this service' });
        }

        // Check for active bookings
        const activeBookings = await Booking.countDocuments({
            serviceId: req.params.id,
            status: { $in: ['Pending', 'Confirmed'] }
        });

        if (activeBookings > 0) {
            return res.status(400).json({ message: 'Cannot delete service with active (Pending/Confirmed) bookings.' });
        }

        await service.deleteOne();

        // Cascade delete
        await Booking.deleteMany({ serviceId: req.params.id });

        res.status(200).json({ message: 'Service and associated bookings removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService
};
