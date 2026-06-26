import { Router } from "express";
import { tasksController } from "../controllers/tasksController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Apply authentication middleware to all task routes
router.use(authMiddleware);

router.get("/", tasksController.getTasks);
router.post("/", tasksController.createTask);
router.put("/:id", tasksController.updateTask);
router.delete("/:id", tasksController.deleteTask);

export default router;
