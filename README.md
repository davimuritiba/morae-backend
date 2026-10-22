# Morae — Backend

API do **Morae**, plataforma de moradia estudantil para alunos da UFAL. A proposta é conectar estudantes que procuram moradia ou colegas de quarto a proprietários de imóveis, com verificação de vínculo acadêmico, compatibilidade entre perfis, anúncios, visitas, chat e contratos.

> **Situação em 22/10/2026:** o módulo de usuários tem a camada de domínio completa e o primeiro caso de uso (cadastro de estudante) implementado e testado. A API HTTP e a persistência em banco ainda não foram ligadas. Veja [Progresso do desenvolvimento](#progresso-do-desenvolvimento).

## Stack

| Item              | Tecnologia                |
| ----------------- | ------------------------- |
| Runtime           | Node.js 24 (ESM)          |
| Framework         | NestJS 12                 |
| Linguagem         | TypeScript 6 (`strict`)   |
| Testes            | Vitest 4 + Supertest      |
| Lint / formatação | oxlint + Prettier         |
| Banco (planejado) | PostgreSQL 17 + Prisma 7  |
| Observabilidade   | NestJS Observe (opcional) |

## Pré-requisitos

- **Node.js 24** e **npm 11** (testado com Node 24.18.0 e npm 11.16.0)
- **Docker** com Docker Compose, apenas se você quiser subir o PostgreSQL

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   | Variável             | Obrigatória | Descrição                                                                                                               |
   | -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
   | `PORT`               | não         | Porta HTTP. Padrão: `3000`.                                                                                             |
   | `OBSERVE_APP_KEY`    | não         | Chave do [NestJS Observe](https://observe.nestjs.com). Sem ela, a telemetria é descartada e a app funciona normalmente. |
   | `OBSERVE_APP_SECRET` | não         | Segredo pareado com a chave acima.                                                                                      |

   O `.env` está no `.gitignore`. **Nunca** versione credenciais.

3. (Opcional) Suba o PostgreSQL:

   ```bash
   docker compose up -d
   ```

   O container `morae-postgres` fica em `localhost:5432`, com usuário, senha e banco `morae`. Por enquanto a aplicação **ainda não se conecta** a ele, porque a camada de persistência com Prisma é o próximo passo.

## Executando

O projeto não carrega o `.env` sozinho, então passe o arquivo pela flag `--env-file` do Nest CLI.

Desenvolvimento, com recarga automática:

```bash
npm run start:dev -- --env-file .env
```

Produção:

```bash
npm run build
```

```bash
node --env-file=.env dist/main
```

Com a app no ar, os endpoints disponíveis hoje são **placeholders**:

| Método | Rota    | Resposta                      |
| ------ | ------- | ----------------------------- |
| `GET`  | `/user` | `all users`                   |
| `POST` | `/user` | `ts action create a new user` |

## Testes

```bash
npm test
```

| Comando              | O que faz                                 |
| -------------------- | ----------------------------------------- |
| `npm test`           | Testes unitários                          |
| `npm run test:watch` | Testes unitários em modo watch            |
| `npm run test:cov`   | Testes unitários com cobertura            |
| `npm run test:e2e`   | Testes end-to-end (sobe a app em memória) |
| `npm run lint`       | Lint com oxlint (com checagem de tipos)   |
| `npm run format`     | Formata o código com Prettier             |

Convenção de testes:

- Testes **unitários** ficam na pasta `test/` de cada módulo, espelhando a estrutura do código: `src/modules/user/test/domain/entities/user.entity.spec.ts` testa `src/modules/user/domain/entities/user.entity.ts`.
- Testes **end-to-end** ficam em `test/` na raiz, com o sufixo `.e2e-spec.ts`.
- Arquivos `*.spec.ts` não entram no build.

## Estrutura do projeto

A organização é por **módulos** (contextos de negócio), e cada módulo é dividido em camadas, no estilo arquitetura limpa / DDD:

```
src/
├── main.ts                    # bootstrap da aplicação
├── app.module.ts              # módulo raiz
├── modules/
│   ├── user/                  # contas, estudantes, proprietários, administradores
│   ├── verification/          # verificação de documentos
│   ├── property/              # imóveis, residências e anúncios
│   ├── matching/              # compatibilidade entre estudantes
│   ├── interaction/           # interesses, visitas, chat e avaliações
│   ├── contract/              # contratos e pagamentos
│   └── report/                # relatórios
└── shared/                    # código comum a todos os módulos
```

Dentro de cada módulo:

```
<modulo>/
├── domain/          # regras de negócio puras, sem Nest nem banco
│   ├── entities/
│   ├── value-objects/
│   ├── enums/
│   ├── errors/
│   └── repositories/   # contratos (classes abstratas)
├── application/     # casos de uso e portas (ex.: Hasher)
├── infra/           # implementações: banco, serviços externos
├── presentation/    # controllers HTTP, DTOs e presenters
└── test/            # testes unitários do módulo
```

As dependências apontam sempre para dentro: `presentation` → `application` → `domain`. O domínio não conhece HTTP, banco nem o Nest. Os erros de negócio estendem `DomainError` e têm um `code` (ex.: `EMAIL_ALREADY_IN_USE`), que a camada de apresentação vai traduzir para o status HTTP adequado.

## Progresso do desenvolvimento

### Concluído

**Módulo `user`: camada de domínio**

- **Entidades**
  - `User`: conta de acesso, com nome, e-mail, CPF, hash da senha, telefone, foto, status da conta e verificação de e-mail.
  - `Student`: raiz do agregado formado com `StudentProfile`. Tem matrícula, curso, período, previsão de formatura e status de verificação.
  - `StudentProfile`: perfil de convivência, com bio, renda, faixa de orçamento, fumante ou não, preferências de barulho e de visitas, e agenda semanal.
  - `PropertyOwner`: proprietário, com status de verificação.
  - `Administrator`: administrador, com permissões (`VERIFY_DOCUMENTS`, `MODERATE_LISTINGS`, `MANAGE_USERS`, `VIEW_REPORTS`).
- **Value objects com validação:** `Email`, `Cpf` (com dígitos verificadores), `Password`, `Phone`, `PhotoUrl`, `EnrollmentNumber`, `AcademicPeriod`, `BudgetRange`, `PreferenceLevel`, `TimeSlot`.
- **Contratos de repositório:** `UserRepository`, `StudentRepository`, `PropertyOwnerRepository`, `AdministratorRepository`.

**Módulo `user`: camada de aplicação**

- **Caso de uso `RegisterStudentUseCase`**, que cadastra um estudante criando o `User` e o `Student` juntos:
  1. Valida o formato de todos os campos com os value objects, antes de acessar o banco.
  2. Verifica se e-mail, CPF e matrícula já estão em uso, cada um com seu erro específico.
  3. Gera o hash da senha pela porta `Hasher`, só depois das checagens, por ser a etapa mais cara.
  4. Salva tudo de forma atômica via `UnitOfWork`, para nunca ficar um usuário sem o estudante, nem o contrário.
- **Portas e contratos compartilhados:** `Hasher`, `UseCase` e `UnitOfWork`.
- **Implementações in-memory** de `UserRepository`, `StudentRepository` e `UnitOfWork`. São usadas nos testes e simulam as constraints `UNIQUE` do banco.

**Regras de negócio já garantidas pelo domínio**

- A conta nasce `ACTIVE`, com e-mail não verificado. Ela pode ser suspensa e reativada, e a desativação é definitiva.
- Estudantes e proprietários começam com verificação `PENDING`, que pode ir para `VERIFIED` ou `REJECTED`. Após uma rejeição, é possível reenviar a verificação.
- A senha fica em texto puro só de passagem: a entidade guarda apenas o hash.
- E-mail, CPF e telefone são normalizados. O e-mail fica em minúsculas, e o CPF e o telefone ficam só com os dígitos.
- A foto de perfil só aceita URLs `https`, o que bloqueia `javascript:`, `data:` e `file:`.
- O perfil do estudante só pode ser criado ou alterado pelo `Student`, e campos extras vindos da requisição são descartados.
- As entidades usam campos privados (`#`), então serializar uma entidade por engano não expõe senha nem CPF.

**Qualidade**

- 56 testes unitários e 1 teste e2e passando.
- Typecheck (`strict`), lint e Prettier sem erros.
- Revisão de segurança do módulo `user` feita e corrigida, cobrindo mass assignment, vazamento na serialização, validação de entrada e segredos fora do código.

### Pendente

- **Persistência real:** schema do Prisma, migrations e repositórios PostgreSQL. As dependências (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`) e o `docker-compose.yml` já estão no projeto.
- **Hasher concreto:** implementação de `Hasher` com argon2 ou bcrypt.
- **Camada HTTP do módulo `user`:** `user.module.ts`, controller de cadastro, DTOs com validação, presenters e um filtro global que traduza `DomainError` em status HTTP. O `UserController` em `src/app.controller.ts` ainda é só um placeholder.
- **Autenticação:** login, sessão/JWT, guards e rate limiting.
- **Demais casos de uso do `user`:** cadastro de proprietário, edição de perfil, verificação de e-mail, suspensão de contas etc.
- **Demais módulos:** `verification`, `property`, `matching`, `interaction`, `contract` e `report` têm só a estrutura de pastas e arquivos vazios.

### Próximos passos sugeridos

1. Modelar o schema do Prisma para `User` e `Student` e implementar os repositórios PostgreSQL e o `UnitOfWork` transacional.
2. Implementar o `Hasher` com argon2.
3. Expor `POST /students` com DTO validado e o filtro de `DomainError`.
4. Implementar autenticação.
