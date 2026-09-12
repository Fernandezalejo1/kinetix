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

---

## ✨ Features

### 🏋️ Entrenamiento
- ✅ **Programas de entrenamiento** con doble progresión automática (sube el peso cuando calzas el rango con el RIR objetivo)
- ✅ **Onboarding de perfil** (experiencia, frecuencia, duración, equipamiento) con recomendación de programa y rutina **explicables**
- ✅ **Adaptación por equipamiento**: las rutinas se ajustan a tu acceso (solo casa / mancuernas + banco / gimnasio completo) con sustituciones deterministas
- ✅ **Mesociclos 4+1** con reloj persistente: acumulación (intro → ramp → pico) + semana de descarga por calendario o señales reales, con reinicio automático
- ✅ **Workout logger** en vivo con banner de objetivo por ejercicio (sets × reps × RIR)
- ✅ **Resumen de sesión** con métricas completas
- ✅ **Doble progresión** con regla de mayoría y delta de peso por tipo de ejercicio (compuesto/aislamiento)
- ✅ **Deload automático** por acumulación real de sobrecarga: analiza 4 semanas de RIR/volumen/tasa de fallos y genera una semana de descarga
- ✅ **Detección de plateau**: si el e1RM no se mueve ≥2% en 3 sesiones, sugiere la palanca correcta según la causa (rotar ejercicio, cambio de rango/pausa, consolidar carga)
- ✅ **VBT proxy estimado**: velocidad concéntrica sin encoder usando curvas carga-velocidad (González-Badillo / Sánchez-Medina) para orientar fuerza vs potencia
- ✅ **DUP** (sustitución de ejercicios) integrado en la construcción de sesiones
- ✅ **Ejercicios por tiempo** (isométricos: plancha, superman, handstand) con **timer** Iniciar/Pausar/Reiniciar + vibración — sin contador de repeticiones
- ✅ **Timer de descanso** entre series (hook `useRestTimer`) y tracking de RIR/RPE
- ✅ **Calculadora de 1RM** con múltiples fórmulas (Brzycki, Epley, Wathan)
- ✅ **Calculadora de placas**, metrónomo de tempo, generador de calentamiento e **importador de sesiones**
- ✅ **Cargas iniciales recomendadas** (startingLoads) según perfil y guía editorial
- ✅ **Patrón PPL** con abdominales en los 6 días

### 📊 Analytics
- ✅ **Volumen semanal** con target de MEV / MAV / MRV por grupo muscular
- ✅ **Tendencia de fuerza** y progreso por ejercicio
- ✅ **PRs (marcas personales)** y racha de entrenamiento
- ✅ **Revisión semanal**: mide adherencia, progreso y recuperación, devuelve veredicto + ítems de acción y **ajustes aplicables de un toque** (frecuencia, programa, fase)
- ✅ **Metas y fases** con motor de estimaciones (goalEngine) con régimen de entrenamiento, cardio y sueño por meta

### 🔒 Seguridad y Privacidad
- ✅ **Vault v2** cifrado en reposo AES-GCM (DataKey de 32 B con doble wrap: contraseña + secreto de sesión); el texto plano vive **solo en memoria**
- ✅ **Bloqueo por PIN** (PBKDF2-SHA-256, 150k iteraciones) con auto-bloqueo al minimizar y bloqueo tras 5 intentos fallidos
- ✅ **Backups cifrados** con exportación/restauración; las claves de PIN/cifrado quedan **excluidas** del backup
- ✅ **Restore transaccional**: validación de contenido por tipo antes de restaurar
- ✅ **Restricción de cuota**: aviso cuando el almacenamiento llega al límite, con retención visible y borrado total opcional
- ✅ **CSP y headers de seguridad** (HSTS, X-Frame-Options, Referrer-Policy, COOP) en Vercel y self-host
- ✅ **KDF versionado** para migraciones futuras sin romper datos existentes

### 🔬 Biomecánica
- ✅ **Base de datos de ejercicios** con anatomía, errores frecuentes, progresiones/regresiones y variaciones
- ✅ **Visualizador de anatomía** y detalle por ejercicio

### 🥗 Nutrición
- ✅ **Objetivos por meta** (Volumen Magro, Bulk, Mantenimiento, Déficit, Keto) con seguimiento de macros
- ✅ **Keto cetogénica**: carbos como **tope a no superar** (no como meta), con aviso cuando te excedés del presupuesto de 25g
- ✅ **Ajustes automáticos por pasos** (Health Connect): reglas deterministas que ajustan calorías/proteína sin IA
- ✅ **Plan de comidas** con horario normal o nocturno, platos rápidos por momento y guía de suplementos basada en evidencia
- ✅ **Water tracker** y distribución calórica

### 🏆 Reto 21 Días
- ✅ **15.000 pasos/día × 21 días consecutivos** — si fallás un día, se reinicia a 0
- ✅ **Sistema de rangos estilo LoL** con emblemas oficiales (Bronce → Oro → Master → Challenger)
- ✅ **Pasos en tiempo real desde Health Connect**, barra de progreso, racha y calendario
- ✅ **Persistencia** del estado del reto (no se pierde al cerrar)

### 📱 Plataforma
- ✅ **PWA instalable** con service worker y **precache total offline** (25 assets / 2.9 MB precacheados, resto on-demand)
- ✅ **Home renovada (Today Hub)**: próxima sesión, última sesión, reto, agua y accesos rápidos en una vista
- ✅ **Historial de largo plazo** sobre IndexedDB (vuelca a localStorage según cuota) + mirror cifrado opcional
- ✅ **APK Android** con Capacitor
- ✅ **Health Connect** (pasos y calorías en dispositivo nativo)
- ✅ **Dark theme** optimizado para AMOLED + mobile-first
- ✅ **Accesibilidad**: diálogos ARIA, FocusTrap, fuentes legibles
- ✅ **CI/CD** con GitHub Actions: ESLint + TypeScript + 247 tests (Vitest) en cada push

---

## 🏗️ Arquitectura

```
src/
├── components/
│   ├── workout/        # WorkoutHub, TodayHub, LiveWorkoutLogger, PlateCalculator, TempoMetronome, WarmupGenerator, SessionImport, WorkoutSummary
│   ├── exercises/      # ExerciseDetail, ExerciseLibrary, ExerciseAnalytics, AnimationPlayer
│   ├── programs/       # ProgramsExplorer, RoutineEditor, EquipmentAdapter
│   ├── analytics/      # ScienceDashboard (MEV/MAV/MRV, PRs), WeeklyReviewModal
│   ├── nutrition/      # NutritionVisionHub, StepsPanel, MealScheduler, WaterTracker
│   ├── challenge/      # ChallengeHub (Reto 21 Días + rangos LoL)
│   ├── health/         # HealthSyncEngine
│   └── PinLockScreen, VaultLockScreen, FocusTrap, SettingsModal, OnboardingIntro
├── context/            # WorkoutContext (estado global + store), useRestTimer
├── data/               # exercisesData, programsData, nutritionData, metrics
├── utils/              # scienceCalculators, doubleProgression, deloadDetection, mesocycle,
│                       # plateauDetection, progressionEngine, dup, velocity (VBT proxy),
│                       # equipmentAdapter, userProfile, weeklyReview, goalEngine,
│                       # starterLoads, stepsRules, healthConnect, vault, pinLock,
│                       # backupService, indexedDb, longTermHistory, storage, encryption
├── types.ts
├── App.tsx             # Root con lazy loading
└── main.tsx            # Entry con ErrorBoundary + PWA
```

> **Persistencia:** localStorage para estado frecuente + **IndexedDB** para historial de largo plazo; todo cifrable con **Vault** (AES-GCM).

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
| `npm run build` | Build de producción (Vite + sw-precache + verify-manifest) |
| `npm run build:capacitor` | Build + server para Android |
| `npm run start` | Ejecutar el servidor de producción (self-host) |
| `npm run preview` | Previsualizar el build localmente |
| `npm run test` | Suite de tests (Vitest, 247 tests) |
| `npm run lint` | ESLint + TypeScript (misma validación que CI) |
| `npm run lint:eslint` | Solo ESLint |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm run clean` | Limpiar artefactos del build |

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
