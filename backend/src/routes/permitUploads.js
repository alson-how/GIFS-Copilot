import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/permits');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX, JPG, PNG files
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
  }
});

// Configure multer for insurance documents
const insuranceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/insurance');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `insurance-${timestamp}-${sanitizedName}`);
  }
});

const insuranceUpload = multer({
  storage: insuranceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
  }
});

// Upload permit document
router.post('/permit/:shipmentId/:permitType', upload.single('permit'), async (req, res) => {
  try {
    const { shipmentId, permitType } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📄 Uploading permit ${permitType} for shipment ${shipmentId}`);
    console.log(`📄 File: ${file.originalname} (${file.size} bytes)`);

    // Store file information in database
    const result = await pool.query(`
      INSERT INTO permit_uploads (
        shipment_id, permit_type, original_filename, file_path, 
        file_size, mime_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'uploaded')
      ON CONFLICT (shipment_id, permit_type) 
      DO UPDATE SET 
        original_filename = EXCLUDED.original_filename,
        file_path = EXCLUDED.file_path,
        file_size = EXCLUDED.file_size,
        mime_type = EXCLUDED.mime_type,
        upload_date = CURRENT_TIMESTAMP,
        status = 'uploaded'
      RETURNING *
    `, [
      shipmentId,
      permitType,
      file.originalname,
      file.path,
      file.size,
      file.mimetype
    ]);

    console.log(`✅ Permit ${permitType} uploaded successfully for shipment ${shipmentId}`);

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        shipment_id: shipmentId,
        permit_type: permitType,
        filename: file.originalname,
        upload_date: result.rows[0].upload_date,
        status: 'uploaded'
      }
    });

  } catch (error) {
    console.error('❌ Error uploading permit:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload permit'
    });
  }
});

// Upload insurance document
router.post('/insurance/:shipmentId', insuranceUpload.single('insurance'), async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { insuranceValue, currency } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📄 Uploading insurance document for shipment ${shipmentId}`);
    console.log(`📄 File: ${file.originalname} (${file.size} bytes)`);
    console.log(`💰 Insurance value: ${insuranceValue} ${currency || 'USD'}`);

    // Store file information in database
    const result = await pool.query(`
      INSERT INTO insurance_documents (
        shipment_id, original_filename, file_path, file_size, 
        mime_type, insurance_value, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded')
      RETURNING *
    `, [
      shipmentId,
      file.originalname,
      file.path,
      file.size,
      file.mimetype,
      insuranceValue || null,
      currency || 'USD'
    ]);

    console.log(`✅ Insurance document uploaded successfully for shipment ${shipmentId}`);

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        shipment_id: shipmentId,
        filename: file.originalname,
        insurance_value: insuranceValue,
        currency: currency || 'USD',
        upload_date: result.rows[0].upload_date,
        status: 'uploaded'
      }
    });

  } catch (error) {
    console.error('❌ Error uploading insurance document:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload insurance document'
    });
  }
});

// Get uploaded permits for a shipment
router.get('/permits/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id, permit_type, original_filename, file_size, 
        upload_date, status, validation_result
      FROM permit_uploads 
      WHERE shipment_id = $1 
      ORDER BY permit_type, upload_date DESC
    `, [shipmentId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching permits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permits'
    });
  }
});

// Get insurance documents for a shipment
router.get('/insurance/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id, original_filename, file_size, insurance_value, 
        currency, upload_date, status, validation_result
      FROM insurance_documents 
      WHERE shipment_id = $1 
      ORDER BY upload_date DESC
    `, [shipmentId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching insurance documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insurance documents'
    });
  }
});

// Delete permit upload
router.delete('/permit/:shipmentId/:permitType', async (req, res) => {
  try {
    const { shipmentId, permitType } = req.params;
    
    // Get file path before deleting from database
    const fileResult = await pool.query(`
      SELECT file_path FROM permit_uploads 
      WHERE shipment_id = $1 AND permit_type = $2
    `, [shipmentId, permitType]);
    
    if (fileResult.rows.length > 0) {
      const filePath = fileResult.rows[0].file_path;
      
      // Delete from database
      await pool.query(`
        DELETE FROM permit_uploads 
        WHERE shipment_id = $1 AND permit_type = $2
      `, [shipmentId, permitType]);
      
      // Delete physical file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      console.log(`🗑️ Deleted permit ${permitType} for shipment ${shipmentId}`);
      
      res.json({
        success: true,
        message: 'Permit deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Permit not found'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting permit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete permit'
    });
  }
});

export default router;
