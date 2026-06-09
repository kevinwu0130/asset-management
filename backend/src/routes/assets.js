const express = require('express')
const multer = require('multer')
const { parse } = require('csv-parse/sync')
const { stringify } = require('csv-stringify/sync')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const INCLUDE = {
  category: true,
  location: true,
  custodian: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } }
}

const STATUS_ZH = { IN_STOCK: '在庫', IN_USE: '使用中', MAINTENANCE: '維修中', RETIRED: '報廢' }

const LOGGABLE = [
  'name', 'status', 'custodianId', 'locationId', 'categoryId',
  'assetTag', 'purchaseAmount', 'purchaseDate', 'warrantyExpiry',
  'barcode', 'description', 'notes'
]

const ACTION_MAP = {
  status:      'STATUS_CHANGED',
  custodianId: 'CUSTODIAN_CHANGED',
  locationId:  'LOCATION_CHANGED',
}

const FIELD_ZH = {
  name: '名稱', status: '狀態', custodianId: '保管人', locationId: '地點',
  categoryId: '分類', assetTag: '資產編號', purchaseAmount: '購買金額',
  purchaseDate: '購買日期', warrantyExpiry: '保固到期', barcode: '條碼',
  description: '說明', notes: '備註'
}

async function resolveValue(tx, field, value) {
  if (value == null) return '-'
  if (field === 'custodianId') {
    const u = await tx.user.findUnique({ where: { id: parseInt(value) }, select: { name: true } })
    return u?.name || String(value)
  }
  if (field === 'locationId') {
    const l = await tx.location.findUnique({ where: { id: parseInt(value) } })
    return l?.name || String(value)
  }
  if (field === 'categoryId') {
    const c = await tx.category.findUnique({ where: { id: parseInt(value) } })
    return c?.name || String(value)
  }
  if (field === 'status') return STATUS_ZH[value] || value
  if (value instanceof Date) return value.toISOString().split('T')[0]
  return String(value)
}

async function logChanges(tx, assetId, userId, oldAsset, newAsset) {
  for (const field of LOGGABLE) {
    const from = oldAsset[field]
    const to = newAsset[field]
    const fromStr = from instanceof Date ? from.toISOString() : from
    const toStr   = to   instanceof Date ? to.toISOString()   : to
    if (String(fromStr ?? '') === String(toStr ?? '')) continue

    const [fromLabel, toLabel] = await Promise.all([
      resolveValue(tx, field, from),
      resolveValue(tx, field, to)
    ])

    await tx.assetLog.create({
      data: {
        assetId,
        userId,
        action: ACTION_MAP[field] || 'UPDATED',
        field: FIELD_ZH[field] || field,
        fromValue: fromLabel,
        toValue: toLabel
      }
    })
  }
}

// ── List (with filter, sort, pagination) ──────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, categoryId, locationId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query

    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { assetTag: { contains: search } },
        { description: { contains: search } }
      ]
    }
    if (status) where.status = status
    if (categoryId) where.categoryId = parseInt(categoryId)
    if (locationId) where.locationId = parseInt(locationId)
    if (req.query.custodianId) where.custodianId = parseInt(req.query.custodianId)
    if (req.query.purchaseDateFrom || req.query.purchaseDateTo) {
      where.purchaseDate = {}
      if (req.query.purchaseDateFrom) where.purchaseDate.gte = new Date(req.query.purchaseDateFrom)
      if (req.query.purchaseDateTo)   where.purchaseDate.lte = new Date(req.query.purchaseDateTo)
    }
    if (req.query.amountMin || req.query.amountMax) {
      where.purchaseAmount = {}
      if (req.query.amountMin) where.purchaseAmount.gte = parseFloat(req.query.amountMin)
      if (req.query.amountMax) where.purchaseAmount.lte = parseFloat(req.query.amountMax)
    }
    if (req.user.role === 'USER') where.custodianId = req.user.id

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        include: INCLUDE,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      })
    ])

    res.json({ data: assets, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } })
  } catch (err) { next(err) }
})

// ── Single asset with logs ─────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: parseInt(req.params.id) },
      include: {
        ...INCLUDE,
        logs: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        loanRecords: { include: { borrower: { select: { id: true, name: true } } }, orderBy: { requestedAt: 'desc' }, take: 10 }
      }
    })
    res.json(asset)
  } catch (err) { next(err) }
})

// ── Create ─────────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { assetTag, name, description, categoryId, status, purchaseDate, purchaseAmount, custodianId, locationId, barcode, warrantyExpiry, notes } = req.body
    if (!assetTag || !name) return res.status(400).json({ error: 'assetTag 與 name 為必填' })

    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.asset.create({
        data: {
          assetTag, name, description,
          categoryId: categoryId ? parseInt(categoryId) : null,
          status: status || 'IN_STOCK',
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          purchaseAmount: purchaseAmount ? parseFloat(purchaseAmount) : null,
          custodianId: custodianId ? parseInt(custodianId) : null,
          locationId: locationId ? parseInt(locationId) : null,
          barcode, warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
          notes, createdById: req.user.id
        },
        include: INCLUDE
      })
      await tx.assetLog.create({
        data: { assetId: created.id, userId: req.user.id, action: 'CREATED', notes: `建立資產 ${name}` }
      })
      return created
    })

    res.status(201).json(asset)
  } catch (err) { next(err) }
})

// ── Update (auto-log changes) ──────────────────────────────
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const old = await prisma.asset.findUniqueOrThrow({ where: { id } })
    const { assetTag, name, description, categoryId, status, purchaseDate, purchaseAmount, custodianId, locationId, barcode, warrantyExpiry, notes } = req.body

    const asset = await prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: {
          assetTag, name, description,
          categoryId: categoryId != null ? parseInt(categoryId) : undefined,
          status,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
          purchaseAmount: purchaseAmount != null ? parseFloat(purchaseAmount) : undefined,
          custodianId: custodianId != null ? parseInt(custodianId) : undefined,
          locationId: locationId != null ? parseInt(locationId) : undefined,
          barcode,
          warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
          notes
        },
        include: INCLUDE
      })
      await logChanges(tx, id, req.user.id, old, updated)
      return updated
    })

    res.json(asset)
  } catch (err) { next(err) }
})

// ── Delete (retire) ────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    await prisma.$transaction(async (tx) => {
      await tx.asset.update({ where: { id }, data: { status: 'RETIRED' } })
      await tx.assetLog.create({
        data: { assetId: id, userId: req.user.id, action: 'RETIRED', notes: '資產已報廢' }
      })
    })
    res.json({ message: '資產已標記為報廢' })
  } catch (err) { next(err) }
})

// ── Bulk Update ───────────────────────────────────────────
router.post('/bulk', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, field, value } = req.body
    if (!ids?.length || !field || value === undefined) {
      return res.status(400).json({ error: 'ids、field、value 必填' })
    }
    const allowedFields = ['status', 'custodianId', 'locationId', 'categoryId']
    if (!allowedFields.includes(field)) return res.status(400).json({ error: '不允許的欄位' })

    const oldAssets = await prisma.asset.findMany({ where: { id: { in: ids } } })

    const data = {}
    if (field === 'custodianId' || field === 'locationId' || field === 'categoryId') {
      data[field] = value ? parseInt(value) : null
    } else {
      data[field] = value
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.updateMany({ where: { id: { in: ids } }, data })
      for (const old of oldAssets) {
        const updated = { ...old, ...data }
        await logChanges(tx, old.id, req.user.id, old, updated)
      }
    })

    res.json({ updated: ids.length })
  } catch (err) { next(err) }
})

// ── CSV Export ─────────────────────────────────────────────
router.get('/export/csv', authenticate, async (req, res, next) => {
  try {
    const assets = await prisma.asset.findMany({
      include: { category: true, location: true, custodian: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })

    const rows = assets.map(a => ({
      assetTag: a.assetTag,
      name: a.name,
      description: a.description || '',
      category: a.category?.name || '',
      status: a.status,
      purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString().split('T')[0] : '',
      purchaseAmount: a.purchaseAmount || '',
      custodian: a.custodian?.name || '',
      location: a.location?.name || '',
      warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.toISOString().split('T')[0] : '',
      notes: a.notes || ''
    }))

    const csv = stringify(rows, { header: true })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="assets-${Date.now()}.csv"`)
    res.send('﻿' + csv)
  } catch (err) { next(err) }
})

// ── CSV Import ─────────────────────────────────────────────
router.post('/import/csv', authenticate, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳 CSV 檔案' })

    const records = parse(req.file.buffer.toString('utf-8').replace(/^﻿/, ''), {
      columns: true, skip_empty_lines: true, trim: true
    })

    const results = { success: 0, failed: 0, errors: [] }

    for (const row of records) {
      try {
        const category = row.category ? await prisma.category.upsert({
          where: { name: row.category }, update: {}, create: { name: row.category }
        }) : null
        const location = row.location ? await prisma.location.upsert({
          where: { name: row.location }, update: {}, create: { name: row.location }
        }) : null

        await prisma.$transaction(async (tx) => {
          const asset = await tx.asset.upsert({
            where: { assetTag: row.assetTag },
            update: { name: row.name, description: row.description, status: row.status || 'IN_STOCK', categoryId: category?.id || null, locationId: location?.id || null, notes: row.notes },
            create: {
              assetTag: row.assetTag, name: row.name, description: row.description,
              status: row.status || 'IN_STOCK',
              purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
              purchaseAmount: row.purchaseAmount ? parseFloat(row.purchaseAmount) : null,
              categoryId: category?.id || null, locationId: location?.id || null,
              warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
              notes: row.notes, createdById: req.user.id
            }
          })
          await tx.assetLog.create({
            data: { assetId: asset.id, userId: req.user.id, action: 'CREATED', notes: 'CSV 批次匯入' }
          })
        })
        results.success++
      } catch (e) {
        results.failed++
        results.errors.push(`${row.assetTag}: ${e.message}`)
      }
    }

    res.json(results)
  } catch (err) { next(err) }
})

module.exports = router
