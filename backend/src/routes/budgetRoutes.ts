import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  analyzeBudgets,
} from "../controllers/budgetController.js";

const router = express.Router();

router.use(protect);

router.get("/", getBudgets);
router.post("/", createBudget);
router.post("/analyze", analyzeBudgets);

router.put("/:id", updateBudget);
router.delete("/:id", deleteBudget);

export default router;
