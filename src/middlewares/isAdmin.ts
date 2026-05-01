import { Request, Response, NextFunction } from "express"
import { prisma } from "../lib/prisma"
import { Tipo_Usuario } from "@prisma/client"

export const isAdmin = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    if (!req.userLogadoId) {
      return res.status(401).json({ erro: "Usuário não autenticado" })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.userLogadoId }
    })

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      return res.status(403).json({ erro: "Usuário inativo" })
    }

    // Verificar permissões de admin: tipo ADMIN ou campo admin true
    const isAdmin = usuario.tipo === Tipo_Usuario.ADMIN || usuario.admin === true

    if (!isAdmin) {
      return res.status(403).json({
        erro: "Acesso negado. Apenas administradores podem acessar este recurso"
      })
    }

    req.usuario = usuario

    next()
  } catch (error) {
    console.error("Erro na verificação de admin:", error)
    return res.status(500).json({ erro: "Erro ao verificar permissões" })
  }
}