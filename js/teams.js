// ================================
// TEAMS MODULE - Bilanciamento squadre
// ================================

import { calculatePlayerRating } from './players.js';

// ================================
// Team Balancing Algorithm
// ================================

export function createBalancedTeams(players, manualAssignments = { rossi: [], blu: [] }) {
    // Separate manually assigned players
    const manualRossi = players.filter(p => manualAssignments.rossi.includes(p.id));
    const manualBlu = players.filter(p => manualAssignments.blu.includes(p.id));

    // Get unassigned players
    const assignedIds = [...manualAssignments.rossi, ...manualAssignments.blu];
    const unassigned = players.filter(p => !assignedIds.includes(p.id));

    // Calculate target size
    const totalPlayers = players.length;
    const teamSize = Math.floor(totalPlayers / 2);

    // Calculate how many more players each team needs
    const rossiNeeded = teamSize - manualRossi.length;
    const bluNeeded = teamSize - manualBlu.length;

    // Sort unassigned by rating for initial greedy assignment
    const sortedUnassigned = [...unassigned].sort((a, b) =>
        calculateTeamValue([b]) - calculateTeamValue([a])
    );

    // Use greedy algorithm with backtracking for balance
    let bestRossi = [...manualRossi];
    let bestBlu = [...manualBlu];
    let bestDiff = Infinity;

    // Try different combinations
    const combinations = generateCombinations(sortedUnassigned, rossiNeeded);

    for (const rossiPicks of combinations) {
        const bluPicks = sortedUnassigned.filter(p => !rossiPicks.includes(p));

        if (bluPicks.length < bluNeeded) continue;

        const testRossi = [...manualRossi, ...rossiPicks];
        const testBlu = [...manualBlu, ...bluPicks.slice(0, bluNeeded)];

        const diff = Math.abs(calculateTeamValue(testRossi) - calculateTeamValue(testBlu));

        if (diff < bestDiff) {
            bestDiff = diff;
            bestRossi = testRossi;
            bestBlu = testBlu;
        }

        // If perfect balance found, stop
        if (diff === 0) break;
    }

    return {
        rossi: bestRossi.map(p => p.id),
        blu: bestBlu.map(p => p.id),
        balance: calculateBalance(bestRossi, bestBlu)
    };
}

function generateCombinations(arr, size) {
    if (size > arr.length) return [arr];
    if (size === 0) return [[]];
    if (size === arr.length) return [arr];

    // Limit combinations to avoid performance issues
    const maxCombinations = 100;
    const combinations = [];

    function* combinationsGenerator(start, current) {
        if (current.length === size) {
            yield [...current];
            return;
        }

        for (let i = start; i <= arr.length - (size - current.length); i++) {
            current.push(arr[i]);
            yield* combinationsGenerator(i + 1, current);
            current.pop();
        }
    }

    for (const combo of combinationsGenerator(0, [])) {
        combinations.push(combo);
        if (combinations.length >= maxCombinations) break;
    }

    return combinations;
}

// ================================
// Team Metrics
// ================================

export function calculateTeamValue(players) {
    return players.reduce((sum, p) => sum + calculatePlayerRating(p), 0);
}

export function calculateBalance(rossi, blu) {
    const rossiValue = calculateTeamValue(rossi);
    const bluValue = calculateTeamValue(blu);
    const total = rossiValue + bluValue;

    if (total === 0) return { index: 100, gap: 0, rossiValue: 0, bluValue: 0 };

    const gap = Math.abs(rossiValue - bluValue);
    const maxGap = total; // Worst case: all points on one side
    const index = Math.round((1 - gap / maxGap) * 100);

    return {
        index, // 0-100, higher is better
        gap,
        rossiValue,
        bluValue
    };
}

export function getTeamStats(players) {
    if (!players || players.length === 0) {
        return {
            count: 0,
            totalRating: 0,
            avgRating: 0,
            avgValutazione: 0,
            avgVisione: 0,
            avgCorsa: 0,
            avgPossesso: 0,
            avgForma: 0
        };
    }

    const stats = {
        count: players.length,
        totalRating: 0,
        avgValutazione: 0,
        avgVisione: 0,
        avgCorsa: 0,
        avgPossesso: 0,
        avgForma: 0
    };

    players.forEach(p => {
        stats.totalRating += calculatePlayerRating(p);
        stats.avgValutazione += p.valutazione_generale || 3;
        stats.avgVisione += p.visione_gioco || 3;
        stats.avgCorsa += p.corsa || 3;
        stats.avgPossesso += p.possesso || 3;
        stats.avgForma += p.forma_fisica || 3;
    });

    stats.avgRating = Math.round(stats.totalRating / players.length * 10) / 10;
    stats.avgValutazione = Math.round(stats.avgValutazione / players.length * 10) / 10;
    stats.avgVisione = Math.round(stats.avgVisione / players.length * 10) / 10;
    stats.avgCorsa = Math.round(stats.avgCorsa / players.length * 10) / 10;
    stats.avgPossesso = Math.round(stats.avgPossesso / players.length * 10) / 10;
    stats.avgForma = Math.round(stats.avgForma / players.length * 10) / 10;

    return stats;
}

// ================================
// Role Balance Check
// ================================

export function checkRoleBalance(players) {
    const roles = {
        portiere: 0,
        difensore: 0,
        laterale: 0,
        centrocampista: 0,
        attaccante: 0
    };

    players.forEach(p => {
        if (p.ruolo_principale && roles[p.ruolo_principale] !== undefined) {
            roles[p.ruolo_principale]++;
        }
    });

    return roles;
}

export function suggestSwaps(rossi, blu, allPlayers) {
    const rossiPlayers = rossi.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    const bluPlayers = blu.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);

    const currentBalance = calculateBalance(rossiPlayers, bluPlayers);
    const suggestions = [];

    // Try all possible swaps
    for (let i = 0; i < rossiPlayers.length; i++) {
        for (let j = 0; j < bluPlayers.length; j++) {
            const newRossi = [...rossiPlayers];
            const newBlu = [...bluPlayers];

            // Swap
            const temp = newRossi[i];
            newRossi[i] = newBlu[j];
            newBlu[j] = temp;

            const newBalance = calculateBalance(newRossi, newBlu);

            if (newBalance.index > currentBalance.index) {
                suggestions.push({
                    from: { team: 'rossi', player: rossiPlayers[i] },
                    to: { team: 'blu', player: bluPlayers[j] },
                    improvement: newBalance.index - currentBalance.index,
                    newBalance
                });
            }
        }
    }

    // Sort by improvement
    return suggestions.sort((a, b) => b.improvement - a.improvement).slice(0, 5);
}

export default {
    createBalancedTeams,
    calculateTeamValue,
    calculateBalance,
    getTeamStats,
    checkRoleBalance,
    suggestSwaps
};
