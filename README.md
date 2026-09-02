# ⚡ KINETIX — Science-Based Hypertrophy & Strength Engine

> Entrenamiento de hipertrofia y fuerza basado en evidencia científica, con **analytics avanzados de volumen (MEV/MAV/MRV)**, calculadora de 1RM, programa de nutrición adaptativo, **Health Connect**, **reto de 21 días**, doble progresión automática y soporte **PWA + APK Android**.
>
> **Sin APIs externas, sin claves, 100% offline en tu dispositivo.**

---

## 📱 Screenshots

| | | |
|:---:|:---:|:---:|
| <img src="screenshots/workout-home.png" width="220" alt="Inicio / Entrenar"/> | <img src="screenshots/programs.png" width="220" alt="Programas"/> | <img src="screenshots/biomechanics.png" width="220" alt="Biomecánica"/> |
| **Inicio & Entrenar** | **Programas** | **Biomecánica** |
| <img src="screenshots/analytics.png" width="220" alt="Analytics"/> | <img src="screenshots/nutrition.png" width="220" alt="Nutrición"/> | <img src="screenshots/live-workout.png" width="220" alt="Entrenamiento en vivo"/> |
| **Analytics & MEV** | **Nutrición** | **Logger en vivo** |
| <img src="screenshots/exercise-detail.png" width="220" alt="Detalle de ejercicio"/> | | |
| **Detalle de ejercicio** | | |

---

## 🚀 Live Demo

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Fernandezalejo1/kinetix)

**🔗 Producción:** https://kinetix-science-based-hypertrophy-a.vercel.app/

> 🔒 **Acceso:** la app está protegida con el PIN fijo `2113`.

---

## ✨ Features

### 🏋️ Entrenamiento
- ✅ **Programas de entrenamiento** con doble progresión automática (sube el peso cuando calzas el rango con el RIR objetivo)
- ✅ **Workout logger** en vivo con banner de objetivo por ejercicio (sets × reps × RIR)
- ✅ **Doble progresión** con regla de mayoría y delta de peso por tipo de ejercicio (compuesto/aislamiento)
- ✅ **Ejercicios por tiempo** (isométricos: plancha, superman, handstand) con **timer** Iniciar/Pausar/Reiniciar + vibración — sin contador de repeticiones
- ✅ **Timer de descanso** entre series y tracking de RIR/RPE
- ✅ **Calculadora de 1RM** con múltiples fórmulas (Brzycki, Epley, Wathan)
- ✅ **Calculadora de placas**, metrónomo de tempo y generador de calentamiento
- ✅ **Patrón PPL** con abdominales en los 6 días

### 📊 Analytics
- ✅ **Volumen semanal** con target de MEV / MAV / MRV por grupo muscular
- ✅ **Tendencia de fuerza** y progreso por ejercicio
- ✅ **PRs (marcas personales)** y racha de entrenamiento

### 🔬 Biomecánica
- ✅ **Base de datos de ejercicios** con anatomía, errores frecuentes, progresiones/regresiones y variaciones
- ✅ **Visualizador de anatomía** y detalle por ejercicio

### 🥗 Nutrición
- ✅ **Objetivos por meta** (Volumen Magro, Bulk, Mantenimiento, Déficit) con seguimiento de macros
- ✅ **Ajustes automáticos por pasos** (Health Connect): reglas deterministas que ajustan calorías/proteína sin IA
- ✅ **Plan de comidas** con horario normal o nocturno, platos rápidos por momento y guía de suplementos basada en evidencia
- ✅ **Water tracker** y distribución calórica

### 🏆 Reto 21 Días
- ✅ **15.000 pasos/día × 21 días consecutivos** — si fallás un día, se reinicia a 0
- ✅ **Sistema de rangos estilo LoL** con emblemas oficiales (Bronce → Oro → Master → Challenger)
- ✅ **Pasos en tiempo real desde Health Connect**, barra de progreso, racha y calendario
- ✅ **Persistencia** del estado del reto (no se pierde al cerrar)

### 📱 Plataforma
- ✅ **PWA instalable** con service worker y soporte offline
- ✅ **APK Android** con Capacitor
- ✅ **Health Connect** (pasos y calorías en dispositivo nativo)
- ✅ **Dark theme** optimizado para AMOLED + mobile-first

---

## 🏗️ Arquitectura

```
src/
├── components/
│   ├── workout/        # WorkoutHub, LiveWorkoutLogger, PlateCalculator, TempoMetronome, WarmupGenerator
│   ├── exercises/      # BiomechanicsHub, ExerciseDetail, Library, AnatomyVisualizer
│   ├── programs/       # ProgramsExplorer, RoutineEditor
│   ├── analytics/      # ScienceDashboard (MEV/MAV/MRV, PRs, progress)
│   ├── nutrition/      # NutritionVisionHub, StepsPanel, StepsEngine, MealSchedulerPanel, WaterTracker
│   └── challenge/      # ChallengeHub (Reto 21 Días + rangos LoL)
├── context/            # WorkoutContext (estado global + localStorage)
├── data/               # exercisesData, programsData, nutritionData
├── utils/              # scienceCalculators, exerciseEnhancer, doubleProgression,
│                       # exerciseMode, stepsRules, healthConnect, challengeStorage
├── types.ts
├── App.tsx             # Root con lazy loading
└── main.tsx            # Entry con ErrorBoundary + PWA
```

---

## 🧰 Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4
- **Build:** Vite 6, esbuild
- **Charts:** Recharts
- **Icons:** Lucide React
- **Animations:** Motion (Framer Motion)
- **Mobile:** Capacitor 8 (Android) + @capgo/capacitor-health (Health Connect)
- **Deploy:** Vercel (PWA estática, sin backend)

---

## 📦 Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción (Vercel) |
| `npm run build:capacitor` | Build + server para Android |
| `npm run start` | Ejecutar el servidor de producción (self-host) |
| `npm run preview` | Previsualizar el build localmente |
| `npm run typecheck` | Verificar tipos TypeScript |

---

## 🚀 Deploy a Vercel

```bash
npm i -g vercel
vercel
vercel --prod
```

> La app es **estática**: no requiere variables de entorno ni servicios externos.

---

## 📱 Build Android (Capacitor)

```bash
npm run build:capacitor
npx cap sync android
npx cap open android
```

---

## 🛠️ Desarrollo Local

```bash
npm install
npm run dev
```

---

## 📄 Licencia

MIT © KINETIX
