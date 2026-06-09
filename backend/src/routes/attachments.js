const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

const UPLOADS_DIR = path.join(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// List by asset
router.get('/asset/:assetId', authenticate, async (req, res, next) => {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { assetId: parseInt(req.params.assetId) },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(attachments)
  } catch (err) { next(err) }
})

// Upload
router.post('/asset/:assetId', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳檔案' })
    const attachment = await prisma.attachment.create({
      data: {
        assetId: parseInt(req.params.assetId),
        filename: req.file.filename,
        originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedById: req.user.id
      },
      include: { uploadedBy: { select: { id: true, name: true } } }
    })
    res.status(201).json(attachment)
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {})
    next(err)
  }
})

// Delete
router.delete('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const att = await prisma.attachment.findUniqueOrThrow({ where: { id: parseInt(req.params.id) } })
    const filePath = path.join(UPLOADS_DIR, att.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await prisma.attachment.delete({ where: { id: att.id } })
    res.json({ message: '已刪除' })
  } catch (err) { next(err) }
})

module.exports = router
