import jwt from "jsonwebtoken"
import { prisma } from "../../lib/prisma"
import { Router } from "express"
import bcrypt from 'bcrypt'

const router = Router()

router.post("/", async (req, res) => {
  const { email, senha } = req.body

  const mensagemPadrao = "Login ou senha incorretos"

  if (!email || !senha) {
    return res.status(400).json({ erro: mensagemPadrao })
  }

  try {
    const usuario = await prisma.usuario.findFirst({ where: { email } })

    if (!usuario) {
      return res.status(400).json({ erro: mensagemPadrao })
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.senha)
    if (!senhaValida) {
      return res.status(400).json({ erro: mensagemPadrao })
    }

    const token = jwt.sign(
      { usuarioLogadoId: usuario.id, usuarioLogadoNome: usuario.nome },
      process.env.JWT_KEY as string,
      { expiresIn: "24h" }
    )

    res.status(200).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      admin: usuario.admin,
      token
    })
  } catch (error) {
    console.error("Erro no login:", error)
    res.status(500).json({ erro: "Erro ao processar login" })
  }
})

export default router