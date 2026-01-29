const express = require('express');
const router = express.Router();
const { getServices, getServiceById, createService, updateService, deleteService } = require('../controllers/serviceController');
const { verifyToken } = require('../middlewares/authJwt');
const { upload, uploadImage } = require('../middlewares/uploadMiddlewareLocal');

router.route('/')
    .get(getServices)
    .post(verifyToken, upload.single('image'), uploadImage, createService);

router.route('/:id')
    .get(getServiceById)
    .put(verifyToken, upload.single('image'), uploadImage, updateService)
    .delete(verifyToken, deleteService);

module.exports = router;
