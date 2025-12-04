<div align="center">
<img width="1200" height="475" alt="Bisita Iligan Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Bisita Iligan

A mobile-first tourism PWA for Iligan City, Philippines - "City of Majestic Waterfalls". Discover attractions, interactive maps, local businesses, tour guides, and more.

## Features

- 🗺️ **Interactive Maps** - Explore attractions with Leaflet-powered maps
- 🏝️ **Attractions** - Detailed info on waterfalls, beaches, parks & landmarks
- 👨‍💼 **Tour Guides** - Book verified local guides for personalized tours
- ⭐ **Reviews & Ratings** - Share your experiences with other travelers
- 📸 **Photo Uploads** - Cloudinary-powered image uploads with compression
- 📴 **Offline Support** - Service worker caching for offline access
- 🔐 **Authentication** - Email/password + Google/Facebook OAuth

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5.8** + **Vite 6**
- **React Router DOM 7** (HashRouter)
- **Tailwind CSS** for styling
- **Leaflet + React Leaflet** for maps
- **Lucide React** for icons

### Backend
- **Express.js 4.18** + **TypeScript 5.3**
- **MongoDB** with Mongoose 8.0
- **Passport.js** for OAuth (Google, Facebook)
- **JWT** with httpOnly cookies
- **Resend** for transactional emails
- **Cloudinary** for image storage

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- (Optional) Resend account for emails
- (Optional) Google/Facebook OAuth credentials

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/bisita.git
cd bisita

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values
# VITE_API_URL=http://localhost:5000/api

# Start dev server
npm run dev
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your MongoDB URI, JWT secrets, etc.

# Seed the database with sample data
npm run seed

# Start dev server
npm run dev
```

## Deployment

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set the root directory to `/backend`
4. Add environment variables from `.env.example`
5. Railway will auto-deploy on push

Configuration is in [`backend/railway.toml`](backend/railway.toml)

### Frontend (Vercel)

1. Create a new project on [Vercel](https://vercel.com)
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable:
   - `VITE_API_URL` = your Railway backend URL

Configuration is in [`vercel.json`](vercel.json)

### Environment Variables

#### Frontend (`.env`)
```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

#### Backend (`.env`)
```env
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=your-64-char-secret
JWT_REFRESH_SECRET=your-64-char-secret
RESEND_API_KEY=re_xxxxx
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=xxxxx
FRONTEND_URL=https://your-app.vercel.app
```

## Project Structure

```
bisita/
├── components/          # Shared UI components
│   ├── BottomNav.tsx   # Fixed bottom navigation
│   ├── ImageUploader.tsx
│   └── PrivateRoute.tsx
├── pages/               # Route-level components
│   ├── Home.tsx
│   ├── MapPage.tsx
│   ├── AttractionDetail.tsx
│   ├── GuidesPage.tsx
│   └── admin/          # Admin-only pages
├── context/             # React context providers
│   └── AuthContext.tsx
├── services/            # API client
│   └── api.ts
├── hooks/               # Custom React hooks
├── data/                # Static fallback data
├── public/
│   └── sw.js           # Service worker
└── backend/
    ├── src/
    │   ├── models/     # Mongoose schemas
    │   ├── routes/     # Express routes
    │   └── middleware/ # Auth, roles
    └── railway.toml
```

## User Roles

| Role | Permissions |
|------|------------|
| `tourist` | View content, write reviews, book guides |
| `guide` | All tourist + manage guide profile & bookings |
| `business_owner` | All tourist + manage business listings |
| `admin` | Full access + user management, verifications |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/facebook` - Facebook OAuth

### Attractions
- `GET /api/attractions` - List all
- `GET /api/attractions/:id` - Get one
- `POST /api/attractions` - Create (admin)
- `PUT /api/attractions/:id` - Update (admin)
- `DELETE /api/attractions/:id` - Delete (admin)

### Reviews
- `GET /api/reviews/attraction/:id` - Get reviews for attraction
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update (within 12hrs)
- `DELETE /api/reviews/:id` - Delete own review

### Guides
- `GET /api/guides` - List guides
- `GET /api/guides/:id` - Get guide profile
- `POST /api/guides/bookings` - Create booking
- `PUT /api/guides/bookings/:id` - Update booking status

## License

MIT
