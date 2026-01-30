// นำเข้า dependencies ที่จำเป็น
const multer = require("multer"); // ใช้จัดการ file upload
const path = require("path"); // ใช้จัดการ path ของไฟล์
const { createClient } = require("@supabase/supabase-js"); // Supabase SDK
const supabaseConfig = require("../config/supabase.config"); // Supabase configuration

// ดึงชื่อ bucket จาก .env
const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME;
const bucketName = process.env.SUPABASE_BUCKET_NAME || "blog-files"; // ใช้ default ถ้ายังไม่มี

// ตรวจสอบว่ามี Service Role Key หรือไม่
if (!supabaseConfig.supabaseServiceRoleKey) {
    console.warn(
        "⚠️  SUPABASE_SERVICE_ROLE_KEY is missing. Using SUPABASE_ANON_KEY instead (may have limited permissions)"
    );
}

// สร้าง Supabase client โดยใช้ Service Role Key เพื่อมีสิทธิ์อัพโหลดไฟล์
// (Anon Key มีสิทธิ์จำกัด ต้องใช้ Service Role Key ในการอัพโหลด)
const supabase = createClient(
    supabaseConfig.supabaseUrl,
    supabaseConfig.supabaseServiceRoleKey || supabaseConfig.supabaseAnonKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    }
);
const supabaseStorage = supabase.storage;

//========== Multer Configuration (Local Storage) ==========
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save to server/uploads
    },
    filename: function (req, file, cb) {
        // Create unique filename: timestamp-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    }
}).single("image");

//========== Function: ตรวจสอบประเภทไฟล์ ==========
function checkFileType(file, cb) {
    const fileTypes = /jpeg|jpg|png|gif|webp/;
    const extName = fileTypes.test(path.extname(file.originalname).toLocaleLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extName) {
        return cb(null, true);
    } else {
        cb(new Error("Error: Image files only (jpeg, jpg, png, gif, webp)"));
    }
}

//========== Middleware: Mock Supabase (For Local Storage) ==========
// This function mimics the Supabase middleware but just maps local file path to publicUrl
// so that controllers don't break.
async function uploadToSupabase(req, res, next) {
    if (!req.file) {
        next();
        return;
    }

    // Map local path to a URL accessible from frontend
    // Assuming backend runs on localhost:5000
    const API_URL = process.env.VITE_API_URL || "http://localhost:5000";
    // Construct local URL
    const localUrl = `${API_URL}/uploads/${req.file.filename}`;

    // Mock Supabase fields so controller doesn't need changes
    req.file.supabaseUrl = localUrl;
    req.file.publicUrl = localUrl;

    console.log("✓ File saved locally:", localUrl);
    next();
}

module.exports = { upload, uploadToSupabase };
