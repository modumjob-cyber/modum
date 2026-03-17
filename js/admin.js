document.addEventListener('DOMContentLoaded', async function() {
    updateHeader();
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    await loadAdminStats();
    await loadEditionsList();
    await loadPendingActions();
    await loadUsersRating();
    await loadUsersPasswords();
    await loadBalanceUsers();
    await loadBalanceStats();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('editionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createEdition();
    });
    document.getElementById('searchBtn')?.addEventListener('click', searchUsers);
    document.getElementById('balanceSearchBtn')?.addEventListener('click', searchBalanceUsers);
}

// Функция для обновления текущего пользователя в шапке
async function updateCurrentUserBalance() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    // Получаем свежие данные из базы
    const userRes = await api.getUser(currentUser.id);
    if (userRes.success) {
        const updatedUser = userRes.user;
        // Обновляем localStorage
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        // Обновляем шапку
        updateHeader();
    }
}

window.switchTab = function(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'balance') { loadBalanceUsers(); loadBalanceStats(); }
    else if (tab === 'users') { loadUsersRating(); loadUsersPasswords(); }
    else if (tab === 'actions') loadPendingActions();
    else if (tab === 'editions') loadEditionsList();
};

async function loadAdminStats() {
    const usersRes = await api.getAllUsers();
    const editionsRes = await api.getEditions('all');
    const pendingRes = await api.getPendingActions();
    if (!usersRes.success || !editionsRes.success || !pendingRes.success) return;
    const regularUsers = usersRes.users.filter(u => u.role !== 'admin');
    const pendingActions = pendingRes.actions || [];
    document.getElementById('adminStats').innerHTML = `
        <div class="stat-card"><div class="stat-number">${regularUsers.length}</div><div class="stat-label">Пользователей</div></div>
        <div class="stat-card"><div class="stat-number">${editionsRes.editions.length}</div><div class="stat-label">Выпусков</div></div>
        <div class="stat-card"><div class="stat-number">${pendingActions.length}</div><div class="stat-label">На проверке</div></div>
    `;
}

async function createEdition() {
    const title = document.getElementById('title').value;
    const desc = document.getElementById('desc').value;
    const date = document.getElementById('date').value;
    const status = document.getElementById('status').value;
    const vkPost = document.getElementById('vkPost').value;
    const readLink = document.getElementById('readLink').value;
    const cover = document.getElementById('cover').value;
    const interactiveTitle = document.getElementById('interactiveTitle').value;
    const interactiveDesc = document.getElementById('interactiveDesc').value;
    const interactiveLink = document.getElementById('interactiveLink').value;
    
    const editionData = { 
        title, 
        description: desc, 
        date, 
        status, 
        vkPost, 
        readLink, 
        cover,
        interactiveTitle,
        interactiveDesc,
        interactiveLink
    };
    const res = await api.addEdition(editionData);
    if (res.success) {
        showNotification('✅ Выпуск создан');
        clearForm();
        await loadEditionsList();
        await loadAdminStats();
    } else {
        showNotification('❌ Ошибка: ' + res.error, 'error');
    }
}

async function loadEditionsList() {
    const res = await api.getEditions('all');
    if (!res.success) return;
    const editions = res.editions;
    const sorted = editions.sort((a,b) => new Date(b.date) - new Date(a.date));
    document.getElementById('editionsList').innerHTML = sorted.map(e => `
        <div class="edition-item">
            <div class="edition-info">
                <div class="edition-title">${e.title}</div>
                <div class="edition-meta">
                    <span><i class="far fa-calendar"></i> ${e.date}</span>
                    <span class="status-badge ${e.status === 'active' ? 'status-active' : 'status-past'}">${e.status === 'active' ? 'Активен' : 'Завершён'}</span>
                </div>
            </div>
            <div class="edition-actions">
                <button class="edit-btn" onclick="editEdition('${e.id}')"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteEdition('${e.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editEdition = async function(editionId) {
    const res = await api.getEdition(editionId);
    if (!res.success) return;
    const e = res.edition;
    document.getElementById('title').value = e.title;
    document.getElementById('desc').value = e.description;
    document.getElementById('date').value = e.date;
    document.getElementById('status').value = e.status;
    document.getElementById('vkPost').value = e.vkPost || '';
    document.getElementById('readLink').value = e.readLink || '';
    document.getElementById('cover').value = e.cover || '';
    if (e.interactive) {
        document.getElementById('interactiveTitle').value = e.interactive.title || '';
        document.getElementById('interactiveDesc').value = e.interactive.description || '';
        document.getElementById('interactiveLink').value = e.interactive.qrCode || '';
    }
    await deleteEdition(editionId, false);
    showNotification('✏️ Измените данные и создайте заново');
};

window.deleteEdition = async function(editionId, showMsg = true) {
    if (confirm('Удалить выпуск?')) {
        const res = await api.deleteEdition(editionId);
        if (res.success) {
            if (showMsg) showNotification('✅ Выпуск удалён');
            await loadEditionsList();
            await loadAdminStats();
        } else {
            showNotification('❌ Ошибка', 'error');
        }
    }
};

function clearForm() {
    document.getElementById('editionForm').reset();
}

async function loadPendingActions() {
    const res = await api.getPendingActions();
    if (!res.success) return;
    const pending = res.actions || [];
    const usersRes = await api.getAllUsers();
    const users = usersRes.success ? usersRes.users : [];
    const editionsRes = await api.getEditions('all');
    const editions = editionsRes.success ? editionsRes.editions : [];
    const container = document.getElementById('pendingActions');
    if (pending.length === 0) {
        container.innerHTML = '<p style="text-align:center;">Нет действий на проверке</p>';
    } else {
        container.innerHTML = pending.map(a => {
            const user = users.find(u => u.id === a.userId) || { name: '?', login: '?' };
            const ed = editions.find(e => e.id == a.editionId) || { title: '?' };
            return `
                <div class="action-item">
                    <div>
                        <div><strong>${user.name}</strong> (${user.login})</div>
                        <div><span class="action-type">${getActionType(a.type)}</span> · ${ed.title}</div>
                        <div style="font-size:12px;">${new Date(a.date).toLocaleString()}</div>
                    </div>
                    <div>
                        <button class="approve-btn" onclick="approveAction('${a.id}')"><i class="fas fa-check"></i></button>
                        <button class="reject-btn" onclick="rejectAction('${a.id}')"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }
    const allActions = await api.getUserActions('all', 'approved');
    const approved = allActions.success ? allActions.actions.slice(-5) : [];
    const approvedContainer = document.getElementById('approvedActions');
    if (approved.length === 0) {
        approvedContainer.innerHTML = '<p>Нет подтверждённых</p>';
    } else {
        approvedContainer.innerHTML = approved.map(a => {
            const user = users.find(u => u.id === a.userId) || { name: '?' };
            return `
                <div class="action-item">
                    <div><div>${user.name}</div><div style="font-size:13px;">${getActionType(a.type)} +${a.points}</div></div>
                    <div><i class="fas fa-check-circle" style="color:#4caf50;"></i></div>
                </div>
            `;
        }).join('');
    }
}

function getActionType(type) {
    const types = { read:'📖 Прочтение', like:'👍 Лайк', comment:'💬 Комментарий', interactive:'🎮 Интерактив' };
    return types[type] || type;
}

window.approveAction = async function(actionId) {
    const res = await api.approveAction(actionId, true);
    if (res.success) {
        showNotification('✅ Подтверждено');
        await updateCurrentUserBalance(); // ← ДОБАВИТЬ ЭТУ СТРОКУ
        await loadPendingActions();
        await loadUsersRating();
        await loadUsersPasswords();
        await loadBalanceUsers();
        await loadBalanceStats();
        await loadAdminStats();
    } else {
        showNotification('❌ Ошибка', 'error');
    }
};

async function rejectAction(actionId) {
    const res = await api.approveAction(actionId, false);
    if (res.success) {
        showNotification('❌ Отклонено');
        await loadPendingActions();
    } else {
        showNotification('❌ Ошибка', 'error');
    }
}

async function loadUsersRating() {
    const rating = await api.getRating(100);
    document.getElementById('usersRating').innerHTML = rating.map((u,i) => {
        const points = u.balance || 0;
        return `
            <div class="user-item">
                <div><strong>${u.name}</strong><br><span style="font-size:13px;">${u.login} · ${u.vkId?'VK: '+u.vkId:'OK: '+u.okId}</span></div>
                <div style="text-align:right;">
                    <div style="font-weight:700;">#${i+1}</div>
                    <div>${u.titul} · ${points} ${pluralize(points, ['балл', 'балла', 'баллов'])}</div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadUsersPasswords() {
    const usersRes = await api.getAllUsers();
    if (!usersRes.success) return;
    const users = usersRes.users;
    document.getElementById('usersPasswords').innerHTML = users.map(u => `
        <div class="user-item">
            <div><strong>${u.name} ${u.role==='admin'?'👑':''}</strong><br><span style="font-size:13px;">Логин: ${u.login} · Пароль: <span style="background:#f0f0f0; padding:2px 6px; border-radius:4px;">${u.password}</span></span></div>
            <div style="font-size:12px;">${u.vkId?'VK: '+u.vkId:'OK: '+u.okId}</div>
        </div>
    `).join('');
}

async function searchUsers() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    if (!query) return;
    const res = await api.searchUsers(query);
    const users = res.success ? res.users : [];
    document.getElementById('searchResults').innerHTML = users.map(u => `
        <div class="user-item">
            <div><strong>${u.name}</strong><br>Логин: ${u.login} · Баланс: ${u.balance}<br>${u.vkId?'VK: '+u.vkId:'OK: '+u.okId}</div>
            <div><span class="status-badge status-active">${u.titul}</span></div>
        </div>
    `).join('');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

async function loadBalanceUsers() {
    const usersRes = await api.getAllUsers();
    if (!usersRes.success) return;
    const users = usersRes.users;
    document.getElementById('balanceUsersList').innerHTML = users.map(u => `
        <div class="user-item" id="user-${u.id}">
            <div class="user-info">
                <div><strong>${u.name} ${u.role==='admin'?'👑':''}</strong></div>
                <div style="font-size:13px;">Логин: ${u.login} · Баланс: <span id="balance-${u.id}">${u.balance||0}</span></div>
                <div class="balance-edit">
                    <input type="number" class="balance-input" id="input-${u.id}" placeholder="Баллы">
                    <button class="btn-primary" onclick="addPoints('${u.id}')">➕ Добавить</button>
                    <button class="btn-warning" onclick="setPoints('${u.id}')">✏️ Установить</button>
                    <button class="btn-danger" onclick="resetPoints('${u.id}')">🔄 Сбросить</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function addPoints(userId) {
    const input = document.getElementById(`input-${userId}`);
    const points = parseInt(input.value);
    if (isNaN(points)) return showNotification('Введите число','error');
    const usersRes = await api.getAllUsers();
    if (!usersRes.success) return;
    const user = usersRes.users.find(u => u.id === userId);
    if (!user) return;
    const newBalance = (user.balance||0) + points;
    let newTitul = 'Читатель';
    if (newBalance >= 30) newTitul = 'Мастер';
    else if (newBalance >= 10) newTitul = 'Интерпретатор';
    const updateRes = await api.updateUser(userId, { balance: newBalance, titul: newTitul });
    if (updateRes.success) {
        document.getElementById(`balance-${userId}`).textContent = newBalance;
        input.value = '';
await updateCurrentUserBalance();
        showNotification(`✅ Добавлено ${points}`);
        await loadUsersRating();
        await loadBalanceStats();
        await loadAdminStats();
    } else showNotification('❌ Ошибка','error');
}

async function setPoints(userId) {
    const input = document.getElementById(`input-${userId}`);
    const points = parseInt(input.value);
    if (isNaN(points)) return showNotification('Введите число','error');
    let newTitul = 'Читатель';
    if (points >= 30) newTitul = 'Мастер';
    else if (points >= 10) newTitul = 'Интерпретатор';
    const updateRes = await api.updateUser(userId, { balance: points, titul: newTitul });
    if (updateRes.success) {
        document.getElementById(`balance-${userId}`).textContent = points;
        input.value = '';
await updateCurrentUserBalance();
        showNotification(`✅ Установлено ${points}`);
        await loadUsersRating();
        await loadBalanceStats();
        await loadAdminStats();
    } else showNotification('❌ Ошибка','error');
}

async function resetPoints(userId) {
    if (!confirm('Сбросить баланс до 0?')) return;
    const updateRes = await api.updateUser(userId, { balance: 0, titul: 'Читатель' });
    if (updateRes.success) {
        document.getElementById(`balance-${userId}`).textContent = '0';
await updateCurrentUserBalance();
        showNotification('✅ Баланс сброшен');
        await loadUsersRating();
        await loadBalanceStats();
        await loadAdminStats();
    } else showNotification('❌ Ошибка','error');
}

async function searchBalanceUsers() {
    const query = document.getElementById('balanceSearch').value.toLowerCase();
    const usersRes = await api.getAllUsers();
    if (!usersRes.success) return;
    const filtered = usersRes.users.filter(u => u.login?.toLowerCase().includes(query) || u.name?.toLowerCase().includes(query));
    const container = document.getElementById('balanceUsersList');
    if (!filtered.length) container.innerHTML = '<p>Ничего не найдено</p>';
    else {
        container.innerHTML = filtered.map(u => `
            <div class="user-item" id="user-${u.id}">
                <div class="user-info">
                    <div><strong>${u.name} ${u.role==='admin'?'👑':''}</strong></div>
                    <div style="font-size:13px;">Логин: ${u.login} · Баланс: <span id="balance-${u.id}">${u.balance||0}</span></div>
                    <div class="balance-edit">
                        <input type="number" class="balance-input" id="input-${u.id}" placeholder="Баллы">
                        <button class="btn-primary" onclick="addPoints('${u.id}')">➕ Добавить</button>
                        <button class="btn-warning" onclick="setPoints('${u.id}')">✏️ Установить</button>
                        <button class="btn-danger" onclick="resetPoints('${u.id}')">🔄 Сбросить</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

async function loadBalanceStats() {
    const usersRes = await api.getAllUsers();
    if (!usersRes.success) return;
    const regular = usersRes.users.filter(u => u.role !== 'admin');
    const balances = regular.map(u => u.balance||0);
    const total = balances.reduce((s,b)=>s+b,0);
    const avg = balances.length ? Math.round(total/balances.length) : 0;
    const max = balances.length ? Math.max(...balances) : 0;
    document.getElementById('totalPoints').textContent = total;
    document.getElementById('avgPoints').textContent = avg;
    document.getElementById('maxPoints').textContent = max;
    document.getElementById('usersCount').textContent = regular.length;
}