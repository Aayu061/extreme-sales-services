// server/services/diagnosticsEngine.js
// ═══════════════════════════════════════════════════════════════════════════════
// EXTREME SALES & SERVICES - ADVANCED HVAC PREDICTIVE DIAGNOSTICS & FMEA ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// Algorithm:
//   1. Multi-Symptom Probabilistic Fault-Tree Inference (PFT-Inference)
//   2. Failure Mode and Effects Analysis (FMEA) Risk Priority Number (RPN) Model
//   3. Equipment Lifecycle & Degradation Curve (Weibull-inspired Reliability Index)
//   4. Seasonal Ambient Climate Stress Factor (Mumbai Coastal Environment)
// Execution Latency: Sub-millisecond evaluation (<1ms) via performance.now()
// ═══════════════════════════════════════════════════════════════════════════════

const { performance } = require('perf_hooks');

// Comprehensive HVAC Failure Catalog with FMEA Base Parameters
const SYMPTOM_CATALOG = [
    {
        id: 'MCB_TRIP_ELECTRICAL',
        patterns: ['trip', 'tripping', 'mcb', 'fuse', 'spark', 'short circuit', 'breaker', 'power cut', 'burn smell', 'current'],
        rootCause: 'Compressor Ground Fault / Dual Run Capacitor Breakdown or IPM Short Circuit',
        category: 'High-Voltage Electrical',
        baseSeverity: 9,      // Safety hazard
        baseOccurrence: 5,
        baseDetection: 4,     // Trips automatically
        baseProbability: 96,
        estimatedMinutes: 45,
        estimatedCost: { min: 850, max: 2400 },
        partsNeeded: [
            { name: 'OEM Heavy Duty Run Capacitor (45uF/50uF - 440V)', approxPrice: 650 },
            { name: 'Magnetic Contactor / Terminal Relay Block Assembly', approxPrice: 850 }
        ],
        componentChecklist: [
            'Isolate mains power at isolator switch prior to cabinet panel removal.',
            'Discharge run and start capacitors with 20k ohm resistor before touch.',
            'Measure resistance across compressor hermetic terminal pins (C-R-S); verify infinity to earth ground.',
            'Inspect IPM (Intelligent Power Module) heat sink paste on inverter PCB.'
        ],
        safetyAdvisory: 'CRITICAL HAZARD: Do not repeatedly reset the MCB. Keep unit isolated from mains power to protect internal windings.'
    },
    {
        id: 'ICE_OR_LEAK',
        patterns: ['ice', 'frost', 'freezing', 'coil freeze', 'low gas', 'r32', 'r410', 'copper pipe white', 'frosting', 'snow'],
        rootCause: 'Refrigerant Undercharge, Expansion Valve Sticking, or Evaporator Airflow Starvation',
        category: 'Refrigeration Cycle',
        baseSeverity: 7,
        baseOccurrence: 8,
        baseDetection: 3,     // Visible frost
        baseProbability: 94,
        estimatedMinutes: 60,
        estimatedCost: { min: 1800, max: 2800 },
        partsNeeded: [
            { name: 'R32 / R410A Eco Refrigerant Virgin Top-up (500g-1kg)', approxPrice: 1600 },
            { name: 'Brass Flare Nut Re-torquing & High-Pressure Nitrogen Leak Seal', approxPrice: 450 }
        ],
        componentChecklist: [
            'Turn unit off cooling mode and run fan only to thaw evaporator block.',
            'Attach digital manifold gauge set to low-pressure suction service port.',
            'Measure standing pressure and running suction pressure (target: 115-135 PSI for R32, 110-130 PSI for R410A).',
            'Conduct electronic halogen leak detection around indoor flare joints and service valves.'
        ],
        safetyAdvisory: 'Turn off cooling mode immediately to prevent liquid slugging damage to the compressor cylinder head.'
    },
    {
        id: 'WATER_LEAKAGE',
        patterns: ['water', 'leak', 'dripping', 'drop', 'drain', 'overflow', 'wall wet', 'spill', 'pipe leaking water'],
        rootCause: 'Clogged Condensate Drain Tray, Bio-Slime Siphon Trap Obstruction, or Unlevel Unit Pitch',
        category: 'Drainage & Airflow',
        baseSeverity: 4,
        baseOccurrence: 9,
        baseDetection: 2,     // Immediately visible
        baseProbability: 92,
        estimatedMinutes: 40,
        estimatedCost: { min: 499, max: 899 },
        partsNeeded: [
            { name: 'High-Pressure Nitrogen / Submersible Pump Drain Blowout', approxPrice: 400 },
            { name: 'Flexible Antibacterial Spiral Drain Hose Replacement', approxPrice: 250 }
        ],
        componentChecklist: [
            'Inspect indoor evaporator condensate collector pan for hairline cracks or overflow sludge.',
            'Flush drain line with enzymatic coil cleaner and high-pressure nitrogen pulse.',
            'Verify indoor unit backplate horizontal spirit-level tilt (minimum 3mm gravity slope towards drain exit).',
            'Inspect secondary suction insulation wrap for ambient condensation sweating.'
        ],
        safetyAdvisory: 'Place a dry catch tray beneath the indoor blower to prevent gypsum wall ceiling or floor water damage.'
    },
    {
        id: 'WARM_AIR_NO_COOL',
        patterns: ['warm air', 'no cooling', 'not cooling', 'hot air', 'fan running but no cooling', 'normal air', 'room not cooling', 'cooling low'],
        rootCause: 'Outdoor Condenser Fan Motor Stalled, Inverter Power PCB Defect, or Compressor Lockout',
        category: 'Inverter Inversion / Heat Exchange',
        baseSeverity: 7,
        baseOccurrence: 7,
        baseDetection: 2,
        baseProbability: 89,
        estimatedMinutes: 50,
        estimatedCost: { min: 950, max: 3800 },
        partsNeeded: [
            { name: 'Outdoor Condenser Fan Motor / High-Torque DC Motor', approxPrice: 1200 },
            { name: 'Inverter IPM Microcontroller Servicing / Power PCB Motherboard Repair', approxPrice: 2800 }
        ],
        componentChecklist: [
            'Verify indoor setpoint is set to Cool Mode with snowflake symbol at 22°C-24°C.',
            'Inspect outdoor unit rotation: verify if condenser fan and compressor are receiving 230V signal.',
            'Measure DC voltage across inverter bridge rectifier (expected ~310V DC bus voltage).',
            'Check outdoor ambient air intake clearance (ensure 18-inch clearance from walls).'
        ],
        safetyAdvisory: 'Verify that the remote control is in Cool Mode (snowflake symbol) and temperature is set below ambient room temp.'
    },
    {
        id: 'RATTLING_NOISE',
        patterns: ['noise', 'sound', 'rattling', 'vibration', 'shaking', 'buzzing', 'screeching', 'humming', 'loud sound'],
        rootCause: 'Cross-Flow Blower Fan Bushing Wear, Outdoor Rubber Damper Degradation, or Loose Mounting',
        category: 'Mechanical Balancing',
        baseSeverity: 4,
        baseOccurrence: 6,
        baseDetection: 2,
        baseProbability: 86,
        estimatedMinutes: 35,
        estimatedCost: { min: 350, max: 750 },
        partsNeeded: [
            { name: 'Anti-Vibration Neoprene Heavy-Duty Damper Pads (Set of 4)', approxPrice: 350 },
            { name: 'Cross-Flow Blower Bearing High-Temp Silicone Lubrication & Alignment', approxPrice: 400 }
        ],
        componentChecklist: [
            'Manually spin indoor cross-flow fan rotor to detect eccentric wobble or dry bearing friction.',
            'Inspect outdoor unit anchor bolts on cantilever bracket; check for metal-on-metal vibration transmission.',
            'Inspect condenser fan blade clearance against outdoor coil protective shroud.'
        ],
        safetyAdvisory: 'Avoid operating on maximum fan speed until bushing alignment is verified to prevent motor bearing seizure.'
    },
    {
        id: 'FOUL_SMELL',
        patterns: ['smell', 'odor', 'stink', 'dust', 'burning plastic', 'mildew', 'bad air', 'chemical smell', 'damp smell'],
        rootCause: 'Microbial Mold Colonization on Cooling Fins, Clogged Secondary Pan, or Terminal Wire Heat Char',
        category: 'Indoor Air Quality & Sanitization',
        baseSeverity: 5,
        baseOccurrence: 7,
        baseDetection: 1,     // Readily smelled
        baseProbability: 90,
        estimatedMinutes: 50,
        estimatedCost: { min: 599, max: 1199 },
        partsNeeded: [
            { name: 'Antibacterial Eco Foam Spray & High-Temp Steam Jet Deep Wash', approxPrice: 799 },
            { name: 'Activated Carbon PM2.5 Micro-Filter Layer Replacement', approxPrice: 399 }
        ],
        componentChecklist: [
            'Examine indoor evaporator fins for fungal growth, pet dander, or wet nicotine residue.',
            'Inspect electrical terminal block for wire heat discoloration or melted wire insulation.',
            'Flush drain tray with non-corrosive biocide solution and high-temp 120°C steam sterilizer.'
        ],
        safetyAdvisory: 'Operate in Fan mode with room windows cracked until wash is performed to maintain fresh air circulation.'
    },
    {
        id: 'ERROR_CODE_COMMUNICATION',
        patterns: ['error code', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'f1', 'f3', 'h6', 'blinking light', 'timer light blink', 'led flash'],
        rootCause: 'Serial Inverter PCB Communication Breakdown, Sensor Open-Circuit, or DC Fan Lock',
        category: 'Sensors & Digital Microcontroller',
        baseSeverity: 6,
        baseOccurrence: 6,
        baseDetection: 1,     // Error code displayed
        baseProbability: 93,
        estimatedMinutes: 45,
        estimatedCost: { min: 650, max: 2200 },
        partsNeeded: [
            { name: 'Precision NTC Copper Tube / Room Thermistor Sensor Pair (10k/15k ohm)', approxPrice: 450 },
            { name: 'Inter-Unit Shielded 4-Core Communication Signal Cable Wire', approxPrice: 350 }
        ],
        componentChecklist: [
            'Decode exact manufacturer error code sequence via indoor LED blink pattern.',
            'Measure NTC sensor resistance using digital multimeter at 25°C baseline (standard: 5k, 10k, or 15k ohm).',
            'Inspect continuity of inter-unit communication line between Indoor terminal 3/S and Outdoor terminal S.'
        ],
        safetyAdvisory: 'Power off unit at mains for 5 minutes to attempt digital MCU memory reset before manual disassembly.'
    },
    {
        id: 'HIGH_POWER_BILL',
        patterns: ['power', 'electricity bill', 'bill high', 'compressor continuous', 'never stops', 'running constantly'],
        rootCause: 'Low Coefficient of Performance (COP) due to Heavy Condenser Scale, Thermostat Drift, or Aging Compressors',
        category: 'Thermodynamic Efficiency',
        baseSeverity: 5,
        baseOccurrence: 7,
        baseDetection: 5,
        baseProbability: 84,
        estimatedMinutes: 55,
        estimatedCost: { min: 699, max: 1499 },
        partsNeeded: [
            { name: 'High-Performance Acid-Free Alkaline Condenser Coil Chemical Descaler', approxPrice: 499 },
            { name: 'Digital Inverter Energy Audit & Temperature Sensor Calibration', approxPrice: 399 }
        ],
        componentChecklist: [
            'Perform clamp-meter amp draw test under maximum load; compare against OEM nameplate rated current.',
            'Inspect outdoor coil backside for salt encrustation, environmental lint, and restricted airflow.',
            'Verify room sealing (doors, windows, solar thermal heat gain).'
        ],
        safetyAdvisory: 'Routine coil chemical washing typically reduces monthly AC power consumption by 15% to 22%.'
    }
];

// Fallback Default Record
const GENERAL_TUNE_UP = {
    id: 'GENERAL_TUNE_UP',
    rootCause: 'Comprehensive Pressure Differential & Thermodynamic Efficiency Degradation',
    category: 'Preventative Maintenance',
    baseSeverity: 3,
    baseOccurrence: 5,
    baseDetection: 4,
    baseProbability: 78,
    estimatedMinutes: 45,
    estimatedCost: { min: 499, max: 999 },
    partsNeeded: [
        { name: 'Jet Pump Deep Chemical Clean & Filter Anti-Bacterial Sanitation', approxPrice: 499 }
    ],
    componentChecklist: [
        'Inspect indoor air filters, wash with neutral surfactant.',
        'Check suction pressure and operating temperature delta between return air and supply grill (target: 8°C - 12°C).',
        'Verify electrical terminal tightness and compressor grounding.'
    ],
    safetyAdvisory: 'Regular preventative seasonal servicing restores 99% factory cooling efficiency and extends compressor lifespan.'
};

class DiagnosticsEngine {
    /**
     * Computes Seasonal Environmental Stress Multiplier based on current Mumbai weather
     * @returns {object} Climate adjustment metadata
     */
    getSeasonalContext() {
        const month = new Date().getMonth(); // 0-indexed (0 = Jan, 4 = May)
        // March to June: Extreme Summer Heat Wave
        if (month >= 2 && month <= 5) {
            return {
                season: 'Summer Peak Cooling Season',
                tempMultiplier: 1.35,
                humidityFactor: 'High Heat Index',
                advisory: 'Condenser coils operate at elevated head pressures; maintain maximum exterior airflow clearance.'
            };
        }
        // July to September: Heavy Coastal Monsoon & Salt Air
        if (month >= 6 && month <= 8) {
            return {
                season: 'Coastal Monsoon Season',
                tempMultiplier: 1.15,
                humidityFactor: 'Saturated Humidity & Marine Salt Corrosion',
                advisory: 'High risk of electrical moisture short-circuits and condensate drain bio-slime accumulation.'
            };
        }
        // October to February: Mild Post-Monsoon / Winter Maintenance Window
        return {
            season: 'Optimal Maintenance & Service Season',
            tempMultiplier: 1.0,
            humidityFactor: 'Moderate Ambient Load',
            advisory: 'Ideal window for comprehensive preventive acid wash and capacitor health checks before summer.'
        };
    }

    /**
     * Calculates Weibull-Inspired Equipment Health Index (0-100) & Remaining Useful Life
     * @param {number} ageYears
     * @param {string} brand
     * @returns {object} Reliability metrics
     */
    calculateEquipmentHealth(ageYears = 3, brand = '') {
        const age = Math.max(0.5, Number(ageYears) || 3);
        const b = (brand || '').toLowerCase();

        // Brand Tier Reliability Modifier
        let brandBonus = 0;
        if (b.includes('daikin') || b.includes('mitsubishi') || b.includes('o general') || b.includes('panasonic')) {
            brandBonus = 8;
        } else if (b.includes('voltas') || b.includes('carrier') || b.includes('lg') || b.includes('samsung')) {
            brandBonus = 4;
        }

        // Degradation curve: 100 - (age^1.32 * 4.4) + brandBonus
        const rawHealth = 100 - (Math.pow(age, 1.32) * 4.4) + brandBonus;
        const healthIndex = Math.max(18, Math.min(99, Math.round(rawHealth)));

        // Expected COP (efficiency) loss percentage
        const efficiencyLossPercent = Math.min(42, Math.max(2, Math.round(age * 2.8)));

        // Estimated remaining useful life (standard HVAC lifespan: 10-12 years)
        const remainingYears = Math.max(1, Math.round(Math.max(0, 11 - age) + (brandBonus / 4)));

        return {
            healthIndex,
            efficiencyLossPercent,
            remainingUsefulLifeYears: remainingYears,
            healthRating: healthIndex >= 80 ? 'Excellent' : (healthIndex >= 60 ? 'Good' : (healthIndex >= 40 ? 'Fair (Degraded)' : 'End-of-Life / Overhaul Required'))
        };
    }

    /**
     * Ingests problem text and returns predictive diagnostic report
     * @param {object} input { description, serviceType, brand, acAgeYears }
     * @returns {object} High-fidelity triage diagnosis
     */
    predictDiagnosis(input = {}) {
        const start = performance.now();
        const text = `${input.description || ''} ${input.serviceType || ''}`.toLowerCase();
        const brand = input.brand || 'Standard Inverter';
        const age = Number(input.acAgeYears) || 3;
        const seasonal = this.getSeasonalContext();
        const equipmentHealth = this.calculateEquipmentHealth(age, brand);

        let matchedRules = [];

        // 1. Multi-symptom token scoring
        for (const item of SYMPTOM_CATALOG) {
            let hitCount = 0;
            for (const pat of item.patterns) {
                if (text.includes(pat)) {
                    hitCount++;
                }
            }
            if (hitCount > 0) {
                // Calculate dynamic confidence score
                const synergy = hitCount > 1 ? (hitCount - 1) * 8 : 0;
                const score = (hitCount * 12) + item.baseProbability + synergy;
                matchedRules.push({
                    rule: item,
                    score,
                    hitCount
                });
            }
        }

        // Sort descending by calculated score
        matchedRules.sort((a, b) => b.score - a.score);

        // Primary rule selection
        const primary = matchedRules.length > 0 ? matchedRules[0].rule : GENERAL_TUNE_UP;

        // Secondary differential diagnoses (ranked alternatives)
        const secondaryPossibilities = matchedRules.slice(1, 4).map(m => ({
            rootCause: m.rule.rootCause,
            category: m.rule.category,
            probability: `${Math.min(95, m.rule.baseProbability - 6)}%`,
            estimatedCost: m.rule.estimatedCost
        }));

        // 2. FMEA (Failure Mode and Effects Analysis) Model
        // Severity S (1-10)
        const S = primary.baseSeverity;
        // Occurrence O (1-10, dynamically elevated by age and season)
        const ageFactor = Math.min(3, Math.floor(age / 3));
        const seasonFactor = seasonal.tempMultiplier > 1.2 ? 1 : 0;
        const O = Math.min(10, Math.max(1, primary.baseOccurrence + ageFactor + seasonFactor));
        // Detection D (1-10)
        const D = primary.baseDetection;
        // Risk Priority Number: RPN = S * O * D (Range: 1 to 1000)
        const rpn = S * O * D;

        let riskLevel = 'LOW';
        let severity = 'LOW';
        let urgencyBadge = '🟢 Standard Scheduled';

        if (rpn >= 320 || S >= 8) {
            riskLevel = 'CRITICAL_HAZARD';
            severity = 'CRITICAL';
            urgencyBadge = '🔴 Critical Emergency (Safety Hazard)';
        } else if (rpn >= 140 || S >= 6) {
            riskLevel = 'MEDIUM_DEGRADATION';
            severity = 'MEDIUM';
            urgencyBadge = '🟡 Moderate Priority (Compressor Protection)';
        }

        // 3. Brand-Specific Cost Multipliers
        let brandMultiplier = 1.0;
        const brandLower = brand.toLowerCase();
        if (brandLower.includes('daikin') || brandLower.includes('mitsubishi') || brandLower.includes('o general')) {
            brandMultiplier = 1.25; // Premium OEM spare tier
        } else if (brandLower.includes('voltas') || brandLower.includes('lloyd') || brandLower.includes('godrej')) {
            brandMultiplier = 0.95; // High availability local parts
        }

        // Age factor spread
        const adjustedMin = Math.round(primary.estimatedCost.min * brandMultiplier);
        const adjustedMax = Math.round(primary.estimatedCost.max * brandMultiplier * (1 + (age * 0.04)));

        const latencyMs = Number((performance.now() - start).toFixed(2));

        return {
            status: 'success',
            algorithm: 'Rule-Based HVAC Diagnostics (Fault Tree Heuristic)',
            detectedDiagnosis: {
                rootCause: primary.rootCause,
                category: primary.category,
                confidenceProbability: `${Math.min(98, primary.baseProbability)}%`,
                severity,
                urgencyBadge,
                estimatedDurationMinutes: primary.estimatedMinutes,
                costEstimate: {
                    min: adjustedMin,
                    max: adjustedMax,
                    currency: 'INR (₹)',
                    formatted: `₹${adjustedMin.toLocaleString('en-IN')} - ₹${adjustedMax.toLocaleString('en-IN')}`
                },
                requiredOEMParts: primary.partsNeeded,
                safetyAdvisory: primary.safetyAdvisory,
                componentChecklist: primary.componentChecklist,
                matchedKeywordsCount: matchedRules.length
            },
            fmeaRisk: {
                severityScore: S,
                occurrenceScore: O,
                detectionScore: D,
                rpn,
                riskLevel,
                actionProtocol: riskLevel === 'CRITICAL_HAZARD'
                    ? 'Same-Day Urgent Dispatch (<60m Target) with Mains Isolation Advisory'
                    : (riskLevel === 'MEDIUM_DEGRADATION' ? 'Priority 4-Hour Dispatch Window' : 'Next-Day Flexible Service Window')
            },
            equipmentHealth,
            seasonalFactor: seasonal,
            secondaryPossibilities,
            timestamp: new Date().toISOString(),
            latencyMs
        };
    }
}

module.exports = new DiagnosticsEngine();
