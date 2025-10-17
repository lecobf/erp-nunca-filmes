// utils/formatters.js

// 🔹 Formata número de telefone brasileiro (XX) XXXXX-XXXX
export function formatPhone(value) {
  if (!value || typeof value !== "string") return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}

// 🔹 Formata CPF ou CNPJ automaticamente
export function formatCpfCnpj(value) {
  if (!value || typeof value !== "string") return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    // CPF
    return cleaned
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  } else {
    // CNPJ
    return cleaned
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
}

// 🔹 Converte data ISO (aaaa-mm-dd) para BR (dd/mm/aaaa)
export const fmtDateBR = (iso) => {
  if (!iso || typeof iso !== "string") return "";
  const [ano, mes, dia] = iso.split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : "";
};

// 🔹 Converte data BR (dd/mm/aaaa) para ISO (aaaa-mm-dd)
export const parseData = (br) => {
  if (!br || typeof br !== "string") return "";
  const [dia, mes, ano] = br.split("/");
  return ano && mes && dia ? `${ano}-${mes}-${dia}` : "";
};

// 🔹 Converte string "R$ 1.234,56" para número 1234.56
export const parseMoeda = (valor) => {
  if (!valor) return 0;
  if (typeof valor === "number") return valor;
  return parseFloat(valor.replace(/[^\d,-]/g, "").replace(",", ".")) || 0;
};

// 🔹 Formata número para moeda brasileira (R$)
export function fmtBRL(n) {
  const numero = Number(n) || 0;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// 🔹 Normaliza Date ou string para formato ISO YYYY-MM-DD
export function ymd(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(`${d}T00:00:00`);
  if (isNaN(dt)) return "";
  return dt.toISOString().slice(0, 10);
}
