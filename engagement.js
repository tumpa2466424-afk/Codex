function readJwtUserId(token) {
    if (!token) return 'guest';
    try {
        return JSON.parse(atob(token.split('.')[1])).userId || 'guest';
    } catch (error) {
        return 'guest';
    }
}

function getToken() {
    return localStorage.getItem('locus_token');
}

export function createMessageSystem({ getUserSystem, getLocusApiUrl }) {
    return {
        init: function() {
            const btnSend = document.getElementById('btn-send-feedback');
            if (btnSend) {
                btnSend.onclick = () => {
                    const txtEl = document.getElementById('feedback-text');
                    const txt = txtEl ? txtEl.value.trim() : '';
                    if (!txt) return alert('Введите сообщение');
                    this.sendMessageToAdmin(txt);
                    txtEl.value = '';
                };
            }
        },

        sendMessageToAdmin: async function(text, subject = 'Сообщение с сайта') {
            const userSystem = getUserSystem();
            if (!userSystem?.uid) return alert('Нужно войти');

            const token = getToken();
            try {
                const res = await fetch(getLocusApiUrl() + '?action=sendMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sendMessage',
                        direction: 'to_admin',
                        subject,
                        text,
                        userEmail: userSystem.currentUser.email
                    })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Ошибка отправки');
                alert('Сообщение отправлено!');
                this.loadMessagesForUser();
            } catch (error) {
                console.error(error);
                alert('Ошибка отправки');
            }
        },

        adminPollingTimer: null,
        adminPollingIntervalMs: 45000,

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
            const userSystem = getUserSystem();
            if (!userSystem?.currentUser || userSystem.currentUser.email !== 'info@locus.coffee') return;

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
                this.loadMessagesForAdmin({
                    renderList: shouldRender,
                    showLoading: false,
                    markAsRead: shouldRender
                });
            }, this.adminPollingIntervalMs);
        },

        stopAdminPolling: function() {
            if (this.adminPollingTimer) {
                clearInterval(this.adminPollingTimer);
                this.adminPollingTimer = null;
            }
        },

        markAdminMessagesRead: async function() {
            const token = getToken();
            if (!token) return false;
            try {
                const res = await fetch(getLocusApiUrl() + '?action=markAdminMessagesRead', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'markAdminMessagesRead' })
                });
                const data = await res.json();
                return !!data.success;
            } catch (error) {
                console.error(error);
                return false;
            }
        },

        submitUserReply: async function(msgId, subject) {
            const txt = document.getElementById(`user-reply-text-${msgId}`).value;
            if (!txt) return;
            const replySubject = subject.startsWith('Re:') ? subject : 'Re: ' + subject;
            await this.sendMessageToAdmin(txt, replySubject);
        },

        replyToUser: async function(userId, subject, text) {
            const token = getToken();
            try {
                const res = await fetch(getLocusApiUrl() + '?action=sendMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sendMessage',
                        direction: 'to_user',
                        targetUserId: userId,
                        subject: 'Re: ' + subject,
                        text
                    })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Ошибка отправки');
                alert('Ответ отправлен');
                this.loadMessagesForAdmin({ markAsRead: this.isAdminMessagesTabActive() });
            } catch (error) {
                console.error(error);
            }
        },

        deleteMessage: async function(msgId, side) {
            if (!confirm('Удалить переписку из вашего списка?')) return;
            const token = getToken();
            try {
                await fetch(getLocusApiUrl() + '?action=deleteMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteMessage', msgId, side })
                });
                if (side === 'admin') this.loadMessagesForAdmin({ markAsRead: this.isAdminMessagesTabActive() });
                else this.loadMessagesForUser();
            } catch (error) {
                console.error(error);
            }
        },

        loadMessagesForAdmin: async function(options = {}) {
            const userSystem = getUserSystem();
            await userSystem.ensureAdminModule();
            return this.loadMessagesForAdmin(options);
        },

        submitReply: async function(msgId, userId, subject) {
            const txt = document.getElementById(`reply-text-${msgId}`).value;
            if (!txt) return;
            await this.replyToUser(userId, subject, txt);
        },

        loadMessagesForUser: async function() {
            const userSystem = getUserSystem();
            const container = document.getElementById('user-messages-list');
            if (!container || !userSystem?.uid) return;

            container.innerHTML = 'Загрузка...';
            const token = getToken();

            try {
                const res = await fetch(getLocusApiUrl() + '?action=getUserMessages', {
                    headers: { 'X-Auth-Token': token }
                });
                const data = await res.json();
                container.innerHTML = '';
                if (!data.success) throw new Error(data.error);

                const msgs = Array.isArray(data.messages) ? data.messages : [];
                if (msgs.length === 0) {
                    container.innerHTML = '<div style="opacity:0.5; font-size:11px">Нет сообщений</div>';
                    return;
                }

                msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                msgs.forEach(m => {
                    const isToUser = m.direction === 'to_user';
                    const el = document.createElement('div');
                    el.className = 'msg-item';
                    el.style.borderLeft = isToUser
                        ? '4px solid var(--locus-dark)'
                        : '1px solid var(--locus-border)';

                    const replyFormId = `user-reply-form-${m.id}`;

                    el.innerHTML = `
                        <div class="msg-header">
                            <span>${new Date(m.timestamp).toLocaleString()}</span>
                            <span>${isToUser ? 'Входящее' : 'Исходящее'}</span>
                        </div>
                        <div class="msg-subject">${m.subject}</div>
                        <div class="msg-body">${m.text}</div>
                        <div style="display:flex; justify-content:space-between; margin-top:5px;">
                            ${isToUser ? `<button class="lc-btn" style="width:auto; padding:4px 12px; font-size:9px;" onclick="document.getElementById('${replyFormId}').classList.toggle('active')">Ответить</button>` : '<div></div>'}
                            <button onclick="MessageSystem.deleteMessage('${m.id}', 'user')" style="font-size:10px; color:#B66A58; border:none; background:none; cursor:pointer;">Удалить</button>
                        </div>
                        <div id="${replyFormId}" class="msg-reply-area">
                            <textarea id="user-reply-text-${m.id}" class="lc-input" placeholder="Текст ответа..." style="height:60px;"></textarea>
                            <button class="lc-btn" onclick="MessageSystem.submitUserReply('${m.id}', '${m.subject}')">Отправить</button>
                        </div>
                    `;
                    container.appendChild(el);
                });
            } catch (error) {
                console.error(error);
                container.innerHTML = '<div style="color:red; font-size:10px;">Ошибка загрузки</div>';
            }
        }
    };
}

export function createPromotionSystem({ getUserSystem, getLocusApiUrl }) {
    return {
        activeAction: null,
        queue: [],

        init: function() {
            const typeSel = document.getElementById('action-type');
            if (typeSel) {
                typeSel.addEventListener('change', function() {
                    const codeWrap = document.getElementById('action-code-wrapper');
                    codeWrap.style.display = this.value === 'discount' ? 'block' : 'none';
                });
            }

            const btnAction = document.getElementById('btn-promo-action');
            const btnClose = document.getElementById('btn-promo-close');
            if (btnAction) btnAction.onclick = () => this.handleUserAction(true);
            if (btnClose) btnClose.onclick = () => this.handleUserAction(false);
        },

        loadActionsList: async function() {
            const userSystem = getUserSystem();
            await userSystem.ensureAdminModule();
            return this.loadActionsList();
        },

        saveAction: async function() {
            const userSystem = getUserSystem();
            await userSystem.ensureAdminModule();
            return this.saveAction();
        },

        toggleAction: async function(id, status, promoCode) {
            const userSystem = getUserSystem();
            await userSystem.ensureAdminModule();
            return this.toggleAction(id, status, promoCode);
        },

        deleteAction: async function(id, promoCode) {
            const userSystem = getUserSystem();
            await userSystem.ensureAdminModule();
            return this.deleteAction(id, promoCode);
        },

        checkAndShow: async function() {
            try {
                const res = await fetch(getLocusApiUrl() + '?action=getActiveActions');
                const data = await res.json();
                if (!data.success || data.actions.length === 0) return;

                this.queue = [];
                const now = new Date();
                const userKeyPart = readJwtUserId(getToken());

                data.actions.forEach(promo => {
                    if (promo.dateEnd) {
                        const end = new Date(promo.dateEnd);
                        if (now > end) return;
                    }

                    const seenKey = `locus_promo_seen_${promo.id}_${userKeyPart}`;
                    const acceptedKey = `locus_promo_accepted_${promo.id}_${userKeyPart}`;

                    if (localStorage.getItem(acceptedKey) === 'true') return;
                    const seenCount = parseInt(localStorage.getItem(seenKey), 10) || 0;
                    if (seenCount < promo.limit) {
                        this.queue.push(promo);
                    }
                });

                this.queue.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                this.showNext();
            } catch (error) {
                console.error(error);
            }
        },

        showNext: function() {
            if (this.queue.length === 0) return;

            const nextPromo = this.queue.shift();
            this.activeAction = nextPromo;
            this.showPopup(nextPromo);

            const userKeyPart = readJwtUserId(getToken());
            const seenKey = `locus_promo_seen_${nextPromo.id}_${userKeyPart}`;
            const seenCount = parseInt(localStorage.getItem(seenKey), 10) || 0;
            localStorage.setItem(seenKey, seenCount + 1);
        },

        showPopup: function(promo) {
            const overlay = document.getElementById('promo-popup');
            const title = document.getElementById('promo-popup-title');
            const msg = document.getElementById('promo-popup-msg');
            const btn = document.getElementById('btn-promo-action');
            const close = document.getElementById('btn-promo-close');

            title.textContent = promo.title;
            msg.textContent = promo.msg;

            if (promo.type === 'discount') {
                btn.textContent = 'Получить скидку';
                close.textContent = 'Отказаться';
            } else {
                btn.textContent = 'Понятно';
                close.textContent = 'Закрыть';
            }

            overlay.classList.add('active');
        },

        handleUserAction: function(isPrimary) {
            const overlay = document.getElementById('promo-popup');
            overlay.classList.remove('active');

            const userKeyPart = readJwtUserId(getToken());

            if (isPrimary && this.activeAction) {
                localStorage.setItem(`locus_promo_accepted_${this.activeAction.id}_${userKeyPart}`, 'true');

                if (this.activeAction.type === 'discount') {
                    const code = this.activeAction.promoCode;
                    if (code) {
                        const cartInput = document.getElementById('cart-promo-input');
                        if (cartInput) cartInput.value = code;

                        const userSystem = getUserSystem();
                        if (userSystem?.uid) {
                            userSystem.toggleModal(true, 'cart');
                            userSystem.applyPromo();
                        } else if (userSystem) {
                            alert(`Код ${code} скопирован! Авторизуйтесь, чтобы применить его.`);
                            userSystem.toggleModal(true, 'login');
                        }
                    }
                }
            }

            setTimeout(() => {
                this.showNext();
            }, 500);
        }
    };
}
