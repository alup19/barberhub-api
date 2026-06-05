import { prisma } from "../lib/prisma";
import { Status_Agendamento, Dia_Semana } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../middlewares/auth";
import { isAdmin } from "../middlewares/isAdmin";

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

// Função auxiliar para obter o dia da semana
function getDiaSemana(date: Date): Dia_Semana {
  const dias = [
    Dia_Semana.DOMINGO,
    Dia_Semana.SEGUNDA,
    Dia_Semana.TERCA,
    Dia_Semana.QUARTA,
    Dia_Semana.QUINTA,
    Dia_Semana.SEXTA,
    Dia_Semana.SABADO,
  ];
  return dias[date.getDay()];
}

// Função para validar disponibilidade do agendamento
async function validarDisponibilidadeAgendamento(
  dataHora: Date,
  barbeiroId: number,
  barbeariaId: number,
  servicoId: number
): Promise<{ valido: boolean; erro?: string }> {
  try {
    // 1. Verificar se a barbearia existe e está aberta no horário
    const barbearia = await prisma.barbearia.findUnique({
      where: { id: barbeariaId },
    });

    if (!barbearia) {
      return { valido: false, erro: "Barbearia não encontrada" };
    }

    // Extrair apenas a hora dos horários da barbearia (ignorando a data)
    const horaAgendamento = dataHora.getHours() * 60 + dataHora.getMinutes();
    const horaAbertura = barbearia.horarioOpen.getHours() * 60 + barbearia.horarioOpen.getMinutes();
    const horaFechamento = barbearia.horarioClose.getHours() * 60 + barbearia.horarioClose.getMinutes();

    if (horaAgendamento < horaAbertura || horaAgendamento >= horaFechamento) {
      return { valido: false, erro: "Barbearia fechada neste horário" };
    }

    // 2. Verificar se o barbeiro trabalha no dia da semana
    const diaSemana = getDiaSemana(dataHora);

    const horariosBarbeiro = await prisma.horario_Disponivel.findMany({
      where: {
        barbeiroId,
        diaSemana,
      },
    });

    if (horariosBarbeiro.length === 0) {
      return { valido: false, erro: "Barbeiro não trabalha neste dia da semana" };
    }

    // 3. Verificar se o horário está dentro dos horários disponíveis do barbeiro
    const horarioValido = horariosBarbeiro.some((horario) => {
      const horaInicio = horario.inicio.getHours() * 60 + horario.inicio.getMinutes();
      const horaFim = horario.fim.getHours() * 60 + horario.fim.getMinutes();
      return horaAgendamento >= horaInicio && horaAgendamento < horaFim;
    });

    if (!horarioValido) {
      return { valido: false, erro: "Horário fora do expediente do barbeiro" };
    }

    // 4. Verificar se há conflito com outros agendamentos
    const servico = await prisma.servico.findUnique({
      where: { id: servicoId },
    });

    if (!servico) {
      return { valido: false, erro: "Serviço não encontrado" };
    }

    const duracaoMin = servico.duracaoMin;
    const fimAgendamento = new Date(dataHora.getTime() + duracaoMin * 60000);

    const conflitos = await prisma.agendamento.findMany({
      where: {
        barbeiroId,
        status: { in: ["PENDENTE", "CONCLUIDO"] },
        OR: [
          {
            AND: [
              { dataHora: { lte: dataHora } },
              {
                dataHora: {
                  gte: new Date(dataHora.getTime() - duracaoMin * 60000),
                },
              },
            ],
          },
          {
            AND: [
              { dataHora: { gte: dataHora } },
              { dataHora: { lt: fimAgendamento } },
            ],
          },
        ],
      },
    });

    if (conflitos.length > 0) {
      return { valido: false, erro: "Horário já ocupado por outro agendamento" };
    }

    return { valido: true };
  } catch (error) {
    console.error("Erro ao validar disponibilidade:", error);
    return { valido: false, erro: "Erro interno ao validar disponibilidade" };
  }
}

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
    // Validar disponibilidade antes de criar o agendamento
    const validacao = await validarDisponibilidadeAgendamento(
      dataHora,
      barbeiroId,
      barbeariaId,
      servicoId
    );

    if (!validacao.valido) {
      return res.status(400).json({ erro: validacao.erro });
    }

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

router.delete("/:id", verificaToken, isAdmin, async (req, res) => {
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
