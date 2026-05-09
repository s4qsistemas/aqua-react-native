import { Router } from "express";
import { registrarUsuario, actualizarUsuario, toggleStatus, resetPassword, obtenerUsuarios } from "./user.controller";
import { verifyToken } from "../../middlewares/auth.middleware";
import { requireSuperadmin } from "../../middlewares/requireSuperadmin";

const router = Router();

router.get("/", verifyToken, obtenerUsuarios);
router.post("/", verifyToken, requireSuperadmin, registrarUsuario);
router.put("/:id", verifyToken, requireSuperadmin, actualizarUsuario);
router.patch("/:id/estado", verifyToken, requireSuperadmin, toggleStatus);
router.post("/:id/reset-password", verifyToken, requireSuperadmin, resetPassword);

export default router;