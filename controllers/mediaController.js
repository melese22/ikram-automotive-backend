const sharp = require('sharp');
const Media = require('../models/Media');
const { uploadBuffer, getFileUrl, deleteFile } = require('../config/s3');

const THUMB_WIDTH = 300;
const THUMB_HEIGHT = 200;

async function generateThumbnail(buffer) {
  return sharp(buffer)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 80 })
    .toBuffer();
}

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { jobCardId, category, tags } = req.body;

    if (!jobCardId) {
      return res.status(400).json({ error: 'jobCardId is required.' });
    }

    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    const buffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;

    const isImage = mimeType.startsWith('image/');

    const fileKey = await uploadBuffer(buffer, mimeType, `job-cards/${jobCardId}`);

    let thumbnailKey = null;
    if (isImage) {
      const thumbBuffer = await generateThumbnail(buffer);
      thumbnailKey = await uploadBuffer(thumbBuffer, 'image/jpeg', `job-cards/${jobCardId}/thumbnails`);
    }

    const media = await Media.create({
      jobCardId,
      fileKey,
      thumbnailKey,
      originalName,
      mimeType,
      size: buffer.length,
      category: category || (isImage ? 'image' : 'document'),
      tags: parsedTags,
      uploadedBy: req.user.id,
    });

    const fileUrl = await getFileUrl(fileKey);
    const thumbUrl = thumbnailKey ? await getFileUrl(thumbnailKey) : null;

    res.status(201).json({
      message: 'File uploaded successfully.',
      media: { ...media, fileUrl, thumbUrl },
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    const { jobCardId, category, tags } = req.body;

    if (!jobCardId) {
      return res.status(400).json({ error: 'jobCardId is required.' });
    }

    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];
    const results = [];

    for (const file of req.files) {
      const buffer = file.buffer;
      const mimeType = file.mimetype;
      const originalName = file.originalname;
      const isImage = mimeType.startsWith('image/');

      const fileKey = await uploadBuffer(buffer, mimeType, `job-cards/${jobCardId}`);

      let thumbnailKey = null;
      if (isImage) {
        const thumbBuffer = await generateThumbnail(buffer);
        thumbnailKey = await uploadBuffer(thumbBuffer, 'image/jpeg', `job-cards/${jobCardId}/thumbnails`);
      }

      const media = await Media.create({
        jobCardId,
        fileKey,
        thumbnailKey,
        originalName,
        mimeType,
        size: buffer.length,
        category: category || (isImage ? 'image' : 'document'),
        tags: parsedTags,
        uploadedBy: req.user.id,
      });

      const fileUrl = await getFileUrl(fileKey);
      const thumbUrl = thumbnailKey ? await getFileUrl(thumbnailKey) : null;

      results.push({ ...media, fileUrl, thumbUrl });
    }

    res.status(201).json({
      message: `${results.length} file(s) uploaded successfully.`,
      media: results,
    });
  } catch (err) {
    console.error('Multi-upload error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getByJobCard = async (req, res) => {
  try {
    const mediaList = await Media.findByJobCard(req.params.jobCardId);

    const enriched = await Promise.all(
      mediaList.map(async (m) => {
        try {
          const fileUrl = await getFileUrl(m.file_key);
          const thumbUrl = m.thumbnail_key ? await getFileUrl(m.thumbnail_key) : null;
          return { ...m, fileUrl, thumbUrl };
        } catch {
          return { ...m, fileUrl: null, thumbUrl: null };
        }
      })
    );

    res.json({ media: enriched });
  } catch (err) {
    console.error('Get media error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found.' });
    }

    const fileUrl = await getFileUrl(media.file_key);
    const thumbUrl = media.thumbnail_key ? await getFileUrl(media.thumbnail_key) : null;

    res.json({ media: { ...media, fileUrl, thumbUrl } });
  } catch (err) {
    console.error('Get media error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateTags = async (req, res) => {
  try {
    const { tags } = req.body;
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags array is required.' });
    }

    const media = await Media.updateTags(req.params.id, tags);
    if (!media) {
      return res.status(404).json({ error: 'Media not found.' });
    }

    res.json({ message: 'Tags updated.', media });
  } catch (err) {
    console.error('Update tags error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found.' });
    }

    await deleteFile(media.file_key);
    if (media.thumbnail_key) {
      await deleteFile(media.thumbnail_key);
    }

    await Media.delete(req.params.id);

    res.json({ message: 'Media deleted successfully.' });
  } catch (err) {
    console.error('Delete media error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};