# 資產管理系統 (Asset Management System)

Web 架構的資產管理系統，支援本機單人與雲端多人雙棲部署。

## 功能

- **資產 CRUD**：編號、分類、狀態、保管人、地點、保固管理
- **生命週期履歷**：所有變動自動記錄
- **批次匯入/匯出**：CSV 格式
- **借還管理**：申請、審核、歸還流程
- **儀表板**：統計圖表、保固到期提醒
- **RBAC**：ADMIN / MANAGER / USER 三層權限

## 快速啟動

### 方式一：本機開發（Node.js + SQLite）

```bash
# 後端
cd backend
cp ../.env.example .env    # 調整設定
npm install
npm run db:push
npm run db:seed
npm run dev

# 前端（另開終端機）
cd frontend
npm install
npm run dev
```

前端：http://localhost:5173  
後端：http://localhost:3000  
預設帳號：admin@example.com / Admin@1234

### 方式二：Docker 本機模式（SQLite）

```bash
docker-compose -f docker-compose.local.yml up --build
```

### 方式三：Docker 正式環境（PostgreSQL）

```bash
cp .env.example .env   # 設定 JWT_SECRET、ADMIN_PASSWORD 等
docker-compose up --build -d
```

開啟 http://localhost

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| DATABASE_PROVIDER | `sqlite` 或 `postgresql` | sqlite |
| DATABASE_URL | 資料庫連線字串 | file:./dev.db |
| JWT_SECRET | JWT 簽名金鑰（正式環境請務必更換） | - |
| JWT_EXPIRES_IN | Token 有效時間 | 8h |
| ADMIN_EMAIL | 初始管理員 Email | admin@example.com |
| ADMIN_PASSWORD | 初始管理員密碼 | Admin@1234 |

## 專案結構

```
asset-management/
├── backend/
│   ├── prisma/         # Schema & Seed
│   └── src/
│       ├── routes/     # API 路由
│       ├── middleware/ # Auth & ErrorHandler
│       └── app.js
├── frontend/
│   └── src/
│       ├── pages/      # 各頁面
│       ├── components/ # 共用元件
│       ├── hooks/      # useAuth
│       └── lib/        # api.js
├── docker-compose.yml        # 正式環境
└── docker-compose.local.yml  # 本機開發
```

## API 路由

| Method | Path | 說明 |
|--------|------|------|
| POST | /api/auth/login | 登入 |
| GET | /api/assets | 資產列表（分頁、篩選） |
| POST | /api/assets | 新增資產 |
| PUT | /api/assets/:id | 更新資產（自動記錄履歷） |
| GET | /api/assets/export/csv | 匯出 CSV |
| POST | /api/assets/import/csv | 匯入 CSV |
| GET | /api/loans | 借還列表 |
| POST | /api/loans | 申請借用 |
| PUT | /api/loans/:id/approve | 核准借用 |
| PUT | /api/loans/:id/return | 確認歸還 |
| GET | /api/dashboard | 儀表板統計 |
