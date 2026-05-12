import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import tenantRoutes from "./modules/tenants/tenant.routes";
import userRoutes from './modules/users/user.routes';
import telemetriaRoutes from './modules/telemetria/telemetria.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/telemetria', telemetriaRoutes);

export default app;

