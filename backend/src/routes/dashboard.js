const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const now = new Date()
    const [totalAssets, totalValue, byStatus, byCategory, recentLogs, pendingLoans, expiringWarranty, overdueLoans] = await Promise.all([
      prisma.asset.count({ where: { status: { not: 'RETIRED' } } }),

      prisma.asset.aggregate({ _sum: { purchaseAmount: true }, where: { status: { not: 'RETIRED' } } }),

      prisma.asset.groupBy({ by: ['status'], _count: { id: true } }),

      prisma.asset.groupBy({
        by: ['categoryId'], _count: { id: true },
        where: { status: { not: 'RETIRED' }, categoryId: { not: null } }
      }),

      prisma.assetLog.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { asset: { select: { name: true, assetTag: true } }, user: { select: { name: true } } }
      }),

      prisma.loanRecord.count({ where: { status: 'PENDING' } }),

      prisma.asset.findMany({
        where: {
          warrantyExpiry: { not: null, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
          status: { not: 'RETIRED' }
        },
        select: { id: true, assetTag: true, name: true, warrantyExpiry: true },
        orderBy: { warrantyExpiry: 'asc' },
        take: 5
      }),

      prisma.loanRecord.findMany({
        where: { status: 'APPROVED', expectedReturnAt: { lt: now } },
        include: {
          asset: { select: { id: true, assetTag: true, name: true } },
          borrower: { select: { id: true, name: true } }
        },
        orderBy: { expectedReturnAt: 'asc' },
        take: 10
      })
    ])

    // Attach category names
    const categoryIds = byCategory.map(b => b.categoryId).filter(Boolean)
    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } })
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

    res.json({
      summary: {
        totalAssets,
        totalValue: totalValue._sum.purchaseAmount || 0,
        pendingLoans,
        overdueLoansCount: overdueLoans.length,
        expiringWarrantyCount: expiringWarranty.length
      },
      byStatus: byStatus.map(b => ({ status: b.status, count: b._count.id })),
      byCategory: byCategory.map(b => ({ category: catMap[b.categoryId] || '未分類', count: b._count.id })),
      recentLogs,
      expiringWarranty,
      overdueLoans
    })
  } catch (err) { next(err) }
})

module.exports = router
