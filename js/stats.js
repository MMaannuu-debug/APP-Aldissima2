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
        const isMvpRossi = match.mvpRossi === playerId;
        const isMvpBlu = match.mvpBlu === playerId;

        if (isMvpRossi || isMvpBlu) {
            if (isWinner) points += 3;
            else points += 1;
        }

        // Get goals for this player
        const playerGoals = match.marcatori
            .filter(m => m.playerId === playerId)
            .reduce((sum, m) => sum + (m.gol || 1), 0);

        // Get yellow cards
        const yellowCards = match.cartellini.filter(id => id === playerId).length;

        // Update stats
        const statsUpdate = {
            puntiMVP: (player.puntiMVP || 0) + (isMvpRossi || isMvpBlu ? (isWinner ? 3 : 1) : 0),
            partiteVinte: (player.partiteVinte || 0) + (isWinner ? 1 : 0),
            presenze: (player.presenze || 0) + 1,
            golSegnati: (player.golSegnati || 0) + playerGoals,
            cartelliniRicevuti: (player.cartelliniRicevuti || 0) + yellowCards,
            partiteRossi: (player.partiteRossi || 0) + (isRossi ? 1 : 0),
            partiteBlu: (player.partiteBlu || 0) + (isBlu ? 1 : 0)
        };

        updates.push({ id: playerId, stats: statsUpdate });
    }

    // Apply updates
    for (const update of updates) {
        await db.update('players', update.id, update.stats);
    }

    return updates;
}

// ================================
// Leaderboards
// ================================

export function getLeaderboard(players, category = 'mvp', limit = 10) {
    const sorted = [...players].sort((a, b) => {
        switch (category) {
            case 'mvp':
                return (b.puntiMVP || 0) - (a.puntiMVP || 0);
            case 'presenze':
                return (b.presenze || 0) - (a.presenze || 0);
            case 'gol':
                return (b.golSegnati || 0) - (a.golSegnati || 0);
            case 'cartellini':
                return (b.cartelliniRicevuti || 0) - (a.cartelliniRicevuti || 0);
            case 'vittorie':
                return (b.partiteVinte || 0) - (a.partiteVinte || 0);
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
        case 'mvp': return player.puntiMVP || 0;
        case 'presenze': return player.presenze || 0;
        case 'gol': return player.golSegnati || 0;
        case 'cartellini': return player.cartelliniRicevuti || 0;
        case 'vittorie': return player.partiteVinte || 0;
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
        const goals = (m.golRossi || 0) + (m.golBlu || 0);
        totalGoals += goals;

        if (result === 'rossi') rossiWins++;
        else if (result === 'blu') bluWins++;
        else draws++;

        return {
            date: m.data,
            golRossi: m.golRossi,
            golBlu: m.golBlu,
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

export function exportPlayersToExcel(players) {
    const data = players.map(p => ({
        Nome: p.nome,
        Cognome: p.cognome,
        Soprannome: p.soprannome || '',
        Ruolo: p.ruoloPrincipale || '',
        Tipologia: p.tipologia || '',
        'Punti MVP': p.puntiMVP || 0,
        'Partite Vinte': p.partiteVinte || 0,
        Presenze: p.presenze || 0,
        Gol: p.golSegnati || 0,
        Cartellini: p.cartelliniRicevuti || 0,
        'Partite Rossi': p.partiteRossi || 0,
        'Partite Blu': p.partiteBlu || 0
    }));

    exportToExcel(data, 'giocatori_calcetto');
}

export function exportMatchesToExcel(matches) {
    const data = matches.filter(m => m.stato === STATI.CHIUSA).map(m => ({
        Data: m.data,
        Luogo: m.luogo,
        Tipologia: m.tipologia,
        'Gol Rossi': m.golRossi,
        'Gol Blu': m.golBlu,
        Risultato: getMatchResult(m) === 'rossi' ? 'Rossi' :
            getMatchResult(m) === 'blu' ? 'Blu' : 'Pareggio'
    }));

    exportToExcel(data, 'partite_calcetto');
}

export function exportLeaderboardToExcel(players) {
    // Collect all data in one sheet vertically? Or just export MVP for now?
    // User requested "export delle classifiche", let's export all main stats

    const data = players.map(p => ({
        Giocatore: `${p.nome} ${p.cognome}`,
        'Punti MVP': p.puntiMVP || 0,
        Presenze: p.presenze || 0,
        Gol: p.golSegnati || 0,
        Vittorie: p.partiteVinte || 0,
        Cartellini: p.cartelliniRicevuti || 0,
        'Media Gol': p.presenze ? (p.golSegnati / p.presenze).toFixed(2) : 0,
        'Win Rate %': p.presenze ? ((p.partiteVinte / p.presenze) * 100).toFixed(1) : 0
    }));

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
