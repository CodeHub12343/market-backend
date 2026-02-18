const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Uploads a buffer (used with multer memoryStorage)
exports.uploadBuffer = (buffer, folder = 'uploads', public_id = undefined) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder, 
        public_id, 
        resource_type: 'auto',
        timeout: 60000 // 60 second timeout
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Add error handling for stream
    uploadStream.on('error', (err) => {
      reject(new Error(`Upload stream error: ${err.message}`));
    });

    // Set timeout for the entire upload process
    const timeout = setTimeout(() => {
      uploadStream.destroy();
      reject(new Error('Cloudinary upload timeout - image upload took too long'));
    }, 65000); // 65 seconds total

    const stream = streamifier.createReadStream(buffer);
    
    stream.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Stream read error: ${err.message}`));
    });

    uploadStream.on('finish', () => {
      clearTimeout(timeout);
    });

    stream.pipe(uploadStream);
  });

// Delete by public_id
exports.deleteImage = async (public_id) => {
  return cloudinary.uploader.destroy(public_id);
};
