const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } })
    res.json(locations)
  } catch (err) { next(err) }
})

router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ error: '名稱為必填' })
    const location = await prisma.location.create({ data: { name, description } })
    res.status(201).json(location)
  } catch (err) { next(err) }
})

router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, description } = req.body
    const location = await prisma.location.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description }
    })
    res.json(location)
  } catch (err) { next(err) }
})

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.location.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: '已刪除' })
  } catch (err) { next(err) }
})

module.exports = router
