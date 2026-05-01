import { prisma } from "../lib/prisma";
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../middlewares/auth";

const router = Router();

const barbeiroBarbeSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve ter pelo mínimo 3 caracteres" }),
  foto: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  barbeariaId: z.coerce.number().int().positive(),
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
  const parseResult = barbeiroBarbeSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ erro: parseResult.error.flatten() });
  }

  const { nome, foto, bio, barbeariaId } = parseResult.data;

  try {
    const novoBarbeiro = await prisma.barbeiro.create({
      data: {
        nome,
        foto: foto ?? null,
        bio: bio ?? null,
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
  const parseResult = barbeiroBarbeSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ erro: parseResult.error.flatten() });
  }

  const { nome, foto, bio, barbeariaId } = parseResult.data;

  try {
    const barbeiro = await prisma.barbeiro.update({
      where: { id: Number(id) },
      data: {
        nome,
        foto: foto ?? null,
        bio: bio ?? null,
        barbeariaId,
      },
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
