# Bisita Iligan - AI Coding Instructions

## Project Overview
A React tourism web app for Iligan City, Philippines ("City of Majestic Waterfalls"). Mobile-first PWA showcasing attractions, interactive maps, and local businesses.

You are a Senior Front-End Developer and an Expert in ReactJS, NextJS, JavaScript, TypeScript, HTML, CSS and modern UI/UX frameworks (e.g., TailwindCSS, Shadcn, Radix). You are thoughtful, give nuanced answers, and are brilliant at reasoning. You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning.

- Follow the user’s requirements carefully & to the letter.
- First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.
- Confirm, then write code!
- Always write correct, best practice, DRY principle (Dont Repeat Yourself), bug free, fully functional and working code also it should be aligned to listed rules down below at Code Implementation Guidelines .
- Focus on easy and readability code, over being performant.
- Fully implement all requested functionality.
- Leave NO todo’s, placeholders or missing pieces.
- Ensure code is complete! Verify thoroughly finalised.
- Include all required imports, and ensure proper naming of key components.
- Be concise Minimize any other prose.
- If you think there might not be a correct answer, you say so.
- If you do not know the answer, say so, instead of guessing.

### Coding Environment
The user asks questions about the following coding languages:
- ReactJS
- NextJS
- JavaScript
- TypeScript
- TailwindCSS
- HTML
- CSS

### Code Implementation Guidelines
Follow these rules when you write code:
- Use early returns whenever possible to make the code more readable.
- Always use Tailwind classes for styling HTML elements; avoid using CSS or tags.
- Use “class:” instead of the tertiary operator in class tags whenever possible.
- Use descriptive variable and function/const names. Also, event functions should be named with a “handle” prefix, like “handleClick” for onClick and “handleKeyDown” for onKeyDown.
- Implement accessibility features on elements. For example, a tag should have a tabindex=“0”, aria-label, on:click, and on:keydown, and similar attributes.
- Use consts instead of functions, for example, “const toggle = () =>”. Also, define a type if possible.


## Tech Stack
- **React 19** + **TypeScript 5.8** + **Vite 6**
- **React Router DOM 7** (HashRouter for static hosting)
- **Leaflet + React Leaflet** for maps
- **Lucide React** for icons
- **Tailwind CSS** (utility classes inline)

## Architecture

### Routing Pattern
All routes defined in `App.tsx` using HashRouter. Dynamic routes use `:id` params:
```tsx
<Route path="/attraction/:id" element={<AttractionDetail />} />
```

### Component Structure
```
components/     # Shared UI (Header, BottomNav)
pages/          # Route-level components (one per route)
types.ts        # TypeScript interfaces (Attraction, Business, User)
```

### Data Pattern (Current)
Data is **hardcoded inline** in page components. When adding attractions/businesses:
- `Home.tsx` → `allSpots` array for homepage listings
- `Directory.tsx` → `items` array for directory listings  
- `AttractionDetail.tsx` → `attractionsData` object keyed by ID
- `MapPage.tsx` → `locations` array with coordinates and transport info

**Keep IDs consistent across files** when the same place appears in multiple locations.

## Code Conventions

### Component Pattern
```tsx
const PageName: React.FC = () => {
  const navigate = useNavigate();
  // ... component logic
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Content */}
      <BottomNav />
    </div>
  );
};
export default PageName;
```

### Styling
- Mobile-first Tailwind utilities (no external CSS files)
- Color palette: `sky-600` (primary), `slate-900` (text), `orange-*` (accents)
- Consistent spacing: `p-6`, `rounded-xl/2xl`, `shadow-sm`
- Bottom padding `pb-24` on pages to account for fixed `BottomNav`

### Image Handling
Always include fallback for external images:
```tsx
onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300' }}
```

### Navigation
Use `useNavigate()` hook, not `<Link>` components:
```tsx
onClick={() => navigate(`/attraction/${item.id}`)}
```

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Route definitions |
| `components/BottomNav.tsx` | Fixed bottom navigation (Home/Map/Directory/Profile) |
| `pages/Home.tsx` | Main dashboard with search, categories, featured spots |
| `pages/MapPage.tsx` | Leaflet map with location markers and commute guides |
| `pages/AttractionDetail.tsx` | Dynamic detail page with visitor info |

## Commands
```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```



