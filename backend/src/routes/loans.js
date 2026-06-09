const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

const INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  borrower: { select: { id: true, name: true, email: true } },
  approver: { select: { id: true, name: true } }
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, borrowerId } = req.query
    const where = {}
    if (status) where.status = status
    // USER can only see own loans; ADMIN/MANAGER can filter by borrowerId
    if (req.user.role === 'USER') {
      where.borrowerId = req.user.id
    } else if (borrowerId) {
      where.borrowerId = parseInt(borrowerId)
    }

    const [total, loans] = await Promise.all([
      prisma.loanRecord.count({ where }),
      prisma.loanRecord.findMany({
        where, include: INCLUDE,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { requestedAt: 'desc' }
      })
    ])

    res.json({ data: loans, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } })
  } catch (err) { next(err) }
})

// ── Request borrow ─────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { assetId, expectedReturnAt, notes } = req.body
    if (!assetId) return res.status(400).json({ error: 'assetId 為必填' })

    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: parseInt(assetId) } })
    if (asset.status !== 'IN_STOCK') return res.status(400).json({ error: '資產目前不可借用' })

    const loan = await prisma.loanRecord.create({
      data: {
        assetId: parseInt(assetId),
        borrowerId: req.user.id,
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
        notes
      },
      include: INCLUDE
    })
    res.status(201).json(loan)
  } catch (err) { next(err) }
})

// ── Approve ────────────────────────────────────────────────
router.put('/:id/approve', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const loan = await prisma.loanRecord.findUniqueOrThrow({ where: { id } })
    if (loan.status !== 'PENDING') return res.status(400).json({ error: '只有待審核的申請可以審核' })

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.loanRecord.update({
        where: { id },
        data: { status: 'APPROVED', approverId: req.user.id, approvedAt: new Date(), borrowedAt: new Date() },
        include: INCLUDE
      })
      await tx.asset.update({ where: { id: loan.assetId }, data: { status: 'IN_USE' } })
      await tx.assetLog.create({
        data: { assetId: loan.assetId, userId: req.user.id, action: 'STATUS_CHANGED', field: 'status', fromValue: 'IN_STOCK', toValue: 'IN_USE', notes: `借出給 ${result.borrower.name}` }
      })
      return result
    })
    res.json(updated)
  } catch (err) { next(err) }
})

// ── Reject ─────────────────────────────────────────────────
router.put('/:id/reject', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const { rejectReason } = req.body
    const loan = await prisma.loanRecord.findUniqueOrThrow({ where: { id } })
    if (loan.status !== 'PENDING') return res.status(400).json({ error: '只有待審核的申請可以拒絕' })

    const updated = await prisma.loanRecord.update({
      where: { id },
      data: { status: 'REJECTED', approverId: req.user.id, rejectReason },
      include: INCLUDE
    })
    res.json(updated)
  } catch (err) { next(err) }
})

// ── Return ─────────────────────────────────────────────────
router.put('/:id/return', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const loan = await prisma.loanRecord.findUniqueOrThrow({ where: { id } })
    if (loan.status !== 'APPROVED') return res.status(400).json({ error: '只有借用中的資產可以歸還' })

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.loanRecord.update({
        where: { id },
        data: { status: 'RETURNED', returnedAt: new Date() },
        include: INCLUDE
      })
      await tx.asset.update({ where: { id: loan.assetId }, data: { status: 'IN_STOCK' } })
      await tx.assetLog.create({
        data: { assetId: loan.assetId, userId: req.user.id, action: 'STATUS_CHANGED', field: 'status', fromValue: 'IN_USE', toValue: 'IN_STOCK', notes: '資產已歸還' }
      })
      return result
    })
    res.json(updated)
  } catch (err) { next(err) }
})

module.exports = router
