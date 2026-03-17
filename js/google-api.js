class GoogleAPI {
    constructor() {
        // !!! ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ !!!
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbxQUSvIqxYBkgvyu3DeNLGyNTpXnqIFPth1giOqQnK3TO_KrPIpUxzFDqbJHvvYzqKJ/exec';
        console.log('✅ GoogleAPI инициализирован, URL:', this.scriptUrl);
    }

    async request(action, params = {}) {
        let url = this.scriptUrl + '?action=' + encodeURIComponent(action);
        for (let key in params) {
            url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }
        console.log(`📤 Запрос: ${action}`, params);
        try {
            const response = await fetch(url);
            const text = await response.text();
            console.log('📥 Ответ:', text.substring(0,200) + '...');
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('❌ Не JSON:', text);
                return { success: false, error: 'Ответ не JSON', raw: text };
            }
        } catch (error) {
            console.error('❌ Ошибка сети:', error);
            return { success: false, error: error.message };
        }
    }

    // === ПОЛЬЗОВАТЕЛИ ===
    async login(login, password) {
        return this.request('login', { login, password });
    }
    async createUser(login, password, vkId, okId, profileLink, name) {
        return this.request('createUser', { login, password, vkId, okId, profileLink, name });
    }
    async getAllUsers() {
        return this.request('getAllUsers', {});
    }
    async getUser(userId) {
        return this.request('getUser', { userId });
    }
    async updateUser(userId, updates) {
        return this.request('updateUser', { userId, updates: JSON.stringify(updates) });
    }
    async searchUsers(query) {
        return this.request('searchUsers', { query });
    }

    // === ВЫПУСКИ ===
    async getEditions(filter = 'all') {
        return this.request('getEditions', { filter });
    }
    async getEdition(editionId) {
        return this.request('getEdition', { editionId });
    }
    async addEdition(editionData) {
        return this.request('addEdition', editionData);
    }
    async updateEdition(editionId, updates) {
        return this.request('updateEdition', { editionId, updates: JSON.stringify(updates) });
    }
    async deleteEdition(editionId) {
        return this.request('deleteEdition', { editionId });
    }

    // === ДЕЙСТВИЯ ===
    async getUserActions(userId, status = 'all') {
        return this.request('getUserActions', { userId, status });
    }
    async addAction(userId, editionId, type, points = 1, status = 'pending') {
        // Проверим, нет ли уже такого действия
        const existing = await this.getUserActions(userId, 'all');
        if (existing.success) {
            const already = existing.actions.find(a => 
                a.editionId == editionId && 
                a.type === type && 
                (a.status === 'pending' || a.status === 'approved')
            );
            if (already) {
                return { success: false, error: 'Действие уже зарегистрировано' };
            }
        }
        return this.request('addAction', { userId, editionId, type, points, status });
    }
    async getPendingActions() {
        return this.request('getPendingActions', {});
    }
    async approveAction(actionId, approve = true) {
        return this.request('approveAction', { actionId, approve: approve.toString() });
    }

    // === ПРОЧТЕНИЯ ===
    async markAsRead(userId, editionId) {
        return this.request('markAsRead', { userId, editionId });
    }
    async isRead(userId, editionId) {
        return this.request('isRead', { userId, editionId });
    }

    // === ТЕСТ ===
    async testConnection() {
        return this.request('test', {});
    }
}

const googleApi = new GoogleAPI();