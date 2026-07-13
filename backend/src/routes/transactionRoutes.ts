import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  createTransaction,
  getTransactionById,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  analyzeTransactions,
} from "../controllers/transactionController.js";

const router = express.Router();

router.use(protect);

router.get("/", getTransactions);
router.post("/", createTransaction);
router.post("/analyze", analyzeTransactions);
router.get("/:id", getTransactionById);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
