# Contributing to Notling

Thank you for your interest in contributing to **Notling**! 🎉 

Notling is an open-source, high-performance Notion alternative built with TanStack Start, React 19, Yjs CRDTs, Drizzle ORM, and PostgreSQL. We welcome contributions from developers of all experience levels—whether fixing a bug, adding features, improving documentation, or proposing new ideas.

Please take a moment to review these guidelines before getting started.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please report unacceptable behavior to [princegbalam247@gmail.com](mailto:princegbalam247@gmail.com).

---

## 🛠️ Getting Started

### 1. Prerequisites

- [Bun](https://bun.sh/) (>= 1.1) or [Node.js](https://nodejs.org/) (>= 20)
- [PostgreSQL](https://www.postgresql.org/) database running locally or in Docker
- Git

### 2. Fork and Clone

1. Fork the repository on GitHub: [https://github.com/princecodes247/notling](https://github.com/princecodes247/notling)
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/notling.git
   cd notling
   ```
3. Set the upstream remote:
   ```bash
   git remote add upstream https://github.com/princecodes247/notling.git
   ```

### 3. Install Dependencies

```bash
bun install
```

### 4. Configure Environment Variables

Copy or create `.env.local` in the project root:

```env
DATABASE_URL="postgres://user:password@localhost:5432/notling"

# OAuth Credentials (optional for basic local testing)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Storage (falls back to local uploads if omitted)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="notling"
R2_PUBLIC_DOMAIN=""
```

### 5. Setup Database Schema

Push the Drizzle schema into your PostgreSQL database:

```bash
bun run db:push
```

### 6. Run the Development Server

```bash
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see Notling running!

---

## 🌿 Development & Branching Workflow

1. Always branch off the `main` branch:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b <type>/<short-description>
   ```

   **Branch Prefix Examples:**
   - `feat/kanban-card-drag`
   - `fix/tab-bar-overflow`
   - `docs/setup-guide`
   - `refactor/collaboration-provider`

2. Write clean, readable code following existing repository conventions:
   - Use TypeScript for all source code with strict type safety.
   - Run type checks before committing:
     ```bash
     bun x tsc --noEmit
     ```

3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add sticky view add button to database container`
   - `fix: resolve tab title truncation on narrow viewports`
   - `docs: update deployment instructions for Docker`
   - `refactor: simplify yjs signaling connection hooks`

---

## 📬 Submitting a Pull Request (PR)

1. Push your branch to your fork:
   ```bash
   git push origin <type>/<short-description>
   ```
2. Open a Pull Request against the `main` branch of `princecodes247/notling`.
3. Provide a clear, descriptive title and fill out the Pull Request template:
   - Explain **what** changed and **why**.
   - Reference any relevant issues (e.g. `Fixes #42`).
   - Include screenshots or screen recordings for UI modifications.
4. Ensure CI checks pass. Address any reviewer feedback promptly.

---

## 🐛 Reporting Bugs

Found a bug? Help us squash it by opening an issue:
1. Search [existing issues](https://github.com/princecodes247/notling/issues) first to avoid duplicates.
2. If new, use the **Bug Report** template.
3. Include your OS, browser, clear reproduction steps, and error logs / screenshots.

---

## 💡 Suggesting Enhancements

Got an idea or feature request?
1. Open an issue using the **Feature Request** template.
2. Detail the problem you're trying to solve and your proposed solution or mockups.

---

## ⚖️ License

By contributing to Notling, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
