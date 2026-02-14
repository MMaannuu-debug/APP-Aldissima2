// ================================
// STATISTICS VIEW COMPONENT
// ================================

import { store } from '../store.js';
import { getLeaderboard, getMatchesStats, exportPlayersToExcel, exportMatchesToExcel, exportLeaderboardToExcel, getPlayerYearlyStats, exportStatsToXlsx } from '../stats.js';
import { getPlayerDisplayName, getPlayerInitials } from '../players.js';
import { STATI } from '../matches.js';

export async function renderStats(container, state) {
    const { players, matches } = state;
    const isAdmin = store.isAdmin();
    const matchStats = getMatchesStats(matches);

    let html = `
        <div class="page">
            <!-- Overview Stats -->
            <div class="section-header">
                <h2 class="section-title">Panoramica</h2>
            </div>
            
            <div class="stats-grid" style="margin-bottom: var(--spacing-6);">
                <div class="stat-card">
                    <div class="stat-value">${matchStats.totalMatches}</div>
                    <div class="stat-label">Partite giocate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${matchStats.totalGoals}</div>
                    <div class="stat-label">Gol totali</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${matchStats.avgGoalsPerMatch}</div>
                    <div class="stat-label">Media gol/partita</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${players.length}</div>
                    <div class="stat-label">Giocatori</div>
                </div>
            </div>
            
            <!-- Win distribution -->
            <div class="card" style="margin-bottom: var(--spacing-6);">
                <div class="card-header">
                    <span class="card-title">Vincite squadre</span>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: var(--spacing-4); justify-content: center; text-align: center;">
                        <div>
                            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-team-red-dark);">
                                ${matchStats.rossiWins}
                            </div>
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Rossi</div>
                        </div>
                        <div>
                            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-muted);">
                                ${matchStats.draws}
                            </div>
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Pareggi</div>
                        </div>
                        <div>
                            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-team-blue-dark);">
                                ${matchStats.bluWins}
                            </div>
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Blu</div>
                        </div>
                    </div>
                    ${matchStats.totalMatches > 0 ? `
                        <div style="margin-top: var(--spacing-4);">
                            <div style="display: flex; height: 8px; border-radius: var(--radius-full); overflow: hidden;">
                                <div style="width: ${matchStats.rossiWins / matchStats.totalMatches * 100}%; background: var(--color-team-red-dark);"></div>
                                <div style="width: ${matchStats.draws / matchStats.totalMatches * 100}%; background: var(--color-text-muted);"></div>
                                <div style="width: ${matchStats.bluWins / matchStats.totalMatches * 100}%; background: var(--color-team-blue-dark);"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Leaderboard Tabs -->
            <div class="tabs" id="leaderboard-tabs">
                <button class="tab active" data-category="ald_index">🔥 ALDINDEX</button>
                <button class="tab" data-category="partite_rate">📊 Partite giocate</button>
                <button class="tab" data-category="gol">⚽ Gol</button>
                <button class="tab" data-category="presenze">👥 Presenze</button>
                <button class="tab" data-category="vittorie">🥇 Vittorie</button>
                <button class="tab" data-category="mvp">🏆 MVP</button>
                <button class="tab" data-category="ammonizioni">🟨 Ammonizioni</button>
            </div>
            
            <div class="card" id="leaderboard-container">
                ${renderLeaderboard(players, 'ald_index', matches)}
            </div>
            
            ${isAdmin ? `
                <div style="margin-top: var(--spacing-6);">
                    <div class="section-header">
                        <h2 class="section-title">Esporta dati</h2>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                        <button class="btn btn-primary" id="export-all-xlsx-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: var(--spacing-2); padding: var(--spacing-4);">
                            <span style="font-size: 1.2rem;">📊</span> Esporta Resoconto Completo (.xlsx)
                        </button>
                        <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); text-align: center;">
                            Genera un file Excel con Classifiche (ordinate per ALDINDEX) e Riepilogo Partite.
                        </p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = html;

    // Tab switching
    document.querySelectorAll('#leaderboard-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#leaderboard-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const category = tab.dataset.category;
            document.getElementById('leaderboard-container').innerHTML = renderLeaderboard(players, category, matches);
        });
    });

    // Export handlers
    if (isAdmin) {
        document.getElementById('export-all-xlsx-btn')?.addEventListener('click', () => {
            exportStatsToXlsx(players, matches);
        });
    }
}

function renderLeaderboard(players, category, matches) {
    let leaderboardData;

    const categoriesWithRates = ['ald_index', 'partite_rate', 'mvp', 'gol', 'ammonizioni'];

    if (categoriesWithRates.includes(category)) {
        leaderboardData = players.map(p => {
            const stats = getPlayerYearlyStats(p, matches);
            let value, rate;

            switch (category) {
                case 'ald_index':
                    value = stats.aldIndex;
                    rate = null; // No secondary rate for ALDINDEX for now
                    break;
                case 'partite_rate':
                    value = stats.presenze;
                    rate = stats.percentuale;
                    break;
                case 'mvp':
                    value = stats.mvpPoints;
                    rate = stats.mvpRate;
                    break;
                case 'gol':
                    value = stats.gol;
                    rate = stats.mediaGol; // rate will be the numeric average here
                    break;
                case 'ammonizioni':
                    value = stats.ammonizioni;
                    rate = stats.badGuyRate;
                    break;
            }

            return {
                player: p,
                value,
                rate
            };
        })
            .sort((a, b) => b.value - a.value)
            .slice(0, 100);
    } else {
        leaderboardData = getLeaderboard(players, category, 100).map(item => ({
            player: item.player,
            value: item.value
        }));
    }

    if (leaderboardData.length === 0) {
        return `
            <div class="card-body">
                <div class="empty-state" style="padding: var(--spacing-6);">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-title">Nessun dato</div>
                    <p class="empty-state-text">Le statistiche appariranno dopo le prime partite</p>
                </div>
            </div>
        `;
    }

    return `
        <ul class="leaderboard">
            ${leaderboardData.map((item, index) => {
        let displayValue = item.value;
        if (categoriesWithRates.includes(category)) {
            const isMediaGol = category === 'gol';
            const hasRate = item.rate !== null && item.rate !== undefined;
            displayValue = `${item.value} ${hasRate ? `<span style="font-size: 0.8em; opacity: 0.7;">(${item.rate}${isMediaGol ? '' : '%'})</span>` : ''}`;
        }

        return `
                <li class="leaderboard-item">
                    <div class="leaderboard-rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}">
                        ${index + 1}
                    </div>
                    <div class="player-avatar" style="width: 40px; height: 40px;">
                        ${item.player.foto
                ? `<img src="${item.player.foto}" alt="${getPlayerDisplayName(item.player)}">`
                : getPlayerInitials(item.player)
            }
                    </div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${getPlayerDisplayName(item.player)}</div>
                    </div>
                    <div class="leaderboard-value">${displayValue}</div>
                </li>
            `}).join('')}
        </ul>
    `;
}

export default { renderStats };
