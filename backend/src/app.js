require('dotenv').config()
const path = require('path')
const express = require('express')
const cors = require('cors')
const { errorHandler } = require('./middleware/errorHandler')

const app = express()

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174']

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth',        require('./routes/auth'))
app.use('/api/assets',      require('./routes/assets'))
app.use('/api/categories',  require('./routes/categories'))
app.use('/api/locations',   require('./routes/locations'))
app.use('/api/loans',       require('./routes/loans'))
app.use('/api/users',       require('./routes/users'))
app.use('/api/dashboard',   require('./routes/dashboard'))
app.use('/api/reports',     require('./routes/reports'))
app.use('/api/logs',        require('./routes/logs'))
app.use('/api/maintenance', require('./routes/maintenance'))
app.use('/api/attachments', require('./routes/attachments'))

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use(errorHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`))
