// ================================
// ADMIN COMPONENT
// ================================

import { store } from '../store.js';
import db from '../db.js';
import { getPlayerDisplayName, getPlayerInitials } from '../players.js';
import { showToast } from '../../app.js';

export async function renderAdmin(container, state) {
    const { players } = state;

    // Sort by name
    const sortedPlayers = [...players].sort((a, b) => a.nome.localeCompare(b.nome));

    let html = `
        <div class="page">
            <div class="section-header">
                <h2 class="section-title">Amministrazione</h2>
            </div>
            
            <!-- Quick Actions -->
            <div class="admin-section">
                <h3 style="margin-bottom: var(--spacing-3);">Azioni rapide</h3>
                    <button class="admin-btn" id="admin-create-match">
                        <span class="admin-btn-icon">📊</span>
                        <span class="admin-btn-label">Nuova partita</span>
                    </button>
                    <button class="admin-btn" id="admin-create-player">
                        <span class="admin-btn-icon">👤</span>
                        <span class="admin-btn-label">Nuovo giocatore</span>
                    </button>
                    <button class="admin-btn" id="admin-export">
                        <span class="admin-btn-icon">📦</span>
                        <span class="admin-btn-label">Esporta dati</span>
                    </button>
                    <button class="admin-btn" id="admin-clear-data">
                        <span class="admin-btn-icon">🗑️</span>
                        <span class="admin-btn-label">Reset dati</span>
                    </button>
                </div>
                <button class="btn btn-secondary btn-sm" id="admin-generate-test" style="width: 100%; border-style: dashed; margin-top: var(--spacing-3);">
                     <span>🧪 Genera Dati Test (20 Giocatori + Storico)</span>
                </button>
            </div>
            
            <!-- User Management -->
            <div class="admin-section">
                <h3 style="margin-bottom: var(--spacing-3);">Gestione utenti</h3>
                <div class="card">
                    <div class="card-body" style="padding: 0;">
                        ${sortedPlayers.length > 0 ? sortedPlayers.map(player => `
                            <div class="player-item">
                                <div class="player-avatar" style="width: 40px; height: 40px;">
                                    ${player.foto ? `<img src="${player.foto}">` : getPlayerInitials(player)}
                                </div>
                                <div class="player-info">
                                    <div class="player-name">${getPlayerDisplayName(player)}</div>
                                    <div class="player-role" style="display: flex; gap: var(--spacing-2); align-items: center; margin-top: 4px;">
                                        <span class="role-badge ${player.ruolo || 'operatore'}">${player.ruolo || 'operatore'}</span>
                                        <span style="font-family: monospace; background: var(--color-primary-50); color: var(--color-primary-dark); padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 700;">PWD: ${player.password_numeric}</span>
                                        ${player.bloccato ? '<span style="color: var(--color-error); font-size: var(--font-size-xs);">🔒 Bloccato</span>' : ''}
                                    </div>
                                </div>
                                <div class="list-actions">
                                    <select class="role-select" data-player-id="${player.id}" style="padding: var(--spacing-1) var(--spacing-2); font-size: var(--font-size-sm); border-radius: var(--radius-sm);">
                                        <option value="operatore" ${player.ruolo === 'operatore' ? 'selected' : ''}>Operatore</option>
                                        <option value="supervisore" ${player.ruolo === 'supervisore' ? 'selected' : ''}>Supervisore</option>
                                        <option value="admin" ${player.ruolo === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                    <button class="btn-icon block-btn" data-player-id="${player.id}" data-blocked="${player.bloccato ? 'true' : 'false'}" title="${player.bloccato ? 'Sblocca' : 'Blocca'}">
                                        ${player.bloccato ? '🔓' : '🔒'}
                                    </button>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="empty-state">
                                <p>Nessun giocatore registrato</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
            
            <!-- Info -->
            <div class="admin-section">
                <div class="card">
                    <div class="card-body">
                        <h4 style="margin-bottom: var(--spacing-2);">ℹ️ Info sistema</h4>
                        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                            Calcetto Manager v1.0<br>
                            Database: LocalStorage (locale)<br>
                            Giocatori: ${players.length}<br>
                            Partite: ${state.matches.length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Event handlers

    // Create match
    document.getElementById('admin-create-match')?.addEventListener('click', async () => {
        const { renderMatchForm } = await import('./matchCard.js');
        renderMatchForm(null);
    });

    // Create player
    document.getElementById('admin-create-player')?.addEventListener('click', async () => {
        const { renderPlayerForm } = await import('./playerCard.js');
        renderPlayerForm(null);
    });

    // Export
    document.getElementById('admin-export')?.addEventListener('click', async () => {
        const { exportPlayersToExcel, exportMatchesToExcel } = await import('../stats.js');
        exportPlayersToExcel(players);
        setTimeout(() => exportMatchesToExcel(state.matches), 500);
        showToast('Esportazione avviata', 'success');
    });

    // Clear data
    document.getElementById('admin-clear-data')?.addEventListener('click', async () => {
        if (!confirm('Sei sicuro di voler cancellare TUTTI i dati? Questa azione non può essere annullata!')) return;
        if (!confirm('CONFERMA FINALE: Tutti i giocatori, partite e statistiche verranno eliminati!')) return;

        try {
            localStorage.clear();
            location.reload();
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        }
    });

    // Generate Test Data
    document.getElementById('admin-generate-test')?.addEventListener('click', async () => {
        if (!confirm('Vuoi generare 20 giocatori titolari (pwd 9999) e uno storico partite?')) return;

        try {
            showToast('Generazione in corso...', 'info');
            const { generateTestPlayers, generateTestMatches } = await import('../testDataGenerator.js');
            await generateTestPlayers(20);
            await generateTestMatches(10);
            showToast('Dati di test generati con successo!', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error(error);
            showToast('Errore generazione dati: ' + error.message, 'error');
        }
    });

    // Role change
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async () => {
            const playerId = select.dataset.playerId;
            const newRole = select.value;

            try {
                await db.update('players', playerId, { ruolo: newRole });
                const players = await db.getAll('players');
                store.setState({ players });
                showToast('Ruolo aggiornato', 'success');
            } catch (error) {
                showToast('Errore: ' + error.message, 'error');
            }
        });
    });

    // Block/unblock
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const playerId = btn.dataset.playerId;
            const isBlocked = btn.dataset.blocked === 'true';

            try {
                await db.update('players', playerId, { bloccato: !isBlocked });
                const players = await db.getAll('players');
                store.setState({ players });
                showToast(isBlocked ? 'Utente sbloccato' : 'Utente bloccato', 'success');
                renderAdmin(container, store.getState());
            } catch (error) {
                showToast('Errore: ' + error.message, 'error');
            }
        });
    });
}

export default { renderAdmin };
