const multer = require('multer');
const supabase = require('../config/supabase');

// Use memory storage to get buffer for Supabase upload
const storage = multer.memoryStorage();

// Filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from('pawpal-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            throw error;
        }

        const { data: publicData } = supabase.storage
            .from('pawpal-images')
            .getPublicUrl(filePath);

        req.file.publicUrl = publicData.publicUrl;
        next();
    } catch (error) {
        console.error('Middleware Upload Error:', error);
        res.status(500).json({ message: 'Image upload failed' });
    }
};

module.exports = { upload, uploadImage };
