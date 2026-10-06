// test/algorithms.test.js
// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHMIC VALIDATION SUITE: DIAGNOSTICS, DISPATCH & PRICING ENGINES
// ═══════════════════════════════════════════════════════════════════════════════

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const diagnosticsEngine = require('../server/services/diagnosticsEngine');
const dispatchEngine = require('../server/services/dispatchEngine');
const pricingEngine = require('../server/services/pricingEngine');

describe('ALGORITHM 1: FMEA Predictive Diagnostics & Equipment Reliability', () => {
    test('Correctly computes FMEA RPN and classifies electrical hazard as CRITICAL', () => {
        const report = diagnosticsEngine.predictDiagnosis({
            description: 'AC MCB tripping and spark near compressor terminal',
            serviceType: 'AC Repair',
            brand: 'Daikin',
            acAgeYears: 5
        });

        assert.equal(report.status, 'success');
        assert.ok(report.fmeaRisk);
        assert.ok(report.fmeaRisk.rpn >= 200, 'RPN for electrical short must be high risk');
        assert.equal(report.detectedDiagnosis.severity, 'CRITICAL');
        assert.ok(report.detectedDiagnosis.safetyAdvisory.includes('HAZARD'));
        assert.ok(Array.isArray(report.detectedDiagnosis.componentChecklist));
        assert.ok(report.detectedDiagnosis.componentChecklist.length > 0);
    });

    test('Computes equipment health index and remaining useful life', () => {
        const youngAc = diagnosticsEngine.calculateEquipmentHealth(1, 'Daikin');
        const oldAc = diagnosticsEngine.calculateEquipmentHealth(8, 'Voltas');

        assert.ok(youngAc.healthIndex > oldAc.healthIndex);
        assert.ok(youngAc.remainingUsefulLifeYears > oldAc.remainingUsefulLifeYears);
        assert.ok(oldAc.efficiencyLossPercent > youngAc.efficiencyLossPercent);
    });

    test('Identifies Mumbai seasonal environmental context', () => {
        const season = diagnosticsEngine.getSeasonalContext();
        assert.ok(season.season);
        assert.ok(season.tempMultiplier >= 1.0);
        assert.ok(season.advisory);
    });
});

describe('ALGORITHM 2: Fleet Dispatch Optimization & Geodesic Distance', () => {
    test('Calculates Haversine distance with urban street grid factor', () => {
        // Distance between Colaba (South Mumbai) and Bandra (Western Suburbs) ~ 20-25 km
        const dist = dispatchEngine.haversineKm(18.9388, 72.8354, 19.1136, 72.8697);
        assert.ok(dist >= 18 && dist <= 32, `Calculated distance ${dist}km should be within realistic MMR range`);
    });

    test('Emergency priority ticket boosts proximity weight for fastest responder', () => {
        const technicians = [
            { id: 'tech-near', name: 'Near Tech', zone: 'WESTERN_SUBURBS', active_jobs: 1, rating: 4.8, skills: ['AC Repair'] },
            { id: 'tech-far', name: 'Far Tech', zone: 'SOUTH_MUMBAI', active_jobs: 0, rating: 5.0, skills: ['AC Repair'] }
        ];

        const normalReq = {
            address: 'Andheri West',
            service_type: 'AC Repair',
            issue_description: 'General slow cooling'
        };

        const urgentReq = {
            address: 'Andheri West',
            service_type: 'AC Repair',
            issue_description: 'Emergency electrical burning spark MCB tripping',
            priority: 'HIGH'
        };

        const normalDispatch = dispatchEngine.findOptimalTechnician(normalReq, technicians);
        const urgentDispatch = dispatchEngine.findOptimalTechnician(urgentReq, technicians);

        assert.ok(normalDispatch.optimalTechnician);
        assert.ok(urgentDispatch.optimalTechnician);
        // On urgent request, proximity to Andheri (Western Suburbs) strongly favors tech-near
        assert.equal(urgentDispatch.optimalTechnician.technicianId, 'tech-near');
    });
});

describe('ALGORITHM 3: Dynamic Pricing & Thermodynamic AMC ROI', () => {
    test('Calculates multi-attribute quote with high-rise elevation safety surcharge', () => {
        const groundFloorQuote = pricingEngine.calculateQuote({
            serviceKey: 'gas_refill',
            unitType: 'split',
            tonnage: '1.5',
            floorLevel: 1
        });

        const highRiseQuote = pricingEngine.calculateQuote({
            serviceKey: 'gas_refill',
            unitType: 'split',
            tonnage: '1.5',
            floorLevel: 14,
            hasHighRiseHazard: true
        });

        assert.ok(groundFloorQuote.success);
        assert.ok(highRiseQuote.success);
        assert.ok(highRiseQuote.breakdown.totalAmount > groundFloorQuote.breakdown.totalAmount);
        assert.ok(highRiseQuote.breakdown.elevationSafetyCharge > 0);
    });

    test('AMC Lifecycle ROI models energy savings and cost benefit', () => {
        const roi = pricingEngine.calculateAmcRoi(2, 10, 'comfort');
        assert.ok(roi.success);
        assert.ok(roi.annualBreakdown.netAnnualSavings > 0);
        assert.ok(roi.environmentalImpact.kwhSavedPerYear > 0);
        assert.ok(roi.environmentalImpact.co2ReductionKg > 0);
    });
});
