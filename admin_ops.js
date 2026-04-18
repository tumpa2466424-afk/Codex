export function installAdminOps(context) {
    const { UserSystem, LOCUS_API_URL } = context;
    if (UserSystem.adminOpsInstalled) return;
    UserSystem.adminOpsInstalled = true;

    Object.assign(UserSystem, {
        deleteUser: async function(userId) {
            const user = this.adminUsersMap?.[userId];
            const userEmail = user?.email || 'выбранного пользователя';
            if (this.normalizeEmailAddress(userEmail) === 'info@locus.coffee') {
                alert('Главный аккаунт магазина удалять нельзя.');
                return;
            }
            if (!confirm(`Удалить пользователя ${userEmail} из базы аккаунтов? Это действие необратимо.`)) return;

            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(`${LOCUS_API_URL}?action=deleteUser`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteUser', id: userId })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Не удалось удалить пользователя');
                this.loadUsers();
            } catch (error) {
                console.error(error);
                alert('Ошибка удаления: ' + error.message);
            }
        },

        loadActiveSubs: async function() {
            const container = document.getElementById('admin-sec-subs');
            if (!container) return;
            container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Сбор активных подписок...</div>';

            const token = localStorage.getItem('locus_token');
            if (!token) {
                container.innerHTML = 'Нет доступа';
                return;
            }

            try {
                const res = await fetch(`${LOCUS_API_URL}?action=getAdminSubs`, {
                    headers: { 'X-Auth-Token': token }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Ошибка загрузки');

                if (data.subs.length === 0) {
                    container.innerHTML = '<div style="padding:20px; opacity:0.5; text-align:center;">Активных подписок пока нет</div>';
                    return;
                }

                const groupedSubs = {};

                data.subs.forEach(s => {
                    if (!groupedSubs[s.email]) {
                        groupedSubs[s.email] = {
                            email: s.email,
                            lots: [],
                            latestDateObj: new Date(0),
                            displayDate: 'Неизвестно',
                            totalMonthlyPrice: 0
                        };
                    }

                    groupedSubs[s.email].lots.push(s);
                    groupedSubs[s.email].totalMonthlyPrice += (Number(s.price) || 0);

                    if (s.dateAdded && s.dateAdded.includes('.')) {
                        const [day, month, year] = s.dateAdded.split('.');
                        const parsedDate = new Date(`${year}-${month}-${day}`);
                        if (parsedDate > groupedSubs[s.email].latestDateObj) {
                            groupedSubs[s.email].latestDateObj = parsedDate;
                            groupedSubs[s.email].displayDate = s.dateAdded;
                        }
                    } else if (groupedSubs[s.email].displayDate === 'Неизвестно') {
                        groupedSubs[s.email].displayDate = s.dateAdded;
                    }
                });

                const groupedArray = Object.values(groupedSubs);
                groupedArray.sort((a, b) => b.latestDateObj - a.latestDateObj);

                const totalLots = data.subs.length;
                const totalUsers = groupedArray.length;

                let html = `
                    <div style="margin-bottom: 15px; font-size: 14px; color: var(--locus-dark);">
                        Подписчиков: <b>${totalUsers}</b> | Всего лотов в подписках: <b>${totalLots}</b>
                    </div>
                    <div style="overflow-x:auto;">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th style="width: 25%;">Клиент (Email)</th>
                                <th style="width: 50%;">Состав подписки</th>
                                <th style="width: 15%;">Сумма / мес.</th>
                                <th style="width: 10%;">Обновлена</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                groupedArray.forEach(group => {
                    const lotsHtml = group.lots.map(lot => {
                        const meta = ProductManager.getDisplayMeta(lot.item, lot.weight, lot.grind);
                        const weightText = meta.weight ? ` <span style="font-size:10px; color:gray; margin-left:5px;">(${meta.weight} г)</span>` : '';
                        const grindText = meta.grind ? ` <span style="font-size:9px; opacity:0.7; border:1px solid #ccc; padding:0 3px; border-radius:3px;">${meta.grind}</span>` : '';
                        return `<div style="margin-bottom:6px; padding-bottom:6px; border-bottom:1px dashed #eee; font-size:12px;">
                            <span style="font-weight:600; color:var(--locus-dark);">${lot.item}</span>
                            ${weightText}${grindText}
                            <span style="float:right; font-weight:600;">${lot.price} ₽</span>
                        </div>`;
                    }).join('');

                    html += `
                        <tr>
                            <td style="vertical-align:top; padding-top:10px;">
                                <div style="font-weight:600; font-size:13px; word-break:break-all;">${group.email}</div>
                            </td>
                            <td style="vertical-align:top; padding-top:10px; padding-right:15px;">
                                ${lotsHtml}
                            </td>
                            <td style="vertical-align:top; padding-top:10px; font-weight:bold; font-size:14px; color:var(--locus-dark);">
                                ${group.totalMonthlyPrice} ₽
                            </td>
                            <td style="vertical-align:top; padding-top:10px; font-size:11px; color:gray;">
                                ${group.displayDate}
                            </td>
                        </tr>
                    `;
                });

                html += `</tbody></table></div>`;
                container.innerHTML = html;
            } catch (error) {
                console.error(error);
                container.innerHTML = `<div style="color:#B66A58">Ошибка: ${error.message}</div>`;
            }
        },

        loadWholesaleOrders: async function() {
            const container = document.getElementById('admin-ws-orders-list');
            if (!container) return;
            container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Загрузка заказов...</div>';

            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(`${LOCUS_API_URL}?action=getAdminWholesaleOrders`, {
                    headers: { 'X-Auth-Token': token }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error);

                if (data.orders.length === 0) {
                    container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">Новых оптовых заказов пока нет</div>';
                    return;
                }

                const getMs = (val) => {
                    const ts = Number(val);
                    if (!isNaN(ts)) return ts < 3000000000 ? ts * 1000 : ts;
                    return new Date(val).getTime() || 0;
                };
                data.orders.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));

                let html = '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr><th style="width: 25%;">Заказ и Клиент</th><th style="width: 55%;">Состав и Сумма</th><th style="width: 20%; min-width: 110px;">Статус</th></tr></thead><tbody>';

                data.orders.forEach(o => {
                    let d = new Date(o.createdAt);
                    const ts = Number(o.createdAt);
                    if (!isNaN(ts) && ts > 0 && ts < 3000000000) d = new Date(ts * 1000);
                    else if (!isNaN(ts) && ts >= 3000000000) d = new Date(ts);
                    if (isNaN(d.getTime())) d = new Date();

                    const datePart = d.toLocaleDateString('ru-RU', {
                        timeZone: 'Europe/Moscow',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    const timePart = d.toLocaleTimeString('ru-RU', {
                        timeZone: 'Europe/Moscow',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const dateStrHTML = `${datePart} ${timePart}`;

                    const itemsHtml = o.items.map(i => {
                        const meta = ProductManager.getDisplayMeta(i.item, i.weight, i.grind);
                        const weightText = meta.weight ? ` <span style="font-size:10px; color:gray;">(${meta.weight}г)</span>` : '';
                        return `<span style="font-weight:600">${i.item}</span>${weightText} x ${i.qty} шт.`;
                    }).join('<br>');

                    const phone = o.customer?.phone || 'Не указан';
                    const email = o.customer?.email || 'Не указан';
                    const reqs = o.customer?.requisites || '';

                    let rowStyle = '';
                    if (o.status === 'wholesale_new') rowStyle = 'background-color:#fef6f5;';
                    else if (o.status === 'completed') rowStyle = 'background-color:#f0f0f0; opacity: 0.6;';

                    html += `<tr style="${rowStyle}">
                        <td style="vertical-align:top; padding-top:10px; font-size:12px; line-height:1.4;">
                            <b style="font-size:13px;">№ ${String(o.id).replace('ws_', '')}</b><br>
                            <span style="font-size:10px; color:gray;">${dateStrHTML}</span><br>
                            <div style="margin-top:8px;"><b>${email}</b></div>
                            <div style="color:gray;">${phone}</div>
                            ${reqs ? `<div style="margin-top:6px; font-size:10px; line-height:1.3; color:#444; background:rgba(255,255,255,0.7); padding:6px; border-radius:4px; border:1px dashed #ccc; max-height:60px; overflow-y:auto;"><b>Реквизиты:</b><br>${reqs.replace(/\n/g, '<br>')}</div>` : ''}
                        </td>
                        <td style="vertical-align:top; padding-top:10px; font-size:12px; line-height:1.5;">
                            ${itemsHtml}
                            <div style="margin-top:8px; font-weight:bold; font-size:14px;">Итого: ${o.total.toLocaleString('ru-RU')} ₽</div>
                        </td>
                        <td style="vertical-align:top; padding-top:10px;">
                            <select class="lc-input" style="padding:4px; font-size:11px; margin:0; width:100%; margin-bottom: 10px;" onchange="UserSystem.updateOrderStatus('${o.id}', this.value)">
                                <option value="wholesale_new" ${o.status === 'wholesale_new' ? 'selected' : ''}>Новый</option>
                                <option value="wholesale_processed" ${o.status === 'wholesale_processed' ? 'selected' : ''}>В работе</option>
                                <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Выполнено</option>
                            </select>
                            <div style="text-align:right;">
                                <button onclick="UserSystem.deleteWholesaleOrder('${o.id}')" style="color:#B66A58; border:none; background:none; cursor:pointer; font-size:11px; text-decoration:underline;">Удалить заказ</button>
                            </div>
                        </td>
                    </tr>`;
                });

                html += '</tbody></table></div>';
                container.innerHTML = html;
                this.startRetailCountdownTicker();
            } catch (error) {
                container.innerHTML = '<div style="color:red; font-size:12px;">Ошибка загрузки</div>';
                console.error(error);
            }
        },

        loadRetailOrders: async function() {
            const container = document.getElementById('admin-orders-list');
            if (!container) return;
            container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Загрузка заказов...</div>';

            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(`${LOCUS_API_URL}?action=getAdminOrders`, {
                    headers: { 'X-Auth-Token': token }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error);

                if (data.orders.length === 0) {
                    container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">Новых розничных заказов пока нет</div>';
                    return;
                }

                data.orders.sort((a, b) => b.invId - a.invId);

                let html = '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr><th>Заказ и Клиент</th><th>Состав и Сумма</th><th>Адрес доставки</th><th style="width: 100px;">Статус</th></tr></thead><tbody>';

                data.orders.forEach(o => {
                    const datePart = new Date(o.invId * 1000).toLocaleString('ru-RU');
                    const customer = o.customer || {};
                    const delivery = o.delivery || {};
                    const countdownInfo = this.getPvzCountdownInfo(o);
                    const countdownHtml = countdownInfo ? `
                        <div class="retail-order-countdown ${countdownInfo.delivered ? 'is-delivered' : 'is-active'}" data-retail-order-countdown="1" data-order-id="${o.id}" data-deadline-ms="${countdownInfo.deadlineMs || 0}" data-deadline-text="${countdownInfo.deadlineText ? `Выдача до ${countdownInfo.deadlineText}` : ''}" data-auto-status="0" style="margin-top:8px;">
                            ${countdownInfo.delivered ? 'Доставлено в пункт выдачи' : `До выдачи: ${countdownInfo.label}`}
                        </div>
                    ` : '';

                    const itemsHtml = (o.items || []).map(i => {
                        const meta = ProductManager.getDisplayMeta(i.item, i.weight, i.grind);
                        const metaArr = [];
                        if (meta.weight) metaArr.push(`${meta.weight}г`);
                        if (meta.grind) metaArr.push(meta.grind);
                        const metaText = metaArr.length > 0 ? ` <span style="font-size:10px; color:gray;">(${metaArr.join(', ')})</span>` : '';

                        return `<span style="font-weight:600">${i.item}</span>${metaText} x ${i.qty} шт.`;
                    }).join('<br>');

                    let rowStyle = '';
                    if (o.status === 'pending_payment') rowStyle = 'background-color:#fef6f5;';
                    else if (o.status === 'completed' || o.status === 'shipped' || o.status === 'pvz_delivered') rowStyle = 'background-color:#f0f0f0; opacity: 0.6;';

                    html += `<tr style="${rowStyle}">
                        <td style="vertical-align:top; padding-top:10px; font-size:12px; line-height:1.4;">
                            <b style="font-size:13px;">№ ${o.id}</b><br>
                            <span style="font-size:10px; color:gray;">${datePart}</span><br>
                            <div style="margin-top:8px;"><b>${customer.name || 'Без ФИО'}</b></div>
                            <div style="color:gray;">${customer.phone || ''}</div>
                            <div style="color:gray;">${customer.email || ''}</div>
                            ${countdownHtml}
                        </td>
                        <td style="vertical-align:top; padding-top:10px; font-size:12px; line-height:1.5;">
                            ${itemsHtml}
                            <div style="margin-top:8px; font-weight:bold; font-size:14px;">Итого: ${o.total.toLocaleString('ru-RU')} ₽</div>
                        </td>
                        <td style="vertical-align:top; padding-top:10px; font-size:11px; line-height:1.4;">
                            ${delivery.type === 'PICKUP'
                                ? `<div style="padding:6px; background:#f4f9f5; border:1px dashed #187a30; border-radius:4px;">
                                    <b>Самовывоз (Атолл)</b><br>
                                    <span style="color:#187a30; font-size:12px;">${delivery.code ? `Код: <b>${delivery.code}</b>` : ''}</span>
                                </div>`
                                : `<b>${delivery.type === 'PVZ' ? 'СДЭК ПВЗ' : (delivery.type === 'MANUAL' ? 'Ручной ввод' : 'Курьер')}</b><br>
                                    ${delivery.city || ''}<br>
                                    ${delivery.address || ''}<br>
                                    <span style="color:gray; font-size:10px;">Стоимость: ${delivery.finalCost} ₽</span>`
                            }
                        </td>
                        <td style="vertical-align:top; padding-top:10px;">
                            <select class="lc-input" style="padding:4px; font-size:11px; margin:0; width:100%;" onchange="UserSystem.updateRetailOrderStatus('${o.id}', this.value)">
                                <option value="pvz_delivered" ${o.status === 'pvz_delivered' ? 'selected' : ''}>Доставлено в пункт выдачи</option>
                                <option value="pending_payment" ${o.status === 'pending_payment' ? 'selected' : ''}>Не оплачен</option>
                                <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>Оплачен</option>
                                <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>В сборке</option>
                                <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
                                <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Выполнен</option>
                            </select>
                            <div style="text-align:right;">
                                <button onclick="UserSystem.deleteRetailOrder('${o.id}')" style="color:#B66A58; border:none; background:none; cursor:pointer; font-size:11px; text-decoration:underline;">Удалить заказ</button>
                            </div>
                        </td>
                    </tr>`;
                });

                html += '</tbody></table></div>';
                container.innerHTML = html;
                this.startRetailCountdownTicker();
            } catch (error) {
                container.innerHTML = '<div style="color:red; font-size:12px;">Ошибка загрузки</div>';
                console.error(error);
            }
        },

        updateRetailOrderStatus: async function(orderId, newStatus) {
            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(`${LOCUS_API_URL}?action=updateOrderStatus`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'updateOrderStatus', orderId, status: newStatus })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Не удалось обновить статус заказа');
                this.loadRetailOrders();
            } catch (error) {
                alert('Ошибка обновления статуса');
            }
        },

        deleteRetailOrder: async function(orderId) {
            if (!confirm('ВНИМАНИЕ! Вы точно хотите безвозвратно удалить этот розничный заказ из базы?')) return;

            const token = localStorage.getItem('locus_token');
            if (!token) return alert('Пожалуйста, авторизуйтесь');

            try {
                const res = await fetch(`${LOCUS_API_URL}?action=deleteOrder`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteOrder', orderId })
                });
                const data = await res.json();
                if (data.success) {
                    this.loadRetailOrders();
                } else {
                    alert('Ошибка: ' + (data.error || 'Не удалось удалить заказ'));
                }
            } catch (error) {
                console.error('Ошибка при удалении заказа:', error);
                alert('Произошла ошибка при удалении заказа');
            }
        },

        updateOrderStatus: async function(orderId, newStatus) {
            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=updateOrderStatus`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'updateOrderStatus', orderId, status: newStatus })
                });
                this.loadWholesaleOrders();
            } catch (error) {
                alert('Ошибка обновления статуса');
            }
        },

        deleteWholesaleOrder: async function(orderId) {
            if (!confirm('Удалить этот оптовый заказ? Это действие необратимо.')) return;

            const token = localStorage.getItem('locus_token');
            try {
                await fetch(`${LOCUS_API_URL}?action=deleteWholesaleOrder`, {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteWholesaleOrder', orderId })
                });
                this.loadWholesaleOrders();
            } catch (error) {
                alert('Ошибка удаления: ' + error.message);
            }
        }
    });
}
