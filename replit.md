# Star Wars Galactic Cartography Hub

## Overview
A full-stack interactive Star Wars galaxy map web app with a PostgreSQL-backed data layer. Features include a zoomable/pannable map, clickable planet markers, draggable sector polygon overlays, hyperspace lanes, fleet markers, admin mode with password protection, a sidebar editor, and a hyperspace travel time calculator.

## Architecture
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, react-zoom-pan-pinch
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Orbitron/Rajdhani sci-fi fonts, dark theme with cyan accent

## Key Files
- `shared/schema.ts` - Drizzle schema (planets, sectors, hyperspace_lanes, fleets)
- `server/routes.ts` - REST API routes (CRUD for all map entities)
- `server/storage.ts` - Database storage interface using Drizzle
- `server/db.ts` - Neon database connection
- `client/src/lib/data.ts` - Frontend types and MapContext
- `client/src/lib/api.ts` - API client with mapper functions
- `client/src/lib/MapProvider.tsx` - State management, API sync with debounced updates
- `client/src/components/GalaxyMap.tsx` - Main interactive map component
- `client/src/components/Sidebar.tsx` - Detail/edit sidebar for all entities
- `client/src/components/TopBar.tsx` - Navigation, filters, travel calculator, admin access
- `client/public/galaxy-map.png` - Background galaxy image (5000x5000)

## API Endpoints
All prefixed with `/api`:
- `GET/POST /planets`, `PATCH/DELETE /planets/:id`
- `GET/POST /sectors`, `PATCH/DELETE /sectors/:id`
- `GET/POST /lanes`, `PATCH/DELETE /lanes/:id`
- `GET/POST /fleets`, `PATCH/DELETE /fleets/:id`
- `GET/POST /factions`, `DELETE /factions/:id`
- `POST /auth/login`, `POST /auth/change-password`
- `GET/POST/DELETE /admin/users` (admin only)

## Map Configuration
- Canvas: 5000x5000 pixels
- Galaxy scale: 120,000 light years across
- Background image fits 1:1 to canvas
- Default admin credentials: username `admin`, password `admin123`

## Features
- Zoomable/pannable galaxy map (min 0.15x, max 10x), 6000x6000 total canvas with 500px padding
- Galaxy image fades at edges via radial gradient mask, starfield background tiles behind
- Planet markers (circle or custom PNG/WebP), capital planets with crown icon
- Sector polygon overlays (color-coded, draggable vertices in admin)
- Pencil drawing tool for sector borders and hyperlane paths (freehand curves)
- Contested sector support with striped fill pattern between two faction colors
- Hyperspace lanes (Major/Minor/Dangerous) with freehand path waypoints
- Fleet markers (custom ship images, capital ship designation)
- Reference map overlay (toggleable in Admin Mode) for accurate planet positioning
- Admin Mode: full CRUD for all entities, hyperlane creation tool
- Hyperspace Travel Calculator using Dijkstra's algorithm along lane network
- All changes persist to PostgreSQL database with debounced writes
- **Planet position locking**: planets are locked by default; must click MOVE in sidebar to unlock drag
- **Sector overlap dialog**: drawing a new sector over an existing one shows a popup — choose "Erase Overlap" (clips existing sector) or "Mark as Contested" (both sectors coexist, pick two factions)
- **Auto faction assignment**: planets inside a drawn sector are auto-assigned to that sector's faction
- **Custom factions**: add/delete factions via Admin Panel (built-in factions are protected)
- **User accounts**: username+password login, admin panel for user management, self-service password change

## Factions
- Built-in: Galactic Republic, Empire, Hutt Cartel, Chiss Ascendancy, Independent
- Custom factions can be added/deleted by admins via the Admin Panel

## Database
- Uses CUSTOM_DATABASE_URL env var (falls back to DATABASE_URL)
- drizzle.config.ts also respects CUSTOM_DATABASE_URL for schema pushes
- Tables: planets, sectors, hyperspace_lanes, fleets, factions, users
