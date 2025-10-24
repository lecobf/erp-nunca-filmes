import { useEffect, useState } from "react";
import { api } from "../../api/config"; // ✅ substitui axios direto
import DateInput from "../DateInput";
import CurrencyInput from "../CurrencyInput";
import CampoEquipamentos from "./CampoEquipamentos";
import { fmtBRL } from "../../utils/formatters";

export default function FormServico({ clientes = [], onCreated }) {
  const dataHoje = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    data_contratacao: dataHoje,
    tipo_servico: "Job",
    cliente_id: "",
    descricao: "",
    numero_diarias: 1,
    valor_diaria_cache: 0,
    valor_diaria_equipamentos: 0,
    valor_total: 0,
    valor_desconto: 0,
    valor_final: 0,
    data_previsao_pagamento: null,
    status: "pendente",
    equipamentos: [],
  });

  // 🔹 Recalcula totais automaticamente
  useEffect(() => {
    const total =
      (Number(formData.valor_diaria_cache) + Number(formData.valor_diaria_equipamentos)) *
      Number(formData.numero_diarias || 1);

    setFormData((prev) => ({
      ...prev,
      valor_total: total,
      valor_final: total - (Number(prev.valor_desconto) || 0),
    }));
  }, [
    formData.valor_diaria_cache,
    formData.valor_diaria_equipamentos,
    formData.numero_diarias,
    formData.valor_desconto,
  ]);

  // 🔹 Criação do serviço (usando API centralizada)
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cliente_id: formData.cliente_id ? Number(formData.cliente_id) : null,
      };

      const res = await api.post("/servicos", payload); // ✅ usa base URL do .env

      // Limpa o formulário após criar
      setFormData({
        data_contratacao: dataHoje,
        tipo_servico: "Job",
        cliente_id: "",
        descricao: "",
        numero_diarias: 1,
        valor_diaria_cache: 0,
        valor_diaria_equipamentos: 0,
        valor_total: 0,
        valor_desconto: 0,
        valor_final: 0,
        data_previsao_pagamento: null,
        status: "pendente",
        equipamentos: [],
      });

      if (typeof onCreated === "function") onCreated(res.data);
    } catch (err) {
      console.error("Erro ao criar serviço:", err);
      alert("Não foi possível criar o serviço. Verifique os dados.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-white p-4 rounded shadow">
      <label className="flex flex-col text-sm md:col-span-1">
        Data:
        <DateInput
          value={formData.data_contratacao}
          onChange={(d) => setFormData({ ...formData, data_contratacao: d })}
        />
      </label>

      <label className="flex flex-col text-sm md:col-span-1">
        Tipo:
        <select
          name="tipo_servico"
          value={formData.tipo_servico}
          onChange={(e) => setFormData({ ...formData, tipo_servico: e.target.value })}
          className="border p-2 rounded mt-1 w-full"
        >
          <option value="Job">Job</option>
          <option value="Aluguel">Aluguel</option>
        </select>
      </label>

      <label className="flex flex-col text-sm md:col-span-2">
        Cliente:
        <select
          name="cliente_id"
          value={formData.cliente_id}
          onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
          className="border p-2 rounded mt-1 w-full"
        >
          <option value="">Selecione</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm md:col-span-1">
        Nº Diárias:
        <input
          type="number"
          value={formData.numero_diarias}
          min="1"
          onChange={(e) => setFormData({ ...formData, numero_diarias: e.target.value })}
          className="border p-2 rounded mt-1 w-20"
        />
      </label>

      <label className="flex flex-col text-sm md:col-span-1">
        Descrição:
        <input
          type="text"
          name="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          className="border p-2 rounded mt-1"
          placeholder="Ex: Gravação Coca Cola SP"
        />
      </label>

      {formData.tipo_servico === "Job" && (
        <label className="flex flex-col text-sm md:col-span-2">
          Valor Diária Cachê:
          <CurrencyInput
            value={formData.valor_diaria_cache}
            onChange={(val) => setFormData({ ...formData, valor_diaria_cache: val })}
            className="mt-1"
          />
        </label>
      )}

      <label className="flex flex-col text-sm md:col-span-2">
        Valor Diária Equipamentos:
        <CampoEquipamentos
          valor={formData.valor_diaria_equipamentos}
          onValorChange={(val) => setFormData({ ...formData, valor_diaria_equipamentos: val })}
          onSelecionar={(lista) => setFormData({ ...formData, equipamentos: lista })}
        />
      </label>

      <label className="flex flex-col text-sm md:col-span-2">
        Valor Total:
        <input
          type="text"
          value={fmtBRL(formData.valor_total)}
          readOnly
          className="border p-2 rounded mt-1 bg-gray-100"
        />
      </label>

      <label className="flex flex-col text-sm md:col-span-2">
        Desconto:
        <CurrencyInput
          value={formData.valor_desconto}
          onChange={(val) => setFormData({ ...formData, valor_desconto: val })}
          className="mt-1"
        />
      </label>

      <label className="flex flex-col text-sm md:col-span-2">
        Valor Final:
        <input
          type="text"
          value={fmtBRL(formData.valor_final)}
          readOnly
          className="border p-2 rounded mt-1 bg-gray-100"
        />
      </label>

      <label className="flex flex-col text-sm md:col-span-2">
        Prev. Pagamento:
        <DateInput
          value={formData.data_previsao_pagamento}
          onChange={(d) => setFormData({ ...formData, data_previsao_pagamento: d })}
        />
      </label>

      <div className="md:col-span-6 flex justify-end mt-2">
        <button type="submit" className="btn-primary">
          Adicionar Serviço
        </button>
      </div>
    </form>
  );
}
