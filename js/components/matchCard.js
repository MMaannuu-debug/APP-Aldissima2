// ================================
// MATCH CARD COMPONENT
// ================================

import { store } from '../store.js';
import db from '../db.js';
import {
    updateConvocations,
    updateTeams,
    setTeams,
    resetTeams,
    setResults,
    deleteMatch,
    getAllMatches,
    getMatchIdentifier,
    getMatchWithDetails,
    formatMatchDate,
    getConvocationStats,
    getMaxPlayers,
    getPlayerResponse,
    getStateLabel,
    STATI,
    RISPOSTE,
    TIPOLOGIE
} from '../matches.js';
import { getPlayerDisplayName, getPlayerInitials } from '../players.js';
import { createBalancedTeams, calculateBalance, getTeamStats } from '../teams.js';
import { updatePlayerStats } from '../stats.js';
import { showModal, closeModal, showToast, refreshCurrentPage } from '../../app.js';
import { escapeHtml } from '../utils.js';

export async function renderMatches(container, state) {
    const { matches, players } = state;
    const isAdmin = store.isAdmin();
    const isSupervisor = store.isSupervisor();

    // Sort by date descending
    const sortedMatches = [...matches].sort((a, b) =>
        new Date(b.data) - new Date(a.data)
    );

    let html = `
        <div class="page">
            <div class="section-header">
                <h2 class="section-title">Partite</h2>
                ${isAdmin ? `
                    <button class="btn btn-primary btn-sm" id="create-match-btn">
                        + Nuova partita
                    </button>
                ` : ''}
            </div>
            
            ${sortedMatches.length > 0 ? sortedMatches.map(match => `
                <div class="match-card" data-id="${match.id}" data-action="view-match" style="cursor: pointer;">
                    <div class="match-card-header">
                        <div class="match-date">
                            <span style="font-weight: 700; color: var(--color-primary); margin-right: var(--spacing-2);">#${getMatchIdentifier(match, matches)}</span>
                            ${formatMatchDate(match.data)} - ${match.orario}
                        </div>
                        <div class="match-status ${match.stato}">
                            ${match.stato.replace('_', ' ')}
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600;">📍 ${escapeHtml(match.luogo)}</div>
                                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                    ${match.orario} • ${match.tipologia}
                                </div>
                            </div>
                            ${match.stato === STATI.CHIUSA ? `
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-size-2xl); font-weight: 700;">
                                        <span style="color: var(--color-team-red-dark);">${match.gol_rossi}</span>
                                        <span style="color: var(--color-text-muted);"> - </span>
                                        <span style="color: var(--color-team-blue-dark);">${match.gol_blu}</span>
                                    </div>
                                </div>
                            ` : `
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-primary);">
                                        ${getConvocationStats(match).presente}
                                    </div>
                                    <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
                                        presenti
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-title">Nessuna partita</div>
                    <p class="empty-state-text">Non ci sono partite in programma</p>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;

    // Create match button handler
    if (isAdmin) {
        document.getElementById('create-match-btn')?.addEventListener('click', () => {
            renderMatchForm(null);
        });
    }
}

export async function renderMatchModal(matchId) {
    const match = await getMatchWithDetails(matchId);
    if (!match) {
        showToast('Partita non trovata', 'error');
        return;
    }

    const players = store.getState().players;
    const matches = store.getState().matches;
    const isAdmin = store.isAdmin();
    const isSupervisor = store.isSupervisor();
    const currentUser = store.getState().currentUser;
    const stats = getConvocationStats(match);
    const isConvoked = match.convocatiIds?.includes(currentUser?.id);
    const userResponse = currentUser?.id !== 'admin' ? getPlayerResponse(match, currentUser.id) : null;

    let html = `
        <div class="modal-header">
            <div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 4px;">PARTITA #${getMatchIdentifier(match, matches)}</div>
                <h3 class="modal-title">${match.luogo}</h3>
            </div>
            <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
            <div style="text-align: center; margin-bottom: var(--spacing-4);">
                <span class="match-status ${match.stato}" style="font-size: var(--font-size-sm);">
                    ${getStateLabel(match.stato)}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-3); margin-bottom: var(--spacing-4);">
                <div>
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">Luogo</div>
                    <div style="font-weight: 600;">📍 ${escapeHtml(match.luogo)}</div>
                </div>
                <div>
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">Orario</div>
                    <div style="font-weight: 600;">🕐 ${match.orario}</div>
                </div>
                <div>
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">Tipologia</div>
                    <div style="font-weight: 600;">${match.tipologia}</div>
                </div>
                <div>
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">Max giocatori</div>
                    <div style="font-weight: 600;">${getMaxPlayers(match.tipologia)}</div>
                </div>
            </div>
    `;

    // Result if closed
    if (match.stato === STATI.CHIUSA) {
        const mvpRossi = players.find(p => p.id === match.mvp_rossi);
        const mvpBlu = players.find(p => p.id === match.mvp_blu);

        html += `
            <div style="background: var(--color-border-light); padding: var(--spacing-4); border-radius: var(--radius-lg); margin-bottom: var(--spacing-4); text-align: center;">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-2);">Risultato finale</div>
                <div style="font-size: 2.5rem; font-weight: 700;">
                    <span style="color: var(--color-team-red-dark);">${match.gol_rossi}</span>
                    <span style="color: var(--color-text-muted);"> - </span>
                    <span style="color: var(--color-team-blue-dark);">${match.gol_blu}</span>
                </div>
                
                <!-- Scorers -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4); margin-top: var(--spacing-3);">
                    <div style="text-align: right; border-right: 1px solid var(--color-border); padding-right: var(--spacing-3);">
                        ${(match.marcatori || [])
                .filter(m => match.squadraRossa.includes(m.playerId))
                .map(m => {
                    const p = players.find(pl => pl.id === m.playerId);
                    return `<div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${p ? getPlayerDisplayName(p) : '???'} <strong>(${m.gol})</strong></div>`;
                }).join('')}
                    </div>
                    <div style="text-align: left; padding-left: var(--spacing-3);">
                        ${(match.marcatori || [])
                .filter(m => match.squadraBlu.includes(m.playerId))
                .map(m => {
                    const p = players.find(pl => pl.id === m.playerId);
                    return `<div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);"><strong>(${m.gol})</strong> ${p ? getPlayerDisplayName(p) : '???'}</div>`;
                }).join('')}
                    </div>
                </div>

                <div style="display: flex; justify-content: center; gap: var(--spacing-6); margin-top: var(--spacing-4); padding-top: var(--spacing-4); border-top: 1px solid var(--color-border);">
                    <span style="font-size: var(--font-size-sm);">
                        🏆 Rossi: <strong>${getPlayerDisplayName(mvpRossi)}</strong>
                    </span>
                    <span style="font-size: var(--font-size-sm);">
                        🏆 Blu: <strong>${getPlayerDisplayName(mvpBlu)}</strong>
                    </span>
                </div>
            </div>
        `;
    }

    // Convocation response (if player is convoked and match is open)
    if (isConvoked && (match.stato === STATI.CREATA || match.stato === STATI.COMPLETA)) {
        html += `
            <div style="margin-bottom: var(--spacing-4);">
                <div style="font-weight: 600; margin-bottom: var(--spacing-2);">La tua risposta:</div>
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
            </div>
        `;
    }

    // Player list by status (for open matches)
    if (match.stato === STATI.CREATA || match.stato === STATI.COMPLETA) {
        const groupedPlayers = groupPlayersByResponse(match, players);

        html += `
            <div style="margin-bottom: var(--spacing-4);">
                <div style="font-weight: 600; margin-bottom: var(--spacing-2);">
                    Convocati (${stats.presente}/${getMaxPlayers(match.tipologia)})
                </div>
                
                ${renderPlayerGroup('Presenti', groupedPlayers.presente, 'var(--color-success)', match)}
                ${renderPlayerGroup('Forse', groupedPlayers.forse, 'var(--color-warning)', match)}
                ${renderPlayerGroup('Assenti', groupedPlayers.assente, 'var(--color-error)', match)}
                ${renderPlayerGroup('In attesa', groupedPlayers.in_attesa, 'var(--color-text-muted)', match)}
            </div>
        `;
    }

    // Teams (if generated)
    if (match.squadraRossa?.length > 0 || match.squadraBlu?.length > 0) {
        const rossiPlayers = match.squadraRossa.map(id => players.find(p => p.id === id)).filter(Boolean);
        const bluPlayers = match.squadraBlu.map(id => players.find(p => p.id === id)).filter(Boolean);
        const balance = calculateBalance(rossiPlayers, bluPlayers);

        html += `
            <div style="margin-bottom: var(--spacing-4);">
                <div style="font-weight: 600; margin-bottom: var(--spacing-2);">Squadre</div>
                
                <div class="team-balance">
                    <div class="balance-indicator">
                        <div class="balance-value" style="color: var(--color-primary);">${balance.index}%</div>
                        <div class="balance-label">Equilibrio</div>
                    </div>
                    <div class="balance-indicator">
                        <div class="balance-value">${balance.gap}</div>
                        <div class="balance-label">Gap punti</div>
                    </div>
                </div>
                
                <div class="team-builder">
                    <div class="team-column rossi">
                        <div class="team-column-header">ROSSI (${rossiPlayers.length})</div>
                        <div class="team-column-body">
                            ${rossiPlayers.map(p => `
                                <div class="player-item" style="padding: var(--spacing-2);">
                                    <div class="player-avatar" style="width: 32px; height: 32px; font-size: var(--font-size-sm);">
                                        ${p.foto ? `<img src="${p.foto}">` : getPlayerInitials(p)}
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
                                    <div class="player-avatar" style="width: 32px; height: 32px; font-size: var(--font-size-sm);">
                                        ${p.foto ? `<img src="${p.foto}">` : getPlayerInitials(p)}
                                    </div>
                                    <span style="font-size: var(--font-size-sm); color: var(--color-team-blue-dark); font-weight: 700;">${getPlayerDisplayName(p)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;


    }

    html += '</div>';

    // Footer with admin actions
    if (isAdmin) {
        html += `
            <div class="modal-footer" style="flex-wrap: wrap; gap: var(--spacing-2);">
                ${getAdminActions(match)}
            </div>
        `;
    } else {
        html += `
            <div class="modal-footer">
                <button class="btn btn-primary" data-action="close-modal" style="width: 100%;">Chiudi</button>
            </div>
        `;
    }

    showModal(html);
    setupMatchModalHandlers(match, players, matches);
}

function groupPlayersByResponse(match, players) {
    const groups = {
        presente: [],
        forse: [],
        assente: [],
        in_attesa: []
    };

    // 1. First, add everyone who has responded in match.convocazioni
    Object.entries(match.convocazioni || {}).forEach(([playerId, response]) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        if (groups[response]) {
            groups[response].push(player);
        }
    });

    // 2. Then, check match.convocatiIds for people who haven't responded yet
    (match.convocatiIds || []).forEach(playerId => {
        // If they already have a response, they are already handled above
        if (match.convocazioni && match.convocazioni[playerId]) return;

        const player = players.find(p => p.id === playerId);
        if (player) {
            groups.in_attesa.push(player);
        }
    });

    return groups;
}

function renderPlayerGroup(title, players, color, match) {
    if (players.length === 0) return '';

    return `
        <div style="margin-bottom: var(--spacing-2);">
            <div style="font-size: var(--font-size-sm); color: ${color}; margin-bottom: var(--spacing-1);">
                ${title} (${players.length})
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-1);">
                ${players.map(p => {
        let nameStyle = '';
        let bgStyle = 'background: var(--color-border-light);';

        if (match?.squadraRossa?.includes(p.id)) {
            nameStyle = 'color: var(--color-team-red-dark); font-weight: 700;';
            bgStyle = 'background: var(--color-team-red); border: 1px solid var(--color-team-red-dark);';
        }
        if (match?.squadraBlu?.includes(p.id)) {
            nameStyle = 'color: var(--color-team-blue-dark); font-weight: 700;';
            bgStyle = 'background: var(--color-team-blue); border: 1px solid var(--color-team-blue-dark);';
        }

        return `
                    <span style="${bgStyle} padding: var(--spacing-1) var(--spacing-2); border-radius: var(--radius-full); font-size: var(--font-size-sm); ${nameStyle}">
                        ${getPlayerDisplayName(p)}
                    </span>
                `}).join('')}
            </div>
        </div>
    `;
}

function getAdminActions(match) {
    let actions = '';

    switch (match.stato) {
        case STATI.CREATA:
        case STATI.COMPLETA:
            actions = `
                <button class="btn btn-secondary btn-sm" id="edit-match-btn">Modifica</button>
                <button class="btn btn-secondary btn-sm" id="convoke-btn">Convoca</button>
                <button class="btn btn-primary btn-sm" id="create-teams-btn">Crea squadre</button>
            `;
            break;
        case STATI.SQUADRE_GENERATE:
            actions = `
                <button class="btn btn-secondary btn-sm" id="reset-teams-btn">Reset squadre</button>
                <button class="btn btn-primary btn-sm" id="publish-teams-btn">Pubblica</button>
            `;
            break;
        case STATI.PUBBLICATA:
            actions = `
                <button class="btn btn-secondary btn-sm" id="reset-teams-btn">Modifica squadre</button>
                <button class="btn btn-primary btn-sm" id="insert-results-btn">Inserisci risultato</button>
            `;
            break;
        case STATI.CHIUSA:
            actions = `
                <button class="btn btn-secondary btn-sm" id="reopen-btn">Riapri partita</button>
            `;
            break;
    }

    actions += `<button class="btn btn-ghost btn-sm" data-action="close-modal">Chiudi</button>`;

    return actions;
}

function setupMatchModalHandlers(match, players, matches) {
    // Edit match
    document.getElementById('edit-match-btn')?.addEventListener('click', () => {
        closeModal();
        renderMatchForm(match);
    });

    // Convoke players
    document.getElementById('convoke-btn')?.addEventListener('click', () => {
        closeModal();
        renderConvocationModal(match, players);
    });

    // Create teams
    document.getElementById('create-teams-btn')?.addEventListener('click', () => {
        closeModal();
        renderTeamBuilder(match, players, matches);
    });

    // Publish teams
    document.getElementById('publish-teams-btn')?.addEventListener('click', async () => {
        try {
            await db.update('matches', match.id, {
                stato: STATI.PUBBLICATA
            });
            const updatedMatches = await db.getAll('matches');
            store.setState({ matches: updatedMatches });
            showToast('Squadre pubblicate!', 'success');
            renderMatchModal(match.id); // Refresh modal
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });

    // Reset teams
    document.getElementById('reset-teams-btn')?.addEventListener('click', async () => {
        if (!confirm('Sei sicuro di voler resettare le squadre?')) return;
        try {
            await resetTeams(match.id);
            showToast('Squadre resettate', 'success');
            renderMatchModal(match.id);
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });

    // Insert results
    document.getElementById('insert-results-btn')?.addEventListener('click', () => {
        closeModal();
        renderResultsForm(match, players);
    });

    // Reopen match
    document.getElementById('reopen-btn')?.addEventListener('click', async () => {
        try {
            await db.update('matches', match.id, { stato: STATI.PUBBLICATA });
            const updatedMatches = await db.getAll('matches');
            store.setState({ matches: updatedMatches });
            showToast('Partita riaperta', 'success');
            closeModal();
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });
}

// ================================
// Match Form
// ================================

export function renderMatchForm(match) {
    const isEdit = !!match;
    const isAdmin = store.isAdmin();

    // Default to next Tuesday
    const defaultDate = getNextTuesday().toISOString().split('T')[0];

    const html = `
        <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Modifica Partita' : 'Nuova Partita'}</h3>
            <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
            <form id="match-form">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="mf-data" value="${match?.data || defaultDate}" required>
                </div>
                <div class="form-group">
                    <label>Orario</label>
                    <input type="time" id="mf-orario" value="${match?.orario || '20:00'}" required>
                </div>
                <div class="form-group">
                    <label>Luogo</label>
                    <input type="text" id="mf-luogo" value="${match?.luogo || 'OGGIONA'}" required>
                </div>
                <div class="form-group">
                    <label>Tipologia</label>
                    <select id="mf-tipologia">
                        ${TIPOLOGIE.map(t => `
                            <option value="${t.value}" ${match?.tipologia === t.value ? 'selected' : ''}>
                                ${t.label} (${t.maxPlayers} giocatori)
                            </option>
                        `).join('')}
                    </select>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            ${isAdmin && isEdit ? `<button class="btn btn-danger btn-sm" id="delete-match-btn" style="margin-right: auto;">Elimina</button>` : ''}
            <button class="btn btn-secondary" data-action="close-modal">Chiudi</button>
            ${isAdmin && isEdit && match?.stato !== STATI.CHIUSA ? `
                <button class="btn btn-primary" id="edit-match-btn">Modifica</button>
            ` : ''}
            <button class="btn btn-primary" id="save-match-btn">Salva</button>
        </div>
    `;

    showModal(html);

    // Save handler
    document.getElementById('save-match-btn').addEventListener('click', async () => {
        let matchIdToRefresh = null;
        const data = {
            data: document.getElementById('mf-data').value,
            orario: document.getElementById('mf-orario').value,
            luogo: document.getElementById('mf-luogo').value.trim(),
            tipologia: document.getElementById('mf-tipologia').value
        };

        if (!data.data || !data.orario || !data.luogo) {
            showToast('Compila tutti i campi', 'error');
            return;
        }

        try {
            if (isEdit) {
                await db.update('matches', match.id, data);
            } else {
                // Calculate next progressive number for the year
                const year = new Date(data.data).getFullYear();
                const allMatches = await db.getAll('matches') || [];
                const yearMatches = allMatches.filter(m => m.data && new Date(m.data).getFullYear() === year);

                // Find max number
                let maxNum = 0;
                yearMatches.forEach(m => {
                    if (m.numero_partita && m.numero_partita > maxNum) maxNum = m.numero_partita;
                });

                // If no explicit numbers found, count existing + 1 (fallback)
                if (maxNum === 0 && yearMatches.length > 0) {
                    maxNum = yearMatches.length;
                }

                const newMatch = await db.add('matches', {
                    ...data,
                    numero_partita: maxNum + 1,
                    stato: STATI.CREATA,
                });
                matchIdToRefresh = newMatch.id;
            }

            const updatedMatches = await getAllMatches();
            store.setState({ matches: updatedMatches });

            showToast(isEdit ? 'Partita aggiornata!' : 'Partita creata!', 'success');

            if (matchIdToRefresh || match?.id) {
                renderMatchModal(matchIdToRefresh || match.id);
            } else {
                closeModal();
            }
            refreshCurrentPage();
        } catch (error) {
            console.error('Save match error:', error);
            showToast('Errore Salvataggio: ' + error.message, 'error');
            alert('Errore Critico: ' + error.message); // Fallback for visibility
        }
    });

    // Delete handler
    document.getElementById('delete-match-btn')?.addEventListener('click', async () => {
        if (!confirm('Sei sicuro di voler eliminare questa partita?')) return;

        try {
            await db.delete('matches', match.id);
            const updatedMatches = await db.getAll('matches');
            store.setState({ matches: updatedMatches });
            showToast('Partita eliminata', 'success');
            closeModal();
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });
}

// ================================
// Convocation Modal
// ================================

function renderConvocationModal(match, players) {
    const convocatiIds = match.convocatiIds || [];
    const titolari = players.filter(p => p.tipologia === 'titolare' && !p.bloccato);
    const riserve = players.filter(p => p.tipologia !== 'titolare' && !p.bloccato);

    const html = `
        <div class="modal-header">
            <h3 class="modal-title">Convoca giocatori</h3>
            <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
            <div style="margin-bottom: var(--spacing-4);">
                <h4 style="margin-bottom: var(--spacing-2);">Titolari</h4>
                ${titolari.map(p => renderConvocationPlayer(p, convocatiIds.includes(p.id), match.convocazioni?.[p.id])).join('')}
            </div>
            <div>
                <h4 style="margin-bottom: var(--spacing-2);">Riserve</h4>
                ${riserve.map(p => renderConvocationPlayer(p, convocatiIds.includes(p.id), match.convocazioni?.[p.id])).join('')}
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close-modal">Chiudi</button>
            <button class="btn btn-primary" id="save-convocations-btn">Salva convocazioni</button>
        </div>
    `;

    showModal(html);

    // Save convocations
    document.getElementById('save-convocations-btn').addEventListener('click', async () => {
        const modalBody = document.querySelector('.modal-body');
        const items = modalBody.querySelectorAll('.player-item');
        const newConvocatiIds = [];
        const convocazioni = { ...match.convocazioni };

        items.forEach(item => {
            const checkbox = item.querySelector('.convocation-checkbox');
            const select = item.querySelector('.convocation-select');
            const playerId = checkbox.dataset.playerId;

            if (checkbox.checked) {
                newConvocatiIds.push(playerId);
                convocazioni[playerId] = select.value;
            } else {
                delete convocazioni[playerId];
            }
        });

        try {
            await updateConvocations(match.id, newConvocatiIds, convocazioni);
            await getAllMatches();
            showToast('Convocazioni salvate!', 'success');
            renderMatchModal(match.id); // Refresh modal
            refreshCurrentPage();
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });
}


function renderConvocationPlayer(player, isConvoked, currentStatus) {
    const status = currentStatus || RISPOSTE.IN_ATTESA;

    return `
        <div class="player-item" style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-2) 0;">
            <label style="display: flex; align-items: center; cursor: pointer; flex: 1;">
                <input type="checkbox" class="convocation-checkbox" data-player-id="${player.id}" ${isConvoked ? 'checked' : ''} style="margin-right: var(--spacing-3);" onchange="this.closest('.player-item').querySelector('select').disabled = !this.checked">
                <div class="player-avatar" style="width: 36px; height: 36px; font-size: var(--font-size-sm); margin-right: var(--spacing-2);">
                    ${player.foto ? `<img src="${player.foto}">` : getPlayerInitials(player)}
                </div>
                <div class="player-info">
                    <div class="player-name">${getPlayerDisplayName(player)}</div>
                </div>
            </label>
            <select class="convocation-select" style="padding: var(--spacing-1); border-radius: var(--radius-sm); font-size: var(--font-size-sm); border: 1px solid var(--color-border);" ${!isConvoked ? 'disabled' : ''}>
                <option value="${RISPOSTE.IN_ATTESA}" ${status === RISPOSTE.IN_ATTESA ? 'selected' : ''}>In attesa</option>
                <option value="${RISPOSTE.PRESENTE}" ${status === RISPOSTE.PRESENTE ? 'selected' : ''}>Presente</option>
                <option value="${RISPOSTE.FORSE}" ${status === RISPOSTE.FORSE ? 'selected' : ''}>Forse</option>
                <option value="${RISPOSTE.ASSENTE}" ${status === RISPOSTE.ASSENTE ? 'selected' : ''}>Assente</option>
            </select>
        </div>
    `;
}

// ================================
// Team Builder Modal
// ================================

function renderTeamBuilder(match, players, matches) {
    const presentPlayers = Object.entries(match.convocazioni || {})
        .filter(([_, status]) => status === RISPOSTE.PRESENTE)
        .map(([id, _]) => players.find(p => p.id === id))
        .filter(Boolean);

    const rossiIds = match.squadraRossa || [];
    const bluIds = match.squadraBlu || [];

    const html = `
        <div class="modal-header">
            <div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 4px;">PARTITA #${getMatchIdentifier(match, matches)}</div>
                <h3 class="modal-title">${match.luogo}</h3>
            </div>
            <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
            <div class="team-balance" id="balance-display">
                <div class="balance-indicator">
                    <div class="balance-value" id="balance-index">--</div>
                    <div class="balance-label">Equilibrio</div>
                </div>
                <div class="balance-indicator">
                    <div class="balance-value" id="balance-gap">--</div>
                    <div class="balance-label">Gap</div>
                </div>
            </div>
            
            <div style="display: flex; gap: var(--spacing-2); margin-bottom: var(--spacing-4);">
                <button class="btn btn-secondary btn-sm" id="auto-balance-btn" style="flex: 1;">
                    🎲 Bilancia automaticamente
                </button>
                <button class="btn btn-ghost btn-sm" id="reset-assignment-btn">
                    ↺ Reset
                </button>
            </div>
            
            <div class="team-builder" id="team-builder">
                <div class="team-column rossi" id="team-rossi" data-team="rossi">
                    <div class="team-column-header">ROSSI (<span id="rossi-count">0</span>)</div>
                    <div class="team-column-body" id="rossi-list"></div>
                </div>
                <div class="team-column blu" id="team-blu" data-team="blu">
                    <div class="team-column-header">BLU (<span id="blu-count">0</span>)</div>
                    <div class="team-column-body" id="blu-list"></div>
                </div>
            </div>
            
            <div style="margin-top: var(--spacing-4);">
                <div style="font-weight: 600; margin-bottom: var(--spacing-2);">Non assegnati</div>
                <div id="unassigned-list" style="display: flex; flex-wrap: wrap; gap: var(--spacing-2);"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close-modal">Annulla</button>
            <button class="btn btn-primary" id="save-teams-btn">Salva squadre</button>
        </div>
    `;

    showModal(html);

    // State
    let assignments = {
        rossi: [...rossiIds],
        blu: [...bluIds]
    };

    function updateDisplay() {
        const rossiPlayers = assignments.rossi.map(id => presentPlayers.find(p => p.id === id)).filter(Boolean);
        const bluPlayers = assignments.blu.map(id => presentPlayers.find(p => p.id === id)).filter(Boolean);
        const unassigned = presentPlayers.filter(p =>
            !assignments.rossi.includes(p.id) && !assignments.blu.includes(p.id)
        );

        // Update counters
        document.getElementById('rossi-count').textContent = rossiPlayers.length;
        document.getElementById('blu-count').textContent = bluPlayers.length;

        // Update balance
        const balance = calculateBalance(rossiPlayers, bluPlayers);
        document.getElementById('balance-index').textContent = balance.index + '%';
        document.getElementById('balance-gap').textContent = balance.gap;

        // Render lists
        document.getElementById('rossi-list').innerHTML = rossiPlayers.map(p =>
            renderTeamPlayer(p, 'rossi')
        ).join('');

        document.getElementById('blu-list').innerHTML = bluPlayers.map(p =>
            renderTeamPlayer(p, 'blu')
        ).join('');

        document.getElementById('unassigned-list').innerHTML = unassigned.map(p =>
            renderUnassignedPlayer(p)
        ).join('');

        // Add click handlers
        document.querySelectorAll('[data-assign]').forEach(btn => {
            btn.addEventListener('click', () => {
                const playerId = btn.dataset.playerId;
                const toTeam = btn.dataset.assign;

                // Remove from current team
                assignments.rossi = assignments.rossi.filter(id => id !== playerId);
                assignments.blu = assignments.blu.filter(id => id !== playerId);

                // Add to new team
                if (toTeam === 'rossi') assignments.rossi.push(playerId);
                if (toTeam === 'blu') assignments.blu.push(playerId);

                updateDisplay();
            });
        });

        document.querySelectorAll('[data-unassign]').forEach(btn => {
            btn.addEventListener('click', () => {
                const playerId = btn.dataset.playerId;
                assignments.rossi = assignments.rossi.filter(id => id !== playerId);
                assignments.blu = assignments.blu.filter(id => id !== playerId);
                updateDisplay();
            });
        });
    }

    function renderTeamPlayer(player, team) {
        return `
            <div class="player-item" style="padding: var(--spacing-2);">
                <div class="player-avatar" style="width: 32px; height: 32px; font-size: var(--font-size-sm);">
                    ${player.foto ? `<img src="${player.foto}">` : getPlayerInitials(player)}
                </div>
                <span style="flex: 1; font-size: var(--font-size-sm);">${getPlayerDisplayName(player)}</span>
                <button class="btn-icon" data-unassign data-player-id="${player.id}" style="width: 24px; height: 24px; font-size: var(--font-size-sm);">✕</button>
            </div>
        `;
    }

    function renderUnassignedPlayer(player) {
        return `
            <div style="display: flex; align-items: center; gap: var(--spacing-2); background: var(--color-surface); border: 1px solid var(--color-border); padding: var(--spacing-2); border-radius: var(--radius-md);">
                <span style="font-size: var(--font-size-sm);">${getPlayerDisplayName(player)}</span>
                <button class="btn btn-sm" style="padding: 2px 8px; background: var(--color-team-red); color: var(--color-team-red-dark);" data-assign="rossi" data-player-id="${player.id}">R</button>
                <button class="btn btn-sm" style="padding: 2px 8px; background: var(--color-team-blue); color: var(--color-team-blue-dark);" data-assign="blu" data-player-id="${player.id}">B</button>
            </div>
        `;
    }

    // Initial render
    updateDisplay();

    // Auto balance
    document.getElementById('auto-balance-btn').addEventListener('click', () => {
        const result = createBalancedTeams(presentPlayers, assignments);
        assignments.rossi = result.rossi;
        assignments.blu = result.blu;
        updateDisplay();
        showToast(`Squadre bilanciate! Equilibrio: ${result.balance.index}%`, 'success');
    });

    // Reset
    document.getElementById('reset-assignment-btn').addEventListener('click', () => {
        assignments = { rossi: [], blu: [] };
        updateDisplay();
    });

    // Save
    document.getElementById('save-teams-btn').addEventListener('click', async () => {
        if (assignments.rossi.length === 0 || assignments.blu.length === 0) {
            showToast('Assegna almeno un giocatore per squadra', 'error');
            return;
        }

        try {
            await setTeams(match.id, assignments.rossi, assignments.blu);
            showToast('Squadre salvate!', 'success');
            renderMatchModal(match.id);
            refreshCurrentPage();
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });
}

// ================================
// Results Form
// ================================

function renderResultsForm(match, players) {
    const rossiPlayers = match.squadraRossa.map(id => players.find(p => p.id === id)).filter(Boolean);
    const bluPlayers = match.squadraBlu.map(id => players.find(p => p.id === id)).filter(Boolean);
    const allMatchPlayers = [...rossiPlayers, ...bluPlayers];

    const html = `
        <div class="modal-header">
            <h3 class="modal-title">Inserisci risultato</h3>
            <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--spacing-4); align-items: center; margin-bottom: var(--spacing-6);">
                <div style="text-align: center;">
                    <div style="color: var(--color-team-red-dark); font-weight: 700; margin-bottom: var(--spacing-2);">ROSSI</div>
                    <input type="number" id="rf-gol-rossi" value="${match.gol_rossi ?? ''}" min="0" max="99" 
                           style="width: 80px; font-size: var(--font-size-2xl); text-align: center; font-weight: 700;">
                </div>
                <div style="font-size: var(--font-size-xl); color: var(--color-text-muted);">-</div>
                <div style="text-align: center;">
                    <div style="color: var(--color-team-blue-dark); font-weight: 700; margin-bottom: var(--spacing-2);">BLU</div>
                    <input type="number" id="rf-gol-blu" value="${match.gol_blu ?? ''}" min="0" max="99"
                           style="width: 80px; font-size: var(--font-size-2xl); text-align: center; font-weight: 700;">
                </div>
            </div>
            
            <div class="form-group">
                <label>MVP Rossi</label>
                <select id="rf-mvp-rossi">
                    <option value="">Seleziona...</option>
                    ${rossiPlayers.map(p => `
                        <option value="${p.id}" ${match.mvp_rossi === p.id ? 'selected' : ''} style="color: var(--color-team-red-dark); font-weight: bold;">
                            ${getPlayerDisplayName(p)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>MVP Blu</label>
                <select id="rf-mvp-blu">
                    <option value="">Seleziona...</option>
                    ${bluPlayers.map(p => `
                        <option value="${p.id}" ${match.mvp_blu === p.id ? 'selected' : ''} style="color: var(--color-team-blue-dark); font-weight: bold;">
                            ${getPlayerDisplayName(p)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>Marcatori (opzionale)</label>
                <div id="scorers-list">
                    ${(match.marcatori || []).map((m, i) => renderScorerRow(m, allMatchPlayers, i, match)).join('')}
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="add-scorer-btn" style="margin-top: var(--spacing-2);">
                    + Aggiungi marcatore
                </button>
            </div>
            
            <div class="form-group">
                <label>Ammonizioni (opzionale)</label>
                <div id="cards-list" style="display: flex; flex-wrap: wrap; gap: var(--spacing-2);">
                    ${allMatchPlayers.map(p => {
        let nameStyle = '';
        if (match.squadraRossa?.includes(p.id)) nameStyle = 'color: var(--color-team-red-dark); font-weight: 700;';
        if (match.squadraBlu?.includes(p.id)) nameStyle = 'color: var(--color-team-blue-dark); font-weight: 700;';

        return `
                        <label style="display: flex; align-items: center; gap: var(--spacing-1); cursor: pointer;">
                            <input type="checkbox" class="card-checkbox" data-player-id="${p.id}" 
                                   ${(match.ammonizioni || []).includes(p.id) ? 'checked' : ''}>
                            <span style="font-size: var(--font-size-sm); ${nameStyle}">${getPlayerDisplayName(p)}</span>
                        </label>
                    `}).join('')}
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close-modal">Annulla</button>
            <button class="btn btn-primary" id="save-results-btn">Salva e chiudi partita</button>
        </div>
    `;

    showModal(html);

    let scorerIndex = (match.marcatori || []).length;

    // Add scorer
    document.getElementById('add-scorer-btn').addEventListener('click', () => {
        const list = document.getElementById('scorers-list');
        list.insertAdjacentHTML('beforeend', renderScorerRow({ playerId: '', gol: 1 }, allMatchPlayers, scorerIndex++, match));
    });

    // Save results
    document.getElementById('save-results-btn').addEventListener('click', async () => {
        const gol_rossi = parseInt(document.getElementById('rf-gol-rossi').value) || 0;
        const gol_blu = parseInt(document.getElementById('rf-gol-blu').value) || 0;
        const mvp_rossi = document.getElementById('rf-mvp-rossi').value;
        const mvp_blu = document.getElementById('rf-mvp-blu').value;

        if (isNaN(gol_rossi) || isNaN(gol_blu)) {
            showToast('Inserisci il risultato', 'error');
            return;
        }

        if (!mvp_rossi || !mvp_blu) {
            showToast('Seleziona gli MVP', 'error');
            return;
        }

        // Get scorers
        const scorerRows = document.querySelectorAll('.scorer-row');
        const marcatori = [];
        let scorersRossiGoals = 0;
        let scorersBluGoals = 0;

        scorerRows.forEach(row => {
            const playerId = row.querySelector('.scorer-player').value;
            const gol = parseInt(row.querySelector('.scorer-goals').value) || 1;

            if (playerId) {
                marcatori.push({ playerId, gol });

                // Check which team the player belongs to
                if (match.squadraRossa.includes(playerId)) {
                    scorersRossiGoals += gol;
                } else if (match.squadraBlu.includes(playerId)) {
                    scorersBluGoals += gol;
                }
            }
        });

        // Validation: Check if scorer goals exceed match result
        if (scorersRossiGoals > gol_rossi) {
            showToast(`Errore: I marcatori Rossi hanno segnato ${scorersRossiGoals} gol, ma il risultato è ${gol_rossi}`, 'error');
            return;
        }

        if (scorersBluGoals > gol_blu) {
            showToast(`Errore: I marcatori Blu hanno segnato ${scorersBluGoals} gol, ma il risultato è ${gol_blu}`, 'error');
            return;
        }

        // Get cards
        const cardCheckboxes = document.querySelectorAll('.card-checkbox:checked');
        const ammonizioni = Array.from(cardCheckboxes).map(cb => cb.dataset.playerId);

        try {
            await setResults(match.id, {
                gol_rossi: gol_rossi,
                gol_blu: gol_blu,
                mvp_rossi: mvp_rossi,
                mvp_blu: mvp_blu,
                marcatori,
                ammonizioni
            });

            // Update player stats
            const updatedMatch = await getMatchWithDetails(match.id);
            await updatePlayerStats(updatedMatch, players);

            // Refresh data
            await getAllMatches();
            const updatedPlayers = await db.getAll('players');
            store.setState({ players: updatedPlayers });

            showToast('Partita chiusa!', 'success');
            renderMatchModal(match.id); // Refresh modal
            refreshCurrentPage();
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });
}

function renderScorerRow(scorer, players, index, match) {
    return `
        <div class="scorer-row" style="display: flex; gap: var(--spacing-2); margin-bottom: var(--spacing-2);">
            <select class="scorer-player" style="flex: 2;">
                <option value="">Seleziona giocatore</option>
                ${players.map(p => {
        let nameStyle = '';
        if (match?.squadraRossa?.includes(p.id)) nameStyle = 'color: var(--color-team-red-dark); font-weight: bold;';
        if (match?.squadraBlu?.includes(p.id)) nameStyle = 'color: var(--color-team-blue-dark); font-weight: bold;';

        return `
                    <option value="${p.id}" ${scorer.playerId === p.id ? 'selected' : ''} style="${nameStyle}">
                        ${getPlayerDisplayName(p)}
                    </option>
                `}).join('')}
            </select>
            <input type="number" class="scorer-goals" value="${scorer.gol || 1}" min="1" max="20" style="width: 60px;">
            <button type="button" class="btn-icon" onclick="this.closest('.scorer-row').remove()">✕</button>
        </div>
    `;
}

function getNextTuesday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilTuesday = (9 - dayOfWeek) % 7 || 7;
    const nextTuesday = new Date(today);
    nextTuesday.setDate(today.getDate() + daysUntilTuesday);
    return nextTuesday;
}

export default { renderMatches, renderMatchModal, renderMatchForm };
