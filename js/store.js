// ================================
// STATE MANAGEMENT MODULE
// ================================

class Store {
    constructor() {
        this.state = {
            currentUser: null,
            players: [],
            matches: [],
            currentPage: 'dashboard',
            isLoading: true
        };
        this.listeners = new Map();
    }

    // Get current state
    getState() {
        return this.state;
    }

    // Update state
    setState(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };

        // Notify listeners of changed keys
        Object.keys(updates).forEach(key => {
            if (prevState[key] !== this.state[key]) {
                this.notify(key, this.state[key], prevState[key]);
            }
        });
    }

    // Subscribe to state changes
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(key).delete(callback);
        };
    }

    // Notify listeners
    notify(key, newValue, oldValue) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                callback(newValue, oldValue);
            });
        }
    }

    // Check if user has permission
    hasPermission(permission) {
        const user = this.state.currentUser;
        if (!user) return false;

        const permissions = {
            admin: [
                'manage_users', 'manage_matches', 'manage_players',
                'create_teams', 'edit_results', 'close_match',
                'export_data', 'view_all'
            ],
            supervisore: [
                'create_teams', 'view_all'
            ],
            operatore: [
                'edit_own_profile', 'respond_convocation', 'view_all'
            ]
        };

        const userRole = user.ruolo || 'operatore';
        const userPermissions = permissions[userRole] || [];

        // Admin has all permissions
        if (userRole === 'admin') return true;

        // Supervisore has own + operatore permissions
        if (userRole === 'supervisore') {
            return [...permissions.supervisore, ...permissions.operatore].includes(permission);
        }

        return userPermissions.includes(permission);
    }

    // Check if user is admin
    isAdmin() {
        return this.state.currentUser?.ruolo === 'admin';
    }

    // Check if user is at least supervisore
    isSupervisor() {
        const role = this.state.currentUser?.ruolo;
        return role === 'admin' || role === 'supervisore';
    }
}

// Export singleton instance
export const store = new Store();
export default store;
