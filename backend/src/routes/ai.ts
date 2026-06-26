import { Router } from "express";
import { aiController } from "../controllers/aiController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Apply authentication middleware to all AI routes
router.use(authMiddleware);

router.get("/diagnostics", aiController.getDiagnostics);
router.post("/prioritize", aiController.prioritize);
router.post("/subtasks", aiController.generateSubtasks);
router.post("/focus-plan", aiController.generateDailyPlan);
router.post("/chat", aiController.chat);

export default router;
