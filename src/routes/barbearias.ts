import { prisma } from "../../lib/prisma"
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../../middlewares/auth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = Router();

const barbeariaSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve ter pelo mínimo 3 caracteres" }),
  endereco: z.string().min(3, { message: "Endereço deve ter pelo mínimo 3 caracteres" }),
  telefone: z.string().min(10, { message: "Telefone deve tem pelo mínimo 10 caracteres" }),
  descricao: z.string().optional().nullable(),
  horarioOpen: z.coerce.date(),
  horarioClose: z.coerce.date(),
  usuarioId: z.string(),
});

const atualizarBarbeariaSchema = z.object({
  nome: z.string().min(3).optional(),
  endereco: z.string().min(3).optional(),
  telefone: z.string().min(10).optional(),
  descricao: z.string().optional().nullable(),
  horarioOpen: z.coerce.date().optional(),
  horarioClose: z.coerce.date().optional(),
});

function barbeariaInfosAdicionais(barbearia: any) {
  const totalBarbeiros = Array.isArray(barbearia.barbeiros)
    ? barbearia.barbeiros.length
    : 0;
  const totalServicos = Array.isArray(barbearia.servicos)
    ? barbearia.servicos.length
    : 0;
  const totalAgendamentos = Array.isArray(barbearia.agendamento)
    ? barbearia.agendamento.length
    : 0;

  return {
    ...barbearia,
    totalBarbeiros,
    totalServicos,
    totalAgendamentos,
  };
}

router.get("/", async (req, res) => {
  try {
    const barbearias = await prisma.barbearia.findMany({
      include: {
        usuario: true,
        barbeiros: true,
        servicos: true,
        agendamento: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const barbariasComTotais = barbearias.map(barbeariaInfosAdicionais);

    res.status(200).json(barbariasComTotais);
  } catch (error) {
    console.error("Erro ao buscar barbearias:", error);
    res.status(500).json({ erro: "Erro ao buscar barbearias" });
  }
});

router.get("/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const barbearias = await prisma.barbearia.findMany({
      where: { usuarioId },
      include: {
        usuario: true,
        barbeiros: true,
        servicos: true,
        agendamento: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const barbariasComTotais = barbearias.map(barbeariaInfosAdicionais);

    res.status(200).json(barbariasComTotais);
  } catch (error) {
    console.error("Erro ao buscar barbearias do usuário:", error);
    res.status(500).json({ erro: "Erro ao buscar barbearias do usuário" });
  }
});

router.post("/", verificaToken, async (req, res) => {
  const parseResult = barbeariaSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ erro: parseResult.error.flatten() });
  }

  const {
    nome,
    endereco,
    telefone,
    descricao,
    horarioOpen,
    horarioClose,
    usuarioId,
  } = parseResult.data;

  try {
    const novaBarbearia = await prisma.barbearia.create({
      data: {
        nome,
        endereco,
        telefone,
        descricao: descricao ?? null,
        horarioOpen,
        horarioClose,
        usuarioId,
      },
      include: {
        usuario: true,
        barbeiros: true,
        servicos: true,
        agendamento: true,
      },
    });

    const barbeariaComTotais = barbeariaInfosAdicionais(novaBarbearia);

    res.status(201).json(barbeariaComTotais);
  } catch (error) {
    console.error("Erro ao criar barbearia:", error);
    res.status(400).json({ erro: "Erro ao criar barbearia" });
  }
});

router.put("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;
  const parseResult = atualizarBarbeariaSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ erro: parseResult.error.flatten() });
  }

  const {
    nome,
    endereco,
    telefone,
    descricao,
    horarioOpen,
    horarioClose,
  } = parseResult.data;

  try {
    const dadosAtualizacao: any = {};

    if (typeof nome !== "undefined") {
      dadosAtualizacao.nome = nome;
    }

    if (typeof endereco !== "undefined") {
      dadosAtualizacao.endereco = endereco;
    }

    if (typeof telefone !== "undefined") {
      dadosAtualizacao.telefone = telefone;
    }

    if (typeof descricao !== "undefined") {
      dadosAtualizacao.descricao = descricao;
    }

    if (typeof horarioOpen !== "undefined") {
      dadosAtualizacao.horarioOpen = horarioOpen;
    }

    if (typeof horarioClose !== "undefined") {
      dadosAtualizacao.horarioClose = horarioClose;
    }

    const barbearia = await prisma.barbearia.update({
      where: { id: Number(id) },
      data: dadosAtualizacao,
      include: {
        usuario: true,
        barbeiros: true,
        servicos: true,
        agendamento: true,
      },
    });

    const barbeariaComTotais = barbeariaInfosAdicionais(barbearia);

    res.status(200).json(barbeariaComTotais);
  } catch (error) {
    console.error("Erro ao atualizar barbearia:", error);
    res.status(400).json({ erro: "Erro ao atualizar barbearia" });
  }
});

router.delete("/:id", verificaToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const barbearia = await prisma.barbearia.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(barbearia);
  } catch (error) {
    console.error("Erro ao excluir barbearia:", error);
    res.status(400).json({ erro: "Erro ao excluir barbearia" });
  }
});

export default router;
