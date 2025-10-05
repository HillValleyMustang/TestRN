# React.js to React Native Migration Roadmap

## 🎯 Overview
Complete feature parity migration from Next.js web app to React Native mobile app. This document tracks all features, their status, and implementation priorities.

---

## ✅ Completed Features (60% Parity)

### Core Infrastructure
- ✅ **Authentication** - Supabase email/password auth with session persistence
- ✅ **Offline-First Sync** - SQLite + automatic Supabase sync queue
- ✅ **Data Context** - React Context API for state management
- ✅ **Form Validation** - React Hook Form + Zod schemas

### Workout Features
- ✅ **Workout Logging** - Multi-exercise tracking with sets/reps/weight
- ✅ **PR Detection** - Automatic personal record detection & celebration
- ✅ **Rest Timer** - Countdown timer between sets
- ✅ **Workout Templates** - Save/load workout configurations
- ✅ **T-Paths System** - Database schema for workout programs

### Equipment & Gym Management
- ✅ **Equipment System** - 32 equipment types across 8 categories
- ✅ **Gym CRUD** - Create, read, update, delete gym profiles
- ✅ **Active Gym Selection** - Set one gym as active
- ✅ **Equipment-Aware Filtering** - Exercise picker filters by gym equipment

### AI Integration
- ✅ **AI Coaching** - Real-time motivation & form tips during workouts
- ⚠️ **AI Program Generation** - Generic workout generation (NOT PPL/ULUL specific)

### Progress & Analytics
- ✅ **Dashboard** - Key metrics, workout frequency, volume tracking
- ✅ **Body Measurements** - Weight, body fat %, measurements with history
- ✅ **Goals System** - 5 goal types with progress tracking
- ✅ **Achievements** - 21 predefined achievements with auto-unlock
- ✅ **Charts** - Recharts integration for PR progression, volume trends

### User Preferences
- ✅ **Unit System** - Metric/Imperial toggle
- ✅ **Theme** - Dark/light mode preference

---

## ❌ Missing Critical Features (40% Gap)

### 🔴 PHASE 14: PPL/ULUL Split System (CRITICAL - CORE DIFFERENTIATOR)
**Status**: In Progress  
**Priority**: 🔴 HIGHEST  
**Estimated Effort**: 2-3 days

**What the Web App Does**:
- Users select PPL (3-day) or ULUL (4-day) split during onboarding Step 2
- Edge Function generates workouts based on split type:
  - **PPL**: Push (chest/shoulders/triceps), Pull (back/biceps), Legs
  - **ULUL**: Upper Body A/B, Lower Body A/B
- Workout session screen shows colored workout buttons (Green=Push, Orange=Pull, Purple=Legs)
- Exercise grouping respects movement patterns (Push/Pull/Legs) or muscle groups (Upper/Lower)

**Implementation Tasks**:
1. Split selection UI component
2. PPL workout structure logic
3. ULUL workout structure logic  
4. Update AI generator to respect split type
5. Workout session screen with split-specific UI
6. Color-coded workout buttons matching web app design
7. Integration with existing T-Paths system

---

### 🔴 PHASE 15: Photo Upload + AI Exercise Detection (CRITICAL - UNIQUE DIFFERENTIATOR)
**Status**: Not Started  
**Priority**: 🔴 HIGHEST  
**Estimated Effort**: 3-4 days

**What We Need to Build**:
1. Camera/photo picker UI for React Native
2. Multiple image upload support
3. Call existing `/api/identify-equipment` endpoint
4. Exercise confirmation/review screen
5. Save identified exercises to SQLite + Supabase
6. Tag exercises to gym profile

---

### 🟠 PHASE 16: Complete 5-Step Onboarding Flow (HIGH PRIORITY)
**Status**: Not Started  
**Priority**: 🟠 HIGH  
**Estimated Effort**: 2-3 days

**5 Steps**:
1. Personal info (name, height, weight, body fat %)
2. Training setup (PPL/ULUL selection + experience level)
3. Goals & session preferences
4. Gym setup & consent
5. Gym photo upload (if selected)

---

### 🟡 PHASE 17: Media Library (MEDIUM PRIORITY)
**Status**: Not Started  
**Priority**: 🟡 MEDIUM  
**Estimated Effort**: 2-3 days

---

### 🟡 PHASE 18: Progress Photos (MEDIUM PRIORITY)
**Status**: Not Started  
**Priority**: 🟡 MEDIUM  
**Estimated Effort**: 1-2 days

---

### 🟢 PHASE 19: Additional UI/UX Enhancements (LOW PRIORITY)
**Status**: Not Started  
**Priority**: 🟢 LOW  
**Estimated Effort**: 1-2 days

---

## 📋 Implementation Order

### **Immediate Priority** (Next 1-2 weeks)
1. ✅ **PHASE 14**: PPL/ULUL Split System (2-3 days)
2. **PHASE 15**: Photo Upload + AI Detection (3-4 days)
3. **PHASE 16**: Complete Onboarding Flow (2-3 days)

### **Secondary Priority** (Next 2-3 weeks)
4. **PHASE 17**: Media Library (2-3 days)
5. **PHASE 18**: Progress Photos (1-2 days)
6. **PHASE 19**: UI/UX Polish (1-2 days)

### **Total Estimated Time to Full Parity**: ~12-18 days

---

*Last Updated: January 2025*
*Migration Progress: 60% → Target: 100%*
