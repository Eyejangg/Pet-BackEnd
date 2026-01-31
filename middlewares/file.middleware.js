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
    "⚠️  SUPABASE_SERVICE_ROLE_KEY is missing."
  );
}

// สร้าง Supabase client โดยใช้ Service Role Key เพื่อมีสิทธิ์อัพโหลดไฟล์
// (Anon Key มีสิทธิ์จำกัด ต้องใช้ Service Role Key ในการอัพโหลด)
const supabase = createClient(
  supabaseConfig.supabaseUrl || "http://mock-url.com", // Prevent crash if missing
  supabaseConfig.supabaseServiceRoleKey || supabaseConfig.supabaseAnonKey || "mock-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
const supabaseStorage = supabase.storage;

//========== Multer Configuration ==========
// Check where to store: disk (local) or memory (supabase)
const isLocal = !process.env.SUPABASE_SERVICE_ROLE_KEY;

let storage;
if (isLocal) {
    // Local Storage (Disk)
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/');
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
} else {
    // Supabase Storage (Memory)
    storage = multer.memoryStorage();
}

const upload = multer({
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
}).single("image"); // Client sends 'image' field

//========== Function: ตรวจสอบประเภทไฟล์ ==========
function checkFileType(file, cb) {
  const fileTypes = /jpeg|jpg|png|gif|webp/;
  const extName = fileTypes.test(
    path.extname(file.originalname).toLocaleLowerCase()
  );
  const mimetype = fileTypes.test(file.mimetype);

  if (mimetype && extName) {
    return cb(null, true);
  } else {
    cb(new Error("Error: Image files only (jpeg, jpg, png, gif, webp)"));
  }
}

//========== Middleware: Upload ไฟล์ไปยัง Supabase Storage ==========
async function uploadToSupabase(req, res, next) {
  if (!req.file) {
    next();
    return;
  }

  // --- LOCAL FALLBACK LOGIC ---
  if (isLocal) {
      const API_URL = process.env.VITE_API_URL || "http://localhost:5000";
      const localUrl = `${API_URL}/uploads/${req.file.filename}`;
      req.file.supabaseUrl = localUrl;
      req.file.publicUrl = localUrl;
      console.log("✓ File saved locally (No Supabase keys):", localUrl);
      return next();
  }
  // ----------------------------

  try {
    if (!supabaseConfig.supabaseUrl) {
      throw new Error("SUPABASE_URL is not configured in .env");
    }

    console.log(`🚀 Starting upload to bucket: ${bucketName}`);

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabaseStorage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (error) {
      console.error("Supabase error details:", JSON.stringify(error, null, 2));
      throw new Error(`Supabase error: ${error.message || JSON.stringify(error)}`);
    }

    const { data: publicData } = supabaseStorage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicData || !publicData.publicUrl) {
      throw new Error("Failed to generate public URL from Supabase");
    }

    req.file.supabaseUrl = publicData.publicUrl;
    req.file.publicUrl = publicData.publicUrl; // Add this line for compatibility with your Controller
    console.log("✓ File uploaded successfully:", req.file.supabaseUrl);
    next();
  } catch (error) {
    console.error("✗ Supabase upload error:", error.message);
    res.status(500).json({
      message: error.message || "Something went wrong while uploading to supabase",
    });
  }
}

module.exports = { upload, uploadToSupabase };
