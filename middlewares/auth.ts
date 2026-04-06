import jwt  from "jsonwebtoken"
import { Request, Response, NextFunction } from 'express'

type TokenType = {
    adminLogadoId: string
    adminLogadoNome: string
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
        const { adminLogadoId, adminLogadoNome } = decode as TokenType

        req.userLogadoId    = adminLogadoId
        req.userLogadoNome  = adminLogadoNome

        next()
    } catch (error) {
        res.status(401).json({ error: "Token Inválido" })
    }
}