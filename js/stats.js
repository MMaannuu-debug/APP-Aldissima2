// ================================
// STATISTICS MODULE
// ================================

import db from './db.js';
import { getMatchResult, STATI } from './matches.js';

// ================================
// Player Statistics
// ================================

export async function updatePlayerStats(match, players) {
    if (match.stato !== STATI.CHIUSA) return;

    const result = getMatchResult(match);
    const updates = [];

    // Process each player in the match
    const allPlayerIds = [...match.squadraRossa, ...match.squadraBlu];

    for (const playerId of allPlayerIds) {
        const player = players.find(p => p.id === playerId);
        if (!player) continue;

        const isRossi = match.squadraRossa.includes(playerId);
        const isBlu = match.squadraBlu.includes(playerId);

        // Calculate points
        let points = 1; // Presence point

        const isWinner = (result === 'rossi' && isRossi) || (result === 'blu' && isBlu);
        const isDraw = result === 'pareggio';

        if (isWinner) points += 3;
        if (isDraw) points += 1;

        // MVP points
        const isMvpRossi = match.mvp_rossi === playerId;
        const isMvpBlu = match.mvp_blu === playerId;

        if (isMvpRossi || isMvpBlu) {
            if (isWinner) points += 3;
            else points += 1;
        }

        // Get goals for this player
        const playerGoals = (match.marcatori || [])
            .filter(m => m.playerId === playerId)
            .reduce((sum, m) => sum + (m.gol || 1), 0);

        // Get yellow cards
        const yellowCards = match.ammonizioni.filter(id => id === playerId).length;

        // Update stats
        const statsUpdate = {
            punti_mvp: (player.punti_mvp || 0) + (isMvpRossi || isMvpBlu ? (isWinner ? 3 : 1) : 0),
            partite_vinte: (player.partite_vinte || 0) + (isWinner ? 1 : 0),
            presenze: (player.presenze || 0) + 1,
            gol_segnati: (player.gol_segnati || 0) + playerGoals,
            ammonizioni_ricevute: (player.ammonizioni_ricevute || 0) + yellowCards,
            partite_rossi: (player.partite_rossi || 0) + (isRossi ? 1 : 0),
            partite_blu: (player.partite_blu || 0) + (isBlu ? 1 : 0)
        };

        updates.push({ id: playerId, stats: statsUpdate });
    }

    // Apply updates
    for (const update of updates) {
        await db.update('players', update.id, update.stats);
    }

    return updates;
}

export function getPlayerYearlyStats(player, matches) {
    const currentYear = new Date().getFullYear();
    const closedYearMatches = matches.filter(m =>
        m.stato === STATI.CHIUSA &&
        new Date(m.data).getFullYear() === currentYear
    );

    if (closedYearMatches.length === 0) {
        return {
            presenze: 0,
            totali: 0,
            percentuale: 0
        };
    }

    const presenze = closedYearMatches.filter(m =>
        (m.squadraRossa || []).includes(player.id) ||
        (m.squadraBlu || []).includes(player.id)
    ).length;

    return {
        presenze,
        totali: closedYearMatches.length,
        percentuale: Math.round((presenze / closedYearMatches.length) * 100)
    };
}

// ================================
// Leaderboards
// ================================

export function getLeaderboard(players, category = 'mvp', limit = 10) {
    const sorted = [...players].sort((a, b) => {
        switch (category) {
            case 'mvp':
                return (b.punti_mvp || 0) - (a.punti_mvp || 0);
            case 'presenze':
                return (b.presenze || 0) - (a.presenze || 0);
            case 'gol':
                return (b.gol_segnati || 0) - (a.gol_segnati || 0);
            case 'ammonizioni':
                return (b.ammonizioni_ricevute || 0) - (a.ammonizioni_ricevute || 0);
            case 'vittorie':
                return (b.partite_vinte || 0) - (a.partite_vinte || 0);
            default:
                return 0;
        }
    });

    return sorted.slice(0, limit).map((player, index) => ({
        rank: index + 1,
        player,
        value: getStatValue(player, category)
    }));
}

function getStatValue(player, category) {
    switch (category) {
        case 'mvp': return player.punti_mvp || 0;
        case 'presenze': return player.presenze || 0;
        case 'gol': return player.gol_segnati || 0;
        case 'ammonizioni': return player.ammonizioni_ricevute || 0;
        case 'vittorie': return player.partite_vinte || 0;
        default: return 0;
    }
}

// ================================
// Match Statistics
// ================================

export function getMatchesStats(matches) {
    const closed = matches.filter(m => m.stato === STATI.CHIUSA);

    if (closed.length === 0) {
        return {
            totalMatches: 0,
            rossiWins: 0,
            bluWins: 0,
            draws: 0,
            totalGoals: 0,
            avgGoalsPerMatch: 0,
            results: []
        };
    }

    let rossiWins = 0;
    let bluWins = 0;
    let draws = 0;
    let totalGoals = 0;

    const results = closed.map(m => {
        const result = getMatchResult(m);
        const goals = (m.gol_rossi || 0) + (m.gol_blu || 0);
        totalGoals += goals;

        if (result === 'rossi') rossiWins++;
        else if (result === 'blu') bluWins++;
        else draws++;

        return {
            date: m.data,
            gol_rossi: m.gol_rossi,
            gol_blu: m.gol_blu,
            result
        };
    });

    return {
        totalMatches: closed.length,
        rossiWins,
        bluWins,
        draws,
        totalGoals,
        avgGoalsPerMatch: Math.round(totalGoals / closed.length * 10) / 10,
        results: results.reverse() // Most recent first
    };
}

// ================================
// Export Functions
// ================================

export function exportToExcel(data, filename) {
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
    html += '<body><table>';

    // Headers
    const headers = Object.keys(data[0] || {});
    html += '<thead><tr>';
    headers.forEach(h => {
        html += `<th style="background-color: #f0f0f0; border: 1px solid #ccc;">${h}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    data.forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
            let val = row[h];
            if (val === null || val === undefined) val = '';
            html += `<td style="border: 1px solid #ccc;">${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xls`;
    link.click();
}

export function exportPlayersToExcel(players, matches) {
    const currentYear = new Date().getFullYear();
    const data = players.map(p => {
        const yearly = matches ? getPlayerYearlyStats(p, matches) : null;
        return {
            Nome: p.nome,
            Cognome: p.cognome,
            Soprannome: p.soprannome || '',
            Ruolo: p.ruolo_principale || '',
            Tipologia: p.tipologia || '',
            'Punti MVP': p.punti_mvp || 0,
            'Partite Vinte': p.partite_vinte || 0,
            [`Presenze (${currentYear})`]: yearly ? yearly.presenze : p.presenze || 0,
            'Partite Rate%': yearly ? `${yearly.percentuale}%` : '-',
            Gol: p.gol_segnati || 0,
            Ammonizioni: p.ammonizioni_ricevute || 0,
            'Partite Rossi': p.partite_rossi || 0,
            'Partite Blu': p.partite_blu || 0
        };
    });

    exportToExcel(data, 'giocatori_calcetto');
}

export function exportMatchesToExcel(matches) {
    const data = matches.filter(m => m.stato === STATI.CHIUSA).map(m => ({
        Data: m.data,
        Luogo: m.luogo,
        Tipologia: m.tipologia,
        'Gol Rossi': m.gol_rossi,
        'Gol Blu': m.gol_blu,
        Risultato: getMatchResult(m) === 'rossi' ? 'Rossi' :
            getMatchResult(m) === 'blu' ? 'Blu' : 'Pareggio'
    }));

    exportToExcel(data, 'partite_calcetto');
}

export function exportLeaderboardToExcel(players, matches) {
    const currentYear = new Date().getFullYear();
    const data = players.map(p => {
        const yearly = matches ? getPlayerYearlyStats(p, matches) : null;
        const presenze = yearly ? yearly.presenze : p.presenze || 0;

        return {
            Giocatore: `${p.nome} ${p.cognome}`,
            'Punti MVP': p.punti_mvp || 0,
            [`Presenze (${currentYear})`]: presenze,
            'Partite Rate%': yearly ? `${yearly.percentuale}%` : '-',
            Gol: p.gol_segnati || 0,
            Vittorie: p.partite_vinte || 0,
            Ammonizioni: p.ammonizioni_ricevute || 0,
            'Media Gol': presenze ? (p.gol_segnati / presenze).toFixed(2) : 0,
            'Win Rate %': presenze ? ((p.partite_vinte / presenze) * 100).toFixed(1) : 0
        };
    });

    exportToExcel(data, 'classifiche_calcetto');
}

export default {
    updatePlayerStats,
    getLeaderboard,
    getMatchesStats,
    exportPlayersToExcel,
    exportMatchesToExcel,
    exportLeaderboardToExcel
};
