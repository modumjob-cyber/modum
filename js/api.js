class CloudAPI {
    constructor() {
        this.api = googleApi;
        console.log('✅ CloudAPI инициализирован');
    }

    // === ПОЛЬЗОВАТЕЛИ ===
    async login(login, password) {
        return this.api.login(login, password);
    }
    async createUser(login, password, socialType, socialId, profileLink, name) {
        const params = { login, password, profileLink, name };
        if (socialType === 'vk') params.vkId = socialId;
        else params.okId = socialId;
        return this.api.createUser(params.login, params.password, params.vkId || '', params.okId || '', params.profileLink, params.name);
    }
    async getAllUsers() {
        return this.api.getAllUsers();
    }
    async getUser(userId) {
        return this.api.getUser(userId);
    }
    async updateUser(userId, updates) {
        return this.api.updateUser(userId, updates);
    }
    async searchUsers(query) {
        return this.api.searchUsers(query);
    }

    // === ВЫПУСКИ ===
    async getEditions(filter = 'all') {
        return this.api.getEditions(filter);
    }
    async getEdition(editionId) {
        return this.api.getEdition(editionId);
    }
    async addEdition(editionData) {
        return this.api.addEdition(editionData);
    }
    async updateEdition(editionId, updates) {
        return this.api.updateEdition(editionId, updates);
    }
    async deleteEdition(editionId) {
        return this.api.deleteEdition(editionId);
    }

    // === ДЕЙСТВИЯ ===
    async getUserActions(userId, status = 'all') {
        return this.api.getUserActions(userId, status);
    }
    async addAction(userId, editionId, type) {
        const points = CONFIG.points[type] || 1;
        return this.api.addAction(userId, editionId, type, points, 'pending');
    }
    async getPendingActions() {
        return this.api.getPendingActions();
    }
    async approveAction(actionId, approve = true) {
        return this.api.approveAction(actionId, approve);
    }

    // === ПРОЧТЕНИЯ ===
    async markAsRead(userId, editionId) {
        return this.api.markAsRead(userId, editionId);
    }
    async isRead(userId, editionId) {
        return this.api.isRead(userId, editionId);
    }

    // === СТАТИСТИКА ===
    async getUserStats(userId) {
        const actionsRes = await this.getUserActions(userId, 'approved');
        if (!actionsRes.success) return { totalPoints: 0, editionsCount: 0, likes: 0, comments: 0, reads: 0, interactives: 0 };
        const actions = actionsRes.actions || [];
        return {
            totalPoints: actions.reduce((sum, a) => sum + a.points, 0),
            editionsCount: new Set(actions.map(a => a.editionId)).size,
            likes: actions.filter(a => a.type === 'like').length,
            comments: actions.filter(a => a.type === 'comment').length,
            reads: actions.filter(a => a.type === 'read').length,
            interactives: actions.filter(a => a.type === 'interactive').length
        };
    }

    async getRating(limit = 50) {
        const usersRes = await this.getAllUsers();
        if (!usersRes.success) return [];
        const regular = usersRes.users.filter(u => u.role !== 'admin');
        const sorted = regular.sort((a,b) => (b.balance||0) - (a.balance||0));
        return sorted.slice(0, limit).map((u,i) => ({ ...u, rank: i+1 }));
    }

    async getUserRank(userId) {
        const rating = await this.getRating();
        const idx = rating.findIndex(u => u.id === userId);
        return idx !== -1 ? idx + 1 : rating.length + 1;
    }
}

const api = new CloudAPI();