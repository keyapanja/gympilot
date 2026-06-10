# GymPilot — Phase B: Design

Low-fidelity wireframes (ASCII), user flows, dashboard layouts, and mobile layouts.
Design language: clean, athletic, high-contrast. **Mobile-first.** Primary brand color
`emerald-600`, dark slate neutrals, generous spacing, rounded-2xl cards, subtle shadows.

Breakpoints: base (mobile) → `sm 640` → `md 768` → `lg 1024` → `xl 1280`.

---

## 1. User Flows

### 1.1 Gym Owner — acquisition → activation
```
Landing (/) ──▶ Pricing ──▶ Register ──▶ [create gym wizard]
   │                                          │
   │                                          ▼
   │                                   Owner Dashboard (empty state)
   │                                          │ "Add your first member"
   ▼                                          ▼
 Login ◀──────────────────────────── Add Member ──▶ invite email sent
                                              │
                                              ▼
                                    Member list grows · limit meter updates
```

### 1.2 Member — invite → onboarded → engaged
```
Invitation email ──▶ Set password ──▶ Onboarding wizard
                                          │ goal → experience → measurements
                                          ▼
                                   Generate initial plan (rule engine)
                                          ▼
                              Member Dashboard ──▶ Workout Plan ──▶ mark complete
                                          │                              │
                                          └──────────▶ Progress ◀────────┘
                                                       add weekly entry → charts
```

### 1.3 Workout generation (rule engine)
```
member_profile {goal, experience, gender, training_days}
        │
        ▼
matchTemplate()  ── exact (goal+exp+gender+days)
        │ fallback ladder:
        ├─ gender 'any'
        ├─ nearest training_days (±)
        └─ goal-family default
        ▼
materializePlan() ── copy template days/exercises → member_workout_plans (active)
        ▼
member sees plan
```

### 1.4 Subscription limit
```
Add Member ──▶ count(active) < member_limit ?
       ├─ yes ──▶ insert ok
       └─ no  ──▶ 409 MEMBER_LIMIT_EXCEEDED ──▶ "Upgrade plan" dialog
```

---

## 2. Wireframes — Public

### Home (mobile → desktop)
```
MOBILE                                DESKTOP (lg)
┌───────────────────┐    ┌──────────────────────────────────────────────┐
│ ☰  GymPilot   [→] │    │ GymPilot  Features Pricing Contact  [Login][▶]│
├───────────────────┤    ├──────────────────────────────────────────────┤
│  Personalized     │    │  Personalized workout guidance     ┌────────┐ │
│  workout guidance │    │  for every gym member.             │  hero  │ │
│  for every member │    │  [Start free] [See pricing]        │  image │ │
│  [Start free]     │    │                                    └────────┘ │
│  ┌─────────────┐  │    ├──────────────────────────────────────────────┤
│  │ hero image  │  │    │  ▣ Add members  ▣ Auto plans  ▣ Track progress│
│  └─────────────┘  │    ├──────────────────────────────────────────────┤
│  ▣ feature        │    │  [ Pricing cards ×4 ]                         │
│  ▣ feature        │    ├──────────────────────────────────────────────┤
│  [Pricing cards]  │    │  CTA banner  ·  Footer                        │
└───────────────────┘    └──────────────────────────────────────────────┘
```

### Pricing
```
┌──────────────────────────────────────────────────────────┐
│  Simple pricing that scales with your gym                 │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐             │
│ │STARTER │ │GROWTH  │ │  PRO   │ │ENTERPRISE│             │
│ │ 10 mem │ │ 30 mem │ │ 50 mem │ │ custom   │             │
│ │ $X/mo  │ │ $Y/mo  │ │ $Z/mo  │ │ contact  │             │
│ │[Choose]│ │[Choose]│ │[Choose]│ │ [Talk]   │             │
│ └────────┘ └────────┘ └────────┘ └──────────┘             │
└──────────────────────────────────────────────────────────┘
```

### Login / Register (AuthCard, centered, max-w-md)
```
┌─────────────────────────┐
│       GymPilot          │
│   Welcome back          │
│  Email   [___________]  │
│  Password[___________]  │
│  [   Sign in        ]   │
│  Forgot password?       │
│  ──────── or ────────   │
│  New gym? Create account│
└─────────────────────────┘
```

---

## 3. Dashboard Layouts

### Owner Dashboard (desktop)
```
┌──────────┬───────────────────────────────────────────────────────┐
│ SIDEBAR  │ Topbar: [Gym name]                        [avatar ▾]   │
│ ▣ Dash   ├───────────────────────────────────────────────────────┤
│ ▣ Members│  ┌Total──┐ ┌Active─┐ ┌Limit──┐ ┌Signups┐               │
│ ▣ Settings│  │  42   │ │  37   │ │37/50  │ │  +5   │               │
│          │  └───────┘ └───────┘ └───────┘ └───────┘               │
│          │  Member limit usage  [██████████░░░] 74%                │
│          │ ┌──Recent Members────────────┐ ┌──Recent Activity────┐ │
│          │ │ Name   Goal    Joined  ▸   │ │ Amy logged weight   │ │
│          │ │ ...                        │ │ Ben completed Day 1 │ │
│          │ └────────────────────────────┘ └─────────────────────┘ │
└──────────┴───────────────────────────────────────────────────────┘
```

### Owner — Members list
```
┌──────────────────────────────────────────────────────────┐
│  Members (37/50)         [search____]  [Filter ▾] [+ Add] │
├──────────────────────────────────────────────────────────┤
│  ☑ Name        Email           Goal       Status   ⋯      │
│    Amy Chen     amy@..          Fat Loss   Active   ⋯      │
│    Ben Ortiz    ben@..          Muscle     Invited  ⋯      │
│  ...                                                       │
│                                  ◀ 1 2 3 ▶                 │
└──────────────────────────────────────────────────────────┘
```

### Owner — Member detail (tabs)
```
┌──────────────────────────────────────────────────────────┐
│  ‹ Back   Amy Chen   [Edit] [Regenerate plan] [Remove]    │
│  [ Profile | Workout Plan | Progress ]                    │
│  Profile:  Goal: Fat Loss · Exp: Beginner · BMI 23.1      │
│            Age 29 · 165cm · 63kg · Days: Mon/Wed/Fri      │
│  Plan:     Day1 Upper · Day2 Rest · Day3 Lower ...        │
│  Progress: [weight chart] [measurement chart]             │
└──────────────────────────────────────────────────────────┘
```

### Member Dashboard
```
┌──────────────────────────────────────────────────────────┐
│ Hi Amy 👋   Goal: Fat Loss                                │
│ ┌Goal card─┐ ┌BMI 23.1 ─┐ ┌Completion─┐                  │
│ │ Fat Loss │ │ Normal   │ │ 8/12 done │                  │
│ └──────────┘ └──────────┘ └───────────┘                  │
│ This week's plan  ▸ Day 1 Upper Body  [View plan]         │
│ Progress snapshot [mini weight chart]   [Log progress]    │
└──────────────────────────────────────────────────────────┘
```

### Member — Workout Plan
```
┌──────────────────────────────────────────────────────────┐
│ My Plan · Fat Loss · 3 days/week                          │
│ ▼ Day 1 — Upper Body                                      │
│    □ Bench Press        4×8   rest 90s                    │
│    □ Incline DB Press   3×10  rest 75s                    │
│    ☑ Shoulder Press     3×10  rest 60s                    │
│ ▸ Day 2 — Rest                                            │
│ ▸ Day 3 — Back & Biceps                                   │
└──────────────────────────────────────────────────────────┘
```

### Member — Progress
```
┌──────────────────────────────────────────────────────────┐
│ Progress           [+ Log entry]                          │
│ ┌Weight (kg)──────────────┐ ┌Measurements (cm)──────────┐ │
│ │     ╲___                 │ │ waist ─╲   chest ──       │ │
│ │         ╲__              │ │ arms ──   hips ─╲         │ │
│ └─────────────────────────┘ └───────────────────────────┘ │
│ History table: date · weight · waist · chest · arms · hips│
└──────────────────────────────────────────────────────────┘
```

### Super Admin Dashboard
```
┌──────────────────────────────────────────────────────────┐
│ Platform overview                                         │
│ ┌Gyms─┐ ┌Members┐ ┌Active subs┐ ┌MRR (model)┐            │
│ │ 128 │ │ 3,401 │ │   119     │ │  $—       │            │
│ Gyms table · Subscriptions table · growth charts          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Mobile Layouts

- **Navigation:** sidebar collapses into a bottom tab bar (Dashboard · Plan · Progress · Profile)
  for members, and a hamburger Sheet for owners/admins.
- **Tables → cards:** every data table degrades to stacked cards below `md`.
- **Charts:** full-width, height-capped (≤ 240px), touch tooltips.
- **Forms:** single column, large 44px tap targets, sticky primary action button.
- **Onboarding wizard:** one step per screen with a top progress bar.

```
MEMBER MOBILE (bottom nav)
┌───────────────────┐
│ Hi Amy            │
│ [Goal] [BMI]      │
│ [Completion]      │
│ This week ▸       │
│ [mini chart]      │
├───────────────────┤
│ 🏠   🏋️   📈   👤 │  ← Dashboard / Plan / Progress / Profile
└───────────────────┘
```

---

### Phase B exit criteria ✅
Flows, wireframes, dashboard layouts, and mobile layouts defined for all roles.
Proceed to **Phase C — Development**.
