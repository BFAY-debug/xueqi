const logger = require('./logger');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: '数据已存在，请检查输入'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token 无效'
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token 已过期'
    });
  }

  // Validation error (custom)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: '文件大小超出限制'
    });
  }

  // Default
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? '服务器内部错误' : err.message
  });
}

module.exports = errorHandler;
