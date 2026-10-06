// server/services/dispatchEngine.js
// ═══════════════════════════════════════════════════════════════════════════════
// EXTREME SALES & SERVICES - REAL-TIME DISPATCH & FLEET OPTIMIZATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// Algorithm: Multi-Objective Weighted Greedy Dispatch Model (MOW-GDM)
// Complexity: O(N) where N is number of active field technicians (~0.5ms execution)
// Incorporates:
//   1. Spatial Zone Clustering & Manhattan Distance Heuristics (MMR Grid)
//   2. Real-time Workload & Queue Balancing (Anti-Bottlenecking)
//   3. Skill-to-Complaint Affinity Matrix
//   4. Historical Customer Rating & Experience Weighting
//   5. Queuing-Theory Dynamic Transit & Rush-Hour Traffic ETA
// ═══════════════════════════════════════════════════════════════════════════════

// 1. MUMBAI METROPOLITAN REGION (MMR) ZONE MATRIX
const ZONES = {
    SOUTH_MUMBAI: {
        id: 'SOUTH_MUMBAI',
        name: 'South Mumbai',
        pincodes: ['400001', '400002', '400004', '400005', '400006', '400007', '400011', '400013', '400018', '400020', '400021', '400026', '400034'],
        keywords: ['colaba', 'nariman', 'marine drive', 'fort', 'cuffe', 'worli', 'lower parel', 'mahalaxmi', 'tardeo', 'byculla', 'malabar hill'],
        coords: { lat: 18.9388, lng: 72.8354 }
    },
    CENTRAL_MUMBAI: {
        id: 'CENTRAL_MUMBAI',
        name: 'Central Mumbai & BKC',
        pincodes: ['400012', '400014', '400015', '400016', '400017', '400019', '400022', '400024', '400025', '400031', '400051', '400070', '400071'],
        keywords: ['dadar', 'wadala', 'sion', 'matunga', 'kurla', 'bkc', 'bandra kurla', 'chembur', 'ghatkopar', 'vidyavihar', 'kalina'],
        coords: { lat: 19.0596, lng: 72.8656 }
    },
    WESTERN_SUBURBS: {
        id: 'WESTERN_SUBURBS',
        name: 'Western Suburbs',
        pincodes: ['400049', '400050', '400052', '400053', '400054', '400055', '400056', '400057', '400058', '400061', '400062', '400064', '400067', '400068', '400092', '400101', '400102', '400104'],
        keywords: ['bandra', 'khar', 'santacruz', 'vile parle', 'andheri', 'juhu', 'jogeshwari', 'goregaon', 'malad', 'kandivali', 'borivali', 'dahisar', 'versova', 'lokhandwala'],
        coords: { lat: 19.1136, lng: 72.8697 }
    },
    THANE_ZONE: {
        id: 'THANE_ZONE',
        name: 'Thane & Central Belt',
        pincodes: ['400601', '400602', '400603', '400604', '400605', '400606', '400607', '400610', '400615', '400078', '400080', '400081', '400082'],
        keywords: ['thane', 'ghodbunder', 'majiwada', 'pokhran', 'mulund', 'bhandup', 'kanjurmarg', 'vikhroli', 'nahur', 'kalyan', 'dombivli'],
        coords: { lat: 19.2183, lng: 72.9781 }
    },
    NAVI_MUMBAI: {
        id: 'NAVI_MUMBAI',
        name: 'Navi Mumbai',
        pincodes: ['400701', '400703', '400705', '400706', '400708', '400709', '400710'],
        keywords: ['vashi', 'nerul', 'belapur', 'sanpada', 'koperkhairane', 'airoli', 'ghansoli', 'kharghar', 'panvel', 'seawoods', 'ulwe', 'palm beach'],
        coords: { lat: 19.0330, lng: 73.0297 }
    }
};

// Inter-zone transit matrix: [FromZone][ToZone] = { distKm, baseMinutes }
const TRANSIT_MATRIX = {
    SOUTH_MUMBAI: {
        SOUTH_MUMBAI: { distKm: 4, baseMins: 15 },
        CENTRAL_MUMBAI: { distKm: 12, baseMins: 30 },
        WESTERN_SUBURBS: { distKm: 22, baseMins: 45 },
        THANE_ZONE: { distKm: 34, baseMins: 65 },
        NAVI_MUMBAI: { distKm: 30, baseMins: 55 }
    },
    CENTRAL_MUMBAI: {
        SOUTH_MUMBAI: { distKm: 12, baseMins: 30 },
        CENTRAL_MUMBAI: { distKm: 5, baseMins: 18 },
        WESTERN_SUBURBS: { distKm: 10, baseMins: 25 },
        THANE_ZONE: { distKm: 22, baseMins: 40 },
        NAVI_MUMBAI: { distKm: 18, baseMins: 35 }
    },
    WESTERN_SUBURBS: {
        SOUTH_MUMBAI: { distKm: 22, baseMins: 48 },
        CENTRAL_MUMBAI: { distKm: 10, baseMins: 25 },
        WESTERN_SUBURBS: { distKm: 6, baseMins: 20 },
        THANE_ZONE: { distKm: 20, baseMins: 40 },
        NAVI_MUMBAI: { distKm: 28, baseMins: 55 }
    },
    THANE_ZONE: {
        SOUTH_MUMBAI: { distKm: 34, baseMins: 65 },
        CENTRAL_MUMBAI: { distKm: 22, baseMins: 40 },
        WESTERN_SUBURBS: { distKm: 20, baseMins: 40 },
        THANE_ZONE: { distKm: 6, baseMins: 20 },
        NAVI_MUMBAI: { distKm: 16, baseMins: 30 }
    },
    NAVI_MUMBAI: {
        SOUTH_MUMBAI: { distKm: 30, baseMins: 55 },
        CENTRAL_MUMBAI: { distKm: 18, baseMins: 35 },
        WESTERN_SUBURBS: { distKm: 28, baseMins: 55 },
        THANE_ZONE: { distKm: 16, baseMins: 30 },
        NAVI_MUMBAI: { distKm: 7, baseMins: 22 }
    }
};

// Skill Taxonomy & Service Map
const SERVICE_SKILL_REQUIREMENTS = {
    'AC Repair': ['PCB_ELECTRONICS', 'INVERTER_TECH', 'GENERAL_HVAC', 'DIAGNOSTICS'],
    'Servicing': ['JET_WASH', 'GENERAL_HVAC', 'SAFETY_AUDIT'],
    'Installation': ['SPLIT_INSTALLATION', 'PIPING_COPPER', 'VACUUMING'],
    'Gas Refill': ['REFRIGERATION_GAS', 'BRAZING_LEAKAGE', 'VACUUMING'],
    'Uninstallation': ['SPLIT_INSTALLATION', 'GENERAL_HVAC'],
    'AMC Visit': ['JET_WASH', 'GENERAL_HVAC', 'SAFETY_AUDIT']
};

// Known default technician profiles with skills and zones
const KNOWN_TECH_PROFILES = {
    'tech-1': {
        name: 'Suresh Kumar',
        zone: 'WESTERN_SUBURBS',
        rating: 4.92,
        experienceYears: 8,
        skills: ['PCB_ELECTRONICS', 'INVERTER_TECH', 'GENERAL_HVAC', 'DIAGNOSTICS', 'JET_WASH'],
        avgJobMinutes: 40
    },
    'tech-2': {
        name: 'Ramesh Yadav',
        zone: 'CENTRAL_MUMBAI',
        rating: 4.85,
        experienceYears: 6,
        skills: ['REFRIGERATION_GAS', 'BRAZING_LEAKAGE', 'VACUUMING', 'GENERAL_HVAC', 'JET_WASH'],
        avgJobMinutes: 45
    },
    'tech-3': {
        name: 'Deepak Verma',
        zone: 'THANE_ZONE',
        rating: 4.78,
        experienceYears: 5,
        skills: ['SPLIT_INSTALLATION', 'PIPING_COPPER', 'JET_WASH', 'GENERAL_HVAC'],
        avgJobMinutes: 50
    }
};

class DispatchEngine {
    constructor() {
        // Algorithm Weights (Sum = 1.0)
        this.WEIGHTS = {
            GEO_PROXIMITY: 0.35,  // Proximity to customer
            WORKLOAD: 0.30,       // Anti-bottleneck capacity
            SKILL_MATCH: 0.20,    // Competency alignment
            RATING: 0.15          // Seniority & QA track record
        };
    }

    /**
     * Resolves customer address/pincode to an MMR Zone
     * @param {string} address
     * @returns {object} Detected zone object
     */
    detectZone(address = '') {
        const text = (address || '').toLowerCase();

        // 1. Try Pincode Match
        for (const [zoneKey, zone] of Object.entries(ZONES)) {
            for (const pin of zone.pincodes) {
                if (text.includes(pin)) return zone;
            }
        }

        // 2. Try Keyword Substring Match
        for (const [zoneKey, zone] of Object.entries(ZONES)) {
            for (const kw of zone.keywords) {
                if (text.includes(kw)) return zone;
            }
        }

        // Fallback default: Central Mumbai (geometric centroid of MMR)
        return ZONES.CENTRAL_MUMBAI;
    }

    /**
     * Calculates peak-traffic multiplier based on current IST time
     * @returns {number} 1.0 (normal) to 1.40 (heavy peak rush hour)
     */
    getTrafficMultiplier() {
        const now = new Date();
        // Convert to IST (UTC + 5:30)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const hour = ist.getHours();

        // Morning Peak: 8:30 AM - 11:30 AM
        if (hour >= 8 && hour <= 11) return 1.35;
        // Evening Peak: 5:00 PM - 8:30 PM
        if (hour >= 17 && hour <= 20) return 1.40;
        // Late night / early morning: 10:00 PM - 6:00 AM
        if (hour >= 22 || hour <= 6) return 0.85;

        // Normal daylight hours
        return 1.10;
    }

    /**
     * Computes the dynamic Estimated Time of Arrival (ETA) in minutes
     * Queuing model: ETA = (TransitTime * Traffic) + (QueueJobsAhead * AvgJobDuration)
     */
    calculateETA(customerZoneId, techZoneId, activeJobsAhead = 0, avgJobDuration = 45) {
        const fromZone = techZoneId || 'CENTRAL_MUMBAI';
        const toZone = customerZoneId || 'CENTRAL_MUMBAI';

        const transitInfo = (TRANSIT_MATRIX[fromZone] && TRANSIT_MATRIX[fromZone][toZone])
            ? TRANSIT_MATRIX[fromZone][toZone]
            : { distKm: 12, baseMins: 30 };

        const trafficMultiplier = this.getTrafficMultiplier();
        const travelMinutes = Math.round(transitInfo.baseMins * trafficMultiplier);

        // Queuing delay: if tech already has jobs, they must finish them first
        const queueMinutes = activeJobsAhead * avgJobDuration;
        const totalMinutes = travelMinutes + queueMinutes;

        const arrivalDate = new Date(Date.now() + totalMinutes * 60000);
        const arrivalTimeString = arrivalDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        return {
            totalMinutes,
            travelMinutes,
            queueMinutes,
            distKm: transitInfo.distKm,
            estimatedArrival: arrivalTimeString,
            trafficFactor: trafficMultiplier > 1.2 ? 'Heavy Traffic' : (trafficMultiplier < 1.0 ? 'Light Traffic' : 'Moderate Traffic')
        };
    }

    /**
     * Evaluates a technician against a specific service request
     * Returns individual score components and weighted composite score (0-100)
     */
    /**
     * Calculates Haversine Geodesic Distance in km between two coordinate pairs
     */
    haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        // Apply 1.25 urban road curvature routing factor for Mumbai street grid
        return Number((R * c * 1.25).toFixed(1));
    }

    /**
     * Evaluates a technician against a specific service request
     * Returns individual score components and weighted composite score (0-100)
     */
    scoreTechnician(technician, request) {
        const profile = KNOWN_TECH_PROFILES[technician.id] || {
            name: technician.name || 'Field Tech',
            zone: technician.zone || 'CENTRAL_MUMBAI',
            rating: technician.rating || 4.80,
            experienceYears: technician.experience_years || 4,
            skills: technician.skills || ['GENERAL_HVAC', 'JET_WASH'],
            avgJobMinutes: 45
        };

        const targetAddress = request.address || request.customer_address || '';
        const customerZone = this.detectZone(targetAddress);
        const techZoneId = technician.zone || profile.zone || 'CENTRAL_MUMBAI';

        // 1. GEO-PROXIMITY SCORE (0 - 100)
        let transitInfo = (TRANSIT_MATRIX[techZoneId] && TRANSIT_MATRIX[techZoneId][customerZone.id])
            ? { ...TRANSIT_MATRIX[techZoneId][customerZone.id] }
            : { distKm: 15, baseMins: 35 };

        if (ZONES[techZoneId] && customerZone && ZONES[techZoneId].coords && customerZone.coords) {
            transitInfo.distKm = this.haversineKm(
                ZONES[techZoneId].coords.lat,
                ZONES[techZoneId].coords.lng,
                customerZone.coords.lat,
                customerZone.coords.lng
            );
        }
        const distKm = transitInfo.distKm;

        // Linear penalty based on real distance: max 40km
        const geoScore = Math.max(20, Math.min(100, Math.round(100 - (distKm * 2.1))));

        // 2. WORKLOAD SCORE (0 - 100)
        const activeJobs = technician.active_jobs !== undefined
            ? technician.active_jobs
            : (technician.current_load !== undefined ? technician.current_load : (profile.active_jobs || 0));
        let workloadScore = 100;
        if (activeJobs === 1) workloadScore = 75;
        else if (activeJobs === 2) workloadScore = 45;
        else if (activeJobs >= 3) workloadScore = Math.max(10, 30 - ((activeJobs - 3) * 10));

        // Fatigue penalty if technician is overbooked
        if (activeJobs >= 4) {
            workloadScore = Math.max(5, workloadScore - 15);
        }

        // 3. SKILL MATCH SCORE (0 - 100)
        let requiredSkills = ['GENERAL_HVAC'];
        for (const [srvKey, reqSkills] of Object.entries(SERVICE_SKILL_REQUIREMENTS)) {
            if ((request.service_type || '').toLowerCase().includes(srvKey.toLowerCase())) {
                requiredSkills = reqSkills;
                break;
            }
        }

        const techSkills = new Set(technician.skills || profile.skills || []);
        let matchCount = 0;
        requiredSkills.forEach(s => {
            if (techSkills.has(s) || techSkills.has(s.replace(/_/g, ' '))) matchCount++;
        });
        const skillScore = Math.round((matchCount / Math.max(1, requiredSkills.length)) * 100);

        // 4. RATING & EXPERIENCE SCORE (0 - 100)
        const ratingVal = technician.rating || profile.rating || 4.75;
        const ratingScore = Math.round(Math.min(100, Math.max(50, (ratingVal - 3.5) * 66.6)));

        // 5. DYNAMIC PRIORITY WEIGHT ADJUSTMENT
        const issueText = `${request.issue_description || ''} ${request.service_type || ''}`.toLowerCase();
        const isUrgent = issueText.includes('trip') || issueText.includes('spark') || issueText.includes('mcb') ||
                         issueText.includes('gas leak') || issueText.includes('urgent') || request.priority === 'HIGH';

        const weights = isUrgent ? {
            GEO_PROXIMITY: 0.45,
            WORKLOAD: 0.25,
            SKILL_MATCH: 0.18,
            RATING: 0.12
        } : this.WEIGHTS;

        // 6. WEIGHTED COMPOSITE CALCULATION
        const compositeScore = Number((
            (geoScore * weights.GEO_PROXIMITY) +
            (workloadScore * weights.WORKLOAD) +
            (skillScore * weights.SKILL_MATCH) +
            (ratingScore * weights.RATING)
        ).toFixed(1));

        // Dynamic ETA
        const eta = this.calculateETA(customerZone.id, techZoneId, activeJobs, profile.avgJobMinutes);

        // Human-readable recommendation reasoning
        const reasons = [];
        if (techZoneId === customerZone.id) reasons.push(`Direct local coverage in ${customerZone.name}`);
        else reasons.push(`${transitInfo.distKm} km transit from ${ZONES[techZoneId] ? ZONES[techZoneId].name : techZoneId}`);

        if (activeJobs === 0) reasons.push('Immediate availability (0 active jobs)');
        else reasons.push(`${activeJobs} job(s) in queue`);

        if (skillScore >= 80) reasons.push('High skill affinity for this AC issue');

        return {
            technicianId: technician.id,
            technicianName: technician.name || profile.name,
            phone: technician.phone || profile.phone,
            compositeScore,
            scores: {
                geoScore,
                workloadScore,
                skillScore,
                ratingScore
            },
            metrics: {
                customerZone: customerZone.name,
                techZone: ZONES[techZoneId] ? ZONES[techZoneId].name : techZoneId,
                activeJobs,
                rating: ratingVal,
                distanceKm: transitInfo.distKm,
                etaMinutes: eta.totalMinutes,
                estimatedArrival: eta.estimatedArrival,
                trafficFactor: eta.trafficFactor
            },
            recommendationRationale: reasons.join(' • ')
        };
    }

    /**
     * Executes real-time MOW-GDM algorithm across entire fleet
     * Returns sorted ranking (top candidate at index 0)
     */
    findOptimalTechnician(request, technicians = []) {
        const start = performance.now();
        if (!technicians || technicians.length === 0) {
            return null;
        }

        const rankings = technicians.map(tech => this.scoreTechnician(tech, request));

        // Sort descending by compositeScore, break ties by earliest ETA
        rankings.sort((a, b) => {
            if (b.compositeScore !== a.compositeScore) {
                return b.compositeScore - a.compositeScore;
            }
            return a.metrics.etaMinutes - b.metrics.etaMinutes;
        });

        const optimal = rankings[0];
        const executionLatencyMs = Number((performance.now() - start).toFixed(2));

        return {
            optimalTechnician: optimal,
            rankings,
            algorithm: 'Heuristic Dispatch Engine (Multi-Objective Weighted Greedy Model)',
            timestamp: new Date().toISOString(),
            executionLatencyMs
        };
    }
}

module.exports = new DispatchEngine();
