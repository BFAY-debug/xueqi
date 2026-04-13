/**
 * Unified response handler middleware
 * Adds res.success() and res.error() helpers
 */
function responseHandler(req, res, next) {
  res.success = (data = null, message = 'Success', code = 200) => {
    return res.status(code).json({
      success: true,
      message,
      data
    });
  };

  res.error = (message = 'Internal Server Error', code = 500, errors = null) => {
    const response = {
      success: false,
      message
    };
    if (errors) response.errors = errors;
    return res.status(code).json(response);
  };

  res.paginate = (data, total, page, pageSize, message = 'Success') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalPages: Math.ceil(total / parseInt(pageSize, 10))
      }
    });
  };

  next();
}

module.exports = responseHandler;
