const Service = require('../models/Service');
const Booking = require('../models/Booking');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
    try {
        const services = await Service.find()
            .populate('providerId', 'username') // Only populate username
            .sort({ createdAt: -1 })
            .limit(20); // Limit matched to Professor's code

        if (!services || services.length === 0) {
            return res.status(404).json({ message: 'No services found' });
        }

        // Filter out services where provider (author) is null
        const validServices = services.filter(service => service.providerId !== null);

        if (validServices.length === 0) {
            return res.status(404).json({ message: 'No valid services found' });
        }

        res.status(200).json(validServices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching services', error: error.message });
    }
};

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
    const { id } = req.params;
    try {
        const service = await Service.findById(id).populate('providerId', 'username');

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Check if provider exists
        if (!service.providerId) {
            return res.status(404).json({ message: 'Service provider not found' });
        }

        res.status(200).json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching service' });
    }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private
const createService = async (req, res) => {
    // 1. Check for Image Source (File or Raw URL)
    const hasFile = req.file && (req.file.supabaseUrl || req.file.publicUrl);
    const hasRawUrl = req.body.image && typeof req.body.image === 'string';

    if (!hasFile && !hasRawUrl) {
        return res.status(400).json({
            message: "Image is required. Please upload a file via multipart/form-data OR provide an 'image' URL string in raw JSON."
        });
    }


    try {
        const { title, price, location, description, serviceTypes } = req.body;
        // Use supabaseUrl OR raw URL
        const image = hasFile ? (req.file.supabaseUrl || req.file.publicUrl) : req.body.image;

        // Validation
        if (!title || !price || !location || !description || !serviceTypes) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        let parsedServiceTypes = serviceTypes;
        if (typeof serviceTypes === 'string') {
            try {
                parsedServiceTypes = JSON.parse(serviceTypes);
            } catch (e) {
                parsedServiceTypes = [serviceTypes];
            }
        }

        const service = await Service.create({
            providerId: req.authorId,
            title,
            serviceTypes: parsedServiceTypes,
            price,
            location,
            image,
            description
        });

        if (!service) {
            return res.status(500).json({ message: "Cannot create a new service" });
        }

        res.status(201).json(service);
    } catch (error) {
        console.error("Error in createService:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Owner)
const updateService = async (req, res) => {
    const { id } = req.params;
    const authorId = req.authorId;

    if (!id) {
        return res.status(400).json({ message: "Service Id is missing" });
    }

    try {
        // Find service AND check ownership in one query
        const service = await Service.findOne({ _id: id, providerId: authorId });

        if (!service) {
            return res.status(403).json({
                message: "Unauthorized: You are not the owner of this service or service not found"
            });
        }

        const { title, price, location, description, serviceTypes } = req.body;

        // Handle Image Update (Support both File Upload and Raw URL)
        let image = service.image; // Default to existing image

        if (req.file && (req.file.supabaseUrl || req.file.publicUrl)) {
            image = req.file.supabaseUrl || req.file.publicUrl;
        } else if (req.body.image) {
            image = req.body.image;
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

        // Use findOneAndUpdate to update
        const updatedService = await Service.findOneAndUpdate(
            { _id: id, providerId: authorId },
            {
                title: title || service.title,
                price: price || service.price,
                location: location || service.location,
                description: description || service.description,
                serviceTypes: parsedServiceTypes,
                image: image
            },
            { new: true }
        );

        if (!updatedService) {
            return res.status(500).json({ message: "Cannot update this service" });
        }

        res.status(200).json(updatedService);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error updating service', error: error.message });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Owner or Admin)
const deleteService = async (req, res) => {
    const { id } = req.params;
    const authorId = req.authorId;

    if (!id) return res.status(400).json({ message: "Service Id is missing" });

    try {
        // Find first to check ownership AND active bookings
        const service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Ownership check (or Admin)
        if (service.providerId.toString() !== authorId && req.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: You are not the owner of this service' });
        }

        // Check for active bookings
        const activeBookings = await Booking.countDocuments({
            serviceId: id,
            status: { $in: ['Pending', 'Confirmed'] }
        });

        if (activeBookings > 0) {
            return res.status(400).json({ message: 'Cannot delete service with active (Pending/Confirmed) bookings.' });
        }

        await service.deleteOne();

        // Cascade delete
        await Booking.deleteMany({ serviceId: id });

        res.status(200).json({ message: 'Service and associated bookings removed', data: service });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error deleting service' });
    }
};

module.exports = {
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService
};
