require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234'
  const name = process.env.ADMIN_NAME || '系統管理員'

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.upsert({
    where: { email },
    update: { name, password: hashed },
    create: { name, email, password: hashed, role: 'ADMIN' }
  })
  console.log(`Admin upserted: ${email}`)

  // Default categories
  const categories = ['電腦設備', '辦公家具', '網路設備', '交通工具', '其他']
  for (const cat of categories) {
    await prisma.category.upsert({ where: { name: cat }, update: {}, create: { name: cat } })
  }

  // Default locations
  const locations = ['A棟1樓', 'A棟2樓', 'B棟1樓', '倉庫', '外借中']
  for (const loc of locations) {
    await prisma.location.upsert({ where: { name: loc }, update: {}, create: { name: loc } })
  }

  // Check if assets already exist
  const assetCount = await prisma.asset.count()
  if (assetCount > 0) {
    console.log(`Assets already exist (${assetCount}), skipping.`)
    return
  }

  const catRecords = await prisma.category.findMany()
  const locRecords = await prisma.location.findMany()
  const catMap = Object.fromEntries(catRecords.map(c => [c.name, c.id]))
  const locMap = Object.fromEntries(locRecords.map(l => [l.name, l.id]))

  const assets = [
    { name: 'Dell Latitude 5520', categoryName: '電腦設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 35000 },
    { name: 'MacBook Pro 14"', categoryName: '電腦設備', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 65000 },
    { name: 'HP EliteBook 840', categoryName: '電腦設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 38000 },
    { name: 'Lenovo ThinkPad X1', categoryName: '電腦設備', locationName: 'B棟1樓', status: 'IN_USE', purchasePrice: 42000 },
    { name: 'ASUS VivoBook 15', categoryName: '電腦設備', locationName: 'A棟2樓', status: 'AVAILABLE', purchasePrice: 28000 },
    { name: 'Dell OptiPlex 7090', categoryName: '電腦設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 25000 },
    { name: 'iMac 24" M3', categoryName: '電腦設備', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 52000 },
    { name: 'HP ProDesk 400', categoryName: '電腦設備', locationName: 'B棟1樓', status: 'AVAILABLE', purchasePrice: 22000 },
    { name: 'iPad Pro 12.9"', categoryName: '電腦設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 32000 },
    { name: 'Surface Pro 9', categoryName: '電腦設備', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 45000 },
    { name: 'Samsung 27" 顯示器', categoryName: '電腦設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 12000 },
    { name: 'LG 4K 32" 顯示器', categoryName: '電腦設備', locationName: 'B棟1樓', status: 'IN_USE', purchasePrice: 18000 },
    { name: 'Logitech MX Keys 鍵盤', categoryName: '電腦設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 3500 },
    { name: 'Logitech MX Master 3 滑鼠', categoryName: '電腦設備', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 2800 },
    { name: 'HP LaserJet 印表機', categoryName: '電腦設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 15000 },
    { name: 'IKEA MARKUS 辦公椅', categoryName: '辦公家具', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 8000 },
    { name: 'IKEA BEKANT 辦公桌', categoryName: '辦公家具', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 6500 },
    { name: 'Herman Miller Aeron 椅', categoryName: '辦公家具', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 35000 },
    { name: '會議桌 (10人)', categoryName: '辦公家具', locationName: 'B棟1樓', status: 'IN_USE', purchasePrice: 28000 },
    { name: '白板 180x90', categoryName: '辦公家具', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 3200 },
    { name: '檔案櫃 (4層)', categoryName: '辦公家具', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 4500 },
    { name: '沙發組 (3+1+1)', categoryName: '辦公家具', locationName: 'B棟1樓', status: 'IN_USE', purchasePrice: 22000 },
    { name: '書架 (6層)', categoryName: '辦公家具', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 3800 },
    { name: '投影布幕 120"', categoryName: '辦公家具', locationName: 'B棟1樓', status: 'AVAILABLE', purchasePrice: 5500 },
    { name: '站立辦公桌', categoryName: '辦公家具', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 12000 },
    { name: 'Cisco Catalyst 交換器', categoryName: '網路設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 25000 },
    { name: 'Ubiquiti UniFi AP', categoryName: '網路設備', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 5500 },
    { name: 'Cisco Router 2901', categoryName: '網路設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 35000 },
    { name: 'NAS Synology DS923+', categoryName: '網路設備', locationName: '倉庫', status: 'IN_USE', purchasePrice: 28000 },
    { name: '防火牆 FortiGate 60F', categoryName: '網路設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 45000 },
    { name: 'UPS APC 1500VA', categoryName: '網路設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 8500 },
    { name: 'TP-Link AP EAP670', categoryName: '網路設備', locationName: 'B棟1樓', status: 'IN_USE', purchasePrice: 4200 },
    { name: 'Netgear 16埠交換器', categoryName: '網路設備', locationName: 'B棟1樓', status: 'AVAILABLE', purchasePrice: 6800 },
    { name: 'IP 監控攝影機', categoryName: '網路設備', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 3500 },
    { name: 'VoIP 電話 Polycom', categoryName: '網路設備', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 6000 },
    { name: 'Toyota Corolla 2022', categoryName: '交通工具', locationName: '外借中', status: 'IN_USE', purchasePrice: 680000 },
    { name: 'Honda CR-V 2023', categoryName: '交通工具', locationName: '倉庫', status: 'AVAILABLE', purchasePrice: 920000 },
    { name: '電動機車 Gogoro S3', categoryName: '交通工具', locationName: '倉庫', status: 'AVAILABLE', purchasePrice: 85000 },
    { name: 'Ford Transit 廂型車', categoryName: '交通工具', locationName: '倉庫', status: 'MAINTENANCE', purchasePrice: 850000 },
    { name: 'Panasonic 投影機 PT-VMZ60', categoryName: '其他', locationName: 'B棟1樓', status: 'AVAILABLE', purchasePrice: 38000 },
    { name: 'Sony 65" 電視', categoryName: '其他', locationName: 'B棟1樓', status: 'IN_USE', purchasePrice: 42000 },
    { name: 'Epson 掃描器 DS-870', categoryName: '其他', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 18000 },
    { name: '咖啡機 DeLonghi', categoryName: '其他', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 12000 },
    { name: '冰箱 Panasonic 400L', categoryName: '其他', locationName: 'A棟2樓', status: 'IN_USE', purchasePrice: 22000 },
    { name: '除濕機 Hitachi', categoryName: '其他', locationName: '倉庫', status: 'AVAILABLE', purchasePrice: 8500 },
    { name: '空氣清淨機 Dyson', categoryName: '其他', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 15000 },
    { name: '碎紙機 Fellowes', categoryName: '其他', locationName: 'A棟1樓', status: 'IN_USE', purchasePrice: 5500 },
    { name: 'iPhone 15 Pro (公務)', categoryName: '電腦設備', locationName: '外借中', status: 'IN_USE', purchasePrice: 38000 },
    { name: 'GoPro Hero 12', categoryName: '其他', locationName: '倉庫', status: 'AVAILABLE', purchasePrice: 14000 },
    { name: '簡報器 Logitech Spotlight', categoryName: '其他', locationName: 'B棟1樓', status: 'AVAILABLE', purchasePrice: 3200 },
  ]

  let count = 0
  const today = new Date()
  for (const a of assets) {
    const purchaseDate = new Date(today)
    purchaseDate.setMonth(purchaseDate.getMonth() - Math.floor(Math.random() * 36))
    await prisma.asset.create({
      data: {
        name: a.name,
        categoryId: catMap[a.categoryName],
        locationId: locMap[a.locationName],
        status: a.status,
        purchasePrice: a.purchasePrice,
        purchaseDate,
        assetTag: `A${String(count + 1).padStart(4, '0')}`,
      }
    })
    count++
  }

  console.log(`Created ${count} assets.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
