import { prisma } from "../lib/prisma"
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../middlewares/auth";
import { isAdmin } from "../middlewares/isAdmin";

const router = Router();

const timeStringSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const [hours, minutes, seconds = "0"] = trimmed.split(":");
      const now = new Date();
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        Number(hours),
        Number(minutes),
        Number(seconds),
      );
    }
    const parsed = new Date(trimmed);
    return !Number.isNaN(parsed.getTime()) ? parsed : trimmed;
  }
  return value;
}, z.date());

const barbeariaSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve ter pelo mínimo 3 caracteres" }),
  endereco: z.string().min(3, { message: "Endereço deve ter pelo mínimo 3 caracteres" }),
  telefone: z.string().min(10, { message: "Telefone deve tem pelo mínimo 10 caracteres" }),
  descricao: z.string().optional().nullable(),
  horarioOpen: timeStringSchema,
  horarioClose: timeStringSchema,
  usuarioId: z.string(),
}).refine((data) => data.horarioClose > data.horarioOpen, {
  message: "Horário de fechamento deve ser após o horário de abertura",
  path: ["horarioClose"],
});

const atualizarBarbeariaSchema = z.object({
  nome: z.string().min(3).optional(),
  endereco: z.string().min(3).optional(),
  telefone: z.string().min(10).optional(),
  descricao: z.string().optional().nullable(),
  horarioOpen: timeStringSchema.optional(),
  horarioClose: timeStringSchema.optional(),
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

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : error.meta?.target;
      return res.status(400).json({ erro: `Registro duplicado para o campo(s): ${target}` });
    }

    const mensagem = error instanceof Error ? error.message : "Erro ao criar barbearia";
    res.status(400).json({ erro: mensagem });
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

  if (horarioOpen && horarioClose && horarioClose <= horarioOpen) {
    return res.status(400).json({ erro: "Horário de fechamento deve ser após o horário de abertura" });
  }

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
