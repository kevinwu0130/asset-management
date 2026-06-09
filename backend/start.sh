#!/bin/sh
# Railway production start script
# Patches schema from sqlite to postgresql, then starts the server

echo "Patching Prisma schema for PostgreSQL..."
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "Generating Prisma client..."
npx prisma generate

echo "Pushing schema to database..."
npx prisma db push --skip-generate

echo "Seeding admin user..."
node prisma/seed.js

echo "Starting server..."
node src/app.js
