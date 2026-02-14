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

        // ALDINDEX: Result Punti (3 win, 1 draw) + 1 (presence)
        const aldPoints = (isWinner ? 3 : (isDraw ? 1 : 0)) + 1;

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
            aldIndex: 0,
            puntiPartita: 0,
            presenze: 0,
            vittorie: 0,
            pareggi: 0,
            sconfitte: 0,
            totali: 0,
            percentuale: 0,
            gol: 0,
            mediaGol: 0,
            mvpPoints: 0,
            mvpRate: 0,
            ammonizioni: 0,
            badGuyRate: 0
        };
    }

    const playerMatches = closedYearMatches.filter(m =>
        (m.squadraRossa || []).includes(player.id) ||
        (m.squadraBlu || []).includes(player.id)
    );

    const presenze = playerMatches.length;

    // Calculate goals in these matches
    const gol = playerMatches.reduce((sum, m) => {
        const playerGol = (m.marcatori || [])
            .filter(scorer => scorer.playerId === player.id)
            .reduce((s, scorer) => s + (scorer.gol || 1), 0);
        return sum + playerGol;
    }, 0);

    // Calculate MVP points in these matches
    const mvpPoints = playerMatches.reduce((sum, m) => {
        const isMvp = (m.mvp_rossi === player.id || m.mvp_blu === player.id);
        if (!isMvp) return sum;

        // Use the same logic as updatePlayerStats
        const isRossi = (m.squadraRossa || []).includes(player.id);
        const winner = m.gol_rossi > m.gol_blu ? 'rossi' : (m.gol_blu > m.gol_rossi ? 'blu' : 'pareggio');
        const isWinner = (winner === 'rossi' && isRossi) || (winner === 'blu' && !isRossi);

        return sum + (isWinner ? 3 : 1);
    }, 0);

    // Calculate cards in these matches
    const ammonizioni = playerMatches.reduce((sum, m) => {
        const playerAmmonizioni = (m.ammonizioni || []).filter(id => id === player.id).length;
        return sum + playerAmmonizioni;
    }, 0);

    // Calculate ALDINDEX in these matches
    const aldIndex = playerMatches.reduce((sum, m) => {
        const isRossi = (m.squadraRossa || []).includes(player.id);
        const winner = m.gol_rossi > m.gol_blu ? 'rossi' : (m.gol_blu > m.gol_rossi ? 'blu' : 'pareggio');
        const isWinner = (winner === 'rossi' && isRossi) || (winner === 'blu' && !isRossi);
        const isDraw = winner === 'pareggio';
        const points = (isWinner ? 3 : (isDraw ? 1 : 0)) + 1;
        return sum + points;
    }, 0);

    // Detailed stats for export
    const winResults = playerMatches.filter(m => {
        const isRossi = (m.squadraRossa || []).includes(player.id);
        const winner = m.gol_rossi > m.gol_blu ? 'rossi' : (m.gol_blu > m.gol_rossi ? 'blu' : 'pareggio');
        return (winner === 'rossi' && isRossi) || (winner === 'blu' && !isRossi);
    }).length;

    const drawResults = playerMatches.filter(m => {
        return m.gol_rossi === m.gol_blu;
    }).length;

    const lossResults = presenze - winResults - drawResults;
    const puntiPartita = (winResults * 3) + (drawResults * 1);

    const calculateRate = (value, count) => {
        if (!count) return 0;
        return Math.round((value / count) * 100);
    };

    const calculateAvg = (value, count) => {
        if (!count) return 0;
        return Math.round((value / count) * 100) / 100;
    };

    return {
        aldIndex,
        puntiPartita,
        presenze,
        vittorie: winResults,
        pareggi: drawResults,
        sconfitte: lossResults,
        totali: closedYearMatches.length,
        percentuale: calculateRate(presenze, closedYearMatches.length),
        gol,
        mediaGol: calculateAvg(gol, presenze),
        mvpPoints,
        mvpRate: calculateAvg(mvpPoints, presenze),
        ammonizioni,
        badGuyRate: calculateAvg(ammonizioni, presenze),
        winRate: calculateRate(winResults, presenze)
    };
}

// ================================
// Leaderboards
// ================================

export function getLeaderboard(players, category = 'mvp', limit = 10) {
    const sorted = [...players].sort((a, b) => {
        switch (category) {
            case 'ald_index':
                return (b.ald_index || 0) - (a.ald_index || 0);
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
        case 'ald_index': return player.ald_index || 0;
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
            [`Presenze (${currentYear})`]: yearly ? yearly.presenze : p.presenze || 0,
            'Partite giocate': yearly ? `${yearly.percentuale}%` : '-',
            [`Gol (${currentYear})`]: yearly ? yearly.gol : p.gol_segnati || 0,
            'GOL': yearly ? yearly.mediaGol : (p.presenze ? (p.gol_segnati / p.presenze).toFixed(2) : 0),
            [`Punti MVP (${currentYear})`]: yearly ? yearly.mvpPoints : p.punti_mvp || 0,
            'MVP': yearly ? `${yearly.mvpRate}%` : '-',
            [`Ammonizioni (${currentYear})`]: yearly ? yearly.ammonizioni : p.ammonizioni_ricevute || 0,
            'AMMONIZIONI': yearly ? `${yearly.badGuyRate}%` : '-',
            'Partite Vinte (Tot)': p.partite_vinte || 0,
            'Presenze (Tot)': p.presenze || 0
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
            [`Presenze (${currentYear})`]: presenze,
            'Partite giocate': yearly ? `${yearly.percentuale}%` : '-',
            [`Gol (${currentYear})`]: yearly ? yearly.gol : p.gol_segnati || 0,
            'GOL': yearly ? yearly.mediaGol : (presenze ? (p.gol_segnati / presenze).toFixed(2) : 0),
            [`Punti MVP (${currentYear})`]: yearly ? yearly.mvpPoints : p.punti_mvp || 0,
            'MVP': yearly ? `${yearly.mvpRate}%` : '-',
            [`Ammonizioni (${currentYear})`]: yearly ? yearly.ammonizioni : p.ammonizioni_ricevute || 0,
            'AMMONIZIONI': yearly ? `${yearly.badGuyRate}%` : '-',
            'Vittorie (Tot)': p.partite_vinte || 0
        };
    });

    exportToExcel(data, 'classifiche_calcetto');
}

export function exportStatsToXlsx(players, matches) {
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS (XLSX) library not loaded');
        // Fallback to old CSV/XLS format if library missing
        exportLeaderboardToExcel(players, matches);
        return;
    }

    const currentYear = new Date().getFullYear();

    // 1. CLASSICHE SHEET
    const classificheData = players.map(p => {
        const stats = getPlayerYearlyStats(p, matches);
        return {
            'Nome': p.nome,
            'Cognome': p.cognome,
            'Soprannome': p.soprannome || '',
            'Ruolo 1': p.ruolo_principale || '',
            'Ruolo 2': p.ruolo_secondario || '',
            'Tipologia': (p.tipologia || 'riserva').charAt(0).toUpperCase() + (p.tipologia || 'riserva').slice(1),
            'ALDINDEX': stats.aldIndex,
            'PT': stats.puntiPartita,
            'G': stats.presenze,
            'V': stats.vittorie,
            'N': stats.pareggi,
            'P': stats.sconfitte,
            'GF': stats.gol,
            'Punti MVP': stats.mvpPoints,
            'Ammonizioni': stats.ammonizioni
        };
    }).sort((a, b) => b.ALDINDEX - a.ALDINDEX);

    // 2. PARTITE SHEET
    const partiteData = matches.filter(m => m.stato === STATI.CHIUSA).map(m => ({
        'Data': m.data,
        'Orario': m.orario,
        'Luogo': m.luogo,
        'Tipologia': m.tipologia,
        'Gol Rossi': m.gol_rossi,
        'Gol Blu': m.gol_blu,
        'Risultato': getMatchResult(m).toUpperCase(),
        'MVP Rossi': players.find(p => p.id === m.mvp_rossi)?.nome || '',
        'MVP Blu': players.find(p => p.id === m.mvp_blu)?.nome || ''
    }));

    // Create workbook and add sheets
    const wb = XLSX.utils.book_new();
    const wsClassifiche = XLSX.utils.json_to_sheet(classificheData);
    const wsPartite = XLSX.utils.json_to_sheet(partiteData);

    XLSX.utils.book_append_sheet(wb, wsClassifiche, "Classifiche");
    XLSX.utils.book_append_sheet(wb, wsPartite, "Partite");

    // Generate and download
    XLSX.writeFile(wb, `Aldissima_Export_${currentYear}.xlsx`);
}

export default {
    updatePlayerStats,
    getLeaderboard,
    getMatchesStats,
    exportPlayersToExcel,
    exportMatchesToExcel,
    exportLeaderboardToExcel,
    exportStatsToXlsx
};
