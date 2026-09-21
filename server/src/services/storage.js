const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const uploadDir = path.join(__dirname, '../../uploads');

async function persistLocal(file) {
  return {
    originalName: file.originalname,
    url: `/uploads/${file.filename}`,
    uploadedAt: new Date(),
  };
}

async function persistS3(file) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
  const key = `uploads/${file.filename}`;
  const body = fs.readFileSync(file.path);
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: file.mimetype,
    })
  );
  const base = process.env.AWS_S3_PUBLIC_URL || `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`;
  return {
    originalName: file.originalname,
    url: `${base}/${key}`,
    uploadedAt: new Date(),
  };
}

async function persistUpload(file) {
  if (!file) return null;
  try {
    if (process.env.AWS_S3_BUCKET) return persistS3(file);
  } catch (err) {
    logger.error({ err: err.message }, 's3 upload failed, using local disk');
  }
  return persistLocal(file);
}

async function persistUploads(files = []) {
  const out = [];
  for (const file of files) out.push(await persistUpload(file));
  return out.filter(Boolean);
}

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}

module.exports = { persistUpload, persistUploads, ensureUploadDir, uploadDir };
