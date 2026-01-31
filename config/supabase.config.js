// โหลดตัวแปร environment จากไฟล์ .env
require("dotenv").config();

// สร้างอ็อบเจ็กต์เก็บค่า Supabase configuration
const supabaseConfig = {
  supabaseUrl: process.env.SUPABASE_URL, // URL ของ Supabase project
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY, // Public key (สำหรับ client-side)
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Secret key (สำหรับ server-side, มีสิทธิ์เต็ม)
};

// ตรวจสอบว่า SUPABASE_URL มีค่าใน .env หรือไม่
if (!supabaseConfig.supabaseUrl) {
  console.error("SUPABASE_URL is missing. Please set it in your .env file");
}

// ตรวจสอบว่า SUPABASE_ANON_KEY มีค่าใน .env หรือไม่
if (!supabaseConfig.supabaseAnonKey) {
  console.error(
    "SUPABASE_ANON_KEY is missing. Please set it in your .env file"
  );
}

// Export config ให้ไฟล์อื่นสามารถ import ใช้งานได้
module.exports = supabaseConfig;
