# DESIGN SYSTEM & UI/UX SPECIFICATION (Design.md)
## Extreme Sales & Services (ESS) — Visual Design Language
**Design Theme**: Precision Engineering, Modern Glassmorphism & High-Performance HVAC  
**Target Display**: 4K Presentation Screens, Desktop Monitors, Tablets, and Mobile Devices  

---

## 1. Color Palette & Semantic Tokens

### 1.1 Brand Color Palette
```css
/* Core Brand & Accents */
--brand-primary:      #2563eb; /* Electric Blue - CTAs, primary buttons, highlights */
--brand-primary-dark: #1d4ed8; /* Deep Blue - Hover states */
--brand-cyan-frost:   #06b6d4; /* Cyan Frost - Airflow particles, cooling indicators */
--brand-cool-ice:     #38bdf8; /* Sky Ice - 3D AC glow & active temperature dials */

/* Enterprise Neutrals & Surface */
--surface-dark:       #0f172a; /* Slate 900 - Navigation, hero headers, terminal contrast */
--surface-dark-card:  #1e293b; /* Slate 800 - Elevated cards in dark sections */
--surface-light:      #f8fafc; /* Slate 50 - Main application canvas */
--surface-card:       #ffffff; /* Pure White - Main elevated cards */
--border-subtle:      #e2e8f0; /* Slate 200 - Borders, separators */

/* Status Indicators */
--status-pending:     #f59e0b; /* Amber - Pending tickets, pending AMC activations */
--status-assigned:    #8b5cf6; /* Violet - Technician assigned & in-transit */
--status-progress:    #3b82f6; /* Blue - Work actively in progress on-site */
--status-completed:   #10b981; /* Emerald - Completed jobs, verified customer delight */
```

---

## 2. Typography & Hierarchy

### 2.1 Font Families
- **Primary Interface**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Headings & Badges**: `'Outfit', 'Inter', sans-serif` (Extra bold, tracking-tight)
- **Telemetry & Codes (Request IDs, Serial Numbers)**: `'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace`

### 2.2 Typographic Hierarchy
| Role | Size | Weight | Tracking | Usage |
|---|---|---|---|---|
| **Display H1** | `48px – 64px` | 900 (Black) | `-0.03em` | Hero section main headers |
| **Section H2** | `28px – 36px` | 800 (Extra Bold) | `-0.02em` | Major section titles |
| **Card H3** | `18px – 22px` | 700 (Bold) | `-0.01em` | Service cards, product titles |
| **Body Text** | `14px – 16px` | 500 (Medium) | `normal` | Explanatory copy, terms |
| **Data Badges**| `11px – 12px` | 800 (Bold) | `+0.05em` | Status chips, AMC tags, role labels |
| **Code / IDs** | `13px – 15px` | 700 (Bold Mono) | `+0.05em` | `AC-1001`, `₹29,990`, phone numbers |

---

## 3. Glassmorphism & Depth System

```css
/* High-Impact Frosted Glass */
.glass-panel {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
}

/* Dark Frosted Glass (Hero & Navigation) */
.glass-panel-dark {
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* 3D Glow Button */
.btn-glow {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-glow:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -5px rgba(37, 99, 235, 0.6);
}
```

---

## 4. 3D Interactive AC Simulator Specifications

```mermaid
graph LR
    Sub1[Three.js Scene Canvas] --> Sub2[AC Unit 3D Mesh<br>Split Body, Louvers, LED Display]
    Sub2 --> Sub3[Dynamic Cooling Airflow Particles<br>Particle System with Velocity Vectors]
    Sub3 --> Sub4[Interactive Control Dial<br>Temp: 16°C - 28°C / Fan: 1 - 3 / Eco - Turbo]
    Sub4 --> Sub5[Ambient Light Temperature Shift<br>16°C = Frost Blue | 28°C = Warm Neutral]
```

### 4.1 Interactive Parameters
- **Canvas Height**: 440px with responsive container width.
- **Mouse / Touch Drag**: 360° horizontal rotation with damped inertia.
- **Cooling Airflow Physics**: Dynamic particles streaming out from the AC louvers downwards, moving faster when "Turbo" mode is active.
- **Temperature Dial**: Interactive slider from 16°C to 28°C:
  - 16°C: Ice Blue Glow (`#06b6d4`), High particle density.
  - 22°C: Optimal Comfort Cyan (`#3b82f6`), Balanced airflow.
  - 28°C: Warm Eco Ambient (`#f59e0b`), Low energy consumption.
- **Status LED Display**: Digital digital readout directly on the AC unit mesh simulating real digital inverter units.

---

## 5. Component Design Standards

1. **Digital Signature Pad**:
   - Canvas surface with smooth pen strokes (`lineWidth: 2.5`, `strokeStyle: '#1e293b'`).
   - Clean controls: Clear Canvas, Undo Stroke, and Confirm Signature.
2. **Spare Parts Selector**:
   - Clean checkbox toggle cards with part icon, name, part warranty, and transparent price.
   - Live invoice breakdown displaying Base Labor + Parts + 18% GST - AMC Discount = Net Total.
3. **Interactive Cost Estimator**:
   - 3-step pill selector (AC Style -> Tonnage -> Issue).
   - Dynamic counter showing estimated repair estimate and highlight badge: *"100% Free with Active AMC"*.
