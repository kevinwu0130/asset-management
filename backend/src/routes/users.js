const express = require('express')
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
const SELECT = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }

router.get('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: SELECT, orderBy: { createdAt: 'desc' } })
    res.json(users)
  } catch (err) { next(err) }
})

router.post('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: '姓名、Email、密碼為必填' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email: email.trim(), password: hashed, role: role || 'USER' },
      select: SELECT
    })
    res.status(201).json(user)
  } catch (err) { next(err) }
})

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({ error: '權限不足' })
    }

    const { name, email, password, role, isActive } = req.body
    const data = {}
    if (name) data.name = name
    if (email) data.email = email.trim()
    if (password) data.password = await bcrypt.hash(password, 10)
    if (role && req.user.role === 'ADMIN') data.role = role
    if (isActive != null && req.user.role === 'ADMIN') data.isActive = isActive

    const user = await prisma.user.update({ where: { id }, data, select: SELECT })
    res.json(user)
  } catch (err) { next(err) }
})

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (req.user.id === id) return res.status(400).json({ error: '無法停用自己的帳號' })
    await prisma.user.update({ where: { id }, data: { isActive: false } })
    res.json({ message: '帳號已停用' })
  } catch (err) { next(err) }
})

module.exports = router
