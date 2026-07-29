# AGENTS.md — Development Guide & Architectural Reference

This document serves as the permanent developer and AI agent reference for the codebase. Every future implementation, feature addition, refactoring, or bug fix **must** adhere strictly to the architecture, standards, conventions, and design principles outlined here.

---

## 1. Purpose & Vision

This guide defines the codebase standards to ensure:
* **Structural Consistency**: New features seamlessly align with the established modular pattern.
* **Serverless Compatibility**: Code strictly adheres to Vercel serverless execution constraints.
* **Unified Data Persistence**: All user state integrates with the existing Telegram storage layer.
* **Approachable UX**: All user-facing copy, logs, error messages, and dialogs remain intuitive, simple, and free of technical jargon.
* **UI Harmony**: Visual styles, spacing, responsive layouts, and theme support (Light & Dark) remain visually unified.

---

## 2. Project Architecture Overview

### Deployment Environment
* **Platform**: Vercel.
* **Runtime**: Node.js Serverless Functions for API routes (`/api/*`), paired with a React + Vite Single Page Application (SPA) client.
* **API Entry Point**: `/api/index.ts` imports the Express application from `app.ts` and exports it as a serverless handler. Local development uses `server.ts` running Express via `tsx`.

### Serverless Architecture & Constraints
1. **Stateless Backend**: Serverless functions are ephemeral. Never store application state in Node.js global variables, local memory caches that expect persistence across requests, or disk files.
2. **No Background Processes**: Avoid `setInterval`, background workers, or un-awaited asynchronous tasks in the API lifecycle. Every operation must complete within the HTTP request handler timeout limit.
3. **Lazy Initialization**: Initialize services, configuration checks, and database connections lazily within request contexts.

---

## 3. Data Storage & Database Architecture

### Primary Storage Engine: Telegram Bot API
The application uses a private Telegram channel as a distributed, sharded database layer.
* **Master Index**: `user_index.json` pinned message in the private channel contains the `MasterIndex` mapping user IDs to their respective database shards.
* **Shard Partitioning**: Users are deterministically sharded (`index_a.json`, `index_b.json`, `index_num.json`, etc.) based on username attributes to ensure high scale and low latency.
* **Binary MessagePack Storage**: Individual user documents (Authentication, Progress, Watch Data, Achievements, Sessions, Updates, Avatars) are stored as compressed MessagePack (`.msgpack`) binary documents attached to channel messages.

### Storage Rules for Future Development
* **Reuse Existing Engine**: Always use the database methods in `/backend/Database.ts` (`fetchUserFile`, `updateUserFileAndIndex`, `lockDatabase`).
* **No Alternative Storage Systems**: Do **not** introduce secondary databases (e.g., MongoDB, PostgreSQL, SQLite, Redis, Firebase) unless explicitly requested.
* **Concurrency Locking**: Always wrap multi-step read-modify-write operations in `lockDatabase(...)` to prevent race conditions across serverless instances.
* **In-Memory Caching Strategy**: Short-lived TTL memory caches in `Database.ts` (e.g., 15-second index TTL, 8-second user TTL) optimize performance within container lifecycles while remaining safe for serverless resets.

---

## 4. Absolute Constraints ("Never Change Unless Asked")

To prevent AI regression and unnecessary code churning, the following rules are **strictly mandatory**:
* **Never Redesign Existing UI**: Do not change or redesign the existing visual layout, colors, grids, components, or tabs unless the user has explicitly requested a visual overhaul.
* **Never Rename API Endpoints**: Do not rename `/api/*` endpoints or backend paths unless you also update every front-end service, fetch handler, and reference.
* **Preserve Business Logic**: Never modify background business rules, database queries, calculations, or authentication validations while doing simple visual, markup, or CSS updates.
* **Never Remove Existing Features**: Retain all legacy features, diagnostic panels, stats, buttons, and settings options. If a feature is not mentioned in the update request, keep it completely intact.
* **Maintain Backward Compatibility**: User schema structure updates must always support old database accounts (`UserJson`, `UserIndexEntry`). Never force-clear database shards or write migration scripts that break existing active user properties.

---

## 5. Development Principles

### "Existing Component First" Rule
Before creating any new component, utility function, React hook, modal dialog, helper function, or Express router/API:
1. **Search the Entire Project**: Look through `/src/components/`, `/src/components/Common/`, `/src/utils/`, and `/src/hooks/` to check if a similar or equivalent implementation already exists.
2. **Prioritize Reuse**: Reuse pre-built UI components (`ConfirmationModal`, `MCULoader`, `CustomDropdown`, `LazyImage`) and utility functions instead of writing duplicate code.

### AI Response & Coding Style
* **No Over-Engineering**: Avoid building highly abstract, complex wrapper classes or convoluted design patterns where simple procedural code or direct React hooks suffice.
* **No Unnecessary Abstractions**: Do not wrap standard libraries with unnecessary wrappers. Keep standard logic simple and readable.
* **Cleverness vs. Readability**: Always choose readability over "clever" code. The code must be clean, maintainable, and highly understandable by subsequent AI assistants and human developers.
* **Single Responsibility**: Keep components focused on a single responsibility. Delegate modals, forms, and custom sub-views into separate, modular sub-components.

---

## 6. Project Analysis Rule

Before implementing any feature or modifying any file, the development AI or developer **must**:
1. **Analyze Relevant Files**: Call file viewing tools to read existing code, API routes, and type declarations related to the request.
2. **Understand Existing Architecture**: Study how state flows and how existing operations are processed in similar parts of the app.
3. **Follow Local Style**: Adopt the existing code styling, comment structure, spacing, and error handling pattern.
4. **Identify Reuse Candidates**: Note existing utility methods, hooks, or assets that can be leveraged.
5. **Implement Safely**: Only begin coding once you have a full, high-fidelity understanding of the context.

---

## 7. Naming Conventions

Maintain simple, clean, and immediately descriptive file and symbol names. Avoid overly technical, cryptic, or bloated names.

### Examples of Good File Naming:
* **Backend Database & Resolvers**: `Database.ts`, `CharacterImages.ts`, `deviceResolver.ts`, `ipResolver.ts`.
* **Backend Routes**: `authRoutes.ts`, `userRoutes.ts`, `mediaRoutes.ts`.
* **Frontend Tab Views**: `DashboardTab.tsx`, `MoviesTab.tsx`, `SeriesTab.tsx`, `TimelineTab.tsx`, `CharactersTab.tsx`, `AnalyticsTab.tsx`, `ProfileTab.tsx`, `SettingsTab.tsx`.
* **Frontend Components & Modals**: `SessionDetails.tsx`, `UpdatesDetails.tsx`, `ConfirmationModal.tsx`, `MCULoader.tsx`.

### Symbol Naming Standards:
* Components: PascalCase (`AnalyticsTab`, `DetailModal`).
* Utilities / Hooks: camelCase (`formatToIndianDateTime`, `useBodyScrollLock`, `useCountdown`).
* Route paths: Kebab-case or clear RESTful endpoints (`/api/auth/login`, `/api/user/update-profile`).

---

## 8. User-Facing Language & Copywriting

For every future feature, UI layout, configuration panel, activity log, action button, tooltip, modal dialog, PDF/Excel export, and notification:
* **Simple, Natural Tone**: Use common, everyday words that are clear to non-technical users.
* **No Technical Jargon**: Avoid exposing database terms, network concepts, or internal protocols.

### Strict Vocabulary Mapping:

| Avoid these Complex/Technical Words | Use these Simple/Friendly Words |
| :--- | :--- |
| Registry, Ledger, Codex | Details, History |
| Persistence, Serialization | Saved Data, Database |
| Synchronization, Orchestration | Update, Load |
| Migration Pipeline, Shard Index | Database Shards, Storage |
| Resolver Engine, Interceptor | Settings, Route, Check |
| Payload, JWT Signature Mismatch | Unable to load, Session Expired |
| Shard Index Miss, 500 Server Exception | Server busy, Please try again |

---

## 9. UI Consistency & Theming

### Mobile-First Design Rule
* **Designed for Mobile First**: Since the target audience primarily accesses the application via mobile devices, all layouts, tables, dialogs, and navigation elements **must** be optimized for small touch screens (minimum 44px touch targets) first.
* **Responsive Escalation**: Scale layouts cleanly using Tailwind breakpoints (`sm:`, `md:`, `lg:`) to enhance views for tablets and desktop monitors. Avoid stretched screens, massive margins, or tiny fonts on wide displays.

### Visual Guidelines:
* **Design System**: Built on Tailwind CSS with responsive layout grids, high contrast readability, subtle card borders, and clean spacing.
* **Theme Support**: Full support for both **Light** (`theme-light`, `light`) and **Dark** (`dark`, `oled`) modes via CSS variables and root class toggles on `<html>` and `<body>`.
* **Icons**: Exclusively use `lucide-react` icons. Maintain consistent sizing (typically 16px to 24px) and stroke weight.
* **Animations**: Use `motion/react` (`motion`, `AnimatePresence`) for micro-interactions, tab transitions, and modal overlays.

---

## 10. Refactoring & Renaming Rules

When modifying, renaming, or refactoring code files:
* **Update Every Import/Export**: You must scan and update all static and relative import paths across the entire workspace.
* **Check Dynamic/Lazy Imports**: Ensure any React lazy-loaded files (`React.lazy()`) or dynamic imports are accurately mapped to the new path.
* **Fix Asset & Image Paths**: Verify image sources, local icons, and asset helper files point to the correct sub-folders.
* **Resolve Barrel Exports**: Update index files (`index.ts`) that export the refactored directory components.
* **Zero Broken References**: Perform a thorough codebase check to ensure zero compilation or import resolution errors occur post-refactor.

---

## 11. Dependencies Rule

* **Do Not Install Unnecessary Packages**: Do **not** install a new npm library or package if an existing pre-installed dependency can accomplish the same task, or if native browser APIs (such as `fetch`, `LocalStorage`, `Intl`, `crypto`) can solve it cleanly.
* **Preferred Libraries List**:
  * **Icons**: `lucide-react`
  * **Animations**: `motion/react`
  * **PDF Generation**: `jspdf` and `jspdf-autotable`
  * **Charts & Analytics**: Recharts / existing UI charts inside `/src/components/Analytics/`

---

## 12. Error Handling & Fail-Safes

Every API route and UI component must contain robust, native error handling:
* **Graceful Fallbacks**: If an API call fails or a resource is missing, display clear fallback UI (e.g., an empty state or a friendly notice) instead of crashing the tab.
* **Don't Crash the UI**: Wrap complex UI operations (e.g., rendering dynamic lists, processing charts) with safety guards to prevent React layout crashes.
* **Meaningful User Messages**: Translate technical HTTP status codes or API errors into understandable human copy (e.g., *"We couldn't load your sessions right now. Please try again later."*).
* **Data Integrity Preservation**: When operations fail midway, rollback temporary states or prevent writing corrupted/truncated objects to the user's storage shard.

---

## 13. Logging & Audit Ledger

The application maintains an activity update ledger (`UpdateLog` and `updatesBuffer`) for tracking user state modifications.

### Logging Rules:
* **Action Names**: Use clear, natural action descriptors (e.g., *"Account Created"*, *"Full Name Updated"*, *"Session Terminated"*, *"Watch Status Changed"*).
* **User-Readable Values**: Store human-readable previous and new values (e.g., previousValue: `"Unwatched"`, newValue: `"Completed"`).
* **Timestamps**: Format timestamps using the Indian Date/Time formatter (`formatToIndianDateTime`) in `en-IN` locale (`Asia/Kolkata` timezone) for display.
* **No Internal Details**: Exclude internal database keys, raw hashes, or server stack traces from log metadata.

---

## 14. Data Exports & Reports

* **Format Integrity**: Exported documents (such as PDF summaries generated via `jspdf` and `jspdf-autotable`) must be formatted cleanly with structured headers, clear column alignment, and legibility.
* **Privacy & Security**: Never include sensitive authentication tokens, password hashes, or internal server configurations in user export reports.
* **Clear Categorization**: Group export data logically by title, watch status, timestamp, and activity category.

---

## 15. Performance Optimization & Caching

1. **Asset Caching**: Use `assetCache.ts` (`initCache`, `startPreCaching`) to cache external images and media assets in client storage, avoiding unnecessary network fetches.
2. **Battery-Aware Governor**: Maintain compatibility with `mcu_pwa_governor` settings to dial back heavy visual animations on low-battery or power-saver devices.
3. **Instant UI Navigation**: Derive active tab and modal states directly from URL path segments (`useLocation`, `useNavigate`) to prevent layout flickers or artificial loading delays.
4. **Scroll Position Preservation**: Preserve page scroll positions across navigation tab changes using `useLayoutEffect` to avoid visual page jumping.

---

## 16. Development Workflow

All implementations must strictly follow this cycle:

```
[1] Analyze Workspace
       ↓
[2] Research & Locate Reusable Code
       ↓
[3] Formulate Plan
       ↓
[4] Implement Safely without Churning Existing UI/Logic
       ↓
[5] Double-Check Imports & Lazy Paths
       ↓
[6] Verify Responsive & Theme Support (Mobile First)
       ↓
[7] Run Linter & TypeScript Compilation (tsc --noEmit)
       ↓
[8] Finish
```

---

## 17. Checklist for Future Development

Before finalizing any new implementation, verify compliance with the following:

- [ ] **Codebase Analysis**: Thoroughly reviewed existing files before creating or modifying code.
- [ ] **Serverless Compliance**: Verified that backend routes are stateless and compatible with Vercel serverless environment.
- [ ] **Storage Engine Integration**: Utilized existing `/backend/Database.ts` methods without introducing duplicate or external database engines.
- [ ] **Component & Utility Reuse**: Reused existing UI components, modals, formatters, and icons instead of recreating them.
- [ ] **Naming Standards**: Followed simple, descriptive, and consistent file and variable naming conventions.
- [ ] **User-Facing Copy Check**: Ensured all copy, labels, tooltips, logs, and error messages use simple, jargon-free, natural language.
- [ ] **UI & Theme Uniformity**: Verified responsive behavior and consistent rendering in both Light and Dark themes.
- [ ] **Human-Readable Logging**: Ensured any new update logs describe user actions clearly without exposing internal engineering details.
- [ ] **Export & Privacy Compliance**: Confirmed data exports are cleanly formatted and free of sensitive security data.
- [ ] **Performance & Cache Strategy**: Verified that asset caching and scroll position restoration function smoothly without layout shifts.
- [ ] **Backward Compatibility**: Preserved pre-existing user data schemas, routing paths, and business logic.
- [ ] **Clean Build**: Confirmed TypeScript compilation (`tsc --noEmit`) passes with zero syntax or import errors.
