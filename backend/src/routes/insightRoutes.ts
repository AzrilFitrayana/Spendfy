import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  generateInsight,
  getInsigths,
} from "../controllers/insightController.js";

const router = express.Router();

router.use(protect);

router.get("/", getInsigths);
router.post("/generate", generateInsight);

export default router;
