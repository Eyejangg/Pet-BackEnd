const multer = require('multer');

// Configure Multer (No storage needed for mock, but we need to accept the file)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadImage = async (req, res, next) => {
    // Check if file exists
    if (!req.file) {
        return next();
    }

    console.log('Mock Upload: Skipping real Supabase upload.');

    // MOCK: Assign a random placeholder image instead of actually uploading
    // This allows the app to work without Supabase credentials
    const randomId = Math.floor(Math.random() * 1000);
    req.file.publicUrl = `https://picsum.photos/id/${randomId}/500/300`;

    next();
};

module.exports = { upload, uploadImage };
