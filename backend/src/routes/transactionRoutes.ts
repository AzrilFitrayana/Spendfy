import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createTransaction, getTransactionById, getTransactions, updateTransaction, deleteTransaction } from "../controllers/transactionController.js";

const router = express.Router();

router.use(protect);

router.get('/', getTransactions)
router.post('/', createTransaction)
router.get('/:id', getTransactionById)
router.put('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)

export default router