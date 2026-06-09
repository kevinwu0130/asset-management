const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: '請填寫帳號與密碼' })

    const user = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (!user || !user.isActive) return res.status(401).json({ error: '帳號或密碼錯誤' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: '帳號或密碼錯誤' })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) { next(err) }
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })
    res.json(user)
  } catch (err) { next(err) }
})

module.exports = router
