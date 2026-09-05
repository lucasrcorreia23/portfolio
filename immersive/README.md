# Immersive Cyberpunk Portfolio

An experimental, immersive portfolio experience built with Next.js 15, React Three Fiber, and GSAP. This is a self-contained prototype showcasing a cyberpunk-inspired design direction for Lucas R. Correia's portfolio.

## 🎨 Design Vision

- **Aesthetic**: Cyberpunk meets modern design — neon cyan/magenta on near-black backgrounds
- **Visual Elements**: Atmospheric fog, floating geometric particles, subtle bloom/glow effects
- **Grain & Noise**: Film grain overlay for texture and depth
- **Smooth Animations**: GSAP-powered scroll animations and WebGL interactions
- **Performance-Conscious**: Graceful degradation for lower-end devices, reduced motion support

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebGL support

### Installation

```bash
cd immersive
npm install
```

### Development

```bash
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001)

(Port 3001 is used to avoid conflicts with the main portfolio site on port 3000)

### Build

```bash
npm run build
npm start
```

## 🏗️ Architecture

```
immersive/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with fonts
│   ├── page.tsx           # Main page with sections
│   └── globals.css        # Global styles & animations
├── components/
│   ├── canvas/            # WebGL/Three.js components
│   │   ├── Scene.tsx
│   │   └── CyberpunkEnvironment.tsx
│   └── ui/                # Overlay UI components
│       ├── Hero.tsx
│       ├── Work.tsx
│       ├── About.tsx
│       └── Contact.tsx
├── lib/                   # Utilities (future)
└── public/                # Static assets
```

## 🎯 Features

### Landing Experience
- Full-viewport WebGL canvas with React Three Fiber
- Floating geometric particles with individual animation
- Animated grid floor with infinite scroll effect
- Floating torus rings with smooth float animations
- Mouse-controlled parallax via OrbitControls
- Atmospheric fog for depth

### UI Overlay
- Hero section with name, role, tagline, and CTAs
- Selected Work section with project cards
- About section with bio and skills
- Contact section with email/LinkedIn links
- Smooth scroll between sections
- GSAP scroll-triggered animations

### Accessibility
- Keyboard navigation support
- `prefers-reduced-motion` fallback
- Semantic HTML
- ARIA labels on interactive elements
- Focus states on all interactive elements

### Performance
- Dynamic imports for WebGL (SSR-safe)
- Responsive canvas resolution (DPR 1-2)
- Optimized particle count (30 particles)
- No large binary assets committed

## 🎨 Color Palette

```css
--cyber-black: #0a0a0f    /* Primary background */
--cyber-dark: #121218     /* Secondary background */
--cyber-gray: #1a1a24     /* Borders & cards */
--cyber-cyan: #00fff9     /* Primary accent */
--cyber-magenta: #ff00ff  /* Secondary accent */
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D**: Three.js + React Three Fiber + Drei
- **Animation**: GSAP + ScrollTrigger
- **Fonts**: Inter (body) + Space Grotesk (display)

## 📝 Notes

- This is a **sandbox/prototype** separate from the main portfolio site
- The main site (root `/src`) remains unchanged and continues to serve the live site
- Built as a vertical slice: focused on core experience over feature completeness
- Portuguese-friendly copy (Lucas's primary language)
- No external API calls or secrets required

## 🔗 Related Links

- Main Portfolio: [lucasrc.com.br](https://www.lucasrc.com.br)
- GitHub: [github.com/lucasrcorreia23](https://github.com/lucasrcorreia23)
- LinkedIn: [linkedin.com/in/lucasrcorreia](https://www.linkedin.com/in/lucasrcorreia/)

## 📄 License

Private portfolio project — not open source.

---

**Built by Lucas R. Correia** — Designer Engineer @ Atomsix, Santa Catarina, Brazil
