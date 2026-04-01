const crypto = require('crypto');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_TIMEZONE = 'Europe/Moscow';
const GOOGLE_EVENT_DURATION_MS = 60 * 60 * 1000;

let googleTokenCache = {
    accessToken: '',
    expiresAt: 0
};

function base64UrlEncode(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function getGooglePrivateKey() {
    return String(process.env.GOOGLE_PRIVATE_KEY || '')
        .trim()
        .replace(/\\n/g, '\n');
}

function isGoogleCalendarConfigured() {
    return Boolean(
        String(process.env.GOOGLE_CLIENT_EMAIL || '').trim() &&
        String(process.env.GOOGLE_CALENDAR_ID || '').trim() &&
        getGooglePrivateKey()
    );
}

function signGoogleJwt(unsignedToken, privateKey) {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();
    return signer.sign(privateKey, 'base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

async function fetchGoogleAccessToken() {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (googleTokenCache.accessToken && googleTokenCache.expiresAt > nowSeconds + 60) {
        return googleTokenCache.accessToken;
    }

    const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL || '').trim();
    const privateKey = getGooglePrivateKey();
    if (!clientEmail || !privateKey) {
        throw new Error('Google Calendar env vars are not configured');
    }

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: clientEmail,
        scope: GOOGLE_CALENDAR_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        exp: nowSeconds + 3600,
        iat: nowSeconds
    };

    const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const signedToken = `${unsignedToken}.${signGoogleJwt(unsignedToken, privateKey)}`;

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: signedToken
        }).toString()
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
        throw new Error(data.error_description || data.error || 'Failed to get Google access token');
    }

    googleTokenCache = {
        accessToken: data.access_token,
        expiresAt: nowSeconds + (Number(data.expires_in) || 3600)
    };
    return googleTokenCache.accessToken;
}

function getMoscowParts(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: GOOGLE_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type) => Number(parts.find(part => part.type === type)?.value || 0);
    return {
        year: getPart('year'),
        month: getPart('month'),
        day: getPart('day'),
        hour: getPart('hour'),
        minute: getPart('minute'),
        second: getPart('second')
    };
}

function getTimestampMs(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (value instanceof Date) return value.getTime();

    if (typeof value === 'number') {
        return !Number.isNaN(value) ? (value < 3000000000 ? value * 1000 : value) : 0;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;

        const numeric = Number(trimmed);
        if (!Number.isNaN(numeric)) return numeric < 3000000000 ? numeric * 1000 : numeric;

        const parsed = new Date(trimmed).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (typeof value === 'object' && value.value !== undefined) {
        return getTimestampMs(value.value);
    }

    return 0;
}

function getCalendarEventWindow(createdAtValue) {
    const createdAtMs = getTimestampMs(createdAtValue);
    const sourceDate = createdAtMs ? new Date(createdAtMs) : new Date();
    const parts = getMoscowParts(sourceDate);
    const dayShift = parts.hour >= 18 ? 1 : 0;
    const startMs = Date.UTC(parts.year, parts.month - 1, parts.day + dayShift, 15, 0, 0);
    return {
        startIso: new Date(startMs).toISOString(),
        endIso: new Date(startMs + GOOGLE_EVENT_DURATION_MS).toISOString()
    };
}

function formatRub(value) {
    const amount = Number(value) || 0;
    return `${Math.round(amount)} RUB`;
}

function formatPercent(value) {
    const amount = Number(value) || 0;
    return Number.isInteger(amount) ? `${amount}%` : `${amount.toFixed(1)}%`;
}

function buildItemLine(item) {
    const meta = [];
    if (item?.weight) meta.push(`${item.weight}g`);
    if (item?.grind) meta.push(String(item.grind));
    const suffix = meta.length ? ` (${meta.join(', ')})` : '';
    const qty = Number(item?.qty) || 0;
    const total = (Number(item?.price) || 0) * qty;
    return `- ${String(item?.item || 'Item')}${suffix} x ${qty} = ${formatRub(total)}`;
}

function buildDeliveryLine(delivery = {}) {
    if (delivery.type === 'PICKUP') {
        return `Самовывоз: ТЦ Атолл${delivery.code ? `, код ${delivery.code}` : ''}`;
    }
    if (delivery.type === 'DIGITAL') {
        return 'Цифровой доступ';
    }
    if (delivery.city) {
        const mode = delivery.type === 'PVZ' ? 'СДЭК ПВЗ' : 'Курьер/Адрес';
        return `${mode}: ${delivery.city}${delivery.address ? `, ${delivery.address}` : ''}`;
    }
    return 'Доставка: уточняется';
}

function buildPricingLines(pricingBreakdown = {}, orderTotal = 0, deliveryCost = 0) {
    const lines = [];
    const subtotal = Number(pricingBreakdown.subtotal) || 0;
    const loyaltyDiscountVal = Number(pricingBreakdown.loyaltyDiscountVal) || 0;
    const loyaltyPercent = Number(pricingBreakdown.loyaltyPercent) || 0;
    const welcomeDiscountVal = Number(pricingBreakdown.welcomeDiscountVal) || 0;
    const welcomeBonusPercent = Number(pricingBreakdown.welcomeBonusPercent) || 0;
    const fortuneDiscountVal = Number(pricingBreakdown.fortuneDiscountVal) || 0;
    const fortuneDiscountPercent = Number(pricingBreakdown.fortuneDiscountPercent) || 0;
    const promoDiscountVal = Number(pricingBreakdown.promoDiscountVal) || 0;
    const promoCode = String(pricingBreakdown.promoCode || '').trim();
    const promoType = String(pricingBreakdown.promoType || '').trim();
    const promoValue = Number(pricingBreakdown.promoValue) || 0;
    const totalDiscountVal = Number(pricingBreakdown.totalDiscountVal) || (loyaltyDiscountVal + welcomeDiscountVal + fortuneDiscountVal + promoDiscountVal);
    const finalTotal = Number(pricingBreakdown.finalTotal) || Number(orderTotal) || 0;

    if (subtotal > 0) lines.push(`Цена без скидок: ${formatRub(subtotal)}`);
    if (loyaltyDiscountVal > 0) lines.push(`Скидка лояльности (${formatPercent(loyaltyPercent)}): -${formatRub(loyaltyDiscountVal)}`);
    if (welcomeDiscountVal > 0) lines.push(`Приветственная скидка (${formatPercent(welcomeBonusPercent)}): -${formatRub(welcomeDiscountVal)}`);
    if (fortuneDiscountVal > 0) lines.push(`Скидка удачи (${formatPercent(fortuneDiscountPercent)}): -${formatRub(fortuneDiscountVal)}`);
    if (promoDiscountVal > 0) {
        const promoSuffix = promoType === 'percent'
            ? ` (${formatPercent(promoValue)})`
            : promoType === 'fixed'
                ? ` (${formatRub(promoValue)})`
                : '';
        lines.push(`Промокод ${promoCode || ''}${promoSuffix}: -${formatRub(promoDiscountVal)}`.trim());
    }
    if (totalDiscountVal > 0) lines.push(`Сумма скидок: -${formatRub(totalDiscountVal)}`);
    lines.push(`Доставка: ${formatRub(deliveryCost)}`);
    lines.push(`Итого оплачено: ${formatRub(finalTotal)}`);
    return lines;
}

function buildEventDescription(payload) {
    const customer = payload.customer || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const delivery = payload.delivery || {};
    const pricingLines = buildPricingLines(payload.pricingBreakdown, payload.total, payload.deliveryCost);
    const createdAtMs = getTimestampMs(payload.createdAt);
    const createdDate = createdAtMs ? new Date(createdAtMs) : new Date();
    const createdLabel = createdDate.toLocaleString('ru-RU', {
        timeZone: GOOGLE_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const lines = [
        `Заказ №${payload.orderId}`,
        `Оплачен: ${createdLabel}`,
        customer.name ? `Клиент: ${customer.name}` : '',
        customer.phone ? `Телефон: ${customer.phone}` : '',
        customer.email ? `Email: ${customer.email}` : '',
        buildDeliveryLine(delivery),
        '',
        'Состав заказа:',
        ...items.map(buildItemLine),
        '',
        'Расшифровка цены:',
        ...pricingLines
    ];

    return lines.filter(Boolean).join('\n');
}

async function createRetailOrderCalendarEvent(payload) {
    if (!isGoogleCalendarConfigured()) {
        return { success: false, skipped: true, reason: 'not_configured' };
    }

    const accessToken = await fetchGoogleAccessToken();
    const calendarId = String(process.env.GOOGLE_CALENDAR_ID || '').trim();
    const window = getCalendarEventWindow(payload.createdAt);
    const deliveryType = String(payload?.delivery?.type || '').trim();
    const eventBody = {
        summary: `Заказ №${payload.orderId}`,
        description: buildEventDescription(payload),
        start: {
            dateTime: window.startIso,
            timeZone: GOOGLE_TIMEZONE
        },
        end: {
            dateTime: window.endIso,
            timeZone: GOOGLE_TIMEZONE
        },
        source: {
            title: 'Locus Coffee',
            url: String(process.env.PUBLIC_WEB_URL || 'https://locus.coffee/')
        },
        extendedProperties: {
            private: {
                orderId: String(payload.orderId || ''),
                orderSource: 'locus.coffee',
                deliveryType
            }
        }
    };

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create Google Calendar event');
    }

    return {
        success: true,
        eventId: data.id || ''
    };
}

module.exports = {
    createRetailOrderCalendarEvent,
    isGoogleCalendarConfigured
};
