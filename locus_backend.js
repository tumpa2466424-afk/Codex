const { Driver, getCredentialsFromEnv, TypedValues } = require('ydb-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // <-- Добавили nodemailer
const JWT_SECRET = 'locus-coffee-super-secret-key-2026'; 

let driver;

async function getDriver(forceNew = false) {
    if (forceNew && driver) {
        try {
            await driver.destroy();
        } catch (e) {}
        driver = null;
    }

    if (!driver) {
        driver = new Driver({
            endpoint: process.env.YDB_ENDPOINT,
            database: process.env.YDB_DATABASE,
            authService: getCredentialsFromEnv()
        });
    }

    if (!await driver.ready(10000)) {
        if (!forceNew) return getDriver(true);
        throw new Error('YDB timeout');
    }

    return driver;
}

function isTransientYdbError(error) {
    const msg = String(error?.message || error || '');
    return msg.includes('UNAVAILABLE') ||
        msg.includes('Connection dropped') ||
        msg.includes('transport is closing') ||
        msg.includes('Session was closed');
}

async function withSessionRetry(work) {
    const dbDriver = await getDriver();

    try {
        return await dbDriver.tableClient.withSession(work);
    } catch (error) {
        if (!isTransientYdbError(error)) throw error;

        const freshDriver = await getDriver(true);
        return freshDriver.tableClient.withSession(work);
    }
}

function verifyToken(token) {
    if (!token) throw new Error('Нет доступа: отсутствует токен');
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
}

function getCol(row, colName) {
    if (!row) return undefined;
    const target = colName.toLowerCase().replace(/_/g, ''); 
    for (let key in row) {
        if (key.toLowerCase().replace(/_/g, '') === target) return row[key];
    }
    return undefined;
}

function rowToObj(columns, row) {
    let obj = {};
    if (row && row.items && Array.isArray(columns)) {
        columns.forEach((col, i) => {
            let item = row.items[i];
            if (!item) return;
            let val = null;
            for (let key in item) {
                if (key.endsWith('Value')) { val = item[key]; break; }
            }
            obj[col.name.toLowerCase().replace(/_/g, '')] = val;
        });
        return obj;
    }
    return row || {}; 
}

function getRawArray(dbValue) {
    if (!dbValue) return [];
    let val = dbValue;
    if (typeof dbValue === 'object' && dbValue !== null && dbValue.value !== undefined) val = dbValue.value;
    if (Buffer.isBuffer(val)) val = val.toString('utf8');
    if (val instanceof Uint8Array) val = Buffer.from(val).toString('utf8');
    
    if (typeof val === 'string') {
        try {
            let parsed = JSON.parse(val);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            return Array.isArray(parsed) ? parsed : [];
        } catch(e) { return []; }
    }
    if (Array.isArray(val)) return val;
    return [];
}

module.exports.handler = async function (event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Token',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    try {
        await getDriver();

        let bodyString = event.body;
        if (bodyString && event.isBase64Encoded) bodyString = Buffer.from(bodyString, 'base64').toString('utf8');
        const body = bodyString ? JSON.parse(bodyString) : {};
        const action = event.queryStringParameters?.action || body.action;
        
        const rawToken = event.headers?.['x-auth-token'] || event.headers?.['X-Auth-Token'];

        let responseData = {};

        await withSessionRetry(async (session) => {
            
            if (action === 'register') {
                const { email, password } = body;
                if (!email || !password) throw new Error('Email и пароль обязательны');

                const checkQuery = `DECLARE $email AS Utf8; SELECT * FROM users WHERE email = $email;`;
                const { resultSets: checkRes } = await session.executeQuery(checkQuery, { '$email': TypedValues.utf8(email) });
                if (checkRes[0].rows.length > 0) throw new Error('Пользователь с таким email уже существует');

                const userId = uuidv4();
                const hash = bcrypt.hashSync(password, 10); 
                const emptyArr = JSON.stringify([]);

                const insertQuery = `
                    DECLARE $id AS Utf8; DECLARE $email AS Utf8; DECLARE $hash AS Utf8;
                    DECLARE $role AS Utf8; DECLARE $cart AS JsonDocument;
                    DECLARE $history AS JsonDocument; DECLARE $sub AS JsonDocument;

                    INSERT INTO users (id, email, password_hash, role, totalSpent, cart, history, subscription)
                    VALUES ($id, $email, $hash, $role, 0, $cart, $history, $sub);
                `;
                await session.executeQuery(insertQuery, {
                    '$id': TypedValues.utf8(userId), '$email': TypedValues.utf8(email),
                    '$hash': TypedValues.utf8(hash), '$role': TypedValues.utf8(email === 'info@locus.coffee' ? 'admin' : 'user'), 
                    '$cart': TypedValues.jsonDocument(emptyArr), '$history': TypedValues.jsonDocument(emptyArr), '$sub': TypedValues.jsonDocument(emptyArr)
                });

                const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
                responseData = { success: true, token, user: { id: userId, email, totalSpent: 0, cart: [], history: [], subscription: [] } };
            }
            
            else if (action === 'login') {
                const { email, password } = body;
                const loginQuery = `DECLARE $email AS Utf8; SELECT * FROM users WHERE email = $email;`;
                const { resultSets } = await session.executeQuery(loginQuery, { '$email': TypedValues.utf8(email) });

                if (resultSets[0].rows.length === 0) throw new Error('Неверный email или пароль');
                
                const user = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                const pwdHash = user.passwordhash || user.password_hash;
                if (!pwdHash || !bcrypt.compareSync(password, pwdHash)) throw new Error('Неверный email или пароль');

                const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
                
                responseData = { 
                    success: true, token, 
                    user: { 
                        id: user.id, email: user.email, totalSpent: Number(user.totalspent) || 0, 
                        cart: getRawArray(user.cart), 
                        history: getRawArray(user.history), 
                        subscription: getRawArray(user.subscription) 
                    } 
                };
            }
            
            else if (action === 'getUserData') {
                const decoded = verifyToken(rawToken);
                const query = `DECLARE $id AS Utf8; SELECT * FROM users WHERE id = $id;`;
                const { resultSets } = await session.executeQuery(query, { '$id': TypedValues.utf8(decoded.userId) });
                
                if (resultSets[0].rows.length === 0) throw new Error('Пользователь не найден');
                
                const user = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                
                responseData = {
                    success: true,
                    user: { 
                        id: user.id || decoded.userId, 
                        email: user.email || decoded.email, 
                        totalSpent: Number(user.totalspent) || 0, 
                        cart: getRawArray(user.cart), 
                        history: getRawArray(user.history), 
                        subscription: getRawArray(user.subscription) 
                    }
                };
            }

            else if (action === 'updateUser') {
                const decoded = verifyToken(rawToken);
                const { field, data } = body;
                if (!['cart', 'history', 'subscription'].includes(field)) throw new Error('Недопустимое поле');

                const updateQuery = `DECLARE $id AS Utf8; DECLARE $data AS JsonDocument; UPDATE users SET ${field} = $data WHERE id = $id;`;
                await session.executeQuery(updateQuery, {
                    '$id': TypedValues.utf8(decoded.userId), '$data': TypedValues.jsonDocument(JSON.stringify(data))
                });
                responseData = { success: true };
            }

            else if (action === 'placeOrder') {
                const decoded = verifyToken(rawToken);
                const { order } = body;
                if (!order || !order.id) throw new Error('Нет данных заказа');

                // 1. ПРОСТО СОЗДАЕМ ЗАКАЗ СО СТАТУСОМ 'pending_payment'
                // (Мы больше НЕ трогаем профиль клиента и НЕ очищаем его корзину здесь!)
                const orderQuery = `
                    DECLARE $orderId AS Utf8; DECLARE $userId AS Utf8; DECLARE $invId AS Double;
                    DECLARE $total AS Double; DECLARE $discount AS Int32; DECLARE $promo AS Utf8;
                    DECLARE $status AS Utf8; DECLARE $customer AS JsonDocument; 
                    DECLARE $delivery AS JsonDocument; DECLARE $items AS JsonDocument;

                    INSERT INTO orders (id, userId, invId, total, discountPercent, promo, status, customer, delivery, items, createdAt)
                    VALUES ($orderId, $userId, $invId, $total, $discount, $promo, $status, $customer, $delivery, $items, CurrentUtcDatetime());
                `;
                await session.executeQuery(orderQuery, {
                    '$orderId': TypedValues.utf8(order.id),
                    '$userId': TypedValues.utf8(decoded.userId),
                    '$invId': TypedValues.double(order.invId || 0),
                    '$total': TypedValues.double(order.total || 0),
                    '$discount': TypedValues.int32(order.discountPercent || 0),
                    '$promo': TypedValues.utf8(order.promo || ''),
                    '$status': TypedValues.utf8('pending_payment'),
                    '$customer': TypedValues.jsonDocument(JSON.stringify(order.customer || {})),
                    '$delivery': TypedValues.jsonDocument(JSON.stringify(order.delivery || {})),
                    '$items': TypedValues.jsonDocument(JSON.stringify(order.items || []))
                });

                // 2. Генерируем ссылку на оплату
                const outSum = order.total.toString();
                const invIdStr = order.invId.toString();
                const sigVal = crypto.createHash('md5').update(`LocusCoffee:${outSum}:${invIdStr}:VB3Js1HjXRqp5ahHe4p7`).digest('hex');
                const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=LocusCoffee&OutSum=${outSum}&InvId=${invIdStr}&Description=CoffeeOrder&SignatureValue=${sigVal}&Email=${order.customer.email}`;

                responseData = { success: true, paymentUrl: paymentUrl };
            }

            // --- НАЧАЛО: WEBHOOK ОТ ROBOKASSA ---
            else if (action === 'robokassaCallback') {
                console.log('--- СТАРТ ВЕБХУКА РОБОКАССЫ ---');
                
                let params = event.queryStringParameters || {};
                
                // На случай если Робокасса пришлет данные в теле POST запроса
                if (!params.OutSum && event.body) {
                    try {
                        const bodyStr = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
                        const searchParams = new URLSearchParams(bodyStr);
                        params = Object.fromEntries(searchParams.entries());
                    } catch(e) {}
                }

                const outSum = params.OutSum;
                const invId = params.InvId;
                const sig = params.SignatureValue;

                if (!outSum || !invId || !sig) {
                    responseData = { _isWebhook: true, text: 'Bad Request' };
                    return;
                }

                const mySig = crypto.createHash('md5').update(`${outSum}:${invId}:j4zmL54MKN0SZ7tRiufa`).digest('hex').toUpperCase();

                if (sig.toUpperCase() === mySig) {
                    try {
                        // 1. Обновляем статус заказа
                        const qUpdOrder = `DECLARE $id AS Utf8; UPDATE orders SET status = 'paid' WHERE id = $id;`;
                        await session.executeQuery(qUpdOrder, { '$id': TypedValues.utf8(String(invId)) });

                        // 2. Достаем заказ
                        const qFindOrder = `DECLARE $id AS Utf8; SELECT userId, total, delivery, items, createdAt, customer FROM orders WHERE id = $id;`;
                        const { resultSets: ordRes } = await session.executeQuery(qFindOrder, { '$id': TypedValues.utf8(String(invId)) });

                        if (ordRes[0].rows.length > 0) {
                            const ord = rowToObj(ordRes[0].columns, ordRes[0].rows[0]);
                            const userId = ord.userid;
                            
                            let deliveryCost = 0;
                            let delData = {}; // ПРАВИЛЬНАЯ ЗОНА ВИДИМОСТИ
                            try {
                                let rawDel = ord.delivery;
                                if (rawDel && rawDel.value !== undefined) rawDel = rawDel.value;
                                if (Buffer.isBuffer(rawDel)) rawDel = rawDel.toString('utf8');
                                delData = typeof rawDel === 'string' ? JSON.parse(rawDel) : rawDel;
                                deliveryCost = Number(delData.finalCost) || 0;
                            } catch(e) { console.error('Ошибка парсинга delivery:', e.message); }

                            const productTotal = Number(ord.total) - deliveryCost;
                            
                            if (userId) {
                                // Начисляем лояльность
                                if (productTotal > 0) {
                                    const qUpdUser = `DECLARE $userId AS Utf8; DECLARE $spent AS Double; UPDATE users SET totalSpent = totalSpent + $spent WHERE id = $userId;`;
                                    await session.executeQuery(qUpdUser, { '$userId': TypedValues.utf8(userId), '$spent': TypedValues.double(productTotal) });
                                }

                                // История клиента
                                const qFindHist = `DECLARE $userId AS Utf8; SELECT history FROM users WHERE id = $userId;`;
                                const { resultSets: uRes } = await session.executeQuery(qFindHist, { '$userId': TypedValues.utf8(userId) });
                                
                                let hist = [];
                                if (uRes[0].rows.length > 0) {
                                    const uRow = rowToObj(uRes[0].columns, uRes[0].rows[0]);
                                    hist = getRawArray(uRow.history);
                                }

                                let parsedItems = [];
                                try {
                                    let rawI = ord.items;
                                    if (rawI && rawI.value !== undefined) rawI = rawI.value;
                                    if (Buffer.isBuffer(rawI)) rawI = rawI.toString('utf8');
                                    parsedItems = typeof rawI === 'string' ? JSON.parse(rawI) : rawI;
                                } catch(e){}

                                let d = new Date(ord.createdat);
                                if (isNaN(d.getTime())) d = new Date();
                                const datePart = d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' });
                                const timePart = d.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });

                                const newHistItem = {
                                    isOrder: true,
                                    orderId: String(invId),
                                    status: 'paid',
                                    date: datePart + ' ' + timePart,
                                    total: ord.total,
                                    items: parsedItems,
                                    delivery: delData 
                                };
                                hist.push(newHistItem);

                                // Очистка корзины
                                const emptyCart = JSON.stringify([]);
                                const qUpdHist = `DECLARE $userId AS Utf8; DECLARE $hist AS JsonDocument; DECLARE $cart AS JsonDocument; UPDATE users SET history = $hist, cart = $cart WHERE id = $userId;`;
                                await session.executeQuery(qUpdHist, { 
                                    '$userId': TypedValues.utf8(userId), 
                                    '$hist': TypedValues.jsonDocument(JSON.stringify(hist)),
                                    '$cart': TypedValues.jsonDocument(emptyCart)
                                });

                                // Формируем Email
                                let customerData = {};
                                try {
                                    let rawCust = ord.customer;
                                    if (rawCust && rawCust.value !== undefined) rawCust = rawCust.value;
                                    if (Buffer.isBuffer(rawCust)) rawCust = rawCust.toString('utf8');
                                    customerData = typeof rawCust === 'string' ? JSON.parse(rawCust) : rawCust;
                                } catch(e) {}
                                
                                const customerEmail = customerData.email; // БЕЗ DECODED.EMAIL

                                if (customerEmail && process.env.SMTP_PASSWORD) {
                                    try {
                                        const transporter = nodemailer.createTransport({
                                            host: 'smtp.yandex.ru',
                                            port: 465,
                                            secure: true,
                                            auth: { user: 'info@locus.coffee', pass: process.env.SMTP_PASSWORD }
                                        });

                                        let itemsHtmlList = '';
                                        parsedItems.forEach(i => {
                                            itemsHtmlList += `<li style="margin-bottom: 5px;"><b>${i.item}</b> (${i.weight}г, ${i.grind}) x ${i.qty} шт. — <b>${i.price * i.qty} ₽</b></li>`;
                                        });

                                        let deliveryText = 'Уточняется';
                                        if (delData.type === 'PICKUP') deliveryText = `Самовывоз (ТЦ Атолл, код: <b>${delData.code}</b>)`;
                                        else if (delData.city) deliveryText = `${delData.type === 'PVZ' ? 'СДЭК ПВЗ' : 'Курьер/Адрес'}: ${delData.city}, ${delData.address}`;

                                        const mailOptions = {
                                            from: '"Locus Coffee" <info@locus.coffee>',
                                            to: customerEmail,
                                            bcc: 'info@locus.coffee',
                                            subject: `Заказ №${invId} успешно оплачен | Locus Coffee`,
                                            html: `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #E5E1D8; border-radius: 8px; overflow: hidden;">
                                                    <div style="background: #693a05; padding: 20px; text-align: center; color: #fff;">
                                                        <h2 style="margin: 0; letter-spacing: 2px;">LOCUS COFFEE</h2>
                                                    </div>
                                                    <div style="padding: 20px; background: #F4F1EA;">
                                                        <h3 style="margin-top: 0;">Здравствуйте, ${customerData.name || 'дорогой клиент'}!</h3>
                                                        <p>Ваш заказ <b>№${invId}</b> от ${datePart} ${timePart} успешно оплачен и передан на сборку.</p>
                                                        <div style="background: #fff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                                            <h4 style="margin-top: 0; color: #8B7E66;">Состав заказа:</h4>
                                                            <ul style="padding-left: 20px; margin: 0;">${itemsHtmlList}</ul>
                                                            <hr style="border: none; border-top: 1px dashed #ccc; margin: 15px 0;">
                                                            <p style="margin: 0;"><b>Доставка:</b> ${deliveryText} (${deliveryCost} ₽)</p>
                                                            <p style="margin: 5px 0 0 0; font-size: 18px;"><b>Итого оплачено: ${ord.total} ₽</b></p>
                                                        </div>
                                                    </div>
                                                </div>`
                                        };
                                        await transporter.sendMail(mailOptions);
                                        console.log('Письмо отправлено на', customerEmail);
                                    } catch (mailErr) {
                                        console.error("ОШИБКА ПОЧТЫ:", mailErr.message);
                                    }
                                }
                            }
                        }
                    } catch (dbErr) {
                        console.error('КРИТИЧЕСКАЯ ОШИБКА БД:', dbErr.message);
                        console.error(dbErr.stack);
                    }
                    responseData = { _isWebhook: true, text: `OK${invId}` };
                } else {
                    responseData = { _isWebhook: true, text: 'Bad signature' };
                }
            }
            // --- КОНЕЦ: WEBHOOK ОТ ROBOKASSA ---

            else if (action === 'getAdminUsers') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');

                const query = `SELECT * FROM users;`;
                const { resultSets } = await session.executeQuery(query);
                
                let usersList = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const u = rowToObj(resultSets[0].columns, row);
                        usersList.push({
                            id: u.id,
                            email: u.email,
                            totalSpent: Number(u.totalspent) || 0,
                            history: getRawArray(u.history)
                        });
                    });
                }
                responseData = { success: true, users: usersList };
            }

            else if (action === 'getPromos') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');

                const query = `SELECT * FROM promocodes;`;
                const { resultSets } = await session.executeQuery(query);
                
                let promosList = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const p = rowToObj(resultSets[0].columns, row);
                        promosList.push({
                            id: p.id,
                            val: Number(p.val) || 0,
                            type: p.type || 'percent',
                            active: p.active !== undefined ? p.active : true
                        });
                    });
                }
                responseData = { success: true, promos: promosList };
            }
            
            else if (action === 'addPromo') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { id, val, type, active } = body;
                const query = `
                    DECLARE $id AS Utf8; DECLARE $val AS Double; DECLARE $type AS Utf8; DECLARE $active AS Bool;
                    UPSERT INTO promocodes (id, val, type, active) VALUES ($id, $val, $type, $active);
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(id),
                    '$val': TypedValues.double(Number(val)),
                    '$type': TypedValues.utf8(type),
                    '$active': TypedValues.bool(active)
                });
                responseData = { success: true };
            }
            
            else if (action === 'togglePromo') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { id, active } = body;
                const query = `DECLARE $id AS Utf8; DECLARE $active AS Bool; UPDATE promocodes SET active = $active WHERE id = $id;`;
                await session.executeQuery(query, { '$id': TypedValues.utf8(id), '$active': TypedValues.bool(active) });
                responseData = { success: true };
            }
            
            else if (action === 'deletePromo') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { id } = body;
                const query = `DECLARE $id AS Utf8; DELETE FROM promocodes WHERE id = $id;`;
                await session.executeQuery(query, { '$id': TypedValues.utf8(id) });
                responseData = { success: true };
            }
            
            else if (action === 'checkPromo') {
                const code = event.queryStringParameters?.id || body.id;
                if (!code) throw new Error('Нет кода');
                
                const query = `DECLARE $id AS Utf8; SELECT * FROM promocodes WHERE id = $id;`;
                const { resultSets } = await session.executeQuery(query, { '$id': TypedValues.utf8(code) });
                
                if (resultSets[0].rows.length > 0) {
                    const p = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                    responseData = { success: true, promo: { id: p.id, val: Number(p.val), type: p.type, active: p.active } };
                } else {
                    responseData = { success: false, error: 'Промокод не найден' };
                }
            }

            else if (action === 'getActions') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const query = `SELECT * FROM actions;`;
                const { resultSets } = await session.executeQuery(query);
                let actionsList = [];
                
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const a = rowToObj(resultSets[0].columns, row);
                        actionsList.push({
                            id: a.id, title: a.title, msg: a.msg, type: a.type,
                            promoCode: a.promocode, discountVal: Number(a.discountval) || 0,
                            discountType: a.discounttype, limit: Number(a.viewlimit) || 1,
                            dateEnd: a.dateend, active: a.active !== undefined ? a.active : true,
                            createdAt: a.createdat
                        });
                    });
                }
                responseData = { success: true, actions: actionsList };
            }
            
            else if (action === 'getActiveActions') {
                const query = `SELECT * FROM actions;`;
                const { resultSets } = await session.executeQuery(query);
                let actionsList = [];
                
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const a = rowToObj(resultSets[0].columns, row);
                        if (a.active !== false) {
                            actionsList.push({
                                id: a.id, title: a.title, msg: a.msg, type: a.type,
                                promoCode: a.promocode, discountVal: Number(a.discountval) || 0,
                                discountType: a.discounttype, limit: Number(a.viewlimit) || 1,
                                dateEnd: a.dateend, createdAt: a.createdat
                            });
                        }
                    });
                }
                responseData = { success: true, actions: actionsList };
            }
            
            else if (action === 'saveAction') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { id, title, msg, type, promoCode, discountVal, discountType, limit, dateEnd, active, createdAt } = body;
                const actId = id || 'act_' + Date.now(); 
                
                const query = `
                    DECLARE $id AS Utf8; DECLARE $title AS Utf8; DECLARE $msg AS Utf8;
                    DECLARE $type AS Utf8; DECLARE $promoCode AS Utf8; DECLARE $discountVal AS Double;
                    DECLARE $discountType AS Utf8; DECLARE $viewLimit AS Int32; DECLARE $dateEnd AS Utf8;
                    DECLARE $active AS Bool; DECLARE $createdAt AS Utf8;
                    
                    UPSERT INTO actions (id, title, msg, type, promoCode, discountVal, discountType, viewLimit, dateEnd, active, createdAt)
                    VALUES ($id, $title, $msg, $type, $promoCode, $discountVal, $discountType, $viewLimit, $dateEnd, $active, $createdAt);
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(actId), '$title': TypedValues.utf8(title || ''),
                    '$msg': TypedValues.utf8(msg || ''), '$type': TypedValues.utf8(type || 'info'),
                    '$promoCode': TypedValues.utf8(promoCode || ''), '$discountVal': TypedValues.double(Number(discountVal) || 0),
                    '$discountType': TypedValues.utf8(discountType || 'percent'), '$viewLimit': TypedValues.int32(Number(limit) || 1),
                    '$dateEnd': TypedValues.utf8(dateEnd || ''), '$active': TypedValues.bool(active !== false),
                    '$createdAt': TypedValues.utf8(createdAt || new Date().toISOString())
                });
                
                if (type === 'discount' && promoCode) {
                    const pQuery = `
                        DECLARE $pCode AS Utf8; DECLARE $pVal AS Double; DECLARE $pType AS Utf8; DECLARE $pAct AS Bool;
                        UPSERT INTO promocodes (id, val, type, active) VALUES ($pCode, $pVal, $pType, $pAct);
                    `;
                    await session.executeQuery(pQuery, {
                        '$pCode': TypedValues.utf8(promoCode), '$pVal': TypedValues.double(Number(discountVal) || 0),
                        '$pType': TypedValues.utf8(discountType || 'percent'), '$pAct': TypedValues.bool(active !== false)
                    });
                }
                responseData = { success: true };
            }
            
            else if (action === 'toggleAction') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { id, active, promoCode } = body;
                const query = `DECLARE $id AS Utf8; DECLARE $active AS Bool; UPDATE actions SET active = $active WHERE id = $id;`;
                await session.executeQuery(query, { '$id': TypedValues.utf8(id), '$active': TypedValues.bool(active) });
                
                if (promoCode) {
                    const pQuery = `DECLARE $pCode AS Utf8; DECLARE $pAct AS Bool; UPDATE promocodes SET active = $pAct WHERE id = $pCode;`;
                    await session.executeQuery(pQuery, { '$pCode': TypedValues.utf8(promoCode), '$pAct': TypedValues.bool(active) });
                }
                responseData = { success: true };
            }
            
            else if (action === 'deleteAction') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { id, promoCode } = body;
                const query = `DECLARE $id AS Utf8; DELETE FROM actions WHERE id = $id;`;
                await session.executeQuery(query, { '$id': TypedValues.utf8(id) });
                
                if (promoCode) {
                    const pQuery = `DECLARE $pCode AS Utf8; DELETE FROM promocodes WHERE id = $pCode;`;
                    await session.executeQuery(pQuery, { '$pCode': TypedValues.utf8(promoCode) });
                }
                responseData = { success: true };
            }

            else if (action === 'getAdminMessages') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const query = `SELECT * FROM messages;`;
                const { resultSets } = await session.executeQuery(query);
                let msgs = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const m = rowToObj(resultSets[0].columns, row);
                        if (m.deletedbyadmin !== true) {
                            msgs.push({
                                id: m.id, userId: m.userid, userEmail: m.useremail,
                                direction: m.direction, subject: m.subject, text: m.text,
                                timestamp: m.timestamp, isRead: m.isread,
                                deletedByAdmin: m.deletedbyadmin, deletedByUser: m.deletedbyuser
                            });
                        }
                    });
                }
                responseData = { success: true, messages: msgs };
            }
            
            else if (action === 'getUserMessages') {
                const decoded = verifyToken(rawToken);
                const query = `DECLARE $userId AS Utf8; SELECT * FROM messages WHERE userId = $userId;`;
                const { resultSets } = await session.executeQuery(query, { '$userId': TypedValues.utf8(decoded.userId) });
                let msgs = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const m = rowToObj(resultSets[0].columns, row);
                        if (m.deletedbyuser !== true) {
                            msgs.push({
                                id: m.id, userId: m.userid, userEmail: m.useremail,
                                direction: m.direction, subject: m.subject, text: m.text,
                                timestamp: m.timestamp, isRead: m.isread,
                                deletedByAdmin: m.deletedbyadmin, deletedByUser: m.deletedbyuser
                            });
                        }
                    });
                }
                responseData = { success: true, messages: msgs };
            }
            
            else if (action === 'sendMessage') {
                const decoded = verifyToken(rawToken);
                const { direction, targetUserId, subject, text, userEmail } = body;
                const msgId = 'msg_' + uuidv4();
                
                const finalUserId = direction === 'to_admin' ? decoded.userId : targetUserId;
                const finalEmail = direction === 'to_admin' ? (decoded.email || userEmail) : '';

                const query = `
                    DECLARE $id AS Utf8; DECLARE $userId AS Utf8; DECLARE $userEmail AS Utf8;
                    DECLARE $direction AS Utf8; DECLARE $subject AS Utf8; DECLARE $text AS Utf8;
                    DECLARE $timestamp AS Utf8; DECLARE $isRead AS Bool;
                    DECLARE $deletedByAdmin AS Bool; DECLARE $deletedByUser AS Bool;

                    UPSERT INTO messages (id, userId, userEmail, direction, subject, text, timestamp, isRead, deletedByAdmin, deletedByUser)
                    VALUES ($id, $userId, $userEmail, $direction, $subject, $text, $timestamp, $isRead, $deletedByAdmin, $deletedByUser);
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(msgId), '$userId': TypedValues.utf8(finalUserId),
                    '$userEmail': TypedValues.utf8(finalEmail || ''), '$direction': TypedValues.utf8(direction),
                    '$subject': TypedValues.utf8(subject || 'Без темы'), '$text': TypedValues.utf8(text || ''),
                    '$timestamp': TypedValues.utf8(new Date().toISOString()), '$isRead': TypedValues.bool(false),
                    '$deletedByAdmin': TypedValues.bool(false), '$deletedByUser': TypedValues.bool(false)
                });
                responseData = { success: true };
            }
            
            else if (action === 'deleteMessage') {
                const decoded = verifyToken(rawToken);
                const { msgId, side } = body; 
                
                if (side === 'admin' && decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const qRead = `DECLARE $id AS Utf8; SELECT * FROM messages WHERE id = $id;`;
                const { resultSets } = await session.executeQuery(qRead, { '$id': TypedValues.utf8(msgId) });
                
                if(resultSets[0].rows.length > 0) {
                    const m = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                    let delAdmin = m.deletedbyadmin || false;
                    let delUser = m.deletedbyuser || false;
                    
                    if (side === 'admin') delAdmin = true;
                    if (side === 'user') delUser = true;

                    if (delAdmin && delUser) {
                        const qDel = `DECLARE $id AS Utf8; DELETE FROM messages WHERE id = $id;`;
                        await session.executeQuery(qDel, { '$id': TypedValues.utf8(msgId) });
                    } else {
                        const qUpd = `DECLARE $id AS Utf8; DECLARE $delA AS Bool; DECLARE $delU AS Bool; UPDATE messages SET deletedByAdmin = $delA, deletedByUser = $delU WHERE id = $id;`;
                        await session.executeQuery(qUpd, { '$id': TypedValues.utf8(msgId), '$delA': TypedValues.bool(delAdmin), '$delU': TypedValues.bool(delUser) });
                    }
                }
                responseData = { success: true };
            }

            else if (action === 'getAdminSubs') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const query = `SELECT email, subscription FROM users;`;
                const { resultSets } = await session.executeQuery(query);
                
                let allSubs = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const u = rowToObj(resultSets[0].columns, row);
                        const subs = getRawArray(u.subscription);
                        
                        subs.forEach(s => {
                            if (s.active !== false) {
                                allSubs.push({
                                    email: u.email,
                                    item: s.item,
                                    weight: s.weight || 250,
                                    grind: s.grind || 'Зерно',
                                    price: s.price,
                                    dateAdded: s.dateAdded || 'Неизвестно'
                                });
                            }
                        });
                    });
                }
                responseData = { success: true, subs: allSubs };
            }

            // --- НАЧАЛО: АДМИНКА - ЦЕНООБРАЗОВАНИЕ (CSV ПАРСЕР) ---
            else if (action === 'getPricingSettings') {
                const query = `SELECT * FROM settings WHERE id = 'pricing';`;
                const { resultSets } = await session.executeQuery(query);
                
                let config = {};
                if (resultSets[0].rows.length > 0) {
                    let raw = getCol(resultSets[0].rows[0], 'config');
                    if (typeof raw === 'object' && raw !== null && raw.value !== undefined) raw = raw.value;
                    if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
                    
                    if (typeof raw === 'string') {
                        try { config = JSON.parse(raw); } catch(e) {}
                    } else if (typeof raw === 'object') {
                        config = raw || {};
                    }
                }
                responseData = { success: true, settings: config };
            }
            
            else if (action === 'savePricingSettings') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { settings } = body;
                const query = `
                    DECLARE $id AS Utf8; DECLARE $config AS JsonDocument;
                    UPSERT INTO settings (id, config) VALUES ($id, $config);
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8('pricing'),
                    '$config': TypedValues.jsonDocument(JSON.stringify(settings || {}))
                });
                responseData = { success: true };
            }
            // --- КОНЕЦ: АДМИНКА - ЦЕНООБРАЗОВАНИЕ (CSV ПАРСЕР) ---
            // --- НАЧАЛО: ОПТОВЫЕ ЗАКАЗЫ ---
            else if (action === 'placeWholesaleOrder') {
                // Делаем авторизацию необязательной. Если токена нет, пишем 'guest'
                let currentUserId = 'guest';
                if (rawToken) {
                    try {
                        const decoded = verifyToken(rawToken);
                        currentUserId = decoded.userId;
                    } catch(e) {} // Игнорируем ошибки токена для оптовых (гостевых) заказов
                }

                const { order } = body;
                if (!order || !order.id) throw new Error('Нет данных заказа');

                const orderQuery = `
                    DECLARE $orderId AS Utf8; DECLARE $userId AS Utf8; 
                    DECLARE $total AS Double; DECLARE $status AS Utf8; 
                    DECLARE $customer AS JsonDocument; DECLARE $items AS JsonDocument;

                    INSERT INTO orders (id, userId, total, status, customer, items, createdAt)
                    VALUES ($orderId, $userId, $total, $status, $customer, $items, CurrentUtcDatetime());
                `;
                await session.executeQuery(orderQuery, {
                    '$orderId': TypedValues.utf8(order.id),
                    '$userId': TypedValues.utf8(currentUserId), // Используем 'guest' или ID пользователя
                    '$total': TypedValues.double(order.total || 0),
                    '$status': TypedValues.utf8('wholesale_new'),
                    '$customer': TypedValues.jsonDocument(JSON.stringify(order.customer || {})),
                    '$items': TypedValues.jsonDocument(JSON.stringify(order.items || []))
                });
                responseData = { success: true };
            }

            // --- НАЧАЛО: ЗАГРУЗКА ВСЕХ ЗАКАЗОВ (АДМИНКА) ---
            else if (action === 'getAdminOrders') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const query = `SELECT * FROM orders;`;
                const { resultSets } = await session.executeQuery(query);
                
                let retailOrders = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const o = rowToObj(resultSets[0].columns, row);
                        
                        // Фильтруем: берем розничные заказы, которые УЖЕ ОПЛАЧЕНЫ (исключаем pending_payment)
                        if (o.id && !o.id.startsWith('ws_') && o.status !== 'pending_payment') {
                            let customerData = {};
                            let deliveryData = {};
                            try {
                                let rawCust = o.customer;
                                if (rawCust && rawCust.value !== undefined) rawCust = rawCust.value;
                                if (Buffer.isBuffer(rawCust)) rawCust = rawCust.toString('utf8');
                                customerData = typeof rawCust === 'string' ? JSON.parse(rawCust) : rawCust;
                                
                                let rawDel = o.delivery;
                                if (rawDel && rawDel.value !== undefined) rawDel = rawDel.value;
                                if (Buffer.isBuffer(rawDel)) rawDel = rawDel.toString('utf8');
                                deliveryData = typeof rawDel === 'string' ? JSON.parse(rawDel) : rawDel;
                            } catch(e) {}

                            retailOrders.push({
                                id: o.id,
                                invId: o.invid || o.id,
                                userId: o.userid,
                                total: Number(o.total) || 0,
                                status: o.status,
                                customer: customerData,
                                delivery: deliveryData,
                                items: getRawArray(o.items),
                                createdAt: o.createdat
                            });
                        }
                    });
                }
                responseData = { success: true, orders: retailOrders };
            }

            else if (action === 'getAdminWholesaleOrders') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const query = `SELECT * FROM orders;`;
                const { resultSets } = await session.executeQuery(query);
                
                let wsOrders = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const o = rowToObj(resultSets[0].columns, row);
                        
                        // Фильтруем: берем строго оптовые заказы (id начинается с ws_)
                        if (o.id && o.id.startsWith('ws_')) {
                            let customerData = {};
                            try {
                                let rawCust = o.customer;
                                if (rawCust && rawCust.value !== undefined) rawCust = rawCust.value;
                                if (Buffer.isBuffer(rawCust)) rawCust = rawCust.toString('utf8');
                                customerData = typeof rawCust === 'string' ? JSON.parse(rawCust) : rawCust;
                            } catch(e) {}

                            wsOrders.push({
                                id: o.id, userId: o.userid, total: Number(o.total) || 0,
                                status: o.status, customer: customerData,
                                items: getRawArray(o.items), createdAt: o.createdat
                            });
                        }
                    });
                }
                responseData = { success: true, orders: wsOrders };
            }
            // --- КОНЕЦ: ЗАГРУЗКА ВСЕХ ЗАКАЗОВ (АДМИНКА) ---
            
            else if (action === 'updateOrderStatus') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { orderId, status } = body;
                const query = `DECLARE $id AS Utf8; DECLARE $status AS Utf8; UPDATE orders SET status = $status WHERE id = $id;`;
                await session.executeQuery(query, { 
                    '$id': TypedValues.utf8(orderId), '$status': TypedValues.utf8(status) 
                });
                responseData = { success: true };
            }
            // --- НАЧАЛО: УДАЛЕНИЕ ЗАКАЗА (АДМИНКА) ---
            else if (action === 'deleteOrder') {
                const decoded = verifyToken(rawToken);
                // Проверяем, что удаляет именно админ
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const reqBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
                const orderId = reqBody.orderId;
                
                if (!orderId) throw new Error('Не указан ID заказа');

                // Удаляем строку из базы YDB по точному совпадению ID
                const query = `
                    DECLARE $id AS Utf8;
                    DELETE FROM orders WHERE id = $id;
                `;
                
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(String(orderId))
                });

                responseData = { success: true };
            }
            // --- КОНЕЦ: УДАЛЕНИЕ ЗАКАЗА (АДМИНКА) ---
            // НОВАЯ ФУНКЦИЯ: Удаление оптового заказа из базы
            else if (action === 'deleteWholesaleOrder') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const { orderId } = body;
                const query = `DECLARE $id AS Utf8; DELETE FROM orders WHERE id = $id;`;
                await session.executeQuery(query, { '$id': TypedValues.utf8(orderId) });
                responseData = { success: true };
            }
            // --- КОНЕЦ: ОПТОВЫЕ ЗАКАЗЫ ---
// --- НАЧАЛО: КАТАЛОГ EXTRINSIC ДАННЫХ ---
            else if (action === 'getExtrinsicData') {
                const query = `SELECT sample_no, raw_green_price, form_data FROM extrinsic_results;`;
                const { resultSets } = await session.executeQuery(query);
                
                // БЕЗОПАСНОЕ извлечение сохраненных AI-историй
                const aiQuery = `SELECT config FROM settings WHERE id = 'ai_stories';`;
                const { resultSets: aiRes } = await session.executeQuery(aiQuery);
                let aiStories = {};
                try {
                    if (aiRes && aiRes[0] && aiRes[0].rows.length > 0) {
                        const aiRow = rowToObj(aiRes[0].columns, aiRes[0].rows[0]); // ИСПРАВЛЕНО: Распаковка строки
                        let rawAi = aiRow.config;
                        if (typeof rawAi === 'object' && rawAi !== null && rawAi.value !== undefined) rawAi = rawAi.value;
                        if (Buffer.isBuffer(rawAi)) rawAi = rawAi.toString('utf8');
                        if (rawAi instanceof Uint8Array) rawAi = Buffer.from(rawAi).toString('utf8'); 
                        const parsed = typeof rawAi === 'string' ? JSON.parse(rawAi) : rawAi;
                        if (parsed && typeof parsed === 'object') aiStories = parsed;
                    }
                } catch(e) { console.error('Ошибка парсинга ai_stories', e); }

                let extList = [];
                if (resultSets && resultSets[0] && resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const e = rowToObj(resultSets[0].columns, row);
                        let parsedForm = {};
                        try {
                            let rawForm = e.formdata || e.form_data;
                            if (typeof rawForm === 'object' && rawForm !== null && rawForm.value !== undefined) rawForm = rawForm.value;
                            if (Buffer.isBuffer(rawForm)) rawForm = rawForm.toString('utf8');
                            if (rawForm instanceof Uint8Array) rawForm = Buffer.from(rawForm).toString('utf8'); 
                            parsedForm = typeof rawForm === 'string' ? JSON.parse(rawForm) : rawForm;
                        } catch(err) {}
                        
                        extList.push({
                            sample_no: e.sampleno || e.sample_no,
                            raw_green_price: Number(e.rawgreenprice || e.raw_green_price) || 0,
                            form_data: parsedForm || {}
                        });
                    });
                }
                responseData = { success: true, data: extList, ai_stories: aiStories };
            }
            // --- КОНЕЦ: КАТАЛОГ EXTRINSIC ДАННЫХ ---
            // --- НАЧАЛО: ГЕНЕРАЦИЯ ИСТОРИИ ЛОТА ЧЕРЕЗ QWEN AI ---
            else if (action === 'generateLotStory') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен. Только Администратор может генерировать истории.');

                const qwenKey = process.env.QWEN_API_KEY;
                if (!qwenKey) throw new Error('API ключ Qwen не настроен на сервере');

                const { sample, country, region, farm, producer, variety, processDesc } = body;
                if (!sample) throw new Error('Лот не указан');
                
                const lotInfo = `Лот: ${sample}. Страна: ${country || 'Неизвестно'}, Регион: ${region || 'Неизвестно'}, Ферма/Кооператив: ${farm || 'Неизвестно'}, Производитель: ${producer || 'Неизвестно'}, Разновидность: ${variety || 'Неизвестно'}, Обработка: ${processDesc || 'Неизвестно'}`;

                // 1. ГЕНЕРАЦИЯ ТЕКСТА ИСТОРИИ
                const textPrompt = `Ты — профессиональный Q-грейдер и кофейный историк. Напиши энциклопедичное описание лота кофе на основе следующих данных: ${lotInfo}. 
СТРОГИЕ ПРАВИЛА: 
1. Используй ТОЛЬКО реальные исторические и географические факты.
2. Текст должен быть составлен последовательно: расскажи о стране выращивания, регионе выращивания, затем о терруаре, затем о ферме, владельце фермы, выращиваемом виде и сорте кофе, а так же об особенностях обработки кофейной ягоды.
3. Если статус информации "Неизвестно", не пиши о том, что это неизвестно, пиши только о том, что указано, как известное.
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать фантастические истории, несуществующие легенды, имена и любую другую информацию для текста.
5. Текст должен быть связным, познавательным, максимум 20 предложений, на русском языке, без форматирования markdown.
6. Внимательно проверь текст на орфографические, синтаксические, грамматические ошибки и правильные падежи применительно к русскому языку.`;

                const textReq = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${qwenKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'qwen-turbo', messages: [{ role: 'user', content: textPrompt }] })
                });
                const textData = await textReq.json();
                
                let generatedText = '';
                if (textData.choices && textData.choices[0]) {
                    generatedText = textData.choices[0].message.content;
                } else {
                    throw new Error(textData.error?.message || "Ошибка API Qwen");
                }

                // 2. УМНАЯ ГЕНЕРАЦИЯ ПРОМПТА ДЛЯ КАРТИНКИ (Географическая точность)
                // Убрали базовые "зеленые холмы", чтобы не сбивать нейросеть
                let dynamicImgPrompt = `Photorealistic wide landscape of a coffee farm in ${country || 'the region'}, distinctive local geography, natural lighting.`; 
                try {
                    const promptMakerReq = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${qwenKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            model: 'qwen-turbo', 
                            messages: [{ 
                                role: 'user', 
                                content: `You are an expert National Geographic location scout and AI image prompt engineer. Write a highly detailed, comma-separated English prompt for an AI to generate a photorealistic coffee farm in ${country || 'this region'}. 

CRITICAL INSTRUCTIONS TO ENSURE GEOGRAPHIC UNIQUENESS:
- Break the stereotype of "generic green hills". Focus on the EXACT topography of ${country}.
- If Africa (Ethiopia, Kenya, Rwanda): Emphasize high-altitude wild forests, Great Rift Valley landscapes, native acacia trees, wild undergrowth.
- If Brazil: Emphasize expansive flat plateaus (Cerrado), gentle rolling plains, savanna-like vegetation, lower altitudes, wide open skies.
- If Caribbean/Island (Cuba, Indonesia): Emphasize tropical island climate, palm trees, ocean humidity, volcanic soil, or dense jungle.
- If Central/South America (Colombia, Peru, Guatemala): Emphasize steep dramatic Andean mountain slopes, high-altitude cloud forests, misty valleys, and shade-grown canopy trees (like banana or pine).

RULES:
1. Base the geography on this story: ${generatedText}
2. Format as a dense, comma-separated list of visual descriptors.
3. Keep colors natural and realistic. Do not exaggerate soil color.
4. NO people, NO text, NO UI elements.
5. Return ONLY the English prompt string.` 
                            }] 
                        })
                    });
                    const promptMakerData = await promptMakerReq.json();
                    if (promptMakerData.choices && promptMakerData.choices[0]) {
                        dynamicImgPrompt = promptMakerData.choices[0].message.content.trim();
                    }
                } catch(e) { console.error("Ошибка умного промпта:", e); }

                // 3. ГЕНЕРАЦИЯ УНИКАЛЬНОЙ КАРТИНКИ
                let imageUrl = '';
                try {
                    const randomSeed = Math.floor(Math.random() * 2147483647);
                    // Добавляем технические стили для фотореализма National Geographic
                    const finalImgPrompt = dynamicImgPrompt + ", National Geographic nature photography, highly detailed landscape, realistic balanced colors, masterpiece, shot on 35mm lens.";
                    
                    const imgReq = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image-generation/generation', {
                        method: 'POST',
                        headers: { 'X-DashScope-Async': 'enable', 'Authorization': `Bearer ${qwenKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            model: 'wan2.6-t2i', 
                            input: { messages: [ { role: 'user', content: [ { text: finalImgPrompt } ] } ] }, 
                            parameters: { 
                                size: '1024*1024', 
                                n: 1,
                                seed: randomSeed
                            } 
                        })
                    });
                    const imgTask = await imgReq.json();
                    
                    let tempAlibabaUrl = '';

                    if (imgTask && imgTask.output && imgTask.output.task_id) {
                        const taskId = imgTask.output.task_id;
                        for (let i = 0; i < 30; i++) { 
                            await new Promise(r => setTimeout(r, 2000));
                            const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, { headers: { 'Authorization': `Bearer ${qwenKey}` } });
                            const pollData = await pollRes.json();
                            
                            if (pollData.output?.task_status === 'SUCCEEDED') {
                                if (pollData.output.choices && pollData.output.choices[0]?.message?.content) {
                                    const imgItem = pollData.output.choices[0].message.content.find(item => item.image || item.url);
                                    if (imgItem) tempAlibabaUrl = imgItem.image || imgItem.url || '';
                                } else if (pollData.output.results && pollData.output.results[0]) {
                                    tempAlibabaUrl = pollData.output.results[0].url || pollData.output.results[0].image_url || '';
                                }
                                break;
                            } else if (pollData.output?.task_status === 'FAILED') {
                                generatedText += "\n\n[ДИАГНОСТИКА: Ошибка рендера Алибабы: " + JSON.stringify(pollData) + "]";
                                break; 
                            }
                        }
                    } else if (imgTask && imgTask.output && imgTask.output.choices) {
                        const imgItem = imgTask.output.choices[0]?.message?.content?.find(item => item.image || item.url);
                        if (imgItem) tempAlibabaUrl = imgItem.image || imgItem.url || '';
                    }

                    if (!tempAlibabaUrl) {
                        generatedText += "\n\n[ДИАГНОСТИКА: Таймаут Алибабы. Картинка не успела сгенерироваться за 60 секунд.]";
                    }

                    // 4. ПЕРЕСОХРАНЕНИЕ НА IMGBB
                    if (tempAlibabaUrl) {
                        imageUrl = tempAlibabaUrl; 
                        const imgbbKey = process.env.IMGBB_API_KEY;
                        
                        if (!imgbbKey) {
                            generatedText += "\n\n[ДИАГНОСТИКА: Ключ IMGBB_API_KEY не добавлен!]";
                        } else {
                            try {
                                const dlRes = await fetch(tempAlibabaUrl);
                                const blob = await dlRes.blob(); 

                                const formData = new FormData();
                                formData.append('key', imgbbKey);
                                formData.append('image', blob, 'locus_coffee.png');

                                const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
                                    method: 'POST',
                                    body: formData
                                });
                                const imgbbData = await imgbbRes.json();
                                
                                if (imgbbData && imgbbData.success) {
                                    imageUrl = imgbbData.data.url; 
                                } else {
                                    generatedText += "\n\n[ДИАГНОСТИКА ImgBB Ошибка: " + JSON.stringify(imgbbData) + "]";
                                }
                            } catch (imgbbErr) {
                                generatedText += "\n\n[ДИАГНОСТИКА ImgBB Сеть: " + imgbbErr.message + "]";
                            }
                        }
                    }
                } catch(e) { 
                    generatedText += "\n\n[ДИАГНОСТИКА Картинки: " + e.message + "]";
                }

                // 5. БЕЗОПАСНОЕ СОХРАНЕНИЕ В БАЗУ YDB
                const aiQuery = `SELECT config FROM settings WHERE id = 'ai_stories';`;
                const { resultSets: aiRes } = await session.executeQuery(aiQuery);
                let aiStories = {}; 
                try {
                    if (aiRes && aiRes[0] && aiRes[0].rows.length > 0) {
                        const aiRow = rowToObj(aiRes[0].columns, aiRes[0].rows[0]); 
                        let rawAi = aiRow.config;
                        if (typeof rawAi === 'object' && rawAi !== null && rawAi.value !== undefined) rawAi = rawAi.value;
                        if (Buffer.isBuffer(rawAi)) rawAi = rawAi.toString('utf8');
                        if (rawAi instanceof Uint8Array) rawAi = Buffer.from(rawAi).toString('utf8'); 
                        const parsed = typeof rawAi === 'string' ? JSON.parse(rawAi) : rawAi;
                        if (parsed && typeof parsed === 'object') aiStories = parsed;
                    }
                } catch(e) {}

                if (!aiStories || typeof aiStories !== 'object') aiStories = {};
                aiStories[sample.trim()] = { text: generatedText, image: imageUrl };

                const saveAiQuery = `DECLARE $id AS Utf8; DECLARE $config AS JsonDocument; UPSERT INTO settings (id, config) VALUES ($id, $config);`;
                await session.executeQuery(saveAiQuery, { '$id': TypedValues.utf8('ai_stories'), '$config': TypedValues.jsonDocument(JSON.stringify(aiStories)) });

                responseData = { success: true, text: generatedText, image: imageUrl };
            }
            // --- КОНЕЦ: ГЕНЕРАЦИЯ ИСТОРИИ ЛОТА ЧЕРЕЗ QWEN AI ---
            else { throw new Error('Неизвестное действие API'); }
        });

        // Если это ответ для Робокассы - отдаем простой текст (как она требует)
        if (responseData._isWebhook) {
            return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: responseData.text };
        }

        // Обычный ответ для фронтенда магазина
        return { statusCode: 200, headers, body: JSON.stringify(responseData) };

    } catch (error) {
        console.error("Critical error:", error);
        return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
    }
};
