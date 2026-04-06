# ECMS – Environmental Crisis Management System

A TypeScript React web application for managing environmental crises (chemical spills, radiation leaks, hurricanes). Features interactive GIS mapping, field measurement reporting, mission management, visitor screening, and real-time analytics. Connects to an external REST API for data persistence — falls back to built-in mock data when the API is unavailable.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Frontend](#frontend)
  - [Entry Point & Routing](#entry-point--routing)
  - [Context Providers](#context-providers)
  - [Layout & Navigation](#layout--navigation)
  - [Pages](#pages)
  - [Shared Components](#shared-components)
  - [Mock Data & Types](#mock-data--types)
  - [API Client & Data Fetching](#api-client--data-fetching)
  - [Styling](#styling)
- [Getting Started](#getting-started)
- [Connecting to the API](#connecting-to-the-api)
  - [Expected API Contract](#expected-api-contract)
  - [Response Shapes](#response-shapes)
- [Environment Variables](#environment-variables)
- [NPM Scripts Reference](#npm-scripts-reference)

---

## Architecture Overview

```
┌─────────────────┐   /api proxy    ┌──────────────────┐
│   Vite Dev       │ ─────────────→ │  External REST   │
│   React SPA      │   :5173        │  API + Database   │
│                  │                │  (another dev)    │
└─────────────────┘                └──────────────────┘
        │
        │ Falls back to mockData.ts
        │ when API is unavailable
        │
   10 page components
   i18n (EN/HE) + RTL
   Dark/Light theme
   Leaflet maps
```

**Key design pattern:** The frontend is fully functional without an API. Every page fetches data via the `useApi` hook but falls back to static mock data when the API is unavailable. This means you can run `npm run dev` and get a working UI immediately — no API server required.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19 |
| Routing | React Router DOM | 7 |
| Bundler | Vite | 8 |
| CSS | Tailwind CSS | 4 |
| Maps | Leaflet | 1.9 |
| Icons | Lucide React | latest |
| Language | TypeScript | 6 |

---

## Project Structure

```
.
├── index.html                  # SPA entry HTML
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite config (React + Tailwind + API proxy)
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind CSS config
│
├── src/
│   ├── index.tsx               # React entry point (mounts <App />)
│   ├── App.tsx                 # Root component, provider stack, routes
│   ├── vite-env.d.ts           # Vite type declarations
│   │
│   ├── context/
│   │   ├── ThemeContext.tsx     # Dark/light mode toggle (localStorage)
│   │   └── LangContext.tsx     # i18n: English/Hebrew + RTL support
│   │
│   ├── components/
│   │   ├── GlobalLayout.tsx    # App shell: sidebar, header, nav
│   │   ├── MapView.tsx         # Reusable Leaflet map component
│   │   └── StatusBadge.tsx     # Color-coded status pill badge
│   │
│   ├── pages/
│   │   ├── FieldReports.tsx    # Measurement reporting hub
│   │   ├── NewMeasurement.tsx  # Submit new field measurement form
│   │   ├── MyReports.tsx       # Browse/filter submitted reports
│   │   ├── GISDashboard.tsx    # Full-screen GIS map with layers
│   │   ├── Missions.tsx        # Mission management + polygon drawing
│   │   ├── Visitors.tsx        # Visitor screening table
│   │   ├── VisitorIntake.tsx   # New visitor registration form
│   │   ├── VisitorProfile.tsx  # Individual visitor detail view
│   │   ├── Analytics.tsx       # KPI cards, charts, team activity
│   │   └── Settings.tsx        # Theme, notifications, user profile
│   │
│   ├── data/
│   │   └── mockData.ts         # Type definitions + static fallback data
│   │
│   ├── api/
│   │   ├── client.ts           # HTTP API client (fetch wrapper)
│   │   └── useApi.ts           # React hook for data fetching
│   │
│   └── styles/
│       └── tailwind.css        # Tailwind entry + custom theme tokens
```

---

## Frontend

### Entry Point & Routing

**`index.html`** — The single-page application shell. Loads Leaflet CSS from CDN and mounts React at `<div id="root">`.

**`src/index.tsx`** — Creates the React root and renders `<App />`.

**`src/App.tsx`** — Sets up the provider hierarchy and all routes:

```
LangProvider → ThemeProvider → BrowserRouter → GlobalLayout → Routes
```

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Redirect | Redirects to `/field-reports` |
| `/field-reports` | `FieldReports` | Reporting hub with quick actions and stats |
| `/field-reports/new` | `NewMeasurement` | Field measurement submission form |
| `/field-reports/my-reports` | `MyReports` | Filterable list of submitted reports |
| `/gis-dashboard` | `GISDashboard` | Full-screen map with layers and filters |
| `/missions` | `Missions` | Mission table + map with polygon drawing |
| `/visitors` | `Visitors` | Visitor management table |
| `/visitors/intake` | `VisitorIntake` | New visitor registration form |
| `/visitors/:id` | `VisitorProfile` | Individual visitor profile and movement map |
| `/analytics` | `Analytics` | Operational overview dashboards |
| `/settings` | `Settings` | System preferences and configuration |

### Context Providers

**`src/context/ThemeContext.tsx`** — Dark/light mode toggle. Defaults to dark (suitable for command-center use). Persists user preference to `localStorage` (`ecms-theme`). Toggles the `dark` CSS class on `<html>`.

- **Hook:** `useTheme()` → `{ dark: boolean, toggle: () => void }`

**`src/context/LangContext.tsx`** — Full internationalization system supporting English and Hebrew. Contains ~280+ translation keys per language covering every page. Sets `dir="rtl"` and `lang="he"` on `<html>` when Hebrew is selected. Persists to `localStorage` (`ecms-lang`).

- **Hook:** `useLang()` → `{ lang, setLang, t(key), dir }`
- **Type:** `Lang = 'en' | 'he'`

### Layout & Navigation

**`src/components/GlobalLayout.tsx`** — The application shell rendered around all pages:

- **Sidebar** — 6 navigation items (Field Reports, Missions, GIS Dashboard, Visitors, Analytics, Settings). Collapses to a hamburger menu on mobile. Repositions to the right side in RTL mode (Hebrew).
- **Header bar** — Incident selector dropdown, language toggle button (EN/HE), theme toggle (sun/moon), notification bell with unread count badge.
- **Data fetching** — Fetches incidents and alerts from the API; falls back to mock data if unavailable.
- **GIS detection** — The GIS Dashboard page renders full-bleed (no padding) to maximize map area.

### Pages

| Page | Key Features |
|------|-------------|
| **FieldReports** | Quick action cards (New Report, My Reports), today's stats (pending/verified/flagged), recent activity feed |
| **NewMeasurement** | GPS auto-capture with map preview, team selector, measurement type grid, value input with dynamic units, photo upload, sticky submit button |
| **MyReports** | Full-text search, status and type filters, expandable detail rows with location coordinates and edit capability |
| **GISDashboard** | Full-screen Leaflet map with togglable layers (measurements, missions, visitor paths, hazard zones), severity filters, team filters, clickable markers with detail panel, alert sidebar |
| **Missions** | Split view — sortable table on left, map with mission polygons on right. Create modal with click-to-draw polygon vertices, undo/clear, 3-point minimum validation |
| **Visitors** | Stats cards (total/cleared/observation/flagged), searchable table, status filter, link to individual profiles |
| **VisitorIntake** | Multi-section form: personal details, physical measurements (exposure, BP, HR, temp), visited locations with map, notes |
| **VisitorProfile** | Personal info card, vital measurements summary, status badge, movement path on map with start/end markers, timeline |
| **Analytics** | 5 KPI summary cards, severity distribution bar chart, measurements-by-type breakdown with progress bars, team activity table |
| **Settings** | Theme toggle switch, interface mode selector (desktop/tablet/mobile), 5 notification toggles, user profile form, system information grid |

### Shared Components

**`src/components/MapView.tsx`** — Reusable Leaflet map wrapper. Accepts markers (colored circles), paths (polylines), and polygons. Supports click handlers for marker selection and an `onMapReady` callback for advanced use (polygon drawing in Missions).

**`src/components/StatusBadge.tsx`** — Color-coded pill badge component. Supports 5 badge types: `severity`, `status`, `mission`, `priority`, `visitor`. Each maps to distinct color schemes with dark mode variants.

### Mock Data & Types

**`src/data/mockData.ts`** — Serves two purposes:

1. **Type definitions** — All TypeScript interfaces and types used across the app: `Incident`, `Team`, `Measurement`, `MeasurementType`, `Severity`, `ReportStatus`, `Mission`, `Visitor`, `Alert`
2. **Static data** — Realistic mock data arrays (3 incidents, 5 teams, 20 measurements, 5 missions, 8 visitors, 7 alerts) used as fallback when the API is unavailable

Also exports constants: `UNIT_MAP` (type→unit), `TYPE_LABELS` (type→display name), `SEVERITY_COLORS` (severity→hex), `MAP_CENTER` (default coordinates).

### API Client & Data Fetching

**`src/api/client.ts`** — HTTP client wrapping `fetch`. Base URL comes from `VITE_API_URL` env variable. Provides typed methods for all CRUD operations:

- `getIncidents()`, `createIncident()`, `updateIncident()`
- `getTeams()`, `getTeam()`
- `getMeasurements(filters?)`, `createMeasurement()`, `getMeasurementStats()`
- `getMissions(filters?)`, `createMission()`
- `getVisitors(filters?)`, `getVisitor(id)`, `createVisitor()`, `addVisitorMovement()`
- `getAlerts()`, `markAlertRead()`, `markAllAlertsRead()`

**`src/api/useApi.ts`** — Generic React hook for data fetching:

```ts
const { data, loading, error, refetch } = useApi<T>(fetcherFn, deps);
```

Auto-fetches on mount and when dependencies change. Returns `null` data on error, allowing pages to fall back to mock data with `const measurements = apiData ?? mockMeasurements`.

### Styling

**`src/styles/tailwind.css`** — Tailwind CSS 4 entry point using `@import "tailwindcss"` syntax. Defines custom theme tokens:

- **Colors:** `danger` (red), `warning` (amber), `safe` (green), `primary` (blue), `sidebar` (slate-900), `sidebar-hover` (slate-800)
- **Dark mode Leaflet:** CSS filter to invert/adjust map tiles for dark backgrounds
- **Custom utilities:** Pulse animation for status dots, custom scrollbar, dark popup styles

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. All pages are functional with built-in mock data.

To connect to the external API, set the `VITE_API_URL` environment variable (see [Connecting to the API](#connecting-to-the-api)).

---

## Connecting to the API

The API and database are managed by another developer. This frontend connects to the API via the `src/api/client.ts` HTTP client. When the API is unavailable, every page gracefully falls back to mock data.

### Configuration

Set `VITE_API_URL` to point to the API base URL:

```bash
# In a .env file or as an environment variable
VITE_API_URL="http://your-api-server:3001/api"
```

During development, the Vite dev server proxies `/api/*` requests to the API server (configurable via `VITE_API_URL` in `vite.config.ts`).

### Expected API Contract

The frontend expects a REST API at the URL defined by `VITE_API_URL` (default: `http://localhost:3001/api`). All requests and responses use JSON.

**Endpoints the frontend calls:**

| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/incidents` | GlobalLayout (header incident selector) |
| GET | `/alerts` | GlobalLayout (notification bell) |
| POST | `/alerts/read-all` | GlobalLayout |
| GET | `/measurements` | FieldReports, MyReports, GISDashboard, Analytics |
| POST | `/measurements` | NewMeasurement |
| GET | `/missions` | Missions, GISDashboard, Analytics |
| GET | `/teams` | FieldReports, NewMeasurement, MyReports, GISDashboard, Missions, Analytics |
| GET | `/visitors` | Visitors, GISDashboard, Analytics |
| GET | `/visitors/:id` | VisitorProfile |
| POST | `/visitors` | VisitorIntake |

### Response Shapes

The frontend expects response bodies matching the TypeScript interfaces in `src/data/mockData.ts`. Key shapes:

```ts
// Measurement
{ id, type, value, unit, lat, lng, severity, status, timestamp, notes, teamId, photo? }

// Mission
{ id, name, teamId, status, priority, objectives, startDate, endDate?, area: [[lat,lng],...] }

// Visitor (GET responses should include vitalSigns and bodyMeasurements)
{ id, name, idNumber, age, contact, status, exposureReading, notes,
  vitalSigns: { bp, hr, temp },
  bodyMeasurements?: [{ zone, value }],
  movements: [{ location, lat, lng, timestamp }] }

// Alert
{ id, type, severity, message, timestamp, read }

// Incident
{ id, name, type, status, location, startDate }

// Team
{ id, name, members, status }
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001/api` | API base URL used by the frontend HTTP client |

> **Note:** `VITE_` prefixed variables are embedded into the frontend bundle at build time by Vite. Set them before running `npm run build` for production.

---

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start frontend dev server (mock data if API unavailable) |
| `build` | `vite build` | Production build to `dist/` |
| `start` | `vite preview` | Preview production build |
