import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class AnalyticsService {
    constructor() {
        this.currentSessionStart = null;
    }

    // --- Session Tracking ---

    startSession() {
        this.currentSessionStart = Date.now();
        localStorage.setItem('sessionStart', this.currentSessionStart);
    }

    async endSession(userId) {
        const start = localStorage.getItem('sessionStart');
        if (!start) return;

        const durationSec = Math.floor((Date.now() - parseInt(start)) / 1000);
        if (durationSec > 0) {
            // Save session
            /* 
                Ideally we save individual sessions, but for the dashboard aggregate, 
               we will also increment the global total duration to calculate average quickly.
            */
            const today = new Date().toISOString().split('T')[0];
            const statsRef = doc(db, 'analytics', `stats_${today}`);

            try {
                await setDoc(statsRef, {
                    totalSessionDuration: increment(durationSec),
                    sessionCount: increment(1)
                }, { merge: true });
                console.log(`[Analytics] Session captured: ${durationSec}s`);
            } catch (e) {
                console.error("Error saving session", e);
            }
        }
        localStorage.removeItem('sessionStart');
    }

    // --- Event Tracking ---

    async trackLocationSubmission() {
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'analytics', `stats_${today}`);
        try {
            await setDoc(statsRef, {
                locationSubmissions: increment(1)
            }, { merge: true });
            console.log("[Analytics] Location Submission tracked");
        } catch (e) {
            console.error("Error tracking submission", e);
        }
    }

    async trackPlanView(operator) {
        if (!operator) return;
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'analytics', `stats_${today}`);

        try {
            // Firestore nested increment requires dot notation for map fields? 
            // Actually, best to just use a top level field or carefully construct the map.
            // Simplified: planViews_jio, planViews_airtel
            const field = `planViews_${operator.toLowerCase()}`;
            await setDoc(statsRef, {
                [field]: increment(1),
                totalPlanViews: increment(1)
            }, { merge: true });
            console.log(`[Analytics] Plan view tracked: ${operator}`);
        } catch (e) {
            console.error("Error tracking plan view", e);
        }
    }

    async trackGetSimClick(operator) {
        if (!operator) return;
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'analytics', `stats_${today}`);

        try {
            const field = `getSimClicks_${operator.toLowerCase()}`;
            await setDoc(statsRef, {
                [field]: increment(1),
                totalGetSimClicks: increment(1)
            }, { merge: true });
            console.log(`[Analytics] Get SIM tracked: ${operator}`);
        } catch (e) {
            console.error("Error tracking get sim", e);
        }
    }

    async incrementTotalUsers() {
        const globalRef = doc(db, 'analytics', 'global');
        try {
            await setDoc(globalRef, {
                totalUsers: increment(1)
            }, { merge: true });
        } catch (e) {
            console.error("Error incrementing user count", e);
        }
    }

    // --- Data Retrieval for Dashboard ---

    async getDashboardMetrics() {
        // 1. Get Real Total Users Count (Reading Collection Size - optimized for small scale)
        let totalUsers = 0;
        try {
            // Basic collection count (client side read all docs - only okay for <100 users demo)
            // Ideally use count() aggregation query
            const usersSnap = await getDocs(collection(db, "users"));
            totalUsers = usersSnap.size;
        } catch (e) {
            console.error("Error fetching user count", e);
            // Fallback for demo if users collection is locked: use stored global
            const globalSnap = await getDoc(doc(db, 'analytics', 'global'));
            if (globalSnap.exists()) totalUsers = globalSnap.data().totalUsers || 0;
        }

        // 2. Get Daily Stats & Aggregates
        // const today = new Date().toISOString().split('T')[0];
        const labels = [];
        const durationData = [];
        // const submissionsData = [];

        let totalDuration = 0;
        let totalSessions = 0;
        let totalSubmissions = 0;
        let totalPlanViews = 0;
        let totalGetSimClicks = 0;

        const opPlanViews = { jio: 0, airtel: 0, vi: 0, bsnl: 0 };
        const opGetSimClicks = { jio: 0, airtel: 0, vi: 0, bsnl: 0 };

        // Fetch last 7 days from `analytics/stats_YYYY-MM-DD`
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(dateStr);

            try {
                const snap = await getDoc(doc(db, 'analytics', `stats_${dateStr}`));
                if (snap.exists()) {
                    const data = snap.data();

                    const duration = data.totalSessionDuration || 0;
                    const sessions = data.sessionCount || 0;
                    // Protect against NaN
                    const avg = sessions > 0 ? (duration / sessions) : 0;

                    durationData.push(Math.round(avg));

                    totalDuration += duration;
                    totalSessions += sessions;
                    totalSubmissions += (data.locationSubmissions || 0);

                    // Ops
                    ['jio', 'airtel', 'vi', 'bsnl'].forEach(op => {
                        opPlanViews[op] += (data[`planViews_${op}`] || 0);
                        opGetSimClicks[op] += (data[`getSimClicks_${op}`] || 0);
                        totalPlanViews += (data[`planViews_${op}`] || 0);
                        totalGetSimClicks += (data[`getSimClicks_${op}`] || 0);
                    });

                } else {
                    durationData.push(0);
                }
            } catch (e) {
                console.error(e);
                durationData.push(0);
            }
        }

        // Also check if `global` has accumulated location subs if not in daily
        // (Assuming trackLocationSubmission writes to daily, so sum is correct)

        const avgSessionTime = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

        return {
            totalUsers,
            avgSessionTime,
            locationSubmissions: totalSubmissions,
            totalPlanViews,
            totalGetSimClicks,

            charts: {
                dates: labels,
                avgSessionTrend: durationData,
                opPlanViews,
                opGetSimClicks
            }
        };
    }
}

export const analytics = new AnalyticsService();
