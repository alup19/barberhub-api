import { prisma } from "../lib/prisma";
import { Router } from "express";
import { z } from "zod";
import { verificaToken } from "../middlewares/auth";

const router = Router();

const criarServicoSchema = z.object({
  nome: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  descricao: z.string().optional().nullable(),
  preco: z.coerce.number().positive({ message: "Preço deve ser positivo" }),
  duracaoMin: z.coerce.number().int().positive({ message: "Duração deve ser positiva" }),
  barbeariaId: z.coerce.number().int().positive(),
  ativo: z.boolean().optional().default(true),
  categoria: z.enum(["CABELO","BARBA","SOBRANCELHA","TRATAMENTO","ESTETICA","PREMIUM"]).optional().default("CABELO"),
});

const atualizarServicoSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional().nullable(),
  preco: z.coerce.number().positive().optional(),
  duracaoMin: z.coerce.number().int().positive().optional(),
  ativo: z.boolean().optional(),
  categoria: z.enum(["CABELO","BARBA","SOBRANCELHA","TRATAMENTO","ESTETICA","PREMIUM"]).optional(),
});

function formatarServicoParaExibicao(servico: any) {
  return {
    ...servico,
    preco: Number(servico.preco),
  };
}

router.get("/", async (req, res) => {
  try {
    const servicos = await prisma.servico.findMany({
      include: {
        barbearia: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const servicosFormatados = servicos.map(formatarServicoParaExibicao);
    res.status(200).json(servicosFormatados);
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    res.status(500).json({ erro: "Erro ao buscar serviços" });
  }
});

router.get("/barbearia/:barbeariaId", async (req, res) => {
  const { barbeariaId } = req.params;

  try {
    const servicos = await prisma.servico.findMany({
      where: {
        barbeariaId: Number(barbeariaId),
      },
      include: {
        barbearia: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const servicosFormatados = servicos.map(formatarServicoParaExibicao);
    res.status(200).json(servicosFormatados);
  } catch (error) {
    console.error("Erro ao buscar serviços da barbearia:", error);
    res.status(500).json({ erro: "Erro ao buscar serviços da barbearia" });
  }
});

router.post("/", verificaToken, async (req, res) => {
  try {
    const dadosValidados = criarServicoSchema.parse(req.body);

    const novoServico = await prisma.servico.create({
      data: {
        nome: dadosValidados.nome,
        descricao: dadosValidados.descricao ?? null,
        preco: dadosValidados.preco,
        duracaoMin: dadosValidados.duracaoMin,
        barbeariaId: dadosValidados.barbeariaId,
        ativo: dadosValidados.ativo ?? true,
        categoria: dadosValidados.categoria ?? "CABELO",
      },
      include: {
        barbearia: true,
      },
    });

    res.status(201).json(formatarServicoParaExibicao(novoServico));
  } catch (erro: any) {
    console.error(erro);

    if (erro instanceof z.ZodError) {
      return res
        .status(400)
        .json({ erro: "Dados inválidos", detalhes: erro.errors });
    }

    res.status(500).json({ erro: "Erro ao criar serviço" });
  }
});

router.put("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;

  try {
    const corpoValido = atualizarServicoSchema.parse(req.body);

    const dadosAtualizacao: any = {};

    if (typeof corpoValido.nome !== "undefined") {
      dadosAtualizacao.nome = corpoValido.nome;
    }

    if (typeof corpoValido.descricao !== "undefined") {
      dadosAtualizacao.descricao = corpoValido.descricao;
    }

    if (typeof corpoValido.preco !== "undefined") {
      dadosAtualizacao.preco = corpoValido.preco;
    }

    if (typeof corpoValido.duracaoMin !== "undefined") {
      dadosAtualizacao.duracaoMin = corpoValido.duracaoMin;
    }

    if (typeof corpoValido.ativo !== "undefined") {
      dadosAtualizacao.ativo = corpoValido.ativo;
    }

    if (typeof corpoValido.categoria !== "undefined") {
      dadosAtualizacao.categoria = corpoValido.categoria;
    }

    const servicoAtualizado = await prisma.servico.update({
      where: { id: Number(id) },
      data: dadosAtualizacao,
      include: {
        barbearia: true,
      },
    });

    res.json(formatarServicoParaExibicao(servicoAtualizado));
  } catch (erro: any) {
    console.error(erro);

    if (erro instanceof z.ZodError) {
      return res
        .status(400)
        .json({ erro: "Dados inválidos", detalhes: erro.errors });
    }

    res.status(500).json({ erro: "Erro ao atualizar serviço" });
  }
});

router.delete("/:id", verificaToken, async (req, res) => {
  const { id } = req.params;

  try {
    const servicoExcluido = await prisma.servico.delete({
      where: { id: Number(id) },
    });

    res.json(servicoExcluido);
  } catch (erro: any) {
    console.error(erro);

    if (erro.code === "P2003") {
      return res.status(400).json({
        erro: "Erro ao excluir",
        detail: "Não é possível excluir este serviço porque ele já foi usado em agendamentos.",
      });
    }

    res.status(500).json({ erro: "Erro ao excluir serviço" });
  }
});

export default router;
