import { Request, Response } from "express";
import * as userService from "./user.service";
import { io } from "../../server";

export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const usuarioCreado = await userService.crearUsuario(req.body);
        io.emit('comunidades_actualizadas');
        res.status(201).json(usuarioCreado);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const actualizarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const usuarioActualizado = await userService.actualizarUsuario(id, req.body);
        io.emit('comunidades_actualizadas');
        res.status(200).json(usuarioActualizado);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const toggleStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { estado } = req.body;
        const usuario = await userService.cambiarEstadoUsuario(id, estado);
        res.status(200).json(usuario);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const resultado = await userService.resetearPasswordUsuario(id);
        res.status(200).json(resultado);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const obtenerUsuarios = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Usuario no autenticado" });
            return;
        }
        // Si no es Superadmin, solo listamos los de su propio Tenant
        const tenantId = req.user.rol === 'SUPERADMIN' ? undefined : req.user.tenantId || undefined;
        const usuarios = await userService.listarUsuarios(tenantId);
        res.status(200).json(usuarios);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};