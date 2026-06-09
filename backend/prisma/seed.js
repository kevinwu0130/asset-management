require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234'
  const name = process.env.ADMIN_NAME || '系統管理員'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Admin already exists, skipping seed.')
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { name, email, password: hashed, role: 'ADMIN' }
  })

  // Default categories
  const categories = ['電腦設備', '辦公家具', '網路設備', '交通工具', '其他']
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat }
    })
  }

  // Default locations
  const locations = ['A棟1樓', 'A棟2樓', 'B棟1樓', '倉庫', '外借中']
  for (const loc of locations) {
    await prisma.location.upsert({
      where: { name: loc },
      update: {},
      create: { name: loc }
    })
  }

  console.log(`Admin created: ${email} / ${password}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
