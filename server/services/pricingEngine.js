// server/services/pricingEngine.js
// ═══════════════════════════════════════════════════════════════════════════════
// EXTREME SALES & SERVICES - DYNAMIC PRICING & AMC LIFECYCLE ROI ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// Purpose:
//   1. Multi-attribute HVAC Dynamic Cost & Labor Estimation Algorithm
//   2. High-Rise Elevation & Accessibility Hazard Multiplier
//   3. 3-Year Thermodynamic Energy Savings & AMC Economic ROI Model
// ═══════════════════════════════════════════════════════════════════════════════

const { performance } = require('perf_hooks');

const SERVICE_BASE_RATES = {
    jet_wash: { name: 'Deep Jet-Pump Foam Wash & Sanitization', baseLabor: 499, baseParts: 200, durationMins: 45 },
    gas_refill: { name: 'Refrigerant Leak Test & Gas Refill (R32/R410A)', baseLabor: 650, baseParts: 1200, durationMins: 60 },
    cooling_repair: { name: 'Cooling Failure, Capacitor & Sensor Diagnosis', baseLabor: 550, baseParts: 600, durationMins: 45 },
    installation: { name: 'New AC Copper Piping & Bracket Installation', baseLabor: 950, baseParts: 500, durationMins: 90 },
    uninstallation: { name: 'Safe Gas Pump-down & Demounting', baseLabor: 650, baseParts: 0, durationMins: 45 },
    health_check: { name: 'Pre-Summer 24-Point Comprehensive Health Audit', baseLabor: 599, baseParts: 300, durationMins: 40 }
};

const UNIT_TYPE_MULTIPLIERS = {
    split: { label: 'Split Inverter AC', factor: 1.0 },
    window: { label: 'Window AC Unit', factor: 0.85 },
    cassette: { label: 'Commercial Cassette AC', factor: 1.45 },
    tower: { label: 'Commercial Floor Tower AC', factor: 1.55 }
};

const TONNAGE_MULTIPLIERS = {
    '1.0': 0.9,
    '1.5': 1.0,
    '2.0': 1.25,
    '2.5': 1.4,
    '3.0': 1.6
};

class PricingEngine {
    /**
     * Computes multi-attribute dynamic quote
     * @param {object} params { serviceKey, unitType, tonnage, floorLevel, hasHighRiseHazard }
     */
    calculateQuote(params = {}) {
        const start = performance.now();
        const serviceKey = params.serviceKey || 'jet_wash';
        const unitType = params.unitType || 'split';
        const tonnage = String(params.tonnage || '1.5');
        const floorLevel = Number(params.floorLevel) || 1;
        const hasHighRiseHazard = Boolean(params.hasHighRiseHazard || floorLevel > 4);

        const service = SERVICE_BASE_RATES[serviceKey] || SERVICE_BASE_RATES.jet_wash;
        const typeMulti = (UNIT_TYPE_MULTIPLIERS[unitType] && UNIT_TYPE_MULTIPLIERS[unitType].factor) || 1.0;
        const tonMulti = TONNAGE_MULTIPLIERS[tonnage] || 1.0;

        // Elevation / Exterior Bracket Access Hazard Factor
        let elevationPremium = 0;
        if (hasHighRiseHazard && (serviceKey === 'installation' || serviceKey === 'gas_refill' || serviceKey === 'cooling_repair')) {
            elevationPremium = floorLevel > 10 ? 350 : 200; // Safety harness and bracket rigging
        }

        const rawBase = Math.round((service.baseLabor + service.baseParts) * typeMulti * tonMulti) + elevationPremium;
        const gst = Math.round(rawBase * 0.18);
        const total = rawBase + gst;

        const amcAnnualSavingsEst = Math.round(total * 1.35);

        const latencyMs = Number((performance.now() - start).toFixed(2));

        return {
            success: true,
            serviceName: service.name,
            breakdown: {
                basePrice: rawBase,
                gstRatePercent: 18,
                gstAmount: gst,
                totalAmount: total,
                elevationSafetyCharge: elevationPremium,
                currency: 'INR (₹)',
                formatted: `₹${total.toLocaleString('en-IN')}`
            },
            specifications: {
                unitType: (UNIT_TYPE_MULTIPLIERS[unitType] && UNIT_TYPE_MULTIPLIERS[unitType].label) || unitType,
                tonnage: `${tonnage} Ton`,
                estimatedDuration: `${service.durationMins} minutes`,
                suggestedWarrantyDays: serviceKey === 'gas_refill' ? 90 : (serviceKey === 'installation' ? 180 : 30)
            },
            amcComparison: {
                singleServiceCost: total,
                annualCostWithAmc: 2499,
                projectedAnnualSavings: Math.max(800, (total * 2) - 2499)
            },
            latencyMs
        };
    }

    /**
     * Calculates 3-Year Thermodynamic Energy & Maintenance ROI for AMC Plans
     * @param {number} acCount
     * @param {number} avgDailyHours
     * @param {string} planTier
     */
    calculateAmcRoi(acCount = 1, avgDailyHours = 8, planTier = 'comfort') {
        const count = Math.max(1, Math.min(20, Number(acCount) || 1));
        const hours = Math.max(2, Math.min(24, Number(avgDailyHours) || 8));

        // Mumbai Electricity Tariff (Tata Power / Adani / BEST average: ₹9.50 per kWh)
        const tariffPerKWh = 9.5;

        // Average 1.5T 3-Star AC consumes ~1.4 kWh per hour of compressor operation
        // Unserviced scaled coils lose ~18% heat exchange efficiency, consuming ~0.25 kWh extra per hour
        const annualOperatingDays = 260; // Approximate active cooling days in Mumbai
        const extraKwhPerAcPerYear = Math.round(hours * 0.22 * annualOperatingDays);
        const wastedElectricityCostPerYear = Math.round(extraKwhPerAcPerYear * tariffPerKWh * count);

        // Average reactive repair cost without AMC per AC per year
        const avgAnnualReactiveRepairPerAc = 3200;
        const totalReactiveRepairCostPerYear = avgAnnualReactiveRepairPerAc * count;

        // Total cost without AMC per year
        const costWithoutAmcPerYear = wastedElectricityCostPerYear + totalReactiveRepairCostPerYear;

        // AMC Subscription Cost
        const planCostMap = {
            eco: 1499,
            comfort: 2499,
            elite: 3999
        };
        const unitAmcCost = planCostMap[planTier] || 2499;
        const totalAmcCost = unitAmcCost * count;

        const netSavingsPerYear = Math.max(0, costWithoutAmcPerYear - totalAmcCost);
        const roiPercent = Math.round((netSavingsPerYear / totalAmcCost) * 100);

        return {
            success: true,
            inputs: {
                acCount: count,
                avgDailyHours: hours,
                planTier
            },
            annualBreakdown: {
                costWithoutAmc: costWithoutAmcPerYear,
                wastedPowerBill: wastedElectricityCostPerYear,
                unplannedRepairCost: totalReactiveRepairCostPerYear,
                essAmcCost: totalAmcCost,
                netAnnualSavings: netSavingsPerYear,
                threeYearSavings: netSavingsPerYear * 3,
                roiPercentage: `${roiPercent}%`
            },
            environmentalImpact: {
                kwhSavedPerYear: extraKwhPerAcPerYear * count,
                co2ReductionKg: Math.round((extraKwhPerAcPerYear * count) * 0.82) // 0.82 kg CO2 per kWh grid emission
            }
        };
    }
}

module.exports = new PricingEngine();
