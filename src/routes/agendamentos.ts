import { prisma } from "../../lib/prisma";
import { Status_Agendamento } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../../middlewares/auth";

const router = Router();

const agendamentoSchema = z.object({
  dataHora: z.coerce.date(),
  status: z.nativeEnum(Status_Agendamento).optional(),
  observacao: z.string().optional().nullable(),
  usuarioId: z.string(),
  servicoId: z.coerce.number().int().positive(),
  barbeariaId: z.coerce.number().int().positive(),
  barbeiroId: z.coerce.number().int().positive(),
});

const atualizarAgendamentoSchema = z.object({
  dataHora: z.coerce.date().optional(),
  status: z.nativeEnum(Status_Agendamento).optional(),
  observacao: z.string().optional().nullable(),
});

router.get("/", async (req, res) => {
  try {
    const agendamentos = await prisma.agendamento.findMany({
      include: {
        usuario: true,
        servico: true,
        barbearia: true,
        barbeiro: true,
      },
      orderBy: { dataHora: "desc" },
    });
    res.status(200).json(agendamentos);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ erro: "Erro ao buscar agendamentos" });
  }
});

router.get("/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const agendamentos = await prisma.agendamento.findMany({
      where: { usuarioId },
      orderBy: { dataHora: "desc" },
      include: {
        usuario: true,
        servico: true,
        barbearia: true,
        barbeiro: true,
      },
    });
    res.status(200).json(agendamentos);
  } catch (error) {
    console.error("Erro ao buscar agendamentos do usuário:", error);
    res.status(500).json({ erro: "Erro ao buscar agendamentos do usuário" });
  }
});

router.get("/barbearia/:barbeariaId", async (req, res) => {
  const { barbeariaId } = req.params;

  try {
    const agendamentos = await prisma.agendamento.findMany({
      where: { barbeariaId: Number(barbeariaId) },
      orderBy: { dataHora: "desc" },
      include: {
        usuario: true,
        servico: true,
        barbearia: true,
        barbeiro: true,
      },
    });
    res.status(200).json(agendamentos);
  } catch (error) {
    console.error("Erro ao buscar agendamentos da barbearia:", error);
    res.status(500).json({ erro: "Erro ao buscar agendamentos da barbearia" });
  }
});

router.post("/", verificaToken, async (req, res) => {
  const valida = agendamentoSchema.safeParse(req.body);
  if (!valida.success) {
    res.status(400).json({ erro: valida.error });
    return;
  }

  const {
    dataHora,
    status,
    observacao,
    usuarioId,
    servicoId,
    barbeariaId,
    barbeiroId,
  } = valida.data;

  try {
    const agendamento = await prisma.agendamento.create({
      data: {
        dataHora,
        status: status || "PENDENTE",
        observacao: observacao ?? null,
        usuarioId,
        servicoId,
        barbeariaId,
        barbeiroId,
      },
      include: {
        usuario: true,
        servico: true,
        barbearia: true,
        barbeiro: true,
      },
    });
    res.status(201).json(agendamento);
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    res.status(400).json({ erro: "Erro ao criar agendamento" });
  }
});

router.put("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;

  const valida = atualizarAgendamentoSchema.safeParse(req.body);
  if (!valida.success) {
    res.status(400).json({ erro: valida.error });
    return;
  }

  const { dataHora, status, observacao } = valida.data;

  try {
    const dadosAtualizacao: any = {};

    if (typeof dataHora !== "undefined") {
      dadosAtualizacao.dataHora = dataHora;
    }

    if (typeof status !== "undefined") {
      dadosAtualizacao.status = status;
    }

    if (typeof observacao !== "undefined") {
      dadosAtualizacao.observacao = observacao;
    }

    const agendamento = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: dadosAtualizacao,
      include: {
        usuario: true,
        servico: true,
        barbearia: true,
        barbeiro: true,
      },
    });
    res.status(200).json(agendamento);
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    res.status(400).json({ erro: "Erro ao atualizar agendamento" });
  }
});

router.delete("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;

  try {
    const agendamento = await prisma.agendamento.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(agendamento);
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    res.status(400).json({ erro: "Erro ao excluir agendamento" });
  }
});

export default router;
