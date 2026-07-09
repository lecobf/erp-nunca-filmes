# Contexto de Negócio — ERP Nunca Filmes

> Documento gerado para embasar a reescrita do sistema em Java + Spring Boot.  
> Descreve regras de negócio, fluxos e lógicas de domínio — sem referências à stack atual.

---

## 1. Visão Geral do Negócio

O sistema é um **ERP financeiro** para uma microempresa (ME) do setor audiovisual chamada **Nunca Filmes**. A empresa atua como:

- **Produtora de serviços audiovisuais**: direção de fotografia, assistência de direção, operação de live — denominados internamente como **"Jobs"**
- **Locadora de equipamentos audiovisuais**: câmeras, lentes e acessórios — denominados internamente como **"Aluguéis"**

O sistema controla: cadastro de clientes, agenda de serviços, controle de pagamentos parcelados, custos operacionais, inventário de equipamentos e dashboard financeiro.

---

## 2. Entidades de Negócio

### 2.1 Usuário
Pessoa com acesso ao sistema. Cada usuário vê **somente os seus próprios dados** (isolamento total — modelo multi-tenant por coluna).

- Existe um usuário especial, o **administrador** (`admin@nuncafilmes.com`), que tem acesso exclusivo à gestão de outros usuários.
- O administrador é criado automaticamente na primeira inicialização do sistema com senha padrão.

### 2.2 Cliente
Empresa ou pessoa física contratante dos serviços. Possui: nome, e-mail, telefone e CPF/CNPJ (todos opcionais exceto o nome).

### 2.3 Equipamento
Item do inventário disponível para locação. Cada equipamento tem:
- Nome e categoria
- Valor de aluguel por diária
- Quantidade disponível em estoque

### 2.4 Serviço
**Entidade central do sistema.** Representa um trabalho contratado. Todo serviço pertence a um cliente e tem um tipo definido.

### 2.5 Pagamento
Registro de um recebimento (total ou parcial) de um serviço. Cada serviço pode ter **múltiplos pagamentos** ao longo do tempo.

### 2.6 Custo
Despesa operacional vinculada a um serviço (ex: transporte, material, subcontratação). Usado para calcular o lucro líquido do serviço.

---

## 3. Tipos de Serviço

O sistema distingue dois tipos, com comportamentos diferentes:

### 3.1 Job
- Representa trabalho de produção audiovisual (set de filmagem, evento ao vivo, etc.)
- Possui **cachê por diária** (`valor_diaria_cache`) — a remuneração do profissional
- Pode ou não ter equipamentos vinculados
- `valor_total = (cachê_diária × nº_diárias) + (valor_equip_diária × nº_diárias)`

### 3.2 Aluguel
- Representa locação pura de equipamentos
- **Não possui cachê** — `valor_diaria_cache` é sempre zero
- **Obrigatório ter equipamentos vinculados** com valor > 0
- `valor_total = valor_equip_diária × nº_diárias`

---

## 4. Regras de Cálculo de Serviço

### 4.1 Datas e Diárias
- O serviço possui uma **lista de datas** específicas de execução (dias de trabalho/aluguel)
- `numero_diarias = quantidade de datas cadastradas` (mínimo: 1)
- `data_contratacao = menor data da lista` (derivada, não informada pelo usuário)
- As datas são independentes (não precisam ser consecutivas)

### 4.2 Valor dos Equipamentos
- Para serviços com equipamentos selecionados do inventário, o valor por diária é calculado como:
  ```
  valor_diaria_equipamentos = Σ (equipamento.valor_aluguel × quantidade_selecionada)
  ```
- Para serviços sem equipamentos vinculados (Job simples), o valor de equipamentos pode ser informado manualmente.

### 4.3 Congelamento de Preço
- Quando um equipamento é vinculado a um serviço, o **preço da diária é copiado e congelado** no momento do vínculo (`valor_unit_diaria`)
- Alterações futuras no cadastro do equipamento **não afetam serviços já registrados**

### 4.4 Cálculo do Valor Final
```
valor_total = (valor_diaria_cache × numero_diarias) + (valor_diaria_equipamentos × numero_diarias)
valor_final = MAX(valor_total − valor_desconto, 0)
```

### 4.5 Previsão de Pagamento
- Se não informada pelo usuário, é calculada automaticamente:
  ```
  data_previsao_pagamento = data_contratacao + 30 dias
  ```

### 4.6 Pacote
- Flag booleana `is_pacote` para marcar serviços que são pacotes (uso informativo, sem lógica diferenciada no sistema atual)

---

## 5. Fluxo de Pagamento

### 5.1 Estados do Serviço
Um serviço percorre os seguintes estados de pagamento:

```
pendente  →  parcial  →  pago
```

| Status    | Condição                                              |
|-----------|-------------------------------------------------------|
| pendente  | Nenhum pagamento registrado                           |
| parcial   | Soma dos pagamentos > 0 e < valor_final               |
| pago      | Soma dos pagamentos >= valor_final                    |

### 5.2 Registro de Pagamento
Ao registrar um pagamento:
1. Calcula-se `soma_anteriores` = soma de todos os pagamentos já registrados para aquele serviço
2. `valor_pendente` (snapshot histórico) = `MAX(valor_final − (soma_anteriores + novo_valor_pago), 0)`
3. Atualiza-se no serviço:
   - `valor_pendente_atual = MAX(valor_final − soma_total_paga, 0)`
   - `status` conforme tabela acima

### 5.3 Histórico de Pagamentos vs. Saldo Atual
- A tabela de pagamentos é um **log histórico**: cada linha registra um evento de recebimento e guarda um snapshot do saldo pendente **naquele momento**
- O saldo atual real do serviço está sempre em `servicos.valor_pendente_atual`
- Para calcular o **Total a Receber** de uma listagem, **não se deve somar** `valor_pendente` de todos os registros (isso somaria dívidas históricas repetidas). O correto é:
  - Para serviços com pagamentos: usar o `valor_pendente_atual` do serviço
  - Para serviços sem nenhum pagamento: o `valor_pendente_atual` já é igual ao `valor_final` desde a criação

### 5.4 Regra do Card "Total a Receber"
Na tela de pagamentos, o card informativo de "Total a Receber" é calculado **diretamente na tabela de serviços**:
```
Total a Receber = Σ valor_pendente_atual
                 de serviços com status != 'pago'
                 filtrados por cliente_id (se informado)
                 e data_contratacao dentro do período (se informado)
```

---

## 6. Regras de Negócio por Entidade

### 6.1 Usuários
- Cada usuário só pode visualizar e manipular seus próprios dados (clientes, serviços, pagamentos, custos, equipamentos)
- O isolamento é feito por `usuario_id` em todas as tabelas
- **O administrador não pode ser excluído**
- Ao trocar própria senha, o usuário deve informar a senha atual para confirmação
- O administrador pode trocar a senha de qualquer usuário **sem** precisar da senha atual

### 6.2 Clientes
- Busca por nome, e-mail e telefone (busca parcial, case-insensitive)
- Suporta importação em massa (lista de clientes)
- Endpoint especial lista apenas clientes que possuem ao menos um pagamento registrado (usado para filtros)

### 6.3 Equipamentos
- Suporta importação em massa
- Valor de aluguel e quantidade são obrigatórios na criação
- Quantidade representa estoque disponível (controle informativo — não há bloqueio por disponibilidade no sistema atual)

### 6.4 Serviços
- `tipo_servico` aceita apenas `"Job"` ou `"Aluguel"` (case-insensitive na validação)
- Aluguel exige `valor_diaria_equipamentos > 0` (direto ou via equipamentos vinculados)
- Em Aluguel, `valor_diaria_cache` é zerado automaticamente pelo sistema
- O mesmo equipamento **não pode ser vinculado duas vezes** ao mesmo serviço
- Ao atualizar um serviço, o status e o `valor_pendente_atual` são **recalculados** com base nos pagamentos existentes
- Ao excluir um serviço, todos os registros relacionados são excluídos em cascata: datas, vínculos com equipamentos, pagamentos e custos

### 6.5 Pagamentos
- Um pagamento deve obrigatoriamente estar vinculado a um serviço existente
- O sistema **não impede** registrar um pagamento maior que o saldo devedor (o `valor_pendente_atual` mínimo é 0)
- Não há validação de data mínima (pode registrar pagamentos retroativos)

### 6.6 Custos
- Todo custo é obrigatoriamente vinculado a um serviço
- Custos são usados para calcular o `lucro_liquido` do serviço: `valor_final − soma_custos`
- Não há regra de negócio adicional — é um registro simples de despesa

---

## 7. Dashboard Financeiro

O dashboard calcula métricas para um **período** (por padrão, o ano corrente). Todas as métricas são calculadas em três versões: geral, somente Jobs, somente Aluguéis.

### 7.1 Métricas do Período

| Métrica                  | Definição                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| Receita Prevista         | Soma de `valor_final` dos serviços **contratados** no período             |
| Receita Recebida         | Soma de `valor_pago` dos pagamentos **efetuados** no período              |
| Receita Retroativa       | Pagamentos efetuados no período, de serviços contratados **antes** do período |
| A Receber (período)      | Soma de `valor_pendente_atual` dos serviços contratados no período        |
| A Receber (retroativo)   | Soma de `valor_pendente_atual` dos serviços contratados antes do período  |
| Lucro Líquido            | `Receita Recebida − Custos do período`                                    |

> **Distinção importante**: "Receita Prevista" usa a data de **contratação** do serviço; "Receita Recebida" usa a data do **pagamento**. São métricas independentes.

### 7.2 Agregação Mensal
O dashboard também retorna os dados mês a mês dentro do período, combinando:
- Receita prevista (agrupada por mês de contratação)
- Receita recebida (agrupada por mês de pagamento)

### 7.3 Top Clientes
Ranking dos 5 clientes que mais pagaram no ano. Clientes além do top 5 são agrupados como "Outros".

---

## 8. Calendário de Serviços

- Exibe serviços que possuem **ao menos uma data de execução** dentro do intervalo consultado
- Retorna apenas as datas do serviço que caem dentro do intervalo (não todas as datas do serviço)
- Usado para visualizar a agenda de trabalho

---

## 9. Filtros Globais

A maioria das listagens suporta filtros de período. As regras são:

| Parâmetro    | Comportamento                                         |
|--------------|-------------------------------------------------------|
| `ano`        | Filtra pelo ano da coluna de data principal           |
| `mes`        | Filtra pelo mês da coluna de data principal           |
| `data_inicio` + `data_fim` | Filtra intervalo fechado (ambos necessários para ativar o filtro de intervalo) |

Para cada recurso, a **coluna de data principal** usada no filtro é:
- Serviços: `data_contratacao`
- Pagamentos: `data_pagamento`
- Custos: `data`
- Resumo a Receber (card): `data_contratacao` do serviço

---

## 10. Glossário

| Termo                    | Significado no sistema                                                  |
|--------------------------|-------------------------------------------------------------------------|
| Job                      | Serviço de produção audiovisual com cachê profissional                  |
| Aluguel                  | Locação de equipamentos sem cachê                                       |
| Diária                   | Uma data específica de trabalho/locação dentro de um serviço            |
| Cachê                    | Remuneração do profissional por diária (apenas em Jobs)                 |
| Valor Final              | Valor contratado líquido após desconto; é o que o cliente deve pagar    |
| Valor Pendente Atual     | Saldo vivo do serviço; atualizado a cada pagamento; começa igual ao valor_final |
| Valor Pendente (snapshot)| Saldo no momento exato de um pagamento; histórico imutável              |
| Pacote                   | Flag para serviços que agrupam múltiplos itens como um único contrato   |
| Receita Prevista         | O que foi contratado (independente de ter sido pago)                    |
| Receita Recebida         | O que efetivamente entrou no caixa                                      |
| Receita Retroativa       | Pagamentos de contratos antigos que entraram no período atual           |
| Lucro Líquido            | Receita recebida menos custos operacionais do período                   |
| Admin                    | Usuário `admin@nuncafilmes.com` com acesso à gestão de usuários         |
