const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authJwt = require('../middlewares/authJwt');
const { upload, uploadToSupabase } = require('../middlewares/file.middleware'); // Assuming using Supabase middleware as per user preference

//http://localhost:5000/api/services
router.get(
    "",
    serviceController.getServices
);

//http://localhost:5000/api/services/:id
router.get(
    "/:id",
    serviceController.getServiceById
);

//http://localhost:5000/api/services
router.post(
    "",
    authJwt.verifyToken,
    upload,
    uploadToSupabase,
    serviceController.createService
);

//http://localhost:5000/api/services/:id
router.put(
    "/:id",
    authJwt.verifyToken,
    upload,
    uploadToSupabase,
    serviceController.updateService
);

//http://localhost:5000/api/services/:id
router.delete(
    "/:id",
    authJwt.verifyToken,
    serviceController.deleteService
);

module.exports = router;
