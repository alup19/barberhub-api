import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const isAdmin = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    if (!req.userLogadoId) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.userLogadoId },
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    if (usuario.tipo !== "ADMIN" && !usuario.admin) {
      return res.status(403).json({ erro: "Acesso negado. Apenas administradores podem acessar este recurso" });
    }

    req.usuario = usuario;

    next();
  } catch (error) {
    console.error("Erro na verificação de admin:", error);
    return res.status(500).json({ erro: "Erro ao verificar permissões" });
  }
};