import { prisma } from "../lib/prisma";
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../middlewares/auth";
 
const router = Router();
 
const criarBarbeiroSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve ter pelo mínimo 3 caracteres" }),
  email: z.string().email({ message: "E-mail inválido" }).min(10, { message: "E-mail muito curto" }),
  telefone: z.string().min(11).max(11, { message: "Telefone deve conter 11 dígitos (somente números)" }),
  anosExp: z.coerce.number().int().nonnegative({ message: "Anos de experiência deve ser um número inteiro não-negativo" }),
  ativo: z.boolean().optional().default(true),
  funcao: z.enum(["BARBEIRO", "APRENDIZ", "GERENTE"]).optional().default("BARBEIRO"),
  barbeariaId: z.coerce.number().int().positive(),
});
 
const atualizarBarbeiroSchema = criarBarbeiroSchema.partial();
 
const toggleAtivoSchema = z.object({
  ativo: z.boolean(),
});
 
function barbeiroInfosAdicionais(barbeiro: any) {
  const agendamentosDoBarbbeiro = Array.isArray(barbeiro.agendamento)
    ? barbeiro.agendamento
    : [];
 
  const totalAgendamentos = agendamentosDoBarbbeiro.length;
  const agendamentosConluidos = agendamentosDoBarbbeiro.filter(
    (a: any) => a.status === "CONCLUIDO"
  ).length;
 
  return {
    ...barbeiro,
    totalAgendamentos,
    agendamentosConluidos,
  };
}
 
router.get("/", async (req, res) => {
  try {
    const barbeiros = await prisma.barbeiro.findMany({
      include: {
        barbearia: true,
        agendamento: true,
      },
      orderBy: { createdAt: "desc" },
    });
 
    const barbeirosComTotais = barbeiros.map(barbeiroInfosAdicionais);
 
    res.status(200).json(barbeirosComTotais);
  } catch (error) {
    console.error("Erro ao buscar barbeiros:", error);
    res.status(500).json({ erro: "Erro ao buscar barbeiros" });
  }
});
 
router.get("/barbearia/:barbeariaId", async (req, res) => {
  const { barbeariaId } = req.params;
 
  try {
    const barbeiros = await prisma.barbeiro.findMany({
      where: {
        barbeariaId: Number(barbeariaId),
      },
      include: {
        barbearia: true,
        agendamento: true,
      },
      orderBy: { createdAt: "desc" },
    });
 
    const barbeirosComTotais = barbeiros.map(barbeiroInfosAdicionais);
 
    res.status(200).json(barbeirosComTotais);
  } catch (error) {
    console.error("Erro ao buscar barbeiros da barbearia:", error);
    res.status(500).json({ erro: "Erro ao buscar barbeiros da barbearia" });
  }
});
 
router.post("/", verificaToken, async (req, res) => {
  const parseResult = criarBarbeiroSchema.safeParse(req.body);
 
  if (!parseResult.success) {
    return res.status(400).json({ erro: parseResult.error.flatten() });
  }
 
  const { nome, email, telefone, anosExp, ativo, funcao, barbeariaId } = parseResult.data;
 
  try {
    const novoBarbeiro = await prisma.barbeiro.create({
      data: {
        nome,
        email,
        telefone,
        anosExp,
        ativo: ativo ?? true,
        funcao: funcao ?? "BARBEIRO",
        barbeariaId,
      },
      include: {
        barbearia: true,
        agendamento: true,
      },
    });
 
    const barbeiroComTotais = barbeiroInfosAdicionais(novoBarbeiro);
 
    res.status(201).json(barbeiroComTotais);
  } catch (error) {
    console.error("Erro ao criar barbeiro:", error);
    res.status(400).json({ erro: "Erro ao criar barbeiro" });
  }
});
 
router.put("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;
  const parseResult = atualizarBarbeiroSchema.safeParse(req.body);
 
  if (!parseResult.success) {
    return res.status(400).json({ erro: parseResult.error.flatten() });
  }
 
  const { nome, email, telefone, anosExp, ativo, funcao, barbeariaId } = parseResult.data;
 
  try {
    const dadosAtualizacao: any = {};
 
    if (typeof nome !== "undefined") dadosAtualizacao.nome = nome;
    if (typeof email !== "undefined") dadosAtualizacao.email = email;
    if (typeof telefone !== "undefined") dadosAtualizacao.telefone = telefone;
    if (typeof anosExp !== "undefined") dadosAtualizacao.anosExp = anosExp;
    if (typeof ativo !== "undefined") dadosAtualizacao.ativo = ativo;
    if (typeof funcao !== "undefined") dadosAtualizacao.funcao = funcao;
    if (typeof barbeariaId !== "undefined") dadosAtualizacao.barbeariaId = barbeariaId;
 
    const barbeiro = await prisma.barbeiro.update({
      where: { id: Number(id) },
      data: dadosAtualizacao,
      include: {
        barbearia: true,
        agendamento: true,
      },
    });
 
    const barbeiroComTotais = barbeiroInfosAdicionais(barbeiro);
 
    res.status(200).json(barbeiroComTotais);
  } catch (error) {
    console.error("Erro ao atualizar barbeiro:", error);
    res.status(400).json({ erro: "Erro ao atualizar barbeiro" });
  }
});
 
// PATCH /:id — usado pelo frontend para dar folga ou retomar atividade
router.patch("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;
  const parseResult = toggleAtivoSchema.safeParse(req.body);
 
  if (!parseResult.success) {
    return res.status(400).json({ erro: parseResult.error.flatten() });
  }
 
  try {
    const barbeiro = await prisma.barbeiro.update({
      where: { id: Number(id) },
      data: { ativo: parseResult.data.ativo },
      include: {
        barbearia: true,
        agendamento: true,
      },
    });
 
    const barbeiroComTotais = barbeiroInfosAdicionais(barbeiro);
 
    res.status(200).json(barbeiroComTotais);
  } catch (error) {
    console.error("Erro ao atualizar status do barbeiro:", error);
    res.status(400).json({ erro: "Erro ao atualizar status do barbeiro" });
  }
});
 
router.delete("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;
 
  try {
    const barbeiro = await prisma.barbeiro.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(barbeiro);
  } catch (error) {
    console.error("Erro ao excluir barbeiro:", error);
    res.status(400).json({ erro: "Erro ao excluir barbeiro" });
  }
});
 
export default router;