const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'ikram-automotive-media';

async function uploadFile(key, buffer, mimeType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });
  await s3.send(command);
  return key;
}

async function getFileUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

async function deleteFile(key) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3.send(command);
}

async function uploadBuffer(buffer, mimeType, folder = 'uploads') {
  const ext = mimeType.split('/')[1] || 'bin';
  const key = `${folder}/${uuidv4()}.${ext}`;
  return uploadFile(key, buffer, mimeType);
}

module.exports = { s3, uploadFile, getFileUrl, deleteFile, uploadBuffer, BUCKET };