import express from "express";

import { requireAdmin } from "../middleware/authorization.js";
import { upload } from "../middleware/upload.js";
import * as filesController from "../controllers/filesController.js";

const router = express.Router();

router.post(
  "/upload",
  requireAdmin,
  upload.array("file"),
  filesController.uploadNotes
);
router.get("/files", filesController.listNotes);
router.delete("/delete", requireAdmin, filesController.deleteNote);

export default router;
