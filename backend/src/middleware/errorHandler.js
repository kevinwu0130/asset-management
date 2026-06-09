function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${err.message}`)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: err.message || '伺服器內部錯誤',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

module.exports = { errorHandler }
