# KINETIX — Science-Based Training Engine

Entrenamiento de hipertrofia y fuerza basado en evidencia científica, con analytics avanzados, coach IA y soporte PWA/mobile.

## 🚀 Deploy a Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/kinetix)

### Pasos manuales:

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Deploy a producción
vercel --prod
```

### Variables de entorno en Vercel:

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `VITE_GEMINI_API_KEY` | API key de Google Gemini para el Coach IA | No |

## 📱 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar API key (opcional)
cp .env.example .env.local
# Editar .env.local con tu GEMINI_API_KEY

# Iniciar servidor de desarrollo
npm run dev
```

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción (Vercel) |
| `npm run build:capacitor` | Build + server para Capacitor/Android |
| `npm run start` | Ejecutar build de producción |
| `npm run preview` | Previsualizar build localmente |
| `npm run typecheck` | Verificar tipos TypeScript |

## 📦 Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4
- **Build:** Vite 6, esbuild
- **Charts:** Recharts
- **Icons:** Lucide React
- **Mobile:** Capacitor 8 (Android)
- **AI:** Google Gemini API
- **Deploy:** Vercel

## 🏗️ Arquitectura

```
src/
├── components/
│   ├── workout/        # WorkoutLogger, WorkoutHub, PlateCalculator
│   ├── exercises/      # BiomechanicsHub, ExerciseDetail, Library
│   ├── programs/       # ProgramsExplorer, RoutineEditor
│   ├── analytics/      # ScienceDashboard, Charts
│   ├── nutrition/      # NutritionVisionHub, MealTracker
│   ├── ai/             # ScienceCoachModal (Gemini)
│   └── Navigation.tsx
├── context/            # WorkoutContext (state management)
├── data/               # exercisesData, programsData
├── utils/              # scienceCalculators, exerciseEnhancer
├── types.ts            # TypeScript interfaces
├── App.tsx             # Root with lazy loading
└── main.tsx            # Entry with ErrorBoundary
```

## 📊 Features

- ✅ **Programas de entrenamiento** con progresión automática
- ✅ **Workout logger** con timer de descanso y tracking de RIR
- ✅ **Analytics** de volumen (MEV, MAV, MRV) y progreso
- ✅ **Calculadora de 1RM** con múltiples fórmulas
- ✅ **Nutrición** con tracking de macros y análisis de comidas
- ✅ **Coach IA** (Google Gemini) para recomendaciones
- ✅ **PWA** instalable con service worker offline
- ✅ **Mobile-first** con safe areas y touch targets optimizados
- ✅ **Dark theme** optimizado para AMOLED

## 🐛 Debug & Error Handling

La app incluye un **ErrorOverlay** global que captura:
- Errores de JavaScript no capturados
- Promesas rechazadas
- Crashes de React

Los errores se muestran en una tarjeta roja en la parte inferior de la pantalla.

## 📄 Licencia

MIT © KINETIX
