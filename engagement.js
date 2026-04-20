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

export function createPromotionSystem({ getUserSystem, getLocusApiUrl, getAllProductsCache, getCatalogSystem }) {
    return {
        activeAction: null,
        queue: [],

        normalizeLotLookupValue: function(value) {
            return String(value || '').trim().toLowerCase();
        },

        getCatalogProducts: function() {
            const products = typeof getAllProductsCache === 'function' ? getAllProductsCache() : [];
            return Array.isArray(products) ? products : [];
        },

        getCatalogSystemInstance: function() {
            return typeof getCatalogSystem === 'function' ? getCatalogSystem() : null;
        },

        consumeLocalNewLotPreview: function() {
            try {
                const raw = localStorage.getItem('locus_new_lot_popup_preview');
                if (!raw) return null;
                localStorage.removeItem('locus_new_lot_popup_preview');
                return JSON.parse(raw);
            } catch (error) {
                localStorage.removeItem('locus_new_lot_popup_preview');
                return null;
            }
        },

        findNewLotProduct: function(discount) {
            const products = this.getCatalogProducts();
            const normalizedProductId = String(discount?.productId || '').trim();
            const normalizedSampleName = this.normalizeLotLookupValue(discount?.sampleName);

            return products.find(product => {
                const productId = String(product?.id || '').trim();
                const sampleName = this.normalizeLotLookupValue(product?.sample || product?.sample_no);
                return (normalizedProductId && productId === normalizedProductId) ||
                    (normalizedSampleName && sampleName === normalizedSampleName);
            }) || null;
        },

        buildNewLotPopupAction: function(discount) {
            if (!discount || !discount.expiresAt) return null;

            const expiresAtMs = Date.parse(discount.expiresAt || '');
            if (!expiresAtMs || expiresAtMs <= Date.now()) return null;

            const product = this.findNewLotProduct(discount);
            if (!product) return null;

            const catalogSystem = this.getCatalogSystemInstance();
            const sampleName = String(product.sample || discount.sampleName || product.sample_no || '').trim();
            const productId = String(product.id || discount.productId || '').trim();
            const actionId = 'new_lot_' + (productId || sampleName) + '_' + String(discount.expiresAt || '');
            const createdAt = new Date(expiresAtMs - (24 * 60 * 60 * 1000)).toISOString();

            return {
                id: actionId,
                type: 'new_lot_info',
                title: '\u041d\u043e\u0432\u044b\u0439 \u0441\u043e\u0440\u0442 ' + sampleName + ' \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435!',
                msg: '',
                limit: 1,
                createdAt,
                dateEnd: discount.expiresAt,
                productId,
                sampleName,
                mediaHtml: catalogSystem?.getPackPreviewHtml?.(product) || ''
            };
        },

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
                const localPreviewAction = this.buildNewLotPopupAction(this.consumeLocalNewLotPreview());
                const [actionsRes, discountRes] = await Promise.all([
                    fetch(getLocusApiUrl() + '?action=getActiveActions'),
                    fetch(getLocusApiUrl() + '?action=getNewLotDiscount')
                ]);
                const [actionsData, discountData] = await Promise.all([
                    actionsRes.json(),
                    discountRes.json()
                ]);

                const actions = actionsData.success && Array.isArray(actionsData.actions)
                    ? [...actionsData.actions]
                    : [];
                const newLotAction = discountData.success
                    ? this.buildNewLotPopupAction(discountData.discount)
                    : null;
                if (localPreviewAction) actions.unshift(localPreviewAction);
                if (newLotAction) actions.push(newLotAction);
                if (actions.length === 0) return;

                this.queue = [];
                const now = new Date();
                const userKeyPart = readJwtUserId(getToken());

                actions.forEach(promo => {
                    if (promo.dateEnd) {
                        const end = new Date(promo.dateEnd);
                        if (now > end) return;
                    }

                    const seenKey = 'locus_promo_seen_' + promo.id + '_' + userKeyPart;
                    const acceptedKey = 'locus_promo_accepted_' + promo.id + '_' + userKeyPart;

                    if (localStorage.getItem(acceptedKey) === 'true') return;
                    const seenCount = parseInt(localStorage.getItem(seenKey), 10) || 0;
                    if (seenCount < (Number(promo.limit) || 1)) {
                        this.queue.push(promo);
                    }
                });

                this.queue.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
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
            const seenKey = 'locus_promo_seen_' + nextPromo.id + '_' + userKeyPart;
            const seenCount = parseInt(localStorage.getItem(seenKey), 10) || 0;
            localStorage.setItem(seenKey, seenCount + 1);
        },

        showPopup: function(promo) {
            const overlay = document.getElementById('promo-popup');
            const media = document.getElementById('promo-popup-media');
            const title = document.getElementById('promo-popup-title');
            const msg = document.getElementById('promo-popup-msg');
            const btn = document.getElementById('btn-promo-action');
            const close = document.getElementById('btn-promo-close');

            title.textContent = promo.title || '';
            if (media) {
                media.innerHTML = promo.mediaHtml || '';
                media.classList.toggle('has-media', !!promo.mediaHtml);
            }
            msg.textContent = promo.msg || '';
            msg.style.display = promo.msg ? '' : 'none';

            if (promo.type === 'discount') {
                btn.textContent = '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0441\u043a\u0438\u0434\u043a\u0443';
                close.textContent = '\u041e\u0442\u043a\u0430\u0437\u0430\u0442\u044c\u0441\u044f';
            } else if (promo.type === 'new_lot_info') {
                btn.textContent = '\u041f\u0435\u0440\u0435\u0439\u0442\u0438';
                close.textContent = '\u0417\u0430\u043a\u0440\u044b\u0442\u044c';
            } else {
                btn.textContent = '\u041f\u043e\u043d\u044f\u0442\u043d\u043e';
                close.textContent = '\u0417\u0430\u043a\u0440\u044b\u0442\u044c';
            }

            overlay.classList.add('active');
        },

        handleUserAction: function(isPrimary) {
            const overlay = document.getElementById('promo-popup');
            const media = document.getElementById('promo-popup-media');
            const msg = document.getElementById('promo-popup-msg');
            overlay.classList.remove('active');
            if (media) {
                media.classList.remove('has-media');
                media.innerHTML = '';
            }
            if (msg) msg.style.display = '';

            const userKeyPart = readJwtUserId(getToken());

            if (isPrimary && this.activeAction) {
                localStorage.setItem('locus_promo_accepted_' + this.activeAction.id + '_' + userKeyPart, 'true');

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
                            alert('\u041a\u043e\u0434 ' + code + ' \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d! \u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044c, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0435\u0433\u043e.');
                            userSystem.toggleModal(true, 'login');
                        }
                    }
                } else if (this.activeAction.type === 'new_lot_info') {
                    const userSystem = getUserSystem();
                    if (userSystem && this.activeAction.productId) {
                        userSystem.openProductById(this.activeAction.productId);
                        document.getElementById('coffee-shop-wheel')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            }

            setTimeout(() => {
                this.showNext();
            }, 500);
        }
    };
}
