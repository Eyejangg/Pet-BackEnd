const express = require('express');
const router = express.Router();
const { getServices, getServiceById, createService, updateService, deleteService } = require('../controllers/serviceController');
const { protect } = require('../middlewares/authMiddleware');
const { upload, uploadImage } = require('../middlewares/uploadMiddlewareLocal');

router.route('/')
    .get(getServices)
    .post(protect, upload.single('image'), uploadImage, createService);

router.route('/:id')
    .get(getServiceById)
    .put(protect, upload.single('image'), uploadImage, updateService)
    .delete(protect, deleteService);

module.exports = router;
