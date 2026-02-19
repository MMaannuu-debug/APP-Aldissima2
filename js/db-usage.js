// ================================
// DB USAGE UTILITY
// ================================

import db from './db.js';

const STORAGE_KEY = 'calcetto_db_usage';
const MAX_SPACE_MB = 500;
const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days (approx 3 months)

/**
 * Estimates the database size by calculating the size of data strings.
 * This is an approximation since we don't have server-side metrics access.
 */
export async function getDatabaseUsage(forceRefresh = false) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && !forceRefresh) {
        const data = JSON.parse(cached);
        const now = Date.now();
        if (now - data.timestamp < REFRESH_INTERVAL_MS) {
            return data;
        }
    }

    try {
        console.log('Calculating database usage estimation...');

        // Fetch main data
        const players = await db.getAll('players');
        const matches = await db.getAll('matches');
        const matchConvocations = await db.getAll('match_convocations');
        const matchTeams = await db.getAll('match_teams');
        const matchEvents = await db.getAll('match_events');

        // Estimate size by JSON stringification
        // We add a safety factor (1.5) for indexes and PostgreSQL overhead
        const totalRawBytes = (
            JSON.stringify(players || []).length +
            JSON.stringify(matches || []).length +
            JSON.stringify(matchConvocations || []).length +
            JSON.stringify(matchTeams || []).length +
            JSON.stringify(matchEvents || []).length
        );

        const estimatedBytes = Math.ceil(totalRawBytes * 1.5);
        const estimatedMB = estimatedBytes / (1024 * 1024);
        const percentage = (estimatedMB / MAX_SPACE_MB) * 100;

        console.log('DB Usage Debug:', { totalRawBytes, estimatedMB, percentage });

        const usageData = {
            bytes: estimatedBytes,
            mb: estimatedMB < 0.1 ? estimatedMB.toFixed(4) : estimatedMB.toFixed(2),
            percentage: percentage < 0.1 ? percentage.toFixed(3) : percentage.toFixed(2),
            timestamp: Date.now(),
            lastUpdate: new Date().toLocaleString() // Use full date/time
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(usageData));
        return usageData;
    } catch (error) {
        console.error('Error estimating DB usage:', error);
        return { error: true, message: error.message };
    }
}

export function formatSize(mb) {
    return `${mb} MB`;
}

export default {
    getDatabaseUsage,
    formatSize
};
