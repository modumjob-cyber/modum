document.addEventListener('DOMContentLoaded', async () => {
    updateHeader();
    if (!isAuthenticated()) window.location.href = 'index.html';
    await loadProfile();
});

async function loadProfile() {
    const user = getCurrentUser();
    const stats = await api.getUserStats(user.id);
    const rating = await api.getRating();
    const rank = await api.getUserRank(user.id);
    const socialType = user.vkId ? 'VK' : 'OK';
    const socialId = user.vkId || user.okId;
    const profileLink = user.profileLink || '#';

    const actionsRes = await api.getUserActions(user.id, 'approved');
    const actions = actionsRes.success ? actionsRes.actions : [];
    const actionsByEdition = {};
    actions.forEach(a => {
        if (!actionsByEdition[a.editionId]) actionsByEdition[a.editionId] = 0;
        actionsByEdition[a.editionId] += a.points;
    });

    const container = document.getElementById('profileContainer');
    container.innerHTML = `
        <div class="profile">
            <div class="profile-cover"></div>
            <div class="profile-info">
                <div class="profile-avatar"><div class="avatar-image">👤</div></div>
                <div class="profile-name">
                    ${user.name}
                    <button class="edit-name-btn" onclick="editName()"><i class="fas fa-pen"></i></button>
                </div>
                <div class="profile-id">Логин: ${user.login}</div>
                <div class="profile-id">${socialType} ID: ${socialId}</div>
                <a href="${profileLink}" class="profile-link" target="_blank">${profileLink}</a>
                <div class="profile-badge">
                    <span class="profile-titul"><i class="fas fa-star"></i> ${user.titul}</span>
                    <span class="profile-join-date">С нами с ${formatDate(user.registrationDate)}</span>
                </div>
                <div class="profile-stats">
                    <div class="stat-card"><div class="stat-value">${stats.totalPoints}</div><div class="stat-label">Всего баллов</div></div>
                    <div class="stat-card"><div class="stat-value">${stats.editionsCount}</div><div class="stat-label">Выпусков</div></div>
                    <div class="stat-card"><div class="stat-value">${stats.likes}</div><div class="stat-label">Лайков</div></div>
                    <div class="stat-card"><div class="stat-value">${stats.comments}</div><div class="stat-label">Комментариев</div></div>
                </div>
            </div>
        </div>
        <section class="tituls-section"><h2 class="section-title">Мои титулы</h2><div class="tituls-grid" id="titulsGrid"></div></section>
        <section class="history-section"><h2 class="section-title">Баллы по выпускам</h2><div class="history-list" id="pointsByEdition"></div></section>
        <section class="rating-section"><h2 class="section-title">Моя позиция</h2><div class="rating-position"><div class="rating-rank">#${rank}</div><div class="rating-info"><div class="rating-label">Место в рейтинге</div><div class="rating-value">${rank} из ${rating.length}</div><div class="rating-progress-bar"><div class="rating-progress-fill" style="width:${Math.round((rating.length-rank)/rating.length*100)}%"></div></div></div></div></section>
    `;
    displayTituls(user, stats.totalPoints);
    displayPointsByEdition(actionsByEdition);
}

async function editName() {
    const user = getCurrentUser();
    const newName = prompt('Введите новое имя:', user.name);
    if (newName && newName.trim()) {
        if (containsProfanity(newName)) {
            showNotification('Имя содержит недопустимые слова', 'error');
            return;
        }
        const res = await api.updateUser(user.id, { name: newName.trim() });
        if (res.success) {
            user.name = newName.trim();
            localStorage.setItem('currentUser', JSON.stringify(user));
            await loadProfile();
            updateHeader();
            showNotification('Имя обновлено');
        } else {
            showNotification('Ошибка обновления', 'error');
        }
    }
}

function displayTituls(user, points) {
    const tituls = CONFIG.tituls;
    let currentIdx = points >= 30 ? 2 : points >= 10 ? 1 : 0;
    const grid = document.getElementById('titulsGrid');
    grid.innerHTML = tituls.map((t, idx) => {
        const isCurrent = idx === currentIdx;
        const nextPoints = idx === 0 ? 10 : idx === 1 ? 30 : 0;
        const progress = idx === 0 ? Math.min(100, points/10*100) : idx === 1 ? Math.min(100, (points-10)/20*100) : 100;
        return `
            <div class="titul-card ${isCurrent ? 'current' : ''}">
                <div class="titul-icon">${t.icon}</div>
                <div class="titul-name">${t.name}</div>
                <div class="titul-points">от ${t.minPoints} баллов</div>
                <div class="titul-progress-bar"><div class="titul-progress-fill" style="width:${progress}%"></div></div>
                <div class="titul-next">${idx < 2 ? `До следующего: ${nextPoints - points} баллов` : 'Максимальный титул'}</div>
            </div>
        `;
    }).join('');
}

async function displayPointsByEdition(actionsByEdition) {
    const container = document.getElementById('pointsByEdition');
    const editionsRes = await api.getEditions('all');
    const editions = editionsRes.success ? editionsRes.editions : [];
    if (Object.keys(actionsByEdition).length === 0) {
        container.innerHTML = '<p style="text-align:center;">Нет данных</p>';
        return;
    }
    container.innerHTML = editions.map(e => {
        const points = actionsByEdition[e.id] || 0;
        if (points === 0) return '';
        return `
            <div class="history-item">
                <div class="history-icon">📰</div>
                <div class="history-content">
                    <div class="history-title">${e.title}</div>
                    <div class="history-meta">
                        <span>${formatDate(e.date)}</span>
                        <span class="history-points">+${points} баллов</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}