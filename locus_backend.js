const { Driver, getCredentialsFromEnv, TypedValues } = require('ydb-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // <-- Добавили nodemailer
const { createRetailOrderCalendarEvent } = require('./calendar_sync');
const JWT_SECRET = 'locus-coffee-super-secret-key-2026'; 
const PASSWORD_RESET_PURPOSE = 'password_reset';
const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || 'https://locus.coffee/';
const YANDEX_CATALOG_FUNCTION_URL = process.env.YANDEX_CATALOG_FUNCTION_URL || 'https://functions.yandexcloud.net/d4ekgff0csfc77v2nu5q';
const ARTICLE_CONTENT_SECRET = process.env.ARTICLE_CONTENT_SECRET || JWT_SECRET;
const ARTICLE_PAYLOAD_KIND = 'paid_article';
const WELCOME_POPUP_PENDING_KEY = 'welcome_popup_pending';
const WELCOME_POPUP_DISMISSED_KEY = 'welcome_popup_dismissed';
const WELCOME_BONUS_AVAILABLE_KEY = 'welcome_bonus_available';
const WELCOME_BONUS_USED_KEY = 'welcome_bonus_used';
const DEBUG_LOGS_ENABLED = /^(1|true|yes|on)$/i.test(String(process.env.DEBUG_LOGS || '').trim());
const CBR_USD_VALUTE_ID = 'R01235';

let driver;

function logDebug(...args) {
    if (DEBUG_LOGS_ENABLED) console.log(...args);
}

function normalizeEmailAddress(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidEmailAddress(email) {
    const value = normalizeEmailAddress(email);
    if (!value || value.length > 254) return false;

    const parts = value.split('@');
    if (parts.length !== 2) return false;

    const [localPart, domain] = parts;
    if (!localPart || !domain || localPart.length > 64 || domain.length > 253) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.') || domain.startsWith('.') || domain.endsWith('.')) return false;
    if (localPart.includes('..') || domain.includes('..')) return false;
    if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) return false;
    if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(domain)) return false;

    return domain.split('.').every(label => label && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-'));
}

function getRegistrationPasswordError(password) {
    const value = typeof password === 'string' ? password : '';
    if (!value) return 'Пароль обязателен';
    if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
    if (value.length > 72) return 'Пароль слишком длинный. Максимум 72 символа';
    if (/\s/.test(value)) return 'Пароль не должен содержать пробелы';
    if (!/[A-ZА-ЯЁ]/.test(value)) return 'Пароль должен содержать хотя бы одну заглавную букву';
    if (!/[a-zа-яё]/.test(value)) return 'Пароль должен содержать хотя бы одну строчную букву';
    if (!/\d/.test(value)) return 'Пароль должен содержать хотя бы одну цифру';
    return '';
}

function createMailTransport() {
    if (!process.env.SMTP_PASSWORD) return null;
    return nodemailer.createTransport({
        host: 'smtp.yandex.ru',
        port: 465,
        secure: true,
        auth: { user: 'info@locus.coffee', pass: process.env.SMTP_PASSWORD }
    });
}

async function sendTransactionalMail(mailOptions) {
    if (!process.env.SMTP_PASSWORD) return false;
    try {
        const transporter = createMailTransport();
        if (!transporter) return false;
        await transporter.sendMail(mailOptions);
        return true;
    } catch (mailErr) {
        console.error('ОШИБКА ПОЧТЫ:', mailErr.message);
        return false;
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendAdminInboxCopyEmail({ userEmail, userId, subject, text, timestamp }) {
    const safeUserEmail = escapeHtml(userEmail || 'Не указан');
    const safeUserId = escapeHtml(userId || 'Не указан');
    const safeSubject = escapeHtml(subject || 'Без темы');
    const safeText = escapeHtml(text || '').replace(/\r?\n/g, '<br>');
    const safeTimestamp = escapeHtml(timestamp || new Date().toISOString());

    return sendTransactionalMail({
        from: '"Locus Coffee" <info@locus.coffee>',
        to: 'info@locus.coffee',
        subject: `Новое сообщение в админку: ${subject || 'Без темы'}`,
        html: `<div style="font-family: Inter, Arial, sans-serif; color: #333; max-width: 640px; margin: 0 auto; border: 1px solid #E5E1D8; border-radius: 10px; overflow: hidden;">
                <div style="background: #693a05; padding: 18px 20px; color: #fff;">
                    <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.04em;">Новое сообщение в админку</h2>
                </div>
                <div style="padding: 20px; background: #F4F1EA;">
                    <div style="background: #fff; border-radius: 8px; padding: 16px; line-height: 1.55;">
                        <p style="margin: 0 0 10px 0;"><b>Отправитель:</b> ${safeUserEmail}</p>
                        <p style="margin: 0 0 10px 0;"><b>User ID:</b> ${safeUserId}</p>
                        <p style="margin: 0 0 10px 0;"><b>Тема:</b> ${safeSubject}</p>
                        <p style="margin: 0 0 16px 0;"><b>Отправлено:</b> ${safeTimestamp}</p>
                        <div style="padding: 14px; background: #F9F7F2; border-radius: 8px; white-space: normal;">
                            ${safeText || '<i>Пустое сообщение</i>'}
                        </div>
                    </div>
                </div>
            </div>`
    });
}

function buildPasswordResetUrl(token) {
    const url = new URL(PUBLIC_WEB_URL);
    url.searchParams.set('view', 'reset-password');
    url.searchParams.set('reset_token', token);
    return url.toString();
}

function createPasswordResetToken(userId, email, passwordHash) {
    return jwt.sign(
        { purpose: PASSWORD_RESET_PURPOSE, userId, email: normalizeEmailAddress(email) },
        `${JWT_SECRET}:${passwordHash}`,
        { expiresIn: '30m' }
    );
}

async function sendRegistrationWelcomeEmail(email) {
    return sendTransactionalMail({
        from: '"Locus Coffee" <info@locus.coffee>',
        to: email,
        bcc: 'info@locus.coffee',
        subject: 'Регистрационные данные на locus.coffee',
        html: `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #E5E1D8; border-radius: 8px; overflow: hidden;">
                <div style="background: #693a05; padding: 20px; text-align: center; color: #fff;">
                    <h2 style="margin: 0; letter-spacing: 2px;">LOCUS COFFEE</h2>
                </div>
                <div style="padding: 20px; background: #F4F1EA;">
                    <h3 style="margin-top: 0;">Здравствуйте!</h3>
                    <p>Спасибо за регистрацию в пространстве <b>locus.coffee</b>.</p>
                    <div style="background: #fff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><b>Логин:</b> ${email}</p>
                        <p style="margin: 0;">Пароль вы задали при регистрации. Если браузер предложил сохранить его, восстановить доступ можно через менеджер паролей или по ссылке «Забыли пароль?» на сайте.</p>
                    </div>
                </div>
            </div>`
    });
}

async function sendPasswordResetEmail(email, resetUrl) {
    return sendTransactionalMail({
        from: '"Locus Coffee" <info@locus.coffee>',
        to: email,
        bcc: 'info@locus.coffee',
        subject: 'Восстановление пароля на locus.coffee',
        html: `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #E5E1D8; border-radius: 8px; overflow: hidden;">
                <div style="background: #693a05; padding: 20px; text-align: center; color: #fff;">
                    <h2 style="margin: 0; letter-spacing: 2px;">LOCUS COFFEE</h2>
                </div>
                <div style="padding: 20px; background: #F4F1EA;">
                    <h3 style="margin-top: 0;">Восстановление доступа</h3>
                    <p>Мы получили запрос на смену пароля для аккаунта <b>${email}</b>.</p>
                    <p>Ссылка ниже действует 30 минут и подходит только для одного актуального пароля аккаунта.</p>
                    <div style="margin: 24px 0; text-align: center;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 12px 22px; border-radius: 999px; background: #693a05; color: #fff; text-decoration: none; font-weight: 600;">Сбросить пароль</a>
                    </div>
                    <p style="font-size: 12px; line-height: 1.5; color: #8B7E66;">Если это были не вы, просто проигнорируйте письмо. Текущий пароль останется без изменений.</p>
                </div>
            </div>`
    });
}

function isArticleCategory(category) {
    const value = String(category || '').toLowerCase();
    return value.includes('информац');
}

function isArticleOrderItem(item) {
    if (!item) return false;
    if (item.isArticle === true) return true;

    const title = String(item.item || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const numericPrice = parseFloat(item.price);
    return isArticleCategory(item.category) && title !== 'статьи' && numericPrice > 0;
}

function createSystemHistoryEntry(key, extra = {}) {
    return {
        isSystemMeta: true,
        systemType: key,
        createdAt: new Date().toISOString(),
        ...extra
    };
}

function hasSystemHistoryEntry(history, key) {
    return getRawArray(history).some(item => item && item.isSystemMeta && item.systemType === key);
}

function upsertSystemHistoryEntry(history, key, extra = {}) {
    const list = getRawArray(history);
    let replaced = false;
    const next = list.map(item => {
        if (item && item.isSystemMeta && item.systemType === key) {
            replaced = true;
            return { ...item, ...extra, isSystemMeta: true, systemType: key };
        }
        return item;
    });
    if (!replaced) next.push(createSystemHistoryEntry(key, extra));
    return next;
}

function removeSystemHistoryEntry(history, key) {
    return getRawArray(history).filter(item => !(item && item.isSystemMeta && item.systemType === key));
}

function deriveArticleCryptoKey() {
    return crypto.createHash('sha256').update(String(ARTICLE_CONTENT_SECRET)).digest();
}

function encryptArticleHtml(html) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', deriveArticleCryptoKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(html || ''), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptArticleHtml(payload) {
    const parts = String(payload || '').split('.');
    if (parts.length !== 3) throw new Error('Поврежденный шифр статьи');
    const [ivBase64, tagBase64, bodyBase64] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveArticleCryptoKey(), Buffer.from(ivBase64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(bodyBase64, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
}

function buildArticlePayload(previewHtml, bodyHtml) {
    return JSON.stringify({
        kind: ARTICLE_PAYLOAD_KIND,
        version: 1,
        previewHtml: String(previewHtml || ''),
        encryptedBody: encryptArticleHtml(bodyHtml || ''),
        updatedAt: new Date().toISOString()
    });
}

function parseArticlePayload(rawValue) {
    if (!rawValue) return null;
    try {
        const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        if (!parsed || parsed.kind !== ARTICLE_PAYLOAD_KIND || !parsed.encryptedBody) return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

async function fetchCatalogProducts() {
    const response = await fetch(`${YANDEX_CATALOG_FUNCTION_URL}?type=catalog`);
    const data = await response.json();
    if (!response.ok || !data || data.success === false || !Array.isArray(data.data)) {
        throw new Error(data?.error || 'Не удалось загрузить каталог');
    }
    return data.data;
}

function findCatalogProductById(catalog, productId) {
    const normalizedId = String(productId || '').trim();
    if (!normalizedId) return null;
    return (Array.isArray(catalog) ? catalog : []).find(item =>
        String(item?.id || '').trim() === normalizedId ||
        String(item?.sample_no || item?.sample || '').trim() === normalizedId
    ) || null;
}

async function proxyCatalogEdit(updatedData) {
    const response = await fetch(`${YANDEX_CATALOG_FUNCTION_URL}?type=catalog_edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData || {})
    });
    const data = await response.json();
    if (!response.ok || !data || data.success === false) {
        throw new Error(data?.error || 'Не удалось сохранить статью');
    }
    return data;
}

function createArticleAccessPassword(length = 12) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += alphabet[bytes[i] % alphabet.length];
    }
    return result;
}

function createArticleAccessRecord(item) {
    const password = createArticleAccessPassword();
    const now = Date.now();
    return {
        articleId: String(item?.lotId || item?.item || '').trim(),
        title: String(item?.item || '').trim(),
        password,
        passwordHash: bcrypt.hashSync(password, 10),
        grantedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + (31 * 24 * 60 * 60 * 1000)).toISOString()
    };
}

function collectArticleAccessRecords(items) {
    const result = [];
    (Array.isArray(items) ? items : []).forEach(item => {
        if (!isArticleOrderItem(item)) return;
        const articleId = String(item.lotId || item.item || '').trim();
        if (!articleId) return;
        const access = createArticleAccessRecord(item);
        item.articleAccess = {
            articleId: access.articleId,
            title: access.title,
            grantedAt: access.grantedAt,
            expiresAt: access.expiresAt,
            passwordHash: access.passwordHash
        };
        result.push(access);
    });
    return result;
}

function getActiveArticleAccessFromHistory(history, articleId) {
    const normalizedArticleId = String(articleId || '').trim();
    if (!normalizedArticleId) return null;
    const now = Date.now();
    let found = null;
    getRawArray(history).forEach(entry => {
        if (!entry || !Array.isArray(entry.items)) return;
        entry.items.forEach(item => {
            const access = item?.articleAccess;
            if (!access) return;
            if (String(access.articleId || '').trim() !== normalizedArticleId) return;
            const expiresAtMs = Date.parse(access.expiresAt || '');
            if (!expiresAtMs || expiresAtMs <= now) return;
            if (!found || expiresAtMs > Date.parse(found.expiresAt || '')) found = access;
        });
    });
    return found;
}

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

async function withSingleSession(work) {
    const dbDriver = await getDriver();
    return dbDriver.tableClient.withSession(work);
}

const RETRYABLE_SESSION_ACTIONS = new Set([
    'login',
    'requestPasswordReset',
    'resetPassword',
    'getUserData',
    'getMyOrderStatus',
    'getArticleLotEditorData',
    'getAdminUsers',
    'getPromos',
    'checkPromo',
    'getActions',
    'getActiveActions',
    'getAdminMessages',
    'markAdminMessagesRead',
    'getUserMessages',
    'getAdminSubs',
    'getPricingSettings',
    'getUsdAnalytics',
    'getAdminOrders',
    'getAdminWholesaleOrders',
    'getExtrinsicData',
    'robokassaCallback',
    'robokassaSuccess',
    'notifyNewLot',
    'getNewLotDiscount'
]);

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

function getTimestampMs(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (value instanceof Date) return value.getTime();

    if (typeof value === 'number') {
        return !isNaN(value) ? (value < 3000000000 ? value * 1000 : value) : 0;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;

        const numeric = Number(trimmed);
        if (!isNaN(numeric)) return numeric < 3000000000 ? numeric * 1000 : numeric;

        const parsed = new Date(trimmed).getTime();
        return isNaN(parsed) ? 0 : parsed;
    }

    if (typeof value === 'object' && value.value !== undefined) {
        return getTimestampMs(value.value);
    }

    return 0;
}

function getPvzDeadlineMs(createdAtValue) {
    const createdAtMs = getTimestampMs(createdAtValue);
    if (!createdAtMs) return 0;

    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });

    const parts = formatter.formatToParts(new Date(createdAtMs));
    const getPart = (type) => Number(parts.find(p => p.type === type)?.value || 0);

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const daysToAdd = hour < 18 ? 1 : 2;

    return Date.UTC(year, month - 1, day + daysToAdd, 15, 0, 0);
}

function createUtcDate(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function formatCbrRequestDate(date) {
    const value = date instanceof Date ? date : new Date(date);
    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const year = value.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

function parseCbrRecordDate(value) {
    const match = String(value || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    return createUtcDate(Number(match[3]), Number(match[2]), Number(match[1]));
}

function formatRuDisplayDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function parseCbrDynamicXml(xmlText) {
    const source = String(xmlText || '');
    const records = [];
    const regex = /<Record\b[^>]*Date="([^"]+)"[^>]*>[\s\S]*?<Value>([^<]+)<\/Value>[\s\S]*?<\/Record>/gi;
    let match;

    while ((match = regex.exec(source))) {
        const date = parseCbrRecordDate(match[1]);
        const value = Number(String(match[2] || '').replace(',', '.').trim());
        if (!date || !Number.isFinite(value)) continue;
        records.push({
            date,
            dateText: formatRuDisplayDate(date),
            value
        });
    }

    records.sort((a, b) => a.date.getTime() - b.date.getTime());
    return records;
}

function findHistoricalCbrRecord(records, targetDate) {
    if (!Array.isArray(records) || !records.length || !(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
        return null;
    }

    const targetMs = targetDate.getTime();
    let bestPast = null;
    let bestFuture = null;

    records.forEach(record => {
        const recordMs = record.date.getTime();
        if (recordMs <= targetMs) {
            if (!bestPast || recordMs > bestPast.date.getTime()) bestPast = record;
        } else if (!bestFuture || recordMs < bestFuture.date.getTime()) {
            bestFuture = record;
        }
    });

    return bestPast || bestFuture || null;
}

async function fetchUsdAnalytics(daysBack = 60) {
    const normalizedDaysBack = Math.max(1, Math.min(366, parseInt(daysBack, 10) || 60));
    const today = new Date();
    const endDate = createUtcDate(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
    const targetDate = new Date(endDate.getTime() - (normalizedDaysBack * 24 * 60 * 60 * 1000));
    const startDate = new Date(targetDate.getTime() - (10 * 24 * 60 * 60 * 1000));
    const requestUrl = `https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${formatCbrRequestDate(startDate)}&date_req2=${formatCbrRequestDate(endDate)}&VAL_NM_RQ=${CBR_USD_VALUTE_ID}`;

    try {
        const response = await fetch(requestUrl, {
            headers: { 'Accept': 'application/xml, text/xml;q=0.9, */*;q=0.1' }
        });
        if (!response.ok) throw new Error(`Не удалось получить динамику USD от ЦБ (${response.status})`);

        const xmlText = await response.text();
        const records = parseCbrDynamicXml(xmlText);
        if (!records.length) throw new Error('ЦБ не вернул данные по динамике USD');

        const currentRecord = records[records.length - 1];
        const previousRecord = records.length > 1 ? records[records.length - 2] : currentRecord;
        const historicalRecord = findHistoricalCbrRecord(records, targetDate) || currentRecord;
        const daySpan = Math.round((currentRecord.date.getTime() - historicalRecord.date.getTime()) / (24 * 60 * 60 * 1000));
        const trendPercent = historicalRecord.value
            ? (((currentRecord.value - historicalRecord.value) / historicalRecord.value) * 100)
            : 0;

        return {
            currentRate: currentRecord.value,
            currentDate: currentRecord.dateText,
            previousRate: previousRecord.value,
            previousDate: previousRecord.dateText,
            historicalRate: historicalRecord.value,
            historicalDate: historicalRecord.dateText,
            historicalDaysBackActual: daySpan,
            requestedDaysBack: normalizedDaysBack,
            trendPercent,
            source: 'cbr.ru/XML_dynamic'
        };
    } catch (primaryError) {
        logDebug('Primary CBR API failed, trying fallback 1:', primaryError.message);
        
        try {
            // Резервный источник 1: Зеркало ЦБ РФ
            const fallbackResponse = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
            if (!fallbackResponse.ok) throw new Error('Fallback API 1 failed');
            const data = await fallbackResponse.json();
            
            const usdData = data.Valute.USD;
            if (!usdData || !usdData.Value) throw new Error('No USD data in fallback API 1');
            
            const currentRate = usdData.Value;
            const previousRate = usdData.Previous || currentRate;
            const dateObj = new Date(data.Date);
            const dateText = formatRuDisplayDate(dateObj);
            
            return {
                currentRate: currentRate,
                currentDate: dateText,
                previousRate: previousRate,
                previousDate: dateText,
                historicalRate: previousRate, 
                historicalDate: dateText,
                historicalDaysBackActual: 1,
                requestedDaysBack: normalizedDaysBack,
                trendPercent: ((currentRate - previousRate) / previousRate) * 100,
                source: 'cbr-xml-daily.ru (fallback)'
            };
        } catch (fallbackError) {
            logDebug('Fallback API 1 failed, trying fallback 2:', fallbackError.message);
            
            try {
                // Резервный источник 2: Международный открытый API
                const fallback2Response = await fetch('https://open.er-api.com/v6/latest/USD');
                if (!fallback2Response.ok) throw new Error('Fallback API 2 failed');
                const data2 = await fallback2Response.json();
                
                if (!data2 || !data2.rates || !data2.rates.RUB) throw new Error('No RUB rate in fallback API 2');
                
                const currentRate = data2.rates.RUB;
                const dateText = formatRuDisplayDate(new Date());
                
                return {
                    currentRate: currentRate,
                    currentDate: dateText,
                    previousRate: currentRate,
                    previousDate: dateText,
                    historicalRate: currentRate,
                    historicalDate: dateText,
                    historicalDaysBackActual: 0,
                    requestedDaysBack: normalizedDaysBack,
                    trendPercent: 0,
                    source: 'open.er-api.com (fallback 2)'
                };
            } catch (fallback2Error) {
                logDebug('All fallback APIs failed:', fallback2Error.message);
                throw new Error('Критическая ошибка: невозможно получить курс валют ни из одного источника.');
            }
        }
    }
}

async function syncRetailHistoryStatus(session, userId, orderId, patch) {
    if (!userId || !orderId) return false;

    const qFindHist = `DECLARE $userId AS Utf8; SELECT history FROM users WHERE id = $userId;`;
    const { resultSets } = await session.executeQuery(qFindHist, { '$userId': TypedValues.utf8(userId) });

    if (!resultSets[0] || resultSets[0].rows.length === 0) return false;

    const userRow = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
    const history = getRawArray(userRow.history);
    let changed = false;

    const nextHistory = history.map(item => {
        if (item && String(item.orderId || '') === String(orderId)) {
            changed = true;
            return { ...item, ...patch };
        }
        return item;
    });

    if (!changed) return false;

    const qUpdateHist = `DECLARE $userId AS Utf8; DECLARE $hist AS JsonDocument; UPDATE users SET history = $hist WHERE id = $userId;`;
    await session.executeQuery(qUpdateHist, {
        '$userId': TypedValues.utf8(userId),
        '$hist': TypedValues.jsonDocument(JSON.stringify(nextHistory))
    });

    return true;
}

function matchesRobokassaSignature(outSum, invId, sig, password) {
    if (!outSum || !invId || !sig || !password) return false;
    const expected = crypto.createHash('md5').update(`${outSum}:${invId}:${password}`).digest('hex').toUpperCase();
    return String(sig).toUpperCase() === expected;
}

async function finalizeRetailPayment(session, invId) {
    const orderId = String(invId);
    const qFindOrder = `DECLARE $id AS Utf8; SELECT userId, total, delivery, items, createdAt, customer, status FROM orders WHERE id = $id;`;
    const { resultSets: ordRes } = await session.executeQuery(qFindOrder, { '$id': TypedValues.utf8(orderId) });

    if (!ordRes[0] || ordRes[0].rows.length === 0) {
        return { found: false, orderId };
    }

    const ord = rowToObj(ordRes[0].columns, ordRes[0].rows[0]);
    if (ord.status !== 'paid') {
        const qUpdOrder = `DECLARE $id AS Utf8; UPDATE orders SET status = 'paid' WHERE id = $id;`;
        await session.executeQuery(qUpdOrder, { '$id': TypedValues.utf8(orderId) });
        ord.status = 'paid';
    }

    const userId = ord.userid;
    let deliveryCost = 0;
    let delData = {};
    try {
        let rawDel = ord.delivery;
        if (rawDel && rawDel.value !== undefined) rawDel = rawDel.value;
        if (Buffer.isBuffer(rawDel)) rawDel = rawDel.toString('utf8');
        delData = typeof rawDel === 'string' ? JSON.parse(rawDel) : (rawDel || {});
        deliveryCost = Number(delData.finalCost) || 0;
    } catch (e) {
        logDebug('Ошибка парсинга delivery:', e.message);
    }

    const productTotal = Number(ord.total) - deliveryCost;
    let hasOrderInHistory = false;

    if (userId) {
        const qFindHist = `DECLARE $userId AS Utf8; SELECT history FROM users WHERE id = $userId;`;
        const { resultSets: uRes } = await session.executeQuery(qFindHist, { '$userId': TypedValues.utf8(userId) });

        let hist = [];
        if (uRes[0] && uRes[0].rows.length > 0) {
            const uRow = rowToObj(uRes[0].columns, uRes[0].rows[0]);
            hist = getRawArray(uRow.history);
        }

        let parsedItems = [];
        try {
            let rawI = ord.items;
            if (rawI && rawI.value !== undefined) rawI = rawI.value;
            if (Buffer.isBuffer(rawI)) rawI = rawI.toString('utf8');
            parsedItems = typeof rawI === 'string' ? JSON.parse(rawI) : (rawI || []);
        } catch (e) {}
        const articleAccessRecords = collectArticleAccessRecords(parsedItems);

        let d = new Date(getTimestampMs(ord.createdat));
        if (isNaN(d.getTime())) d = new Date();
        const datePart = d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' });
        const timePart = d.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });

        const hadPaidRetailOrderBefore = hist.some(item => item && item.isOrder && item.status !== 'pending_payment');
        const newHistItem = {
            isOrder: true,
            orderId: orderId,
            status: 'paid',
            createdAt: ord.createdat,
            date: datePart + ' ' + timePart,
            total: ord.total,
            items: parsedItems,
            delivery: delData
        };

        hasOrderInHistory = hist.some(item => item && String(item.orderId || '') === orderId);
        if (!hasOrderInHistory) hist.push(newHistItem);

        if (!hasOrderInHistory && !hadPaidRetailOrderBefore && hasSystemHistoryEntry(hist, WELCOME_BONUS_AVAILABLE_KEY)) {
            hist = removeSystemHistoryEntry(hist, WELCOME_BONUS_AVAILABLE_KEY);
            hist = upsertSystemHistoryEntry(hist, WELCOME_BONUS_USED_KEY, {
                usedAt: new Date().toISOString(),
                orderId
            });
        }

        if (!hasOrderInHistory) {
            const emptyCart = JSON.stringify([]);
            const qUpdHist = `DECLARE $userId AS Utf8; DECLARE $hist AS JsonDocument; DECLARE $cart AS JsonDocument; DECLARE $spent AS Double; UPDATE users SET history = $hist, cart = $cart, totalSpent = totalSpent + $spent WHERE id = $userId;`;
            await session.executeQuery(qUpdHist, {
                '$userId': TypedValues.utf8(userId),
                '$hist': TypedValues.jsonDocument(JSON.stringify(hist)),
                '$cart': TypedValues.jsonDocument(emptyCart),
                '$spent': TypedValues.double(productTotal > 0 ? productTotal : 0)
            });
        }

        let customerData = {};
        try {
            let rawCust = ord.customer;
            if (rawCust && rawCust.value !== undefined) rawCust = rawCust.value;
            if (Buffer.isBuffer(rawCust)) rawCust = rawCust.toString('utf8');
            customerData = typeof rawCust === 'string' ? JSON.parse(rawCust) : (rawCust || {});
        } catch (e) {}

        const pricingBreakdown = customerData && typeof customerData.pricingBreakdown === 'object' && customerData.pricingBreakdown
            ? customerData.pricingBreakdown
            : {};
        const customerEmail = customerData.email;
        if (!hasOrderInHistory) {
            try {
                const calendarResult = await createRetailOrderCalendarEvent({
                    orderId,
                    createdAt: ord.createdat,
                    customer: customerData,
                    items: parsedItems,
                    delivery: delData,
                    deliveryCost,
                    pricingBreakdown,
                    total: Number(ord.total) || 0
                });
                if (calendarResult && calendarResult.success) {
                    logDebug(`Google Calendar: order ${orderId} synced as event ${calendarResult.eventId}`);
                } else if (calendarResult && calendarResult.skipped) {
                    logDebug(`Google Calendar: order ${orderId} skipped (${calendarResult.reason})`);
                }
            } catch (calendarErr) {
                console.error(`Google Calendar sync failed for order ${orderId}:`, calendarErr.message);
            }
        }
        if (!hasOrderInHistory && customerEmail && process.env.SMTP_PASSWORD) {
            let itemsHtmlList = '';
            parsedItems.forEach(i => {
                const metaParts = [];
                if (i.weight) metaParts.push(`${i.weight}г`);
                if (i.grind) metaParts.push(i.grind);
                const metaText = metaParts.length ? ` (${metaParts.join(', ')})` : '';
                itemsHtmlList += `<li style="margin-bottom: 5px;"><b>${i.item}</b>${metaText} x ${i.qty} шт. — <b>${i.price * i.qty} ₽</b></li>`;
            });

            let deliveryText = 'Уточняется';
            if (delData.type === 'PICKUP') deliveryText = `Самовывоз (ТЦ Атолл, код: <b>${delData.code || ''}</b>)`;
            else if (delData.city) deliveryText = `${delData.type === 'PVZ' ? 'СДЭК ПВЗ' : 'Курьер/Адрес'}: ${delData.city}${delData.address ? ', ' + delData.address : ''}`;
            else if (delData.type === 'DIGITAL') deliveryText = 'Цифровой доступ к статье';
            const baseSubtotal = Number(pricingBreakdown.subtotal) || parsedItems.reduce((sum, item) => {
                return sum + ((Number(item?.price) || 0) * (Number(item?.qty) || 0));
            }, 0);
            const loyaltyPercent = Number(pricingBreakdown.loyaltyPercent) || 0;
            const loyaltyDiscountVal = Number(pricingBreakdown.loyaltyDiscountVal) || 0;
            const welcomeBonusPercent = Number(pricingBreakdown.welcomeBonusPercent) || 0;
            const welcomeDiscountVal = Number(pricingBreakdown.welcomeDiscountVal) || 0;
            const fortuneDiscountPercent = Number(pricingBreakdown.fortuneDiscountPercent) || 0;
            const fortuneDiscountVal = Number(pricingBreakdown.fortuneDiscountVal) || 0;
            const promoCode = String(pricingBreakdown.promoCode || '').trim();
            const promoType = String(pricingBreakdown.promoType || '').trim();
            const promoValue = Number(pricingBreakdown.promoValue) || 0;
            const promoDiscountVal = Number(pricingBreakdown.promoDiscountVal) || 0;
            const newLotDiscountVal = Number(pricingBreakdown.newLotDiscountVal) || 0;
            const totalDiscountVal = Number(pricingBreakdown.totalDiscountVal) || (loyaltyDiscountVal + welcomeDiscountVal + fortuneDiscountVal + promoDiscountVal + newLotDiscountVal);
            
            if (newLotDiscountVal > 0 && pricingBreakdown.newLotSampleName) {
                hist = upsertSystemHistoryEntry(hist, 'NEW_LOT_DISCOUNT_USED', {
                    sampleName: pricingBreakdown.newLotSampleName,
                    orderId
                });
            }
            const finalTotal = Number(pricingBreakdown.finalTotal) || Number(ord.total) || 0;
            const pricingRows = [
                `<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px;"><span>Цена товаров без скидок</span><b>${baseSubtotal} ₽</b></div>`
            ];
            if (loyaltyDiscountVal > 0) pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; color:#187a30;"><span>Скидка лояльности${loyaltyPercent > 0 ? ` (${loyaltyPercent}%)` : ''}</span><b>- ${loyaltyDiscountVal} ₽</b></div>`);
            if (welcomeDiscountVal > 0) pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; color:#187a30;"><span>Приветственная скидка${welcomeBonusPercent > 0 ? ` (${welcomeBonusPercent}%)` : ''}</span><b>- ${welcomeDiscountVal} ₽</b></div>`);
            if (fortuneDiscountVal > 0) pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; color:#B8860B;"><span>Скидка удачи${fortuneDiscountPercent > 0 ? ` (${fortuneDiscountPercent}%)` : ''}</span><b>- ${fortuneDiscountVal} ₽</b></div>`);
            if (promoDiscountVal > 0) {
                const promoLabel = promoCode
                    ? `Промокод ${promoCode}${promoType === 'percent' && promoValue > 0 ? ` (${promoValue}%)` : promoType === 'fixed' && promoValue > 0 ? ` (${promoValue} ₽)` : ''}`
                    : 'Промокод';
                pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; color:#187a30;"><span>${promoLabel}</span><b>- ${promoDiscountVal} ₽</b></div>`);
            }
            if (newLotDiscountVal > 0) pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; color:#187a30;"><span>Скидка на новинку</span><b>- ${newLotDiscountVal} ₽</b></div>`);
            if (totalDiscountVal > 0) pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px;"><span>Общая сумма скидок</span><b>- ${totalDiscountVal} ₽</b></div>`);
            pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:6px;"><span>Доставка</span><b>${deliveryCost} ₽</b></div>`);
            pricingRows.push(`<div style="display:flex; justify-content:space-between; gap:12px; margin-top:10px; padding-top:10px; border-top:1px dashed #ccc; font-size:18px;"><span>Итого оплачено</span><b>${finalTotal} ₽</b></div>`);
            const pricingHtml = `
                <div style="background: #fff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #8B7E66;">Расшифровка цены:</h4>
                    ${pricingRows.join('')}
                </div>
            `;
            const articleAccessHtml = articleAccessRecords.length ? `
                <div style="background: #fff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #8B7E66;">Доступ к статьям на 1 месяц:</h4>
                    <ul style="padding-left: 20px; margin: 0;">
                        ${articleAccessRecords.map(access => `<li style="margin-bottom: 8px;"><b>${access.title}</b><br>Пароль: <b>${access.password}</b><br>Доступ до: <b>${new Date(access.expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</b></li>`).join('')}
                    </ul>
                </div>
            ` : '';

            await sendTransactionalMail({
                from: '"Locus Coffee" <info@locus.coffee>',
                to: customerEmail,
                bcc: 'info@locus.coffee',
                subject: `Заказ №${orderId} успешно оплачен | Locus Coffee`,
                html: `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #E5E1D8; border-radius: 8px; overflow: hidden;">
                        <div style="background: #693a05; padding: 20px; text-align: center; color: #fff;">
                            <h2 style="margin: 0; letter-spacing: 2px;">LOCUS COFFEE</h2>
                        </div>
                        <div style="padding: 20px; background: #F4F1EA;">
                            <h3 style="margin-top: 0;">Здравствуйте, ${customerData.name || 'дорогой клиент'}!</h3>
                            <p>Ваш заказ <b>№${orderId}</b> от ${datePart} ${timePart} успешно оплачен и передан на сборку.</p>
                            <div style="background: #fff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <h4 style="margin-top: 0; color: #8B7E66;">Состав заказа:</h4>
                                <ul style="padding-left: 20px; margin: 0;">${itemsHtmlList}</ul>
                                <hr style="border: none; border-top: 1px dashed #ccc; margin: 15px 0;">
                                <p style="margin: 0;"><b>Доставка:</b> ${deliveryText} (${deliveryCost} ₽)</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px;"><b>Итого оплачено: ${ord.total} ₽</b></p>
                            </div>
                            ${pricingHtml}
                            ${articleAccessHtml}
                        </div>
                    </div>`
            });
        }
    }

    return { found: true, orderId, status: 'paid', historyUpdated: !hasOrderInHistory };
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

        let body = {};
        if (bodyString) {
            try {
                body = JSON.parse(bodyString);
            } catch (parseError) {
                try {
                    body = Object.fromEntries(new URLSearchParams(bodyString).entries());
                } catch (formError) {
                    console.error('Body parse error:', parseError.message);
                    if (DEBUG_LOGS_ENABLED && parseError?.stack) console.error(parseError.stack);
                    throw parseError;
                }
            }
        }
        const action = event.queryStringParameters?.action || body.action;
        
        const rawToken = event.headers?.['x-auth-token'] || event.headers?.['X-Auth-Token'];

        let responseData = {};

        const runWithSession = RETRYABLE_SESSION_ACTIONS.has(action) ? withSessionRetry : withSingleSession;

        await runWithSession(async (session) => {
            
            if (action === 'register') {
                const { email, password } = body;
                const rawEmail = String(email || '').trim();
                const normalizedEmail = normalizeEmailAddress(rawEmail);
                if (!normalizedEmail || !password) throw new Error('Email и пароль обязательны');
                if (!isValidEmailAddress(normalizedEmail)) throw new Error('Укажите корректный email в формате name@example.com');

                const passwordError = getRegistrationPasswordError(password);
                if (passwordError) throw new Error(passwordError);

                const checkQuery = `DECLARE $email AS Utf8; DECLARE $rawEmail AS Utf8; SELECT * FROM users WHERE email = $email OR email = $rawEmail;`;
                const { resultSets: checkRes } = await session.executeQuery(checkQuery, {
                    '$email': TypedValues.utf8(normalizedEmail),
                    '$rawEmail': TypedValues.utf8(rawEmail)
                });
                const existingUsers = (checkRes[0]?.rows || []).map(row => rowToObj(checkRes[0].columns, row));
                if (existingUsers.some(user => normalizeEmailAddress(user.email) === normalizedEmail)) {
                    throw new Error('Пользователь с таким email уже существует');
                }

                const userId = uuidv4();
                const hash = bcrypt.hashSync(password, 10); 
                const initialHistory = [
                    createSystemHistoryEntry(WELCOME_POPUP_PENDING_KEY),
                    createSystemHistoryEntry(WELCOME_BONUS_AVAILABLE_KEY)
                ];
                const emptyArr = JSON.stringify([]);
                const initialHistoryJson = JSON.stringify(initialHistory);

                const insertQuery = `
                    DECLARE $id AS Utf8; DECLARE $email AS Utf8; DECLARE $hash AS Utf8;
                    DECLARE $role AS Utf8; DECLARE $cart AS JsonDocument;
                    DECLARE $history AS JsonDocument; DECLARE $sub AS JsonDocument;

                    INSERT INTO users (id, email, password_hash, role, totalSpent, cart, history, subscription)
                    VALUES ($id, $email, $hash, $role, 0, $cart, $history, $sub);
                `;
                await session.executeQuery(insertQuery, {
                    '$id': TypedValues.utf8(userId), '$email': TypedValues.utf8(normalizedEmail),
                    '$hash': TypedValues.utf8(hash), '$role': TypedValues.utf8(normalizedEmail === 'info@locus.coffee' ? 'admin' : 'user'), 
                    '$cart': TypedValues.jsonDocument(emptyArr), '$history': TypedValues.jsonDocument(initialHistoryJson), '$sub': TypedValues.jsonDocument(emptyArr)
                });

                const token = jwt.sign({ userId, email: normalizedEmail }, JWT_SECRET, { expiresIn: '30d' });
                responseData = { success: true, token, user: { id: userId, email: normalizedEmail, totalSpent: 0, cart: [], history: initialHistory, subscription: [] } };

                await sendRegistrationWelcomeEmail(normalizedEmail);
            }
            
            else if (action === 'login') {
                const { email, password } = body;
                const rawEmail = String(email || '').trim();
                const normalizedEmail = normalizeEmailAddress(rawEmail);
                if (!normalizedEmail || !password) throw new Error('Email и пароль обязательны');
                const loginQuery = `DECLARE $email AS Utf8; DECLARE $rawEmail AS Utf8; SELECT * FROM users WHERE email = $email OR email = $rawEmail;`;
                const { resultSets } = await session.executeQuery(loginQuery, {
                    '$email': TypedValues.utf8(normalizedEmail),
                    '$rawEmail': TypedValues.utf8(rawEmail)
                });

                if (resultSets[0].rows.length === 0) throw new Error('Неверный email или пароль');
                
                const users = resultSets[0].rows.map(row => rowToObj(resultSets[0].columns, row));
                const user = users.find(item => normalizeEmailAddress(item.email) === normalizedEmail) || users[0];
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

            else if (action === 'requestPasswordReset') {
                const normalizedEmail = normalizeEmailAddress(body.email);
                responseData = { success: true, message: 'Если аккаунт с таким email существует, ссылка для восстановления уже отправлена на почту.' };

                if (!normalizedEmail || !isValidEmailAddress(normalizedEmail)) return;

                const query = `DECLARE $email AS Utf8; SELECT id, email, password_hash FROM users WHERE email = $email;`;
                const { resultSets } = await session.executeQuery(query, { '$email': TypedValues.utf8(normalizedEmail) });
                if (!resultSets[0] || resultSets[0].rows.length === 0) return;

                const user = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                const pwdHash = user.passwordhash || user.password_hash;
                if (!user.id || !user.email || !pwdHash) return;

                const token = createPasswordResetToken(user.id, user.email, pwdHash);
                const resetUrl = buildPasswordResetUrl(token);
                await sendPasswordResetEmail(normalizeEmailAddress(user.email), resetUrl);
            }

            else if (action === 'resetPassword') {
                const resetToken = String(body.token || '').trim();
                const nextPassword = typeof body.password === 'string' ? body.password : '';
                const passwordError = getRegistrationPasswordError(nextPassword);
                if (!resetToken) throw new Error('Ссылка для восстановления не найдена или уже недействительна');
                if (passwordError) throw new Error(passwordError);

                const decoded = jwt.decode(resetToken);
                if (!decoded || decoded.purpose !== PASSWORD_RESET_PURPOSE || !decoded.userId) {
                    throw new Error('Ссылка для восстановления недействительна или уже устарела');
                }

                const query = `DECLARE $id AS Utf8; SELECT id, email, password_hash FROM users WHERE id = $id;`;
                const { resultSets } = await session.executeQuery(query, { '$id': TypedValues.utf8(String(decoded.userId)) });
                if (!resultSets[0] || resultSets[0].rows.length === 0) {
                    throw new Error('Ссылка для восстановления недействительна или уже устарела');
                }

                const user = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                const currentHash = user.passwordhash || user.password_hash;
                if (!currentHash) throw new Error('Ссылка для восстановления недействительна или уже устарела');

                try {
                    jwt.verify(resetToken, `${JWT_SECRET}:${currentHash}`);
                } catch (e) {
                    throw new Error('Ссылка для восстановления недействительна или уже устарела');
                }

                const nextHash = bcrypt.hashSync(nextPassword, 10);
                const updateQuery = `DECLARE $id AS Utf8; DECLARE $hash AS Utf8; UPDATE users SET password_hash = $hash WHERE id = $id;`;
                await session.executeQuery(updateQuery, {
                    '$id': TypedValues.utf8(String(user.id)),
                    '$hash': TypedValues.utf8(nextHash)
                });

                responseData = { success: true, email: normalizeEmailAddress(user.email) };
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

            else if (action === 'dismissWelcomePopup') {
                const decoded = verifyToken(rawToken);
                const query = `DECLARE $id AS Utf8; SELECT history FROM users WHERE id = $id;`;
                const { resultSets } = await session.executeQuery(query, { '$id': TypedValues.utf8(decoded.userId) });
                if (!resultSets[0] || resultSets[0].rows.length === 0) throw new Error('Пользователь не найден');

                const user = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                let history = getRawArray(user.history);
                history = removeSystemHistoryEntry(history, WELCOME_POPUP_PENDING_KEY);
                history = upsertSystemHistoryEntry(history, WELCOME_POPUP_DISMISSED_KEY, { dismissedAt: new Date().toISOString() });

                const updateQuery = `DECLARE $id AS Utf8; DECLARE $history AS JsonDocument; UPDATE users SET history = $history WHERE id = $id;`;
                await session.executeQuery(updateQuery, {
                    '$id': TypedValues.utf8(decoded.userId),
                    '$history': TypedValues.jsonDocument(JSON.stringify(history))
                });
                responseData = { success: true };
            }

            else if (action === 'unlockArticle') {
                const decoded = verifyToken(rawToken);
                const articleId = String(body.articleId || '').trim();
                const password = String(body.password || '');
                if (!articleId) throw new Error('Не указан идентификатор статьи');
                const isAdminArticleRead = String(decoded.email || '').toLowerCase() === 'info@locus.coffee';
                let access = null;
                if (!isAdminArticleRead) {
                    if (!password) throw new Error('Введите пароль из письма');

                    const query = `DECLARE $id AS Utf8; SELECT history FROM users WHERE id = $id;`;
                    const { resultSets } = await session.executeQuery(query, { '$id': TypedValues.utf8(decoded.userId) });
                    if (!resultSets[0] || resultSets[0].rows.length === 0) throw new Error('Пользователь не найден');

                    const user = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                    access = getActiveArticleAccessFromHistory(user.history, articleId);
                    if (!access) throw new Error('Доступ к статье не найден или уже истек');
                    if (!bcrypt.compareSync(password, access.passwordHash || '')) throw new Error('Неверный пароль для статьи');
                }

                const catalog = await fetchCatalogProducts();
                const product = catalog.find(item => String(item.id || '').trim() === articleId || String(item.sample_no || item.sample || '').trim() === articleId);
                if (!product) throw new Error('Статья не найдена в каталоге');

                const articlePayload = parseArticlePayload(product.custom_desc || product.customDesc);
                if (!articlePayload) throw new Error('Полный текст статьи еще не опубликован');

                responseData = {
                    success: true,
                    article: {
                        id: String(product.id || articleId),
                        title: String(product.sample_no || product.sample || access?.title || ''),
                        html: decryptArticleHtml(articlePayload.encryptedBody),
                        expiresAt: isAdminArticleRead ? '2099-12-31T20:59:00.000Z' : access.expiresAt
                    }
                };
            }

            else if (action === 'saveArticleLot') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');

                const updatedData = body && typeof body.updatedData === 'object' ? { ...body.updatedData } : null;
                if (!updatedData || !updatedData.id) throw new Error('Не переданы данные статьи');

                updatedData.customDesc = buildArticlePayload(body.previewHtml || '', body.bodyHtml || '');
                await proxyCatalogEdit(updatedData);
                responseData = { success: true };
            }

            else if (action === 'getArticleLotEditorData') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');

                const articleId = String(body.id || body.articleId || '').trim();
                if (!articleId) throw new Error('Не указан ID статьи');

                const catalog = await fetchCatalogProducts();
                const product = findCatalogProductById(catalog, articleId);
                if (!product) throw new Error('Статья не найдена в каталоге');

                const rawCustomDesc = String(product.custom_desc || product.customDesc || '');
                const articlePayload = parseArticlePayload(rawCustomDesc);

                responseData = {
                    success: true,
                    lot: {
                        id: String(product.id || articleId),
                        title: String(product.sample_no || product.sample || ''),
                        previewHtml: articlePayload ? String(articlePayload.previewHtml || '') : rawCustomDesc,
                        bodyHtml: articlePayload ? decryptArticleHtml(articlePayload.encryptedBody) : '',
                        hasEncryptedBody: !!articlePayload
                    }
                };
            }

            else if (action === 'getMyOrderStatus') {
                const decoded = verifyToken(rawToken);
                const orderId = body.orderId || event.queryStringParameters?.orderId;
                if (!orderId) throw new Error('Не указан ID заказа');

                const query = `
                    DECLARE $id AS Utf8;
                    DECLARE $userId AS Utf8;
                    SELECT id, status, createdAt
                    FROM orders
                    WHERE id = $id AND userId = $userId;
                `;
                const { resultSets } = await session.executeQuery(query, {
                    '$id': TypedValues.utf8(String(orderId)),
                    '$userId': TypedValues.utf8(String(decoded.userId))
                });

                if (!resultSets[0] || resultSets[0].rows.length === 0) {
                    responseData = { success: true, found: false };
                } else {
                    const order = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                    responseData = {
                        success: true,
                        found: true,
                        order: {
                            id: order.id,
                            status: order.status,
                            createdAt: order.createdat
                        }
                    };
                }
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
                const paymentDescription = encodeURIComponent(`Оплата заказа Locus Coffee №${String(order.id || invIdStr).replace(/^ws_/, '')}`);
                const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=LocusCoffee&OutSum=${outSum}&InvId=${invIdStr}&Description=${paymentDescription}&SignatureValue=${sigVal}&Email=${order.customer.email}`;

                responseData = { success: true, paymentUrl: paymentUrl };
            }

            // --- НАЧАЛО: WEBHOOK ОТ ROBOKASSA ---
            else if (action === 'robokassaCallback' || action === 'robokassaSuccess') {
                const isWebhook = action === 'robokassaCallback';
                let params = { ...(event.queryStringParameters || {}), ...(body || {}) };

                if (!params.OutSum && event.body) {
                    try {
                        const bodyStr = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
                        const searchParams = new URLSearchParams(bodyStr);
                        params = { ...params, ...Object.fromEntries(searchParams.entries()) };
                    } catch (e) {}
                }

                const outSum = params.OutSum || params.outsum || params.out_sum || params.out_summ;
                const invId = params.InvId || params.invid || params.inv_id;
                const sig = params.SignatureValue || params.signaturevalue || params.signature_value;

                if (!outSum || !invId || !sig) {
                    responseData = isWebhook ? { _isWebhook: true, text: 'Bad Request' } : { success: false, error: 'Missing payment params' };
                    return;
                }

                const validWebhookSig = matchesRobokassaSignature(outSum, invId, sig, 'j4zmL54MKN0SZ7tRiufa');
                const validReturnSig = !isWebhook && matchesRobokassaSignature(outSum, invId, sig, 'VB3Js1HjXRqp5ahHe4p7');

                if (!validWebhookSig && !validReturnSig) {
                    responseData = isWebhook ? { _isWebhook: true, text: 'Bad signature' } : { success: false, error: 'Invalid payment signature' };
                    return;
                }

                try {
                    const finalizeResult = await finalizeRetailPayment(session, invId);
                    if (!finalizeResult.found) {
                        responseData = isWebhook ? { _isWebhook: true, text: 'Order not found' } : { success: false, error: 'Order not found' };
                        return;
                    }
                } catch (dbErr) {
                    console.error('КРИТИЧЕСКАЯ ОШИБКА БД:', dbErr.message);
                    if (DEBUG_LOGS_ENABLED && dbErr?.stack) console.error(dbErr.stack);
                    responseData = isWebhook ? { _isWebhook: true, text: 'Temporary DB error' } : { success: false, error: 'Temporary DB error' };
                    return;
                }

                responseData = isWebhook
                    ? { _isWebhook: true, text: `OK${invId}` }
                    : { success: true, orderId: String(invId), status: 'paid' };
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

            else if (action === 'deleteUser') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('\u0414\u043e\u0441\u0442\u0443\u043f \u0437\u0430\u043f\u0440\u0435\u0449\u0435\u043d');

                const userId = String(body.id || '').trim();
                if (!userId) throw new Error('\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d ID \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f');

                const findQuery = `DECLARE $id AS Utf8; SELECT id, email FROM users WHERE id = $id;`;
                const { resultSets } = await session.executeQuery(findQuery, {
                    '$id': TypedValues.utf8(userId)
                });

                if (!resultSets[0]?.rows?.length) throw new Error('\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d');

                const user = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                const normalizedUserEmail = normalizeEmailAddress(user.email);
                if (normalizedUserEmail === 'info@locus.coffee' || userId === String(decoded.userId || '')) {
                    throw new Error('\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430 \u0443\u0434\u0430\u043b\u044f\u0442\u044c \u043d\u0435\u043b\u044c\u0437\u044f');
                }

                const deleteQuery = `DECLARE $id AS Utf8; DELETE FROM users WHERE id = $id;`;
                await session.executeQuery(deleteQuery, {
                    '$id': TypedValues.utf8(userId)
                });

                responseData = { success: true };
            }

            else if (action === 'sendStickerPackEmail') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                if (!process.env.SMTP_PASSWORD) throw new Error('Почтовый сервер не настроен');

                const lotTitle = String(body.lotTitle || '').trim();
                const attachmentsInput = Array.isArray(body.attachments) ? body.attachments : [];
                if (!lotTitle) throw new Error('Не указано название лота');
                if (attachmentsInput.length === 0) throw new Error('Нет вложений с наклейками');

                const attachments = attachmentsInput.map((item, index) => {
                    const filename = String(item?.filename || '').trim();
                    const contentType = String(item?.contentType || '').trim().toLowerCase();
                    const contentBase64 = String(item?.contentBase64 || '').trim();

                    if (!filename) throw new Error(`У вложения №${index + 1} нет имени файла`);
                    if (contentType !== 'image/png') throw new Error(`Вложение №${index + 1} должно быть PNG`);
                    if (!contentBase64) throw new Error(`Вложение №${index + 1} пустое`);

                    return {
                        filename,
                        content: Buffer.from(contentBase64, 'base64'),
                        contentType: 'image/png'
                    };
                });

                const sent = await sendTransactionalMail({
                    from: '"Locus Coffee" <info@locus.coffee>',
                    to: 'info@locus.coffee',
                    subject: lotTitle,
                    text: `Во вложении наклейки для лота ${lotTitle} в разрешении 300 dpi.`,
                    attachments
                });

                if (!sent) throw new Error('Не удалось отправить письмо с наклейками');
                responseData = { success: true };
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
            
            else if (action === 'markAdminMessagesRead') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰РµРЅ');

                const qFindUnread = `SELECT id, direction, isRead, deletedByAdmin FROM messages;`;
                const { resultSets } = await session.executeQuery(qFindUnread);
                const unreadIds = [];

                if (resultSets[0] && resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const message = rowToObj(resultSets[0].columns, row);
                        if (message.direction === 'to_admin' && message.deletedbyadmin !== true && message.isread !== true) {
                            unreadIds.push(String(message.id));
                        }
                    });
                }

                for (const messageId of unreadIds) {
                    const qMarkRead = `DECLARE $id AS Utf8; UPDATE messages SET isRead = true WHERE id = $id;`;
                    await session.executeQuery(qMarkRead, { '$id': TypedValues.utf8(messageId) });
                }

                responseData = { success: true, updatedCount: unreadIds.length };
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
                const normalizedSubject = String(subject || 'Без темы');
                const normalizedText = String(text || '');
                const messageTimestamp = new Date().toISOString();

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
                if (direction === 'to_admin') {
                    const mailSent = await sendAdminInboxCopyEmail({
                        userEmail: finalEmail,
                        userId: finalUserId,
                        subject: normalizedSubject,
                        text: normalizedText,
                        timestamp: messageTimestamp
                    });
                    if (!mailSent) console.error('Не удалось отправить почтовую копию нового сообщения администратору');
                }
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
            
            else if (action === 'getUsdAnalytics') {
                const requestedDaysBack = event.queryStringParameters?.daysBack || body.daysBack;
                const analytics = await fetchUsdAnalytics(requestedDaysBack);
                responseData = { success: true, ...analytics };
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
                
                const query = `
                    SELECT id, userId, invId, total, status, customer, delivery, items, createdAt
                    FROM orders
                `;
                const { resultSets } = await session.executeQuery(query);
                
                let retailOrders = [];
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const o = rowToObj(resultSets[0].columns, row);
                        
                        // Фильтруем: берем розничные заказы, которые УЖЕ ОПЛАЧЕНЫ (исключаем pending_payment)
                        if (o.id && !o.id.startsWith('ws_')) {
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
                const normalizedOrderId = String(orderId || '').trim();
                const normalizedStatus = String(status || '').trim();
                if (!normalizedOrderId) throw new Error('Не указан ID заказа');
                if (!normalizedStatus) throw new Error('Не указан статус заказа');

                const isWholesaleOrder = normalizedOrderId.startsWith('ws_');
                const allowedStatuses = isWholesaleOrder
                    ? new Set(['wholesale_new', 'wholesale_processed', 'completed'])
                    : new Set(['pending_payment', 'paid', 'processing', 'shipped', 'completed', 'pvz_delivered']);

                if (!allowedStatuses.has(normalizedStatus)) {
                    throw new Error('Недопустимый статус заказа');
                }

                const qFindExistingOrder = `DECLARE $id AS Utf8; SELECT id, userId, createdAt FROM orders WHERE id = $id;`;
                const { resultSets: existingOrderRes } = await session.executeQuery(qFindExistingOrder, {
                    '$id': TypedValues.utf8(normalizedOrderId)
                });
                if (!existingOrderRes[0] || existingOrderRes[0].rows.length === 0) {
                    throw new Error('Заказ не найден');
                }
                const existingOrderRow = rowToObj(existingOrderRes[0].columns, existingOrderRes[0].rows[0]);

                const query = `DECLARE $id AS Utf8; DECLARE $status AS Utf8; UPDATE orders SET status = $status WHERE id = $id;`;
                await session.executeQuery(query, { 
                    '$id': TypedValues.utf8(normalizedOrderId),
                    '$status': TypedValues.utf8(normalizedStatus)
                });
                if (!isWholesaleOrder) {
                    await syncRetailHistoryStatus(session, existingOrderRow.userid, normalizedOrderId, {
                        status: normalizedStatus,
                        createdAt: existingOrderRow.createdat
                    });
                }
                responseData = { success: true, orderId: normalizedOrderId, status: normalizedStatus };
            }
            // --- НАЧАЛО: УДАЛЕНИЕ ЗАКАЗА (АДМИНКА) ---
            else if (action === 'autoDeliverPvzOrder') {
                const decoded = verifyToken(rawToken);
                const { orderId } = body;
                if (!orderId) throw new Error('Не указан ID заказа');

                const qFindOrder = `DECLARE $id AS Utf8; SELECT id, userId, status, delivery, createdAt FROM orders WHERE id = $id;`;
                const { resultSets: orderRes } = await session.executeQuery(qFindOrder, { '$id': TypedValues.utf8(orderId) });

                if (!orderRes[0] || orderRes[0].rows.length === 0) throw new Error('Заказ не найден');

                const orderRow = rowToObj(orderRes[0].columns, orderRes[0].rows[0]);
                if (String(orderRow.userid || '') !== String(decoded.userId || '')) throw new Error('Нет доступа к заказу');

                let deliveryData = {};
                try {
                    let rawDel = orderRow.delivery;
                    if (rawDel && rawDel.value !== undefined) rawDel = rawDel.value;
                    if (Buffer.isBuffer(rawDel)) rawDel = rawDel.toString('utf8');
                    deliveryData = typeof rawDel === 'string' ? JSON.parse(rawDel) : rawDel;
                } catch (e) {}

                if (deliveryData.type !== 'PICKUP') throw new Error('Таймер доступен только для локального самовывоза');

                if (['pvz_delivered', 'completed'].includes(orderRow.status)) {
                    responseData = { success: true };
                    return;
                }

                const deadlineMs = getPvzDeadlineMs(orderRow.createdat);
                if (!deadlineMs || Date.now() < deadlineMs) throw new Error('Срок заказа еще не истек');

                const qUpdateOrder = `DECLARE $id AS Utf8; UPDATE orders SET status = 'pvz_delivered' WHERE id = $id;`;
                await session.executeQuery(qUpdateOrder, { '$id': TypedValues.utf8(orderId) });
                await syncRetailHistoryStatus(session, orderRow.userid, orderId, {
                    status: 'pvz_delivered',
                    createdAt: orderRow.createdat
                });

                responseData = { success: true };
            }
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
                } catch(e) { logDebug('Ошибка парсинга ai_stories', e?.message || e); }

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

                // 2. ПРОСТОЙ И ЖЕСТКИЙ ПРОМПТ ДЛЯ КАРТИНКИ БЕЗ ФАНТАЗИЙ
                const normalizedCountryValue = String(country || '').trim();
                const countryParts = normalizedCountryValue
                    .split(',')
                    .map(part => part.trim())
                    .filter(Boolean)
                    .slice(0, 2);
                const singleCountryPrompt = (countryName) => (
                    `Photorealistic wild natural landscape of ${countryName}, native vegetation, realistic terrain, ` +
                    `coffee trees growing naturally in the environment, documentary nature photography, ` +
                    `natural daylight, natural colors, high detail, wide scenic composition.`
                );
                const dynamicImgPrompt = countryParts.length >= 2
                    ? (
                        `Photorealistic diagonal split composition. One half shows the wild natural landscape of ${countryParts[0]}, ` +
                        `with native vegetation, realistic terrain, and coffee trees growing naturally in the environment. ` +
                        `The other half shows the wild natural landscape of ${countryParts[1]}, with native vegetation, realistic terrain, ` +
                        `and coffee trees growing naturally in the environment. Documentary nature photography, natural daylight, ` +
                        `natural colors, high detail, clean diagonal composition.`
                    )
                    : singleCountryPrompt(countryParts[0] || 'the coffee origin country');
                const negativeImgPrompt = [
                    'animals',
                    'animal',
                    'birds',
                    'bird',
                    'wildlife',
                    'mammals',
                    'insects',
                    'people',
                    'person',
                    'human',
                    'workers',
                    'portrait',
                    'face',
                    'hands',
                    'roasted coffee beans',
                    'coffee beans scattered on the ground',
                    'coffee cherries piled on the ground',
                    'cup',
                    'cups',
                    'mug',
                    'bags',
                    'sacks',
                    'basket',
                    'buildings',
                    'house',
                    'houses',
                    'road',
                    'roads',
                    'car',
                    'cars',
                    'city',
                    'village',
                    'text',
                    'letters',
                    'logo',
                    'watermark',
                    'fantasy',
                    'surreal',
                    'sci-fi',
                    'illustration',
                    'painting',
                    'cartoon',
                    'blurry',
                    'low quality'
                ].join(', ');

                // 3. ГЕНЕРАЦИЯ УНИКАЛЬНОЙ КАРТИНКИ
                let imageUrl = '';
                try {
                    const randomSeed = Math.floor(Math.random() * 2147483647);
                    const finalImgPrompt = `${dynamicImgPrompt} Highly realistic, natural scene, realistic textures, no stylization.`;
                    
                    const imgReq = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${qwenKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'qwen-image-max',
                            input: {
                                messages: [
                                    { role: 'user', content: [{ text: finalImgPrompt }] }
                                ]
                            },
                            parameters: {
                                size: '1328*1328',
                                seed: randomSeed,
                                prompt_extend: true,
                                negative_prompt: negativeImgPrompt,
                                watermark: false
                            }
                        })
                    });
                    const imgTask = await imgReq.json();
                    
                    let tempAlibabaUrl = imgTask?.output?.choices?.[0]?.message?.content?.find(item => item?.image || item?.url)?.image
                        || imgTask?.output?.choices?.[0]?.message?.content?.find(item => item?.image || item?.url)?.url
                        || '';

                    if (false) {
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
                    } else if (false) {
                        const imgItem = imgTask.output.choices[0]?.message?.content?.find(item => item.image || item.url);
                        if (imgItem) tempAlibabaUrl = imgItem.image || imgItem.url || '';
                    }

                    if (!imgReq.ok || imgTask?.code || !tempAlibabaUrl) {
                        logDebug('Qwen-Image-Max response diagnostics:', {
                            httpStatus: imgReq.status,
                            code: imgTask?.code,
                            message: imgTask?.message,
                            hasImageUrl: !!tempAlibabaUrl
                        });
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
            // --- НАЧАЛО: РАССЫЛКА И СКИДКА НА НОВЫЙ ЛОТ ---
            // --- НАЧАЛО: РАССЫЛКА И СКИДКА НА НОВЫЙ ЛОТ ---
            else if (action === 'notifyNewLot') {
                const decoded = verifyToken(rawToken);
                if (decoded.email !== 'info@locus.coffee') throw new Error('Доступ запрещен');
                
                const sampleName = String(body.sampleName || '').trim();
                const flavorDesc = String(body.flavorDesc || '').trim();
                const flavorNotes = String(body.flavorNotes || '').trim();
                const category = String(body.category || '').trim();

                if (!sampleName) throw new Error('Не указано название лота');

                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                const saveQuery = `DECLARE $id AS Utf8; DECLARE $config AS JsonDocument; UPSERT INTO settings (id, config) VALUES ($id, $config);`;
                await session.executeQuery(saveQuery, {
                    '$id': TypedValues.utf8('new_lot_discount'),
                    '$config': TypedValues.jsonDocument(JSON.stringify({ sampleName, expiresAt }))
                });

                const usersQuery = `SELECT email, history FROM users;`;
                const { resultSets } = await session.executeQuery(usersQuery);
                const targetEmails = [];
                
                if (resultSets[0].rows.length > 0) {
                    resultSets[0].rows.forEach(row => {
                        const u = rowToObj(resultSets[0].columns, row);
                        const hist = getRawArray(u.history);
                        const notifyEntry = hist.find(h => h && h.isSystemMeta && h.systemType === 'NOTIFY_NEW_LOTS');
                        if (notifyEntry && notifyEntry.enabled && isValidEmailAddress(u.email)) {
                            targetEmails.push(u.email);
                        }
                    });
                }

                const formatter = new Intl.DateTimeFormat('ru-RU', {
                    timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const expiresText = formatter.format(new Date(expiresAt));

                let sentCount = 0;
                for (const email of targetEmails) {
                    const sent = await sendTransactionalMail({
                        from: '"Locus Coffee" <info@locus.coffee>',
                        to: email,
                        subject: `Новый сорт ${sampleName}`,
                        html: `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #E5E1D8; border-radius: 8px; overflow: hidden;">
                                <div style="background: #693a05; padding: 20px; text-align: center; color: #fff;">
                                    <h2 style="margin: 0; letter-spacing: 2px;">LOCUS COFFEE</h2>
                                </div>
                                <div style="padding: 20px; background: #F4F1EA;">
                                    <h3 style="margin-top: 0;">Здравствуйте!</h3>
                                    <p>Рады сообщить вам, что в нашем магазине новое поступление - <b>${sampleName}</b>.</p>
                                    <p>Попробуйте его непременно с приятной скидкой 10%.</p>
                                    <p>Скидка автоматически применяется в корзине при добавлении этого сорта и будет ждать вас до <b>${expiresText}</b>.</p>
                                    <p>Приятной покупки!</p>
                                </div>
                            </div>`
                    });
                    if (sent) sentCount++;
                }

                // Отправка письма администратору для публикации в соцсетях
                const adminMailText = `Друзья!\nНовое поступление в каталог кофе - ${sampleName}.\nВ букете: ${flavorDesc}\nНюансы: ${flavorNotes}\n${sampleName} отлично подойдет для приготовления в ${category}.\nРегистрируйтесь в ЛК на нашем сайте locus.coffee, получайте уведомления о новых лотах и приятные скидки, чтобы попробовать их одними из первых.\nХорошего дня и вкусного кофе!`;

                await sendTransactionalMail({
                    from: '"Locus Coffee" <info@locus.coffee>',
                    to: 'info@locus.coffee',
                    subject: `Описание ${sampleName}`,
                    text: adminMailText,
                    html: `<div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E5E1D8; border-radius: 8px; background: #F4F1EA;">
${adminMailText.replace(/\n/g, '<br>')}
</div>`
                });

                responseData = { success: true, sentCount };
            }
            
            else if (action === 'getNewLotDiscount') {
                const query = `SELECT config FROM settings WHERE id = 'new_lot_discount';`;
                const { resultSets } = await session.executeQuery(query);
                let config = null;
                if (resultSets[0] && resultSets[0].rows.length > 0) {
                    const row = rowToObj(resultSets[0].columns, resultSets[0].rows[0]);
                    let raw = row.config;
                    if (typeof raw === 'object' && raw !== null && raw.value !== undefined) raw = raw.value;
                    if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
                    try { config = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch(e) {}
                }
                
                if (config && config.expiresAt && new Date(config.expiresAt) > new Date()) {
                    responseData = { success: true, discount: config };
                } else {
                    responseData = { success: true, discount: null };
                }
            }
            // --- КОНЕЦ: РАССЫЛКА И СКИДКА НА НОВЫЙ ЛОТ ---
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
        console.error('Critical error:', error?.message || error);
        if (DEBUG_LOGS_ENABLED && error?.stack) console.error(error.stack);
        return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
    }
};
