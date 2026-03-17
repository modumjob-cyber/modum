let currentUser = null;

async function initAuth() {
    console.log('🔄 Инициализация авторизации...');
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            console.log('👤 Найден сохранённый пользователь:', currentUser);
            showAuthorizedUI();
        } catch (e) { console.error(e); }
    }
    setupEventListeners();
}

function setupEventListeners() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }
    const selectVk = document.getElementById('selectVk');
    const selectOk = document.getElementById('selectOk');
    if (selectVk) {
        selectVk.addEventListener('click', () => {
            document.getElementById('socialType').value = 'vk';
            selectVk.classList.add('active');
            selectOk.classList.remove('active');
        });
    }
    if (selectOk) {
        selectOk.addEventListener('click', () => {
            document.getElementById('socialType').value = 'ok';
            selectOk.classList.add('active');
            selectVk.classList.remove('active');
        });
    }
}

async function handleLogin() {
    const login = document.getElementById('login')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const socialId = document.getElementById('socialId')?.value.trim();
    const profileLink = document.getElementById('profileLink')?.value.trim();
    const socialType = document.getElementById('socialType')?.value || 'vk';

    if (!login || !password || !socialId || !profileLink) {
        showNotification('❌ Заполните все поля', 'error');
        return;
    }

    showLoading();

    try {
        let result = await api.login(login, password);
        if (result.success && result.user) {
            currentUser = result.user;
        } else {
            result = await api.createUser(login, password, socialType, socialId, profileLink, `Пользователь ${login}`);
            if (result.success && result.user) {
                currentUser = result.user;
            } else {
                showNotification('Ошибка: ' + (result.error || 'неизвестная'), 'error');
                hideLoading();
                return;
            }
        }

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        hideLoading();
        showNotification(`Добро пожаловать, ${currentUser.name}!`);
        showAuthorizedUI();

    } catch (error) {
        console.error(error);
        showNotification('Ошибка соединения', 'error');
        hideLoading();
    }
}

function showAuthorizedUI() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('featuredSection').style.display = 'block';
    document.getElementById('ratingSection').style.display = 'block';
    updateHeader();
    loadHomeEditions();
    loadHomeRating();
}

function updateHeader() {
    const userInfo = document.getElementById('userInfo');
    const adminLink = document.getElementById('adminLink');
    if (!userInfo) return;
    if (currentUser) {
        userInfo.innerHTML = `
            <div class="user-badge">
                <span class="user-name">${currentUser.name}</span>
                <span class="user-titul">${currentUser.titul || 'Читатель'}</span>
                <span class="user-balance">💰 ${currentUser.balance || 0}</span>
            </div>
            <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i></button>
        `;
        if (adminLink) adminLink.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';
    } else {
        userInfo.innerHTML = '';
        if (adminLink) adminLink.style.display = 'none';
    }
}

async function loadHomeEditions() {
    const container = document.getElementById('latestEditions');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
    try {
        const res = await api.getEditions('active');
        if (!res.success || !res.editions) {
            container.innerHTML = '<p style="text-align:center;">Ошибка загрузки</p>';
            return;
        }
        const editions = res.editions || [];
        if (editions.length === 0) {
            container.innerHTML = '<p style="text-align:center;">Нет активных выпусков</p>';
            return;
        }
        const sorted = editions.sort((a,b) => new Date(b.date) - new Date(a.date));
        const latest = sorted.slice(0,3);
        let html = '';
        for (let e of latest) {
            let isRead = false;
            if (currentUser) {
                const readRes = await api.isRead(currentUser.id, e.id);
                isRead = readRes.success ? readRes.read : false;
            }
            html += `
                <div class="edition-card ${isRead ? '' : 'unread'}" onclick="window.location.href='edition.html?id=${e.id}'">
                    <div class="edition-card__cover ${e.cover ? '' : 'default'}" ${e.cover ? `style="background-image: url('${e.cover}');"` : ''}>${e.cover ? '' : 'MODUM'}</div>
                    <div class="edition-card__content">
                        <div class="edition-card__date">${formatDate(e.date)}</div>
                        <h3 class="edition-card__title">${e.title}</h3>
                        <p class="edition-card__desc">${e.description}</p>
                        <div class="edition-card__footer">
                            <span class="edition-card__status ${e.status}">${e.status === 'active' ? 'Активен' : 'Завершён'}</span>
                            <span class="edition-card__points">⭐ ${CONFIG.points.maxPerEdition}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center; color:red;">Ошибка загрузки</p>';
    }
}

async function loadHomeRating() {
    const container = document.getElementById('homeRating');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-text"></div><div class="skeleton-text"></div><div class="skeleton-text"></div>';
    try {
        const rating = await api.getRating(10);
        if (!rating.length) {
            container.innerHTML = '<p style="text-align:center;">Нет участников</p>';
            return;
        }
        container.innerHTML = rating.map((u,i) => {
            const points = u.balance || 0;
            const pointsText = points + ' ' + pluralize(points, ['балл', 'балла', 'баллов']);
            return `
                <div class="rating-item" style="padding:12px; border-bottom:1px solid var(--gray-200);">
                    <div style="display:flex; justify-content:space-between;">
                        <div><span style="font-weight:700; margin-right:10px;">#${i+1}</span> ${u.name}</div>
                        <div><span class="user-titul" style="background:var(--black);">${u.titul}</span> · ${pointsText}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center;">Ошибка загрузки</p>';
    }
}
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.reload();
}