import { prisma } from "../lib/prisma"
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { verificaToken } from "../middlewares/auth";
import { isAdmin } from "../middlewares/isAdmin";

const router = Router()

const usuarioSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve possuir, no mínimo, 3 caracteres" }),
  email: z.string().email({ message: "E-mail inválido" }).min(10, { message: "E-mail muito curto" }),
  telefone: z.string().min(11).max(11, { message: "Celular deve conter 11 dígitos (somente números)" }),
  senha: z.string().min(8, { message: "Senha deve possuir no mínimo 8 caracteres" })
})

function validaSenha(senha: string): string[] {
  const erros: string[] = []

  if (senha.length < 8) {
    erros.push("A senha deve possuir, no mínimo, 8 caracteres")
  }

  let minusculas = 0, maiusculas = 0, numeros = 0, simbolos = 0

  for (const char of senha) {
    if (/[a-z]/.test(char)) minusculas++
    else if (/[A-Z]/.test(char)) maiusculas++
    else if (/[0-9]/.test(char)) numeros++
    else simbolos++
  }

  if (minusculas === 0) erros.push("A senha deve possuir letra(s) minúscula(s)")
  if (maiusculas === 0) erros.push("A senha deve possuir letra(s) maiúscula(s)")
  if (numeros === 0) erros.push("A senha deve possuir número(s)")
  if (simbolos === 0) erros.push("A senha deve possuir símbolo(s)")

  return erros
}

router.get("/", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany()
    res.status(200).json(usuarios)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const usuarios = await prisma.usuario.findUnique({
      where: { id }
    })
    res.status(200).json(usuarios)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post("/", async (req, res) => {
  const valida = usuarioSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { nome, email, telefone, senha} = valida.data

  const errosSenha = validaSenha(senha)
  if (errosSenha.length > 0) {
    return res.status(400).json({ erro: errosSenha })
  }

  const salt = bcrypt.genSaltSync(12)
  const senhaCriptografada = bcrypt.hashSync(senha, salt)

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        telefone,
        senha: senhaCriptografada
      }
    })
    res.status(201).json(usuario)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.put("/:id", verificaToken, async (req, res) => {
  const { id } = req.params

  const valida = usuarioSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { nome, email, telefone, senha } = valida.data

  const errosSenha = validaSenha(senha)
  if (errosSenha.length > 0) {
    return res.status(400).json({ erro: errosSenha })
  }

  const senhaCriptografada = bcrypt.hashSync(senha, 12)

  try {
    const usuario = await prisma.usuario.update({
      where: { id: id },
      data: { nome, email, telefone, senha: senhaCriptografada }
    })
    res.status(200).json(usuario)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", verificaToken, isAdmin, async (req, res) => {
  const { id } = req.params

  try {
    const usuario = await prisma.usuario.delete({
      where: { id: id }
    })
    res.status(200).json(usuario)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

const promoverSchema = z.object({
  usuarioId: z.string().uuid("ID inválido"),
  ativar: z.boolean()
})

router.patch(
  "/promover-admin", 
  verificaToken,
  async (req, res) => {
    try {
      const valida = promoverSchema.safeParse(req.body)
      if (!valida.success) {
        return res.status(400).json({ erro: valida.error.flatten() })
      }

      const { usuarioId, ativar } = valida.data

      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId }
      })
      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado" })
      }

      if (usuarioId === (req as any).userLogadoId) {
        return res.status(403).json({ erro: "Não pode modificar sua própria permissão" })
      }

      const usuarioAtualizado = await prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          tipo: ativar ? "ADMIN" : "USER",
          admin: ativar
        },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          updatedAt: true
        }
      })

      res.status(200).json({
        mensagem: ativar ? "Usuário promovido a ADMIN" : "Usuário rebaixado para USER",
        usuario: usuarioAtualizado
      })
    } catch (error) {
      console.error("Erro ao promover:", error)
      res.status(500).json({ erro: "Erro ao modificar permissão" })
    }
  }
)

router.get("/telefone/:telefone", async (req, res) => {
  const { telefone } = req.params;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { telefone },
      select: { id: true, nome: true, telefone: true },
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    res.status(200).json(usuario);
  } catch (error) {
    console.error("Erro ao buscar usuário por telefone:", error);
    res.status(500).json({ erro: "Erro ao buscar usuário" });
  }
});

export default router
