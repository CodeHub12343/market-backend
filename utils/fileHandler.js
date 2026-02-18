const cloudinary = require('../config/cloudinary');
const AppError = require('./appError');

// Supported file types and their mime types
const SUPPORTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  video: ['video/mp4', 'video/quicktime']
};

// Maximum file sizes in bytes
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024 // 50MB
};

// Image optimization configurations
const IMAGE_TRANSFORMATIONS = {
  thumbnail: {
    width: 150,
    height: 150,
    crop: 'fill',
    quality: 'auto',
    format: 'webp'
  },
  medium: {
    width: 500,
    height: 500,
    crop: 'limit',
    quality: 'auto',
    format: 'webp'
  },
  large: {
    width: 1024,
    crop: 'limit',
    quality: 'auto',
    format: 'webp'
  }
};

class FileHandler {
  constructor() {
    this.uploadedFiles = new Set(); // Track files for cleanup if needed
  }

  /**
   * Validate file type and size
   * @param {Object} file - File object from multer
   * @param {Array} allowedTypes - Array of allowed file types (e.g., ['image', 'document'])
   * @returns {Boolean|AppError}
   */
  validateFile(file, allowedTypes) {
    // Make file optional
    if (!file) {
      console.log('No file to validate - skipping');
      return true;
    }

    // Log file details
    console.log('Validating file:', {
      mimetype: file.mimetype,
      size: file.size,
      fieldname: file.fieldname
    });

    // Check file type
    const fileType = this.getFileType(file.mimetype);
    if (!fileType || !allowedTypes.includes(fileType)) {
      throw new AppError(
        `Invalid file type. Supported types: ${allowedTypes.join(', ')}`,
        400
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZES[fileType]) {
      throw new AppError(
        `File too large. Maximum size for ${fileType}: ${MAX_FILE_SIZES[fileType] / (1024 * 1024)}MB`,
        400
      );
    }

    return true;
  }

  /**
   * Get file type from mime type
   * @param {String} mimeType 
   * @returns {String|null}
   */
  getFileType(mimeType) {
    for (const [type, mimes] of Object.entries(SUPPORTED_FILE_TYPES)) {
      if (mimes.includes(mimeType)) return type;
    }
    return null;
  }

  /**
   * Upload file to Cloudinary with optimizations
   * @param {Object} file - File object from multer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>}
   */
  async uploadFile(file, options = {}) {
    try {
      const {
        folder = 'uploads',
        allowedTypes = ['image'],
        generateThumbnail = false,
        optimizationLevel = 'medium',
        tags = []
      } = options;

      console.log('Uploading file:', { 
        fileExists: !!file,
        hasBuffer: !!file?.buffer,
        mimetype: file?.mimetype
      });

      // Prepare upload options
      const uploadOptions = {
        folder,
        resource_type: 'auto',
        tags: [...tags, 'source'],
      };

      // Add optimization for images
      if (this.getFileType(file.mimetype) === 'image') {
        uploadOptions.transformation = [IMAGE_TRANSFORMATIONS[optimizationLevel]];
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, uploadOptions);
      this.uploadedFiles.add(result.public_id);

      // Generate thumbnail if requested (for images only)
      let thumbnail = null;
      if (generateThumbnail && this.getFileType(file.mimetype) === 'image') {
        thumbnail = await cloudinary.uploader.upload(file.path, {
          ...uploadOptions,
          transformation: [IMAGE_TRANSFORMATIONS.thumbnail],
          tags: [...tags, 'thumbnail']
        });
      }

      return {
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        size: result.bytes,
        thumbnail: thumbnail ? {
          url: thumbnail.secure_url,
          public_id: thumbnail.public_id
        } : null
      };
    } catch (error) {
      // If upload fails, attempt cleanup and throw error
      if (this.uploadedFiles.size > 0) {
        await this.cleanupFiles();
      }
      throw new AppError(error.message || 'File upload failed', error.http_code || 500);
    }
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of files
   * @param {Object} options - Upload options
   * @returns {Promise<Array>}
   */
  async uploadMultipleFiles(files, options = {}) {
    try {
      const uploads = await Promise.all(
        files.map(file => this.uploadFile(file, options))
      );
      return uploads;
    } catch (error) {
      // If any upload fails, cleanup all uploaded files
      await this.cleanupFiles();
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {String} publicId 
   * @returns {Promise}
   */
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      this.uploadedFiles.delete(publicId);
      return result;
    } catch (error) {
      throw new AppError('Failed to delete file', 500);
    }
  }

  /**
   * Cleanup all tracked files (used for rollback on error)
   * @returns {Promise}
   */
  async cleanupFiles() {
    try {
      const deletions = await Promise.all(
        Array.from(this.uploadedFiles).map(publicId => 
          cloudinary.uploader.destroy(publicId)
        )
      );
      this.uploadedFiles.clear();
      return deletions;
    } catch (error) {
      console.error('Failed to cleanup files:', error);
      throw new AppError('Failed to cleanup uploaded files', 500);
    }
  }

  /**
   * Find and cleanup orphaned files
   * @param {String} folder - Cloudinary folder to check
   * @param {Array} activePids - Array of active public_ids in database
   * @returns {Promise}
   */
  async cleanupOrphanedFiles(folder, activePids) {
    try {
      const { resources } = await cloudinary.search
        .expression(`folder:${folder}`)
        .execute();

      const orphanedFiles = resources.filter(
        resource => !activePids.includes(resource.public_id)
      );

      if (orphanedFiles.length > 0) {
        await Promise.all(
          orphanedFiles.map(file => cloudinary.uploader.destroy(file.public_id))
        );
        console.log(`Cleaned up ${orphanedFiles.length} orphaned files`);
      }

      return orphanedFiles.length;
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      throw new AppError('Failed to cleanup orphaned files', 500);
    }
  }
}

module.exports = new FileHandler();