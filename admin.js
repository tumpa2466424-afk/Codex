export function installAdminFeatures(context) {
    const { UserSystem, PromotionSystem, MessageSystem, LOCUS_API_URL } = context;
    if (UserSystem.adminModuleInstalled) return;
    UserSystem.adminModuleInstalled = true;

    Object.assign(UserSystem, {
        getAdminListPagerState: function(kind) {
            if (!this.adminListPager) {
                this.adminListPager = {
                    users: { page: 1, limit: 25 },
                    promos: { page: 1, limit: 25 },
                    actions: { page: 1, limit: 25 },
                    messages: { page: 1, limit: 25 }
                };
            }
            if (!this.adminListPager[kind]) this.adminListPager[kind] = { page: 1, limit: 25 };
            return this.adminListPager[kind];
        },

        goToAdminListPage: function(kind, page) {
            const pager = this.getAdminListPagerState(kind);
            pager.page = Math.max(1, parseInt(page, 10) || 1);
            if (kind === 'users') return this.loadUsers();
            if (kind === 'promos') return this.loadPromos();
            if (kind === 'actions') return PromotionSystem.loadActionsList();
            if (kind === 'messages') return MessageSystem.loadMessagesForAdmin();
        },

        renderAdminListPager: function(kind, data) {
            const page = Math.max(1, Number(data?.page) || 1);
            const limit = Math.max(1, Number(data?.limit) || 25);
            const total = Math.max(0, Number(data?.total) || 0);
            const totalPages = Math.max(1, Math.ceil(total / limit));
            if (totalPages <= 1) return '';

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-top:14px; padding-top:14px; border-top:1px solid var(--locus-border);">
                    <div style="font-size:12px; color:var(--locus-dark); opacity:0.75;">
                        Страница ${page} из ${totalPages} • Всего: ${total}
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="lc-btn lc-btn-secondary" style="padding:8px 12px;" onclick="UserSystem.goToAdminListPage('${kind}', ${page - 1})" ${page <= 1 ? 'disabled' : ''}>Назад</button>
                        <button class="lc-btn lc-btn-secondary" style="padding:8px 12px;" onclick="UserSystem.goToAdminListPage('${kind}', ${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Вперёд</button>
                    </div>
                </div>
            `;
        },

        loadUsers: async function() {
            const container = document.getElementById('admin-sec-users');
            if (!container) return;
            container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Загрузка базы YDB...</div>';

            const token = localStorage.getItem('locus_token');
            const pager = this.getAdminListPagerState('users');
            if (!token) {
                container.innerHTML = 'Нет доступа';
                return;
            }

            try {
                const res = await fetch(`${LOCUS_API_URL}?action=getAdminUsers&page=${pager.page}&limit=${pager.limit}`, {
                    headers: { 'X-Auth-Token': token }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Ошибка загрузки');

                pager.page = Math.max(1, Number(data.page) || pager.page);
                pager.limit = Math.max(1, Number(data.limit) || pager.limit);

                if ((!Array.isArray(data.users) || data.users.length === 0) && pager.page > 1) {
                    pager.page -= 1;
                    return this.loadUsers();
                }

                let totalRevenue = 0;
                let totalOrders = 0;
                const usersList = [];

                (Array.isArray(data.users) ? data.users : []).forEach(user => {
                    const history = this.getVisibleHistoryItems(user.history || []);
                    const spent = Number(user.totalSpent) || 0;
                    totalRevenue += spent;
                    totalOrders += history.length;

                    let freq = 'Нет покупок';
                    if (history.length === 1) freq = 'Новичок (1)';
                    else if (history.length > 10) freq = 'VIP (>10)';
                    else if (history.length > 3) freq = 'Постоянный';
                    else if (history.length > 1) freq = 'Активный';

                    let fav = '-';
                    if (history.length > 0) {
                        const counts = {};
                        history.forEach(entry => {
                            if (entry.isOrder && Array.isArray(entry.items)) {
                                entry.items.forEach(item => {
                                    if (!item.item) return;
                                    const name = item.item.split(' (')[0];
                                    counts[name] = (counts[name] || 0) + (item.qty || 1);
                                });
                                return;
                            }
                            if (!entry.item) return;
                            const name = entry.item.split(' (')[0];
                            counts[name] = (counts[name] || 0) + (entry.qty || 1);
                        });
                        if (Object.keys(counts).length > 0) {
                            fav = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                        }
                    }

                    let discount = Math.floor(spent / 3000);
                    if (discount > 15) discount = 15;

                    usersList.push({
                        id: user.id,
                        email: user.email,
                        spent,
                        discount,
                        freq,
                        fav
                    });
                });

                usersList.sort((a, b) => b.spent - a.spent);
                this.adminUsersMap = Object.fromEntries(usersList.map(user => [user.id, user]));

                let html = `
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; text-align:center;">
                        <div style="background:#fff; padding:10px; border:1px solid #E5E1D8; border-radius:8px;">
                            <div style="font-size:10px; color:gray; text-transform:uppercase;">Оборот страницы</div>
                            <div style="font-size:16px; font-weight:bold;">${totalRevenue.toLocaleString()} ₽</div>
                        </div>
                        <div style="background:#fff; padding:10px; border:1px solid #E5E1D8; border-radius:8px;">
                            <div style="font-size:10px; color:gray; text-transform:uppercase;">Покупок на странице</div>
                            <div style="font-size:16px; font-weight:bold;">${totalOrders}</div>
                        </div>
                        <div style="background:#fff; padding:10px; border:1px solid #E5E1D8; border-radius:8px;">
                            <div style="font-size:10px; color:gray; text-transform:uppercase;">Средний чек страницы</div>
                            <div style="font-size:16px; font-weight:bold;">${totalOrders ? Math.round(totalRevenue / totalOrders) : 0} ₽</div>
                        </div>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Клиент</th>
                                    <th>Скидка</th>
                                    <th>Любимый сорт</th>
                                    <th>Статус</th>
                                    <th>LTV</th>
                                    <th style="width:42px;"></th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                usersList.forEach(user => {
                    const isProtectedUser = this.normalizeEmailAddress(user.email) === 'info@locus.coffee';
                    html += `
                        <tr>
                            <td>
                                <div style="font-weight:600;">${user.email}</div>
                                <div style="font-size:9px; opacity:0.6;">ID: ...${String(user.id || '').slice(-5)}</div>
                            </td>
                            <td>${user.discount}%</td>
                            <td style="font-size:10px;">${user.fav}</td>
                            <td style="font-size:10px;">${user.freq}</td>
                            <td style="font-weight:bold;">${user.spent} ₽</td>
                            <td class="admin-user-actions-cell">
                                <button class="cat-btn-icon delete admin-user-delete-btn" type="button" title="${isProtectedUser ? 'Главный аккаунт нельзя удалить' : 'Удалить пользователя'}" onclick="UserSystem.deleteUser('${user.id}')" ${isProtectedUser ? 'disabled aria-disabled="true"' : ''}>&times;</button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                html += this.renderAdminListPager('users', data);
                container.innerHTML = html;
                this.startRetailCountdownTicker?.();
            } catch (e) {
                console.error(e);
                container.innerHTML = `<div style="color:#B66A58">Ошибка: ${e.message}</div>`;
            }
        },

        loadPromos: async function() {
            const list = document.getElementById('admin-promo-list');
            if (!list) return;
            list.innerHTML = 'Загрузка...';

            const token = localStorage.getItem('locus_token');
            const pager = this.getAdminListPagerState('promos');
            if (!token) {
                list.innerHTML = 'Нет доступа';
                return;
            }

            try {
                const res = await fetch(`${LOCUS_API_URL}?action=getPromos&page=${pager.page}&limit=${pager.limit}`, {
                    headers: { 'X-Auth-Token': token }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Ошибка загрузки');

                pager.page = Math.max(1, Number(data.page) || pager.page);
                pager.limit = Math.max(1, Number(data.limit) || pager.limit);

                if ((!Array.isArray(data.promos) || data.promos.length === 0) && pager.page > 1) {
                    pager.page -= 1;
                    return this.loadPromos();
                }

                list.innerHTML = '';
                if (!Array.isArray(data.promos) || data.promos.length === 0) {
                    list.innerHTML = '<div style="opacity:0.5; font-size:12px;">Нет промокодов</div>';
                    return;
                }

                data.promos.forEach(promo => {
                    const div = document.createElement('div');
                    div.className = 'promo-list-item';
                    div.innerHTML = `
                        <div>
                            <strong>${promo.id}</strong>
                            <span style="font-size:10px; color:gray;">(${promo.val} ${promo.type === 'percent' ? '%' : 'RUB'})</span>
                        </div>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <input type="checkbox" ${promo.active ? 'checked' : ''} onchange="UserSystem.togglePromo('${promo.id}', this.checked)">
                            <button onclick="UserSystem.deletePromo('${promo.id}')" style="border:none; background:transparent; color:#B66A58; cursor:pointer;">&times;</button>
                        </div>
                    `;
                    list.appendChild(div);
                });
                list.insertAdjacentHTML('beforeend', this.renderAdminListPager('promos', data));
            } catch (e) {
                console.error(e);
                list.innerHTML = 'Ошибка загрузки';
            }
        },

        addPromo: async function() {
            const code = document.getElementById('new-promo-code')?.value.toUpperCase().trim();
            const val = parseFloat(document.getElementById('new-promo-val')?.value || '0');
            const type = document.getElementById('new-promo-type')?.value || 'percent';
            if (!code || !val) return alert('Заполните код и значение');

            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=addPromo`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'addPromo', id: code, val, type, active: true })
                });
                const input = document.getElementById('new-promo-code');
                if (input) input.value = '';
                this.loadPromos();
            } catch (e) {
                alert('Ошибка добавления: ' + e.message);
            }
        },

        togglePromo: async function(id, status) {
            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=togglePromo`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'togglePromo', id, active: status })
                });
            } catch (e) {
                console.error(e);
            }
        },

        deletePromo: async function(id) {
            if (!confirm('Удалить промокод?')) return;
            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=deletePromo`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deletePromo', id })
                });
                this.loadPromos();
            } catch (e) {
                console.error(e);
            }
        }
    });

    Object.assign(PromotionSystem, {
        loadActionsList: async function() {
            const container = document.getElementById('admin-actions-list');
            if (!container) return;
            container.innerHTML = 'Загрузка...';

            const token = localStorage.getItem('locus_token');
            const pager = UserSystem.getAdminListPagerState('actions');
            if (!token) {
                container.innerHTML = 'Нет доступа';
                return;
            }

            try {
                const res = await fetch(`${LOCUS_API_URL}?action=getActions&page=${pager.page}&limit=${pager.limit}`, { headers: { 'X-Auth-Token': token } });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Ошибка загрузки');

                pager.page = Math.max(1, Number(data.page) || pager.page);
                pager.limit = Math.max(1, Number(data.limit) || pager.limit);

                container.innerHTML = '';
                const actions = Array.isArray(data.actions) ? [...data.actions] : [];
                if (actions.length === 0 && pager.page > 1) {
                    pager.page -= 1;
                    return this.loadActionsList();
                }
                if (actions.length === 0) {
                    container.innerHTML = '<div style="opacity:0.5; font-size:12px;">Нет акций</div>';
                    return;
                }

                actions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                actions.forEach(action => {
                    const el = document.createElement('div');
                    el.className = 'promo-list-item';

                    let details = `Тип: ${action.type === 'discount' ? 'Скидка' : 'Инфо'}`;
                    if (action.type === 'discount') details += `<br>Код: <b>${action.promoCode}</b> (${action.discountVal}${action.discountType === 'percent' ? '%' : '₽'})`;
                    if (action.limit) details += `<br>Лимит показов: ${action.limit}`;
                    if (action.dateEnd) details += `<br>До: ${action.dateEnd}`;

                    el.innerHTML = `
                        <div style="flex:1; margin-right:15px;">
                            <div style="font-weight:bold; font-size:12px;">${action.title}</div>
                            <div style="font-size:10px; opacity:0.7; margin-top:4px; line-height:1.4;">${details}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <label style="font-size:10px; display:flex; align-items:center; gap:4px;">
                                <input type="checkbox" ${action.active ? 'checked' : ''} onchange="PromotionSystem.toggleAction('${action.id}', this.checked, '${action.promoCode || ''}')"> Актив
                            </label>
                            <button onclick="PromotionSystem.deleteAction('${action.id}', '${action.promoCode || ''}')" style="color:#B66A58; border:none; background:none; cursor:pointer; font-size:16px;">&times;</button>
                        </div>
                    `;
                    container.appendChild(el);
                });
                container.insertAdjacentHTML('beforeend', UserSystem.renderAdminListPager('actions', data));
            } catch (e) {
                console.error(e);
                container.innerHTML = 'Ошибка загрузки';
            }
        },

        saveAction: async function() {
            const title = document.getElementById('action-title')?.value.trim();
            const msg = document.getElementById('action-msg')?.value.trim();
            const type = document.getElementById('action-type')?.value || 'info';
            const limit = parseInt(document.getElementById('action-limit')?.value || '1', 10) || 1;
            if (!title || !msg) return alert('Заполните заголовок и сообщение');

            let promoCode = '';
            let discountVal = 0;
            let discountType = 'percent';

            if (type === 'discount') {
                promoCode = document.getElementById('action-promo-code')?.value.toUpperCase().trim() || '';
                discountVal = parseFloat(document.getElementById('action-discount-val')?.value || '0');
                discountType = document.getElementById('action-discount-type')?.value || 'percent';
                if (!promoCode || !discountVal) return alert('Для скидки укажите промокод и размер скидки');
            }

            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=saveAction`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'saveAction',
                        title,
                        msg,
                        type,
                        promoCode,
                        discountVal,
                        discountType,
                        limit,
                        dateEnd: document.getElementById('action-date-end')?.value || '',
                        active: !!document.getElementById('action-is-active')?.checked,
                        createdAt: new Date().toISOString()
                    })
                });

                alert('Акция сохранена!');
                this.loadActionsList();
            } catch (e) {
                alert('Ошибка: ' + e.message);
            }
        },

        toggleAction: async function(id, status, promoCode) {
            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=toggleAction`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'toggleAction', id, active: status, promoCode })
                });
            } catch (e) {
                console.error(e);
            }
        },

        deleteAction: async function(id, promoCode) {
            if (!confirm('Удалить акцию?')) return;
            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=deleteAction`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteAction', id, promoCode })
                });
                this.loadActionsList();
            } catch (e) {
                console.error(e);
            }
        }
    });

    Object.assign(MessageSystem, {
        ensureAdminBadgeNode: function() {
            let badge = document.getElementById('admin-messages-badge');
            if (badge) return badge;

            const messagesTabBtn = Array.from(document.querySelectorAll('.admin-tab'))
                .find(btn => (btn.getAttribute('onclick') || '').includes(`'messages'`));
            if (!messagesTabBtn) return null;

            badge = document.createElement('span');
            badge.id = 'admin-messages-badge';
            badge.className = 'admin-tab-badge';
            messagesTabBtn.appendChild(badge);
            return badge;
        },

        updateAdminUnreadBadge: function(count) {
            const badge = this.ensureAdminBadgeNode();
            if (!badge) return;

            const normalizedCount = Math.max(0, Number(count) || 0);
            if (!normalizedCount) {
                badge.textContent = '';
                badge.classList.remove('show');
                return;
            }

            badge.textContent = normalizedCount > 99 ? '99+' : String(normalizedCount);
            badge.classList.add('show');
        },

        isAdminViewOpen: function() {
            return !!(
                document.getElementById('lc-modal')?.classList.contains('active') &&
                document.getElementById('view-admin')?.classList.contains('show-view')
            );
        },

        isAdminMessagesTabActive: function() {
            return !!document.getElementById('admin-sec-messages')?.classList.contains('active');
        },

        startAdminPolling: function() {
            if (!UserSystem.currentUser || UserSystem.currentUser.email !== 'info@locus.coffee') return;

            this.stopAdminPolling();
            this.loadMessagesForAdmin({
                renderList: this.isAdminMessagesTabActive(),
                showLoading: this.isAdminMessagesTabActive(),
                markAsRead: this.isAdminMessagesTabActive()
            });
            this.adminPollingTimer = setInterval(() => {
                if (!this.isAdminViewOpen()) {
                    this.stopAdminPolling();
                    return;
                }
                const shouldRender = this.isAdminMessagesTabActive();
                this.loadMessagesForAdmin({ renderList: shouldRender, showLoading: false, markAsRead: shouldRender });
            }, this.adminPollingIntervalMs || 45000);
        },

        stopAdminPolling: function() {
            if (this.adminPollingTimer) {
                clearInterval(this.adminPollingTimer);
                this.adminPollingTimer = null;
            }
        },

        markAdminMessagesRead: async function() {
            const token = localStorage.getItem('locus_token');
            if (!token) return false;
            try {
                const res = await fetch(`${LOCUS_API_URL}?action=markAdminMessagesRead`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'markAdminMessagesRead' })
                });
                const data = await res.json();
                return !!data.success;
            } catch (e) {
                console.error(e);
                return false;
            }
        },

        loadMessagesForAdmin: async function(options = {}) {
            const {
                renderList = true,
                showLoading = renderList,
                markAsRead = this.isAdminMessagesTabActive()
            } = options;
            const container = document.getElementById('admin-messages-list');
            if (renderList && !container) return;
            if (showLoading && container) container.innerHTML = 'Загрузка...';

            const token = localStorage.getItem('locus_token');
            const pager = UserSystem.getAdminListPagerState('messages');
            try {
                const res = await fetch(`${LOCUS_API_URL}?action=getAdminMessages&page=${pager.page}&limit=${pager.limit}`, { headers: { 'X-Auth-Token': token } });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Ошибка загрузки');

                pager.page = Math.max(1, Number(data.page) || pager.page);
                pager.limit = Math.max(1, Number(data.limit) || pager.limit);

                let messages = Array.isArray(data.messages) ? data.messages : [];
                if (messages.length === 0 && pager.page > 1 && renderList) {
                    pager.page -= 1;
                    return this.loadMessagesForAdmin(options);
                }
                messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                const unreadIncomingCount = Math.max(0, Number(data.unreadIncomingCount) || 0);
                this.updateAdminUnreadBadge(unreadIncomingCount);

                if (markAsRead && unreadIncomingCount > 0) {
                    const markSuccess = await this.markAdminMessagesRead();
                    if (markSuccess) {
                        messages = messages.map(message => message.direction === 'to_admin' ? { ...message, isRead: true } : message);
                        this.updateAdminUnreadBadge(0);
                    }
                }

                if (!renderList) return;
                container.innerHTML = '';
                if (messages.length === 0) {
                    container.innerHTML = 'Нет сообщений';
                    return;
                }

                messages.forEach(message => {
                    const isToAdmin = message.direction === 'to_admin';
                    const el = document.createElement('div');
                    el.className = `msg-item${isToAdmin && message.isRead !== true ? ' is-unread' : ''}`;
                    const replyFormId = `reply-form-${message.id}`;

                    el.innerHTML = `
                        <div class="msg-header">
                            <span>${new Date(message.timestamp).toLocaleString()}</span>
                            <span style="font-weight:bold; color:${isToAdmin ? '#B66A58' : 'gray'}">${isToAdmin ? 'От: ' + (message.userEmail || message.userId) : 'Вы ответили'}</span>
                        </div>
                        <div class="msg-subject">${message.subject || 'Без темы'}</div>
                        <div class="msg-body">${message.text}</div>
                        <div style="display:flex; justify-content:space-between;">
                            ${isToAdmin ? `<button class="lc-btn" style="width:auto; padding:5px 15px; font-size:10px;" onclick="document.getElementById('${replyFormId}').classList.toggle('active')">Ответить</button>` : '<div></div>'}
                            <button onclick="MessageSystem.deleteMessage('${message.id}', 'admin')" style="color:#B66A58; border:none; background:none; cursor:pointer;">&times; Удалить</button>
                        </div>
                        <div id="${replyFormId}" class="msg-reply-area">
                            <textarea id="reply-text-${message.id}" class="lc-input" placeholder="Текст ответа..." style="height:60px;"></textarea>
                            <button class="lc-btn" onclick="MessageSystem.submitReply('${message.id}', '${message.userId}', '${message.subject || ''}')">Отправить</button>
                        </div>
                    `;
                    container.appendChild(el);
                });
                container.insertAdjacentHTML('beforeend', UserSystem.renderAdminListPager('messages', data));
            } catch (e) {
                console.error(e);
                if (renderList && container) container.innerHTML = 'Ошибка загрузки';
            }
        }
    });
}
