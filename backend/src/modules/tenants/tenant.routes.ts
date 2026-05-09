import { Router } from "express";
import {
    crearTenant,
    listarTenants,
    obtenerTenant,
    actualizarTenant,
    cambiarEstadoTenant,
    cambiarPlanTenant,
    getHistorial,
    listarPlanes,
} from "./tenant.controller";
import { requireSuperadmin } from "../../middlewares/requireSuperadmin";
import { verifyToken } from "../../middlewares/auth.middleware";


const router = Router();

router.use(verifyToken);
router.use(requireSuperadmin);

router.get("/", listarTenants);
router.get("/planes", listarPlanes);
router.post("/", crearTenant);
router.get("/:id", obtenerTenant);
router.put("/:id", actualizarTenant);
router.patch("/:id/estado", cambiarEstadoTenant);
router.patch("/:id/plan", cambiarPlanTenant);
router.get("/:id/historial", getHistorial);

export default router;