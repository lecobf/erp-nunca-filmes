import { useState } from "react";
import { ReactSpreadsheetImport } from "react-spreadsheet-import";
import { Button } from "@chakra-ui/react"; // 🔹 o import do Button vai aqui no topo

export default function ImportTeste() {
  const [importOpen, setImportOpen] = useState(false);

  const fields = [
    {
      label: "Nome do Equipamento",
      key: "nome",
      fieldType: { type: "input" },
      validations: [{ rule: "required" }],
    },
    {
      label: "Categoria",
      key: "categoria",
      fieldType: { type: "input" },
    },
    {
      label: "Valor",
      key: "valor_aluguel",
      fieldType: { type: "input" },
    },
  ];

  function handleFinishImport(data) {
    console.log("📦 Dados importados:", data);
    setImportOpen(false);
  }

  return (
    <div className="p-4">
      <Button colorScheme="green" onClick={() => setImportOpen(true)}>
        Importar Excel
      </Button>

      {importOpen && (
        <ReactSpreadsheetImport
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          fields={fields}
          onSubmit={handleFinishImport}
        />
      )}
    </div>
  );
}
