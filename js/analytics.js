import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, serverTimestamp, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class AnalyticsService {
    constructor() {
        this.currentSessionStart = null;
        this.useLocalStorage = false; // Flag to track if using localStorage fallback
    }

    // --- Session Tracking ---

    startSession() {
        this.currentSessionStart = Date.now();
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('sessionStart', this.currentSessionStart);
        localStorage.setItem('sessionStartDate', today); // Store the date session started
        console.log(`[Analytics] Session started on ${today}`);
    }

    async endSession(userId) {
        const start = localStorage.getItem('sessionStart');
        const sessionStartDate = localStorage.getItem('sessionStartDate');
        if (!start) return;

        const today = new Date().toISOString().split('T')[0];
        const now = Date.now();
        const durationSec = Math.floor((now - parseInt(start)) / 1000);

        // IMPORTANT: Only count sessions for the same day they started
        if (sessionStartDate && sessionStartDate !== today) {
            console.log(`[Analytics] ⏭️  Session crossed midnight. Ending previous day session.`);
            console.log(`[Analytics] Session started: ${sessionStartDate}, ended: ${today}`);
            
            // Save only the duration up to midnight
            const endOfDay = new Date(sessionStartDate);
            endOfDay.setHours(23, 59, 59, 999);
            const durationToMidnight = Math.floor((endOfDay.getTime() - parseInt(start)) / 1000);
            
            if (durationToMidnight > 0) {
                await this._saveSession(sessionStartDate, durationToMidnight);
            }
            
            // Start new session for today
            this.startSession();
            return;
        }

        if (durationSec > 0) {
            // Save session only for today's date
            await this._saveSession(today, durationSec);
        }
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('sessionStartDate');
    }

    async _saveSession(dateStr, durationSec) {
        // Cap maximum session duration at 8 hours (28800 seconds) to prevent unrealistic data
        const MAX_SESSION_DURATION = 28800; // 8 hours
        let cappedDuration = durationSec;
        
        if (durationSec > MAX_SESSION_DURATION) {
            console.log(`[Analytics] ⚠️  Session duration (${durationSec}s) exceeds max (${MAX_SESSION_DURATION}s). Capping to 8 hours.`);
            cappedDuration = MAX_SESSION_DURATION;
        }
        
        const statsRef = doc(db, 'analytics', `stats_${dateStr}`);
        try {
            // CRITICAL FIX: Don't use increment() for the first day's data
            // This prevents accumulation across days
            const currentData = await getDoc(statsRef);
            let existingDuration = 0;
            let existingSessions = 0;
            
            if (currentData.exists()) {
                const data = currentData.data();
                existingDuration = data.totalSessionDuration || 0;
                existingSessions = data.sessionCount || 0;
            }
            
            // Set EXACT values, don't accumulate
            // Only add NEW session duration to existing
            const newDuration = existingDuration + cappedDuration;
            const newSessions = existingSessions + 1;
            
            await setDoc(statsRef, {
                totalSessionDuration: newDuration,
                sessionCount: newSessions,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            console.log(`[Analytics] ✅ Session saved for ${dateStr}: ${cappedDuration}s added (Total: ${newDuration}s, Sessions: ${newSessions})`);
        } catch (e) {
            console.error(`[Analytics] ❌ Error saving session for ${dateStr}:`, e);
            // Fallback to localStorage
            this.trackToLocalStorage(`session_${dateStr}`, cappedDuration);
        }
    }

    // --- Event Tracking ---

    async trackLocationSubmission() {
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'analytics', `stats_${today}`);
        try {
            const currentData = await getDoc(statsRef);
            const existingCount = (currentData.exists() ? currentData.data().locationSubmissions : 0) || 0;
            const newCount = existingCount + 1;
            
            await setDoc(statsRef, {
                locationSubmissions: newCount
            }, { merge: true });
            console.log("[Analytics] ✅ Location Submission tracked for", today, `(Total: ${newCount})`);
        } catch (e) {
            console.error("[Analytics] ❌ Error tracking submission:", e);
            if (e.code === 'permission-denied') {
                console.error("[Analytics] ⚠️ Firestore permission denied. Using localStorage backup.");
            }
            // Fallback to localStorage
            this.trackToLocalStorage('locationSubmissions');
        }
    }

    async trackPlanView(operator) {
        if (!operator) return;
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'analytics', `stats_${today}`);

        try {
            const currentData = await getDoc(statsRef);
            const field = `planViews_${operator.toLowerCase()}`;
            const data = currentData.exists() ? currentData.data() : {};
            
            const existingOp = (data[field] || 0);
            const existingTotal = (data.totalPlanViews || 0);
            
            await setDoc(statsRef, {
                [field]: existingOp + 1,
                totalPlanViews: existingTotal + 1
            }, { merge: true });
            console.log(`[Analytics] ✅ Plan view tracked for ${operator} on ${today} (Total: ${existingTotal + 1})`);
        } catch (e) {
            console.error(`[Analytics] ❌ Error tracking plan view for ${operator}:`, e);
            if (e.code === 'permission-denied') {
                console.error("[Analytics] ⚠️ Firestore permission denied. Using localStorage backup.");
            }
            // Fallback to localStorage
            this.trackToLocalStorage(`planViews_${operator.toLowerCase()}`);
            this.trackToLocalStorage('totalPlanViews');
        }
    }

    async trackGetSimClick(operator) {
        if (!operator) return;
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'analytics', `stats_${today}`);

        try {
            const currentData = await getDoc(statsRef);
            const field = `getSimClicks_${operator.toLowerCase()}`;
            const data = currentData.exists() ? currentData.data() : {};
            
            const existingOp = (data[field] || 0);
            const existingTotal = (data.totalGetSimClicks || 0);
            
            await setDoc(statsRef, {
                [field]: existingOp + 1,
                totalGetSimClicks: existingTotal + 1
            }, { merge: true });
            console.log(`[Analytics] ✅ Get SIM tracked for ${operator} on ${today} (Total: ${existingTotal + 1})`);
        } catch (e) {
            console.error(`[Analytics] ❌ Error tracking get sim for ${operator}:`, e);
            if (e.code === 'permission-denied') {
                console.error("[Analytics] ⚠️ Firestore permission denied. Using localStorage backup.");
            }
            // Fallback to localStorage
            this.trackToLocalStorage(`getSimClicks_${operator.toLowerCase()}`);
            this.trackToLocalStorage('totalGetSimClicks');
        }
    }

    async incrementTotalUsers() {
        const globalRef = doc(db, 'analytics', 'global');
        try {
            await setDoc(globalRef, {
                totalUsers: increment(1)
            }, { merge: true });
            console.log("[Analytics] ✅ Total user count incremented");
        } catch (e) {
            console.error("[Analytics] ❌ Error incrementing user count:", e);
            if (e.code === 'permission-denied') {
                console.error("[Analytics] ⚠️ Firestore permission denied. Using localStorage backup.");
            }
            // Fallback to localStorage
            this.trackToLocalStorage('totalUsers');
        }
    }

    // --- Data Retrieval for Dashboard ---

    /**
     * ADMIN FUNCTION: Reset today's analytics data completely (set to 0)
     * USE ONLY when data is corrupted
     */
    async resetTodayData() {
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'analytics', `stats_${today}`);
        try {
            // DELETE the old corrupted document completely
            await deleteDoc(statsRef);
            console.log(`[Analytics] 🗑️  Deleted corrupted document for ${today}`);
            
            // Then create fresh document with all zeros
            await setDoc(statsRef, {
                totalSessionDuration: 0,
                sessionCount: 0,
                locationSubmissions: 0,
                planViews_jio: 0,
                planViews_airtel: 0,
                planViews_vi: 0,
                planViews_bsnl: 0,
                totalPlanViews: 0,
                getSimClicks_jio: 0,
                getSimClicks_airtel: 0,
                getSimClicks_vi: 0,
                getSimClicks_bsnl: 0,
                totalGetSimClicks: 0,
                createdAt: new Date().toISOString(),
                lastReset: new Date().toISOString()
            });
            console.log(`[Analytics] 🔄 Successfully reset all data for ${today} to 0`);
            return true;
        } catch (e) {
            console.error(`[Analytics] ❌ Error resetting data for ${today}:`, e);
            return false;
        }
    }

    async getDashboardMetrics() {
        // 1. Get Real Total Users Count
        let totalUsers = 0;
        try {
            // User requested to use 'analytics/global' specifically.
            // We fetch the global stats document first.
            const globalSnap = await getDoc(doc(db, 'analytics', 'global'));

            if (globalSnap.exists()) {
                const globalData = globalSnap.data();
                totalUsers = globalData.totalUsers || 0;
                console.log("[Analytics] ✅ Fetched totalUsers from analytics/global:", totalUsers);
            } else {
                // Fallback: If global doc empty, try counting users collection
                console.warn("[Analytics] ⚠️ analytics/global not found, falling back to collection count.");
                try {
                    const usersSnap = await getDocs(collection(db, "users"));
                    totalUsers = usersSnap.size;
                    console.log("[Analytics] ✅ Fetched totalUsers from users collection:", totalUsers);
                } catch (fallbackErr) {
                    console.error("[Analytics] ⚠️ Fallback also failed:", fallbackErr);
                    totalUsers = 0;
                }
            }
        } catch (e) {
            console.error("[Analytics] ❌ Critical Error fetching user count:", e);
            console.error("[Analytics] Error details:", {
                code: e.code,
                message: e.message,
                firebaseError: e.toString()
            });
            
            // Try localStorage fallback
            const cachedData = this.getAnalyticsFromLocalStorage();
            if (cachedData) {
                console.log("[Analytics] 📦 Using cached localStorage data");
                return cachedData;
            }
        }

        // 2. Get Daily Stats & Aggregates
        // const today = new Date().toISOString().split('T')[0];
        const labels = [];
        const durationData = [];
        const submissionsData = [];
        const sessionsData = [];

        let totalDuration = 0;
        let totalSessions = 0;
        let totalSubmissions = 0;
        let totalPlanViews = 0;
        let totalGetSimClicks = 0;

        const opPlanViews = { jio: 0, airtel: 0, vi: 0, bsnl: 0 };
        const opGetSimClicks = { jio: 0, airtel: 0, vi: 0, bsnl: 0 };

        // Fetch last 7 days from `analytics/stats_YYYY-MM-DD`
        let successfulDaysFetched = 0;
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(dateStr);

            try {
                const snap = await getDoc(doc(db, 'analytics', `stats_${dateStr}`));
                if (snap.exists()) {
                    successfulDaysFetched++;
                    const data = snap.data();

                    const duration = data.totalSessionDuration || 0;
                    const sessions = data.sessionCount || 0;
                    const submissions = data.locationSubmissions || 0;
                    
                    // Protect against NaN
                    const avg = sessions > 0 ? (duration / sessions) : 0;

                    // Store INDIVIDUAL daily values (not accumulated)
                    durationData.push(Math.round(avg));
                    submissionsData.push(submissions);
                    sessionsData.push(sessions);

                    // Accumulate for total only
                    totalDuration += duration;
                    totalSessions += sessions;
                    totalSubmissions += submissions;

                    // Ops
                    ['jio', 'airtel', 'vi', 'bsnl'].forEach(op => {
                        opPlanViews[op] += (data[`planViews_${op}`] || 0);
                        opGetSimClicks[op] += (data[`getSimClicks_${op}`] || 0);
                        totalPlanViews += (data[`planViews_${op}`] || 0);
                        totalGetSimClicks += (data[`getSimClicks_${op}`] || 0);
                    });

                    console.log(`[Analytics] ✅ Data fetched for ${dateStr}:`, { duration, sessions, submissions, avg: Math.round(avg) });
                } else {
                    durationData.push(0);
                    submissionsData.push(0);
                    sessionsData.push(0);
                    console.log(`[Analytics] ℹ️ No data for ${dateStr}`);
                }
            } catch (e) {
                console.error(`[Analytics] ❌ Error fetching ${dateStr}:`, e);
                durationData.push(0);
                submissionsData.push(0);
                sessionsData.push(0);
            }
        }

        console.log(`[Analytics] ✅ Successfully fetched ${successfulDaysFetched}/7 days of data`);
        console.log(`[Analytics] Date labels:`, labels);
        console.log(`[Analytics] Duration data:`, durationData);
        console.log(`[Analytics] Submissions data:`, submissionsData);
        console.log(`[Analytics] Sessions data:`, sessionsData);
        console.log(`[Analytics] Summary:`, {
            totalUsers,
            totalDuration,
            totalSessions,
            totalSubmissions,
            totalPlanViews,
            totalGetSimClicks
        });

        const avgSessionTime = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

        const result = {
            totalUsers,
            avgSessionTime,
            locationSubmissions: totalSubmissions,
            totalPlanViews,
            totalGetSimClicks,

            charts: {
                dates: labels,
                avgSessionTrend: durationData,
                dailySubmissions: submissionsData,
                dailySessions: sessionsData,
                opPlanViews,
                opGetSimClicks
            }
        };

        // Save successful data to localStorage for fallback
        if (successfulDaysFetched > 0 || totalUsers > 0) {
            this.saveAnalyticsToLocalStorage(result);
            console.log("[Analytics] ✅ Firestore data cached to localStorage");
        }

        return result;
    }

    // --- localStorage FALLBACK METHODS (when Firebase unavailable) ---

    /**
     * Save analytics data to localStorage as backup
     */
    saveAnalyticsToLocalStorage(data) {
        try {
            localStorage.setItem('analyticsData', JSON.stringify(data));
            console.log("[Analytics] ✅ Data saved to localStorage backup");
        } catch (e) {
            console.error("[Analytics] Error saving to localStorage:", e);
        }
    }

    /**
     * Get analytics data from localStorage (fallback)
     */
    getAnalyticsFromLocalStorage() {
        try {
            const data = localStorage.getItem('analyticsData');
            if (data) {
                console.log("[Analytics] 📦 Using localStorage fallback data");
                this.useLocalStorage = true;
                return JSON.parse(data);
            }
        } catch (e) {
            console.error("[Analytics] Error reading from localStorage:", e);
        }
        return null;
    }

    /**
     * Track event to localStorage as backup
     */
    trackToLocalStorage(eventType, value = 1) {
        try {
            const stats = JSON.parse(localStorage.getItem('analyticsStats') || '{}');
            stats[eventType] = (stats[eventType] || 0) + value;
            localStorage.setItem('analyticsStats', JSON.stringify(stats));
            console.log(`[Analytics] 📝 Tracked ${eventType} to localStorage`);
        } catch (e) {
            console.error("[Analytics] Error tracking to localStorage:", e);
        }
    }
}

export const analytics = new AnalyticsService();
// Make analytics globally accessible from browser console
window.analytics = analytics;
console.log("[Analytics] ✅ Analytics service loaded and accessible from console as: analytics");