const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    res.json(categories)
  } catch (err) { next(err) }
})

router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ error: '名稱為必填' })
    const category = await prisma.category.create({ data: { name, description } })
    res.status(201).json(category)
  } catch (err) { next(err) }
})

router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, description } = req.body
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description }
    })
    res.json(category)
  } catch (err) { next(err) }
})

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: '已刪除' })
  } catch (err) { next(err) }
})

module.exports = router
