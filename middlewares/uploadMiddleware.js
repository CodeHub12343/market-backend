/* const multer = require('multer');
const AppError = require('../utils/appError');
const fileHandler = require('../utils/fileHandler');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Configure multer storage to use memory storage
const storage = multer.memoryStorage();

// Configure multer storage
const storage = multer.memoryStorage();

// Multer filter with enhanced validation
const multerFilter = (req, file, cb) => {
  try {
    // Log incoming file details
    console.log('Multer receiving file:', {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Accept all image types for now
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    
    cb(new AppError('Please upload only image files.', 400), false);
  } catch (err) {
    cb(new AppError(err.message || 'Error processing file', 400), false);
  }
};

// Create multer upload instance with improved configuration
const upload = multer({
  storage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size, will be further restricted by file type
    files: 10 // Maximum number of files per request
  }
});

// Single file upload middleware
exports.uploadSingle = (fieldName, fileTypes = ['image']) => {
  return [
    // Set allowed file types
    (req, res, next) => {
      req.fileTypes = fileTypes;
      next();
    },
    // Handle file upload
    upload.single(fieldName),
    // Process and optimize uploaded file
    async (req, res, next) => {
      try {
        if (!req.file) return next();

        const result = await fileHandler.uploadFile(req.file, {
          folder: req.uploadFolder || 'uploads',
          allowedTypes: fileTypes,
          generateThumbnail: req.generateThumbnail || false,
          optimizationLevel: req.optimizationLevel || 'medium',
          tags: req.uploadTags || []
        });

        req.file = result;
        next();
      } catch (err) {
        next(new AppError(err.message, err.statusCode || 500));
      }
    }
  ];
};

// Multiple files upload middleware
exports.uploadMultiple = (fieldName, maxCount = 5, fileTypes = ['image']) => {
  return [
    // Handle files upload with memory storage
    upload.array(fieldName, maxCount),
    // Process uploaded files
    async (req, res, next) => {
      try {
        // If no files, continue
        if (!req.files?.length) {
          return next();
        }

        console.log('Processing files:', req.files.map(f => ({
          size: f.size,
          type: f.mimetype,
          name: f.originalname
        })));

        // Process each file using dataUri
        const uploadPromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            if (!file.buffer) {
              return reject(new Error('File buffer is missing'));
            }

            console.log('Uploading file:', {
              fileExists: !!file,
              hasBuffer: !!file.buffer,
              mimetype: file.mimetype
            });

            // Convert buffer to base64
            const b64 = Buffer.from(file.buffer).toString('base64');
            const dataURI = `data:${file.mimetype};base64,${b64}`;

            // Upload to cloudinary
            cloudinary.uploader.upload(dataURI, {
              folder: 'products',
              resource_type: 'auto'
            }, (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            });
          });
        });

        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);
        
        console.log('Upload results:', results.map(r => ({
          success: !!r.secure_url,
          type: r.resource_type
        })));

        // Add upload results to request
        req.uploadedFiles = results.map(result => ({
          url: result.secure_url,
          public_id: result.public_id
        }));

        next();
      } catch (err) {
        next(new AppError(err.message || 'File upload failed', 400));
      }
    },
    // Process and optimize uploaded files
    async (req, res, next) => {
      try {
        if (!req.files?.length) return next();

        // Convert files to the format expected by cloudinary
        const files = req.files.map(file => ({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size
        }));

        console.log('Processing files:', files.map(f => ({
          size: f.size,
          type: f.mimetype,
          name: f.originalname
        })));

        const results = await Promise.all(files.map(file => 
          fileHandler.uploadFile(file, {
            folder: 'products',
            allowedTypes: ['image'],
            generateThumbnail: false
          })
        ));

        req.files = results;
        next();
      } catch (err) {
        next(new AppError(err.message, err.statusCode || 500));
      }
    }
  ];
};

// Cleanup middleware for error handling
exports.cleanupOnError = async (err, req, res, next) => {
  if (err) {
    await fileHandler.cleanupFiles();
  }
  next(err);
};

// Schedule periodic cleanup of orphaned files (run this in your app initialization)
exports.scheduleOrphanedFilesCleanup = async () => {
  // Models that contain file references
  const models = {
    Product: require('../models/productModel'),
    User: require('../models/userModel'),
    Service: require('../models/serviceModel'),
    Post: require('../models/postModel')
  };

  // Run cleanup every 24 hours
  setInterval(async () => {
    try {
      console.log('Starting scheduled orphaned files cleanup...');
      
      // Collect all active public_ids from different models
      const activePublicIds = await Promise.all(
        Object.values(models).map(async Model => {
          const docs = await Model.find().select('images images_meta');
          return docs.reduce((ids, doc) => {
            if (doc.images) ids.push(...doc.images.map(img => img.public_id));
            if (doc.images_meta) ids.push(...doc.images_meta.map(img => img.public_id));
            return ids;
          }, []);
        })
      );

      // Flatten and deduplicate public_ids
      const uniqueActiveIds = [...new Set(activePublicIds.flat())];

      // Cleanup orphaned files
      const cleanedCount = await fileHandler.cleanupOrphanedFiles('uploads', uniqueActiveIds);
      console.log(`Orphaned files cleanup completed. Removed ${cleanedCount} files.`);
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run every 24 hours
}; */

const multer = require('multer');
const AppError = require('../utils/appError');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Configure multer storage
const storage = multer.memoryStorage();

// Create multer upload instance
const multerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max number of files
  }
});

// Cloudinary upload helper
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.buffer) {
      return reject(new Error('No file buffer available'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'products',
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Create a readable stream from buffer and pipe to upload
    const bufferStream = Readable.from(file.buffer);
    bufferStream.pipe(uploadStream);
  });
};

// Single file upload middleware
exports.uploadSingle = (fieldName) => {
  return [
    // Handle initial file upload
    (req, res, next) => {
      multerUpload.single(fieldName)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return next(new AppError(`Upload error: ${err.message}`, 400));
        } else if (err) {
          return next(new AppError(err.message || 'Upload failed', 400));
        }
        next();
      });
    },

    // Process and upload to cloudinary
    async (req, res, next) => {
      try {
        // Skip if no file
        if (!req.file) {
          return next();
        }

        // Skip if already processed
        if (req.uploadedFile) {
          return next();
        }

        console.log('Processing single file for upload...');

        // Upload file to cloudinary
        const result = await uploadToCloudinary(req.file);

        // Store upload result
        req.uploadedFile = {
          url: result.secure_url,
          public_id: result.public_id
        };

        console.log('Successfully uploaded file');
        next();
      } catch (error) {
        next(new AppError(error.message || 'Failed to process upload', 400));
      }
    }
  ];
};

// Multiple files upload middleware
exports.uploadMultiple = (fieldName, maxCount = 5) => {
  return [
    // Handle initial file upload
    (req, res, next) => {
      multerUpload.array(fieldName, maxCount)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return next(new AppError(`Upload error: ${err.message}`, 400));
        } else if (err) {
          return next(new AppError(err.message || 'Upload failed', 400));
        }
        next();
      });
    },

    // Process and upload to cloudinary
    async (req, res, next) => {
      try {
        // Skip if no files
        if (!req.files?.length) {
          return next();
        }

        // Skip if already processed
        if (req.uploadedFiles) {
          return next();
        }

        console.log(`Processing ${req.files.length} files for upload...`);

        // Upload all files to cloudinary
        const uploadPromises = req.files.map(file => uploadToCloudinary(file));
        const results = await Promise.all(uploadPromises);

        // Store upload results
        req.uploadedFiles = results.map(result => ({
          url: result.secure_url,
          public_id: result.public_id
        }));

        console.log(`Successfully uploaded ${req.uploadedFiles.length} files`);
        next();
      } catch (error) {
        next(new AppError(error.message || 'Failed to process uploads', 400));
      }
    }
  ];
};

// Cleanup on error
exports.cleanupOnError = async (err, req, res, next) => {
  try {
    if (err) {
      // Cleanup single file
      if (req.uploadedFile?.public_id) {
        await cloudinary.uploader.destroy(req.uploadedFile.public_id);
        console.log('Cleaned up single uploaded file due to error');
      }
      
      // Cleanup multiple files
      if (req.uploadedFiles?.length) {
        await Promise.all(
          req.uploadedFiles.map(file =>
            cloudinary.uploader.destroy(file.public_id)
          )
        );
        console.log('Cleaned up multiple uploaded files due to error');
      }
    }
  } catch (cleanupError) {
    console.error('Failed to cleanup files:', cleanupError);
  }
  next(err);
};