const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

const ACTION_ZH = {
  CREATED:          '建立',
  UPDATED:          '更新',
  STATUS_CHANGED:   '狀態變更',
  CUSTODIAN_CHANGED:'保管人變更',
  LOCATION_CHANGED: '地點變更',
  RETIRED:          '報廢',
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, assetId, action, userId, from, to, search } = req.query

    const where = {}
    if (assetId) where.assetId = parseInt(assetId)
    if (action)  where.action  = action
    if (userId)  where.userId  = parseInt(userId)
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to + 'T23:59:59')
    }
    if (search) {
      where.asset = { OR: [{ name: { contains: search } }, { assetTag: { contains: search } }] }
    }

    const [total, logs] = await Promise.all([
      prisma.assetLog.count({ where }),
      prisma.assetLog.findMany({
        where,
        include: {
          asset: { select: { id: true, assetTag: true, name: true } },
          user:  { select: { id: true, name: true } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      })
    ])

    res.json({
      data: logs.map(l => ({ ...l, actionLabel: ACTION_ZH[l.action] || l.action })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    })
  } catch (err) { next(err) }
})

module.exports = router
