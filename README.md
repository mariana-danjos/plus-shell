# plus-shell

[![CI](https://github.com/mariana-danjos/plus-shell/actions/workflows/ci.yml/badge.svg)](https://github.com/mariana-danjos/plus-shell/actions/workflows/ci.yml)

Shell App do projeto **Plus** — microfrontend **host**.

Orquestra os microfrontends remotos via **Module Federation**. Consome o `plus-mfe-auth` para autenticação (páginas de login/cadastro, contexto e tema) e expõe uma rota privada (`/`) com o painel principal. Construído com React 18 + Vite 5 + TypeScript 5.

---

## Sumário

- [Stack](#stack)
- [Setup local](#setup-local)
- [Scripts npm](#scripts-npm)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Rotas](#rotas)
- [Module Federation](#module-federation)
- [Estrutura do código](#estrutura-do-código)
- [Lint](#lint)
- [CI/CD](#cicd)
- [Docker](#docker)
- [Executando com a stack completa](#executando-com-a-stack-completa)

---

## Stack

| Pacote | Versão | Finalidade |
|---|---|---|
| React | 18 | UI |
| React Router DOM | 7 | Roteamento SPA com lazy loading |
| Vite | 5 | Bundler + dev server |
| `@originjs/vite-plugin-federation` | 1.3 | Module Federation (host) |
| `@mui/material` + `@mui/icons-material` | 9 | Componentes Material UI |
| `@emotion/react` + `@emotion/styled` | 11 | CSS-in-JS (engine do MUI) |
| TypeScript | 5 | Tipagem estática |
| ESLint 9 + `typescript-eslint` + plugins React | — | Lint (flat config) |

> O shell não tem dependências de estado global (Redux, Zustand). O contexto de autenticação vem do remote `mfe_auth`.

---

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Subir o dev server
npm run dev
```

Acesse: **http://localhost:3000**

> O `plus-mfe-auth` precisa estar rodando em **http://localhost:4001** para o `remoteEntry.js` ser carregado. Inicie ele em outro terminal com `cd ../plus-mfe-auth && npm run dev`.

---

## Scripts npm

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev server Vite na porta 3000 com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve `dist/` na porta 3000 |
| `npm run lint` | ESLint sobre `src/**/*.{ts,tsx}` |
| `npm run typecheck` | `tsc --noEmit` (checagem de tipos sem emitir arquivos) |

> Não há suite de testes neste repo (o shell delega toda a lógica autenticada ao remote `mfe_auth`).

---

## Variáveis de ambiente

| Variável | Padrão | Quando se aplica |
|---|---|---|
| `MFE_AUTH_URL` | `http://localhost:4001/assets/remoteEntry.js` | **Build time** — definida via `process.env.MFE_AUTH_URL` no `vite.config.ts`. Sobrescreve o entry point do remote em outros ambientes (staging, prod). |

Exemplo:

```bash
MFE_AUTH_URL=https://auth.exemplo.com/assets/remoteEntry.js npm run build
```

---

## Rotas

| Path | Componente | Origem | Auth |
|---|---|---|---|
| `/login` | `LoginPage` | `mfe_auth/LoginPage` (lazy) | pública |
| `/signup` | `SignupPage` | `mfe_auth/SignupPage` (lazy) | pública |
| `/` | `Dashboard` | local (`src/App.tsx`) | privada (`PrivateRoute`) |

**`PrivateRoute`:**

- Lê `useAuth()` (vindo de `mfe_auth/AuthContext`).
- Enquanto `loading`, mostra `<FullPageLoader />`.
- Se não autenticado, redireciona para `/login` com `replace` (não polui o histórico).

**`Dashboard`:**

- `<AppBar>` com título "Plus" e um `UserMenu` que mostra `user.name`, `user.email`, primeira role formatada (capitalized) e botão de logout.
- Conteúdo principal dentro de `<Container>` — placeholder pronto para receber os próximos microfrontends de domínio.

---

## Module Federation

O `vite.config.ts` registra `mfe_auth` como remote:

```ts
import federation from "@originjs/vite-plugin-federation";

const MFE_AUTH_URL =
  process.env.MFE_AUTH_URL || "http://localhost:4001/assets/remoteEntry.js";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "shell",
      remotes: {
        mfe_auth: MFE_AUTH_URL,
      },
      shared: [
        "react", "react-dom", "react-router-dom",
        "@mui/material", "@mui/icons-material",
        "@emotion/react", "@emotion/styled",
      ],
    }),
  ],
  build: { target: "esnext", minify: false },
  server:  { port: 3000, host: true },
  preview: { port: 3000, host: true },
});
```

> As dependências em `shared` devem coincidir com as do `plus-mfe-auth` para evitar instâncias duplicadas de React / MUI.

### Imports do remote

O shell consome `mfe_auth` em cinco pontos:

```ts
// src/main.tsx
import { theme } from "mfe_auth/theme";
import { AuthProvider } from "mfe_auth/AuthContext";

// src/App.tsx
import { useAuth } from "mfe_auth/AuthContext";
const LoginPage  = lazy(() => import("mfe_auth/LoginPage"));
const SignupPage = lazy(() => import("mfe_auth/SignupPage"));
```

> Os tipos dos módulos remotos ficam em `src/types/mfe-auth.d.ts`.

`LoginPage` e `SignupPage` são carregados sob demanda via `lazy()` + `<Suspense fallback={<FullPageLoader />}>`. Isso mantém o bundle inicial enxuto.

---

## Estrutura do código

```
plus-shell/
├── .github/workflows/ci.yml      # Pipeline CI/CD
├── index.html                    # Template (preconnect Google Fonts, Inter)
├── vite.config.ts                # Vite + Module Federation
├── tsconfig.json                 # Configuração TypeScript
├── eslint.config.mjs             # ESLint flat config
├── Dockerfile                    # Container (multi-stage: build + vite preview)
├── package.json
└── src/
    ├── main.tsx                  # Bootstrap: ThemeProvider + CssBaseline + AuthProvider + App
    ├── App.tsx                   # Router + rotas + Dashboard + UserMenu + PrivateRoute
    ├── vite-env.d.ts             # Tipos do client Vite
    └── types/
        └── mfe-auth.d.ts         # Declarações dos módulos remotos do mfe_auth
```

`main.tsx` aplica os providers na ordem:

```tsx
<React.StrictMode>
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
</React.StrictMode>
```

`App.tsx` envolve as rotas em `<BrowserRouter>` + `<Suspense>` e implementa `PrivateRoute` + `Dashboard` localmente.

---

## Lint

ESLint 9.x com **flat config** (`eslint.config.mjs`).

Presets:

- `@eslint/js:recommended`
- `typescript-eslint:recommended`
- `eslint-plugin-react/recommended`
- `eslint-plugin-react-hooks/recommended`

Regras customizadas:

- `react/react-in-jsx-scope: off` (React 18+).
- `react/prop-types: off` (não usamos PropTypes).
- `no-unused-vars: off` em favor de `@typescript-eslint/no-unused-vars: error`, que ignora identificadores prefixados com `_`.

Ignorados: `dist/`, `coverage/`, `node_modules/`.

```bash
npm run lint                       # output detalhado
npm run lint -- --max-warnings 0   # comando que roda no CI
```

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`). Trigger em **pull request** e **push em `main`**.

Pipeline (sem job de teste — o repo não tem suite hoje):

```
lint → build → docker
```

| Job | Faz | Timeout |
|---|---|---|
| `lint` | `npm ci` → `npm run lint -- --max-warnings 0` | 10 min |
| `build` | `npm ci` → `npm run build` → artifact `shell-dist` (1 d) | 10 min |
| `docker` | Baixa `shell-dist` para `dist/`, roda `docker/build-push-action@v7` com `push: false, load: true` e cache `type=gha` | 10 min |

O job `docker` baixa o artifact do `build` antes de invocar o `Dockerfile` (multi-stage, que também roda `npm run build` internamente).

Configurações:

- `concurrency: cancel-in-progress` por ref.
- `permissions: contents: read, actions: read`.
- Node 20 com cache `npm`.

### Rodando o pipeline localmente

```bash
npm ci
npm run lint -- --max-warnings 0
npm run build
docker build -t plus-shell:ci .
```

Ou com [`act`](https://github.com/nektos/act):

```bash
act pull_request
```

---

## Docker

O `Dockerfile` é **multi-stage**: o primeiro estágio instala dependências e roda `npm run build`; o segundo serve o `dist/` via `vite preview`.

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
ARG MFE_AUTH_URL=http://localhost:4001/assets/remoteEntry.js
ENV MFE_AUTH_URL=$MFE_AUTH_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g vite
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["vite", "preview", "--port", "3000", "--host"]
```

Build local:

```bash
docker build -t plus-shell:dev .
docker run -p 3000:3000 plus-shell:dev
```

> O `MFE_AUTH_URL` pode ser passado em build com `--build-arg MFE_AUTH_URL=...`.

---

## Executando com a stack completa

Este serviço é orquestrado pelo `plus-infra`. Consulte o [README do plus-infra](https://github.com/mariana-danjos/plus-infra) para subir o ambiente completo (postgres + ministack + ms-auth + mfe-auth + shell).
