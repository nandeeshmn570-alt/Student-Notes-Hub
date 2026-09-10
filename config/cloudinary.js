const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function assertCloudinaryConfig() {
  const missing = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
  ].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary configuration: ${missing.join(", ")}`);
  }
}

function uploadToCloudinary(file, subject) {
  assertCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `student-notes/${subject}`,
      resource_type: "auto"
    }, (error, result) => error ? reject(error) : resolve(result));

    stream.end(file.buffer);
  });
}

function deleteFromCloudinary(publicId, resourceType = "image") {
  assertCloudinaryConfig();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { deleteFromCloudinary, uploadToCloudinary };