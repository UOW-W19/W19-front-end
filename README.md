# 🌏 Locale — Frontend

React + TypeScript + Vite frontend for the Locale language exchange app.

## Prerequisites

- **Docker Desktop** (No Node or npm needed if using Docker!)

---

## 🚀 Running With Docker (Recommended for Team)

> Both repos must be cloned side-by-side on your machine:
> ```
> Desktop/
> ├── W19-back-end/   ← backend repo (where you run docker-compose)
> └── W19-front-end/  ← this repo
> ```

### 1. Copy the environment file
```bash
cp .env.example .env
```
Fill in the `VITE_GOOGLE_PLACES_KEY` that your teammate shared with you.

### 2. Start everything (from the backend folder!)
```bash
cd ../W19-back-end
docker compose up --build
```

This spins up the entire stack, including this frontend.
The app will be available at: **http://localhost:8080**

---

## 💻 Running Locally (Without Docker)

Requirements: Node 20+

1. Copy `.env.example` → `.env` and fill in the Google Places key.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173` (by default).
*Note: You must also run the Spring Boot backend locally for the API to work.*
