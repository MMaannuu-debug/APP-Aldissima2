// ================================
// PLAYER CARD COMPONENT
// ================================

import { store } from '../store.js';
import db from '../db.js';
import {
    getPlayerDisplayName,
    getPlayerInitials,
    calculatePlayerRating,
    getRoleLabel,
    RUOLI
} from '../players.js';
import { getPlayerYearlyStats } from '../stats.js';
import { showModal, closeModal, showToast } from '../../app.js';

export async function renderPlayers(container, state) {
    const { players, currentUser } = state;
    const isAdmin = store.isAdmin();

    // Sort players by name
    const sortedPlayers = [...players].sort((a, b) =>
        a.nome.localeCompare(b.nome)
    );

    let html = `
        <div class="page">
            <div class="section-header">
                <h2 class="section-title">Giocatori (${players.length})</h2>
                ${isAdmin ? `
                    <button class="btn btn-primary btn-sm" id="add-player-btn">
                        + Nuovo
                    </button>
                ` : ''}
            </div>
            
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    ${sortedPlayers.length > 0 ? sortedPlayers.map(player => `
                        <div class="player-item" data-action="view-player" data-id="${player.id}" style="cursor: pointer;">
                            <div class="player-avatar" ${player.foto ? `data-photo="${player.foto}"` : ''}>
                                ${player.foto
            ? `<img src="${player.foto}" alt="${getPlayerDisplayName(player)}">`
            : getPlayerInitials(player)
        }
                            </div>
                            <div class="player-info">
                                <div class="player-name">${getPlayerDisplayName(player)}</div>
                                <div class="player-role">${getRoleLabel(player.ruolo_principale)}</div>
                            </div>
                            ${isAdmin ? `
                                <div class="player-rating">
                                    ${renderStars(player.valutazione_generale || 3)}
                                </div>
                            ` : ''}
                            ${player.bloccato ? '<span style="color: var(--color-error);">🔒</span>' : ''}
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <div class="empty-state-icon">👥</div>
                            <div class="empty-state-title">Nessun giocatore</div>
                            <p class="empty-state-text">Registrati per comparire nella lista</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Add player button handler
    if (isAdmin) {
        document.getElementById('add-player-btn')?.addEventListener('click', () => {
            renderPlayerForm(null);
        });
    }
}

export async function renderPlayerModal(playerId) {
    const player = await db.getById('players', playerId);
    if (!player) {
        showToast('Giocatore non trovato', 'error');
        return;
    }

    const isAdmin = store.isAdmin();
    const matches = store.getState().matches;
    const isSelf = store.getState().currentUser?.id === playerId;
    const canEdit = isAdmin || isSelf;

    const yearlyStats = getPlayerYearlyStats(player, matches);
    const currentYear = new Date().getFullYear();

    const html = `
        <div class="modal-header">
            <h3 class="modal-title">Scheda Giocatore</h3>
            <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
            <div style="text-align: center; margin-bottom: var(--spacing-6);">
                <div class="player-avatar" style="width: 80px; height: 80px; font-size: 2rem; margin: 0 auto var(--spacing-3);">
                    ${player.foto
            ? `<img src="${player.foto}" alt="${getPlayerDisplayName(player)}">`
            : getPlayerInitials(player)
        }
                </div>
                <h2 style="margin: 0;">${player.nome} ${player.cognome}</h2>
                ${player.soprannome ? `<p style="color: var(--color-primary);">"${player.soprannome}"</p>` : ''}
            </div>
            
            <div class="stats-grid" style="margin-bottom: var(--spacing-4); grid-template-columns: repeat(2, 1fr);">
                <div class="stat-card" style="grid-column: span 2; background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); color: white;">
                    <div class="stat-value" style="color: white; font-size: 2rem;">${yearlyStats.aldIndex || 0}</div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8); font-weight: 600;">ALDINDEX ${currentYear}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${yearlyStats.presenze || 0} <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 400;">(${yearlyStats.percentuale}%)</span></div>
                    <div class="stat-label">Partite Rate%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${yearlyStats.gol || 0} <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 400;">(${yearlyStats.mediaGol})</span></div>
                    <div class="stat-label">Media Gol</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${yearlyStats.mvpPoints || 0} <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 400;">(${yearlyStats.mvpRate}%)</span></div>
                    <div class="stat-label">MVP Rate%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.partite_vinte || 0}</div>
                    <div class="stat-label">Vittorie (Tot)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${yearlyStats.ammonizioni || 0} <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 400;">(${yearlyStats.badGuyRate}%)</span></div>
                    <div class="stat-label">Bad Guy Rate%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.presenze || 0}</div>
                    <div class="stat-label">Presenze (Tot)</div>
                </div>
            </div>
            
            <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); text-align: center; margin-top: -var(--spacing-2); margin-bottom: var(--spacing-4);">
                * Le percentuali Rate% si riferiscono all'anno ${currentYear}
            </p>
            
            <div style="margin-bottom: var(--spacing-4);">
                <div style="display: flex; justify-content: space-between; padding: var(--spacing-2) 0; border-bottom: 1px solid var(--color-border-light);">
                    <span style="color: var(--color-text-secondary);">Ruolo principale</span>
                    <span style="font-weight: 500;">${getRoleLabel(player.ruolo_principale)}</span>
                </div>
                ${player.ruolo_secondario ? `
                    <div style="display: flex; justify-content: space-between; padding: var(--spacing-2) 0; border-bottom: 1px solid var(--color-border-light);">
                        <span style="color: var(--color-text-secondary);">Ruolo secondario</span>
                        <span style="font-weight: 500;">${getRoleLabel(player.ruolo_secondario)}</span>
                    </div>
                ` : ''}
                ${isAdmin ? `
                    <div style="display: flex; justify-content: space-between; padding: var(--spacing-2) 0; border-bottom: 1px solid var(--color-border-light);">
                        <span style="color: var(--color-text-secondary);">Tipologia</span>
                        <span style="font-weight: 500;">${player.tipologia === 'titolare' ? 'Titolare' : 'Riserva'}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: var(--spacing-2) 0; border-bottom: 1px solid var(--color-border-light);">
                    <span style="color: var(--color-text-secondary);">Data di nascita</span>
                    <span style="font-weight: 500;">${player.data_nascita ? formatDate(player.data_nascita) : 'Non inserita'}</span>
                </div>
            </div>
            
            ${isAdmin ? `
                <div style="background: var(--color-border-light); padding: var(--spacing-4); border-radius: var(--radius-lg); margin-bottom: var(--spacing-4);">
                    <h4 style="margin-bottom: var(--spacing-3);">Valutazioni Admin</h4>
                    <div style="display: grid; gap: var(--spacing-2);">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Valutazione generale</span>
                            <div class="player-rating">${renderStars(player.valutazione_generale || 3)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Visione di gioco</span>
                            <div class="player-rating">${renderStars(player.visione_gioco || 3)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Corsa</span>
                            <div class="player-rating">${renderStars(player.corsa || 3)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Possesso</span>
                            <div class="player-rating">${renderStars(player.possesso || 3)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Forma fisica</span>
                            <div class="player-rating">${renderStars(player.forma_fisica || 3)}</div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
        ${canEdit ? `
            <div class="modal-footer">
                <button class="btn btn-secondary" data-action="close-modal">Chiudi</button>
                <button class="btn btn-primary" id="edit-player-btn">Modifica</button>
            </div>
        ` : `
            <div class="modal-footer">
                <button class="btn btn-primary" data-action="close-modal" style="width: 100%;">Chiudi</button>
            </div>
        `}
    `;

    showModal(html);

    // Edit button handler
    document.getElementById('edit-player-btn')?.addEventListener('click', () => {
        closeModal();
        renderPlayerForm(player);
    });
}

export function renderPlayerForm(player) {
    const isEdit = !!player;
    const isAdmin = store.isAdmin();
    const isSelf = store.getState().currentUser?.id === player?.id;

    const html = `
        <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Modifica Giocatore' : 'Nuovo Giocatore'}</h3>
            <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
            <form id="player-form">
                <div class="form-group">
                    <label>Nome *</label>
                    <input type="text" id="pf-nome" value="${player?.nome || ''}" required ${!isAdmin && isEdit ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label>Cognome *</label>
                    <input type="text" id="pf-cognome" value="${player?.cognome || ''}" required ${!isAdmin && isEdit ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label>Soprannome</label>
                    <input type="text" id="pf-soprannome" value="${player?.soprannome || ''}">
                </div>
                <div class="form-group">
                    <label>Telefono *</label>
                    <input type="tel" id="pf-telefono" value="${player?.telefono || ''}" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="pf-email" value="${player?.email || ''}">
                </div>
                <div class="form-group">
                    <label>Data di nascita (GIORNO MESE ANNO)</label>
                    <input type="date" id="pf-data-nascita" value="${player?.data_nascita || ''}" required>
                </div>
                <div class="form-group">
                    <label>Ruolo principale</label>
                    <select id="pf-ruolo1">
                        ${RUOLI.map(r => `
                            <option value="${r.value}" ${player?.ruolo_principale === r.value ? 'selected' : ''}>
                                ${r.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Ruolo secondario</label>
                    <select id="pf-ruolo2">
                        <option value="">Nessuno</option>
                        ${RUOLI.map(r => `
                            <option value="${r.value}" ${player?.ruolo_secondario === r.value ? 'selected' : ''}>
                                ${r.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                ${isAdmin || isSelf ? `
                    <div class="form-group">
                        <label>Nuova password (4 cifre)</label>
                        <input type="${isAdmin ? 'text' : 'password'}" id="pf-password" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" placeholder="Lascia vuoto per non cambiare" value="${isAdmin && isEdit ? player.password_numeric : ''}">
                    </div>
                ` : ''}
                
                ${isAdmin ? `
                    <div class="form-group">
                        <label>Tipologia</label>
                        <select id="pf-tipologia">
                            <option value="titolare" ${player?.tipologia === 'titolare' ? 'selected' : ''}>Titolare</option>
                            <option value="riserva" ${player?.tipologia === 'riserva' ? 'selected' : ''}>Riserva</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Ruolo utente</label>
                        <select id="pf-ruolo-utente">
                            <option value="operatore" ${player?.ruolo === 'operatore' ? 'selected' : ''}>Operatore</option>
                            <option value="supervisore" ${player?.ruolo === 'supervisore' ? 'selected' : ''}>Supervisore</option>
                            <option value="admin" ${player?.ruolo === 'admin' ? 'selected' : ''}>Amministratore</option>
                        </select>
                    </div>
                    
                    <h4 style="margin: var(--spacing-4) 0 var(--spacing-3);">Valutazioni</h4>
                    ${renderRatingInput('Valutazione generale', 'pf-val-gen', player?.valutazione_generale || 3)}
                    ${renderRatingInput('Visione di gioco', 'pf-visione', player?.visione_gioco || 3)}
                    ${renderRatingInput('Corsa', 'pf-corsa', player?.corsa || 3)}
                    ${renderRatingInput('Possesso', 'pf-possesso', player?.possesso || 3)}
                    ${renderRatingInput('Forma fisica', 'pf-forma', player?.forma_fisica || 3)}
                ` : ''}
                
                <div class="form-group">
                    <label>Foto profilo</label>
                    <div class="file-upload">
                        <input type="file" id="pf-foto" accept="image/*">
                        <div class="file-upload-icon">📷</div>
                        <div class="file-upload-text">Clicca per caricare (max 1MB)</div>
                    </div>
                    <div id="pf-foto-preview" style="margin-top: var(--spacing-2); text-align: center; ${player?.foto ? '' : 'display: none;'}">
                         <img src="${player?.foto || ''}" style="max-width: 100px; max-height: 100px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            ${isAdmin && isEdit ? `<button class="btn btn-danger btn-sm" id="delete-player-btn" style="margin-right: auto;">Elimina</button>` : ''}
            <button class="btn btn-secondary" data-action="close-modal">Annulla</button>
            <button class="btn btn-primary" id="save-player-btn">Salva</button>
        </div>
    `;

    showModal(html);
    setupPlayerFormHandlers(player);
}

function setupPlayerFormHandlers(existingPlayer) {
    // Rating buttons
    document.querySelectorAll('.rating-input button').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.form-group').querySelector('input[type="hidden"]');
            const buttons = btn.parentElement.querySelectorAll('button');
            const value = parseInt(btn.dataset.value);

            buttons.forEach((b, i) => {
                b.classList.toggle('active', i < value);
            });
            input.value = value;
        });
    });

    // Photo preview handler
    document.getElementById('pf-foto')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await readFileAsBase64(file);
                const previewContainer = document.getElementById('pf-foto-preview');
                const img = previewContainer.querySelector('img');
                img.src = base64;
                previewContainer.style.display = 'block';
            } catch (err) {
                console.error('Error previewing file', err);
            }
        }
    });

    // Save handler
    document.getElementById('save-player-btn').addEventListener('click', async () => {
        const isAdmin = store.isAdmin();

        const data = {
            nome: document.getElementById('pf-nome').value.trim(),
            cognome: document.getElementById('pf-cognome').value.trim(),
            soprannome: document.getElementById('pf-soprannome').value.trim(),
            telefono: document.getElementById('pf-telefono').value.trim(),
            email: document.getElementById('pf-email').value.trim(),
            data_nascita: document.getElementById('pf-data-nascita').value,
            ruolo_principale: document.getElementById('pf-ruolo1').value,
            ruolo_secondario: document.getElementById('pf-ruolo2').value
        };

        // Password
        const newPassword = document.getElementById('pf-password')?.value;
        if (newPassword) {
            if (!/^\d{4}$/.test(newPassword)) {
                showToast('La password deve essere di 4 cifre', 'error');
                return;
            }
            data.password_numeric = newPassword;
        }

        // Admin fields
        if (isAdmin) {
            data.tipologia = document.getElementById('pf-tipologia')?.value || 'riserva';
            data.ruolo = document.getElementById('pf-ruolo-utente')?.value || 'operatore';
            data.valutazione_generale = parseInt(document.getElementById('pf-val-gen-value')?.value) || 3;
            data.visione_gioco = parseInt(document.getElementById('pf-visione-value')?.value) || 3;
            data.corsa = parseInt(document.getElementById('pf-corsa-value')?.value) || 3;
            data.possesso = parseInt(document.getElementById('pf-possesso-value')?.value) || 3;
            data.forma_fisica = parseInt(document.getElementById('pf-forma-value')?.value) || 3;
        }

        // Photo
        const photoInput = document.getElementById('pf-foto');
        if (photoInput.files[0]) {
            try {
                const base64 = await readFileAsBase64(photoInput.files[0]);
                data.foto = base64;
            } catch (e) {
                showToast('Errore caricamento foto: ' + e.message, 'error');
                return;
            }
        }

        // Validate
        if (!data.nome || !data.cognome || !data.telefono || !data.data_nascita) {
            showToast('Compila tutti i campi obbligatori', 'error');
            return;
        }

        try {
            if (existingPlayer) {
                await db.update('players', existingPlayer.id, data);
                showToast('Giocatore aggiornato!', 'success');
            } else {
                data.password_numeric = data.password_numeric || '0000';
                await db.add('players', data);
                showToast('Giocatore creato!', 'success');
            }

            // Refresh players list
            const players = await db.getAll('players');
            store.setState({ players });

            closeModal();

            // Re-render current page
            const container = document.getElementById('main-content');
            renderPlayers(container, store.getState());

        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });

    // Delete handler
    document.getElementById('delete-player-btn')?.addEventListener('click', async () => {
        if (!confirm(`Sei sicuro di voler eliminare definitivamente ${getPlayerDisplayName(existingPlayer)}?`)) return;

        try {
            await db.delete('players', existingPlayer.id);
            const players = await db.getAll('players');
            store.setState({ players });
            showToast('Giocatore eliminato', 'success');
            closeModal();

            // Re-render
            const container = document.getElementById('main-content');
            renderPlayers(container, store.getState());
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        if (file.size > 1024 * 1024) {
            reject(new Error('File troppo grande (max 1MB)'));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Errore lettura file'));
        reader.readAsDataURL(file);
    });
}

function renderStars(value) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= value ? '' : 'empty'}">★</span>`;
    }
    return html;
}

function renderRatingInput(label, id, value) {
    return `
        <div class="form-group">
            <label>${label}</label>
            <input type="hidden" id="${id}-value" value="${value}">
            <div class="rating-input">
                ${[1, 2, 3, 4, 5].map(i => `
                    <button type="button" class="${i <= value ? 'active' : ''}" data-value="${i}">★</button>
                `).join('')}
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '';
    // Use manual split to avoid timezone issues with new Date(string)
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export default { renderPlayers, renderPlayerModal, renderPlayerForm };
