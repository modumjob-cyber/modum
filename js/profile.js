// ==================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================

// Загружаем профиль при открытии страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Страница профиля загружена');
    
    // Обновляем шапку
    updateHeader();
    
    // Проверяем авторизацию
    if (!isAuthenticated()) {
        console.log('❌ Пользователь не авторизован');
        window.location.href = 'index.html';
        return;
    }
    
    // Загружаем данные профиля
    await loadProfile();
});

// Основная функция загрузки профиля
async function loadProfile() {
    console.log('📥 Загрузка профиля...');
    
    // Показываем загрузку
    showLoading();
    
    try {
        // Получаем текущего пользователя
        const user = getCurrentUser();
        if (!user) throw new Error('Пользователь не найден');
        
        console.log('👤 Текущий пользователь:', user);
        
        // Загружаем статистику
        const stats = await api.getUserStats(user.id);
        console.log('📊 Статистика:', stats);
        
        // Загружаем рейтинг
        const rating = await api.getRating();
        const rank = await api.getUserRank(user.id);
        
        // Определяем соцсеть
        const socialType = user.vkId ? 'VK' : 'OK';
        const socialId = user.vkId || user.okId || '—';
        const profileLink = user.profileLink || '#';
        
        // Загружаем действия пользователя
        const actionsRes = await api.getUserActions(user.id, 'approved');
        const actions = actionsRes.success ? actionsRes.actions : [];
        
        // Группируем баллы по выпускам
        const actionsByEdition = {};
        actions.forEach(a => {
            if (!actionsByEdition[a.editionId]) actionsByEdition[a.editionId] = 0;
            actionsByEdition[a.editionId] += a.points;
        });
        
        // Формируем HTML
        const container = document.getElementById('profileContainer');
        container.innerHTML = `
            <div class="profile">
                <div class="profile-cover"></div>
                <div class="profile-info">
                    <div class="profile-avatar">
                        <div class="avatar-image">👤</div>
                    </div>
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
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-coins"></i></div>
                            <div class="stat-value">${stats.totalPoints}</div>
                            <div class="stat-label">${pluralize(stats.totalPoints, ['балл', 'балла', 'баллов'])}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-newspaper"></i></div>
                            <div class="stat-value">${stats.editionsCount}</div>
                            <div class="stat-label">${pluralize(stats.editionsCount, ['выпуск', 'выпуска', 'выпусков'])}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-thumbs-up"></i></div>
                            <div class="stat-value">${stats.likes}</div>
                            <div class="stat-label">${pluralize(stats.likes, ['лайк', 'лайка', 'лайков'])}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-comment"></i></div>
                            <div class="stat-value">${stats.comments}</div>
                            <div class="stat-label">${pluralize(stats.comments, ['комментарий', 'комментария', 'комментариев'])}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <section class="tituls-section">
                <h2 class="section-title">Мои титулы</h2>
                <div class="tituls-grid" id="titulsGrid"></div>
            </section>
            
            <section class="history-section">
                <h2 class="section-title">Баллы по выпускам</h2>
                <div class="history-list" id="pointsByEdition"></div>
            </section>
            
            <section class="rating-section">
                <h2 class="section-title">Моя позиция</h2>
                <div class="rating-position">
                    <div class="rating-rank">#${rank}</div>
                    <div class="rating-info">
                        <div class="rating-label">Место в рейтинге</div>
                        <div class="rating-value">${rank} из ${rating.length}</div>
                        <div class="rating-progress-bar">
                            <div class="rating-progress-fill" style="width:${Math.round((rating.length - rank) / rating.length * 100)}%"></div>
                        </div>
                        <div>Вы лучше ${Math.round((rating.length - rank) / rating.length * 100)}% пользователей</div>
                    </div>
                </div>
            </section>
        `;
        
        // Отображаем титулы
        displayTituls(user, stats.totalPoints);
        
        // Отображаем баллы по выпускам
        await displayPointsByEdition(actionsByEdition);
        
        console.log('✅ Профиль загружен');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки профиля:', error);
        document.getElementById('profileContainer').innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2>Ошибка загрузки профиля</h2>
                <p>Попробуйте обновить страницу</p>
                <button onclick="location.reload()" class="auth-btn">Обновить</button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Редактирование имени
async function editName() {
    console.log('✏️ Редактирование имени');
    
    const user = getCurrentUser();
    const newName = prompt('Введите новое имя:', user.name);
    
    if (newName && newName.trim()) {
        // Проверка на мат
        if (containsProfanity(newName)) {
            showNotification('Имя содержит недопустимые слова', 'error');
            return;
        }
        
        showLoading();
        
        try {
            const res = await api.updateUser(user.id, { name: newName.trim() });
            
            if (res.success) {
                // Обновляем локальные данные
                user.name = newName.trim();
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Перезагружаем профиль
                await loadProfile();
                updateHeader();
                
                showNotification('✅ Имя обновлено');
            } else {
                showNotification('❌ Ошибка обновления: ' + res.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('❌ Ошибка соединения', 'error');
        } finally {
            hideLoading();
        }
    }
}

// Отображение титулов
function displayTituls(user, points) {
    const tituls = CONFIG.tituls;
    let currentIdx = 0;
    
    if (points >= 30) currentIdx = 2;
    else if (points >= 10) currentIdx = 1;
    
    const grid = document.getElementById('titulsGrid');
    if (!grid) return;
    
    grid.innerHTML = tituls.map((t, idx) => {
        const isCurrent = idx === currentIdx;
        let progress = 0;
        
        if (idx === 0) {
            progress = Math.min(100, (points / 10) * 100);
        } else if (idx === 1) {
            progress = Math.min(100, ((points - 10) / 20) * 100);
        } else {
            progress = 100;
        }
        
        const nextPoints = idx === 0 ? 10 : idx === 1 ? 30 : 0;
        const pointsNeeded = nextPoints - points;
        
        return `
            <div class="titul-card ${isCurrent ? 'current' : ''}">
                <div class="titul-icon">${t.icon}</div>
                <div class="titul-name">${t.name}</div>
                <div class="titul-points">от ${t.minPoints} баллов</div>
                <div class="titul-progress-bar">
                    <div class="titul-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="titul-next">
                    ${idx < 2 
                        ? `До следующего: ${pointsNeeded} ${pluralize(pointsNeeded, ['балл', 'балла', 'баллов'])}` 
                        : 'Максимальный титул'}
                </div>
            </div>
        `;
    }).join('');
}

// Отображение баллов по выпускам
async function displayPointsByEdition(actionsByEdition) {
    const container = document.getElementById('pointsByEdition');
    if (!container) return;
    
    try {
        const editionsRes = await api.getEditions('all');
        const editions = editionsRes.success ? editionsRes.editions : [];
        
        if (Object.keys(actionsByEdition).length === 0) {
            container.innerHTML = '<p style="text-align:center;">Пока нет начисленных баллов</p>';
            return;
        }
        
        let html = '';
        
        for (const edition of editions) {
            const points = actionsByEdition[edition.id] || 0;
            if (points === 0) continue;
            
            html += `
                <div class="history-item">
                    <div class="history-icon">📰</div>
                    <div class="history-content">
                        <div class="history-title">${edition.title}</div>
                        <div class="history-meta">
                            <span>${formatDate(edition.date)}</span>
                            <span class="history-points">+${points} ${pluralize(points, ['балл', 'балла', 'баллов'])}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (html === '') {
            container.innerHTML = '<p style="text-align:center;">Нет данных</p>';
        } else {
            container.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки выпусков:', error);
        container.innerHTML = '<p style="text-align:center;">Ошибка загрузки</p>';
    }
}

// Функция склонения (дублируем на всякий случай)
function pluralize(number, words) {
    const cases = [2, 0, 1, 1, 1, 2];
    const index = (number % 100 > 4 && number % 100 < 20) ? 2 : cases[Math.min(number % 10, 5)];
    return words[index];
}

// Обновление данных профиля (для вызова из других мест)
async function refreshProfile() {
    await loadProfile();
}