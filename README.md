# Notling 🚀

Notling is a modern, high-performance, Notion-like collaborative workspace application built with **TanStack Start**, **React 19**, **Drizzle ORM**, **PostgreSQL**, and real-time **Yjs CRDT collaboration**.

---

## ✨ Features

- 📝 **Block-Based Rich Text Editor**: Powered by BlockNote (ProseMirror/Tiptap) with support for headings, code blocks, media embeds, checklists, and table structures.
- 👥 **Real-Time Collaboration & Presence**: Live multi-user cursor synchronization, presence tracking, and collaborator badges powered by Yjs & WebRTC/WebSocket signaling.
- 🏢 **Multi-Workspace System**: Create, switch, and manage personal and team workspaces with unique slugs, icons, and customizable settings.
- 🌳 **Nested Document Tree & Trash**: Organize pages hierarchically with nested pages, reordering, soft deletion, trash management, and permanent restoration.
- 🔒 **Granular Sharing & Access Control**: Support for Private, Workspace-wide, Public View, and Public Edit permissions alongside email-based explicit invitations.
- 🔍 **Fuzzy Workspace Search**: Fast search across document titles and content snippets with permission filtering.
- 📂 **Media Storage Quotas & Uploads**: Upload images, audio, video, and documents to Cloudflare R2 (or local fallback) with per-user storage quota enforcement.
- 🛡️ **Enterprise Security Hardened**: Built-in protections against Broken Access Control (IDOR), Stored XSS, Cross-Site WebSocket Hijacking, Open Redirects, and insecure cookies.
- 🔐 **OAuth 2.0 Authentication**: Seamless authentication using Google and GitHub OAuth providers with HTTP-only session cookies.

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19, Vite 6, Nitro Server)
- **Routing**: [TanStack Router](https://tanstack.com/router) (File-based SSR routing)
- **Database & ORM**: PostgreSQL, [Drizzle ORM](https://orm.drizzle.team/), `drizzle-kit`
- **Editor & CRDT**: [BlockNote](https://www.blocknotejs.org/), [Yjs](https://yjs.dev/), `y-webrtc`, `y-websocket`
- **State & Query**: [TanStack Query](https://tanstack.com/query), [Zustand](https://zustand-demo.pmnd.rs/)
- **Storage**: Cloudflare R2 / AWS S3 SDK (`@aws-sdk/client-s3`)
- **Styling & UI**: Tailwind CSS v4, Mantine Core, Hugeicons

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (>= 1.1) or [Node.js](https://nodejs.org/) (>= 20)
- PostgreSQL database

### 1. Installation

```bash
bun install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="postgres://user:password@localhost:5432/notling"

# OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Cloudflare R2 / S3 Storage (Optional - falls back to local storage)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="notling"
R2_PUBLIC_DOMAIN="https://pub-your-bucket.r2.dev"
```

### 3. Database Migration

```bash
bun run db:push
```

### 4. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start development server with Vite hot reload |
| `bun run build` | Build production server and client assets |
| `bun run preview` | Preview production build locally |
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:push` | Push schema changes directly to PostgreSQL |
| `bun run db:studio` | Open Drizzle Studio database UI |

---

## 🏗️ Project Architecture

```
src/
├── components/         # React UI components & editor modules
│   ├── dashboard/      # Workspace views & modals
│   ├── ui/             # Reusable primitive UI elements
│   ├── BlockEditorInner.tsx
│   ├── Editor.tsx
│   └── Sidebar.tsx
├── db/                 # Database connection & Drizzle schema definitions
│   ├── index.ts
│   └── schema.ts
├── lib/                # Utility helpers & Yjs WebRTC collaboration logic
│   └── collaboration.ts
├── routes/             # TanStack Router file-based pages
│   ├── auth.callback.$provider.tsx
│   ├── dashboard.p.$pageId.tsx
│   ├── onboarding.tsx
│   └── share.$pageId.tsx
└── server/             # Server functions (TanStack Start createServerFn)
    ├── auth.db.ts      # Auth & session database handlers
    ├── auth.ts         # Auth server function exports
    ├── pages.db.ts     # Document tree, shares & presence DB queries
    ├── pages.ts        # Page server function exports
    ├── r2.ts           # Storage upload validation & S3/R2 client
    └── signalingPlugin.ts # Vite WebSocket plugin for Yjs collaboration
```

---

## 📄 License

MIT
