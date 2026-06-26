import { Router } from "express";
import { calendarController } from "../controllers/calendarController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Apply authentication middleware to all calendar routes
router.use(authMiddleware);

router.get("/status", calendarController.getStatus);
router.post("/connect", calendarController.connect);
router.post("/sync", calendarController.sync);
router.get("/events", calendarController.getEvents);

export default router;
