# Sala de Monitoramento - Seleção de Instituições

Aplicação web simples desenvolvida com React + TypeScript para seleção e visualização de instituições.

## Funcionalidades

- Botão "Escolher instituição" que abre um dropdown pesquisável
- Lista de instituições carregada da API
- Visualização completa do perfil da instituição selecionada
- Tratamento de erros com opção de tentar novamente
- Loading state durante o carregamento
- Cache em memória (requisição feita apenas uma vez)

## Tecnologias

- React 18
- TypeScript
- Vite
- Fetch API

## Como executar

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse no navegador: `http://localhost:5173`

## Estrutura do projeto

```
src/
  ├── components/
  │   ├── InstitutionSelector.tsx  # Componente do dropdown pesquisável
  │   └── InstitutionProfile.tsx   # Componente do perfil da instituição
  ├── types/
  │   └── institution.ts           # Interface TypeScript
  ├── App.tsx                      # Componente principal
  ├── App.css                      # Estilos da aplicação
  └── main.tsx                     # Ponto de entrada
```

