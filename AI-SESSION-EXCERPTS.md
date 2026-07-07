# AI Session — Selected Prompts

A curated set of my own prompts from the Claude Code session for this project, chosen
because each one shows a specific piece of judgment or process discipline rather than
just "asked for a feature." Full session logs exist alongside this if more context is
ever needed; this is the representative excerpt version.

---

### 1. generate types from the wire shapes

> Look at the raw GraphQL responses from POST /api/fake/linear and POST /api/fake/github (see the starting skeleton page and lib/fake-source/ tests for shape reference). Generate TypeScript types for the raw wire shapes only. Do not create normalized/app types yet.

---

### 2. scaffold folder structure

> Set up a folder structure for a Next.js + TypeScript app with a data layer for fetching/normalizing Linear and GitHub fake-source data, a components folder for the Gantt UI, and a types folder. Don't implement logic yet, just create empty files with clear names and comments describing what each will hold.

---

### 3. fetch layer only

> Write functions to POST GraphQL queries to /api/fake/linear and /api/fake/github and return the raw typed responses from step 1. No normalization or matching logic — just fetch and return raw data.

---











