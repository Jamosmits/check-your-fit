# Check Your Fit

**Jouw garderobe. Altijd op orde.** / **Your wardrobe. Always ready.**

An AI-powered wardrobe manager for individuals, couples, and families. Scan your closet in 60 seconds, get daily outfit suggestions based on the weather, and plan trips with a smart packing list.

---

## Screenshots

| Onboarding | Wardrobe | Outfit Builder | Trip Planner |
|---|---|---|---|
| _(placeholder)_ | _(placeholder)_ | _(placeholder)_ | _(placeholder)_ |

---

## Features

- **Wardrobe scan** — Film your closet; AI identifies every item and removes backgrounds automatically
- **Outfit suggestions** — GPT-4o suggests daily outfits based on weather, occasion, and your personal style
- **Virtual try-on** — See outfits on your own body photo
- **Trip packing** — Smart per-person packing lists with weather forecast integration
- **Household sharing** — Share wardrobes with a partner or family members
- **Shopping suggestions** — Affiliate-linked recommendations for wardrobe gaps, with compatibility check
- **Multilingual** — Dutch and English, follows phone locale

---

## Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo`)
- PostgreSQL 15+ **or** a free [Supabase](https://supabase.com) account
- [Expo Go](https://expo.dev/go) on your phone (iOS or Android)

---

## API Keys Required

| Service | Purpose | Where to get |
|---|---|---|
| OpenAI | GPT-4o Vision (scan + outfits) | [platform.openai.com](https://platform.openai.com) |
| Remove.bg | Background removal | [remove.bg/api](https://www.remove.bg/api) |
| WeatherAPI | Weather forecasts | [weatherapi.com](https://www.weatherapi.com) — free tier |
| Supabase | Database + Storage | [supabase.com](https://supabase.com) — free tier |
| Awin | Affiliate shopping | [awin.com](https://www.awin.com) |

---

## Installation

### 1. Clone & install

```bash
git clone https://github.com/jamosmits/check-your-fit.git
cd check-your-fit
npm install
```

### 2. Backend setup

```bash
cd backend
npm install

# Copy and fill in your API keys
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/checkyourfit
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=at-least-32-random-characters
OPENAI_API_KEY=sk-...
REMOVE_BG_API_KEY=...
WEATHER_API_KEY=...
AWIN_API_KEY=...
AWIN_PUBLISHER_ID=...
```

### 3. Database setup

**Option A — Supabase (recommended):**
1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL editor and paste the contents of `backend/src/db/schema.sql`
3. Run it

**Option B — Local PostgreSQL:**
```bash
createdb checkyourfit
psql checkyourfit < backend/src/db/schema.sql
```

### 4. Load demo data

```bash
cd backend
npx ts-node src/db/seed.ts
```

Demo accounts created:
- `sarah@demo.com` / `demo1234` — 12 wardrobe items, 3 outfits
- `thomas@demo.com` / `demo1234` — 10 wardrobe items, 2 outfits
- Household invite code: `DEMO1234`

### 5. Start the backend

```bash
cd backend
npm run dev
# Runs on http://localhost:3000
```

### 6. Configure the app

In the root directory, create `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** For physical device testing replace `localhost` with your machine's local IP (e.g. `192.168.1.x`).

### 7. Start the app

```bash
# From repo root
npx expo start
```

Scan the QR code with Expo Go on your phone.

---

## Running on Simulator / Emulator

```bash
npx expo start --ios      # Requires Xcode on macOS
npx expo start --android  # Requires Android Studio
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, get JWT |
| GET | `/auth/me` | Get current user |

### Wardrobe
| Method | Path | Description |
|---|---|---|
| GET | `/wardrobe` | List items (filter: category, season, search) |
| POST | `/wardrobe` | Add item |
| GET | `/wardrobe/:id` | Get item |
| PATCH | `/wardrobe/:id` | Update item |
| DELETE | `/wardrobe/:id` | Delete item |
| POST | `/wardrobe/:id/worn` | Mark as worn today |

### Scan
| Method | Path | Description |
|---|---|---|
| POST | `/scan/start` | Upload photos, get jobId |
| GET | `/scan/:jobId/status` | Poll scan progress |
| POST | `/scan/:jobId/confirm` | Confirm/reject found items |

### Outfits
| Method | Path | Description |
|---|---|---|
| GET | `/outfits` | List outfits |
| POST | `/outfits` | Create outfit |
| GET | `/outfits/:id` | Get outfit |
| PATCH | `/outfits/:id` | Update outfit |
| DELETE | `/outfits/:id` | Delete outfit |
| POST | `/outfits/suggest` | Get AI outfit suggestions |

### Household
| Method | Path | Description |
|---|---|---|
| POST | `/household` | Create household |
| POST | `/household/join` | Join via invite code |
| GET | `/household` | Get household + members |
| POST | `/household/leave` | Leave household |

### Trips
| Method | Path | Description |
|---|---|---|
| GET | `/trip` | List trips |
| POST | `/trip` | Create trip |
| GET | `/trip/:id` | Get trip with packlist |
| POST | `/trip/:id/packlist` | Generate AI packlist |
| DELETE | `/trip/:id` | Delete trip |

### Shopping
| Method | Path | Description |
|---|---|---|
| GET | `/shopping` | Get suggestions |
| POST | `/shopping/generate` | Generate AI suggestions |
| POST | `/shopping/check` | Check URL compatibility |

### Weather
| Method | Path | Description |
|---|---|---|
| GET | `/weather/current` | Current weather by lat/lng |
| GET | `/weather/forecast` | Multi-day forecast |

---

## Project Structure

```
check-your-fit/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Onboarding, login, register
│   └── (app)/              # Main app screens
├── src/
│   ├── components/         # Reusable UI components
│   ├── hooks/              # React Query + logic hooks
│   ├── store/              # Zustand state stores
│   ├── services/           # API service functions
│   ├── i18n/               # NL + EN translations
│   └── theme/              # Colors, typography, spacing
└── backend/
    └── src/
        ├── controllers/    # Request handlers
        ├── routes/         # Express routers
        ├── services/       # AI, image, weather, affiliate
        ├── middleware/     # Auth, upload, rate limit
        ├── models/         # TypeScript interfaces
        └── db/             # Schema + seed data
```

---

## Tech Stack

**Frontend:** React Native · Expo SDK 51 · expo-router · Zustand · React Query · Reanimated 3

**Backend:** Node.js 20 · Express · TypeScript · PostgreSQL · Supabase

**AI / APIs:** OpenAI GPT-4o Vision · Remove.bg · WeatherAPI.com · Awin Affiliate
