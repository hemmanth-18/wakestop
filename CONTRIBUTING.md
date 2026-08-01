# Contributing to WakeStop

Thank you for your interest in contributing to **WakeStop** — a real-time GPS wake alarm app for bus travelers!

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/hemmanth-18/wakestop.git
   cd wakestop
   ```
3. **Install** dependencies:
   ```bash
   npm install
   cd frontend && npm install
   ```
4. **Set up environment variables** by copying the example:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in your Supabase credentials.

5. **Run locally**:
   ```bash
   # Start backend
   npm run dev

   # Start frontend (in a new terminal)
   cd frontend && npm run dev
   ```

## Project Structure

```
wakestop/
├── api/              # Vercel serverless function entry points
├── backend/
│   ├── data/         # Database layer (Supabase + local fallback)
│   ├── middleware/   # JWT auth middleware
│   └── routes/       # Express route handlers
└── frontend/
    └── src/          # React + Vite frontend
```

## Guidelines

- Keep commits small and focused
- Write clear commit messages
- Test your changes locally before submitting a PR
- Open an issue before working on large features

## Contributors

- [hemmanth-18](https://github.com/hemmanth-18) — Project creator
- [Pranesh-S-786](https://github.com/Pranesh-S-786) — Deployment & database fixes
