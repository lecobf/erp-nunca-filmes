import { X, Printer } from "lucide-react";
import { fmtBRL, fmtDateBR } from "../../utils/formatters";

/**
 * Modal de visualização e impressão de orçamento simplificado.
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - formData: objeto com os dados do formulário de serviço
 *  - clientes: array de clientes (para resolver o nome pelo ID)
 */
export default function ModalOrcamento({ isOpen, onClose, formData, clientes = [] }) {
  if (!isOpen) return null;

  // Resolve nome do cliente pelo ID selecionado no formulário
  const cliente = clientes.find((c) => c.id === Number(formData.cliente_id));
  const nomeCliente = cliente?.nome || "—";

  const numeroDiarias = Number(formData.numero_diarias) || 1;
  const equipamentos = formData.equipamentos || [];
  const isJob = formData.tipo_servico !== "Aluguel";

  // Cachê por dia e total
  const valorCacheDia = Number(formData.valor_diaria_cache) || 0;
  const valorCacheTotal = valorCacheDia * numeroDiarias;

  // Para cada equipamento: valor/dia (unitário), valor/dia total (qtd × unitário), valor total (× nº diárias)
  const equipamentosComTotais = equipamentos.map((e) => {
    const valorUnitarioDia = Number(e.valor_diaria ?? e.valor_aluguel ?? e.valor ?? 0) || 0;
    const qtd = Number(e.quantidade ?? e.qtd ?? 1) || 1;
    const valorDiaTotal = valorUnitarioDia * qtd;
    const valorTotal = valorDiaTotal * numeroDiarias;
    return { ...e, valorUnitarioDia, qtd, valorDiaTotal, valorTotal };
  });

  // Soma total de equipamentos (todos os dias)
  const totalEquipamentos = equipamentosComTotais.reduce((acc, e) => acc + e.valorTotal, 0);

  const valorDesconto = Number(formData.valor_desconto) || 0;
  const valorFinal = Number(formData.valor_final) || (Number(formData.valor_total) - valorDesconto);

  // ── Função de impressão ────────────────────────────────────
  function handlePrint() {
    const linhasEquipamentos = equipamentosComTotais.length > 0
      ? equipamentosComTotais.map((e) => `
          <tr>
            <td>${e.nome || "—"}</td>
            <td style="text-align:center">${e.qtd}</td>
            <td style="text-align:right">${fmtBRL(e.valorUnitarioDia)}</td>
            <td style="text-align:right">${fmtBRL(e.valorDiaTotal)}</td>
            <td style="text-align:right"><strong>${fmtBRL(e.valorTotal)}</strong></td>
          </tr>`).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#999;font-style:italic">Nenhum equipamento selecionado</td></tr>`;

    const blocoCache = isJob ? `
      <tr>
        <td colspan="4">Cachê por diária</td>
        <td style="text-align:right">${fmtBRL(valorCacheDia)}</td>
      </tr>
      <tr>
        <td colspan="4">Cachê total (${numeroDiarias} diária${numeroDiarias > 1 ? "s" : ""})</td>
        <td style="text-align:right"><strong>${fmtBRL(valorCacheTotal)}</strong></td>
      </tr>` : "";

    const blocoDesconto = valorDesconto > 0 ? `
      <tr>
        <td colspan="4">Desconto</td>
        <td style="text-align:right; color:#b91c1c">- ${fmtBRL(valorDesconto)}</td>
      </tr>` : "";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Orçamento — ${nomeCliente}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #111;
      padding: 32px 40px;
      max-width: 760px;
      margin: 0 auto;
    }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #555; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #555;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 11px; color: #888; }
    .info-value { font-size: 13px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: #1e293b;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      text-align: left;
    }
    thead th:not(:first-child) { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    tbody td { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
    tfoot td { padding: 7px 10px; font-size: 12px; border-top: 1px solid #ccc; }
    .total-row td { background: #f8fafc; font-weight: 700; font-size: 13px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  <h1>Orçamento</h1>
  <p class="subtitle">Nunca Filmes — gerado em ${new Date().toLocaleDateString("pt-BR")}</p>

  <div class="section">
    <div class="section-title">Dados do Serviço</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Cliente</span>
        <span class="info-value">${nomeCliente}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Data</span>
        <span class="info-value">${fmtDateBR(formData.data_contratacao) || "—"}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Tipo</span>
        <span class="info-value">${formData.tipo_servico || "—"}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Nº de Diárias</span>
        <span class="info-value">${numeroDiarias}</span>
      </div>
      ${formData.descricao ? `
      <div class="info-item" style="grid-column: span 2">
        <span class="info-label">Descrição</span>
        <span class="info-value">${formData.descricao}</span>
      </div>` : ""}
      ${formData.data_previsao_pagamento ? `
      <div class="info-item">
        <span class="info-label">Previsão de Pagamento</span>
        <span class="info-value">${fmtDateBR(formData.data_previsao_pagamento)}</span>
      </div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Equipamentos</div>
    <table>
      <thead>
        <tr>
          <th>Equipamento</th>
          <th style="text-align:center">Qtd</th>
          <th style="text-align:right">Valor/dia unit.</th>
          <th style="text-align:right">Total/dia</th>
          <th style="text-align:right">Total (${numeroDiarias} diária${numeroDiarias > 1 ? "s" : ""})</th>
        </tr>
      </thead>
      <tbody>
        ${linhasEquipamentos}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4">Total Equipamentos</td>
          <td style="text-align:right">${fmtBRL(totalEquipamentos)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Resumo Financeiro</div>
    <table>
      <tbody>
        ${blocoCache}
        <tr>
          <td colspan="4">Total Equipamentos (${numeroDiarias} diária${numeroDiarias > 1 ? "s" : ""})</td>
          <td style="text-align:right">${fmtBRL(totalEquipamentos)}</td>
        </tr>
        <tr>
          <td colspan="4">Valor Total</td>
          <td style="text-align:right">${fmtBRL(Number(formData.valor_total) || 0)}</td>
        </tr>
        ${blocoDesconto}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4">Valor Final</td>
          <td style="text-align:right">${fmtBRL(valorFinal)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>`;

    const janela = window.open("", "_blank", "width=860,height=700");
    if (!janela) {
      alert("Não foi possível abrir a janela de impressão. Verifique se popups estão bloqueados.");
      return;
    }
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    // Aguarda o documento carregar antes de chamar print
    janela.onload = () => {
      janela.print();
    };
    // Fallback caso onload não dispare (alguns navegadores)
    setTimeout(() => {
      try { janela.print(); } catch (_) { /* já foi */ }
    }, 400);
  }

  // ── Renderização do modal ──────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-neutral-800">Resumo do Orçamento</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Nunca Filmes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors"
            >
              <Printer size={13} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Dados do serviço */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-200 pb-1.5 mb-3">
              Dados do Serviço
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <p className="text-[10px] text-neutral-400">Cliente</p>
                <p className="text-sm font-medium text-neutral-800">{nomeCliente}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-400">Data</p>
                <p className="text-sm font-medium text-neutral-800">
                  {fmtDateBR(formData.data_contratacao) || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-400">Tipo</p>
                <p className="text-sm font-medium text-neutral-800">{formData.tipo_servico || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-400">Nº de Diárias</p>
                <p className="text-sm font-medium text-neutral-800">{numeroDiarias}</p>
              </div>
              {formData.descricao && (
                <div className="col-span-2">
                  <p className="text-[10px] text-neutral-400">Descrição</p>
                  <p className="text-sm font-medium text-neutral-800">{formData.descricao}</p>
                </div>
              )}
              {formData.data_previsao_pagamento && (
                <div>
                  <p className="text-[10px] text-neutral-400">Previsão de Pagamento</p>
                  <p className="text-sm font-medium text-neutral-800">
                    {fmtDateBR(formData.data_previsao_pagamento)}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Equipamentos */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-200 pb-1.5 mb-3">
              Equipamentos
            </p>
            {equipamentosComTotais.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">Nenhum equipamento selecionado.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-zinc-800 text-zinc-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Equipamento</th>
                      <th className="px-3 py-2 text-center font-semibold">Qtd</th>
                      <th className="px-3 py-2 text-right font-semibold">Valor/dia unit.</th>
                      <th className="px-3 py-2 text-right font-semibold">Total/dia</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Total ({numeroDiarias} diária{numeroDiarias > 1 ? "s" : ""})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipamentosComTotais.map((e, i) => (
                      <tr key={e.id ?? i} className="border-b border-neutral-100 last:border-0">
                        <td className="px-3 py-2 font-medium text-neutral-800">{e.nome || "—"}</td>
                        <td className="px-3 py-2 text-center text-neutral-700">{e.qtd}</td>
                        <td className="px-3 py-2 text-right text-neutral-700">{fmtBRL(e.valorUnitarioDia)}</td>
                        <td className="px-3 py-2 text-right text-neutral-700">{fmtBRL(e.valorDiaTotal)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-neutral-800">{fmtBRL(e.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-neutral-50 border-t border-neutral-200">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 font-semibold text-neutral-700">
                        Total Equipamentos
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-neutral-800">
                        {fmtBRL(totalEquipamentos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Resumo financeiro */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-200 pb-1.5 mb-3">
              Resumo Financeiro
            </p>
            <div className="space-y-1.5">
              {/* Cachê — só para Jobs */}
              {isJob && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Cachê por diária</span>
                    <span className="font-medium">{fmtBRL(valorCacheDia)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">
                      Cachê total ({numeroDiarias} diária{numeroDiarias > 1 ? "s" : ""})
                    </span>
                    <span className="font-medium">{fmtBRL(valorCacheTotal)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">
                  Total Equipamentos ({numeroDiarias} diária{numeroDiarias > 1 ? "s" : ""})
                </span>
                <span className="font-medium">{fmtBRL(totalEquipamentos)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-neutral-200 pt-1.5">
                <span className="text-neutral-600">Valor Total</span>
                <span className="font-medium">{fmtBRL(Number(formData.valor_total) || 0)}</span>
              </div>
              {valorDesconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Desconto</span>
                  <span className="font-medium text-red-600">- {fmtBRL(valorDesconto)}</span>
                </div>
              )}
              {/* Valor Final em destaque */}
              <div className="flex justify-between items-center bg-zinc-800 text-white rounded-md px-3 py-2.5 mt-2">
                <span className="text-sm font-semibold">Valor Final</span>
                <span className="text-base font-bold">{fmtBRL(valorFinal)}</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
