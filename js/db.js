// ================================
// DATABASE MODULE - Supabase
// ================================

// Supabase configuration - Replace with your own project details
const SUPABASE_URL = 'https://vuulkmhumulwpqtjbdmi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1dWxrbWh1bXVsd3BxdGpiZG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTQ3MDUsImV4cCI6MjA4NjIzMDcwNX0.DynPynn3rZaUk3EXn0KSHqf4lXga3jI3Jn3CsdEpRyE';

// Initialize Supabase
let supabase = null;

export function initDatabase() {
    return new Promise((resolve, reject) => {
        try {
            // Check if Supabase is loaded from CDN
            if (typeof window.supabase === 'undefined') {
                console.warn('Supabase not loaded, using localStorage fallback');
                resolve(false);
                return;
            }

            // Initialize client
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized');
            resolve(true);
        } catch (error) {
            console.warn('Supabase init failed, using localStorage:', error);
            resolve(false);
        }
    });
}

// ================================
// Supabase CRUD Operations
// ================================

export const supabaseDB = {
    async getAll(table) {
        if (!supabase) return localDB.getAll(table);
        const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getById(table, id) {
        if (!supabase) return localDB.getById(table, id);
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error) return null;
        return data;
    },

    async add(table, data) {
        if (!supabase) return localDB.add(table, data);
        const { data: inserted, error } = await supabase.from(table).insert([data]).select('*').single();
        if (error) throw error;
        return inserted;
    },

    async update(table, id, data) {
        if (!supabase) return localDB.update(table, id, data);
        const { data: updated, error } = await supabase.from(table).update(data).eq('id', id).select().single();
        if (error) throw error;
        return updated;
    },

    async delete(table, id) {
        if (!supabase) return localDB.delete(table, id);
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
    },

    async query(table, field, operator, value) {
        if (!supabase) return localDB.query(table, field, operator, value);

        let query = supabase.from(table).select('*');

        // Map operator to Supabase filter
        switch (operator) {
            case '==': query = query.eq(field, value); break;
            case '!=': query = query.neq(field, value); break;
            case '>': query = query.gt(field, value); break;
            case '>=': query = query.gte(field, value); break;
            case '<': query = query.lt(field, value); break;
            case '<=': query = query.lte(field, value); break;
            case 'in': query = query.in(field, value); break;
            default: throw new Error(`Operator ${operator} not supported`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // Get Raw Client
    getClient() {
        return supabase;
    },

    async resetDatabase() {
        if (!supabase) {
            localStorage.clear();
            return;
        }

        const tables = [
            'match_events',
            'match_convocations',
            'match_teams',
            'matches',
            'players'
        ];

        for (const table of tables) {
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) {
                console.error(`Error resetting table ${table}:`, error);
                throw error;
            }
        }

        // Always clear local data after database wipe
        localStorage.clear();
    }
};

// ================================
// LocalStorage Fallback for Development
// ================================

class LocalDB {
    constructor() {
        this.prefix = 'calcetto_';
    }

    getCollection(name) {
        const data = localStorage.getItem(this.prefix + name);
        return data ? JSON.parse(data) : [];
    }

    saveCollection(name, data) {
        localStorage.setItem(this.prefix + name, JSON.stringify(data));
    }

    async getAll(collection) {
        return this.getCollection(collection);
    }

    async getById(collection, id) {
        const items = this.getCollection(collection);
        return items.find(item => item.id === id) || null;
    }

    async add(collection, data) {
        const items = this.getCollection(collection);
        const newItem = {
            ...data,
            id: data.id || this.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        items.push(newItem);
        this.saveCollection(collection, items);
        return newItem;
    }

    async update(collection, id, data) {
        const items = this.getCollection(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) throw new Error('Document not found');

        items[index] = {
            ...items[index],
            ...data,
            updated_at: new Date().toISOString()
        };
        this.saveCollection(collection, items);
        return items[index];
    }

    async delete(collection, id) {
        const items = this.getCollection(collection);
        const filtered = items.filter(item => item.id !== id);
        this.saveCollection(collection, filtered);
    }

    async query(collection, field, operator, value) {
        const items = this.getCollection(collection);
        return items.filter(item => {
            switch (operator) {
                case '==': return item[field] === value;
                case '!=': return item[field] !== value;
                case '>': return item[field] > value;
                case '>=': return item[field] >= value;
                case '<': return item[field] < value;
                case '<=': return item[field] <= value;
                case 'in': return value.includes(item[field]);
                default: return false;
            }
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

export const localDB = new LocalDB();

// Default export - uses Supabase proxy
export default supabaseDB;
