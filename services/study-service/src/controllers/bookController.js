const bookService = require('../services/bookService');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'covers');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cover_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

async function listBooks(req, res, next) {
  try {
    const { page, pageSize, search, category, sort } = req.query;
    const result = await bookService.getBooks({ page, pageSize, search, category, sort });
    res.paginate(result.data, result.total, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 12);
  } catch (err) { next(err); }
}

async function getBook(req, res, next) {
  try {
    const book = await bookService.getBookById(parseInt(req.params.id, 10));
    res.success(book);
  } catch (err) { next(err); }
}

async function getRecommendations(req, res, next) {
  try {
    const books = await bookService.getRecommendations(req.user.userId);
    res.success(books);
  } catch (err) { next(err); }
}

async function submitBook(req, res, next) {
  try {
    const coverUrl = req.file ? `/uploads/covers/${req.file.filename}` : req.body.coverUrl;
    const result = await bookService.submitBook(req.user.userId, { ...req.body, coverUrl });
    res.success(result, '书籍推荐已提交，等待审核', 201);
  } catch (err) { next(err); }
}

async function addBook(req, res, next) {
  try {
    const coverUrl = req.file ? `/uploads/covers/${req.file.filename}` : req.body.coverUrl;
    const book = await bookService.addBook({ ...req.body, coverUrl });
    res.success(book, '书籍添加成功', 201);
  } catch (err) { next(err); }
}

async function updateBook(req, res, next) {
  try {
    const book = await bookService.updateBook(parseInt(req.params.id, 10), req.body);
    res.success(book, '书籍更新成功');
  } catch (err) { next(err); }
}

async function deleteBook(req, res, next) {
  try {
    await bookService.deleteBook(parseInt(req.params.id, 10));
    res.success(null, '书籍已删除');
  } catch (err) { next(err); }
}

async function getPendingBooks(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await bookService.getPendingBooks(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function reviewBook(req, res, next) {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.error('action 必须为 approve 或 reject', 400);
    }
    const result = await bookService.reviewBook(parseInt(req.params.id, 10), req.user.userId, { action, reason });
    res.success(result, action === 'approve' ? '书籍已通过审核' : '书籍已拒绝');
  } catch (err) { next(err); }
}

async function rateBook(req, res, next) {
  try {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.error('评分须在 1-5 之间', 400);
    }
    const result = await bookService.rateBook(parseInt(req.params.id, 10), req.user.userId, { rating, review });
    res.success(result, '评分成功');
  } catch (err) { next(err); }
}

async function toggleCollection(req, res, next) {
  try {
    const result = await bookService.toggleCollection(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, result.collected ? '已收藏' : '已取消收藏');
  } catch (err) { next(err); }
}

async function getMyCollections(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await bookService.getMyCollections(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

module.exports = {
  upload,
  listBooks,
  getBook,
  getRecommendations,
  submitBook,
  addBook,
  updateBook,
  deleteBook,
  getPendingBooks,
  reviewBook,
  rateBook,
  toggleCollection,
  getMyCollections
};
