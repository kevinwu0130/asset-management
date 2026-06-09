const express = require('express')
const { stringify } = require('csv-stringify/sync')
const XLSX = require('xlsx')
const prisma = require('../lib/prisma')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

const STATUS_ZH = { IN_STOCK: '在庫', IN_USE: '使用中', MAINTENANCE: '維修中', RETIRED: '報廢' }

// ── 統計報表 ───────────────────────────────────────────────
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const where = { status: { not: 'RETIRED' } }
    if (req.query.from) where.purchaseDate = { ...(where.purchaseDate || {}), gte: new Date(req.query.from) }
    if (req.query.to)   where.purchaseDate = { ...(where.purchaseDate || {}), lte: new Date(req.query.to) }

    const [byCategory, byLocation, byCustodian, byStatus] = await Promise.all([
      prisma.asset.groupBy({ by: ['categoryId'], where, _count: { id: true }, _sum: { purchaseAmount: true } }),
      prisma.asset.groupBy({ by: ['locationId'], where, _count: { id: true }, _sum: { purchaseAmount: true } }),
      prisma.asset.groupBy({ by: ['custodianId'], where, _count: { id: true }, _sum: { purchaseAmount: true } }),
      prisma.asset.groupBy({ by: ['status'], _count: { id: true }, _sum: { purchaseAmount: true } })
    ])

    const catIds = byCategory.map(b => b.categoryId).filter(Boolean)
    const locIds = byLocation.map(b => b.locationId).filter(Boolean)
    const cusIds = byCustodian.map(b => b.custodianId).filter(Boolean)

    const [cats, locs, cus] = await Promise.all([
      prisma.category.findMany({ where: { id: { in: catIds } } }),
      prisma.location.findMany({ where: { id: { in: locIds } } }),
      prisma.user.findMany({ where: { id: { in: cusIds } }, select: { id: true, name: true } })
    ])

    const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]))
    const locMap = Object.fromEntries(locs.map(l => [l.id, l.name]))
    const cusMap = Object.fromEntries(cus.map(u => [u.id, u.name]))

    res.json({
      byCategory: byCategory
        .map(b => ({ name: catMap[b.categoryId] || '未分類', count: b._count.id, totalValue: b._sum.purchaseAmount || 0 }))
        .sort((a, b) => b.count - a.count),
      byLocation: byLocation
        .map(b => ({ name: locMap[b.locationId] || '未設定', count: b._count.id, totalValue: b._sum.purchaseAmount || 0 }))
        .sort((a, b) => b.count - a.count),
      byCustodian: byCustodian
        .map(b => ({ name: cusMap[b.custodianId] || '未指派', count: b._count.id, totalValue: b._sum.purchaseAmount || 0 }))
        .sort((a, b) => b.count - a.count),
      byStatus: byStatus
        .map(b => ({ status: b.status, label: STATUS_ZH[b.status] || b.status, count: b._count.id, totalValue: b._sum.purchaseAmount || 0 }))
    })
  } catch (err) { next(err) }
})

// ── 資產盤點表 ─────────────────────────────────────────────
router.get('/inventory', authenticate, async (req, res, next) => {
  try {
    const where = {}
    if (req.query.categoryId) where.categoryId = parseInt(req.query.categoryId)
    if (req.query.locationId) where.locationId = parseInt(req.query.locationId)
    if (req.query.status)     where.status     = req.query.status

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true,
        location: true,
        custodian: { select: { id: true, name: true } }
      },
      orderBy: [{ categoryId: 'asc' }, { assetTag: 'asc' }]
    })

    res.json(assets)
  } catch (err) { next(err) }
})

// ── 盤點表匯出 CSV ─────────────────────────────────────────
router.get('/inventory/export', authenticate, async (req, res, next) => {
  try {
    const where = {}
    if (req.query.categoryId) where.categoryId = parseInt(req.query.categoryId)
    if (req.query.locationId) where.locationId = parseInt(req.query.locationId)
    if (req.query.status)     where.status     = req.query.status

    const assets = await prisma.asset.findMany({
      where,
      include: { category: true, location: true, custodian: { select: { name: true } } },
      orderBy: [{ categoryId: 'asc' }, { assetTag: 'asc' }]
    })

    const rows = assets.map((a, i) => ({
      序號: i + 1,
      資產編號: a.assetTag,
      名稱: a.name,
      分類: a.category?.name || '',
      狀態: STATUS_ZH[a.status] || a.status,
      保管人: a.custodian?.name || '',
      存放地點: a.location?.name || '',
      購買金額: a.purchaseAmount || '',
      備註: a.notes || '',
      盤點結果: '',
      盤點人員: '',
      盤點日期: ''
    }))

    const csv = stringify(rows, { header: true })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="inventory-${Date.now()}.csv"`)
    res.send('﻿' + csv)
  } catch (err) { next(err) }
})

// ── 盤點表匯出 Excel ────────────────────────────────────────
router.get('/inventory/export-xlsx', authenticate, async (req, res, next) => {
  try {
    const where = {}
    if (req.query.categoryId) where.categoryId = parseInt(req.query.categoryId)
    if (req.query.locationId) where.locationId = parseInt(req.query.locationId)
    if (req.query.status)     where.status     = req.query.status

    const assets = await prisma.asset.findMany({
      where,
      include: { category: true, location: true, custodian: { select: { name: true } } },
      orderBy: [{ categoryId: 'asc' }, { assetTag: 'asc' }]
    })

    const rows = assets.map((a, i) => ({
      '序號': i + 1,
      '資產編號': a.assetTag,
      '名稱': a.name,
      '分類': a.category?.name || '',
      '狀態': STATUS_ZH[a.status] || a.status,
      '保管人': a.custodian?.name || '',
      '存放地點': a.location?.name || '',
      '購買金額': a.purchaseAmount || '',
      '購買日期': a.purchaseDate ? a.purchaseDate.toISOString().split('T')[0] : '',
      '保固到期': a.warrantyExpiry ? a.warrantyExpiry.toISOString().split('T')[0] : '',
      '備註': a.notes || '',
      '盤點結果': '',
      '盤點人員': '',
      '盤點日期': ''
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    // Column widths
    ws['!cols'] = [8,14,22,12,8,12,12,12,12,12,18,10,10,10].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, '資產盤點表')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''inventory-${Date.now()}.xlsx`)
    res.send(buf)
  } catch (err) { next(err) }
})

// ── 資產全覽匯出 Excel ──────────────────────────────────────
router.get('/assets/export-xlsx', authenticate, async (req, res, next) => {
  try {
    const assets = await prisma.asset.findMany({
      include: { category: true, location: true, custodian: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })

    const rows = assets.map((a, i) => ({
      '序號': i + 1,
      '資產編號': a.assetTag,
      '名稱': a.name,
      '說明': a.description || '',
      '分類': a.category?.name || '',
      '狀態': STATUS_ZH[a.status] || a.status,
      '保管人': a.custodian?.name || '',
      '存放地點': a.location?.name || '',
      '購買金額': a.purchaseAmount || '',
      '購買日期': a.purchaseDate ? a.purchaseDate.toISOString().split('T')[0] : '',
      '保固到期': a.warrantyExpiry ? a.warrantyExpiry.toISOString().split('T')[0] : '',
      '條碼': a.barcode || '',
      '備註': a.notes || '',
      '建立人': a.createdBy?.name || '',
      '建立時間': a.createdAt.toISOString().split('T')[0]
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [6,14,22,20,12,8,12,12,12,12,12,12,18,12,12].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, '資產清單')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''assets-${Date.now()}.xlsx`)
    res.send(buf)
  } catch (err) { next(err) }
})

module.exports = router
