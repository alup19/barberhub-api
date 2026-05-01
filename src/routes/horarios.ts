import { prisma } from "../lib/prisma";
import { Dia_Semana } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../middlewares/auth";

const router = Router();

const horarioSchema = z.object({
  diaSemana: z.nativeEnum(Dia_Semana),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
  ativo: z.boolean().optional().default(true),
  barbeiroId: z.coerce.number().int().positive(),
});

const atualizarHorarioSchema = z.object({
  diaSemana: z.nativeEnum(Dia_Semana).optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  ativo: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  try {
    const horarios = await prisma.horario_Disponivel.findMany({
      include: {
        barbeiro: {
          include: {
            barbearia: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(horarios);
  } catch (error) {
    console.error("Erro ao buscar horários:", error);
    res.status(500).json({ erro: "Erro ao buscar horários" });
  }
});

router.get("/barbeiro/:barbeiroId", async (req, res) => {
  const { barbeiroId } = req.params;

  try {
    const horarios = await prisma.horario_Disponivel.findMany({
      where: {
        barbeiroId: Number(barbeiroId),
        ativo: true,
      },
      include: {
        barbeiro: {
          include: {
            barbearia: true,
          },
        },
      },
      orderBy: { diaSemana: "asc" },
    });

    res.status(200).json(horarios);
  } catch (error) {
    console.error("Erro ao buscar horários do barbeiro:", error);
    res.status(500).json({ erro: "Erro ao buscar horários do barbeiro" });
  }
});

router.post("/", verificaToken, async (req, res) => {
  const valida = horarioSchema.safeParse(req.body);
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error });
  }

  const { diaSemana, inicio, fim, ativo, barbeiroId } = valida.data;

  try {
    const novoHorario = await prisma.horario_Disponivel.create({
      data: {
        diaSemana,
        inicio,
        fim,
        ativo: ativo ?? true,
        barbeiroId,
      },
      include: {
        barbeiro: {
          include: {
            barbearia: true,
          },
        },
      },
    });

    res.status(201).json(novoHorario);
  } catch (error) {
    console.error("Erro ao criar horário:", error);
    res.status(400).json({ erro: "Erro ao criar horário" });
  }
});

router.put("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;

  const valida = atualizarHorarioSchema.safeParse(req.body);
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error });
  }

  const { diaSemana, inicio, fim, ativo } = valida.data;

  try {
    const dadosAtualizacao: any = {};

    if (typeof diaSemana !== "undefined") {
      dadosAtualizacao.diaSemana = diaSemana;
    }

    if (typeof inicio !== "undefined") {
      dadosAtualizacao.inicio = inicio;
    }

    if (typeof fim !== "undefined") {
      dadosAtualizacao.fim = fim;
    }

    if (typeof ativo !== "undefined") {
      dadosAtualizacao.ativo = ativo;
    }

    const horario = await prisma.horario_Disponivel.update({
      where: { id: Number(id) },
      data: dadosAtualizacao,
      include: {
        barbeiro: {
          include: {
            barbearia: true,
          },
        },
      },
    });

    res.status(200).json(horario);
  } catch (error) {
    console.error("Erro ao atualizar horário:", error);
    res.status(400).json({ erro: "Erro ao atualizar horário" });
  }
});

router.delete("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;

  try {
    const horario = await prisma.horario_Disponivel.delete({
      where: { id: Number(id) },
    });

    res.status(200).json(horario);
  } catch (error) {
    console.error("Erro ao excluir horário:", error);
    res.status(400).json({ erro: "Erro ao excluir horário" });
  }
});

export default router;
