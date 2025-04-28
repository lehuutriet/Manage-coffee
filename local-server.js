import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Base upload directory
const UPLOAD_DIR = 'D:\\data_upload';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper function to normalize file/folder names
// Helper function to normalize file/folder names
const normalizeFileName = (name) => {
  return removeVietnameseTones(name).toLowerCase();
};

function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    
    // Replace multiple spaces with a single underscore
    str = str.replace(/\s+/g, "_");
    // Replace existing hyphens with underscore
    str = str.replace(/-/g, "_");
    // Replace multiple underscores with a single underscore
    str = str.replace(/_+/g, "_");
    
    return str;
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Decode tên file từ UTF-8
    const decodedName = Buffer.from(file.originalname, 'binary').toString('utf8');
    
    let relativePath = '';
    if (decodedName.includes('/')) {
      relativePath = decodedName.substring(0, decodedName.lastIndexOf('/'));
      relativePath = relativePath.split('/').map(normalizeFileName).join('/');
    }

    const uploadPath = path.join(UPLOAD_DIR, relativePath);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Decode tên file từ UTF-8 
    const decodedName = Buffer.from(file.originalname, 'binary').toString('utf8');
    
    const originalName = decodedName.includes('/') 
      ? decodedName.substring(decodedName.lastIndexOf('/') + 1)
      : decodedName;

    // Giữ nguyên phần mở rộng file
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    
    // Normalize tên file và giữ nguyên phần mở rộng
    const normalizedName = normalizeFileName(nameWithoutExt) + ext;
    
    cb(null, normalizedName);
  }
});

const upload = multer({ 
  storage: storage,
  preservePath: true
});

// Handle file upload
// Trong local-server.js, sửa lại phần response của route /upload
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Tính toán relative path từ upload
    const uploadRelativePath = req.file.originalname.includes('/') 
      ? req.file.originalname 
      : req.file.filename;

    // Tính toán server path
    const serverPath = req.file.path.replace(UPLOAD_DIR + '\\', '');
    
    res.json({
      success: true,
      file: {
       path: req.body.originalPath, // Path tương đối từ phía upload
        localPath: serverPath,    // Path tương đối từ phía server
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Local file server running on port ${PORT}`);
  console.log(`Files will be uploaded to: ${UPLOAD_DIR}`);
});