import jwt  from "jsonwebtoken"
import { Request, Response, NextFunction } from 'express'

type TokenType = {
    usuarioLogadoId: string
    usuarioLogadoNome: string
    adminLogadoId?: string  // opcional para compatibilidade
    adminLogadoNome?: string  // opcional para compatibilidade
}

// Acrescenta na interface Request (de forma global) os 2 novos atributos (TypeScript)
declare global {
  namespace Express {
    interface Request {
      userLogadoId?: string
      userLogadoNome?: string
    }
  }
}

export function verificaToken(req: Request | any, res: Response, next: NextFunction) {
    const { authorization } = req.headers

    if (!authorization) {
        res.status(401).json({ error: "Token não informado" })
        return
    }

    const token = authorization.split(" ")[1]

    try {
        const decode = jwt.verify(token, process.env.JWT_KEY as string)
        // console.log(decode)
        const decoded = decode as TokenType

        // Suporte para tokens antigos (adminLogadoId) e novos (usuarioLogadoId)
        const userId = decoded.usuarioLogadoId || decoded.adminLogadoId
        const userNome = decoded.usuarioLogadoNome || decoded.adminLogadoNome

        if (!userId || !userNome) {
            return res.status(401).json({ error: "Token malformado" })
        }

        req.userLogadoId    = userId
        req.userLogadoNome  = userNome

        next()
    } catch (error) {
        res.status(401).json({ error: "Token Inválido" })
    }
}