const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

const STATUS_ZH = { PENDING: '待送修', IN_REPAIR: '維修中', COMPLETED: '已完成', CANCELLED: '已取消' }

const INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true } },
  createdBy: { select: { id: true, name: true } }
}

// List by asset
router.get('/asset/:assetId', authenticate, async (req, res, next) => {
  try {
    const records = await prisma.maintenanceRecord.findMany({
      where: { assetId: parseInt(req.params.assetId) },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' }
    })
    res.json(records.map(r => ({ ...r, statusLabel: STATUS_ZH[r.status] || r.status })))
  } catch (err) { next(err) }
})

// Create
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { assetId, vendor, description, sentAt, expectedReturnAt, notes } = req.body
    if (!assetId) return res.status(400).json({ error: 'assetId 必填' })

    const record = await prisma.$transaction(async (tx) => {
      const r = await tx.maintenanceRecord.create({
        data: {
          assetId: parseInt(assetId),
          vendor, description, notes,
          sentAt: sentAt ? new Date(sentAt) : null,
          expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
          status: sentAt ? 'IN_REPAIR' : 'PENDING',
          createdById: req.user.id
        },
        include: INCLUDE
      })
      // Update asset status to MAINTENANCE
      await tx.asset.update({ where: { id: parseInt(assetId) }, data: { status: 'MAINTENANCE' } })
      await tx.assetLog.create({
        data: { assetId: parseInt(assetId), userId: req.user.id, action: 'STATUS_CHANGED', field: '狀態', fromValue: '在庫/使用中', toValue: '維修中', notes: `送修：${vendor || ''}` }
      })
      return r
    })

    res.status(201).json({ ...record, statusLabel: STATUS_ZH[record.status] })
  } catch (err) { next(err) }
})

// Update (complete, cancel, update info)
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const { status, vendor, description, cost, sentAt, expectedReturnAt, returnedAt, notes } = req.body

    const record = await prisma.$transaction(async (tx) => {
      const r = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status, vendor, description, notes,
          cost: cost != null ? parseFloat(cost) : undefined,
          sentAt: sentAt ? new Date(sentAt) : undefined,
          expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : undefined,
          returnedAt: returnedAt ? new Date(returnedAt) : undefined
        },
        include: INCLUDE
      })
      // If completed → update asset status back to IN_STOCK
      if (status === 'COMPLETED') {
        await tx.asset.update({ where: { id: r.assetId }, data: { status: 'IN_STOCK' } })
        await tx.assetLog.create({
          data: { assetId: r.assetId, userId: req.user.id, action: 'STATUS_CHANGED', field: '狀態', fromValue: '維修中', toValue: '在庫', notes: `維修完成，費用：${cost || 0}` }
        })
      }
      return r
    })

    res.json({ ...record, statusLabel: STATUS_ZH[record.status] })
  } catch (err) { next(err) }
})

// Delete
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.maintenanceRecord.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: '已刪除' })
  } catch (err) { next(err) }
})

module.exports = router
