require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // 清除舊的測試資料
  await prisma.loanRecord.deleteMany()
  await prisma.assetLog.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } })

  // 使用者
  const hash = (p) => bcrypt.hash(p, 10)
  const [wang, li, chen] = await Promise.all([
    prisma.user.create({ data: { name: '王小明', email: 'wang@example.com', password: await hash('Test@1234'), role: 'MANAGER' } }),
    prisma.user.create({ data: { name: '李大華', email: 'li@example.com',   password: await hash('Test@1234'), role: 'USER' } }),
    prisma.user.create({ data: { name: '陳美玲', email: 'chen@example.com', password: await hash('Test@1234'), role: 'USER' } }),
  ])
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

  // 分類 & 地點
  const [catIT, catFN, catNET, catVH] = await Promise.all([
    prisma.category.upsert({ where: { name: '電腦設備' }, update: {}, create: { name: '電腦設備' } }),
    prisma.category.upsert({ where: { name: '辦公家具' }, update: {}, create: { name: '辦公家具' } }),
    prisma.category.upsert({ where: { name: '網路設備' }, update: {}, create: { name: '網路設備' } }),
    prisma.category.upsert({ where: { name: '交通工具' }, update: {}, create: { name: '交通工具' } }),
  ])
  const [locA1, locA2, locB1, locWH, locOut] = await Promise.all([
    prisma.location.upsert({ where: { name: 'A棟1樓' }, update: {}, create: { name: 'A棟1樓' } }),
    prisma.location.upsert({ where: { name: 'A棟2樓' }, update: {}, create: { name: 'A棟2樓' } }),
    prisma.location.upsert({ where: { name: 'B棟1樓' }, update: {}, create: { name: 'B棟1樓' } }),
    prisma.location.upsert({ where: { name: '倉庫'   }, update: {}, create: { name: '倉庫'   } }),
    prisma.location.upsert({ where: { name: '外借中'  }, update: {}, create: { name: '外借中'  } }),
  ])

  // 資產
  const assets = await Promise.all([
    prisma.asset.create({ data: { assetTag: 'IT-001', name: 'MacBook Pro 14吋',         categoryId: catIT.id, status: 'IN_USE',      purchaseDate: new Date('2023-03-15'), purchaseAmount: 75000, custodianId: wang.id, locationId: locA1.id, warrantyExpiry: new Date('2026-03-15'), notes: 'M3 晶片，16GB RAM', createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'IT-002', name: 'Dell 27吋顯示器',           categoryId: catIT.id, status: 'IN_USE',      purchaseDate: new Date('2023-05-20'), purchaseAmount: 18000, custodianId: chen.id, locationId: locA2.id, warrantyExpiry: new Date('2026-05-20'), createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'IT-003', name: 'HP LaserJet 印表機',        categoryId: catIT.id, status: 'IN_STOCK',    purchaseDate: new Date('2022-01-10'), purchaseAmount: 12000, locationId: locB1.id, warrantyExpiry: new Date('2025-06-20'), createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'IT-004', name: 'iPad Pro 12.9吋',           categoryId: catIT.id, status: 'MAINTENANCE', purchaseDate: new Date('2023-08-01'), purchaseAmount: 35000, locationId: locWH.id,  notes: '螢幕損壞送修中', createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'IT-005', name: 'Logitech 無線鍵盤滑鼠組',   categoryId: catIT.id, status: 'IN_STOCK',    purchaseDate: new Date('2024-01-05'), purchaseAmount:  3500, locationId: locWH.id,  createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'FN-001', name: '電動升降桌',                categoryId: catFN.id, status: 'IN_USE',      purchaseDate: new Date('2022-06-01'), purchaseAmount: 25000, custodianId: wang.id, locationId: locA1.id, createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'FN-002', name: 'Herman Miller 人體工學椅',  categoryId: catFN.id, status: 'IN_USE',      purchaseDate: new Date('2022-06-01'), purchaseAmount: 45000, custodianId: chen.id, locationId: locA2.id, createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'NET-001', name: 'Cisco 48 Port Switch',     categoryId: catNET.id,status: 'IN_USE',      purchaseDate: new Date('2021-09-15'), purchaseAmount: 55000, locationId: locB1.id, warrantyExpiry: new Date('2026-06-25'), createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'NET-002', name: 'Synology NAS DS923+',      categoryId: catNET.id,status: 'IN_USE',      purchaseDate: new Date('2023-11-01'), purchaseAmount: 28000, locationId: locB1.id, warrantyExpiry: new Date('2026-11-01'), createdById: admin.id } }),
    prisma.asset.create({ data: { assetTag: 'VH-001',  name: 'Toyota RAV4 公務車',       categoryId: catVH.id, status: 'IN_USE',      purchaseDate: new Date('2022-12-01'), purchaseAmount: 850000, locationId: locOut.id, warrantyExpiry: new Date('2025-12-01'), notes: '車牌 ABC-1234', createdById: admin.id } }),
  ])

  // 履歷
  for (const a of assets) {
    await prisma.assetLog.create({ data: { assetId: a.id, userId: admin.id, action: 'CREATED', notes: `建立資產 ${a.name}` } })
  }

  // 借用申請
  await prisma.loanRecord.create({ data: { assetId: assets[2].id, borrowerId: li.id, expectedReturnAt: new Date('2026-06-20'), notes: '出差需要使用印表機' } })
  await prisma.loanRecord.create({ data: { assetId: assets[4].id, borrowerId: li.id, expectedReturnAt: new Date('2026-06-15'), notes: '新人需要鍵盤滑鼠' } })

  console.log('範例資料建立完成')
  console.log('使用者：wang@example.com / li@example.com / chen@example.com（密碼均為 Test@1234）')
}

main().catch(console.error).finally(() => prisma.$disconnect())
