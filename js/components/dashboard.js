// ================================
// DASHBOARD COMPONENT
// ================================

import { store } from '../store.js';
import {
    getActiveMatch,
    getRecentClosedMatch,
    formatMatchDate,
    getStateLabel,
    getPlayerResponse,
    getConvocationStats,
    getMaxPlayers,
    STATI,
    RISPOSTE,
    getMatchIdentifier
} from '../matches.js';
import { getPlayerDisplayName } from '../players.js';
import { escapeHtml } from '../utils.js';


export async function renderDashboard(container, state) {
    const { players, matches, currentUser } = state;

    const activeMatch = getActiveMatch(matches);
    const recentClosed = getRecentClosedMatch(matches, 3);

    let html = '<div class="page">';

    // Welcome message
    html += renderBirthdayGreeting(currentUser);


    // Active match (Top Priority)
    if (activeMatch) {
        html += renderActiveMatch(activeMatch, players, matches, currentUser);
    }

    // Recent closed match (Below active)
    if (recentClosed) {
        html += renderClosedMatch(recentClosed, players, matches);
    }

    // Empty state (only if neither exists)
    if (!activeMatch && !recentClosed) {
        html += `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-title">Nessuna partita in programma</div>
                <p class="empty-state-text">
                    Attendi che un amministratore crei la prossima partita
                </p>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderClosedMatch(match, players, matches) {
    const mvpRossi = players.find(p => p.id === match.mvp_rossi);
    const mvpBlu = players.find(p => p.id === match.mvp_blu);

    const winner = match.gol_rossi > match.gol_blu ? 'rossi' :
        match.gol_blu > match.gol_rossi ? 'blu' : 'pareggio';

    // Group scorers
    const rossiScorers = (match.marcatori || []).filter(m => match.squadraRossa.includes(m.playerId));
    const bluScorers = (match.marcatori || []).filter(m => match.squadraBlu.includes(m.playerId));

    const renderScorers = (scorers) => {
        if (!scorers.length) return '';
        return scorers
            .map(m => {
                const p = players.find(pl => pl.id === m.playerId);
                const name = p ? (p.soprannome || p.nome) : '???';
                return `<div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${name} <span style="font-weight: 600; color: var(--color-text-primary);">(${m.gol})</span></div>`;
            })
            .join('');
    };

    return `
        <div class="card match-card">
            <div class="card-header">
                    <div>
                        <div class="match-date" style="font-size: var(--font-size-lg); color: var(--color-text-primary); margin-bottom: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                            #${getMatchIdentifier(match, matches)} • ${formatMatchDate(match.data)}
                        </div>
                        <span class="card-title">Ultima partita</span>
                    </div>
                <span class="match-status chiusa">Ultima partita</span>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--spacing-2) var(--spacing-4); align-items: start;">
                    <!-- Team Headers & Scores -->
                    <div style="grid-column: 1; text-align: center;">
                        <div class="team-name rossi">ROSSI</div>
                        <div class="team-score" style="color: ${winner === 'rossi' ? 'var(--color-team-red-dark)' : 'inherit'}">
                            ${match.gol_rossi}
                        </div>
                    </div>

                    <div class="vs" style="grid-column: 2; margin-top: 15px; font-weight: 700; color: var(--color-text-muted);">-</div>

                    <div style="grid-column: 3; text-align: center;">
                        <div class="team-name blu">BLU</div>
                        <div class="team-score" style="color: ${winner === 'blu' ? 'var(--color-team-blue-dark)' : 'inherit'}">
                            ${match.gol_blu}
                        </div>
                    </div>

                    <!-- Scorers Row -->
                    <div style="grid-column: 1; text-align: center; min-height: 20px;">
                        ${renderScorers(rossiScorers)}
                    </div>
                    
                    <div style="grid-column: 3; text-align: center; min-height: 20px;">
                        ${renderScorers(bluScorers)}
                    </div>

                    <!-- Player Lists Row -->
                    <div style="grid-column: 1; margin-top: var(--spacing-1); padding-top: var(--spacing-2); border-top: 1px dashed var(--color-border); text-align: left;">
                        ${match.squadraRossa.map(id => {
        const p = players.find(pl => pl.id === id);
        if (!p) return '';
        return `<div style="font-size: var(--font-size-xs); color: var(--color-team-red-dark); font-weight: 600; padding: 2px 0;">${getPlayerDisplayName(p)}</div>`;
    }).join('')}
                    </div>

                    <div style="grid-column: 3; margin-top: var(--spacing-1); padding-top: var(--spacing-2); border-top: 1px dashed var(--color-border); text-align: left;">
                        ${match.squadraBlu.map(id => {
        const p = players.find(pl => pl.id === id);
        if (!p) return '';
        return `<div style="font-size: var(--font-size-xs); color: var(--color-team-blue-dark); font-weight: 600; padding: 2px 0;">${getPlayerDisplayName(p)}</div>`;
    }).join('')}
                    </div>
                </div>
                
                ${mvpRossi || mvpBlu ? `
                    <div style="margin-top: var(--spacing-4); padding-top: var(--spacing-4); border-top: 1px solid var(--color-border); text-align: center;">
                        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-2);">MVP del Match</div>
                        <div style="display: flex; gap: var(--spacing-4); justify-content: center;">
                            ${mvpRossi ? `
                                <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                                    <span style="font-size: 1.2rem;">🏆</span>
                                    <span style="font-weight: 700; color: var(--color-team-red-dark);">${getPlayerDisplayName(mvpRossi)}</span>
                                </div>
                            ` : ''}
                            ${mvpBlu ? `
                                <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                                    <span style="font-size: 1.2rem;">🏆</span>
                                    <span style="font-weight: 700; color: var(--color-team-blue-dark);">${getPlayerDisplayName(mvpBlu)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                ${match.commento ? `
                    <div style="margin-top: var(--spacing-4); padding: var(--spacing-3); background: var(--color-bg); border-radius: var(--radius-md); border-left: 4px solid var(--color-primary);">
                         <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-1); font-weight: 700;">Cronaca della Partita</div>
                        <p style="font-size: var(--font-size-sm); color: var(--color-text-primary); font-style: italic; line-height: 1.5;">
                            "${match.commento}"
                        </p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderActiveMatch(match, players, allMatches, currentUser) {
    const stats = getConvocationStats(match);
    const userResponse = currentUser.id !== 'admin' ? getPlayerResponse(match, currentUser.id) : null;
    const isConvoked = match.convocatiIds?.includes(currentUser.id);



    const maxPlayers = getMaxPlayers(match.tipologia);

    // Get present players details
    const presentPlayersIds = Object.entries(match.convocazioni || {})
        .filter(([_, status]) => status === RISPOSTE.PRESENTE)
        .map(([id, _]) => id);

    const presentPlayersList = presentPlayersIds.map(id => players.find(p => p.id === id)).filter(Boolean);

    let html = `
        <div class="match-active-card">
            <div class="card-header">
                <div>
                     <div style="font-size: var(--font-size-xl); color: var(--color-text-primary); font-weight: 800; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">
                        #${getMatchIdentifier(match, allMatches)}
                    </div>
                    <span class="match-date" style="font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-primary); text-transform: uppercase;">${formatMatchDate(match.data)} • ${escapeHtml(match.orario)} • ${escapeHtml(match.luogo)}</span>
                </div>
                <div style="font-size: var(--font-size-lg); font-weight: 600; color: var(--color-primary);">${(match.tipologia || '').toUpperCase()}</div>
            </div>
            <div class="card-body">
                <div style="text-align: center; margin-bottom: var(--spacing-4);">
                    <div style="font-size: var(--font-size-lg); font-weight: 600; color: var(--color-primary);">${(match.tipologia || '').toUpperCase()}</div>
                    
                    <!-- Player Count -->
                    <div class="player-count-badge ${stats.presente >= maxPlayers ? 'complete' : ''}" style="margin-top: var(--spacing-2);">
                        <span class="count">${stats.presente}</span>
                        <span class="separator">/</span>
                        <span class="total">${maxPlayers}</span>
                        <span class="label">Giocatori</span>
                    </div>
                </div>
    `;

    // Convocation buttons (show for all players if match is open)
    if (match.stato === STATI.CREATA || match.stato === STATI.COMPLETA) {
        html += `
            <div class="convocation-buttons">
                <button class="convocation-btn presente ${userResponse === RISPOSTE.PRESENTE ? 'active' : ''}"
                        data-action="respond-convocation" 
                        data-match-id="${match.id}" 
                        data-risposta="${RISPOSTE.PRESENTE}">
                    ✓ Presente
                </button>
                <button class="convocation-btn forse ${userResponse === RISPOSTE.FORSE ? 'active' : ''}"
                        data-action="respond-convocation" 
                        data-match-id="${match.id}" 
                        data-risposta="${RISPOSTE.FORSE}">
                    ? Forse
                </button>
                <button class="convocation-btn assente ${userResponse === RISPOSTE.ASSENTE ? 'active' : ''}"
                        data-action="respond-convocation" 
                        data-match-id="${match.id}" 
                        data-risposta="${RISPOSTE.ASSENTE}">
                    ✗ Assente
                </button>
            </div>
        `;
    }

    // Convocation stats
    if (match.stato === STATI.CREATA || match.stato === STATI.COMPLETA) {
        html += `
            <div class="stats-grid" style="margin-top: var(--spacing-4);">
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--color-success);">${stats.presente}</div>
                    <div class="stat-label">Presenti</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--color-warning);">${stats.forse}</div>
                    <div class="stat-label">Forse</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--color-error);">${stats.assente}</div>
                    <div class="stat-label">Assenti</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--color-text-muted);">${stats.in_attesa}</div>
                    <div class="stat-label">In attesa</div>
                </div>
            </div>
        `;
    }

    // Present Players List (MOVED HERE)
    if (presentPlayersList.length > 0 && match.stato !== STATI.PUBBLICATA && match.stato !== STATI.CHIUSA) {
        html += `
            <div class="present-players-section" style="margin-top: var(--spacing-6);">
                <h4 class="section-title">Presenti (${presentPlayersList.length})</h4>
                <div class="present-players-grid">
                    ${presentPlayersList.map(p => {
            let nameStyle = '';
            if (match.squadraRossa?.includes(p.id)) nameStyle = 'color: var(--color-team-red-dark); font-weight: 700;';
            if (match.squadraBlu?.includes(p.id)) nameStyle = 'color: var(--color-team-blue-dark); font-weight: 700;';

            return `
                        <div class="mini-player-card">
                            <div class="player-avatar" ${p.foto ? `data-photo="${p.foto}"` : ''} style="${nameStyle ? 'border: 2px solid ' + (match.squadraRossa?.includes(p.id) ? 'var(--color-team-red-dark)' : 'var(--color-team-blue-dark)') : ''}">
                                ${p.foto ?
                    `<img src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nome)}">` :
                    escapeHtml((p.soprannome || p.nome).charAt(0).toUpperCase())}
                            </div>
                            <div class="player-name-small" style="${nameStyle}">${escapeHtml(p.soprannome || p.nome)}</div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    }

    // Teams display (if published)
    if (match.stato === STATI.PUBBLICATA || match.stato === STATI.SQUADRE_GENERATE) {
        const rossiPlayers = match.squadraRossa.map(id => players.find(p => p.id === id)).filter(Boolean);
        const bluPlayers = match.squadraBlu.map(id => players.find(p => p.id === id)).filter(Boolean);

        html += `
            <div class="team-builder">
                <div class="team-column rossi">
                    <div class="team-column-header">ROSSI (${rossiPlayers.length})</div>
                    <div class="team-column-body">
                        ${rossiPlayers.map(p => `
                            <div class="player-item" style="padding: var(--spacing-2);">
                                <div class="player-avatar" style="width: 24px; height: 24px; font-size: 0.7em;">
                                    ${p.foto ? `<img src="${p.foto}">` : (p.soprannome || p.nome).charAt(0).toUpperCase()}
                                </div>
                                <span style="font-size: var(--font-size-sm); color: var(--color-team-red-dark); font-weight: 700;">${getPlayerDisplayName(p)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="team-column blu">
                    <div class="team-column-header">BLU (${bluPlayers.length})</div>
                    <div class="team-column-body">
                        ${bluPlayers.map(p => `
                            <div class="player-item" style="padding: var(--spacing-2);">
                                <div class="player-avatar" style="width: 24px; height: 24px; font-size: 0.7em;">
                                    ${p.foto ? `<img src="${p.foto}">` : (p.soprannome || p.nome).charAt(0).toUpperCase()}
                                </div>
                                <span style="font-size: var(--font-size-sm); color: var(--color-team-blue-dark); font-weight: 700;">${getPlayerDisplayName(p)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;


    }

    html += `
            </div>
        <div class="card-footer" style="text-align: center;">
            <button class="btn btn-secondary btn-sm" data-action="view-match" data-id="${match.id}">
                Vedi dettagli
            </button>
        </div>
        </div>
        `;

    return html;
}

function renderBirthdayGreeting(user) {
    if (!user || !user.data_nascita) return '';

    const today = new Date();
    // Use manual split to avoid timezone issues with new Date(string)
    const birthDateParts = user.data_nascita.split('-');
    if (birthDateParts.length !== 3) return '';

    const birthDay = parseInt(birthDateParts[2]);
    const birthMonth = parseInt(birthDateParts[1]) - 1; // JS months are 0-11

    const isBirthday = today.getDate() === birthDay &&
        today.getMonth() === birthMonth;

    if (!isBirthday) return '';

    const displayName = user.soprannome || user.nome;

    return `
        <div class="birthday-banner">
            <span class="greeting">🎂 TANTI AUGURI ${displayName.toUpperCase()}! 🎈</span>
            <span class="subtext">Oggi è il tuo giorno speciale, tutta l'Aldissima ti festeggia!</span>
        </div>
        `;
}

export default { renderDashboard };
