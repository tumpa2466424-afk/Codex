import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, collection, deleteDoc, getDocs, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        // // --- ИНИЦИАЛИЗАЦИЯ FIREBASE ---
        const firebaseConfig = {
            apiKey: "AIzaSyDoqPrYFegCZRyTlrqbZe7VZoChdW_lS4g",
            authDomain: "locus-coffee.firebaseapp.com",
            projectId: "locus-coffee",
            storageBucket: "locus-coffee.firebasestorage.app",
            messagingSenderId: "539438290999",
            appId: "1:539438290999:web:eb6d5a2090d811bcf2c7b2",
            measurementId: "G-WT6BE6YS1F"
        };

        let app, auth, db;
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        } catch (e) { console.error("Ошибка инициализации Firebase:", e); }

        // Обновленная ссылка на Yandex Cloud Function вместо Google Sheets
        const YANDEX_FUNCTION_URL = "https://functions.yandexcloud.net/d4ekgff0csfc77v2nu5q";

        const LOCUS_API_URL = "https://functions.yandexcloud.net/d4ehpa8o948vden3i9ba";

        function syncViewportHeightVar() {
            const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
            if (viewportHeight > 0) {
                document.documentElement.style.setProperty('--locus-viewport-height', `${Math.round(viewportHeight)}px`);
            }
        }

        syncViewportHeightVar();
        window.addEventListener('resize', syncViewportHeightVar, { passive: true });
        window.addEventListener('orientationchange', syncViewportHeightVar, { passive: true });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', syncViewportHeightVar);
        }
        
        const CATEGORY_COLORS = { 'Эспрессо': '#9c4c00', 'Фильтр': '#e78b00', 'Ароматизация': '#ad6565', 'Аксессуары': '#538a8b', 'Информация': '#9e9076' };

        const CATEGORY_DESCRIPTIONS = {
            'ЭСПРЕССО': 'В этой категории собраны сорта и смеси, которые подойдут для приготовления в эспрессо, турке, гейзере и другими способами. Идеально под молоко.',
            'ФИЛЬТР': 'В этой категории собраны сорта и смеси, которые подойдут для приготовления в любых фильтровых способах: воронки, аэропресс, капельные.',
            'АРОМАТИЗАЦИЯ': 'Десертные сорта с мягкой ароматизацией. Применяются кондитерские ароматизаторы. Идеальный выбор для тех, кто хочет разнообразить кофейную рутину новыми яркими ароматами.',
            'АКСЕССУАРЫ': 'Все, с помощью чего вы сможете приготовить себе чашку вкусного кофе.',
            'ИНФОРМАЦИЯ': 'Ознакомьтесь с информацией в этом разделе, чтобы узнать о нас больше.'
        };

        const STATIC_CATALOG_PRODUCTS = [
            {
                id: 'static_scafw',
                sample_no: 'SCA Flavor Wheel',
                in_catalogue: '1',
                category: 'Информация',
                price: '0',
                image_url: '',
                custom_desc: 'Открыть SCA Flavor Wheel',
                external_url: 'https://locus.coffee/scafw'
            }
        ];
        
        const SCA_CSV_MAP = {
            // ФРУКТОВЫЕ (Fruity)
            'fruity': [225, 40, 59], 'фрукт': [225, 40, 59],
            'berry': [225, 40, 59], 'ягод': [225, 40, 59],
            'blackberry': [62, 3, 23], 'ежевик': [62, 3, 23],
            'raspberry': [229, 41, 104], 'малин': [229, 41, 104],
            'blueberry': [100, 105, 160], 'черник': [100, 105, 160],
            'strawberry': [239, 45, 60], 'клубник': [239, 45, 60], 'земляник': [239, 45, 60],
            'dried fruit': [194, 37, 90], 'сухофрукт': [194, 37, 90],
            'raisin': [180, 56, 91], 'изюм': [180, 56, 91],
            'prune': [112, 71, 98], 'чернослив': [112, 71, 98],
            'coconut': [240, 92, 89], 'кокос': [240, 92, 89],
            'cherry': [224, 31, 39], 'вишн': [224, 31, 39], 'черешн': [224, 31, 39],
            'pomegranate': [225, 44, 64], 'гранат': [225, 44, 64],
            'pineapple': [242, 173, 49], 'ананас': [242, 173, 49],
            'grape': [130, 186, 53], 'виноград': [130, 186, 53],
            'apple': [50, 160, 57], 'яблок': [50, 160, 57],
            'peach': [243, 155, 107], 'персик': [243, 155, 107],
            'pear': [176, 203, 68], 'груш': [176, 203, 68],
            
            // ЦИТРУСОВЫЕ (Citrus)
            'citrus': [249, 173, 19], 'цитрус': [249, 173, 19],
            'grapefruit': [246, 139, 84], 'грейпфрут': [246, 139, 84],
            'orange': [247, 163, 41], 'апельсин': [247, 163, 41],
            'lemon': [252, 238, 33], 'лимон': [252, 238, 33],
            'lime': [142, 198, 63], 'лайм': [142, 198, 63],

            // КИСЛЫЙ / ФЕРМЕНТИРОВАННЫЙ (Sour/Fermented)
            'sour': [230, 175, 17], 'кисл': [230, 175, 17],
            'acetic': [144, 177, 61], 'уксус': [144, 177, 61],
            'butyric': [111, 148, 57], 'маслян': [111, 148, 57], 'пармезан': [111, 148, 57],
            'isovaleric': [121, 148, 64], 'изовалериан': [121, 148, 64],
            'alcohol': [175, 141, 50], 'алкогол': [175, 141, 50], 'спирт': [175, 141, 50],
            'winey': [145, 65, 74], 'винн': [145, 65, 74], 'вино': [145, 65, 74],
            'whiskey': [140, 89, 74], 'виски': [140, 89, 74],
            'fermented': [177, 142, 52], 'фермент': [177, 142, 52],
            'overripe': [82, 71, 59], 'перезрел': [82, 71, 59],

            // ЗЕЛЕНЫЙ / РАСТИТЕЛЬНЫЙ (Green/Vegetative)
            'green': [24, 122, 48], 'зелен': [24, 122, 48],
            'olive oil': [162, 147, 51], 'оливк': [162, 147, 51],
            'raw': [152, 167, 53], 'сыр': [152, 167, 53],
            'under-ripe': [198, 108, 68], 'недозрел': [198, 108, 68],
            'peapod': [161, 197, 57], 'стручк': [161, 197, 57],
            'fresh': [59, 181, 74], 'свеж': [59, 181, 74],
            'vegetative': [38, 96, 50], 'растител': [38, 96, 50],
            'hay': [161, 144, 52], 'солом': [161, 144, 52], 'сен': [161, 144, 52],
            'herb': [104, 129, 62], 'трав': [104, 129, 62],
            'beany': [104, 150, 89], 'боб': [104, 150, 89],

            // ПРОЧЕЕ (Other: бумажный, землистый, животный)
            'papery': [162, 185, 200], 'бумаж': [162, 185, 200],
            'stale': [64, 100, 123], 'несвеж': [64, 100, 123],
            'cardboard': [144, 173, 188], 'картон': [144, 173, 188],
            'musty': [104, 94, 72], 'затхл': [104, 94, 72],
            'dusty': [104, 94, 72], 'пыльн': [104, 94, 72],
            'earthy': [79, 67, 50], 'земл': [79, 67, 50],
            'moldy': [125, 112, 79], 'плесен': [125, 112, 79],
            'woody': [113, 105, 70], 'древ': [113, 105, 70], 'дерев': [113, 105, 70],
            'phenolic': [87, 132, 156], 'фенол': [87, 132, 156],
            'meaty': [198, 108, 68], 'мясн': [198, 108, 68],
            'brothy': [198, 108, 68], 'бульон': [198, 108, 68],
            'animalic': [103, 91, 66], 'животн': [103, 91, 66],
            'chemical': [0, 126, 179], 'химич': [0, 126, 179],
            'bitter': [29, 58, 75], 'горьк': [29, 58, 75], 'гореч': [29, 58, 75],
            'salty': [44, 75, 94], 'солен': [44, 75, 94],
            'medicinal': [43, 78, 97], 'лекарст': [43, 78, 97], 'медицин': [43, 78, 97],
            'petroleum': [57, 99, 125], 'нефт': [57, 99, 125],
            'rubber': [198, 108, 68], 'резин': [198, 108, 68],
            'skunky': [14, 81, 109], 'скунс': [14, 81, 109],

            // ОБЖАРЕННОЕ (Roasted / Cereal)
            'roasted': [194, 112, 34], 'обжар': [194, 112, 34],
            'pipe tobacco': [181, 75, 51], 'трубочн': [181, 75, 51],
            'tobacco': [152, 93, 37], 'табак': [152, 93, 37],
            'burnt': [116, 77, 35], 'жжен': [116, 77, 35], 'горел': [116, 77, 35],
            'acrid': [67, 49, 39], 'едк': [67, 49, 39],
            'ashy': [82, 79, 75], 'пепел': [82, 79, 75], 'зол': [82, 79, 75],
            'smoky': [83, 60, 50], 'дым': [83, 60, 50],
            'cereal': [212, 173, 128], 'злак': [212, 173, 128],
            'grain': [204, 148, 106], 'зерн': [204, 148, 106],
            'malt': [173, 109, 51], 'солод': [173, 109, 51],

            // СПЕЦИИ (Spices)
            'spice': [188, 47, 38], 'спец': [188, 47, 38], 'прян': [188, 47, 38],
            'pungent': [188, 47, 38], 'остр': [188, 47, 38],
            'pepper': [123, 42, 38], 'перец': [123, 42, 38], 'перч': [123, 42, 38],
            'anise': [209, 69, 38], 'анис': [209, 69, 38],
            'nutmeg': [171, 52, 41], 'мускат': [171, 52, 41],
            'cinnamon': [149, 45, 40], 'кориц': [149, 45, 40],
            'clove': [127, 45, 38], 'гвоздик': [127, 45, 38],

            // ОРЕХИ / КАКАО (Nutty/Cocoa)
            'nutty': [166, 123, 91], 'орех': [166, 123, 91],
            'peanuts': [154, 102, 66], 'арахис': [154, 102, 66],
            'hazelnut': [137, 94, 64], 'фундук': [137, 94, 64],
            'almond': [144, 107, 66], 'миндал': [144, 107, 66],
            'cocoa': [112, 78, 49], 'какао': [112, 78, 49],
            'chocolate': [125, 81, 48], 'шоколад': [125, 81, 48],
            'dark chocolate': [80, 49, 38], 'темн': [80, 49, 38],

            // СЛАДКИЙ (Sweet)
            'sweet': [244, 130, 37], 'сладк': [244, 130, 37],
            'vanilla': [242, 158, 101], 'ваниль': [242, 158, 101],
            'vanillin': [179, 104, 49], 'ванилин': [179, 104, 49],
            'sugar': [211, 78, 54], 'сахар': [211, 78, 54],
            'molasses': [124, 64, 41], 'паток': [124, 64, 41],
            'maple': [175, 82, 50], 'клен': [175, 82, 50],
            'caramel': [212, 99, 49], 'карамел': [212, 99, 49],
            'honey': [245, 147, 49], 'мед': [245, 147, 49], 'мёд': [245, 147, 49],

            // ЦВЕТОЧНЫЙ (Floral)
            'floral': [223, 33, 128], 'цветоч': [223, 33, 128],
            'black tea': [153, 97, 124], 'чай': [153, 97, 124],
            'chamomile': [232, 173, 170], 'ромашк': [232, 173, 170],
            'rose': [238, 84, 158], 'роз': [238, 84, 158],
            'jasmine': [241, 152, 192], 'жасмин': [241, 152, 192]
        };

        function hexToRgbArr(hex) {
            const bigint = parseInt(hex.replace('#', ''), 16);
            return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
        }

        function rgbArrToHex(rgb) {
            return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
        }

        // ============================================================================
        // НАСТРОЙКИ ЦВЕТОВОЙ ПАЛИТРЫ (УПРАВЛЕНИЕ "ПЫЛЬНОСТЬЮ" И ПАСТЕЛЬЮ)
        // ============================================================================
        const PALETTE_CONFIG = {
            greyRgb: [200, 200, 200], // Тот самый нейтральный светло-серый
            
            // Настройки для КАТЕГОРИЙ (основа, фон - приглушаем цвет и пыльность)
            catWeight: 0.8, // 60% исходного яркого цвета
            catGrey:   0.2, // 40% серого
            
            // Настройки для ЛОТОВ (Лепестки с дескрипторами - Внешний круг)
            lotWeight: 1.0, // 60% цвета вкуса
            lotGrey:   0.0  // 40% серого
        };

        // Универсальная функция подмешивания серого к любому цвету
        function muteColor(hex, weightColor, weightGrey) {
            if (!hex) return hex;
            const rgb = hexToRgbArr(hex);
            if (!rgb) return hex;
            const r = Math.round((rgb[0] * weightColor) + (PALETTE_CONFIG.greyRgb[0] * weightGrey));
            const g = Math.round((rgb[1] * weightColor) + (PALETTE_CONFIG.greyRgb[1] * weightGrey));
            const b = Math.round((rgb[2] * weightColor) + (PALETTE_CONFIG.greyRgb[2] * weightGrey));
            return rgbArrToHex([r, g, b]);
        }

        // Обновленная функция смешивания для колеса
        function mixFlavorColors(text, defaultHex) {
            // 1. Сразу приглушаем цвет категории по её личным настройкам
            const mutedCatHex = muteColor(defaultHex, PALETTE_CONFIG.catWeight, PALETTE_CONFIG.catGrey);

            if (!text) return mutedCatHex; // Если нет описания - отдаем приглушенную категорию
            
            const descriptors = text.split(',').map(d => d.trim().toLowerCase()).filter(d => d.length > 0);
            let foundRgbs = [];

            descriptors.forEach(desc => {
                for (const [key, rgb] of Object.entries(SCA_CSV_MAP)) {
                    if (desc.includes(key)) {
                        foundRgbs.push(rgb);
                        break; 
                    }
                }
            });

            if (foundRgbs.length === 0) return mutedCatHex;

            let r = 0, g = 0, b = 0;
            foundRgbs.forEach(col => { r += col[0]; g += col[1]; b += col[2]; });
            const flavorR = Math.round(r / foundRgbs.length);
            const flavorG = Math.round(g / foundRgbs.length);
            const flavorB = Math.round(b / foundRgbs.length);

            // 2. Смешиваем 50/50: цвет дескрипторов + ОРИГИНАЛЬНЫЙ ЯРКИЙ цвет категории
            const catRgb = hexToRgbArr(defaultHex);
            const midR = Math.round((flavorR + catRgb[0]) / 2);
            const midG = Math.round((flavorG + catRgb[1]) / 2);
            const midB = Math.round((flavorB + catRgb[2]) / 2);

            // 3. Приглушаем получившийся микс ЛОТА по его личным настройкам
            const finalR = Math.round((midR * PALETTE_CONFIG.lotWeight) + (PALETTE_CONFIG.greyRgb[0] * PALETTE_CONFIG.lotGrey));
            const finalG = Math.round((midG * PALETTE_CONFIG.lotWeight) + (PALETTE_CONFIG.greyRgb[1] * PALETTE_CONFIG.lotGrey));
            const finalB = Math.round((midB * PALETTE_CONFIG.lotWeight) + (PALETTE_CONFIG.greyRgb[2] * PALETTE_CONFIG.lotGrey));

            return rgbArrToHex([finalR, finalG, finalB]);
        }

        // НОВАЯ ФУНКЦИЯ ДЛЯ СТИЛИЗАЦИИ БУКЕТА
        function formatFlavorDesc(text) {
            if (!text) return '';
            
            // 1. Разбиваем по ';' и затем обрабатываем каждый блок отдельно (чтобы сохранить группы "; Группа;")
            const parts = text.split(';').map(p => p.trim()).filter(p => p.length > 0);
            
            // 2. Обрабатываем каждый элемент
            return parts.map(part => {
                const colonIndex = part.indexOf(':');
                if (colonIndex !== -1) {
                    const group = part.substring(0, colonIndex).trim();
                    const subgroup = part.substring(colonIndex + 1).trim();
                    
                    // Если двоеточие есть, но после него пусто ("Группа: ")
                    if (!subgroup) {
                        return `<span class="flavor-subgroup">${group}</span>`;
                    }
                    return `<span class="flavor-group">${group}:</span> <span class="flavor-subgroup">${subgroup}</span>`;
                } else {
                    // Если двоеточия нет вообще ("Группа") — делаем её подчеркнутой подгруппой
                    return `<span class="flavor-subgroup">${part}</span>`;
                }
            }).join('<span class="flavor-group">; </span>');
        }

        // ============================================================================
        // УМНЫЙ МЕНЕДЖЕР КАТАЛОГА (PRODUCT MANAGER)
        // Вся логика типов товаров, веса, помола и описаний централизована здесь.
        // ============================================================================
        const ProductManager = {
            getArticlePayload: function(product) {
                if (!product) return null;
                const raw = product.articlePayloadRaw || product.customDesc || product.custom_desc || '';
                if (!raw || typeof raw !== 'string') return null;
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.kind === 'paid_article') return parsed;
                } catch (e) {}
                return null;
            },
            // 1. Умный поиск товара в кэше по имени
            getProduct: function(sampleName) {
                if (!sampleName) return null;
                const target = String(sampleName).trim().toLowerCase();
                return ALL_PRODUCTS_CACHE.find(p => {
                    const pName = String(p.sample || p.sample_no || "").trim().toLowerCase();
                    // Ищем точное совпадение или если старое имя в истории содержит текущее
                    return pName === target || target.includes(pName) || pName.includes(target.split(' (')[0]);
                }) || null;
            },

            // 2. Определение типа товара (Кофе, Дрип, Аксессуар и т.д.)
            getTypeInfo: function(productOrName) {
                const p = typeof productOrName === 'string' ? this.getProduct(productOrName) : productOrName;
                if (!p) return { isSpecial: false, isAccessory: false, isInfo: false, isArticle: false, isArticleHub: false, isAroma: false, isCoffee: true, isDrip: false };

                const cat = (p.category || '').toLowerCase();
                const sName = (p.sample || '').toLowerCase();
                const normalizedName = sName.replace(/\s+/g, ' ').trim();
                const numericPrice = parseFloat(p.price);

                const isAroma = cat.includes('ароматизац');
                const isAcc = cat.includes('аксессуар');
                const isInfo = cat.includes('информац');
                const isArticleHub = isInfo && normalizedName === 'статьи';
                const hasArticlePayload = !!this.getArticlePayload(p);
                const isArticle = isInfo && !isArticleHub && (hasArticlePayload || numericPrice > 0);
                const isDrip = sName.includes('дрип');

                return {
                    isSpecial: isAcc || isInfo || isDrip, // Всё, что не классический кофе
                    isAccessory: isAcc,
                    isInfo: isInfo,
                    isArticle: isArticle,
                    isArticleHub: isArticleHub,
                    isDrip: isDrip,
                    isAroma: isAroma,
                    isCoffee: !isAcc && !isInfo && !isDrip
                };
            },

            // 3. Форматирование мета-данных для вывода (Скрывает вес/помол где не нужно)
            getDisplayMeta: function(productOrName, originalWeight, originalGrind) {
                const type = this.getTypeInfo(productOrName);
                return {
                    weight: type.isSpecial ? "" : originalWeight,
                    grind: type.isSpecial ? "" : originalGrind
                };
            },

            // 4. Получение правильного текстового описания
            isCountryBlendValue: function(value) {
                const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
                return parts.length > 1;
            },

            getBlendCountryValue: function(product) {
                const directCountry = String(product?.country || '').trim();
                if (directCountry) return directCountry;

                const sampleKey = String(product?.sample || product?.sample_no || '').trim();
                if (!sampleKey || !Array.isArray(ALL_PRODUCTS_CACHE)) return '';

                const fullProduct = ALL_PRODUCTS_CACHE.find(p =>
                    String(p?.sample || p?.sample_no || '').trim() === sampleKey
                );
                return String(fullProduct?.country || '').trim();
            },

            isBlendProduct: function(product) {
                return this.isCountryBlendValue(this.getBlendCountryValue(product));
            },

            getBlendBadgeHtml: function(options = {}) {
                const marginBottom = options.includeBottomMargin ? ' margin-bottom:4px;' : '';
                return `<span style="font-size:9px; background:#8B7E66; color:#fff; border-radius:3px; padding:2px 4px; margin-right:5px; vertical-align:middle; display:inline-block;${marginBottom}">BLEND</span>`;
            },

            getLotDisplayName: function(product) {
                const sampleName = String(product?.sample || product?.sample_no || '').trim();
                return sampleName;
            },

            getDisplayDesc: function(product) {
                if (!product) return '-';
                const type = this.getTypeInfo(product);
                if (type.isSpecial) {
                    const articlePayload = this.getArticlePayload(product);
                    if (type.isArticle && articlePayload) return articlePayload.previewHtml || '-';
                    return product.customDesc || product.flavorDesc || '-';
                }
                let desc = product.flavorDesc ? formatFlavorDesc(product.flavorDesc) : '-';
                if (product.flavorNotes) {
                    desc += `<div style="margin-top:4px; font-size:11px; opacity:0.8;"><b>Нюансы:</b> ${product.flavorNotes}</div>`;
                }
                return desc;
            }
        };
        window.ProductManager = ProductManager; // Делаем доступным глобально
        // ============================================================================

        let ALL_PRODUCTS_CACHE = [];
        let SHOP_DATA = [
            { id: 'espresso', label: 'ЭСПРЕССО', color: CATEGORY_COLORS['Эспрессо'], desc: CATEGORY_DESCRIPTIONS['ЭСПРЕССО'], children: [] },
            { id: 'filter', label: 'ФИЛЬТР', color: CATEGORY_COLORS['Фильтр'], desc: CATEGORY_DESCRIPTIONS['ФИЛЬТР'], children: [] },
            { id: 'aroma', label: 'АРОМАТИЗАЦИЯ', color: CATEGORY_COLORS['Ароматизация'], desc: CATEGORY_DESCRIPTIONS['АРОМАТИЗАЦИЯ'], children: [] },
            { id: 'accessories', label: 'АКСЕССУАРЫ', color: CATEGORY_COLORS['Аксессуары'], desc: CATEGORY_DESCRIPTIONS['АКСЕССУАРЫ'], children: [] },
            { id: 'info', label: 'ИНФОРМАЦИЯ', color: CATEGORY_COLORS['Информация'], desc: CATEGORY_DESCRIPTIONS['ИНФОРМАЦИЯ'], children: [] }
        ];

        let rotation = 0, isDragging = false, lastAngle = 0, velocity = 0, lastTime = Date.now();
        let zone = null, spinnerElem = null;
        let mapInstance = null, mapMarker = null;
        let currentActiveProduct = null;
        let currentWeight = 250;
        let currentGrind = "Зерно";

        function getAngle(clientX, clientY) {
            if (!zone) return 0;
            const rect = zone.getBoundingClientRect();
            const centerX = rect.left; 
            const centerY = rect.top + rect.height / 2;
            return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
        }

        const moveH = (clientX, clientY) => {
            if (!isDragging) return;
            const curA = getAngle(clientX, clientY);
            const delta = curA - lastAngle;
            rotation += delta;
            const now = Date.now();
            const dt = now - lastTime;
            if (dt > 0) velocity = delta / (dt / 16);
            lastAngle = curA; lastTime = now;
        };

        function getScale(valStr) {
            const val = Math.round(parseFloat(valStr)) || 0;
            let html = '<div class="intensity-scale">';
            for(let g=0; g<3; g++) {
                html += '<div class="scale-group">';
                for(let c=1; c<=5; c++) {
                    const id = (g * 5) + c;
                    const isSelected = id === val;
                    const activeClass = isSelected ? 'active' : '';
                    let textColor = 'var(--locus-dark)';
                    if(id >= 8) textColor = 'var(--locus-bg)';
                    let cellContent = isSelected ? `<span style="color: ${textColor}">${id}</span>` : '';
                    if (id === 1 && !isSelected) cellContent = `<span style="color: var(--locus-dark); opacity: 0.5;">1</span>`;
                    if (id === 15 && !isSelected) cellContent = `<span style="color: var(--locus-bg); opacity: 0.5;">15</span>`;
                    html += `<div class="scale-cell c-${id} ${activeClass}">${cellContent}</div>`;
                }
                html += '</div>';
            }
            html += '</div>';
            return html;
        }

        const pInfo = document.getElementById('product-info'), dMsg = document.getElementById('default-msg');

        window.resetInfo = function() {
            const svg = document.querySelector('#wheel-spinner svg');
            if (svg) svg.querySelectorAll('path').forEach(p => p.classList.remove('selected'));
            pInfo.classList.remove('active');
            setTimeout(() => { pInfo.style.display = 'none'; dMsg.style.display = 'flex'; setTimeout(() => dMsg.classList.add('active'), 50); }, 250);
            currentActiveProduct = null;
            // ОЧИЩАЕМ АДРЕСНУЮ СТРОКУ ОТ ССЫЛКИ НА ЛОТ
            const url = new URL(window.location);
            url.searchParams.delete('lot');
            window.history.replaceState({}, '', url);
        };

        function updatePriceDisplay() {
            if(!currentActiveProduct) return;
            
            // 1. ИЩЕМ ПОЛНЫЕ ДАННЫЕ В КЭШЕ
            const sampleName = currentActiveProduct.sample_no || currentActiveProduct.sample;
            let rawGreen = 0;
            let fullProduct = null; // ИСПРАВЛЕНИЕ: Вынесли переменную наружу, чтобы её видели все блоки!
            
            if (typeof ALL_PRODUCTS_CACHE !== 'undefined') {
                fullProduct = ALL_PRODUCTS_CACHE.find(p => p.sample === sampleName || p.sample_no === sampleName);
                if (fullProduct) {
                    rawGreen = parseFloat(fullProduct.rawGreenPrice || fullProduct.raw_green_price) || 0;
                }
            }
            
            // 2. СЧИТАЕМ РОЗНИЧНУЮ ЦЕНУ ИЛИ БЕРЕМ ФИКСИРОВАННУЮ
            let basePrice = 0;
            if (rawGreen > 0 && typeof UserSystem !== 'undefined' && UserSystem.calculateRetailPrices) {
                // Если есть зеленое зерно, считаем по классической формуле
                const prices = UserSystem.calculateRetailPrices(rawGreen);
                basePrice = currentWeight === 1000 ? prices.p1000 : prices.p250;
            } else if (fullProduct && fullProduct.price && parseFloat(fullProduct.price) > 0) {
                // Если зерна нет, берем фиксированную цену (для Аксессуаров и Инфо)
                const fixedPrice = parseFloat(fullProduct.price) || 0;
                // Считаем, что фиксированная цена указана за 1 штуку (250г). Для 1кг (4шт) умножаем на 4.
                basePrice = currentWeight === 1000 ? fixedPrice * 4 : fixedPrice;
            }
            
            // 3. УЧИТЫВАЕМ СКИДКУ ПОКУПАТЕЛЯ
            let userDiscount = 0;
            if(typeof UserSystem !== 'undefined' && UserSystem.currentUser && UserSystem.currentUser.totalSpent) {
                 userDiscount = Math.floor((UserSystem.currentUser.totalSpent || 0) / 3000);
                 if(userDiscount > 15) userDiscount = 15;
            }
            
            const finalPrice = Math.floor(basePrice * (1 - userDiscount/100));
            // Подписка: базовая цена минус 50 рублей (или любая твоя скидка)
            const subPrice = basePrice > 50 ? basePrice - 50 : basePrice;

            // 4. БЕЗОПАСНЫЙ ВЫВОД В ИНТЕРФЕЙС
            const cartPriceEl = document.getElementById('p-price-cart');
            if(cartPriceEl) {
                if(userDiscount > 0 && basePrice > 0) {
                    cartPriceEl.innerHTML = `<span style="text-decoration:line-through; opacity:0.6; font-size:10px;">${basePrice}</span> ${finalPrice} ₽`;
                } else {
                    cartPriceEl.textContent = basePrice > 0 ? basePrice + ' ₽' : '0 ₽';
                }
            }
            
            const subPriceEl = document.getElementById('p-price-sub');
            if(subPriceEl) {
                subPriceEl.textContent = subPrice > 0 ? subPrice + ' ₽' : '0 ₽'; 
            }
            
            const cartBtn = document.getElementById('btn-cart');
            if(cartBtn) {
                cartBtn.href = `#order:${sampleName}_${currentWeight}g=${finalPrice}`;
            }
        }

        function openExternalProductUrl(product) {
            const targetUrl = String(product?.externalUrl || '').trim();
            if (!targetUrl) return false;
            window.location.href = targetUrl;
            return true;
        }

        function updateInfo(seg) {
            dMsg.classList.remove('active'); pInfo.classList.remove('active');
            
            // Закрываем все блоки
            if (document.getElementById('detailed-stats-block')) document.getElementById('detailed-stats-block').style.display = 'none';
            if (document.getElementById('extrinsic-stats-block')) document.getElementById('extrinsic-stats-block').style.display = 'none';
            if (document.getElementById('ai-story-block')) document.getElementById('ai-story-block').style.display = 'none';

            // Отжимаем все кнопки (сбрасываем класс active)
            if (document.getElementById('btn-toggle-details')) document.getElementById('btn-toggle-details').classList.remove('active');
            if (document.getElementById('btn-toggle-extrinsic')) document.getElementById('btn-toggle-extrinsic').classList.remove('active');
            if (document.getElementById('btn-toggle-ai')) document.getElementById('btn-toggle-ai').classList.remove('active');

            setTimeout(() => {
                dMsg.style.display = 'none';
                if(seg.depth === 1) {
                    const r = seg.raw;
                    currentActiveProduct = r;
                    currentWeight = 250; 
                    
                    currentGrind = "Зерно";
                    document.querySelectorAll('.grind-btn').forEach(b => {
                        b.classList.remove('active');
                        if(b.dataset.grind === "Зерно") b.classList.add('active');
                    });

                    document.querySelectorAll('.weight-option').forEach(el => el.classList.remove('selected'));
                    document.querySelector('.weight-option[data-w="250"]').classList.add('selected');

                    document.getElementById('p-title').textContent = r.sample;
                    document.getElementById('p-cat-desc').textContent = '';
                    
                    
                    // Исправлено: используем ProductManager
                    const typeInfo = ProductManager.getTypeInfo(r);
                    const { isAroma, isInfo, isSpecial, isArticle, isArticleHub } = typeInfo;

                  
                    // Находим элементы интерфейса карточки товара
                    const toggleBtn = document.getElementById('btn-toggle-details');
                    const toggleExtBtn = document.getElementById('btn-toggle-extrinsic');
                    const toggleAiBtn = document.getElementById('btn-toggle-ai');
                    const lotDescWrapper = document.getElementById('lot-desc-wrapper');

                    // Находим кнопки и блоки для скрытия (Вес, Подписка)
                    const weightSelector = document.getElementById('weight-selector-block');
                    const subBtn = document.getElementById('btn-subscription');
                    const cartBtn = document.getElementById('btn-cart');
                    const articleAccessPanel = document.getElementById('article-access-panel');
                    // ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ УВЕЛИЧЕНИЯ ФОТО
                    if (!window.openFullscreenImage) {
                        window.openFullscreenImage = function(src) {
                            const overlay = document.createElement('div');
                            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:10000; display:flex; justify-content:center; align-items:center; cursor:pointer; padding:20px; box-sizing:border-box;';
                            const img = document.createElement('img');
                            img.src = src;
                            img.style.cssText = 'max-width:100%; max-height:100%; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5); object-fit:contain;';
                            overlay.appendChild(img);
                            overlay.onclick = () => overlay.remove();
                            document.body.appendChild(overlay);
                        };
                    }

                    // СОБИРАЕМ HTML ГАЛЕРЕИ
                    const buildGalleryHtml = (imgStr) => {
                        if (!imgStr) return '';
                        const urls = imgStr.split(',').map(u => u.trim()).filter(u => u);
                        if (urls.length === 0) return '';
                        if (urls.length === 1) return `<img src="${urls[0]}" style="width:100%; border-radius:8px; margin-bottom:15px; object-fit:cover; cursor:pointer;" onclick="openFullscreenImage('${urls[0]}')">`;
                        
                        let html = `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">`;
                        urls.forEach(url => html += `<img src="${url}" style="width:100%; aspect-ratio:1; border-radius:8px; object-fit:cover; cursor:pointer;" onclick="openFullscreenImage('${url}')">`);
                        html += `</div>`;
                        return html;
                    };
                    
                    let galleryHtml = buildGalleryHtml(r.imageUrl);
                    if (isSpecial) {
                        // 1. АКСЕССУАРЫ И ИНФО
                        const articlePayload = isArticle ? ProductManager.getArticlePayload(r) : null;
                        const specialBodyHtml = isArticleHub
                            ? UserSystem.getArticleHubHtml(r)
                            : (isArticle
                                ? `<div id="article-preview-body">${articlePayload?.previewHtml || r.flavorDesc || ''}</div>`
                                : `<div style="text-align: justify; line-height: 1.5; white-space: pre-wrap;">${r.customDesc || r.flavorDesc || ''}</div>`);
                        let descHtml = galleryHtml + specialBodyHtml;
                        document.getElementById('p-simple-desc').innerHTML = descHtml;

                        document.getElementById('p-mini-stats').innerHTML = '';
                        document.getElementById('p-mini-stats').style.display = 'none';
                        if(toggleBtn) toggleBtn.style.display = 'none';
                        if(toggleExtBtn) toggleExtBtn.style.display = 'none';
                        if(toggleAiBtn) toggleAiBtn.style.display = 'none';
                        if(lotDescWrapper) lotDescWrapper.style.display = 'none';
                        document.getElementById('grind-selector-block').style.display = 'none';
                        
                        // Скрываем кнопки веса и подписки
                        if(weightSelector) weightSelector.style.display = 'none';
                        if(subBtn) subBtn.style.display = 'none';
                        if(cartBtn && cartBtn.parentElement) {
                            cartBtn.parentElement.style.justifyContent = 'center';
                            cartBtn.style.width = 'fit-content'; // Сжимаем до аккуратного размера по центру
                        }
                        
                        if (articleAccessPanel) articleAccessPanel.style.display = isArticle ? 'block' : 'none';
                        if (isArticle) UserSystem.renderArticleAccessPanel(r);
                        else UserSystem.renderArticleReader(null, '');

                        const grid = document.getElementById('cupping-data');
                        if(grid) grid.innerHTML = ''; // Убираем таблицу каппинга
                        
                    } else if (isAroma) {
                        // 2. Ароматизация
                        const packPreviewHtml = CatalogSystem.getPackPreviewHtml(r);
                        let descHtml = packPreviewHtml + galleryHtml + formatFlavorDesc(r.flavorDesc);
                        if (r.flavorNotes) descHtml += `<div style="margin-top: 8px; font-size: 12px; opacity: 0.8;"><b>Нюансы:</b> ${r.flavorNotes}</div>`;
                        document.getElementById('p-simple-desc').innerHTML = descHtml;
                        document.getElementById('p-mini-stats').innerHTML = ''; 
                        document.getElementById('p-mini-stats').style.display = 'none';
                        if(toggleBtn) toggleBtn.style.display = 'none';
                        if(toggleExtBtn) toggleExtBtn.style.display = 'none';
                        if(toggleAiBtn) toggleAiBtn.style.display = 'none'; // Скрываем AI историю для аромы
                        if(lotDescWrapper) lotDescWrapper.style.display = 'none';
                        document.getElementById('grind-selector-block').style.display = 'none';

                       // Возвращаем кнопки веса и подписки
                        if(weightSelector) weightSelector.style.display = 'flex';
                        if(subBtn) subBtn.style.display = 'flex';
                        if(cartBtn && cartBtn.parentElement) {
                            cartBtn.parentElement.style.justifyContent = 'center';
                            cartBtn.style.width = '100%'; // Возвращаем 50/50 ширину
                        }

                    } else {
                        // 3. ОБЫЧНЫЙ КОФЕ
                        const packPreviewHtml = CatalogSystem.getPackPreviewHtml(r);
                        let descHtml = packPreviewHtml + galleryHtml + formatFlavorDesc(r.flavorDesc);
                        if (r.flavorNotes) descHtml += `<div style="margin-top: 8px; font-size: 12px; opacity: 0.8;"><b>Нюансы:</b> ${r.flavorNotes}</div>`;
                        document.getElementById('p-simple-desc').innerHTML = descHtml;

                        document.getElementById('p-mini-stats').style.display = 'grid';
                        const miniStatsHTML = `
                            <div class="mini-stats-grid">
                                <div class="mini-stat-item"><div class="mini-stat-label">Букет</div>${getScale(r.flavorInt)}</div>
                                <div class="mini-stat-item"><div class="mini-stat-label">Кислотность</div>${getScale(r.acidInt)}</div>
                                <div class="mini-stat-item"><div class="mini-stat-label">Сладость</div>${getScale(r.sweetInt)}</div>
                                <div class="mini-stat-item"><div class="mini-stat-label">Тело</div>${getScale(r.bodyInt)}</div>
                            </div>
                        `;
                        document.getElementById('p-mini-stats').innerHTML = miniStatsHTML;
                        
                        if(toggleBtn) toggleBtn.style.display = 'flex';
                        if(toggleExtBtn) toggleExtBtn.style.display = 'flex';
                        if(toggleAiBtn) toggleAiBtn.style.display = 'flex';
                        if(lotDescWrapper) lotDescWrapper.style.display = 'block';
                        document.getElementById('grind-selector-block').style.display = 'block';

                        // Возвращаем кнопки веса и подписки
                        if(weightSelector) weightSelector.style.display = 'flex';
                        if(subBtn) subBtn.style.display = 'flex';
                        if(cartBtn && cartBtn.parentElement) {
                            cartBtn.parentElement.style.justifyContent = 'center';
                            cartBtn.style.width = '100%'; // Возвращаем 50/50 ширину
                        }
                    }

                    if (!isArticle) {
                        if (articleAccessPanel) articleAccessPanel.style.display = 'none';
                        UserSystem.renderArticleReader(null, '');
                    }

                    // ЛОГИКА КНОПКИ ПОКУПКИ (Скрываем для раздела Инфо с ценой 0)
                    const priceVal = parseFloat(r.price) || 0;
                    const hasActiveArticleAccess = isArticle ? !!UserSystem.getActiveArticleAccess(r) : false;
                    if (isArticleHub || hasActiveArticleAccess || (isInfo && priceVal === 0)) {
                        document.getElementById('p-buy-area').style.display = 'none';
                    } else {
                        document.getElementById('p-buy-area').style.display = 'flex';
                    }
                    updatePriceDisplay();
                    
                    const grid = document.getElementById('cupping-data');
                    if (grid) grid.innerHTML = `
                        <div class="cupping-item full-width"><span class="cupping-label">Дата каппинга</span><span class="cupping-value">${r.cuppingDate || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Степень обжарки</span>${getScale(r.roast)}</div>
                        
                        <div class="cupping-item"><span class="cupping-label">Интенсивность запаха</span>${getScale(r.smellInt)}</div>
                        <div class="cupping-item"><span class="cupping-label">Интенсивность аромата</span>${getScale(r.aromaInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Описание запаха и аромата</span><span class="cupping-value">${r.aromaDesc || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о запахе и аромате</span><span class="cupping-notes">${r.aromaNotes || '-'}</span></div>
                        
                        <div class="cupping-item"><span class="cupping-label">Интенсивность букета</span>${getScale(r.flavorInt)}</div>
                        <div class="cupping-item"><span class="cupping-label">Интенсивность послевкусия</span>${getScale(r.atInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Описание букета</span><span class="cupping-value">${r.flavorDesc || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Основные вкусы</span><span class="cupping-value flavor-text">${r.mainFlavors || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о букете и послевкусии</span><span class="cupping-notes">${r.flavorNotes || '-'}</span></div>
                        
                        <div class="cupping-item full-width"><span class="cupping-label">Интенсивность кислотности</span>${getScale(r.acidInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о кислотности</span><span class="cupping-notes">${r.acidNotes || '-'}</span></div>
                        
                        <div class="cupping-item full-width"><span class="cupping-label">Интенсивность сладости</span>${getScale(r.sweetInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о сладости</span><span class="cupping-notes">${r.sweetNotes || '-'}</span></div>
                        
                        <div class="cupping-item full-width"><span class="cupping-label">Интенсивность тактильности</span>${getScale(r.bodyInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Описание тактильности</span><span class="cupping-value">${r.bodyDesc || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о тактильности</span><span class="cupping-notes">${r.bodyNotes || '-'}</span></div>
                    `;

                    // НОВЫЙ БЛОК: ВНЕШНЕЕ ОПИСАНИЕ (Extrinsic Data на Русском)
                    const extGrid = document.getElementById('extrinsic-data');
                    if (extGrid) {
                        let eHtml = '';
                        const addE = (lbl, val) => {
                            if(val && val !== '+' && String(val).trim() !== '') {
                                eHtml += `<div class="cupping-item full-width"><span class="cupping-label">${lbl}</span><span class="cupping-value">${val}</span></div>`;
                            }
                        };
                        const addEBool = (lbl, val) => {
                            if(val && val !== '-' && String(val).trim() !== '') {
                                const displayVal = (val === '+' || val === 'true' || val === '1') ? 'Да' : val;
                                eHtml += `<div class="cupping-item full-width"><span class="cupping-label">${lbl}</span><span class="cupping-value">${displayVal}</span></div>`;
                            }
                        };

                       // --- СЕКЦИЯ 1: FARMING ---
                        addE('Страна', r.country);
                        addE('Регион', r.region);
                        addE('Ферма / Кооператив', r.farm);
                        addE('Производитель', r.producer);
                        addE('Вид / Разновидность', r.variety);
                        addE('Год урожая', r.harvest);
                        addE('Другое (Фермерство)', r.otherFarming);

                        // --- СЕКЦИЯ 2: PROCESSING ---
                        addE('Обработчик', r.processor);
                        addE('Станция мытой обработки', r.wetMill);
                        addE('Станция сухой обработки', r.dryMill);
                        addE('Другое (Обработка)', r.otherProcessor);
                        
                        addE('Тип обработки', r.processType);
                        addEBool('Мытая', r.washed);
                        addEBool('Натуральная', r.natural);
                        addE('Другое (Тип обработки)', r.otherProcessType);
                        
                        addEBool('Декаф', r.decaf);
                        addE('Описание обработки', r.processDesc);

                        // --- СЕКЦИЯ 3: TRADING ---
                        addE('Оценка / Грейд', r.grade);
                        addE('Номер ICO', r.ico);
                        addE('Импортер', r.importer);
                        addE('Экспортер', r.exporter);
                        
                        // Скрываем Farm Gate Price от всех, кроме администратора
                        if (UserSystem.currentUser && UserSystem.currentUser.email === 'info@locus.coffee') {
                            addE('Цена Farm Gate', r.farmGatePrice);
                        }
                        
                        addE('Размер лота', r.lotSize);
                        addE('Другое (Торговля)', r.otherTrading);

                        // --- СЕКЦИЯ 4: CERTIFICATIONS ---
                        addEBool('Сертификат 4C', r.cert4C);
                        addEBool('Fair trade', r.certFairTrade);
                        addEBool('Organic', r.certOrganic);
                        addEBool('Rainforest Alliance', r.certRainforest);
                        addEBool('Food Safety', r.certFoodSafety);
                        addE('Другие сертификаты', r.otherCertifications);

                        // --- СЕКЦИЯ 5: OTHER ---
                        addE('Награды', r.awards);

                        if(eHtml === '') {
                            eHtml = '<div class="cupping-item full-width"><span class="cupping-value" style="opacity:0.6; font-size:12px;">Данные внешнего описания отсутствуют</span></div>';
                        }
                        extGrid.innerHTML = eHtml;
                    }
                    // --- ОБНОВЛЕНИЕ БЛОКА AI ИСТОРИИ ---
                    const aiContent = document.getElementById('ai-story-content');
                    const btnRegenAi = document.getElementById('btn-regen-ai');

                    if (r.aiStory && r.aiStory.text) {
                        let aiHtml = '';
                        if (r.aiStory.image) aiHtml += `<img src="${r.aiStory.image}" style="width: 100%; max-width: 100%; height: auto; display: block; border-radius: 6px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); object-fit: cover;">`;
                        aiHtml += `<div style="text-align: justify; text-indent: 15px;">${r.aiStory.text.replace(/\n/g, '<br><br>')}</div>`;
                        if (aiContent) aiContent.innerHTML = aiHtml;
                    } else {
                        if (aiContent) aiContent.innerHTML = '<div style="opacity:0.6; text-align:center; padding:20px;">История для этого лота еще не добавлена.</div>';
                    }

                    if (btnRegenAi) {
                        if (UserSystem.currentUser && UserSystem.currentUser.email === 'info@locus.coffee') {
                            btnRegenAi.style.display = 'block';
                        } else {
                            btnRegenAi.style.display = 'none';
                        }
                    }

                } else {
                    currentActiveProduct = null;
                    const elTitle = document.getElementById('p-title');
                    if (elTitle) elTitle.textContent = seg.label;
                    const elCatDesc = document.getElementById('p-cat-desc');
                    if (elCatDesc) elCatDesc.textContent = seg.desc || "";
                    document.getElementById('p-simple-desc').textContent = "";
                    document.getElementById('p-mini-stats').innerHTML = ""; 
                    const grid = document.getElementById('cupping-data');
                    if (grid) grid.innerHTML = '';
                    const extGrid = document.getElementById('extrinsic-data');
                    if (extGrid) extGrid.innerHTML = '';
                    const elBuyArea = document.getElementById('p-buy-area');
                    if (elBuyArea) elBuyArea.style.display = 'none';
                    
                    // ВОЗВРАЩАЕМ ПЕРЕМЕННЫЕ И СЮДА
                    const toggleBtn = document.getElementById('btn-toggle-details');
                    const toggleExtBtn = document.getElementById('btn-toggle-extrinsic');
                    const toggleAiBtn = document.getElementById('btn-toggle-ai');
                    const lotDescWrapper = document.getElementById('lot-desc-wrapper');
                    
                    if(toggleBtn) toggleBtn.style.display = 'none';
                    if(toggleExtBtn) toggleExtBtn.style.display = 'none';
                    if(toggleAiBtn) toggleAiBtn.style.display = 'none';
                    if(lotDescWrapper) lotDescWrapper.style.display = 'none';
                }
                pInfo.style.display = 'flex';
                setTimeout(() => pInfo.classList.add('active'), 50);
            }, 250);
        }

        // ==========================================
        // ЛОГИКА ВКЛАДОК ДЛЯ ОПИСАНИЙ ЛОТА
        // ==========================================
        const btnDetails = document.getElementById('btn-toggle-details');
        const blockDetails = document.getElementById('detailed-stats-block');
        
        const btnExtrinsic = document.getElementById('btn-toggle-extrinsic');
        const blockExtrinsic = document.getElementById('extrinsic-stats-block');
        
        const btnAi = document.getElementById('btn-toggle-ai');
        const blockAi = document.getElementById('ai-story-block');

        function closeAllDescTabs() {
            if(blockDetails) blockDetails.style.display = 'none';
            if(blockExtrinsic) blockExtrinsic.style.display = 'none';
            if(blockAi) blockAi.style.display = 'none';
            
            if(btnDetails) btnDetails.classList.remove('active');
            if(btnExtrinsic) btnExtrinsic.classList.remove('active');
            if(btnAi) btnAi.classList.remove('active');
        }

        function scrollProductInfoToElement(element) {
            if (!element) return;
            requestAnimationFrame(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            });
        }

        function toggleDescTab(block, button, label) {
            if (!block || !button) {
                console.warn('[desc-tabs] missing refs', { label, hasBlock: !!block, hasButton: !!button });
                return;
            }

            const wasOpen = window.getComputedStyle(block).display !== 'none' && block.style.display !== 'none';
            closeAllDescTabs();

            if (!wasOpen) {
                block.style.display = 'block';
                button.classList.add('active');
                console.log('[desc-tabs] opened', label || block.id);
                scrollProductInfoToElement(block);
            } else {
                console.log('[desc-tabs] closed', label || block.id);
            }
        }

        if (btnDetails) {
            btnDetails.addEventListener('click', () => {
                toggleDescTab(blockDetails, btnDetails, 'details');
            });
        }

        if (btnExtrinsic) {
            btnExtrinsic.addEventListener('click', () => {
                toggleDescTab(blockExtrinsic, btnExtrinsic, 'extrinsic');
            });
        }

        if (btnAi) {
            btnAi.addEventListener('click', () => {
                toggleDescTab(blockAi, btnAi, 'ai-story');
            });
        }

        const btnRegenAi = document.getElementById('btn-regen-ai');
        if (btnRegenAi) {
            btnRegenAi.addEventListener('click', async function(e) {
                e.stopPropagation(); 
                if(!currentActiveProduct) return;
                
                const content = document.getElementById('ai-story-content');
                content.innerHTML = '<div style="text-align:center; padding: 30px 10px; opacity: 0.8;"><div class="loader" style="position:static; transform:none; display:inline-block; margin-bottom:10px;"></div><br>Нейросеть Qwen пишет новую историю...<br><span style="font-size:10px;">(Это может занять 15-30 секунд)</span></div>';
                
                try {
                    const reqData = {
                        action: 'generateLotStory',
                        sample: currentActiveProduct.sample,
                        country: currentActiveProduct.country || '',
                        region: currentActiveProduct.region || '',
                        farm: currentActiveProduct.farm || '',
                        producer: currentActiveProduct.producer || '',
                        variety: currentActiveProduct.variety || '',
                        processDesc: currentActiveProduct.processDesc || currentActiveProduct.processType || ''
                    };
                    
                    const token = localStorage.getItem('locus_token');
                    if(!token) throw new Error('Для генерации нужно войти как администратор');

                    const res = await fetch(LOCUS_API_URL + '?action=generateLotStory', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify(reqData)
                    });
                    
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error);
                    
                    currentActiveProduct.aiStory = { text: data.text, image: data.image };
                    const prodInCache = ALL_PRODUCTS_CACHE.find(p => p.sample === currentActiveProduct.sample);
                    if(prodInCache) prodInCache.aiStory = { text: data.text, image: data.image };

                    let html = '';
                    if (data.image) html += `<img src="${data.image}" style="width: 100%; max-width: 100%; height: auto; display: block; border-radius: 6px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); object-fit: cover;">`;
                    html += `<div style="text-align: justify; text-indent: 15px;">${data.text.replace(/\n/g, '<br><br>')}</div>`;
                    content.innerHTML = html;
                    
                } catch (err) { content.innerHTML = `<div style="color: #B66A58; text-align: center; padding: 20px;">Ошибка генерации: ${err.message}</div>`; }
            });
        }
        // --- КОНЕЦ: КНОПКИ AI ИСТОРИИ ---

        document.querySelectorAll('.weight-option').forEach(opt => {
            opt.addEventListener('click', function() {
                document.querySelectorAll('.weight-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                currentWeight = parseInt(this.getAttribute('data-w'));
                updatePriceDisplay();
            });
        });

        document.querySelectorAll('.grind-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.grind-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentGrind = this.getAttribute('data-grind');
            });
        });

        function renderWheel() {
            const spin = document.getElementById('wheel-spinner');
            if (!spin) return;
            spin.innerHTML = '';
            const size = 800, cx = 400, cy = 400;
            const radii = [{ in: 75, out: 220 }, { in: 220, out: 400 }];
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
            spin.appendChild(svg);

            const polarToCartesian = (cX, cY, r, a) => {
                const rad = (a - 90) * Math.PI / 180.0;
                return { x: cX + (r * Math.cos(rad)), y: cY + (r * Math.sin(rad)) };
            };

            const describeArc = (x, y, iR, oR, sA, eA) => {
                const s = polarToCartesian(x, y, oR, eA), e = polarToCartesian(x, y, oR, sA);
                const si = polarToCartesian(x, y, iR, eA), ei = polarToCartesian(x, y, iR, sA);
                const large = eA - sA <= 180 ? "0" : "1";
                return [ "M", s.x, s.y, "A", oR, oR, 0, large, 0, e.x, e.y, "L", ei.x, ei.y, "A", iR, iR, 0, large, 1, si.x, si.y, "Z" ].join(" ");
            };

            let segments = [];
            let curAngle = 0;
            const total = SHOP_DATA.reduce((acc, cat) => acc + cat.children.length, 0);

            SHOP_DATA.forEach(cat => {
                if(cat.children.length === 0) return;
                const catA = (cat.children.length / total) * 360;
                segments.push({ ...cat, start: curAngle, end: curAngle + catA, depth: 0 });
                let childCur = curAngle;
                cat.children.forEach(child => {
                    const childA = catA / cat.children.length;
                    segments.push({ ...child, start: childCur, end: childCur + childA, depth: 1 });
                    childCur += childA;
                });
                curAngle += catA;
            });

            segments.forEach(seg => {
                const { in: iR, out: oR } = radii[seg.depth];
                const g = document.createElementNS(svgNS, "g");
                
                // БЕЗОПАСНАЯ ПРИВЯЗКА: Добавляем метку только для лотов
                if (seg.raw && seg.raw.sample) {
                    g.setAttribute('data-lot', seg.raw.sample);
                }
                
                const path = document.createElementNS(svgNS, "path");
                path.setAttribute("d", describeArc(cx, cy, iR, oR, seg.start, seg.end));
                path.setAttribute("fill", seg.color);
                path.setAttribute("stroke", "var(--locus-bg)"); 
                path.setAttribute("stroke-width", "1.5");
                
                const mid = (seg.start + seg.end) / 2;
                const textPos = polarToCartesian(cx, cy, iR + (oR - iR)/2, mid);
                const text = document.createElementNS(svgNS, "text");
                text.setAttribute("x", textPos.x); text.setAttribute("y", textPos.y);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("transform", `rotate(${mid - 90}, ${textPos.x}, ${textPos.y})`);
                
                seg.label.split('\n').forEach((l, i) => {
                    const tspan = document.createElementNS(svgNS, "tspan");
                    tspan.textContent = l; tspan.setAttribute("x", textPos.x);
                    if(i > 0) tspan.setAttribute("dy", "1.2em");
                    text.appendChild(tspan);
                });

                g.appendChild(path); g.appendChild(text);
                g.addEventListener('click', () => {
                    if (Math.abs(velocity) > 0.5) return;
                    if (seg.raw?.externalUrl) {
                        openExternalProductUrl(seg.raw);
                        return;
                    }
                    svg.querySelectorAll('path').forEach(p => p.classList.remove('selected'));
                    path.classList.add('selected');
                    updateInfo(seg);

                    // ОБНОВЛЯЕМ АДРЕСНУЮ СТРОКУ ДЛЯ ПРЯМОЙ ССЫЛКИ
                    // ОБНОВЛЯЕМ АДРЕСНУЮ СТРОКУ ДЛЯ ПРЯМОЙ ССЫЛКИ
                    const url = new URL(window.location);
                    if (seg.raw && seg.raw.sample) {
                        url.searchParams.set('lot', seg.raw.sample);
                    } else {
                        url.searchParams.delete('lot'); // Если кликнули на категорию, очищаем ссылку
                    }
                    window.history.replaceState({}, '', url);
                });
                svg.appendChild(g);
            });

            const center = document.createElementNS(svgNS, "circle");
            center.setAttribute("cx", cx); center.setAttribute("cy", cy); center.setAttribute("r", 78);
            center.setAttribute("fill", "var(--locus-bg)");
            center.setAttribute("cursor", "pointer");
            center.addEventListener('click', window.resetInfo);
            svg.appendChild(center);
            
            const brand = document.createElementNS(svgNS, "text");
            brand.setAttribute("x", cx); brand.setAttribute("y", cy);
            brand.setAttribute("class", "brand-logo-center");
            brand.textContent = "LOCUS COFFEE";
            svg.appendChild(brand);

            spin.style.opacity = "1";
            const loader = document.getElementById('loading-overlay');
            if (loader) loader.style.display = "none";
        }

        function animate() {
            if (!isDragging) { 
                if (Math.abs(velocity) > 0.05) { 
                    rotation += velocity; 
                    velocity *= 0.95; 
                    
                    // --- АНТИ-ЧИТ СИСТЕМА (УСИЛЕННАЯ) ---
                    if (window.fortuneMode) {
                        // Постоянно записываем максимальную скорость броска
                        if (Math.abs(velocity) > (window.fortuneMaxVelocity || 0)) {
                            window.fortuneMaxVelocity = Math.abs(velocity);
                        }
                        // Порог блокировки увеличен в 2 раза (было 2, стало 4)
                        if (Math.abs(velocity) > 8) {
                            window.fortuneLocked = true; 
                        }
                    }
                } else { 
                    velocity = 0; 
                    
                    // Колесо полностью остановилось
                    if (window.fortuneMode && !window.wheelSpun) {
                        if (window.fortuneLocked) {
                            // ЧЕСТНЫЙ БРОСОК: Колесо крутилось быстро
                            window.wheelSpun = true;
                            setTimeout(() => window.FortuneSystem.checkWin(), 500);
                        } else if (window.fortuneMaxVelocity > 0.5) { 
                            // ХИТРЫЙ/СЛАБЫЙ БРОСОК: Крутнули, но недостаточно сильно
                            window.fortuneMaxVelocity = 0; // Сбрасываем скорость
                            alert("Нужно сильнее! Скидка ждет вас! :)");
                        }
                    }
                } 
            }
            if (spinnerElem) {
                const scale = window.innerWidth >= 768 ? 1 : 0.8;
                spinnerElem.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`;
            }
            requestAnimationFrame(animate);
        }
        animate();

        function initWheelInteraction() {
            zone = document.getElementById('wheel-zone');
            spinnerElem = document.getElementById('wheel-spinner');
            if (zone) {
                zone.addEventListener('mousedown', e => { if (window.fortuneLocked) return; isDragging = true; velocity = 0; lastAngle = getAngle(e.clientX, e.clientY); lastTime = Date.now(); });
                window.addEventListener('mousemove', e => moveH(e.clientX, e.clientY));
                window.addEventListener('mouseup', () => isDragging = false);
                zone.addEventListener('touchstart', e => { if (window.fortuneLocked) return; isDragging = true; velocity = 0; lastAngle = getAngle(e.touches[0].clientX, e.touches[0].clientY); lastTime = Date.now(); }, {passive: false});
                window.addEventListener('touchmove', e => moveH(e.touches[0].clientX, e.touches[0].clientY), {passive: false});
                window.addEventListener('touchend', () => isDragging = false);
            }
        }
        
        // --- MESSAGING SYSTEM (Internal Mail) ---
        // --- НАЧАЛО: СИСТЕМА СООБЩЕНИЙ YDB ---
        const MessageSystem = {
            init: function() {
                const btnSend = document.getElementById('btn-send-feedback');
                if(btnSend) {
                    btnSend.onclick = () => {
                        const txtEl = document.getElementById('feedback-text');
                        const txt = txtEl ? txtEl.value.trim() : '';
                        if(!txt) return alert('Введите сообщение');
                        this.sendMessageToAdmin(txt);
                        txtEl.value = '';
                    };
                }
            },
            
            sendMessageToAdmin: async function(text, subject = 'Сообщение с сайта') {
                if(!UserSystem.uid) return alert('Нужно войти');
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=sendMessage', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'sendMessage', direction: 'to_admin', subject: subject, text: text, userEmail: UserSystem.currentUser.email })
                    });
                    alert('Сообщение отправлено!');
                    const mailLink = `mailto:info@locus.coffee?subject=${encodeURIComponent(subject)} от ${UserSystem.currentUser.email}&body=${encodeURIComponent(text)}`;
                    window.open(mailLink, '_blank');
                    this.loadMessagesForUser();
                } catch(e) { console.error(e); alert('Ошибка отправки'); }
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
                }, this.adminPollingIntervalMs);
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
                    const res = await fetch(LOCUS_API_URL + '?action=markAdminMessagesRead', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'markAdminMessagesRead' })
                    });
                    const data = await res.json();
                    return !!data.success;
                } catch(e) {
                    console.error(e);
                    return false;
                }
            },

            submitUserReply: async function(msgId, subject) {
                const txt = document.getElementById(`user-reply-text-${msgId}`).value;
                if(!txt) return;
                const replySubject = subject.startsWith('Re:') ? subject : 'Re: ' + subject;
                await this.sendMessageToAdmin(txt, replySubject);
            },
            
            replyToUser: async function(userId, subject, text) {
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=sendMessage', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'sendMessage', direction: 'to_user', targetUserId: userId, subject: 'Re: ' + subject, text: text })
                    });
                    alert('Ответ отправлен');
                    this.loadMessagesForAdmin();
                } catch(e) { console.error(e); }
            },
            
            deleteMessage: async function(msgId, side) {
                if(!confirm('Удалить переписку из вашего списка?')) return;
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=deleteMessage', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'deleteMessage', msgId: msgId, side: side })
                    });
                    if (side === 'admin') this.loadMessagesForAdmin();
                    else this.loadMessagesForUser();
                } catch(e) { console.error(e); }
            },
            
            loadMessagesForAdmin: async function() {
                const container = document.getElementById('admin-messages-list');
                if(!container) return;
                container.innerHTML = 'Загрузка...';
                const token = localStorage.getItem('locus_token');
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getAdminMessages', { headers: { 'X-Auth-Token': token } });
                    const data = await res.json();
                    container.innerHTML = '';
                    if (!data.success) throw new Error(data.error);
                    
                    let msgs = data.messages;
                    if(msgs.length === 0) { container.innerHTML = 'Нет сообщений'; return; }

                    msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    msgs.forEach(m => {
                        const isToAdmin = m.direction === 'to_admin';
                        const el = document.createElement('div');
                        el.className = 'msg-item';
                        const replyFormId = `reply-form-${m.id}`;
                        
                        el.innerHTML = `
                            <div class="msg-header">
                                <span>${new Date(m.timestamp).toLocaleString()}</span>
                                <span style="font-weight:bold; color:${isToAdmin ? '#B66A58' : 'gray'}">${isToAdmin ? 'От: ' + (m.userEmail || m.userId) : 'Вы ответили'}</span>
                            </div>
                            <div class="msg-subject">${m.subject || 'Без темы'}</div>
                            <div class="msg-body">${m.text}</div>
                            <div style="display:flex; justify-content:space-between;">
                                ${isToAdmin ? `<button class="lc-btn" style="width:auto; padding:5px 15px; font-size:10px;" onclick="document.getElementById('${replyFormId}').classList.toggle('active')">Ответить</button>` : '<div></div>'}
                                <button onclick="MessageSystem.deleteMessage('${m.id}', 'admin')" style="color:#B66A58; border:none; background:none; cursor:pointer;">&times; Удалить</button>
                            </div>
                            <div id="${replyFormId}" class="msg-reply-area">
                                <textarea id="reply-text-${m.id}" class="lc-input" placeholder="Текст ответа..." style="height:60px;"></textarea>
                                <button class="lc-btn" onclick="MessageSystem.submitReply('${m.id}', '${m.userId}', '${m.subject}')">Отправить</button>
                            </div>
                        `;
                        container.appendChild(el);
                    });
                } catch(e) { console.error(e); container.innerHTML = 'Ошибка загрузки'; }
            },
            
            submitReply: async function(msgId, userId, subject) {
                const txt = document.getElementById(`reply-text-${msgId}`).value;
                if(!txt) return;
                await this.replyToUser(userId, subject, txt);
            },
            
            loadMessagesForUser: async function() {
                const container = document.getElementById('user-messages-list');
                if(!container || !UserSystem.uid) return;
                container.innerHTML = 'Загрузка...';
                const token = localStorage.getItem('locus_token');
                
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getUserMessages', { headers: { 'X-Auth-Token': token } });
                    const data = await res.json();
                    container.innerHTML = '';
                    if (!data.success) throw new Error(data.error);
                    
                    let msgs = data.messages;
                    if(msgs.length === 0) { container.innerHTML = '<div style="opacity:0.5; font-size:11px">Нет сообщений</div>'; return; }

                    msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    msgs.forEach(m => {
                        const isToUser = m.direction === 'to_user';
                        const el = document.createElement('div');
                        el.className = 'msg-item';
                        el.style.borderLeft = isToUser ? '4px solid var(--locus-dark)' : '1px solid var(--locus-border)';
                        
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
                } catch(e) { console.error(e); container.innerHTML = '<div style="color:red; font-size:10px;">Ошибка загрузки</div>'; }
            }
        };
        MessageSystem.sendMessageToAdmin = async function(text, subject = 'РЎРѕРѕР±С‰РµРЅРёРµ СЃ СЃР°Р№С‚Р°') {
            if(!UserSystem.uid) return alert('РќСѓР¶РЅРѕ РІРѕР№С‚Рё');
            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(LOCUS_API_URL + '?action=sendMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sendMessage', direction: 'to_admin', subject: subject, text: text, userEmail: UserSystem.currentUser.email })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё');
                alert('РЎРѕРѕР±С‰РµРЅРёРµ РѕС‚РїСЂР°РІР»РµРЅРѕ!');
                this.loadMessagesForUser();
            } catch(e) {
                console.error(e);
                alert('РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё');
            }
        };
        MessageSystem.replyToUser = async function(userId, subject, text) {
            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(LOCUS_API_URL + '?action=sendMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sendMessage', direction: 'to_user', targetUserId: userId, subject: 'Re: ' + subject, text: text })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё');
                alert('РћС‚РІРµС‚ РѕС‚РїСЂР°РІР»РµРЅ');
                this.loadMessagesForAdmin({ markAsRead: this.isAdminMessagesTabActive() });
            } catch(e) {
                console.error(e);
            }
        };
        MessageSystem.deleteMessage = async function(msgId, side) {
            if(!confirm('РЈРґР°Р»РёС‚СЊ РїРµСЂРµРїРёСЃРєСѓ РёР· РІР°С€РµРіРѕ СЃРїРёСЃРєР°?')) return;
            const token = localStorage.getItem('locus_token');
            try {
                await fetch(LOCUS_API_URL + '?action=deleteMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteMessage', msgId: msgId, side: side })
                });
                if (side === 'admin') this.loadMessagesForAdmin({ markAsRead: this.isAdminMessagesTabActive() });
                else this.loadMessagesForUser();
            } catch(e) {
                console.error(e);
            }
        };
        MessageSystem.loadMessagesForAdmin = async function(options = {}) {
            const {
                renderList = true,
                showLoading = renderList,
                markAsRead = this.isAdminMessagesTabActive()
            } = options;
            const container = document.getElementById('admin-messages-list');
            if(renderList && !container) return;
            if(showLoading && container) container.innerHTML = 'Р—Р°РіСЂСѓР·РєР°...';
            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(LOCUS_API_URL + '?action=getAdminMessages', { headers: { 'X-Auth-Token': token } });
                const data = await res.json();
                if (!data.success) throw new Error(data.error);

                let msgs = Array.isArray(data.messages) ? data.messages : [];
                msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                const unreadIncomingCount = msgs.filter(m => m.direction === 'to_admin' && m.isRead !== true).length;
                this.updateAdminUnreadBadge(unreadIncomingCount);

                if (markAsRead && unreadIncomingCount > 0) {
                    const markSuccess = await this.markAdminMessagesRead();
                    if (markSuccess) {
                        msgs = msgs.map(m => m.direction === 'to_admin' ? { ...m, isRead: true } : m);
                        this.updateAdminUnreadBadge(0);
                    }
                }

                if (!renderList) return;

                container.innerHTML = '';
                if(msgs.length === 0) {
                    container.innerHTML = 'РќРµС‚ СЃРѕРѕР±С‰РµРЅРёР№';
                    return;
                }

                msgs.forEach(m => {
                    const isToAdmin = m.direction === 'to_admin';
                    const el = document.createElement('div');
                    el.className = `msg-item${isToAdmin && m.isRead !== true ? ' is-unread' : ''}`;
                    const replyFormId = `reply-form-${m.id}`;

                    el.innerHTML = `
                        <div class="msg-header">
                            <span>${new Date(m.timestamp).toLocaleString()}</span>
                            <span style="font-weight:bold; color:${isToAdmin ? '#B66A58' : 'gray'}">${isToAdmin ? 'РћС‚: ' + (m.userEmail || m.userId) : 'Р’С‹ РѕС‚РІРµС‚РёР»Рё'}</span>
                        </div>
                        <div class="msg-subject">${m.subject || 'Р‘РµР· С‚РµРјС‹'}</div>
                        <div class="msg-body">${m.text}</div>
                        <div style="display:flex; justify-content:space-between;">
                            ${isToAdmin ? `<button class="lc-btn" style="width:auto; padding:5px 15px; font-size:10px;" onclick="document.getElementById('${replyFormId}').classList.toggle('active')">РћС‚РІРµС‚РёС‚СЊ</button>` : '<div></div>'}
                            <button onclick="MessageSystem.deleteMessage('${m.id}', 'admin')" style="color:#B66A58; border:none; background:none; cursor:pointer;">&times; РЈРґР°Р»РёС‚СЊ</button>
                        </div>
                        <div id="${replyFormId}" class="msg-reply-area">
                            <textarea id="reply-text-${m.id}" class="lc-input" placeholder="РўРµРєСЃС‚ РѕС‚РІРµС‚Р°..." style="height:60px;"></textarea>
                            <button class="lc-btn" onclick="MessageSystem.submitReply('${m.id}', '${m.userId}', '${m.subject}')">РћС‚РїСЂР°РІРёС‚СЊ</button>
                        </div>
                    `;
                    container.appendChild(el);
                });
            } catch(e) {
                console.error(e);
                if (renderList && container) container.innerHTML = 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё';
            }
        };
        window.MessageSystem = MessageSystem;
        MessageSystem.sendMessageToAdmin = async function(text, subject = '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u0441 \u0441\u0430\u0439\u0442\u0430') {
            if (!UserSystem.uid) return alert('\u041d\u0443\u0436\u043d\u043e \u0432\u043e\u0439\u0442\u0438');
            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(LOCUS_API_URL + '?action=sendMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sendMessage', direction: 'to_admin', subject, text, userEmail: UserSystem.currentUser.email })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || '\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438');
                alert('\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e!');
                this.loadMessagesForUser();
            } catch (e) {
                console.error(e);
                alert('\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438');
            }
        };
        MessageSystem.replyToUser = async function(userId, subject, text) {
            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(LOCUS_API_URL + '?action=sendMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sendMessage', direction: 'to_user', targetUserId: userId, subject: 'Re: ' + subject, text })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || '\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438');
                alert('\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d');
                this.loadMessagesForAdmin({ markAsRead: this.isAdminMessagesTabActive() });
            } catch (e) {
                console.error(e);
            }
        };
        MessageSystem.deleteMessage = async function(msgId, side) {
            if (!confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0435\u0440\u0435\u043f\u0438\u0441\u043a\u0443 \u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043e \u0441\u043f\u0438\u0441\u043a\u0430?')) return;
            const token = localStorage.getItem('locus_token');
            try {
                await fetch(LOCUS_API_URL + '?action=deleteMessage', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteMessage', msgId, side })
                });
                if (side === 'admin') this.loadMessagesForAdmin({ markAsRead: this.isAdminMessagesTabActive() });
                else this.loadMessagesForUser();
            } catch (e) {
                console.error(e);
            }
        };
        MessageSystem.loadMessagesForAdmin = async function(options = {}) {
            const {
                renderList = true,
                showLoading = renderList,
                markAsRead = this.isAdminMessagesTabActive()
            } = options;
            const container = document.getElementById('admin-messages-list');
            if (renderList && !container) return;
            if (showLoading && container) container.innerHTML = '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...';
            const token = localStorage.getItem('locus_token');
            try {
                const res = await fetch(LOCUS_API_URL + '?action=getAdminMessages', { headers: { 'X-Auth-Token': token } });
                const data = await res.json();
                if (!data.success) throw new Error(data.error);
                let msgs = Array.isArray(data.messages) ? data.messages : [];
                msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                const unreadIncomingCount = msgs.filter(m => m.direction === 'to_admin' && m.isRead !== true).length;
                this.updateAdminUnreadBadge(unreadIncomingCount);
                if (markAsRead && unreadIncomingCount > 0) {
                    const markSuccess = await this.markAdminMessagesRead();
                    if (markSuccess) {
                        msgs = msgs.map(m => m.direction === 'to_admin' ? { ...m, isRead: true } : m);
                        this.updateAdminUnreadBadge(0);
                    }
                }
                if (!renderList) return;
                container.innerHTML = '';
                if (msgs.length === 0) {
                    container.innerHTML = '\u041d\u0435\u0442 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439';
                    return;
                }
                msgs.forEach(m => {
                    const isToAdmin = m.direction === 'to_admin';
                    const el = document.createElement('div');
                    el.className = `msg-item${isToAdmin && m.isRead !== true ? ' is-unread' : ''}`;
                    const replyFormId = `reply-form-${m.id}`;
                    el.innerHTML = `
                        <div class="msg-header">
                            <span>${new Date(m.timestamp).toLocaleString()}</span>
                            <span style="font-weight:bold; color:${isToAdmin ? '#B66A58' : 'gray'}">${isToAdmin ? '\u041e\u0442: ' + (m.userEmail || m.userId) : '\u0412\u044b \u043e\u0442\u0432\u0435\u0442\u0438\u043b\u0438'}</span>
                        </div>
                        <div class="msg-subject">${m.subject || '\u0411\u0435\u0437 \u0442\u0435\u043c\u044b'}</div>
                        <div class="msg-body">${m.text}</div>
                        <div style="display:flex; justify-content:space-between;">
                            ${isToAdmin ? `<button class="lc-btn" style="width:auto; padding:5px 15px; font-size:10px;" onclick="document.getElementById('${replyFormId}').classList.toggle('active')">\u041e\u0442\u0432\u0435\u0442\u0438\u0442\u044c</button>` : '<div></div>'}
                            <button onclick="MessageSystem.deleteMessage('${m.id}', 'admin')" style="color:#B66A58; border:none; background:none; cursor:pointer;">&times; \u0423\u0434\u0430\u043b\u0438\u0442\u044c</button>
                        </div>
                        <div id="${replyFormId}" class="msg-reply-area">
                            <textarea id="reply-text-${m.id}" class="lc-input" placeholder="\u0422\u0435\u043a\u0441\u0442 \u043e\u0442\u0432\u0435\u0442\u0430..." style="height:60px;"></textarea>
                            <button class="lc-btn" onclick="MessageSystem.submitReply('${m.id}', '${m.userId}', '${m.subject}')">\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c</button>
                        </div>
                    `;
                    container.appendChild(el);
                });
            } catch (e) {
                console.error(e);
                if (renderList && container) container.innerHTML = '\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438';
            }
        };
        window.MessageSystem = MessageSystem;
        // --- КОНЕЦ: СИСТЕМА СООБЩЕНИЙ YDB ---

        // --- PROMOTION SYSTEM (ACTIONS V2) ---
        const PromotionSystem = {
            activeAction: null,
            queue: [],
            
            init: function() {
                const typeSel = document.getElementById('action-type');
                if(typeSel) typeSel.addEventListener('change', function() {
                    const codeWrap = document.getElementById('action-code-wrapper');
                    codeWrap.style.display = this.value === 'discount' ? 'block' : 'none';
                });
                
                const btnAction = document.getElementById('btn-promo-action');
                const btnClose = document.getElementById('btn-promo-close');
                if(btnAction) btnAction.onclick = () => this.handleUserAction(true);
                if(btnClose) btnClose.onclick = () => this.handleUserAction(false);
            },
            
            // --- НАЧАЛО: АКЦИИ YDB ---
            loadActionsList: async function() {
                const container = document.getElementById('admin-actions-list');
                if(!container) return;
                container.innerHTML = 'Загрузка...';
                const token = localStorage.getItem('locus_token');
                if(!token) return container.innerHTML = 'Нет доступа';

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getActions', { headers: { 'X-Auth-Token': token } });
                    const data = await res.json();
                    container.innerHTML = '';
                    if(!data.success) throw new Error(data.error);
                    if(data.actions.length === 0) { container.innerHTML = '<div style="opacity:0.5; font-size:12px;">Нет акций</div>'; return; }
                    
                    let actions = data.actions;
                    // Сортировка по дате создания (новые сверху)
                    actions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

                    actions.forEach(a => {
                        const el = document.createElement('div');
                        el.className = 'promo-list-item';
                        
                        let details = `Тип: ${a.type === 'discount' ? 'Скидка' : 'Инфо'}`;
                        if (a.type === 'discount') details += `<br>Код: <b>${a.promoCode}</b> (${a.discountVal}${a.discountType === 'percent' ? '%' : '₽'})`;
                        if (a.limit) details += `<br>Лимит показов: ${a.limit}`;
                        if (a.dateEnd) details += `<br>До: ${a.dateEnd}`;

                        el.innerHTML = `
                            <div style="flex:1; margin-right:15px;">
                                <div style="font-weight:bold; font-size:12px;">${a.title}</div>
                                <div style="font-size:10px; opacity:0.7; margin-top:4px; line-height:1.4;">${details}</div>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <label style="font-size:10px; display:flex; align-items:center; gap:4px;">
                                    <input type="checkbox" ${a.active ? 'checked' : ''} onchange="PromotionSystem.toggleAction('${a.id}', this.checked, '${a.promoCode || ''}')"> Актив
                                </label>
                                <button onclick="PromotionSystem.deleteAction('${a.id}', '${a.promoCode || ''}')" style="color:#B66A58; border:none; background:none; cursor:pointer; font-size:16px;">&times;</button>
                            </div>
                        `;
                        container.appendChild(el);
                    });
                } catch(e) { console.error(e); container.innerHTML = 'Ошибка загрузки'; }
            },

            saveAction: async function() {
                const title = document.getElementById('action-title').value.trim();
                const msg = document.getElementById('action-msg').value.trim();
                const type = document.getElementById('action-type').value;
                const limit = parseInt(document.getElementById('action-limit').value) || 1;
                
                if (!title || !msg) return alert('Заполните Заголовок и Сообщение');

                let promoCode = '';
                let discountVal = 0;
                let discountType = 'percent';

                if (type === 'discount') {
                    promoCode = document.getElementById('action-promo-code').value.toUpperCase().trim();
                    discountVal = parseFloat(document.getElementById('action-discount-val').value) || 0;
                    discountType = document.getElementById('action-discount-type').value;
                    if (!promoCode || !discountVal) return alert('Для скидки укажите Промокод и Размер скидки');
                }

                const data = {
                    action: 'saveAction',
                    title: title, msg: msg, type: type,
                    promoCode: promoCode, discountVal: discountVal, discountType: discountType,
                    limit: limit,
                    dateEnd: document.getElementById('action-date-end').value,
                    active: document.getElementById('action-is-active').checked,
                    createdAt: new Date().toISOString()
                };
                
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=saveAction', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    alert('Акция сохранена!');
                    this.loadActionsList();
                    // Очистка полей
                    document.getElementById('action-title').value = '';
                    document.getElementById('action-msg').value = '';
                    if(type === 'discount') {
                        document.getElementById('action-promo-code').value = '';
                        document.getElementById('action-discount-val').value = '';
                    }
                } catch(e) { alert('Ошибка: ' + e.message); }
            },
            
            toggleAction: async function(id, status, promoCode) {
                const token = localStorage.getItem('locus_token');
                try { 
                    await fetch(LOCUS_API_URL + '?action=toggleAction', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'toggleAction', id: id, active: status, promoCode: promoCode })
                    });
                } catch(e) { console.error(e); }
            },
            
            deleteAction: async function(id, promoCode) {
                if(!confirm('Удалить акцию?')) return;
                const token = localStorage.getItem('locus_token');
                try { 
                    await fetch(LOCUS_API_URL + '?action=deleteAction', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'deleteAction', id: id, promoCode: promoCode })
                    });
                    this.loadActionsList(); 
                } catch(e) { console.error(e); }
            },

            checkAndShow: async function() {
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getActiveActions');
                    const data = await res.json();
                    
                    if(!data.success || data.actions.length === 0) return;
                    
                    this.queue = [];
                    const now = new Date();
                    
                    // Безопасно достаем userId из токена для ведения счетчика просмотров
                    let userKeyPart = 'guest';
                    const token = localStorage.getItem('locus_token');
                    if(token) {
                        try { userKeyPart = JSON.parse(atob(token.split('.')[1])).userId; } catch(e) {}
                    }

                    data.actions.forEach(promo => {
                        if(promo.dateEnd) {
                            const end = new Date(promo.dateEnd);
                            if(now > end) return; 
                        }
                        
                        const seenKey = `locus_promo_seen_${promo.id}_${userKeyPart}`;
                        const acceptedKey = `locus_promo_accepted_${promo.id}_${userKeyPart}`;
                        
                        if (localStorage.getItem(acceptedKey) === 'true') return;
                        const seenCount = parseInt(localStorage.getItem(seenKey)) || 0;
                        
                        if(seenCount < promo.limit) {
                            this.queue.push(promo);
                        }
                    });

                    this.queue.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
                    this.showNext();

                } catch(e) { console.error(e); }
            },
            // --- КОНЕЦ: АКЦИИ YDB ---
            // --- НАЧАЛО: ЛОГИКА ПОКАЗОВ И СЧЕТЧИКОВ ---
            showNext: function() {
                if(this.queue.length === 0) return;
                
                const nextPromo = this.queue.shift(); 
                this.activeAction = nextPromo;
                this.showPopup(nextPromo);

                // Безопасное извлечение ID пользователя без Firebase
                let userKeyPart = 'guest';
                const token = localStorage.getItem('locus_token');
                if(token) {
                    try { userKeyPart = JSON.parse(atob(token.split('.')[1])).userId; } catch(e) {}
                }

                // Увеличиваем счетчик просмотров
                const seenKey = `locus_promo_seen_${nextPromo.id}_${userKeyPart}`;
                const seenCount = parseInt(localStorage.getItem(seenKey)) || 0;
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
                
                if(promo.type === 'discount') {
                    btn.textContent = "Получить скидку";
                    close.textContent = "Отказаться";
                } else {
                    btn.textContent = "Понятно"; 
                    close.textContent = "Закрыть";
                }
                
                overlay.classList.add('active');
            },

            handleUserAction: function(isPrimary) {
                const overlay = document.getElementById('promo-popup');
                overlay.classList.remove('active');
                
                let userKeyPart = 'guest';
                const token = localStorage.getItem('locus_token');
                if(token) {
                    try { userKeyPart = JSON.parse(atob(token.split('.')[1])).userId; } catch(e) {}
                }
                
                if(isPrimary && this.activeAction) {
                    // Если нажали главную кнопку - ставим вечную метку "принято"
                    localStorage.setItem(`locus_promo_accepted_${this.activeAction.id}_${userKeyPart}`, 'true');

                    if (this.activeAction.type === 'discount') {
                        const code = this.activeAction.promoCode;
                        if(code) {
                            const cartInput = document.getElementById('cart-promo-input');
                            if(cartInput) cartInput.value = code;
                            
                            // Безопасный вызов UserSystem
                            if(window.UserSystem && window.UserSystem.uid) {
                                window.UserSystem.toggleModal(true, 'cart');
                                window.UserSystem.applyPromo(); 
                            } else if (window.UserSystem) {
                                alert(`Код ${code} скопирован! Авторизуйтесь, чтобы применить его.`);
                                window.UserSystem.toggleModal(true, 'login');
                            }
                        }
                    }
                }
                
                // Проверяем, есть ли еще акции в очереди
                setTimeout(() => {
                    this.showNext();
                }, 500);
            }
            // --- КОНЕЦ: ЛОГИКА ПОКАЗОВ И СЧЕТЧИКОВ ---
        };
        window.PromotionSystem = PromotionSystem;
        window.MessageSystem = MessageSystem;

            // --- CATALOG SYSTEM (Управление каппингами) ---
        const CatalogSystem = {
            ALL_PRODUCTS: [],
            PACK_PREVIEW_BASE_IMAGE: 'https://i.ibb.co/tTrM8NG7/locus-pack.png',

            switchTab: function(tabName) {
                document.querySelectorAll('.cat-tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.cat-tab-content').forEach(content => content.classList.remove('active'));
                if (tabName === 'active') {
                    document.querySelectorAll('.cat-tab-btn')[0].classList.add('active');
                    document.getElementById('cat-tab-active').classList.add('active');
                } else {
                    document.querySelectorAll('.cat-tab-btn')[1].classList.add('active');
                    document.getElementById('cat-tab-inactive').classList.add('active');
                }
            },

            loadData: async function() {
                const containerA = document.getElementById('catalog-list-active');
                if(!containerA) return;
                containerA.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Загрузка базы данных...</div>';
                document.getElementById('catalog-list-inactive').innerHTML = '';

                try {
                    const response = await fetch(YANDEX_FUNCTION_URL + "?type=catalog");
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || "Ошибка сервера");

                    this.ALL_PRODUCTS = [];
                    result.data.forEach((r) => {
                        if (r.sample_no) {
                            this.ALL_PRODUCTS.push({
                                id: r.id, cuppingDate: r.cupping_date, sample: r.sample_no, roast: r.roast_level, 
                                smellInt: r.fragrance, aromaInt: r.aroma, aromaDesc: r.aroma_descriptors, aromaNotes: r.aroma_notes, 
                                flavorInt: r.flavor, atInt: r.aftertaste, flavorDesc: r.flavor_descriptors, mainFlavors: r.main_tastes, 
                                flavorNotes: r.flavor_notes, acidInt: r.acidity, acidNotes: r.acidity_notes, sweetInt: r.sweetness, 
                                sweetNotes: r.sweetness_notes, bodyInt: r.mouthfeel, bodyDesc: r.mouthfeel_descriptors, bodyNotes: r.mouthfeel_notes, 
                                inCatalog: r.in_catalogue, category: r.category, price: r.price,
                                imageUrl: r.image_url, customDesc: r.custom_desc
                            });
                        }
                    });
                    
                    if (this.ALL_PRODUCTS.length === 0) {
                        containerA.innerHTML = `<div class="empty-msg">База данных пуста</div>`;
                        return;
                    }
                    this.renderCatalog();
                } catch (e) {
                    containerA.innerHTML = `<div style="color:#B66A58; text-align:center; padding:20px;">Ошибка загрузки:<br>${e.message}</div>`;
                }
            },

            renderCatalog: function() {
                const containerActive = document.getElementById('catalog-list-active');
                const containerInactive = document.getElementById('catalog-list-inactive');
                containerActive.innerHTML = ''; containerInactive.innerHTML = '';

                const groupsA = { 'Эспрессо': [], 'Фильтр': [], 'Ароматизация': [], 'Аксессуары': [], 'Информация': [] };
                const groupsI = { 'Эспрессо': [], 'Фильтр': [], 'Ароматизация': [], 'Аксессуары': [], 'Информация': [] };

                let activeCount = 0; let inactiveCount = 0;

                this.ALL_PRODUCTS.forEach((r) => {
                    const cat = (r.category || '').toLowerCase();
                    let gName = 'Фильтр';
                    if (cat.includes('аксессуар')) gName = 'Аксессуары';
                    else if (cat.includes('информац')) gName = 'Информация';
                    else if (cat.includes('ароматизац')) gName = 'Ароматизация';
                    else if (cat.includes('эспрессо')) gName = 'Эспрессо'; // Сначала верим тексту
                    else if (cat.includes('фильтр')) gName = 'Фильтр';     // Сначала верим тексту
                    else if (parseFloat(r.roast) >= 10) gName = 'Эспрессо'; // Если не указано, смотрим на цифру

                    if (r.inCatalog === "1") { groupsA[gName].push(r); activeCount++; }
                    else { groupsI[gName].push(r); inactiveCount++; }
                });

                const appendGroupNodes = (groupsObj, container) => {
                    for (const [gName, items] of Object.entries(groupsObj)) {
                        // Сортируем элементы группы по алфавиту перед выводом
                        items.sort((a, b) => (a.sample || '').localeCompare(b.sample || ''));
                        
                        if (items.length > 0) {
                            const header = document.createElement('div');
                            header.style.cssText = 'background:#f4f1ea; border:1px solid #E5E1D8; padding:8px 12px; margin: 15px 0 10px; font-weight:bold; color:var(--locus-dark); border-radius:6px; text-transform:uppercase; font-size:12px; letter-spacing:1px;';
                            header.textContent = `${gName} (${items.length})`;
                            container.appendChild(header);

                            items.forEach(r => {
                                const isChecked = r.inCatalog === "1" ? "checked" : "";
                                const catStr = (r.category || '').toLowerCase();
                                const roastVal = parseFloat(r.roast) || 0;
                                
                                let typeText = 'ФИЛЬТР';
                                let typeColor = '#7A8F7C';
                                
                                if (catStr.includes('ароматизац')) {
                                    typeText = 'АРОМАТИЗАЦИЯ';
                                } else if (catStr.includes('эспрессо') || (!catStr.includes('фильтр') && roastVal >= 10)) {
                                    typeText = 'ЭСПРЕССО';
                                }

                                // Динамический цвет из колеса
                                if (typeof SHOP_DATA !== 'undefined') {
                                    const foundCat = SHOP_DATA.find(c => c.label === typeText);
                                    if (foundCat && foundCat.color) typeColor = foundCat.color;
                                }
                                
                                typeColor = muteColor(typeColor, PALETTE_CONFIG.catWeight, PALETTE_CONFIG.catGrey);
                                const typeSticker = `<span style="font-size:9px; background:${typeColor}; color:#fff; border-radius:3px; padding:2px 4px; margin-right:5px; vertical-align:middle; display:inline-block;">${typeText}</span>`;
                                const hasStickerPack = !ProductManager.getTypeInfo(r).isSpecial;
                                const blendLabel = ProductManager.isBlendProduct(r) ? ProductManager.getBlendBadgeHtml() : '';
                                const displaySampleName = ProductManager.getLotDisplayName(r);

                                const item = document.createElement('div');
                                item.className = 'catalog-item';
                                item.id = `cat-item-row-${r.id}`;

                                item.innerHTML = `
                                    <div class="catalog-item-header" onclick="CatalogSystem.toggleDetails('${r.id}')">
                                        <div class="item-title" style="display:flex; align-items:center; flex-wrap:wrap;">
                                            ${(gName==='Эспрессо'||gName==='Фильтр') ? typeSticker : ''}${blendLabel}<span>${displaySampleName}</span>
                                        </div>
                                        <div class="item-controls" onclick="event.stopPropagation()">
                                            <div class="cat-checkbox-wrapper">
                                                <span id="cat-status-${r.id}" class="save-status"></span>
                                                <input type="checkbox" id="cat-check-${r.id}" ${isChecked} onchange="CatalogSystem.updateCatalogRow('${r.id}', this)">
                                                В каталоге
                                            </div>
                                            <button class="cat-btn-icon" title="Редактировать лот" onclick="CatalogSystem.openEditMode('${r.id}', event)">
                                                <span style="font-size:9px; font-weight:700; letter-spacing:0.6px; line-height:1;">DE</span>
                                            </button>
                                            <button class="cat-btn-icon" title="Редактировать внешнюю форму" onclick="CatalogSystem.openExtrinsicEditMode('${r.id}', event)">
                                                <span style="font-size:9px; font-weight:700; letter-spacing:0.6px; line-height:1;">EX</span>
                                            </button>
                                            <button class="cat-btn-icon" title="Дублировать лот" onclick="CatalogSystem.duplicateRow('${r.id}', event)">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                            <button class="cat-btn-icon delete" id="cat-btn-delete-${r.id}" title="Удалить лот" onclick="CatalogSystem.deleteRow('${r.id}', '${r.sample}')">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                            ${hasStickerPack ? `<button class="cat-btn-icon" title="Отправить все наклейки на info@locus.coffee" onclick="CatalogSystem.sendStickerPackEmail('${r.id}', event)">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path><path d="M22 8l-10 7L2 8"></path></svg>
                                            </button>` : ''}
                                        </div>
                                    </div>
                                    <div class="catalog-item-content" id="cat-content-${r.id}">${this.getViewHtml(r)}</div>
                                `;
                                container.appendChild(item);
                            });
                        }
                    }
                };

                appendGroupNodes(groupsA, containerActive);
                appendGroupNodes(groupsI, containerInactive);

                if (activeCount === 0) containerActive.innerHTML = '<div class="empty-msg">Нет лотов в каталоге</div>';
                if (inactiveCount === 0) containerInactive.innerHTML = '<div class="empty-msg">Нет сохраненных каппингов</div>';
            },

            splitAromaStickerTitle: function(title) {
                const normalized = String(title || '').replace(/\s+/g, ' ').trim();
                if (!normalized) return { primary: '', secondary: '' };

                const shouldSplit = normalized.length > 15 || ((normalized.includes('-') || normalized.includes('/')) && normalized.length > 13);
                if (!shouldSplit) return { primary: normalized, secondary: '' };

                const candidates = [];
                for (let i = 0; i < normalized.length; i++) {
                    const ch = normalized[i];
                    if (ch === ' ' || ch === '-' || ch === '/' || ch === ',') candidates.push(i);
                }
                if (!candidates.length) return { primary: normalized, secondary: '' };

                const target = normalized.length / 2;
                let bestIndex = candidates[0];
                let bestDistance = Math.abs(bestIndex - target);
                candidates.forEach(idx => {
                    const distance = Math.abs(idx - target);
                    if (distance < bestDistance) {
                        bestIndex = idx;
                        bestDistance = distance;
                    }
                });

                const primary = normalized.slice(0, bestIndex).trim().replace(/[-/,]+$/g, '').trim();
                const secondary = normalized.slice(bestIndex + 1).trim().replace(/^[-/,]+/g, '').trim();
                if (!primary || !secondary) return { primary: normalized, secondary: '' };
                return { primary, secondary };
            },

            getFrontStickerData: function(r) {
                const typeInfo = ProductManager.getTypeInfo(r);
                const fullProduct = (typeof ALL_PRODUCTS_CACHE !== 'undefined' && Array.isArray(ALL_PRODUCTS_CACHE))
                    ? ALL_PRODUCTS_CACHE.find(p => p.sample === r.sample)
                    : null;

                let roastTextLabel;
                let country;
                let farm;
                let notes;

                if (typeInfo.isAroma) {
                    const aromaLines = this.splitAromaStickerTitle(r.sample || 'НАЗВАНИЕ ЛОТА');
                    roastTextLabel = '\u0410\u0420\u041e\u041c\u0410\u0422\u0418\u0417\u0418\u0420\u041e\u0412\u0410\u041d\u041d\u042b\u0419';
                    country = aromaLines.primary || '\u041d\u0410\u0417\u0412\u0410\u041d\u0418\u0415 \u041b\u041e\u0422\u0410';
                    farm = aromaLines.secondary || '';
                    notes = (fullProduct && fullProduct.flavorDesc) ? fullProduct.flavorDesc : (r.flavorDesc || '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442');
                } else {
                    country = (fullProduct && fullProduct.country) ? fullProduct.country : '\u0421\u0422\u0420\u0410\u041d\u0410 \u041d\u0415 \u0423\u041a\u0410\u0417\u0410\u041d\u0410';
                    farm = (fullProduct && fullProduct.farm)
                        ? fullProduct.farm
                        : ((fullProduct && fullProduct.producer) ? fullProduct.producer : '\u0424\u0415\u0420\u041c\u0410 / \u041a\u041e\u041e\u041f\u0415\u0420\u0410\u0422\u0418\u0412');
                    notes = (fullProduct && fullProduct.flavorNotes)
                        ? fullProduct.flavorNotes
                        : (r.flavorNotes || '\u0414\u0435\u0441\u043a\u0440\u0438\u043f\u0442\u043e\u0440\u044b \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u044b');

                    const catStr = String(r.category || '').toLowerCase();
                    const roastVal = parseInt(r.roast, 10) || 0;
                    roastTextLabel = (catStr.includes('\u044d\u0441\u043f\u0440\u0435\u0441\u0441\u043e') || (!catStr.includes('\u0444\u0438\u043b\u044c\u0442\u0440') && roastVal >= 10))
                        ? '\u042d\u0421\u041f\u0420\u0415\u0421\u0421\u041e-\u041e\u0411\u0416\u0410\u0420\u041a\u0410'
                        : '\u0424\u0418\u041b\u042c\u0422\u0420-\u041e\u0411\u0416\u0410\u0420\u041a\u0410';

                    if (this.isCountryBlendValue(country)) {
                        const blendLines = this.splitAromaStickerTitle(r.sample || '\u041d\u0410\u0417\u0412\u0410\u041d\u0418\u0415 \u0421\u041c\u0415\u0421\u0418');
                        country = blendLines.primary || '\u041d\u0410\u0417\u0412\u0410\u041d\u0418\u0415 \u0421\u041c\u0415\u0421\u0418';
                        farm = blendLines.secondary || '';
                    }
                }

                let formattedNotes = String(notes || '').trim();
                if (formattedNotes.includes(',')) {
                    const parts = formattedNotes.split(',').map(s => s.trim()).filter(Boolean);
                    formattedNotes = parts.slice(0, 3).join(', ');
                }

                return { roastTextLabel, country, farm, notes: formattedNotes, fullProduct };
            },

            isCountryBlendValue: function(value) {
                const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
                return parts.length > 1;
            },

            getBlendCountryValue: function(product) {
                const directCountry = String(product?.country || '').trim();
                if (directCountry) return directCountry;

                if (typeof ALL_PRODUCTS_CACHE !== 'undefined' && Array.isArray(ALL_PRODUCTS_CACHE)) {
                    const sampleKey = String(product?.sample || product?.sample_no || '').trim();
                    if (sampleKey) {
                        const fullProduct = ALL_PRODUCTS_CACHE.find(p =>
                            String(p?.sample || p?.sample_no || '').trim() === sampleKey
                        );
                        return String(fullProduct?.country || '').trim();
                    }
                }

                return '';
            },

            isBlendProduct: function(product) {
                return this.isCountryBlendValue(this.getBlendCountryValue(product));
            },

            getLotDisplayName: function(product) {
                const sampleName = String(product?.sample || product?.sample_no || '').trim();
                return sampleName;
            },

            getBlendStickerKind: function(roastTextLabel) {
                return roastTextLabel === '\u042d\u0421\u041f\u0420\u0415\u0421\u0421\u041e-\u041e\u0411\u0416\u0410\u0420\u041a\u0410'
                    ? '\u042d\u0441\u043f\u0440\u0435\u0441\u0441\u043e-\u0441\u043c\u0435\u0441\u044c'
                    : '\u0424\u0438\u043b\u044c\u0442\u0440-\u0441\u043c\u0435\u0441\u044c';
            },

            splitPackAromaTitle: function(title) {
                const normalized = String(title || '').replace(/\s+/g, ' ').trim();
                if (!normalized) return { country: '', farm: '' };
                if (normalized.length <= 16) return { country: normalized, farm: '' };

                const candidates = [];
                for (let i = 0; i < normalized.length; i++) {
                    const ch = normalized[i];
                    if (ch === ' ' || ch === '-' || ch === '/' || ch === ',') candidates.push(i);
                }
                if (!candidates.length) return { country: normalized, farm: '' };

                const target = normalized.length / 2;
                let bestIndex = candidates[0];
                let bestDistance = Math.abs(bestIndex - target);
                candidates.forEach(idx => {
                    const distance = Math.abs(idx - target);
                    if (distance < bestDistance) {
                        bestIndex = idx;
                        bestDistance = distance;
                    }
                });

                const left = normalized.slice(0, bestIndex).trim().replace(/[-/,]+$/g, '').trim();
                const right = normalized.slice(bestIndex + 1).trim().replace(/^[-/,]+/g, '').trim();
                if (!left || !right) return { country: normalized, farm: '' };
                return { country: left, farm: right };
            },

            getPackPreviewData: function(r) {
                const typeInfo = ProductManager.getTypeInfo(r);
                if (typeInfo.isAccessory || typeInfo.isInfo || typeInfo.isDrip) return null;

                const stickerData = this.getFrontStickerData(r);
                return {
                    alt: this.escapeEditorHtml(r.sample || 'Locus Coffee'),
                    roastTextLabel: this.escapeEditorHtml(stickerData.roastTextLabel || ''),
                    country: this.escapeEditorHtml(stickerData.country || ''),
                    farm: this.escapeEditorHtml(stickerData.farm || ''),
                    descriptors: this.escapeEditorHtml(stickerData.notes || '')
                };

                const fullProduct = (typeof ALL_PRODUCTS_CACHE !== 'undefined' && Array.isArray(ALL_PRODUCTS_CACHE))
                    ? ALL_PRODUCTS_CACHE.find(p => p.sample === r.sample)
                    : null;

                let roastTextLabel;
                let country;
                let farm;
                let notes;

                const fallbackText = {
                    aroma: '\u0410\u0420\u041e\u041c\u0410\u0422\u0418\u0417\u0418\u0420\u041e\u0412\u0410\u041d\u041d\u042b\u0419',
                    lotName: '\u041d\u0410\u0417\u0412\u0410\u041d\u0418\u0415 \u041b\u041e\u0422\u0410',
                    emptyDesc: '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442',
                    country: '\u0421\u0422\u0420\u0410\u041d\u0410 \u041d\u0415 \u0423\u041a\u0410\u0417\u0410\u041d\u0410',
                    farm: '\u0424\u0415\u0420\u041c\u0410 / \u041a\u041e\u041e\u041f\u0415\u0420\u0410\u0422\u0418\u0412',
                    descriptors: '\u0414\u0435\u0441\u043a\u0440\u0438\u043f\u0442\u043e\u0440\u044b \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u044b',
                    espresso: '\u042d\u0421\u041f\u0420\u0415\u0421\u0421\u041e-\u041e\u0411\u0416\u0410\u0420\u041a\u0410',
                    filter: '\u0424\u0418\u041b\u042c\u0422\u0420-\u041e\u0411\u0416\u0410\u0420\u041a\u0410'
                };

                if (typeInfo.isAroma) {
                    roastTextLabel = fallbackText.aroma;
                    country = r.sample || fallbackText.lotName;
                    farm = '';
                    notes = (fullProduct && fullProduct.flavorDesc) ? fullProduct.flavorDesc : (r.flavorDesc || fallbackText.emptyDesc);
                } else {
                    country = (fullProduct && fullProduct.country) ? fullProduct.country : fallbackText.country;
                    farm = (fullProduct && fullProduct.farm)
                        ? fullProduct.farm
                        : ((fullProduct && fullProduct.producer) ? fullProduct.producer : fallbackText.farm);
                    notes = (fullProduct && fullProduct.flavorNotes)
                        ? fullProduct.flavorNotes
                        : (r.flavorNotes || fallbackText.descriptors);

                    const catStr = String(r.category || '').toLowerCase();
                    const roastVal = parseInt(r.roast, 10) || 0;
                    roastTextLabel = (catStr.includes('\u044d\u0441\u043f\u0440\u0435\u0441\u0441\u043e') || (!catStr.includes('\u0444\u0438\u043b\u044c\u0442\u0440') && roastVal >= 10))
                        ? fallbackText.espresso
                        : fallbackText.filter;
                }

                let normalizedNotes = String(notes || '').trim();
                if (normalizedNotes.includes(',')) {
                    const parts = normalizedNotes.split(',').map(s => s.trim()).filter(Boolean);
                    normalizedNotes = parts.slice(0, 3).join(', ');
                }

                return {
                    alt: this.escapeEditorHtml(r.sample || 'Locus Coffee'),
                    roastTextLabel: this.escapeEditorHtml(roastTextLabel || ''),
                    country: this.escapeEditorHtml(country || ''),
                    farm: this.escapeEditorHtml(farm || ''),
                    descriptors: this.escapeEditorHtml(normalizedNotes || '')
                };

                if (typeInfo.isAroma) {
                    roastTextLabel = 'РђР РћРњРђРўРР—РР РћР’РђРќРќР«Р™';
                    country = r.sample || 'РќРђР—Р’РђРќРР• Р›РћРўРђ';
                    farm = '';
                    notes = (fullProduct && fullProduct.flavorDesc) ? fullProduct.flavorDesc : (r.flavorDesc || 'РћРїРёСЃР°РЅРёРµ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚');
                } else {
                    country = (fullProduct && fullProduct.country) ? fullProduct.country : 'РЎРўР РђРќРђ РќР• РЈРљРђР—РђРќРђ';
                    farm = (fullProduct && fullProduct.farm)
                        ? fullProduct.farm
                        : ((fullProduct && fullProduct.producer) ? fullProduct.producer : 'Р¤Р•Р РњРђ / РљРћРћРџР•Р РђРўРР’');
                    notes = (fullProduct && fullProduct.flavorNotes)
                        ? fullProduct.flavorNotes
                        : (r.flavorNotes || 'Р”РµСЃРєСЂРёРїС‚РѕСЂС‹ РЅРµ СѓРєР°Р·Р°РЅС‹');

                    const catStr = String(r.category || '').toLowerCase();
                    const roastVal = parseInt(r.roast, 10) || 0;
                    roastTextLabel = (catStr.includes('СЌСЃРїСЂРµСЃСЃРѕ') || (!catStr.includes('С„РёР»СЊС‚СЂ') && roastVal >= 10))
                        ? 'Р­РЎРџР Р•РЎРЎРћ-РћР‘Р–РђР РљРђ'
                        : 'Р¤РР›Р¬РўР -РћР‘Р–РђР РљРђ';
                }

                let formattedNotes = String(notes || '').trim();
                if (formattedNotes.includes(',')) {
                    const parts = formattedNotes.split(',').map(s => s.trim()).filter(Boolean);
                    formattedNotes = parts.slice(0, 3).join(', ');
                }

                return {
                    alt: this.escapeEditorHtml(r.sample || 'Locus Coffee'),
                    roastTextLabel: this.escapeEditorHtml(roastTextLabel || ''),
                    country: this.escapeEditorHtml(country || ''),
                    farm: this.escapeEditorHtml(farm || ''),
                    descriptors: this.escapeEditorHtml(formattedNotes || '')
                };
            },

            getPackPreviewHtml: function(r) {
                const preview = this.getPackPreviewData(r);
                if (!preview) return '';

                const typeInfo = ProductManager.getTypeInfo(r);
                const packClasses = [
                    'product-pack-label-overlay',
                    typeInfo.isAroma ? 'is-aroma' : 'is-classic',
                    preview.farm ? 'has-secondary-line' : 'is-single-line'
                ].join(' ');
                return `
                    <div class="product-pack-preview">
                        <div class="product-pack-figure">
                            <img class="product-pack-base" src="${this.PACK_PREVIEW_BASE_IMAGE}" alt="Пачка ${preview.alt}" loading="lazy">
                            <div class="${packClasses}" aria-hidden="true">
                                <div class="product-pack-roast">${preview.roastTextLabel}</div>
                                <div class="product-pack-country">${preview.country}</div>
                                ${preview.farm ? `<div class="product-pack-farm">${preview.farm}</div>` : ''}
                                <div class="product-pack-descriptors">${preview.descriptors}</div>
                            </div>
                        </div>
                    </div>
                `;
            },

            getViewHtml: function(r) {
                const typeInfo = ProductManager.getTypeInfo(r);
                const isSpecial = typeInfo.isSpecial;
                const isAroma = typeInfo.isAroma;

                if (isSpecial) {
                    const specialDesc = ProductManager.getDisplayDesc(r);
                    return `
                        <div class="cupping-grid">
                            <div class="cupping-item full-width">
                                <span class="cupping-label">Текстовое описание</span>
                                <div class="cupping-value" style="white-space: pre-wrap; font-size: 13px;">${specialDesc || 'Нет описания'}</div>
                            </div>
                        </div>
                    `;
                }

                // --- ПОДТЯГИВАЕМ ПОЛНЫЕ ДАННЫЕ (CSV и каталог) ---
                const fullProduct = (typeof ALL_PRODUCTS_CACHE !== 'undefined') ? ALL_PRODUCTS_CACHE.find(p => p.sample === r.sample) : null;
                
                let roastTextLabel, country, farm, notes;
                let region, variety, harvest, processing;

                // Извлекаем все данные с надежными запасными вариантами (fallbacks)
                region = (fullProduct && (fullProduct.region || fullProduct['Регион'])) || '-';
                variety = (fullProduct && (fullProduct.variety || fullProduct['Вид/Разновидность'])) || '-';
                harvest = (fullProduct && (fullProduct.cropYear || fullProduct.harvest || fullProduct['Год урожая'])) || '-';
                // Берем Описание обработки из правильной переменной кэша
                processing = (fullProduct && fullProduct.processDesc) ? fullProduct.processDesc : '-';

                if (isAroma) {
                    roastTextLabel = 'АРОМАТИЗИРОВАННЫЙ';
                    country = r.sample || 'НАЗВАНИЕ ЛОТА';
                    farm = ''; 
                    notes = (fullProduct && fullProduct.flavorDesc) ? fullProduct.flavorDesc : (r.flavorDesc || 'Описание отсутствует');
                } else {
                    country = (fullProduct && fullProduct.country) ? fullProduct.country : 'СТРАНА НЕ УКАЗАНА';
                    farm = (fullProduct && fullProduct.farm) ? fullProduct.farm : ((fullProduct && fullProduct.producer) ? fullProduct.producer : 'ФЕРМА / КООПЕРАТИВ');
                    notes = (fullProduct && fullProduct.flavorNotes) ? fullProduct.flavorNotes : (r.flavorNotes || 'Дескрипторы не указаны');
                    
                    let catStr = (r.category || '').toLowerCase();
                    let roastVal = parseInt(r.roast) || 0;
                    if (catStr.includes('эспрессо') || (!catStr.includes('фильтр') && roastVal >= 10)) {
                        roastTextLabel = 'ЭСПРЕССО-ОБЖАРКА';
                    } else {
                        roastTextLabel = 'ФИЛЬТР-ОБЖАРКА';
                    }
                }

                let formattedNotes = notes;
                if (formattedNotes && formattedNotes.includes(',')) {
                    let parts = formattedNotes.split(',').map(s => s.trim()).filter(Boolean);
                    formattedNotes = parts.slice(0, 3).join(', ');
                }

                const backCountryValue = String(country || '').trim();
                const backFarmValue = String(farm || '').trim();
                const backRegionHtml = this.escapeEditorHtml(String(region || '-').trim() || '-');
                const backVarietyHtml = this.escapeEditorHtml(String(variety || '-').trim() || '-');
                const backHarvestHtml = this.escapeEditorHtml(String(harvest || '-').trim() || '-');
                const backProcessingHtml = this.escapeEditorHtml(String(processing || '-').trim() || '-');
                const backCountryHtml = this.escapeEditorHtml(backCountryValue || '-');
                const backFarmHtml = this.escapeEditorHtml(backFarmValue || '-');
                const isCountryBlend = !isAroma && this.isCountryBlendValue(backCountryValue);
                const blendStickerKind = isCountryBlend
                    ? this.escapeEditorHtml(this.getBlendStickerKind(roastTextLabel))
                    : '';
                const blendStickerName = isCountryBlend
                    ? this.escapeEditorHtml(String(r.sample || '').trim() || 'Название смеси')
                    : '';

                const frontStickerData = this.getFrontStickerData(r);
                roastTextLabel = frontStickerData.roastTextLabel;
                country = frontStickerData.country;
                farm = frontStickerData.farm;
                formattedNotes = frontStickerData.notes;
                const frontHasSecondaryLine = !!String(farm || '').trim();

                const safeSampleId = r.sample ? r.sample.toString().replace(/[^a-zA-Z0-9]/g, '_') : Math.floor(Math.random() * 10000);
                const frontStickerId = `front-${safeSampleId}`;
                const backStickerId = `back-${safeSampleId}`;
                const back80StickerId = `back80-${safeSampleId}`;
                
                // Генерируем ссылку и QR код на лету
                const lotUrl = `https://locus.coffee/mag?lot=${encodeURIComponent(r.sample)}`;
                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(lotUrl)}`;
                const normalizedVariety = String(variety || '').trim();
                const firstVarietyToken = normalizedVariety && normalizedVariety !== '-'
                    ? normalizedVariety.split(/\s+/).filter(Boolean)[0]
                    : '';
                const firstVarietyWord = firstVarietyToken
                    ? firstVarietyToken.replace(/^[,.;:!?()"'\u00AB\u00BB]+|[,.;:!?()"'\u00AB\u00BB]+$/g, '')
                    : '';
                const aromaName = this.escapeEditorHtml(String(r.sample || 'Название ароматизатора').trim() || 'Название ароматизатора');
                const backStickerDescription = isAroma
                    ? `Кофе на основе сорта Бразилии текущего ассортимента с кондитерским ароматизатором "${aromaName}".`
                    : '';
                const backStickerMetaBlock = isAroma
                    ? `<div class="sb-aroma-copy">${backStickerDescription}</div>`
                    : isCountryBlend
                        ? `
                                <div class="sb-blend-head">
                                    <div class="sb-blend-type">${blendStickerKind}</div>
                                    <div class="sb-blend-name">${blendStickerName}</div>
                                </div>
                                <div class="sb-grid sb-grid-blend">
                                    <div class="sb-label">Страны:</div><div class="sb-value">${backCountryHtml}</div>
                                    <div class="sb-label">Вид/Разновидность:</div><div class="sb-value">${backVarietyHtml}</div>
                                    <div class="sb-label">Год урожая:</div><div class="sb-value">${backHarvestHtml}</div>
                                    <div class="sb-label">Описание обработки:</div><div class="sb-value">${backProcessingHtml}</div>
                                </div>
                        `
                    : `
                                <div class="sb-grid">
                                    <div class="sb-label">Страна:</div><div class="sb-value">${backCountryHtml}</div>
                                    <div class="sb-label">Регион:</div><div class="sb-value">${backRegionHtml}</div>
                                    <div class="sb-label">Ферма:</div><div class="sb-value">${backFarmHtml}</div>
                                    <div class="sb-label">Вид/Разновидность:</div><div class="sb-value">${backVarietyHtml}</div>
                                    <div class="sb-label">Год урожая:</div><div class="sb-value">${backHarvestHtml}</div>
                                    <div class="sb-label">Описание обработки:</div><div class="sb-value">${backProcessingHtml}</div>
                                    <div class="sb-label">Обжарено:</div><div class="sb-value"></div>
                                </div>
                    `;
                const resolvedBackStickerMetaBlock = isCountryBlend && !isAroma
                    ? `
                                <div class="sb-grid">
                                    <div class="sb-label">\u0421\u0442\u0440\u0430\u043d\u044b:</div><div class="sb-value">${backCountryHtml}</div>
                                    <div class="sb-label">\u0420\u0435\u0433\u0438\u043e\u043d:</div><div class="sb-value">${backRegionHtml}</div>
                                    <div class="sb-label">\u0424\u0435\u0440\u043c\u0430:</div><div class="sb-value">${backFarmHtml}</div>
                                    <div class="sb-label">\u0412\u0438\u0434/\u0420\u0430\u0437\u043d\u043e\u0432\u0438\u0434\u043d\u043e\u0441\u0442\u044c:</div><div class="sb-value">${backVarietyHtml}</div>
                                    <div class="sb-label">\u0413\u043e\u0434 \u0443\u0440\u043e\u0436\u0430\u044f:</div><div class="sb-value">${backHarvestHtml}</div>
                                    <div class="sb-label">\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0438:</div><div class="sb-value">${backProcessingHtml}</div>
                                    <div class="sb-label">\u041e\u0431\u0436\u0430\u0440\u0435\u043d\u043e:</div><div class="sb-value"></div>
                                </div>
                    `
                    : backStickerMetaBlock;
                const backStickerComposition = isAroma
                    ? 'арабика'
                    : (isCountryBlend
                        ? (normalizedVariety && normalizedVariety !== '-' ? normalizedVariety : 'Кофе')
                        : (firstVarietyWord ? `Кофе ${firstVarietyWord}` : 'Кофе'));

                // Выводим три наклейки рядом (flex-контейнер)
                const stickerPreview = `
                    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
                        
                        <div style="background: #f4f1ea; padding: 20px; border-radius: 8px; border: 1px solid var(--locus-border); flex: 1; min-width: 320px; display: flex; flex-direction: column; align-items: center;">
                            <div style="text-align:center; font-size:12px; font-weight:bold; color:var(--locus-accent); margin-bottom:15px; text-transform:uppercase;">Лицо (80х80 мм)</div>
                            
                            <div class="locus-sticker-canvas${isAroma ? ` sticker-front-aroma ${frontHasSecondaryLine ? 'has-secondary-line' : 'is-single-line'}` : ''}${!isAroma && !frontHasSecondaryLine ? ' sticker-front-single-line' : ''}${isCountryBlend ? ' is-blend-front' : ''}" id="${frontStickerId}">
                                <div class="s-roast-text">${roastTextLabel}</div>
                                <div class="s-country">${country}</div>
                                <div class="s-farm">${farm}</div>
                                <div class="s-descriptors">${formattedNotes}</div>
                            </div>

                            <button type="button" onclick="window.downloadPackSticker('${frontStickerId}', '${r.sample}_FRONT')" style="margin-top: 15px; background: var(--locus-dark); color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px;">Скачать ЛИЦО</button>
                        </div>

                        <div style="background: #f4f1ea; padding: 20px; border-radius: 8px; border: 1px solid var(--locus-border); flex: 1; min-width: 320px; display: flex; flex-direction: column; align-items: center;">
                            <div style="text-align:center; font-size:12px; font-weight:bold; color:var(--locus-accent); margin-bottom:15px; text-transform:uppercase;">Задник (60х60 мм)</div>
                            
                            <div class="locus-back-sticker-canvas${isAroma ? ' is-aroma-back' : ''}" id="${backStickerId}">
                                <div class="sb-top">
                                    <div class="sb-brand">Locus Coffee</div>
                                    <div class="sb-sub">Свежеобжаренный кофе</div>
                                </div>
                                
                                ${resolvedBackStickerMetaBlock}

                                <div class="sb-info">
                                    Состав: ${backStickerComposition}<br>
                                    Срок годности: 1 год<br>
                                    Срок реализации: 1 месяц<br>
                                    Производитель: ИП Зуева Е.В.<br>
                                    Адрес: г. Орёл, ул. Наугорское шоссе, д. 5<br>
                                    Нетто: <span style="display:inline-block; width: 5.5ch;"></span> г.
                                </div>

                                <div class="sb-footer">
                                    +7 906 660 4060 &nbsp;&nbsp; | &nbsp;&nbsp; locus.coffee
                                </div>
                            </div>

                            <button type="button" onclick="window.downloadPackSticker('${backStickerId}', '${r.sample}_BACK')" style="margin-top: 15px; background: var(--locus-dark); color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px;">Скачать ЗАДНИК</button>
                        </div>

                        <div style="background: #f4f1ea; padding: 20px; border-radius: 8px; border: 1px solid var(--locus-border); flex: 1; min-width: 320px; display: flex; flex-direction: column; align-items: center;">
                            <div style="text-align:center; font-size:12px; font-weight:bold; color:var(--locus-accent); margin-bottom:15px; text-transform:uppercase;">Задник (80х80 мм)</div>
                            
                            <div class="locus-back-sticker-canvas is-80${isAroma ? ' is-aroma-back' : ''}" id="${back80StickerId}">
                                <div class="sb-top">
                                    <div class="sb-brand">Locus Coffee</div>
                                    <div class="sb-sub">Свежеобжаренный кофе</div>
                                </div>
                                
                                ${resolvedBackStickerMetaBlock}

                                <div class="sb-info">
                                    <div>
                                        Состав: ${backStickerComposition}<br>
                                        Срок годности: 1 год<br>
                                        Срок реализации: 1 месяц<br>
                                        Производитель: ИП Зуева Е.В.<br>
                                        Адрес: г. Орёл, ул. Наугорское шоссе, д. 5<br>
                                        Нетто: <span style="display:inline-block; width: 5.5ch;"></span> г.
                                    </div>
                                    <img src="${qrCodeUrl}" crossorigin="anonymous">
                                </div>

                                <div class="sb-footer">
                                    +7 906 660 4060 &nbsp;&nbsp; | &nbsp;&nbsp; locus.coffee
                                </div>
                            </div>

                            <button type="button" onclick="window.downloadPackSticker('${back80StickerId}', '${r.sample}_BACK_80')" style="margin-top: 15px; background: var(--locus-dark); color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px;">Скачать ЗАДНИК 80х80</button>
                        </div>
                    </div>
                `;
                // --------------------------

                return stickerPreview + `
                    <div class="cupping-grid">
                        <div class="cupping-item full-width"><span class="cupping-label">Дата каппинга</span><span class="cupping-value">${r.cuppingDate || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Степень обжарки</span>${getScale(r.roast)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Интенсивность запаха</span>${getScale(r.smellInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Интенсивность аромата</span>${getScale(r.aromaInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Описание запаха и аромата</span><span class="cupping-value">${r.aromaDesc || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о запахе и аромате</span><span class="cupping-notes">${r.aromaNotes || '-'}</span></div>
                        
                        <div class="cupping-item"><span class="cupping-label">Интенсивность букета</span>${getScale(r.flavorInt)}</div>
                        <div class="cupping-item"><span class="cupping-label">Интенсивность послевкусия</span>${getScale(r.atInt)}</div>
                        <div class="cupping-item full-width"><span class="cupping-label">Описание букета</span><span class="cupping-value">${r.flavorDesc || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Основные вкусы</span><span class="cupping-value flavor-text">${r.mainFlavors || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о букете и послевкусии</span><span class="cupping-notes">${r.flavorNotes || '-'}</span></div>
                        
                        <div class="cupping-item"><span class="cupping-label">Интенсивность кислотности</span>${getScale(r.acidInt)}<span class="cupping-label" style="margin-top:10px;">Заметки о кислотности</span><span class="cupping-notes">${r.acidNotes || '-'}</span></div>
                        <div class="cupping-item"><span class="cupping-label">Интенсивность сладости</span>${getScale(r.sweetInt)}<span class="cupping-label" style="margin-top:10px;">Заметки о сладости</span><span class="cupping-notes">${r.sweetNotes || '-'}</span></div>
                        
                        <div class="cupping-item"><span class="cupping-label">Интенсивность тактильности</span>${getScale(r.bodyInt)}</div>
                        <div class="cupping-item"><span class="cupping-label">Описание тактильности</span><span class="cupping-value">${r.bodyDesc || '-'}</span></div>
                        <div class="cupping-item full-width"><span class="cupping-label">Заметки о тактильности</span><span class="cupping-notes">${r.bodyNotes || '-'}</span></div>
                    </div>
                `;
            },

            escapeEditorHtml: function(value) {
                return String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            },

            renderArticleEditorPreview: function(id) {
                const previewInput = document.getElementById(`cat-edit-article-preview-${id}`);
                const bodyInput = document.getElementById(`cat-edit-article-body-${id}`);
                const previewHost = document.getElementById(`cat-edit-article-preview-render-${id}`);
                const bodyHost = document.getElementById(`cat-edit-article-body-render-${id}`);

                if (previewHost) {
                    previewHost.innerHTML = previewInput?.value?.trim() || '<div class="article-editor-placeholder">Превью пока пустое.</div>';
                }
                if (bodyHost) {
                    bodyHost.innerHTML = bodyInput?.value?.trim() || '<div class="article-editor-placeholder">Полный текст пока пустой.</div>';
                }
            },

            setArticleEditorStatus: function(id, message, tone = 'info') {
                const statusEl = document.getElementById(`cat-upload-status-${id}`);
                if (!statusEl) return;
                statusEl.textContent = message || '';
                statusEl.style.color = tone === 'success'
                    ? '#187a30'
                    : (tone === 'error' ? '#B66A58' : '#8B7E66');
            },

            uploadImageBlobToImgBB: async function(file) {
                const formData = new FormData();
                formData.append("image", file);
                const IMGBB_API_KEY = "a82462eb247f9d0aee41ded68240ed02";
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error ? data.error.message : "Неизвестная ошибка");
                }
                return data.data.url;
            },

            getArticleEditorInput: function(id, part) {
                return document.getElementById(`cat-edit-article-${part}-${id}`);
            },

            getArticleEditorToolbarHtml: function(id, part) {
                const tools = [
                    { key: 'heading', label: 'H2', title: 'Подзаголовок' },
                    { key: 'paragraph', label: 'P', title: 'Абзац' },
                    { key: 'alignLeft', label: 'Left', title: 'По левому краю' },
                    { key: 'alignRight', label: 'Right', title: 'По правому краю' },
                    { key: 'alignJustify', label: 'Justify', title: 'По ширине' },
                    { key: 'bold', label: 'B', title: 'Акцент' },
                    { key: 'italic', label: 'I', title: 'Курсив' },
                    { key: 'list', label: 'List', title: 'Маркированный список' },
                    { key: 'quote', label: 'Quote', title: 'Цитата' },
                    { key: 'link', label: 'Link', title: 'Ссылка' },
                    { key: 'image', label: 'Image', title: 'Изображение' },
                    { key: 'divider', label: 'HR', title: 'Разделитель' }
                ];

                return `
                    <div class="article-editor-toolbar" role="toolbar" aria-label="Инструменты верстки статьи">
                        ${tools.map(tool => `
                            <button
                                type="button"
                                class="article-editor-tool"
                                title="${tool.title}"
                                onclick="CatalogSystem.applyArticleEditorTool('${id}', '${part}', '${tool.key}')"
                            >${tool.label}</button>
                        `).join('')}
                    </div>
                `;
            },

            replaceArticleEditorSelection: function(input, replacement, selectionStart = null, selectionEnd = null) {
                if (!input) return;
                const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
                const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
                const value = input.value || '';
                input.value = `${value.slice(0, start)}${replacement}${value.slice(end)}`;

                const nextStart = selectionStart === null ? start + replacement.length : start + selectionStart;
                const nextEnd = selectionEnd === null ? nextStart : start + selectionEnd;
                input.focus();
                input.setSelectionRange(nextStart, nextEnd);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            },

            wrapArticleEditorSelection: function(id, part, before, after, placeholder = 'Текст') {
                const input = this.getArticleEditorInput(id, part);
                if (!input) return;

                const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
                const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
                const selected = input.value.slice(start, end);
                const content = selected || placeholder;
                const replacement = `${before}${content}${after}`;
                const selectionStart = before.length;
                const selectionEnd = before.length + content.length;
                this.replaceArticleEditorSelection(input, replacement, selectionStart, selectionEnd);
            },

            insertArticleEditorBlock: function(id, part, block, focusOffset = null) {
                const input = this.getArticleEditorInput(id, part);
                if (!input) return;
                const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
                const prefix = start > 0 && !/\n$/.test(input.value.slice(0, start)) ? '\n' : '';
                const suffix = /\n$/.test(block) ? '' : '\n';
                const replacement = `${prefix}${block}${suffix}`;
                const cursor = typeof focusOffset === 'number' ? prefix.length + focusOffset : null;
                this.replaceArticleEditorSelection(input, replacement, cursor, cursor);
            },

            handleArticleEditorPaste: async function(id, part, event) {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => String(item.type || '').startsWith('image/'));
                if (!imageItem) return;

                const file = imageItem.getAsFile();
                if (!file) return;

                event.preventDefault();
                this.setArticleEditorStatus(id, 'Загружаем изображение из буфера обмена...', 'info');
                try {
                    const imageUrl = await this.uploadImageBlobToImgBB(file);
                    const figureHtml = `<figure>\n  <img src="${imageUrl}" alt="">\n  <figcaption></figcaption>\n</figure>`;
                    this.insertArticleEditorBlock(id, part, figureHtml, 23);
                    this.setArticleEditorStatus(id, 'Изображение вставлено в текст статьи.', 'success');
                } catch (error) {
                    this.setArticleEditorStatus(id, 'Ошибка вставки изображения: ' + error.message, 'error');
                }
            },

            applyArticleEditorTool: function(id, part, tool) {
                switch (tool) {
                    case 'heading':
                        this.wrapArticleEditorSelection(id, part, '<h2>', '</h2>', 'Подзаголовок');
                        break;
                    case 'paragraph':
                        this.wrapArticleEditorSelection(id, part, '<p>', '</p>', 'Абзац текста');
                        break;
                    case 'alignLeft':
                        this.wrapArticleEditorSelection(id, part, '<div style="text-align:left;">', '</div>', 'Абзац текста');
                        break;
                    case 'alignRight':
                        this.wrapArticleEditorSelection(id, part, '<div style="text-align:right;">', '</div>', 'Абзац текста');
                        break;
                    case 'alignJustify':
                        this.wrapArticleEditorSelection(id, part, '<div style="text-align:justify;">', '</div>', 'Абзац текста');
                        break;
                    case 'bold':
                        this.wrapArticleEditorSelection(id, part, '<strong>', '</strong>', 'Акцент');
                        break;
                    case 'italic':
                        this.wrapArticleEditorSelection(id, part, '<em>', '</em>', 'Курсив');
                        break;
                    case 'list':
                        this.insertArticleEditorBlock(id, part, '<ul>\n  <li>Пункт 1</li>\n  <li>Пункт 2</li>\n</ul>', 11);
                        break;
                    case 'quote':
                        this.insertArticleEditorBlock(id, part, '<blockquote>Цитата или важная мысль</blockquote>', 13);
                        break;
                    case 'link':
                        this.insertArticleEditorBlock(id, part, '<p><a href="https://">Текст ссылки</a></p>', 18);
                        break;
                    case 'image':
                        this.insertArticleEditorBlock(id, part, '<figure>\n  <img src="https://" alt="">\n  <figcaption>Подпись к изображению</figcaption>\n</figure>', 23);
                        break;
                    case 'divider':
                        this.insertArticleEditorBlock(id, part, '<hr>');
                        break;
                }
            },

            initArticleEditor: function(id) {
                ['preview', 'body'].forEach(part => {
                    const input = document.getElementById(`cat-edit-article-${part}-${id}`);
                    if (!input) return;
                    if (input.dataset.previewReady !== '1') {
                        input.addEventListener('input', () => this.renderArticleEditorPreview(id));
                        input.dataset.previewReady = '1';
                    }
                    if (input.dataset.pasteReady !== '1') {
                        input.addEventListener('paste', (event) => this.handleArticleEditorPaste(id, part, event));
                        input.dataset.pasteReady = '1';
                    }
                });
                this.renderArticleEditorPreview(id);
            },

            loadArticleEditorData: async function(id) {
                const token = localStorage.getItem('locus_token');
                if (!token) throw new Error('Нет доступа администратора');

                const response = await fetch(LOCUS_API_URL + '?action=getArticleLotEditorData', {
                    method: 'POST',
                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'getArticleLotEditorData', id })
                });
                const result = await response.json();
                if (!response.ok || !result.success || !result.lot) {
                    throw new Error(result.error || 'Не удалось загрузить HTML статьи');
                }
                return result.lot;
            },

            getEditHtml: function(r, articleEditorData = null) {
                // Исправлено: используем ProductManager
                const typeInfo = ProductManager.getTypeInfo(r);
                const isSpecial = typeInfo.isSpecial;
                const isArticle = typeInfo.isArticle;
                const extraStyle = isSpecial ? 'display: none;' : 'display: contents;';
                const articlePayload = ProductManager.getArticlePayload(r);
                const articlePreviewHtml = isArticle ? (articleEditorData?.previewHtml ?? articlePayload?.previewHtml ?? '') : '';
                const articleBodyHtml = isArticle ? (articleEditorData?.bodyHtml ?? '') : '';

                return `
                    <div class="cupping-grid">
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Название / Номер лота</span>
                            <input type="text" id="cat-edit-sample-${r.id}" class="edit-input" value="${r.sample || ''}">
                        </div>
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Категория (Аксессуары, Информация и др.)</span>
                            <input type="text" id="cat-edit-category-${r.id}" class="edit-input" value="${r.category || ''}">
                        </div>
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Фиксированная цена (₽)</span>
                            <input type="number" id="cat-edit-price-${r.id}" class="edit-input" value="${r.price || ''}">
                            <div style="font-size:10px; margin-top:6px; color:var(--locus-dark); cursor:pointer; text-decoration:underline;" onclick="CatalogSystem.pullExtrinsicPrice('${r.id}', '${r.sample}')">Подтянуть расчетную цену из Extrinsic</div>
                        </div>

                        <div class="cupping-item full-width">
                            <span class="cupping-label">Фотография (Загрузить или указать ссылки)</span>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input type="text" id="cat-edit-imageUrl-${r.id}" class="edit-input" style="margin-bottom:0; flex-grow:1;" value="${r.imageUrl || ''}" placeholder="Ссылки на фото (через запятую для нескольких)">
                                <input type="file" id="cat-edit-file-${r.id}" style="display:none" accept="image/*" onchange="CatalogSystem.uploadImageToImgBB('${r.id}')">
                                <button type="button" class="btn-small-reorder" style="padding: 8px 12px; margin:0; white-space:nowrap; cursor:pointer;" onclick="document.getElementById('cat-edit-file-${r.id}').click()">Загрузить</button>
                            </div>
                            <div id="cat-upload-status-${r.id}" style="font-size:10px; color:gray; margin-top:4px;"></div>
                        </div>

                        ${isArticle ? `
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Превью статьи до покупки (HTML)</span>
                            ${this.getArticleEditorToolbarHtml(r.id, 'preview')}
                            <textarea id="cat-edit-article-preview-${r.id}" class="edit-textarea article-editor-textarea" style="height:180px;">${this.escapeEditorHtml(articlePreviewHtml)}</textarea>
                            <div class="article-editor-note">Этот блок виден в карточке статьи до оплаты. Изображения можно вставлять прямо из буфера обмена.</div>
                        </div>
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Полный текст статьи (HTML, платный доступ)</span>
                            ${this.getArticleEditorToolbarHtml(r.id, 'body')}
                            <textarea id="cat-edit-article-body-${r.id}" class="edit-textarea article-editor-textarea" style="height:320px;">${this.escapeEditorHtml(articleBodyHtml)}</textarea>
                            <div class="article-editor-note">После сохранения полный текст шифруется и выдается покупателю по паролю на 1 месяц. Графики, таблицы и рисунки можно вставлять прямо в это поле через Paste.</div>
                        </div>
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Превью в карточке</span>
                            <div id="cat-edit-article-preview-render-${r.id}" class="article-editor-preview"></div>
                        </div>
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Полный материал после оплаты</span>
                            <div id="cat-edit-article-body-render-${r.id}" class="article-editor-preview article-editor-preview-full"></div>
                        </div>
                        ` : `
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Текстовое описание (HTML или обычный текст с абзацами)</span>
                            <textarea id="cat-edit-customDesc-${r.id}" class="edit-textarea" style="height:100px;">${r.customDesc || ''}</textarea>
                        </div>
                        `}
                        
                        <div style="${extraStyle}">
                            <div class="cupping-item full-width" style="margin-top: 10px;">
                                <span class="cupping-label" style="color: var(--locus-accent); font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; display: block;">Кофейные атрибуты (Скрыто для аксессуаров)</span>
                            </div>
                            <div class="cupping-item full-width">
                                <span class="cupping-label">Дата каппинга</span>
                                <input type="date" id="cat-edit-date-${r.id}" class="edit-input" value="${r.cuppingDate || ''}">
                            </div>
                            <div class="cupping-item full-width"><span class="cupping-label">Степень обжарки (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-roast-${r.id}" class="edit-input" value="${r.roast || ''}"></div>
                            <div class="cupping-item"><span class="cupping-label">Интенсивность запаха (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-smellInt-${r.id}" class="edit-input" value="${r.smellInt || ''}"></div>
                            <div class="cupping-item"><span class="cupping-label">Интенсивность аромата (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-aromaInt-${r.id}" class="edit-input" value="${r.aromaInt || ''}"></div>
                            <div class="cupping-item full-width"><span class="cupping-label">Описание запаха и аромата</span>
                                <textarea id="cat-edit-aromaDesc-${r.id}" class="edit-textarea">${r.aromaDesc || ''}</textarea></div>
                            <div class="cupping-item full-width"><span class="cupping-label">Заметки о запахе и аромате</span>
                                <textarea id="cat-edit-aromaNotes-${r.id}" class="edit-textarea">${r.aromaNotes || ''}</textarea></div>
                            
                            <div class="cupping-item"><span class="cupping-label">Интенсивность букета (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-flavorInt-${r.id}" class="edit-input" value="${r.flavorInt || ''}"></div>
                            <div class="cupping-item"><span class="cupping-label">Интенсивность послевкусия (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-atInt-${r.id}" class="edit-input" value="${r.atInt || ''}"></div>
                            <div class="cupping-item full-width"><span class="cupping-label">Описание букета</span>
                                <textarea id="cat-edit-flavorDesc-${r.id}" class="edit-textarea">${r.flavorDesc || ''}</textarea></div>
                            <div class="cupping-item full-width"><span class="cupping-label">Основные вкусы</span>
                                <input type="text" id="cat-edit-mainFlavors-${r.id}" class="edit-input" value="${r.mainFlavors || ''}"></div>
                            <div class="cupping-item full-width"><span class="cupping-label">Заметки о букете и послевкусии</span>
                                <textarea id="cat-edit-flavorNotes-${r.id}" class="edit-textarea">${r.flavorNotes || ''}</textarea></div>
                            
                            <div class="cupping-item"><span class="cupping-label">Интенсивность кислотности (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-acidInt-${r.id}" class="edit-input" value="${r.acidInt || ''}"></div>
                            <div class="cupping-item"><span class="cupping-label">Заметки о кислотности</span>
                                <textarea id="cat-edit-acidNotes-${r.id}" class="edit-textarea">${r.acidNotes || ''}</textarea></div>
                                
                            <div class="cupping-item"><span class="cupping-label">Интенсивность сладости (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-sweetInt-${r.id}" class="edit-input" value="${r.sweetInt || ''}"></div>
                            <div class="cupping-item"><span class="cupping-label">Заметки о сладости</span>
                                <textarea id="cat-edit-sweetNotes-${r.id}" class="edit-textarea">${r.sweetNotes || ''}</textarea></div>
                            
                            <div class="cupping-item full-width"><span class="cupping-label">Интенсивность тактильности (1-15)</span>
                                <input type="number" min="1" max="15" id="cat-edit-bodyInt-${r.id}" class="edit-input" value="${r.bodyInt || ''}"></div>
                            <div class="cupping-item full-width"><span class="cupping-label">Описание тактильности</span>
                                <textarea id="cat-edit-bodyDesc-${r.id}" class="edit-textarea">${r.bodyDesc || ''}</textarea></div>
                            <div class="cupping-item full-width"><span class="cupping-label">Заметки о тактильности</span>
                                <textarea id="cat-edit-bodyNotes-${r.id}" class="edit-textarea">${r.bodyNotes || ''}</textarea></div>
                        </div> </div>
                    <div class="edit-actions">
                        <button class="lc-btn btn-del-cat" onclick="CatalogSystem.cancelEdit('${r.id}')">Отмена</button>
                        <button class="lc-btn btn-save-cat" id="cat-btn-save-${r.id}" onclick="CatalogSystem.saveEdit('${r.id}')">Сохранить</button>
                    </div></div>
                `;
            },

            getExtrinsicFieldConfig: function() {
                return {
                    textFields: [
                        { section: 'farming', dom: 'country', requestKey: 'Country', productKey: 'country', label: 'Страна' },
                        { section: 'farming', dom: 'region', requestKey: 'Region', productKey: 'region', label: 'Регион' },
                        { section: 'farming', dom: 'farm', requestKey: 'Name of farm or Co-op', productKey: 'farm', label: 'Ферма / Кооператив' },
                        { section: 'farming', dom: 'producer', requestKey: 'Name of Producer(s)', productKey: 'producer', label: 'Производитель' },
                        { section: 'farming', dom: 'variety', requestKey: 'Species Variety or Varieties', productKey: 'variety', label: 'Вид / Разновидность' },
                        { section: 'farming', dom: 'harvest', requestKey: 'Harvest Date/Year', productKey: 'harvest', label: 'Год урожая' },
                        { section: 'farming', dom: 'otherFarming', requestKey: 'Other_Farming', productKey: 'otherFarming', label: 'Другое (Фермерство)', multiline: true },

                        { section: 'processing', dom: 'processor', requestKey: 'Name of Processor(s)', productKey: 'processor', label: 'Обработчик' },
                        { section: 'processing', dom: 'wetMill', requestKey: 'Wet Mill / Station', productKey: 'wetMill', label: 'Станция мытой обработки' },
                        { section: 'processing', dom: 'dryMill', requestKey: 'Dry Mill', productKey: 'dryMill', label: 'Станция сухой обработки' },
                        { section: 'processing', dom: 'otherProcessor', requestKey: 'Other_Processor', productKey: 'otherProcessor', label: 'Другое (Обработка)', multiline: true },
                        { section: 'processing', dom: 'processType', requestKey: 'Process Type', productKey: 'processType', label: 'Тип обработки' },
                        { section: 'processing', dom: 'otherProcessType', requestKey: 'Other_Process_Type', productKey: 'otherProcessType', label: 'Другое (Тип обработки)', multiline: true },
                        { section: 'processing', dom: 'processDesc', requestKey: 'Process Description', productKey: 'processDesc', label: 'Описание обработки', multiline: true },

                        { section: 'trading', dom: 'grade', requestKey: 'Grade', productKey: 'grade', label: 'Оценка / Грейд' },
                        { section: 'trading', dom: 'ico', requestKey: 'ICO Number', productKey: 'ico', label: 'Номер ICO' },
                        { section: 'trading', dom: 'importer', requestKey: 'Name of Importer', productKey: 'importer', label: 'Импортер' },
                        { section: 'trading', dom: 'exporter', requestKey: 'Name of Exporter', productKey: 'exporter', label: 'Экспортер' },
                        { section: 'trading', dom: 'farmGatePrice', requestKey: 'Farm Gate Price', productKey: 'farmGatePrice', label: 'Farm Gate Price' },
                        { section: 'trading', dom: 'lotSize', requestKey: 'Lot Size', productKey: 'lotSize', label: 'Размер лота' },
                        { section: 'trading', dom: 'otherTrading', requestKey: 'Other_Trading', productKey: 'otherTrading', label: 'Другое (Торговля)', multiline: true },

                        { section: 'certs', dom: 'otherCertifications', requestKey: 'Other_Certifications', productKey: 'otherCertifications', label: 'Другие сертификаты', multiline: true },
                        { section: 'certs', dom: 'awards', requestKey: 'Awards', productKey: 'awards', label: 'Награды', multiline: true }
                    ],
                    checkboxFields: [
                        { section: 'processing', dom: 'washed', requestKey: 'Washed', productKey: 'washed', label: 'Мытая' },
                        { section: 'processing', dom: 'natural', requestKey: 'Natural', productKey: 'natural', label: 'Натуральная' },
                        { section: 'processing', dom: 'decaf', requestKey: 'Decaffeinated', productKey: 'decaf', label: 'Декаф' },

                        { section: 'certs', dom: 'cert4C', requestKey: '4C', productKey: 'cert4C', label: '4C' },
                        { section: 'certs', dom: 'certFairTrade', requestKey: 'Fair trade', productKey: 'certFairTrade', label: 'Fair trade' },
                        { section: 'certs', dom: 'certOrganic', requestKey: 'Organic', productKey: 'certOrganic', label: 'Organic' },
                        { section: 'certs', dom: 'certRainforest', requestKey: 'Rainforest Alliance', productKey: 'certRainforest', label: 'Rainforest Alliance' },
                        { section: 'certs', dom: 'certFoodSafety', requestKey: 'Food Safety', productKey: 'certFoodSafety', label: 'Food Safety' }
                    ]
                };
            },

            getExtrinsicEditHtml: function(r) {
                const esc = (value) => String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
                const { textFields, checkboxFields } = this.getExtrinsicFieldConfig();
                const sectionOrder = ['farming', 'processing', 'trading', 'certs'];
                const sectionTitles = {
                    farming: 'Фермерство',
                    processing: 'Обработка',
                    trading: 'Торговля',
                    certs: 'Сертификация и награды'
                };

                const renderTextField = (field) => `
                    <div class="cupping-item ${field.multiline ? 'full-width' : ''}">
                        <span class="cupping-label">${field.label}</span>
                        ${field.multiline
                            ? `<textarea id="cat-ext-${field.dom}-${r.id}" class="edit-textarea">${esc(r[field.productKey] || '')}</textarea>`
                            : `<input type="text" id="cat-ext-${field.dom}-${r.id}" class="edit-input" value="${esc(r[field.productKey] || '')}">`
                        }
                    </div>
                `;

                const renderCheckboxes = (section) => {
                    const fields = checkboxFields.filter((field) => field.section === section);
                    if (!fields.length) return '';

                    return `
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Флаги</span>
                            <div class="grind-options-row" style="margin-top:8px;">
                                ${fields.map((field) => `
                                    <label class="grind-btn" style="flex:0 0 auto; min-width:auto; display:flex; align-items:center; gap:8px; padding:8px 12px; text-transform:none;">
                                        <input type="checkbox" id="cat-ext-${field.dom}-${r.id}" ${String(r[field.productKey] || '').trim() ? 'checked' : ''}>
                                        <span>${field.label}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `;
                };

                return `
                    <div class="cupping-grid">
                        <div class="cupping-item full-width">
                            <span class="cupping-label">Название / Номер лота</span>
                            <input type="text" class="edit-input" value="${esc(r.sample || '')}" disabled>
                        </div>

                        ${sectionOrder.map((section) => `
                            <div class="cupping-item full-width" style="margin-top: 10px;">
                                <span class="cupping-label" style="color: var(--locus-accent); font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; display: block;">${sectionTitles[section]}</span>
                            </div>
                            ${textFields.filter((field) => field.section === section).map(renderTextField).join('')}
                            ${renderCheckboxes(section)}
                        `).join('')}
                    </div>

                    <div class="edit-actions">
                        <button class="lc-btn btn-del-cat" onclick="CatalogSystem.cancelEdit('${r.id}')">Отмена</button>
                        <button class="lc-btn btn-save-cat" id="cat-btn-save-ext-${r.id}" onclick="CatalogSystem.saveExtrinsicEdit('${r.id}')">Сохранить Extrinsic</button>
                    </div>
                `;
            },

            openExtrinsicEditMode: function(id, event) {
                event.stopPropagation();
                const item = document.getElementById(`cat-item-row-${id}`);
                const contentDiv = document.getElementById(`cat-content-${id}`);
                const adminProduct = this.ALL_PRODUCTS.find(p => p.id === id);
                const cacheProduct = adminProduct ? ALL_PRODUCTS_CACHE.find(p => p.id === id || p.sample === adminProduct.sample) : null;
                const product = adminProduct ? { ...adminProduct, ...(cacheProduct || {}) } : null;

                if (!product) {
                    alert('Лот не найден.');
                    return;
                }

                if (!item.classList.contains('open')) item.classList.add('open');
                contentDiv.innerHTML = this.getExtrinsicEditHtml(product);
            },

            saveExtrinsicEdit: async function(id) {
                const btn = document.getElementById(`cat-btn-save-ext-${id}`);
                if (!btn) return;

                btn.disabled = true;
                btn.textContent = 'Сохранение...';

                const adminProduct = this.ALL_PRODUCTS.find(p => p.id === id);
                const cacheProduct = adminProduct ? ALL_PRODUCTS_CACHE.find(p => p.id === id || p.sample === adminProduct.sample) : null;
                const product = adminProduct ? { ...adminProduct, ...(cacheProduct || {}) } : null;

                if (!product) {
                    btn.disabled = false;
                    btn.textContent = 'Сохранить Extrinsic';
                    alert('Лот не найден.');
                    return;
                }

                const { textFields, checkboxFields } = this.getExtrinsicFieldConfig();
                const payload = { 'Sample No': product.sample || '' };

                textFields.forEach((field) => {
                    const el = document.getElementById(`cat-ext-${field.dom}-${id}`);
                    payload[field.requestKey] = el ? el.value.trim() : '';
                });

                checkboxFields.forEach((field) => {
                    const el = document.getElementById(`cat-ext-${field.dom}-${id}`);
                    payload[field.requestKey] = el && el.checked ? '+' : '';
                });

                try {
                    const response = await fetch(YANDEX_FUNCTION_URL + '?type=cvaext', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'Сервер вернул ошибку');

                    const localUpdate = {};
                    textFields.forEach((field) => {
                        localUpdate[field.productKey] = payload[field.requestKey] || '';
                    });
                    checkboxFields.forEach((field) => {
                        localUpdate[field.productKey] = payload[field.requestKey] || '';
                    });

                    const rawPriceStr = String(payload['Farm Gate Price'] || payload['Other_Trading'] || '0')
                        .replace(',', '.')
                        .replace(/[^0-9.-]+/g, '');
                    localUpdate.rawGreenPrice = parseFloat(rawPriceStr) || 0;

                    const targetSample = product.sample || '';
                    const targetCacheProduct = ALL_PRODUCTS_CACHE.find(p => p.id === id || p.sample === targetSample);
                    if (targetCacheProduct) Object.assign(targetCacheProduct, localUpdate);

                    if (adminProduct) Object.assign(adminProduct, localUpdate);

                    if (currentActiveProduct && currentActiveProduct.sample === targetSample) {
                        Object.assign(currentActiveProduct, localUpdate);
                    }

                    this.cancelEdit(id);
                } catch (error) {
                    alert('Ошибка сети при сохранении Extrinsic: ' + error.message);
                    btn.disabled = false;
                    btn.textContent = 'Сохранить Extrinsic';
                }
            },

            toggleDetails: function(id) {
                const item = document.getElementById(`cat-item-row-${id}`);
                if(item) {
                    item.classList.toggle('open');
                    if(!item.classList.contains('open')) this.cancelEdit(id);
                }
            },

            openEditMode: async function(id, event) {
                event.stopPropagation();
                const item = document.getElementById(`cat-item-row-${id}`);
                const contentDiv = document.getElementById(`cat-content-${id}`);
                const product = this.ALL_PRODUCTS.find(p => p.id === id);
                if (!item.classList.contains('open')) item.classList.add('open');
                if (!product) return;

                if (ProductManager.getTypeInfo(product).isArticle) {
                    contentDiv.innerHTML = '<div class="empty-msg">Загрузка HTML статьи...</div>';
                    try {
                        const articleEditorData = await this.loadArticleEditorData(id);
                        contentDiv.innerHTML = this.getEditHtml(product, articleEditorData);
                        this.initArticleEditor(id);
                    } catch (error) {
                        contentDiv.innerHTML = this.getEditHtml(product, {});
                        this.initArticleEditor(id);
                        alert('Не удалось загрузить полный текст статьи: ' + error.message);
                    }
                    return;
                }

                contentDiv.innerHTML = this.getEditHtml(product);
            },

            cancelEdit: function(id) {
                const contentDiv = document.getElementById(`cat-content-${id}`);
                const product = this.ALL_PRODUCTS.find(p => p.id === id);
                contentDiv.innerHTML = this.getViewHtml(product);
            },

            saveEdit: async function(id) {
                const btn = document.getElementById(`cat-btn-save-${id}`);
                btn.disabled = true; btn.textContent = "Сохранение...";
                const originalProduct = this.ALL_PRODUCTS.find(p => p.id === id);
                const isArticle = !!originalProduct && ProductManager.getTypeInfo(originalProduct).isArticle;
                const updatedData = {
                    id: id,
                    sample: document.getElementById(`cat-edit-sample-${id}`).value,
                    category: document.getElementById(`cat-edit-category-${id}`).value,
                    price: document.getElementById(`cat-edit-price-${id}`).value,
                    imageUrl: document.getElementById(`cat-edit-imageUrl-${id}`).value,
                    customDesc: isArticle ? '' : (document.getElementById(`cat-edit-customDesc-${id}`)?.value || ''),
                    category: document.getElementById(`cat-edit-category-${id}`).value, // НОВОЕ ПОЛЕ
                    price: document.getElementById(`cat-edit-price-${id}`).value, // НОВОЕ ПОЛЕ
                    cuppingDate: document.getElementById(`cat-edit-date-${id}`).value,
                    roast: document.getElementById(`cat-edit-roast-${id}`).value,
                    smellInt: document.getElementById(`cat-edit-smellInt-${id}`).value,
                    aromaInt: document.getElementById(`cat-edit-aromaInt-${id}`).value,
                    aromaDesc: document.getElementById(`cat-edit-aromaDesc-${id}`).value,
                    aromaNotes: document.getElementById(`cat-edit-aromaNotes-${id}`).value,
                    flavorInt: document.getElementById(`cat-edit-flavorInt-${id}`).value,
                    atInt: document.getElementById(`cat-edit-atInt-${id}`).value,
                    flavorDesc: document.getElementById(`cat-edit-flavorDesc-${id}`).value,
                    mainFlavors: document.getElementById(`cat-edit-mainFlavors-${id}`).value,
                    flavorNotes: document.getElementById(`cat-edit-flavorNotes-${id}`).value,
                    acidInt: document.getElementById(`cat-edit-acidInt-${id}`).value,
                    acidNotes: document.getElementById(`cat-edit-acidNotes-${id}`).value,
                    sweetInt: document.getElementById(`cat-edit-sweetInt-${id}`).value,
                    sweetNotes: document.getElementById(`cat-edit-sweetNotes-${id}`).value,
                    bodyInt: document.getElementById(`cat-edit-bodyInt-${id}`).value,
                    bodyDesc: document.getElementById(`cat-edit-bodyDesc-${id}`).value,
                    bodyNotes: document.getElementById(`cat-edit-bodyNotes-${id}`).value,
                };
                try {
                    let response;
                    if (isArticle) {
                        const token = localStorage.getItem('locus_token');
                        const previewHtml = document.getElementById(`cat-edit-article-preview-${id}`)?.value || '';
                        const bodyHtml = document.getElementById(`cat-edit-article-body-${id}`)?.value || '';
                        response = await fetch(LOCUS_API_URL + '?action=saveArticleLot', {
                            method: 'POST',
                            headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'saveArticleLot', updatedData, previewHtml, bodyHtml })
                        });
                    } else {
                        response = await fetch(YANDEX_FUNCTION_URL + "?type=catalog_edit", {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData)
                        });
                    }
                    const result = await response.json();
                    if (!result.success) throw new Error("Сервер вернул ошибку");
                    
                    if (isArticle) {
                        await this.loadData();
                    } else {
                        const pIndex = this.ALL_PRODUCTS.findIndex(p => p.id === id);
                        this.ALL_PRODUCTS[pIndex] = { ...this.ALL_PRODUCTS[pIndex], ...updatedData };
                        document.querySelector(`#cat-item-row-${id} .item-title span`).textContent = updatedData.sample;
                        this.cancelEdit(id);
                    }
                    if (window.fetchExternalData) window.fetchExternalData(); // Обновляем витрину
                } catch (error) {
                    alert("Ошибка сети при сохранении изменений: " + error.message);
                    btn.disabled = false; btn.textContent = "Сохранить";
                }
            },

            pullExtrinsicPrice: function(id, sampleName) {
                const prod = ALL_PRODUCTS_CACHE.find(p => p.sample === sampleName);
                if (prod && prod.rawGreenPrice) {
                    const prices = UserSystem.calculateRetailPrices(prod.rawGreenPrice);
                    if (prices && prices.p250) {
                        document.getElementById(`cat-edit-price-${id}`).value = prices.p250;
                        alert('Цена за 250г успешно рассчитана и подтянута на основе зеленого зерна: ' + prices.p250 + ' ₽');
                    }
                } else {
                    alert('Не удалось найти данные зеленого зерна для этого лота в Extrinsic.');
                }
            },

            uploadImageToImgBB: async function(id) {
                const fileInput = document.getElementById(`cat-edit-file-${id}`);
                const file = fileInput.files[0];
                if (!file) return;

                const statusEl = document.getElementById(`cat-upload-status-${id}`);
                const urlInput = document.getElementById(`cat-edit-imageUrl-${id}`);
                
                this.setArticleEditorStatus(id, "Загрузка изображения на ImgBB...", 'info');
                
                try {
                    const imageUrl = await this.uploadImageBlobToImgBB(file);
                    const currentVal = urlInput.value.trim();
                    urlInput.value = currentVal ? currentVal + ', ' + imageUrl : imageUrl;
                    this.setArticleEditorStatus(id, "Фото успешно загружено!", 'success');
                } catch (e) {
                    console.error(e);
                    this.setArticleEditorStatus(id, "Ошибка загрузки: " + e.message, 'error');
                }
            },

            updateCatalogRow: async function(id, checkboxEl) {
                const statusEl = document.getElementById(`cat-status-${id}`);
                const isChecked = checkboxEl.checked;
                checkboxEl.disabled = true;
                statusEl.textContent = "Сохранение..."; statusEl.className = "save-status saving";
                try {
                    const response = await fetch(YANDEX_FUNCTION_URL + "?type=catalog_update", {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: id, inCatalog: isChecked ? "1" : "" })
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error("Ошибка сервера");

                    checkboxEl.disabled = false;
                    statusEl.textContent = "Сохранено ✓"; statusEl.className = "save-status success";
                    setTimeout(() => { statusEl.style.opacity = '0'; setTimeout(() => { statusEl.textContent = ""; statusEl.style.opacity = ''; }, 300); }, 2000);

                    const pIndex = this.ALL_PRODUCTS.findIndex(p => p.id === id);
                    if (pIndex !== -1) {
                        this.ALL_PRODUCTS[pIndex].inCatalog = isChecked ? "1" : "";
                        
                        if (isChecked) {
                            if (confirm(`Отправить подписчикам уведомление о новом лоте "${this.ALL_PRODUCTS[pIndex].sample}" со скидкой 10% на 24 часа?`)) {
                                const token = localStorage.getItem('locus_token');
                                const product = this.ALL_PRODUCTS[pIndex];
                                const fullProduct = (typeof ALL_PRODUCTS_CACHE !== 'undefined' && Array.isArray(ALL_PRODUCTS_CACHE))
                                    ? (ALL_PRODUCTS_CACHE.find(p => String(p?.id || '') === String(product.id || '')) || ALL_PRODUCTS_CACHE.find(p => String(p?.sample || '') === String(product.sample || '')))
                                    : null;
                                const bouquetDescription = String(fullProduct?.flavorDesc || product?.flavorDesc || '').trim();
                                const nuanceDescription = String(fullProduct?.flavorNotes || product?.flavorNotes || '').trim();
                                const categoryName = String(fullProduct?.category || product?.category || '').trim();
                                this.renderPackPreviewToBlob(product)
                                .then(packBlob => {
                                    console.log('notifyNewLot pack blob', {
                                        sampleName: product.sample,
                                        size: Number(packBlob?.size) || 0,
                                        type: String(packBlob?.type || '')
                                    });
                                    return this.blobToBase64(packBlob);
                                })
                                .then(packBase64 => {
                                    console.log('notifyNewLot attachment payload', {
                                        sampleName: product.sample,
                                        base64Length: String(packBase64 || '').length
                                    });
                                    return fetch(LOCUS_API_URL + '?action=notifyNewLot', {
                                    method: 'POST',
                                    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        action: 'notifyNewLot',
                                        productId: product.id,
                                        sampleName: product.sample,
                                        bouquetDescription,
                                        nuanceDescription,
                                        categoryName,
                                        adminAttachment: {
                                            filename: `${product.sample}_locus_coffee.png`,
                                            contentType: 'image/png',
                                            contentBase64: packBase64
                                        }
                                    })
                                });
                                }).then(res => res.json()).then(data => {
                                    console.log('notifyNewLot response', data);
                                    if (data.success) alert(`Рассылка запущена! Отправлено писем: ${data.sentCount}`);
                                    else alert('Ошибка рассылки: ' + data.error);
                                }).catch(e => alert('Ошибка при вызове рассылки: ' + e.message));
                            }
                        }
                    }

                    this.renderCatalog();
                    if (window.fetchExternalData) window.fetchExternalData(); // Обновляем витрину
                } catch (error) {
                    checkboxEl.disabled = false; checkboxEl.checked = !isChecked;
                    statusEl.textContent = "Ошибка!"; statusEl.className = "save-status error";
                    setTimeout(() => { statusEl.style.opacity = '0'; }, 3000);
                }
            },

            deleteRow: async function(id, sampleName) {
                if (!confirm(`Вы точно хотите безвозвратно удалить лот "${sampleName}" из базы данных?`)) return;
                const btn = document.getElementById(`cat-btn-delete-${id}`);
                const rowEl = document.getElementById(`cat-item-row-${id}`);
                btn.disabled = true;
                try {
                    const response = await fetch(YANDEX_FUNCTION_URL + "?type=catalog_delete", {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id })
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error("Ошибка сервера");
                    rowEl.style.opacity = '0';
                    setTimeout(() => { 
                        const parent = rowEl.parentNode; rowEl.remove(); 
                        if (parent && parent.children.length === 0) {
                            const isCatalog = parent.id === 'catalog-list-active';
                            parent.innerHTML = `<div class="empty-msg">${isCatalog ? 'Нет лотов в каталоге' : 'Нет сохраненных каппингов'}</div>`;
                        }
                        if (window.fetchExternalData) window.fetchExternalData(); // Обновляем витрину
                    }, 300);
                } catch (error) {
                    alert("Ошибка сети при удалении.");
                    btn.disabled = false;
                }
            },

            duplicateRow: async function(id, event) {
                event.stopPropagation();
                if (!confirm(`Создать копию этого лота?`)) return;
                try {
                    document.body.style.cursor = 'wait';
                    const response = await fetch(YANDEX_FUNCTION_URL + "?type=catalog_duplicate", {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id })
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error("Ошибка сервера");
                    await this.loadData();
                    if (window.fetchExternalData) window.fetchExternalData(); // Обновляем витрину
                } catch (error) {
                    alert("Ошибка сети при копировании лота.");
                } finally { document.body.style.cursor = 'default'; }
            }
        };
        window.CatalogSystem = CatalogSystem;
        const FortuneSystem = {
            init: function() {
                setTimeout(() => {
                    const today = new Date().toDateString();
                    // Если сегодня еще не играли и не отказывались
                    if (localStorage.getItem('locus_fortune_date') !== today) {
                        this.showOffer();
                    }
                }, 2000); // Показываем через 2 секунды после загрузки
            },
            showOffer: function() {
                if (document.getElementById('fortune-offer')) return;
                const div = document.createElement('div');
                div.id = 'fortune-offer';
                div.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%, -50%); background:#fff; padding:15px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.15); z-index:50; width:220px; border:1px solid var(--locus-border); text-align:center;';
                div.innerHTML = `
                    <div style="font-weight:bold; color:var(--locus-dark); margin-bottom:10px;">Колесо удачи! 🎁</div>
                    <div style="font-size:12px; margin-bottom:15px; color:#555;">Испытайте удачу и получите дополнительную скидку 10% на случайный сорт.</div>
                    <button class="lc-btn" style="padding:8px; font-size:12px; margin-bottom:8px;" onclick="FortuneSystem.accept()">Участвую!</button>
                    <div style="font-size:10px; color:gray; cursor:pointer; text-decoration:underline;" onclick="FortuneSystem.decline()">Перейти в каталог</div>
                `;
                document.body.appendChild(div);
            },
            accept: function() {
                const offer = document.getElementById('fortune-offer');
                if(offer) offer.remove();
                this.activateTriangle();
                window.fortuneMode = true;
                window.wheelSpun = false;
                window.fortuneMaxVelocity = 0;
                alert('Крутите колесо как можно сильнее! Сектор, который остановится у золотого треугольника, получит скидку 10%.');
            },
            decline: function() {
                const offer = document.getElementById('fortune-offer');
                if(offer) offer.remove();
                localStorage.setItem('locus_fortune_date', new Date().toDateString());
            },
            activateTriangle: function() {
                const zone = document.getElementById('wheel-zone');
                const pointer = document.createElement('div');
                pointer.id = 'fortune-pointer';
                
                // Единый и неизменный размер холста для всех версий
                pointer.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 2L22 20H2L12 2Z" fill="#DAA520"/></svg>`;
                
                // Базовые общие стили
                pointer.style.cssText = 'position:absolute; top:50%; z-index:99999; filter:drop-shadow(0 4px 8px rgba(218, 165, 32, 0.8)); transition: all 0.3s ease; pointer-events: none;';
                
                if (window.innerWidth > 768) {
                    // ДЕСКТОП: Увеличиваем масштаб ровно в 2 раза с помощью scale(2)
                    pointer.style.transform = 'translateY(-50%) rotate(-90deg) scale(2)';
                    pointer.style.left = 'calc(50% + 210px)'; 
                } else {
                    // МОБИЛКА: Оставляем стандартный масштаб scale(1)
                    pointer.style.transform = 'translateY(-50%) rotate(-90deg) scale(1)';
                    pointer.style.right = '10px';
                }
                
                zone.appendChild(pointer);
            },
            checkWin: function() {
                if (!window.fortuneMode) return;
                
                let targetAngle = (90 - rotation) % 360;
                if (targetAngle < 0) targetAngle += 360;
                
                let winningSeg = null;
                let curAngle = 0;
                const total = SHOP_DATA.reduce((acc, cat) => acc + cat.children.length, 0);
                
                for (let cat of SHOP_DATA) {
                    if (cat.children.length === 0) continue;
                    const catA = (cat.children.length / total) * 360;
                    let childCur = curAngle;
                    for (let child of cat.children) {
                        const childA = catA / cat.children.length;
                        if (targetAngle >= childCur && targetAngle < childCur + childA) {
                            winningSeg = child;
                            break;
                        }
                        childCur += childA;
                    }
                    if (winningSeg) break;
                    curAngle += catA;
                }
                
                if (winningSeg) {
                    const catName = (winningSeg.raw.category || '').toLowerCase();
                    
                    // ЛОГИКА 1: Проверяем, не выпала ли Информация или Аксессуары
                    if (catName.includes('аксессуар') || catName.includes('информац')) {
                        alert(`Ой! Колесо остановилось на секторе "${winningSeg.raw.sample}".\nНа него скидку сделать нельзя :)\n\nВращайте еще раз!`);
                        window.wheelSpun = false;
                        window.fortuneMaxVelocity = 0;
                        window.fortuneLocked = false; // Разблокируем колесо для новой попытки
                        return;
                    }

                    const lotName = winningSeg.raw.sample;
                    localStorage.setItem('locus_fortune_lot', lotName);
                    localStorage.setItem('locus_fortune_date', new Date().toDateString());
                    
                    alert(`Поздравляем! 🎉\n\n"${lotName}"!\nСкидка 10% на этот сорт будет автоматически применяться в вашей корзине до конца дня!`);
                    
                    window.fortuneMode = false;
                    window.fortuneLocked = false; // Снимаем блокировку
                    const pointer = document.getElementById('fortune-pointer');
                    if(pointer) pointer.remove();
                    
                    if (window.UserSystem) window.UserSystem.updateCartTotals();
                }
            }
        };
        window.FortuneSystem = FortuneSystem;

        // --- USER SYSTEM ---
        const UserSystem = {
            currentUser: null, uid: null, localCart: [], activePromo: null,
            cdekPrice: 0, cdekInfo: null, currentPickupCode: null,
            pickupLockerCodeEnabled: false,
            
            // WHOLESALE & PRICING
            pricingSettings: null,
            usdRate: 0,
            usdPrevRate: 0,
            usdHistRate: 0,
            usdCurrentDate: '',
            usdHistoricalDate: '',
            usdHistoricalDaysBackActual: 0,
            wholesaleEconomics: {
                minOrderKg: 5,
                greenLogisticsPerKg: 50,
                roastLossFilter: 0.16,
                roastLossEspresso: 0.20,
                roastLossAroma: 0.20,
                pack250: 20,
                pack1000: 22,
                stickerSet: 10,
                boxPer10Kg: 50,
                paymentDocPerOrder: 50,
                laborPerKg: 50,
                utilitiesPerKg: 10,
                packingLaborPerKg: 10,
                amortizationPerKg: 5,
                internalDeliveryPerKg: 5,
                spoilageReservePerKg: 0,
                fixedMonthly: 150000,
                monthlyVolumeKg: 120,
                usnRate: 0.06,
                targetMarginRate: 0.30,
                targetContributionPerKg: 200,
                commercialMarkupRate: 0.10
            },
            userDataLoaded: false,
            retailCountdownInterval: null,
            retailCountdownPendingUpdates: {},
            articleUnlockCache: {},
            articleUnlockRequestPending: false,

            init: function() {
                const savedCart = localStorage.getItem('locus_cart');
                if(savedCart) this.localCart = JSON.parse(savedCart);
                this.updateCartBadge();
                
                this.fetchUSDRate();
                this.fetchPricingSettings();
                PromotionSystem.init();
                MessageSystem.init();

                const token = localStorage.getItem('locus_token');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1])); 
                        this.uid = payload.userId;
                        this.userDataLoaded = false;
                        this.currentUser = { id: this.uid, email: payload.email, totalSpent: 0, cart: [], history: [], subscription: [] }; 
                        this.updateUIState();
                        
                        // Сначала пробуем безопасно дозавершить оплату после возврата из Робокассы, затем тянем актуальный профиль
                        (async () => {
                            await this.finalizeRobokassaReturn();
                            await this.fetchUserData();
                            this.startPendingOrderWatcher();
                        })();
                        if(payload.email === 'info@locus.coffee') {
                            const btnAdmin = document.getElementById('btn-open-admin');
                            if(btnAdmin) { 
                                btnAdmin.style.display = 'flex';
                                btnAdmin.onclick = () => this.toggleModal(true, 'admin');
                            }
                        }
                    } catch(e) {
                        console.error('Ошибка чтения токена', e);
                        localStorage.removeItem('locus_token');
                    }
                } else {
                    this.uid = null;
                    this.userDataLoaded = false;
                    this.currentUser = null; 
                    this.updateUIState();
                    const btnAdmin = document.getElementById('btn-open-admin');
                    if(btnAdmin) btnAdmin.style.display = 'none';
                }
                PromotionSystem.checkAndShow();
                
                const safeListen = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
                safeListen('btn-open-lc', () => this.toggleModal(true, 'dashboard'));
                safeListen('btn-open-cart', () => {
                    this.toggleModal(true, 'cart');
                    this.verifyActivePromo(); // Проверка при открытии корзины
                    this.initCDEK();
                });
                safeListen('btn-open-wholesale', () => {
                    this.renderWholesaleTable();
                    this.toggleModal(true, 'wholesale');
                });
                safeListen('btn-unlock-article', () => this.unlockArticle());
                safeListen('btn-close-lc', () => this.toggleModal(false));
                safeListen('link-to-reg', () => this.switchView('register'));
                safeListen('link-to-login', () => this.switchView('login'));
                safeListen('link-to-forgot', () => this.switchView('forgot-password'));
                safeListen('link-to-login-from-forgot', () => this.switchView('login'));
                safeListen('link-to-login-from-reset', () => this.switchView('login'));
                safeListen('btn-action-reg', () => this.register());
                safeListen('btn-action-login', () => this.login());
                safeListen('btn-action-forgot', () => this.requestPasswordReset());
                safeListen('btn-action-reset', () => this.submitPasswordReset());
                safeListen('btn-gen-password', () => this.fillGeneratedPassword('reg-pass'));
                safeListen('btn-gen-reset-password', () => this.fillGeneratedPassword('reset-pass', 'reset-pass-confirm'));
                this.setupPasswordVisibilityToggles();
                safeListen('btn-logout', () => this.logout());
                safeListen('btn-checkout', () => this.placeOrder());
                safeListen('btn-apply-promo', () => this.applyPromo());

                const btnCart = document.getElementById('btn-cart');
                if(btnCart) btnCart.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopImmediatePropagation();
                    if(this.currentUser && this.uid) {
                        const titleEl = document.getElementById('p-title');
                        const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
                        this.addToCart(title, currentWeight, currentGrind);
                    } else {
                        alert('Войдите в ЛК чтобы сделать покупку.');
                        this.toggleModal(true, 'login');
                    }
                });
                
                const btnSub = document.getElementById('btn-subscription');
                if(btnSub) btnSub.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopImmediatePropagation();
                    if(this.currentUser && this.uid) {
                        const titleEl = document.getElementById('p-title');
                        const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
                        // Исправлено: передаем текущий помол
                        this.addToSubscription(title, currentWeight, currentGrind);
                    } else {
                        alert('Войдите в ЛК для подписки.');
                        this.toggleModal(true, 'login');
                    }
                });
                this.fetchNewLotDiscount();
                
            },

            fetchNewLotDiscount: async function() {
            try {
                const res = await fetch(LOCUS_API_URL + '?action=getNewLotDiscount');
                const data = await res.json();
                if (data.success && data.discount) {
                    this.newLotDiscount = data.discount;
                }
            } catch(e) {}
        },

        toggleNewLotsNotification: async function() {
            if(!this.uid) return;
            const isChecked = document.getElementById('notify-new-lots-check').checked;
            
            let history = [...(this.currentUser.history || [])];
            history = history.filter(item => !(item && item.isSystemMeta && item.systemType === 'NOTIFY_NEW_LOTS'));
            history.push({ isSystemMeta: true, systemType: 'NOTIFY_NEW_LOTS', enabled: isChecked, updatedAt: new Date().toISOString() });
            
            this.currentUser.history = history;

            const token = localStorage.getItem('locus_token');
            if(token) {
                try {
                    await fetch(LOCUS_API_URL + '?action=updateUser', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'updateUser', field: 'history', data: history })
                    });
                } catch(e) {
                    console.error('Ошибка сохранения', e);
                }
            }
        },

            normalizeEmailAddress: function(value) {
                return String(value || '').trim().toLowerCase();
            },

            isValidEmailAddress: function(email) {
                const value = this.normalizeEmailAddress(email);
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
            },

            getRegistrationPasswordError: function(password) {
                const value = typeof password === 'string' ? password : '';
                if (!value) return 'Укажите пароль.';
                if (value.length < 8) return 'Пароль должен содержать минимум 8 символов.';
                if (value.length > 72) return 'Пароль слишком длинный. Максимум 72 символа.';
                if (/\s/.test(value)) return 'Пароль не должен содержать пробелы.';
                if (!/[A-ZА-ЯЁ]/.test(value)) return 'Пароль должен содержать хотя бы одну заглавную букву.';
                if (!/[a-zа-яё]/.test(value)) return 'Пароль должен содержать хотя бы одну строчную букву.';
                if (!/\d/.test(value)) return 'Пароль должен содержать хотя бы одну цифру.';
                return '';
            },

            validateRegistrationCredentials: function(emailValue, passwordValue) {
                const email = this.normalizeEmailAddress(emailValue);
                if (!email) throw new Error('Укажите email.');
                if (!this.isValidEmailAddress(email)) throw new Error('Укажите корректный email в формате name@example.com.');

                const passwordError = this.getRegistrationPasswordError(passwordValue);
                if (passwordError) throw new Error(passwordError);

                return { email, password: passwordValue };
            },

            formatProductSelectionMeta: function(productOrName, weight, grind) {
                const meta = ProductManager.getDisplayMeta(productOrName, weight, grind);
                const parts = [];
                if (meta.weight) parts.push(`${meta.weight} г`);
                if (meta.grind) parts.push(meta.grind);
                return parts.length ? ` (${parts.join(', ')})` : '';
            },

            getResetPasswordTokenFromUrl: function() {
                return new URL(window.location.href).searchParams.get('reset_token') || '';
            },

            cleanupAuthUrlParams: function() {
                const url = new URL(window.location.href);
                url.searchParams.delete('reset_token');
                const currentView = url.searchParams.get('view');
                if (currentView === 'forgot-password' || currentView === 'reset-password' || currentView === 'login') {
                    url.searchParams.delete('view');
                }
                window.history.replaceState({}, '', url);
            },

            generateStrongPassword: function(length = 16) {
                const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
                const lower = 'abcdefghijkmnopqrstuvwxyz';
                const digits = '23456789';
                const symbols = '!@#$%&*_-+=';
                const all = upper + lower + digits + symbols;
                const randomIndex = (limit) => {
                    if (window.crypto && window.crypto.getRandomValues) {
                        const bytes = new Uint32Array(1);
                        window.crypto.getRandomValues(bytes);
                        return bytes[0] % limit;
                    }
                    return Math.floor(Math.random() * limit);
                };
                const pick = (alphabet) => alphabet[randomIndex(alphabet.length)];

                const targetLength = Math.max(12, Number(length) || 16);
                const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
                while (chars.length < targetLength) chars.push(pick(all));

                for (let i = chars.length - 1; i > 0; i--) {
                    const swapIndex = randomIndex(i + 1);
                    [chars[i], chars[swapIndex]] = [chars[swapIndex], chars[i]];
                }

                return chars.join('');
            },

            fillGeneratedPassword: function(primaryInputId, confirmInputId = '') {
                const nextPassword = this.generateStrongPassword();
                const primaryInput = document.getElementById(primaryInputId);
                const confirmInput = confirmInputId ? document.getElementById(confirmInputId) : null;
                if (!primaryInput) return;

                primaryInput.value = nextPassword;
                if (confirmInput) confirmInput.value = nextPassword;
                primaryInput.focus();
                primaryInput.select();
            },

            STICKER_EXPORT_DPI: 300,
            STICKER_EXPORT_SIZES_MM: {
            front: { width: 80, height: 80 },
            back: { width: 60, height: 60 },
            back80: { width: 80, height: 80 }
        },

            supportsStickerExport: function(product) {
                return !!product && !ProductManager.getTypeInfo(product).isSpecial;
            },

            getCatalogProductById: function(productId) {
                return (this.ALL_PRODUCTS || []).find(item => String(item.id) === String(productId)) || null;
            },

            getStickerExportConfig: function(side) {
                return this.STICKER_EXPORT_SIZES_MM[side] || this.STICKER_EXPORT_SIZES_MM.front;
            },

            mmToPrintPixels: function(mm, dpi = this.STICKER_EXPORT_DPI) {
                return Math.round((Number(mm) || 0) * dpi / 25.4);
            },

            sanitizeStickerFileName: function(value) {
                const normalized = String(value || 'sticker')
                    .replace(/[\\/:*?"<>|]+/g, '_')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/\s/g, '_');
                return normalized.slice(0, 80) || 'sticker';
            },

            createStickerExportContainer: function(product) {
                const host = document.createElement('div');
                host.className = 'sticker-export-host';
                host.style.cssText = 'position:fixed; left:-10000px; top:0; pointer-events:none; background:#fff; padding:0; margin:0; z-index:-1;';
                host.innerHTML = `<div>${this.getViewHtml(product)}</div>`;
                document.body.appendChild(host);
                return host;
            },

            createPackPreviewExportContainer: function(product) {
                const host = document.createElement('div');
                host.className = 'sticker-export-host';
                // Полностью имитируем DOM-окружение магазина, чтобы CSS для 3D-трансформаций и шрифтов сработали идеально
                host.style.cssText = 'position:fixed; left:-10000px; top:0; pointer-events:none; background:transparent; padding:0; margin:0; z-index:-1; width:420px;';
                host.innerHTML = `
                    <div id="coffee-shop-wheel" class="cs-widget-container" style="min-height:0; display:block; background:transparent;">
                        <div class="info-area" style="padding:20px; height:auto; background:transparent;">
                            <div id="product-info" class="info-card active" style="transform:none; display:block;">
                                <div id="p-simple-desc" class="simple-desc">
                                    ${this.getPackPreviewHtml(product)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(host);
                return host;
            },

            waitForStickerRenderReady: async function() {
                if (document.fonts?.ready) {
                    try {
                        await document.fonts.ready;
                    } catch (e) {}
                }
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            },

            waitForRenderImagesReady: async function(rootEl) {
                if (!rootEl) return;
                const images = [];
                if (rootEl.tagName === 'IMG') images.push(rootEl);
                if (typeof rootEl.querySelectorAll === 'function') {
                    rootEl.querySelectorAll('img').forEach(img => images.push(img));
                }
                const uniqueImages = Array.from(new Set(images));
                if (!uniqueImages.length) return;

                await Promise.all(uniqueImages.map(img => new Promise(resolve => {
                    let settled = false;
                    const done = () => {
                        if (settled) return;
                        settled = true;
                        img.removeEventListener('load', done);
                        img.removeEventListener('error', done);
                        resolve();
                    };

                    if (img.complete && img.naturalWidth > 0) {
                        if (typeof img.decode === 'function') {
                            img.decode().catch(() => {}).finally(done);
                        } else {
                            done();
                        }
                        return;
                    }

                    img.addEventListener('load', done, { once: true });
                    img.addEventListener('error', done, { once: true });
                    setTimeout(done, 10000);
                })));
            },

            extractPrimaryFontFamily: function(fontFamily) {
                const raw = String(fontFamily || '').trim();
                if (!raw) return '';
                const firstPart = raw.split(',')[0]?.trim() || '';
                return firstPart.replace(/^['"]+|['"]+$/g, '').trim();
            },

            ensureStickerExportFontReady: async function(stickerEl) {
                const computedFontFamily = window.getComputedStyle(stickerEl).fontFamily || '';
                const primaryFont = this.extractPrimaryFontFamily(computedFontFamily);
                if (document.fonts && typeof document.fonts.load === 'function' && primaryFont) {
                    try {
                        await Promise.all([
                            document.fonts.load(`400 20px "${primaryFont}"`),
                            document.fonts.load(`500 20px "${primaryFont}"`),
                            document.fonts.load(`600 20px "${primaryFont}"`),
                            document.fonts.load(`700 20px "${primaryFont}"`)
                        ]);
                    } catch (e) {}
                }
                return computedFontFamily;
            },

            lockStickerFontForRender: function(stickerEl, fontFamily) {
                const computedFontFamily = String(fontFamily || window.getComputedStyle(stickerEl).fontFamily || '').trim();
                if (!computedFontFamily) return () => {};

                const nodes = [stickerEl, ...stickerEl.querySelectorAll('*')];
                const previousState = nodes.map(node => ({
                    node,
                    fontFamily: node.style.getPropertyValue('font-family'),
                    fontFamilyPriority: node.style.getPropertyPriority('font-family'),
                    fontSynthesis: node.style.getPropertyValue('font-synthesis'),
                    fontSynthesisPriority: node.style.getPropertyPriority('font-synthesis'),
                    fontKerning: node.style.getPropertyValue('font-kerning'),
                    fontKerningPriority: node.style.getPropertyPriority('font-kerning'),
                    textRendering: node.style.getPropertyValue('text-rendering'),
                    textRenderingPriority: node.style.getPropertyPriority('text-rendering')
                }));

                nodes.forEach(node => {
                    node.style.setProperty('font-family', computedFontFamily, 'important');
                    node.style.setProperty('font-synthesis', 'none', 'important');
                    node.style.setProperty('font-kerning', 'normal', 'important');
                    node.style.setProperty('text-rendering', 'geometricPrecision', 'important');
                });

                return () => {
                    previousState.forEach(state => {
                        if (!state?.node) return;
                        if (state.fontFamily) state.node.style.setProperty('font-family', state.fontFamily, state.fontFamilyPriority || '');
                        else state.node.style.removeProperty('font-family');

                        if (state.fontSynthesis) state.node.style.setProperty('font-synthesis', state.fontSynthesis, state.fontSynthesisPriority || '');
                        else state.node.style.removeProperty('font-synthesis');

                        if (state.fontKerning) state.node.style.setProperty('font-kerning', state.fontKerning, state.fontKerningPriority || '');
                        else state.node.style.removeProperty('font-kerning');

                        if (state.textRendering) state.node.style.setProperty('text-rendering', state.textRendering, state.textRenderingPriority || '');
                        else state.node.style.removeProperty('text-rendering');
                    });
                };
            },

            getStickerSideFromElement: function(stickerEl) {
            if (stickerEl?.classList.contains('is-80')) return 'back80';
            return stickerEl?.classList.contains('locus-back-sticker-canvas') ? 'back' : 'front';
        },

            getCrc32Table: function() {
                if (this._crc32Table) return this._crc32Table;
                const table = new Uint32Array(256);
                for (let i = 0; i < 256; i++) {
                    let c = i;
                    for (let j = 0; j < 8; j++) {
                        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                    }
                    table[i] = c >>> 0;
                }
                this._crc32Table = table;
                return table;
            },

            concatUint8Arrays: function(...arrays) {
                const totalLength = arrays.reduce((sum, arr) => sum + (arr?.length || 0), 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                arrays.forEach(arr => {
                    if (!arr?.length) return;
                    result.set(arr, offset);
                    offset += arr.length;
                });
                return result;
            },

            computeCrc32: function(bytes) {
                const table = this.getCrc32Table();
                let crc = 0xFFFFFFFF;
                for (let i = 0; i < bytes.length; i++) {
                    crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
                }
                return (crc ^ 0xFFFFFFFF) >>> 0;
            },

            createPngPhysChunk: function(dpi) {
                const pixelsPerMeter = Math.round(Number(dpi || this.STICKER_EXPORT_DPI) * 39.37007874);
                const chunkData = new Uint8Array(9);
                const dataView = new DataView(chunkData.buffer);
                dataView.setUint32(0, pixelsPerMeter);
                dataView.setUint32(4, pixelsPerMeter);
                chunkData[8] = 1;

                const chunkType = new TextEncoder().encode('pHYs');
                const crcInput = this.concatUint8Arrays(chunkType, chunkData);
                const crc = this.computeCrc32(crcInput);

                const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
                const chunkView = new DataView(chunk.buffer);
                chunkView.setUint32(0, chunkData.length);
                chunk.set(chunkType, 4);
                chunk.set(chunkData, 8);
                chunkView.setUint32(8 + chunkData.length, crc);
                return chunk;
            },

            setPngBlobDpi: async function(blob, dpi = this.STICKER_EXPORT_DPI) {
                if (!blob) throw new Error('PNG-файл не создан');
                const bytes = new Uint8Array(await blob.arrayBuffer());
                if (bytes.length < 8 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
                    return blob;
                }

                const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                const physChunk = this.createPngPhysChunk(dpi);
                let offset = 8;
                let insertOffset = 8;

                while (offset + 8 <= bytes.length) {
                    const chunkLength = dataView.getUint32(offset);
                    const chunkType = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
                    const nextOffset = offset + 12 + chunkLength;
                    if (chunkType === 'IHDR') insertOffset = nextOffset;
                    if (chunkType === 'pHYs') {
                        const updated = this.concatUint8Arrays(bytes.slice(0, offset), physChunk, bytes.slice(nextOffset));
                        return new Blob([updated], { type: 'image/png' });
                    }
                    offset = nextOffset;
                }

                const updated = this.concatUint8Arrays(bytes.slice(0, insertOffset), physChunk, bytes.slice(insertOffset));
                return new Blob([updated], { type: 'image/png' });
            },

            blobToBase64: function(blob) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = String(reader.result || '');
                        resolve(result.includes(',') ? result.split(',')[1] : result);
                    };
                    reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
                    reader.readAsDataURL(blob);
                });
            },

            renderStickerElementToBlob: async function(stickerEl, side = this.getStickerSideFromElement(stickerEl)) {
                if (!stickerEl) throw new Error('Макет наклейки не найден.');
                if (typeof html2canvas === 'undefined') throw new Error('Модуль генерации изображений ещё загружается.');

                const exportConfig = this.getStickerExportConfig(side);
                const targetWidthPx = this.mmToPrintPixels(exportConfig.width);
                const originalBorderColor = stickerEl.style.borderColor;
                const computedStickerFontFamily = await this.ensureStickerExportFontReady(stickerEl);
                const unlockStickerFont = this.lockStickerFontForRender(stickerEl, computedStickerFontFamily);
                stickerEl.style.borderColor = 'transparent';

                try {
                    await this.waitForStickerRenderReady();
                    await this.waitForRenderImagesReady(stickerEl);
                    const rect = stickerEl.getBoundingClientRect();
                    const scale = rect.width > 0 ? targetWidthPx / rect.width : (this.STICKER_EXPORT_DPI / 96);
                    const canvas = await html2canvas(stickerEl, {
                        scale: Math.max(scale, 1),
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        logging: false
                    });

                    const pngBlob = await new Promise((resolve, reject) => {
                        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать PNG-файл.')), 'image/png');
                    });
                    return await this.setPngBlobDpi(pngBlob, this.STICKER_EXPORT_DPI);
                } finally {
                    stickerEl.style.borderColor = originalBorderColor;
                    unlockStickerFont();
                }
            },

            renderPackPreviewToBlob: async function(product) {
                if (!product) throw new Error('Лот не найден.');
                if (typeof html2canvas === 'undefined') throw new Error('Модуль генерации изображений ещё загружается.');
                let host = null;
                try {
                    host = this.createPackPreviewExportContainer(product);
                    const packEl = host.querySelector('.product-pack-preview');
                    if (!packEl) throw new Error('Не удалось собрать пачку с лицевой наклейкой.');
                    
                    // Принудительно фиксируем шрифты перед рендером, как это делается для PDF-стикеров
                    const computedStickerFontFamily = await this.ensureStickerExportFontReady(packEl);
                    const unlockStickerFont = this.lockStickerFontForRender(packEl, computedStickerFontFamily);

                    await this.waitForStickerRenderReady();
                    await this.waitForRenderImagesReady(packEl);
                    
                    const rect = packEl.getBoundingClientRect();
                    const targetWidthPx = Math.max(Math.round((rect.width || 380) * 4), 1400);
                    const scale = rect.width > 0 ? targetWidthPx / rect.width : 4;
                    
                    // Рендерим с прозрачным фоном, чтобы картинка пачки в письме была красивой, без белого квадрата
                    const canvas = await html2canvas(packEl, { 
                        scale: Math.max(scale, 1), 
                        backgroundColor: null, 
                        useCORS: true, 
                        logging: false 
                    });
                    
                    unlockStickerFont(); // Снимаем жесткую привязку шрифта
                    
                    return await new Promise((resolve, reject) => {
                        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать PNG-файл пачки.')), 'image/png');
                    });
                } finally {
                    if (host && host.parentNode) host.parentNode.removeChild(host);
                }
            },

            downloadStickerElement: async function(stickerEl, sampleName, side) {
                const resolvedSide = side || this.getStickerSideFromElement(stickerEl);
                const pngBlob = await this.renderStickerElementToBlob(stickerEl, resolvedSide);
                const safeName = this.sanitizeStickerFileName(sampleName);
                const objectUrl = URL.createObjectURL(pngBlob);
                const link = document.createElement('a');
                link.download = `Sticker_${safeName}_300dpi.png`;
                link.href = objectUrl;
                link.click();
                setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            },

            sendStickerPackEmail: async function(productId, event) {
                const product = this.getCatalogProductById(productId);
                if (!this.supportsStickerExport(product)) {
                    alert('Для этого лота наклейки не генерируются.');
                    return;
                }

                const button = event?.currentTarget || null;
                const originalTitle = button?.getAttribute('title') || '';
                const originalDisabled = !!button?.disabled;
                if (button) {
                    button.disabled = true;
                    button.style.opacity = '0.5';
                    button.setAttribute('title', 'Идёт подготовка наклеек...');
                }

                let host = null;
                try {
                    const token = localStorage.getItem('locus_token');
                    if (!token) throw new Error('Нет доступа');

                    host = this.createStickerExportContainer(product);
                    
                    const frontStickerEl = host.querySelector('.locus-sticker-canvas');
                    const backStickerEl = host.querySelector('.locus-back-sticker-canvas:not(.is-80)');
                    const back80StickerEl = host.querySelector('.locus-back-sticker-canvas.is-80');
                    
                    if (!frontStickerEl || !backStickerEl || !back80StickerEl) throw new Error('Не удалось собрать все наклейки для отправки.');
                    
                    const [frontBlob, backBlob, back80Blob] = await Promise.all([
                        this.renderStickerElementToBlob(frontStickerEl, 'front'),
                        this.renderStickerElementToBlob(backStickerEl, 'back'),
                        this.renderStickerElementToBlob(back80StickerEl, 'back80')
                    ]);
                    
                    const safeBaseName = this.sanitizeStickerFileName(product.sample || 'lot');
                    const [frontBase64, backBase64, back80Base64] = await Promise.all([
                        this.blobToBase64(frontBlob),
                        this.blobToBase64(backBlob),
                        this.blobToBase64(back80Blob)
                    ]);

                    const res = await fetch(LOCUS_API_URL + '?action=sendStickerPackEmail', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'sendStickerPackEmail',
                            lotTitle: product.sample || 'Лот',
                            attachments: [
                                { filename: `${safeBaseName}_FRONT_80x80_300dpi.png`, contentType: 'image/png', contentBase64: frontBase64 },
                                { filename: `${safeBaseName}_BACK_60x60_300dpi.png`, contentType: 'image/png', contentBase64: backBase64 },
                                { filename: `${safeBaseName}_BACK_80x80_300dpi.png`, contentType: 'image/png', contentBase64: back80Base64 }
                            ]
                        })
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || 'Не удалось отправить наклейки на почту.');
                    alert('Все 3 наклейки отправлены на info@locus.coffee.');
                } catch (e) {
                    console.error(e);
                    alert('Ошибка отправки наклеек: ' + e.message);
                } finally {
                    if (host?.parentNode) host.parentNode.removeChild(host);
                    if (button) {
                        button.disabled = originalDisabled;
                        button.style.opacity = '';
                        button.setAttribute('title', originalTitle);
                    }
                }
            },

            getPasswordToggleIcon: function(isVisible) {
                if (isVisible) {
                    return `
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                            <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                            <path d="M10.58 10.58a2 2 0 102.84 2.84" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9.88 5.09A10.94 10.94 0 0112 4.91c5.05 0 9.27 3.27 10.5 7.09a10.96 10.96 0 01-4.04 5.27M6.1 6.11C4.13 7.39 2.63 9.31 1.5 12c.77 1.84 1.87 3.36 3.21 4.49A10.75 10.75 0 0012 19.09c1.13 0 2.21-.15 3.23-.43" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    `;
                }

                return `
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                        <path d="M1.5 12S5.5 4.91 12 4.91 22.5 12 22.5 12 18.5 19.09 12 19.09 1.5 12 1.5 12z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/>
                    </svg>
                `;
            },

            updatePasswordToggleState: function(input, button) {
                if (!input || !button) return;
                const isVisible = input.type === 'text';
                button.innerHTML = this.getPasswordToggleIcon(isVisible);
                button.setAttribute('aria-label', isVisible ? 'Скрыть пароль' : 'Показать пароль');
                button.setAttribute('title', isVisible ? 'Скрыть пароль' : 'Показать пароль');
                button.classList.toggle('is-visible', isVisible);
            },

            enhancePasswordField: function(input) {
                if (!input || input.dataset.passwordToggleReady === '1') return;

                const wrapper = document.createElement('div');
                wrapper.className = 'lc-password-field';
                input.parentNode.insertBefore(wrapper, input);
                wrapper.appendChild(input);

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'password-visibility-toggle';
                button.setAttribute('aria-pressed', 'false');
                wrapper.appendChild(button);

                button.addEventListener('click', () => {
                    const shouldShow = input.type === 'password';
                    input.type = shouldShow ? 'text' : 'password';
                    button.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
                    this.updatePasswordToggleState(input, button);
                    input.focus({ preventScroll: true });
                    const cursorPos = input.value.length;
                    try {
                        input.setSelectionRange(cursorPos, cursorPos);
                    } catch (e) {}
                });

                input.dataset.passwordToggleReady = '1';
                this.updatePasswordToggleState(input, button);
            },

            setupPasswordVisibilityToggles: function() {
                ['login-pass', 'reg-pass', 'reset-pass', 'reset-pass-confirm']
                    .map(id => document.getElementById(id))
                    .forEach(input => this.enhancePasswordField(input));
            },

            storeCredentialWithPasswordManager: async function(email, password) {
                if (!email || !password || !window.PasswordCredential || !navigator.credentials || !navigator.credentials.store) return false;
                try {
                    const credential = new PasswordCredential({ id: email, password: password, name: email });
                    await navigator.credentials.store(credential);
                    return true;
                } catch (e) {
                    return false;
                }
            },

            isSystemHistoryItem: function(item) {
                return !!(item && item.isSystemMeta && item.systemType);
            },

            getVisibleHistoryItems: function(history = this.currentUser?.history || []) {
                return (Array.isArray(history) ? history : []).filter(item => !this.isSystemHistoryItem(item));
            },

            escapeHtmlText: function(value) {
                return String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            },

            getWelcomePopupDismissStorageKey: function(userId = this.uid) {
                return userId ? `locus_welcome_popup_dismissed_${userId}` : '';
            },

            isArticleCartItem: function(item) {
                const category = String(item?.category || '').toLowerCase();
                const title = String(item?.item || '').toLowerCase().replace(/\s+/g, ' ').trim();
                const numericPrice = parseFloat(item?.price);
                return !!(item && (item.isArticle === true || (category.includes('информац') && title !== 'статьи' && numericPrice > 0)));
            },

            hasOnlyDigitalCartItems: function() {
                return Array.isArray(this.localCart) && this.localCart.length > 0 && this.localCart.every(item => this.isArticleCartItem(item));
            },

            syncCartCheckoutMode: function() {
                const digitalOnly = this.hasOnlyDigitalCartItems();
                const deliveryTitle = document.getElementById('cart-delivery-title');
                const cdekStatus = document.getElementById('cdek-status');
                const cdekWidget = document.getElementById('custom-cdek-widget');
                const pickupBlock = document.getElementById('self-pickup-block');
                const pickupCheckbox = document.getElementById('self-pickup-checkbox');
                const pickupCodeBlock = document.getElementById('self-pickup-code-block');

                if (deliveryTitle) {
                    deliveryTitle.textContent = digitalOnly ? 'Цифровой доступ' : 'Доставка (СДЭК)';
                }

                if (digitalOnly) {
                    if (cdekStatus) {
                        cdekStatus.innerHTML = '<span style="opacity:0.8">После оплаты пароль к статье придет на email, доступ откроется на 1 месяц.</span>';
                    }
                    if (cdekWidget) {
                        cdekWidget.style.display = 'none';
                        cdekWidget.style.opacity = '1';
                        cdekWidget.style.pointerEvents = 'auto';
                    }
                    if (pickupBlock) pickupBlock.style.display = 'none';
                    if (pickupCheckbox) pickupCheckbox.checked = false;
                    if (pickupCodeBlock) pickupCodeBlock.style.display = 'none';
                    this.cdekPrice = 0;
                    return;
                }

                if (cdekStatus) {
                    cdekStatus.innerHTML = '<span style="opacity:0.6">Стоимость доставки рассчитывается после выбора ПВЗ</span>';
                }
                if (cdekWidget) {
                    cdekWidget.style.display = '';
                    cdekWidget.style.opacity = pickupCheckbox?.checked ? '0.3' : '1';
                    cdekWidget.style.pointerEvents = pickupCheckbox?.checked ? 'none' : 'auto';
                }
                if (pickupBlock) pickupBlock.style.display = '';
            },

            hasPendingWelcomePopup: function() {
                if (!this.currentUser || !this.uid || this.currentUser.email === 'info@locus.coffee') return false;
                const dismissKey = this.getWelcomePopupDismissStorageKey();
                if (dismissKey && localStorage.getItem(dismissKey) === '1') return false;
                return Array.isArray(this.currentUser.history) && this.currentUser.history.some(item => item && item.isSystemMeta && item.systemType === 'welcome_popup_pending');
            },

            isAdminUser: function() {
                return !!(this.currentUser && this.currentUser.email === 'info@locus.coffee');
            },

            dismissWelcomePopup: async function() {
                if (!this.uid) return;
                const token = localStorage.getItem('locus_token');
                const dismissKey = this.getWelcomePopupDismissStorageKey();
                if (dismissKey) localStorage.setItem(dismissKey, '1');
                this.currentUser.history = (this.currentUser.history || []).filter(item => !(item && item.isSystemMeta && item.systemType === 'welcome_popup_pending'));
                this.currentUser.history.push({ isSystemMeta: true, systemType: 'welcome_popup_dismissed', dismissedAt: new Date().toISOString() });
                if (!token) return;
                try {
                    await fetch(LOCUS_API_URL + '?action=dismissWelcomePopup', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'dismissWelcomePopup' })
                    });
                } catch (e) {}
            },

            showWelcomeRegistrationPopup: function() {
                if (!this.hasPendingWelcomePopup()) return;
                const overlay = document.getElementById('promo-popup');
                const title = document.getElementById('promo-popup-title');
                const msg = document.getElementById('promo-popup-msg');
                const btn = document.getElementById('btn-promo-action');
                const close = document.getElementById('btn-promo-close');
                if (!overlay || !title || !msg || !btn || !close) return;

                title.textContent = 'Спасибо за регистрацию!';
                msg.textContent = 'Возьмите пожалуйста приветственную скидку 10%\nОна применится при первом заказе в вашей Корзине автоматически.';
                btn.textContent = 'ОК';
                close.style.display = 'none';
                overlay.classList.add('active');

                const handleClose = async () => {
                    overlay.classList.remove('active');
                    close.style.display = '';
                    btn.onclick = null;
                    close.onclick = null;
                    await this.dismissWelcomePopup();
                    this.renderDashboard();
                    this.updateCartTotals();
                };

                btn.onclick = handleClose;
                close.onclick = handleClose;
            },

            getPublishedArticles: function() {
                return (Array.isArray(ALL_PRODUCTS_CACHE) ? ALL_PRODUCTS_CACHE : [])
                    .filter(product => {
                        const typeInfo = ProductManager.getTypeInfo(product);
                        const isActive = product.inCatalog === "1" || product.inCatalog === 1 || product.inCatalog === true;
                        return isActive && typeInfo.isArticle;
                    })
                    .sort((a, b) => String(a.sample || '').localeCompare(String(b.sample || '')));
            },

            getArticleHubHtml: function() {
                const articles = this.getPublishedArticles();
                if (!articles.length) {
                    return `
                        <div class="article-hub-empty">
                            Скоро здесь появятся авторские статьи о кофе.
                        </div>
                    `;
                }

                return `
                    <div class="article-hub-list">
                        <div class="article-hub-lead">Выберите материал, чтобы купить его или открыть уже оплаченный доступ.</div>
                        ${articles.map(article => {
                            const access = this.getActiveArticleAccess(article);
                            const inCart = this.localCart.some(item => this.isArticleCartItem(item) && String(item.lotId || item.item || '') === String(article.id || ''));
                            const price = parseFloat(article.price) || 0;
                            const previewHtml = ProductManager.getDisplayDesc(article);
                            const accessText = access
                                ? `Доступ до ${new Date(access.expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : 'Доступ на 1 месяц после оплаты';

                            return `
                                <article class="article-hub-card">
                                    <div class="article-hub-card-head">
                                        <div>
                                            <div class="article-hub-card-title">${this.escapeHtmlText(article.sample || 'Статья')}</div>
                                            <div class="article-hub-card-price">${price} ₽</div>
                                        </div>
                                        <div class="article-hub-card-actions">
                                            <button type="button" class="btn-locus btn-sub article-hub-btn" onclick="UserSystem.openProductById('${article.id}', ${access ? '{ focusAccess: true, autoPrompt: true }' : '{}'})">Открыть</button>
                                            ${access
                                                ? `<button type="button" class="btn-locus btn-cart article-hub-btn" onclick="UserSystem.startArticleReadFlow('${article.id}')">Читать</button>`
                                                : `<button type="button" class="btn-locus btn-cart article-hub-btn" ${inCart ? 'disabled' : ''} onclick="UserSystem.addArticleToCart('${article.id}')">${inCart ? 'В корзине' : 'Купить'}</button>`
                                            }
                                        </div>
                                    </div>
                                    <div class="article-hub-card-preview">${previewHtml}</div>
                                    <div class="article-hub-card-meta">${accessText}</div>
                                </article>
                            `;
                        }).join('')}
                    </div>
                `;
            },

            openProductById: function(productId, options = {}) {
                const product = (Array.isArray(ALL_PRODUCTS_CACHE) ? ALL_PRODUCTS_CACHE : []).find(item => String(item.id) === String(productId));
                if (!product) {
                    alert('Лот не найден в каталоге.');
                    return;
                }

                if (product.externalUrl) {
                    openExternalProductUrl(product);
                    return;
                }

                const hasArticleAccess = !!this.getActiveArticleAccess(product);
                updateInfo({ depth: 1, raw: product });
                if (options.syncUrl !== false) {
                    const url = new URL(window.location);
                    url.searchParams.set('lot', product.sample || '');
                    window.history.replaceState({}, '', url);
                }

                if (options.focusAccess || hasArticleAccess) {
                    setTimeout(() => {
                        if (ProductManager.getTypeInfo(product).isArticle) {
                            this.renderArticleAccessPanel(product);
                            const accessPanel = document.getElementById('article-access-panel');
                            const passwordInput = document.getElementById('article-access-password');
                            if (accessPanel) accessPanel.style.display = 'block';
                            accessPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            passwordInput?.focus();
                            const articleKey = String(product.id || product.sample || '').trim();
                            const shouldPrompt = hasArticleAccess && !this.isAdminUser() && !this.articleUnlockCache[articleKey] && options.autoPrompt !== false;
                            if (shouldPrompt) {
                                const password = window.prompt('Введите пароль из письма для доступа к статье:');
                                if (password && password.trim()) {
                                    this.unlockArticleWithPassword(product, password.trim());
                                }
                            }
                        }
                    }, 420);
                }
            },

            startArticleReadFlow: async function(articleId) {
                const product = (Array.isArray(ALL_PRODUCTS_CACHE) ? ALL_PRODUCTS_CACHE : []).find(item => String(item.id) === String(articleId));
                if (!product) return alert('Статья не найдена.');

                this.openProductById(articleId, { focusAccess: true, autoPrompt: true });
                const articleKey = String(product.id || product.sample || '').trim();
                if (articleKey && this.articleUnlockCache[articleKey]) {
                    setTimeout(() => {
                        this.renderArticleAccessPanel(product);
                        this.openArticleReaderOverlay(product, this.articleUnlockCache[articleKey], this.getActiveArticleAccess(product));
                    }, 450);
                    return;
                }
                if (this.isAdminUser()) await this.unlockArticleWithPassword(product, '');
            },

            unlockArticleWithPassword: async function(product, password) {
                if (!product) return false;
                if (!password && !this.isAdminUser()) {
                    alert('Введите пароль из письма.');
                    return false;
                }
                if (this.articleUnlockRequestPending) return false;

                const access = this.getActiveArticleAccess(product);
                if (!access) {
                    alert('Срок доступа к статье истек или статья еще не куплена.');
                    return false;
                }

                const token = localStorage.getItem('locus_token');
                if (!token) {
                    alert('Для чтения статьи нужно войти в аккаунт.');
                    return false;
                }

                const button = document.getElementById('btn-unlock-article');
                this.articleUnlockRequestPending = true;
                if (button) {
                    button.disabled = true;
                    button.textContent = 'Открываем...';
                }

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=unlockArticle', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'unlockArticle', articleId: String(product.id || product.sample || ''), password })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success || !data.article) throw new Error(data.error || data.errorMessage || 'Не удалось открыть статью');

                    const articleId = String(data.article.id || product.id || product.sample || '');
                    const articleHtml = String(data.article.html || '');
                    if (!articleHtml.trim()) throw new Error('Полный текст статьи пока пустой');
                    const resolvedProduct = { ...product, id: articleId };
                    this.articleUnlockCache[articleId] = articleHtml;
                    this.renderArticleReader(resolvedProduct, articleHtml);
                    this.renderArticleAccessPanel(resolvedProduct);
                    this.openArticleReaderOverlay(resolvedProduct, articleHtml, this.getActiveArticleAccess(resolvedProduct));
                    document.getElementById('article-reader-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return true;
                } catch (e) {
                    alert('Ошибка доступа к статье: ' + e.message);
                    return false;
                } finally {
                    this.articleUnlockRequestPending = false;
                    if (button) button.disabled = false;
                }
            },

            addArticleToCart: function(articleId) {
                const article = (Array.isArray(ALL_PRODUCTS_CACHE) ? ALL_PRODUCTS_CACHE : []).find(item => String(item.id) === String(articleId));
                if (!article) return alert('Статья не найдена.');
                if (!this.currentUser || !this.uid) {
                    alert('Войдите в Личный кабинет чтобы купить статью.');
                    this.toggleModal(true, 'login');
                    return;
                }

                this.addToCart(article.sample || '', 250, '');
                this.toggleModal(true, 'cart');
            },

            getActiveArticleAccess: function(productOrId) {
                const articleId = String(typeof productOrId === 'object' ? (productOrId?.id || productOrId?.sample || '') : (productOrId || '')).trim();
                if (!articleId) return null;
                if (this.isAdminUser()) {
                    return {
                        articleId,
                        title: typeof productOrId === 'object' ? String(productOrId?.sample || '') : '',
                        expiresAt: '2099-12-31T20:59:00.000Z',
                        isAdmin: true
                    };
                }
                const now = Date.now();
                let found = null;
                this.getVisibleHistoryItems().forEach(entry => {
                    if (!entry || !Array.isArray(entry.items)) return;
                    entry.items.forEach(item => {
                        const access = item?.articleAccess;
                        if (!access) return;
                        if (String(access.articleId || '').trim() !== articleId) return;
                        const expiresAtMs = Date.parse(access.expiresAt || '');
                        if (!expiresAtMs || expiresAtMs <= now) return;
                        if (!found || expiresAtMs > Date.parse(found.expiresAt || '')) found = access;
                    });
                });
                return found;
            },

            ensureArticleReaderOverlay: function() {
                let overlay = document.getElementById('article-reader-overlay');
                if (overlay) return overlay;

                overlay = document.createElement('div');
                overlay.id = 'article-reader-overlay';
                overlay.className = 'article-reader-overlay';
                overlay.innerHTML = `
                    <div class="article-reader-modal">
                        <button type="button" class="article-reader-close" aria-label="Закрыть статью">×</button>
                        <div id="article-reader-overlay-meta" class="article-reader-overlay-meta"></div>
                        <div id="article-reader-overlay-body" class="article-reader-overlay-body"></div>
                    </div>
                `;
                overlay.addEventListener('click', (event) => {
                    if (event.target === overlay) this.closeArticleReaderOverlay();
                });
                overlay.querySelector('.article-reader-close')?.addEventListener('click', () => this.closeArticleReaderOverlay());
                if (!this.articleReaderGuardBound) {
                    document.addEventListener('visibilitychange', () => this.setArticleReaderObscured(document.visibilityState !== 'visible'));
                    window.addEventListener('blur', () => this.setArticleReaderObscured(true));
                    window.addEventListener('focus', () => this.setArticleReaderObscured(false));
                    this.articleReaderGuardBound = true;
                }
                document.body.appendChild(overlay);
                return overlay;
            },

            ensureStickerFontLoaded: async function() {
                const fontHref = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
                if (!document.getElementById('locus-sticker-font-link')) {
                    const link = document.createElement('link');
                    link.id = 'locus-sticker-font-link';
                    link.rel = 'stylesheet';
                    link.href = fontHref;
                    document.head.appendChild(link);
                }
                if (document.fonts && typeof document.fonts.load === 'function') {
                    try {
                        await Promise.all([
                            document.fonts.load("400 20px 'Inter'"),
                            document.fonts.load("500 20px 'Inter'"),
                            document.fonts.load("600 20px 'Inter'")
                        ]);
                    } catch (e) {}
                }
            },

            renderArticleContentInFrame: function(host, articleHtml = '') {
                if (!host) return;
                host.innerHTML = '';
                const frame = document.createElement('iframe');
                frame.className = 'article-reader-frame';
                frame.setAttribute('title', 'Текст статьи');
                host.appendChild(frame);

                const frameDoc = frame.contentDocument;
                if (!frameDoc) return;

                frameDoc.open();
                frameDoc.write(`
                    <!doctype html>
                    <html lang="ru">
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
                        <style>
                            html, body {
                                margin: 0;
                                padding: 0;
                                background: transparent;
                                color: #693a05;
                                font-family: 'Inter', Arial, sans-serif !important;
                                font-weight: 400 !important;
                                font-synthesis: none;
                                font-kerning: normal;
                                text-rendering: optimizeLegibility;
                                -webkit-font-smoothing: antialiased;
                                -moz-osx-font-smoothing: grayscale;
                                line-height: 1.75;
                                overflow: hidden;
                            }
                            body, body * {
                                font-family: 'Inter', Arial, sans-serif !important;
                                font-weight: 400 !important;
                                color: #693a05;
                                box-sizing: border-box;
                            }
                            body {
                                font-size: 20px;
                                user-select: none;
                                -webkit-user-select: none;
                                -webkit-touch-callout: none;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                                border-radius: 12px;
                            }
                            @media (max-width: 640px) {
                                body { font-size: 18px; }
                            }
                        </style>
                    </head>
                    <body>${articleHtml}</body>
                    </html>
                `);
                frameDoc.close();

                const resizeFrame = () => {
                    const root = frameDoc.documentElement;
                    const body = frameDoc.body;
                    const nextHeight = Math.max(
                        root?.scrollHeight || 0,
                        body?.scrollHeight || 0,
                        root?.offsetHeight || 0,
                        body?.offsetHeight || 0
                    );
                    frame.style.height = `${Math.max(nextHeight, 80)}px`;
                };

                ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(eventName => {
                    frameDoc.addEventListener(eventName, (event) => event.preventDefault());
                });
                frameDoc.addEventListener('keydown', (event) => {
                    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x', 's', 'p'].includes(String(event.key || '').toLowerCase())) {
                        event.preventDefault();
                    }
                });

                frame.addEventListener('load', resizeFrame);
                resizeFrame();
                setTimeout(resizeFrame, 60);
                setTimeout(resizeFrame, 240);
            },

            openArticleReaderOverlay: async function(product, articleHtml = '', access = null) {
                if (!String(articleHtml || '').trim()) return;
                await this.ensureStickerFontLoaded();
                const overlay = this.ensureArticleReaderOverlay();
                const meta = document.getElementById('article-reader-overlay-meta');
                const body = document.getElementById('article-reader-overlay-body');
                if (!meta || !body) return;

                const expiresText = access?.expiresAt
                    ? new Date(access.expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '';
                meta.innerHTML = `
                    <div class="article-reader-overlay-kicker">Материал открыт</div>
                    <h2 class="article-reader-overlay-title">${this.escapeHtmlText(product?.sample || 'Статья')}</h2>
                    <div class="article-reader-overlay-expiry">${expiresText ? `Доступ активен до ${expiresText}` : 'Доступ активен'}</div>
                `;
                this.renderArticleContentInFrame(body, articleHtml);
                this.applyStickerFontToArticleContent(meta);
                if (body.dataset.locked !== '1') {
                    ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(eventName => {
                        body.addEventListener(eventName, (event) => event.preventDefault());
                    });
                    body.addEventListener('keydown', (event) => {
                        if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x', 's'].includes(String(event.key || '').toLowerCase())) {
                            event.preventDefault();
                        }
                    });
                    body.dataset.locked = '1';
                }
                overlay.classList.add('is-open');
                document.body.style.overflow = 'hidden';
                requestAnimationFrame(() => {
                    this.applyStickerFontToArticleContent(meta);
                });
            },

            applyStickerFontToArticleContent: function(root) {
                if (!root) return;
                const stickerFontFamily = "'Inter', Arial, sans-serif";
                const applyNodeStyle = (node) => {
                    if (!(node instanceof HTMLElement)) return;
                    node.style.setProperty('font-family', stickerFontFamily, 'important');
                    node.style.setProperty('font-weight', '400', 'important');
                    node.style.setProperty('font-synthesis', 'none', 'important');
                    node.style.setProperty('font-kerning', 'normal', 'important');
                    node.style.setProperty('text-rendering', 'optimizeLegibility', 'important');
                    node.style.setProperty('-webkit-font-smoothing', 'antialiased', 'important');
                    node.style.setProperty('-moz-osx-font-smoothing', 'grayscale', 'important');
                };
                applyNodeStyle(root);
                root.querySelectorAll('*').forEach(applyNodeStyle);
            },

            closeArticleReaderOverlay: function() {
                const overlay = document.getElementById('article-reader-overlay');
                if (!overlay) return;
                overlay.classList.remove('is-open');
                overlay.classList.remove('is-obscured');
                document.body.style.overflow = '';
            },

            setArticleReaderObscured: function(isObscured) {
                const overlay = document.getElementById('article-reader-overlay');
                if (!overlay || !overlay.classList.contains('is-open')) return;
                overlay.classList.toggle('is-obscured', !!isObscured);
            },

            renderArticleReader: function(product, articleHtml = '') {
                const block = document.getElementById('article-reader-block');
                const content = document.getElementById('article-reader-content');
                const previewBody = document.getElementById('article-preview-body');
                if (!block || !content) return;
                if (!articleHtml) {
                    block.style.display = 'none';
                    content.innerHTML = '';
                    if (previewBody) previewBody.style.display = '';
                    return;
                }
                if (previewBody) previewBody.style.display = 'none';
                block.style.display = 'block';
                content.innerHTML = `<div class="article-reader-title">Полный текст статьи</div>${articleHtml}`;
                this.applyStickerFontToArticleContent(content);
                this.ensureStickerFontLoaded().then(() => this.applyStickerFontToArticleContent(content));
                if (content.dataset.locked !== '1') {
                    ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(eventName => {
                        content.addEventListener(eventName, (event) => event.preventDefault());
                    });
                    content.addEventListener('keydown', (event) => {
                        if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x', 's'].includes(String(event.key || '').toLowerCase())) {
                            event.preventDefault();
                        }
                    });
                    content.dataset.locked = '1';
                }
            },

            renderArticleAccessPanel: function(product) {
                const panel = document.getElementById('article-access-panel');
                const status = document.getElementById('article-access-status');
                const input = document.getElementById('article-access-password');
                const button = document.getElementById('btn-unlock-article');
                const readerBlock = document.getElementById('article-reader-block');
                if (!panel || !status || !input || !button || !readerBlock) return;

                const typeInfo = ProductManager.getTypeInfo(product);
                const isArticle = typeInfo.isArticle;
                if (!typeInfo.isArticle) {
                    panel.style.display = 'none';
                    this.renderArticleReader(null, '');
                    return;
                }

                panel.style.display = 'block';
                const access = this.getActiveArticleAccess(product);
                const articleId = String(product.id || product.sample || '').trim();
                const cachedHtml = this.articleUnlockCache[articleId] || '';
                const hasUnlockedContent = !!String(cachedHtml).trim();
                if (access || hasUnlockedContent) {
                    const expiresText = access?.expiresAt
                        ? new Date(access.expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '';
                    status.textContent = cachedHtml
                        ? (expiresText ? `Статья открыта. Доступ активен до ${expiresText}.` : 'Статья открыта.')
                        : (this.isAdminUser()
                            ? 'Как администратор, вы можете открыть статью без пароля.'
                            : `Доступ активен до ${expiresText}. Для чтения введите пароль из письма.`);
                    input.disabled = this.isAdminUser();
                    input.placeholder = this.isAdminUser() ? 'Администратору пароль не нужен' : 'Пароль из письма';
                    button.disabled = false;
                    button.textContent = cachedHtml ? 'Открыть снова' : (this.isAdminUser() ? 'Открыть статью' : 'Открыть статью');
                    if (cachedHtml) this.renderArticleReader(product, cachedHtml);
                    else this.renderArticleReader(product, '');
                } else {
                    status.textContent = 'После оплаты статьи на почту придет пароль доступа сроком на 1 месяц.';
                    input.value = '';
                    input.disabled = true;
                    button.disabled = true;
                    button.textContent = 'Статья закрыта';
                    this.renderArticleReader(product, '');
                }
            },

            unlockArticle: async function() {
                const product = currentActiveProduct;
                if (!product) return;
                const articleId = String(product.id || product.sample || '').trim();
                const cachedHtml = this.articleUnlockCache[articleId] || '';
                if (cachedHtml) {
                    this.openArticleReaderOverlay(product, cachedHtml, this.getActiveArticleAccess(product));
                    return;
                }
                const input = document.getElementById('article-access-password');
                const password = this.isAdminUser() ? '' : (input ? input.value.trim() : '');
                await this.unlockArticleWithPassword(product, password);
            },

            getWelcomeBonusStorageKey: function(userId = this.uid) {
                return userId ? `locus_welcome_bonus_${userId}` : '';
            },

            syncWelcomeBonusFlag: function() {
                if (!this.currentUser || !this.uid) return;
                const key = this.getWelcomeBonusStorageKey();
                if (!key) return;

                const fullHistory = Array.isArray(this.currentUser.history) ? this.currentUser.history : [];
                const history = this.getVisibleHistoryItems(this.currentUser.history);
                const hasPaidRetailOrder = history.some(item => item && item.isOrder && item.status !== 'pending_payment');
                const hasServerWelcomeBonus = fullHistory.some(item => item && item.isSystemMeta && item.systemType === 'welcome_bonus_available');
                if (hasServerWelcomeBonus && !hasPaidRetailOrder) {
                    localStorage.setItem(key, '1');
                } else if (hasPaidRetailOrder || !hasServerWelcomeBonus) {
                    localStorage.removeItem(key);
                }
            },

            hasWelcomeFirstOrderBonus: function() {
                if (!this.userDataLoaded || !this.currentUser || this.currentUser.email === 'info@locus.coffee') return false;
                const fullHistory = Array.isArray(this.currentUser.history) ? this.currentUser.history : [];
                const hasServerWelcomeBonus = fullHistory.some(item => item && item.isSystemMeta && item.systemType === 'welcome_bonus_available');
                const key = this.getWelcomeBonusStorageKey();
                const history = this.getVisibleHistoryItems(this.currentUser.history);
                const hasPaidRetailOrder = history.some(item => item && item.isOrder && item.status !== 'pending_payment');
                if (hasPaidRetailOrder) return false;
                if (hasServerWelcomeBonus) return true;
                return !!(key && localStorage.getItem(key) === '1');
            },

            getRetailDiscountBreakdown: function(subtotal) {
                let loyaltyPercent = 0;
                if (this.currentUser) {
                    loyaltyPercent = Math.floor((this.currentUser.totalSpent || 0) / 3000);
                    if (loyaltyPercent > 15) loyaltyPercent = 15;
                }

                const loyaltyDiscountVal = Math.floor(subtotal * (loyaltyPercent / 100));
                const welcomeBonusPercent = this.hasWelcomeFirstOrderBonus() ? 10 : 0;
                const welcomeBase = Math.max(0, subtotal - loyaltyDiscountVal);
                let welcomeDiscountVal = welcomeBonusPercent > 0 ? Math.max(1, Math.floor(welcomeBase * (welcomeBonusPercent / 100))) : 0;
                if (welcomeDiscountVal > welcomeBase) welcomeDiscountVal = welcomeBase;

                let totalAfterStoreDiscounts = subtotal - loyaltyDiscountVal - welcomeDiscountVal;
                let fortuneDiscountVal = 0;

                const fortuneDate = localStorage.getItem('locus_fortune_date');
                const fortuneLot = localStorage.getItem('locus_fortune_lot');
                if (fortuneDate === new Date().toDateString() && fortuneLot) {
                    this.localCart.forEach(i => {
                        if (i.item === fortuneLot) {
                            fortuneDiscountVal += Math.floor((i.price * i.qty) * 0.10);
                        }
                    });
                }

                totalAfterStoreDiscounts -= fortuneDiscountVal;

                return {
                    loyaltyPercent,
                    loyaltyDiscountVal,
                    welcomeBonusPercent,
                    welcomeDiscountVal,
                    fortuneDiscountVal,
                    totalAfterStoreDiscounts
                };
            },

            getOrderCreatedAtMs: function(order) {
                if (!order) return 0;

                const parseTs = (value) => {
                    if (value === null || value === undefined || value === '') return 0;
                    if (value instanceof Date) return value.getTime();

                    if (typeof value === 'number') {
                        if (!isNaN(value)) return value < 3000000000 ? value * 1000 : value;
                        return 0;
                    }

                    if (typeof value === 'string') {
                        const trimmed = value.trim();
                        if (!trimmed) return 0;

                        const numeric = Number(trimmed);
                        if (!isNaN(numeric)) return numeric < 3000000000 ? numeric * 1000 : numeric;

                        const ruMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
                        if (ruMatch) {
                            const day = Number(ruMatch[1]);
                            const month = Number(ruMatch[2]);
                            const year = Number(ruMatch[3]);
                            const hour = Number(ruMatch[4] || '0');
                            const minute = Number(ruMatch[5] || '0');
                            return Date.UTC(year, month - 1, day, hour - 3, minute, 0);
                        }

                        const parsed = new Date(trimmed).getTime();
                        return isNaN(parsed) ? 0 : parsed;
                    }

                    return 0;
                };

                return parseTs(order.createdAt) || parseTs(order.createdat) || parseTs(order.orderId) || parseTs(order.invId) || parseTs(order.date);
            },

            getPvzDeadlineMs: function(createdAtMs) {
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
            },

            formatCountdownText: function(remainingMs) {
                const safeMs = Math.max(0, remainingMs);
                const totalSeconds = Math.floor(safeMs / 1000);
                const totalHours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                return `${String(totalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            },

            formatPvzDeadlineText: function(deadlineMs) {
                if (!deadlineMs) return '';
                return new Date(deadlineMs).toLocaleString('ru-RU', {
                    timeZone: 'Europe/Moscow',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },

            getPvzCountdownInfo: function(order) {
                if (!order || !order.delivery || order.delivery.type !== 'PICKUP') return null;

                const doneStatuses = ['pvz_delivered', 'completed'];
                if (doneStatuses.includes(order.status)) {
                    return { active: false, delivered: true, label: 'Доставлено в пункт выдачи' };
                }

                const createdAtMs = this.getOrderCreatedAtMs(order);
                if (!createdAtMs) return null;

                const deadlineMs = this.getPvzDeadlineMs(createdAtMs);
                if (!deadlineMs) return null;
                const deadlineText = this.formatPvzDeadlineText(deadlineMs);

                const remainingMs = deadlineMs - Date.now();
                return {
                    active: remainingMs > 0,
                    expired: remainingMs <= 0,
                    deadlineMs,
                    deadlineText,
                    remainingMs,
                    label: remainingMs > 0 ? this.formatCountdownText(remainingMs) : '00:00:00'
                };
            },

            startRetailCountdownTicker: function() {
                if (this.retailCountdownInterval) return;
                this.retailCountdownInterval = setInterval(() => this.refreshRetailCountdowns(), 1000);
                this.refreshRetailCountdowns();
            },

            stopRetailCountdownTicker: function() {
                if (this.retailCountdownInterval) {
                    clearInterval(this.retailCountdownInterval);
                    this.retailCountdownInterval = null;
                }
            },

            refreshRetailCountdowns: function() {
                const timers = document.querySelectorAll('[data-retail-order-countdown="1"]');
                if (!timers.length) {
                    this.stopRetailCountdownTicker();
                    return;
                }

                timers.forEach(el => {
                    const deadlineMs = Number(el.getAttribute('data-deadline-ms') || '0');
                    const orderId = el.getAttribute('data-order-id') || '';
                    const autoStatus = el.getAttribute('data-auto-status') === '1';
                    if (!deadlineMs) return;

                    const remainingMs = deadlineMs - Date.now();
                    if (remainingMs > 0) {
                        el.classList.remove('is-delivered');
                        el.classList.add('is-active');
                        el.textContent = `До выдачи: ${this.formatCountdownText(remainingMs)}`;
                        return;
                    }

                    el.classList.remove('is-active');
                    el.classList.add('is-delivered');
                    el.textContent = 'Доставлено в пункт выдачи';
                    if (autoStatus && orderId) this.autoDeliverPvzOrder(orderId);
                });
            },

            syncExpiredPvzOrdersFromHistory: function() {
                if (!this.currentUser || !Array.isArray(this.currentUser.history)) return;
                this.currentUser.history.forEach(item => {
                    const countdownInfo = this.getPvzCountdownInfo(item);
                    if (countdownInfo && countdownInfo.expired) {
                        this.autoDeliverPvzOrder(item.orderId);
                    }
                });
            },

            autoDeliverPvzOrder: async function(orderId) {
                if (!orderId || this.retailCountdownPendingUpdates[orderId]) return;

                const order = (this.currentUser?.history || []).find(item => item && String(item.orderId || '') === String(orderId));
                if (!order) return;

                const countdownInfo = this.getPvzCountdownInfo(order);
                if (!countdownInfo || !countdownInfo.expired) return;

                this.retailCountdownPendingUpdates[orderId] = true;
                const token = localStorage.getItem('locus_token');

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=autoDeliverPvzOrder', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'autoDeliverPvzOrder', orderId: orderId })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось обновить статус заказа');

                    const historyItem = (this.currentUser.history || []).find(item => item && String(item.orderId || '') === String(orderId));
                    if (historyItem) historyItem.status = 'pvz_delivered';

                    if (document.getElementById('lc-modal')?.classList.contains('active')) {
                        this.renderDashboard();
                    }
                } catch (e) {
                    console.error('Ошибка автообновления статуса ПВЗ', e);
                } finally {
                    delete this.retailCountdownPendingUpdates[orderId];
                }
            },

            getPendingOrderStatus: async function(orderId) {
                const token = localStorage.getItem('locus_token');
                if (!token || !orderId) return null;

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getMyOrderStatus', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getMyOrderStatus', orderId: orderId })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось проверить статус оплаты');
                    return data;
                } catch (e) {
                    console.error('Ошибка проверки статуса ожидающей оплаты', e);
                    return null;
                }
            },
            getRobokassaReturnValue: function(urlObj, allowedNames) {
                if (!urlObj || !urlObj.searchParams || !Array.isArray(allowedNames)) return '';
                const normalizedAllowed = allowedNames.map(name => String(name).toLowerCase());
                for (const [key, value] of urlObj.searchParams.entries()) {
                    if (normalizedAllowed.includes(String(key).toLowerCase())) return value;
                }
                return '';
            },

            cleanupRobokassaReturnParams: function() {
                const url = new URL(window.location.href);
                ['OutSum', 'outsum', 'out_sum', 'out_summ', 'InvId', 'invid', 'inv_id', 'SignatureValue', 'signaturevalue', 'signature_value', 'Culture', 'IncCurrLabel'].forEach(key => {
                    url.searchParams.delete(key);
                });
                window.history.replaceState({}, '', url);
            },

            finalizeRobokassaReturn: async function() {
                const url = new URL(window.location.href);
                const outSum = this.getRobokassaReturnValue(url, ['outsum', 'out_sum', 'out_summ']);
                const invId = this.getRobokassaReturnValue(url, ['invid', 'inv_id']);
                const signatureValue = this.getRobokassaReturnValue(url, ['signaturevalue', 'signature_value']);

                if (!outSum || !invId || !signatureValue) return false;

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=robokassaSuccess', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'robokassaSuccess',
                            OutSum: outSum,
                            InvId: invId,
                            SignatureValue: signatureValue
                        })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось подтвердить оплату');

                    this.localCart = [];
                    if (this.currentUser && Array.isArray(this.currentUser.cart)) this.currentUser.cart = [];
                    localStorage.removeItem('locus_cart');
                    localStorage.removeItem('locus_pending_payment_order_id');
                    this.stopPendingOrderWatcher();
                    this.cleanupRobokassaReturnParams();
                    this.updateCartBadge();
                    return true;
                } catch (e) {
                    console.error('Ошибка подтверждения возврата из Робокассы', e);
                    return false;
                }
            },

            startPendingOrderWatcher: function(orderId) {
                const targetOrderId = String(orderId || localStorage.getItem('locus_pending_payment_order_id') || '').trim();
                if (!targetOrderId || !this.uid) return;
                if (this.pendingOrderWatcherTimer && this.pendingOrderWatcherOrderId === targetOrderId) return;

                this.stopPendingOrderWatcher();
                this.pendingOrderWatcherOrderId = targetOrderId;
                let attempts = 0;

                this.pendingOrderWatcherTimer = setInterval(async () => {
                    attempts++;
                    const state = await this.getPendingOrderStatus(targetOrderId);

                    if (!state) {
                        if (attempts >= 10) this.stopPendingOrderWatcher();
                        return;
                    }

                    if (state.found && state.order && state.order.status !== 'pending_payment') {
                        this.stopPendingOrderWatcher();
                        await this.fetchUserData();
                        return;
                    }

                    if (state.found === false) {
                        localStorage.removeItem('locus_pending_payment_order_id');
                        this.stopPendingOrderWatcher();
                        return;
                    }

                    if (attempts >= 40) {
                        this.stopPendingOrderWatcher();
                    }
                }, 3000);
            },

            stopPendingOrderWatcher: function() {
                if (this.pendingOrderWatcherTimer) clearInterval(this.pendingOrderWatcherTimer);
                this.pendingOrderWatcherTimer = null;
                this.pendingOrderWatcherOrderId = null;
            },

            // --- PRICING LOGIC ---
            fetchHistoricalUSDRate: async function(daysBack = 60) {
                void daysBack;
                return this.usdPrevRate || this.usdRate || 0;
            },

            fetchUSDRate: async function() {
                let rateFetched = false;
                try {
                    // Попытка 1: Через наш бэкенд
                    const resp = await fetch(LOCUS_API_URL + '?action=getUsdAnalytics&daysBack=60');
                    const data = await resp.json();
                    if (data && data.success && data.currentRate) {
                        this.usdRate = Number(data.currentRate);
                        this.usdPrevRate = Number(data.previousRate) || this.usdRate;
                        this.usdHistRate = Number(data.historicalRate) || this.usdRate;
                        this.usdCurrentDate = data.currentDate || '';
                        this.usdHistoricalDate = data.historicalDate || '';
                        this.usdHistoricalDaysBackActual = Number(data.historicalDaysBackActual) || 0;
                        rateFetched = true;
                    }
                } catch(e) {
                    console.error('Primary USD Fetch Error:', e);
                }

                if (!rateFetched) {
                    try {
                        // Попытка 2: Прямой запрос браузера в зеркало ЦБ
                        const fallbackResp = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
                        const fallbackData = await fallbackResp.json();
                        if (fallbackData && fallbackData.Valute && fallbackData.Valute.USD) {
                            this.usdRate = Number(fallbackData.Valute.USD.Value);
                            this.usdPrevRate = Number(fallbackData.Valute.USD.Previous) || this.usdRate;
                            this.usdHistRate = this.usdPrevRate; 
                            this.usdCurrentDate = new Date().toLocaleDateString('ru-RU');
                            this.usdHistoricalDate = this.usdCurrentDate;
                            this.usdHistoricalDaysBackActual = 1;
                            rateFetched = true;
                        }
                    } catch(fallbackErr) {
                        console.error('Fallback 1 USD Fetch Error:', fallbackErr);
                    }
                }

                if (!rateFetched) {
                    try {
                        // Попытка 3: Прямой запрос браузера в международный API
                        const secondFallback = await fetch('https://open.er-api.com/v6/latest/USD');
                        const secondData = await secondFallback.json();
                        if (secondData && secondData.rates && secondData.rates.RUB) {
                            this.usdRate = Number(secondData.rates.RUB);
                            this.usdPrevRate = this.usdRate;
                            this.usdHistRate = this.usdRate;
                            this.usdCurrentDate = new Date().toLocaleDateString('ru-RU');
                            this.usdHistoricalDate = this.usdCurrentDate;
                            this.usdHistoricalDaysBackActual = 0;
                            rateFetched = true;
                        }
                    } catch(e) {
                        console.error('All USD fetches failed.');
                    }
                }

                // Динамическое обновление цен в Опте, как только курс получен (если клиент уже зашел в Опт)
                if (rateFetched) {
                    if (document.getElementById('view-wholesale') && document.getElementById('view-wholesale').classList.contains('show-view')) {
                        this.renderWholesaleTable();
                    }
                    if (typeof updatePriceDisplay === 'function') updatePriceDisplay();
                }

                if (document.getElementById('admin-sec-contracts')) {
                    this.updateContractAutoRisk(true);
                    if (document.getElementById('admin-sec-contracts').dataset.ready === '1') {
                        this.calculateContractB2B();
                    }
                }
            },

            // --- НАЧАЛО: ПАРСИНГ CSV И СОХРАНЕНИЕ ---
            fetchPricingSettings: async function() {
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getPricingSettings');
                    const data = await res.json();
                    if(data.success && data.settings && Object.keys(data.settings).length > 0) {
                        this.pricingSettings = data.settings;
                        
                        const resOpex = document.getElementById('res-opex');
                        if(resOpex) {
                            resOpex.textContent = (this.pricingSettings.opexTotal || 0).toLocaleString('ru-RU');
                            document.getElementById('res-var').textContent = (this.pricingSettings.varTotal || 0).toLocaleString('ru-RU');
                            document.getElementById('res-vol').textContent = this.pricingSettings.volume || 100;
                            document.getElementById('res-opex-kg').textContent = (this.pricingSettings.opexPerKg || 0).toLocaleString('ru-RU');
                            document.getElementById('res-var-kg').textContent = (this.pricingSettings.varPerKg || 0).toLocaleString('ru-RU');
                            document.getElementById('cost-calc-results').style.display = 'block';
                        }
                    } else {
                        this.pricingSettings = { opexPerKg: 0, varPerKg: 0, volume: 100 };
                    }
                    
                    // БАГФИКС: Если Оптовая таблица уже открыта, перерисовываем ее с новыми ценами
                    if (document.getElementById('view-wholesale') && document.getElementById('view-wholesale').classList.contains('show-view')) {
                        this.renderWholesaleTable();
                    }
                } catch(e) { console.error('Ошибка загрузки настроек', e); }
            },

            handleCSVUpload: function() {
                const fileInput = document.getElementById('cost-csv-upload');
                const file = fileInput.files[0];
                if (!file) return alert('Пожалуйста, выберите файл CSV');

                const btn = fileInput.nextElementSibling;
                const oldText = btn.textContent;
                btn.textContent = 'Обработка...';

                const reader = new FileReader();
                reader.onload = async (e) => {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    
                    let opex = 0;
                    let varCosts = 0;
                    let volume = 100; 

                    lines.forEach((line, index) => {
                        if (index === 0 || !line.trim()) return; 
                        
                        const parts = line.split(';');
                        if (parts.length < 6) return; 
                        
                        const category = parts[1].toUpperCase().trim();
                        const name = parts[2].toLowerCase().trim();
                        const val = parseFloat(parts[5].replace(/[^0-9.-]+/g,"")) || 0;

                        if (category.includes('ПОСТОЯН') || category.includes('OPEX') || name.includes('аренда') || name.includes('оклад')) {
                            opex += val;
                        } 
                        else if (category.includes('ПЕРЕМЕН')) {
                            const isGreenCoffee = name.includes('зелёный') || name.includes('зеленый') || 
                                                  name.includes('перу') || name.includes('бразилия') || 
                                                  name.includes('эфиопия') || name.includes('колумбия');
                            
                            if (!isGreenCoffee) {
                                varCosts += val;
                            }
                        } 
                        else if (name.includes('объем') || name.includes('объём') || category.includes('ОБЪЕМ')) {
                            if (val > 0) volume = val;
                        }
                    });

                    const opexKg = Math.round(opex / volume);
                    const varKg = Math.round(varCosts / volume);

                    document.getElementById('res-opex').textContent = opex.toLocaleString('ru-RU');
                    document.getElementById('res-var').textContent = varCosts.toLocaleString('ru-RU');
                    document.getElementById('res-vol').textContent = volume;
                    document.getElementById('res-opex-kg').textContent = opexKg.toLocaleString('ru-RU');
                    document.getElementById('res-var-kg').textContent = varKg.toLocaleString('ru-RU');
                    document.getElementById('cost-calc-results').style.display = 'block';

                    const settingsToSave = {
                        opexTotal: opex,
                        varTotal: varCosts,
                        volume: volume,
                        opexPerKg: opexKg,
                        varPerKg: varKg
                    };

                    const token = localStorage.getItem('locus_token');
                    try {
                        const res = await fetch(LOCUS_API_URL + '?action=savePricingSettings', {
                            method: 'POST',
                            headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'savePricingSettings', settings: settingsToSave })
                        });
                        const data = await res.json();
                        
                        if(data.success) {
                            this.pricingSettings = settingsToSave;
                            alert('Отчет обработан! Себестоимость обновлена и сохранена в базу.');
                        } else {
                            throw new Error(data.error);
                        }
                    } catch(error) {
                        alert('Данные посчитаны локально, но произошла ошибка при сохранении: ' + error.message);
                    }
                    btn.textContent = oldText;
                    fileInput.value = ''; 
                };
                
                reader.readAsText(file, 'UTF-8'); 
            },
            // --- КОНЕЦ: ПАРСИНГ CSV И СОХРАНЕНИЕ ---

            savePricingSettings: async function() {
                const token = localStorage.getItem('locus_token');
                if(!token) return alert('Нет доступа');

                const btn = document.getElementById('btn-save-pricing');
                if(btn) btn.textContent = 'Сохранение...';

                // Собираем данные из инпутов админки
                const settings = {
                    manual_usd: parseFloat(document.getElementById('adm-usd-rate').value) || 0,
                    loss_roast: parseFloat(document.getElementById('adm-loss-roast').value) || 18,
                    loss_misc: parseFloat(document.getElementById('adm-loss-misc').value) || 2,
                    delivery_green: parseFloat(document.getElementById('adm-delivery-green').value) || 0,
                    pack_250: parseFloat(document.getElementById('adm-pack-250').value) || 0,
                    pack_1000: parseFloat(document.getElementById('adm-pack-1000').value) || 0,
                    margin: parseFloat(document.getElementById('adm-margin').value) || 0
                };

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=savePricingSettings', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'savePricingSettings', settings: settings })
                    });
                    const data = await res.json();
                    if(!data.success) throw new Error(data.error);

                    this.pricingSettings = settings;
                    alert('Настройки ценообразования успешно сохранены!');
                    if(btn) btn.textContent = 'Сохранить настройки';
                } catch(e) {
                    alert('Ошибка: ' + e.message);
                    if(btn) btn.textContent = 'Сохранить настройки';
                }
            },

            // --- НАЧАЛО: НОВЫЙ РАСЧЕТ ОПТОВЫХ ЦЕН (НА БАЗЕ CSV) ---
            getContractB2BDefaults: function() {
                const saved = (this.pricingSettings && this.pricingSettings.contractB2B) ? this.pricingSettings.contractB2B : {};
                const fallbackUsd = parseFloat(this.pricingSettings?.manual_usd) || this.usdRate || this.getWholesaleUsdRate();
                const savedBreakdown = saved.costBreakdown || {};
                const defaultBreakdown = {
                    rent: 0,
                    gas: this.wholesaleEconomics.utilitiesPerKg || 10,
                    work: this.wholesaleEconomics.laborPerKg || 50,
                    packing: this.wholesaleEconomics.packingLaborPerKg || 10,
                    amort: this.wholesaleEconomics.amortizationPerKg || 5,
                    bag: this.wholesaleEconomics.pack1000 || 22,
                    label: this.wholesaleEconomics.stickerSet || 10,
                    box: 0,
                    pallet: 0,
                    delivery: this.wholesaleEconomics.internalDeliveryPerKg || 5,
                    ...savedBreakdown
                };
                const defaultRubleCost = Math.round(Object.values(defaultBreakdown).reduce((sum, value) => sum + (parseFloat(value) || 0), 0));
                return {
                    volume: 100,
                    months: 3,
                    greenUsd: 15,
                    usdRate: fallbackUsd,
                    bankSpread: saved.bankSpread || 2,
                    volatility: saved.volatility || 1.5,
                    shrinkage: Math.round((this.wholesaleEconomics.roastLossEspresso || 0.20) * 100),
                    rubleCost: defaultRubleCost,
                    targetContribution: this.wholesaleEconomics.targetContributionPerKg || 200,
                    manualAdjust: 0,
                    corridor: 5,
                    costBreakdown: defaultBreakdown,
                    ...saved
                };
            },

            getContractB2BCostInputIds: function() {
                return {
                    rent: 'contract-cost-rent',
                    gas: 'contract-cost-gas',
                    work: 'contract-cost-work',
                    packing: 'contract-cost-packing',
                    amort: 'contract-cost-amort',
                    bag: 'contract-cost-bag',
                    label: 'contract-cost-label',
                    box: 'contract-cost-box',
                    pallet: 'contract-cost-pallet',
                    delivery: 'contract-cost-delivery'
                };
            },

            fillContractB2BCostInputs: function(force = false) {
                const defaults = this.getContractB2BDefaults().costBreakdown || {};
                const ids = this.getContractB2BCostInputIds();
                Object.entries(ids).forEach(([key, id]) => {
                    const input = document.getElementById(id);
                    if (!input) return;
                    if (force || input.value === '') input.value = defaults[key] ?? 0;
                });
            },

            toggleContractCostDetails: function() {
                const panel = document.getElementById('contract-cost-details');
                const toggle = document.getElementById('contract-cost-toggle');
                if (!panel || !toggle) return;
                const isOpen = panel.classList.toggle('active');
                toggle.textContent = isOpen ? 'Свернуть детализацию рублёвой базы ▲' : 'Развернуть детализацию рублёвой базы ▼';
            },

            updateContractRubleBaseFromDetails: function() {
                const ids = this.getContractB2BCostInputIds();
                let total = 0;
                Object.values(ids).forEach(id => {
                    const input = document.getElementById(id);
                    total += parseFloat(input?.value || '0') || 0;
                });
                const totalInput = document.getElementById('contract-ruble-cost');
                if (totalInput) totalInput.value = Math.round(total);
                return total;
            },

            getContractAutoRiskSnapshot: function() {
                const current = this.usdRate || 90;
                const previous = this.usdPrevRate || current;
                const historical = this.usdHistRate || current;
                const diffPerc = previous ? (((current - previous) / previous) * 100) : 0;
                const absDiff = Math.abs(diffPerc);
                const trend60Days = historical ? (((current - historical) / historical) * 100) : 0;

                let suggestedVolatility = 1.5;
                let volatilityComment = 'Спокойный рынок, базовая волатильность.';
                let suggestedSpread = 2.0;
                let spreadComment = 'Базовый банковский спред.';

                if (absDiff >= 0.7 && absDiff < 2.0) {
                    suggestedVolatility = 3.0;
                    suggestedSpread = 2.5;
                    volatilityComment = 'Есть заметный дневной скачок курса.';
                    spreadComment = 'Спред расширен из-за краткосрочной турбулентности.';
                } else if (absDiff >= 2.0) {
                    suggestedVolatility = 5.0;
                    suggestedSpread = 3.0;
                    volatilityComment = 'Высокая дневная турбулентность курса.';
                    spreadComment = 'Спред расширен из-за резкого движения курса.';
                }

                if (trend60Days > 5.0 && suggestedVolatility < 3.0) {
                    suggestedVolatility = 3.0;
                    suggestedSpread = Math.max(suggestedSpread, 2.5);
                    volatilityComment = 'Рубль слабеет в 60-дневном тренде.';
                    spreadComment = 'Спред повышен на фоне ослабления рубля.';
                }
                if (trend60Days > 10.0) {
                    suggestedSpread = Math.max(suggestedSpread, 3.0);
                    spreadComment = 'Спред повышен из-за выраженного ослабления рубля.';
                }

                return {
                    current,
                    previous,
                    historical,
                    currentDateLabel: this.usdCurrentDate || '',
                    historicalDateLabel: this.usdHistoricalDate || '',
                    historicalDaysBackActual: this.usdHistoricalDaysBackActual || 0,
                    diffPerc,
                    trend60Days,
                    suggestedVolatility,
                    suggestedSpread,
                    volatilityComment,
                    spreadComment
                };
            },

            updateContractAutoRisk: function(force = false) {
                const snapshot = this.getContractAutoRiskSnapshot();
                const spreadInput = document.getElementById('contract-bank-spread');
                const volatilityInput = document.getElementById('contract-volatility');
                const spreadNote = document.getElementById('contract-spread-note');
                const volatilityNote = document.getElementById('contract-volatility-note');

                if (spreadInput && (force || spreadInput.value === '' || spreadInput.readOnly)) {
                    spreadInput.value = snapshot.suggestedSpread.toFixed(1);
                }
                if (volatilityInput && (force || volatilityInput.value === '' || volatilityInput.readOnly)) {
                    volatilityInput.value = snapshot.suggestedVolatility.toFixed(1);
                }

                if (spreadNote) {
                    const historicalBase = snapshot.historicalDateLabel
                        ? ` База 60 дней: ${snapshot.historicalDateLabel}${snapshot.historicalDaysBackActual ? ` (${snapshot.historicalDaysBackActual} дн.)` : ''}.`
                        : '';
                    spreadNote.textContent = `${snapshot.spreadComment} День: ${snapshot.diffPerc >= 0 ? '+' : ''}${snapshot.diffPerc.toFixed(2)}%, тренд 60 дней: ${snapshot.trend60Days >= 0 ? '+' : ''}${snapshot.trend60Days.toFixed(1)}%.${historicalBase}`;
                }
                if (volatilityNote) {
                    volatilityNote.textContent = snapshot.volatilityComment;
                }
            },

            fillContractB2BInputs: function(force = false) {
                const defaults = this.getContractB2BDefaults();
                const ids = {
                    volume: 'contract-volume',
                    months: 'contract-months',
                    greenUsd: 'contract-green-usd',
                    usdRate: 'contract-usd-rate',
                    shrinkage: 'contract-shrinkage',
                    rubleCost: 'contract-ruble-cost',
                    targetContribution: 'contract-target-contribution',
                    manualAdjust: 'contract-manual-adjust',
                    corridor: 'contract-corridor'
                };

                Object.entries(ids).forEach(([key, id]) => {
                    const input = document.getElementById(id);
                    if (!input) return;
                    if (force || input.value === '') input.value = defaults[key];
                });
            },

            readContractB2BInputs: function() {
                const defaults = this.getContractB2BDefaults();
                const readNum = (id, fallback) => {
                    const el = document.getElementById(id);
                    const parsed = parseFloat(el ? el.value : '');
                    return Number.isFinite(parsed) ? parsed : fallback;
                };

                return {
                    volume: Math.max(1, readNum('contract-volume', defaults.volume)),
                    months: Math.max(1, readNum('contract-months', defaults.months)),
                    greenUsd: Math.max(0, readNum('contract-green-usd', defaults.greenUsd)),
                    usdRate: Math.max(0.01, readNum('contract-usd-rate', defaults.usdRate)),
                    bankSpread: Math.max(0, readNum('contract-bank-spread', defaults.bankSpread)),
                    volatility: Math.max(0, readNum('contract-volatility', defaults.volatility)),
                    shrinkage: Math.min(99, Math.max(0, readNum('contract-shrinkage', defaults.shrinkage))),
                    rubleCost: Math.max(0, readNum('contract-ruble-cost', defaults.rubleCost)),
                    targetContribution: readNum('contract-target-contribution', defaults.targetContribution),
                    manualAdjust: readNum('contract-manual-adjust', defaults.manualAdjust),
                    corridor: Math.max(0, readNum('contract-corridor', defaults.corridor))
                };
            },

            renderContractB2BResults: function(results) {
                const setText = (id, text) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = text;
                };
                const formatRub = (value) => `${Math.ceil(value).toLocaleString('ru-RU')} ₽`;
                const formatRubKg = (value) => `${Math.ceil(value).toLocaleString('ru-RU')} ₽/кг`;

                setText('contract-used-rate', `${results.rateBuy.toFixed(2)} ₽`);
                setText('contract-risk-factor', `${(results.volRiskFactor * 100).toFixed(1)}% · ${results.bankSpread.toFixed(1)}% спред`);
                setText('contract-price-prepay', formatRubKg(results.prepay));
                setText('contract-price-half', formatRubKg(results.half));
                setText('contract-price-delay', formatRubKg(results.delay));
                setText('contract-total-prepay', `Партия: ${formatRub(results.prepay * results.volume)}`);
                setText('contract-total-half', `Партия: ${formatRub(results.half * results.volume)}`);
                setText('contract-total-delay', `Партия: ${formatRub(results.delay * results.volume)}`);
                setText(
                    'contract-clause-text',
                    `Цена рассчитана исходя из курса закупки ${results.rateBuy.toFixed(2)} ₽ за USD и действует при отклонении курса не более ±${results.corridor.toFixed(1)}%. При выходе курса за пределы коридора неоплаченная часть партии пересчитывается пропорционально изменению долларовой составляющей сырья.`
                );
            },

            calculateContractB2B: function() {
                const params = this.readContractB2BInputs();
                const usnRate = this.wholesaleEconomics.usnRate || 0.06;
                const shrinkageRate = params.shrinkage / 100;
                const rateBuy = params.usdRate * (1 + (params.bankSpread / 100));
                const roastedGreenRubPerKg = (params.greenUsd * rateBuy) / Math.max(0.01, (1 - shrinkageRate));
                const volRiskFactor = params.months > 1 ? ((params.volatility / 100) * Math.sqrt(params.months) * 0.9) : 0;
                const rubleBasePerKg = params.rubleCost + params.targetContribution + params.manualAdjust;
                const prepay = ((roastedGreenRubPerKg * (1 + (volRiskFactor * 0.35) + 0.005)) + rubleBasePerKg) / Math.max(0.01, (1 - usnRate));
                const half = ((roastedGreenRubPerKg * (1 + (volRiskFactor * 0.65) + 0.01)) + rubleBasePerKg) / Math.max(0.01, (1 - usnRate));
                const delay = ((roastedGreenRubPerKg * (1 + volRiskFactor + 0.02)) + rubleBasePerKg) / Math.max(0.01, (1 - usnRate));

                this.renderContractB2BResults({
                    ...params,
                    rateBuy,
                    roastedGreenRubPerKg,
                    volRiskFactor,
                    prepay,
                    half,
                    delay
                });
            },

            initContractB2BAdmin: function(forceFill = false) {
                const section = document.getElementById('admin-sec-contracts');
                if (!section) return;

                if (section.dataset.ready !== '1') {
                    [
                        'contract-volume',
                        'contract-months',
                        'contract-green-usd',
                        'contract-usd-rate',
                        'contract-shrinkage',
                        'contract-ruble-cost',
                        'contract-target-contribution',
                        'contract-manual-adjust',
                        'contract-corridor'
                    ].forEach(id => {
                        const input = document.getElementById(id);
                        if (input) input.addEventListener('input', () => this.calculateContractB2B());
                    });
                    Object.values(this.getContractB2BCostInputIds()).forEach(id => {
                        const input = document.getElementById(id);
                        if (input) input.addEventListener('input', () => {
                            this.updateContractRubleBaseFromDetails();
                            this.calculateContractB2B();
                        });
                    });
                    section.dataset.ready = '1';
                }

                this.fillContractB2BInputs(forceFill || section.dataset.filled !== '1');
                this.fillContractB2BCostInputs(forceFill || section.dataset.filled !== '1');
                this.updateContractRubleBaseFromDetails();
                this.updateContractAutoRisk(forceFill || section.dataset.filled !== '1');
                section.dataset.filled = '1';
                this.calculateContractB2B();
            },

            saveContractB2BSettings: async function() {
                const token = localStorage.getItem('locus_token');
                if (!token) return alert('Нет доступа');

                const btn = document.getElementById('btn-save-contract-b2b');
                const originalText = btn ? btn.textContent : '';
                if (btn) btn.textContent = 'Сохранение...';

                const nextSettings = {
                    ...(this.pricingSettings || {}),
                    contractB2B: {
                        ...this.readContractB2BInputs(),
                        costBreakdown: Object.fromEntries(
                            Object.entries(this.getContractB2BCostInputIds()).map(([key, id]) => [key, parseFloat(document.getElementById(id)?.value || '0') || 0])
                        )
                    }
                };

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=savePricingSettings', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'savePricingSettings', settings: nextSettings })
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || 'Не удалось сохранить параметры');

                    this.pricingSettings = nextSettings;
                    alert('Параметры Контракт B2B сохранены.');
                } catch (e) {
                    alert('Ошибка сохранения: ' + e.message);
                } finally {
                    if (btn) btn.textContent = originalText || 'Сохранить параметры';
                }
            },

            downloadContractB2BTemplate: function() {
                this.calculateContractB2B();
                const params = this.readContractB2BInputs();
                const usedRate = document.getElementById('contract-used-rate')?.textContent || `${params.usdRate.toFixed(2)} ₽`;
                const p1 = document.getElementById('contract-price-prepay')?.textContent || '0 ₽/кг';
                const p2 = document.getElementById('contract-price-half')?.textContent || '0 ₽/кг';
                const p3 = document.getElementById('contract-price-delay')?.textContent || '0 ₽/кг';
                const clause = document.getElementById('contract-clause-text')?.textContent || '';
                const date = new Date().toLocaleDateString('ru-RU');

                const contractContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>Договор поставки</title></head>
                <body style="font-family: Arial, sans-serif; line-height: 1.5; font-size: 11pt;">
                    <h2 style="text-align:center;">ДОГОВОР ПОСТАВКИ № _____</h2>
                    <p style="text-align:center;">г. Орёл, ${date}</p>
                    <p><strong>ИП «Здесь ИП»</strong>, в дальнейшем именуемый «Продавец», с одной стороны, и <strong>ООО «Здесь ООО»</strong>, в дальнейшем именуемое «Покупатель», с другой стороны, заключили настоящий договор о нижеследующем.</p>

                    <h3>1. Предмет договора</h3>
                    <p>1.1. Продавец поставляет кофе в зернах по согласованным заявкам Покупателя, а Покупатель принимает и оплачивает товар на условиях настоящего договора.</p>
                    <p>1.2. Ориентировочный объем партии: <strong>${Math.ceil(params.volume)} кг</strong>. Срок фиксации цены: <strong>${Math.ceil(params.months)} мес.</strong></p>
                    <p>1.3. Расчет выполнен для стоимости зеленого кофе <strong>$${params.greenUsd.toFixed(2)}</strong> за кг и курса закупки <strong>${usedRate}</strong>.</p>

                    <h3>2. Порядок расчетов</h3>
                    <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin:15px 0;">
                        <tr style="background:#f0f0f0;">
                            <th>Вариант оплаты</th>
                            <th>Условия</th>
                            <th>Цена</th>
                        </tr>
                        <tr>
                            <td><strong>100% предоплата</strong></td>
                            <td>Оплата счета в течение 3 рабочих дней с даты выставления.</td>
                            <td>${p1}</td>
                        </tr>
                        <tr>
                            <td><strong>50 / 50</strong></td>
                            <td>50% до отгрузки, 50% в течение 30 дней после поставки.</td>
                            <td>${p2}</td>
                        </tr>
                        <tr>
                            <td><strong>Отсрочка 30 дней</strong></td>
                            <td>100% постоплата в течение 30 дней после поставки.</td>
                            <td>${p3}</td>
                        </tr>
                    </table>
                    <p><strong>Валютная оговорка:</strong> ${clause}</p>

                    <h3>3. Поставка и приемка</h3>
                    <p>3.1. Сроки и график поставки согласовываются сторонами дополнительно по заявкам Покупателя.</p>
                    <p>3.2. Приемка товара по количеству и видимым дефектам осуществляется в момент передачи товара Покупателю.</p>
                    <p>3.3. Претензии по скрытым недостаткам качества принимаются в течение 10 рабочих дней с даты получения партии.</p>

                    <h3>4. Ответственность сторон</h3>
                    <p>4.1. За просрочку оплаты по схемам 50/50 и отсрочке Покупатель уплачивает Продавцу пеню в размере 0,1% от суммы задолженности за каждый день просрочки.</p>
                    <p>4.2. При наличии просроченной задолженности Продавец вправе приостановить дальнейшие отгрузки до полного погашения долга.</p>
                    <p>4.3. Право собственности на товар переходит к Покупателю после полной оплаты соответствующей партии.</p>

                    <h3>5. Форс-мажор</h3>
                    <p>5.1. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств вследствие обстоятельств непреодолимой силы.</p>

                    <h3>6. Срок действия договора</h3>
                    <p>6.1. Договор вступает в силу с момента подписания и действует до письменного прекращения одной из сторон.</p>

                    <br><br>
                    <table style="width:100%; margin-top:40px;">
                        <tr>
                            <td style="width:50%; vertical-align:top;">
                                <strong>ПРОДАВЕЦ:</strong><br>
                                ИП «Здесь ИП»<br><br>
                                _________________ / ___________
                            </td>
                            <td style="width:50%; vertical-align:top;">
                                <strong>ПОКУПАТЕЛЬ:</strong><br>
                                ООО «Здесь ООО»<br><br>
                                _________________ / ___________
                            </td>
                        </tr>
                    </table>
                </body>
                </html>`;

                const blob = new Blob([contractContent], { type: 'application/msword' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'Типовой_договор_B2B_Locus.doc';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },

            downloadContractB2BTemplate: function() {
                this.calculateContractB2B();
                const params = this.readContractB2BInputs();
                const date = new Date().toLocaleDateString();
                const p1 = document.getElementById('contract-price-prepay')?.textContent || '0 ₽/кг';
                const p2 = document.getElementById('contract-price-half')?.textContent || '0 ₽/кг';
                const p3 = document.getElementById('contract-price-delay')?.textContent || '0 ₽/кг';
                const months = String(Math.ceil(params.months));
                const greenPrice = Number(params.greenUsd || 0).toFixed(2);
                const volume = String(Math.ceil(params.volume));

                const contractContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Договор поставки</title></head>
        <body style="font-family: Arial; line-height: 1.5; font-size: 11pt;">
            
            <h2 style="text-align: center;">ДОГОВОР КУПЛИ-ПРОДАЖИ № _____</h2>
            <p style="text-align: center;">г. Орел, ${date}</p>
            <br>
            <p><strong>ИП «Здесь ИП»</strong>, в дальнейшем именуемый «Продавец», с одной стороны, и <strong>ООО «Здесь ООО»</strong>, в дальнейшем именуемое «Покупатель», в лице генерального директора «ФИО» действующего на основании Устава с другой стороны, вместе именуемые «Стороны», заключили настоящий договор о нижеследующем:</p>

            <h3>1. ПРЕДМЕТ ДОГОВОРА</h3>
            <p>1.1. Продавец обязуется осуществлять поставки кофе в зернах различных сортов и стран происхождения и их смесей, с кофеином и без (далее по тексту именуемого «товар») на основании заказов Покупателя, передаваемых Продавцу в произвольной форме, и оформленных на их основании счетов Продавца. Указанные счета будут содержать существенные условия Договора применительно к каждой отдельной поставке (наименование и количество товара, его цена) и по факту их оплаты Покупателем, будут рассматриваться Сторонами как неотъемлемая часть настоящего Договора.</p>
            <p>1.2. Товар, поставляемый Продавцом, предназначен для использования в качестве сырья для приготовления готовых кофейных напитков. Продавец не несет ответственности за использование Покупателем товара в любых иных целях.</p>
            <p>1.3. Стороны договорились не предъявлять друг другу претензий по количеству товара в случае отклонения веса товара от договорного по каждому сорту в пределах 1,0%, являющегося франшизой по весу.</p>

            <h3>2. ОБЯЗАТЕЛЬСТВА СТОРОН ПО ПОСТАВКЕ ТОВАРА</h3>
            <p>2.1. Доставка товара Покупателю по адресу: «Здесь адрес», осуществляется Продавцом.</p>
            <p>2.2. Обязанности Продавца:<br>
            2.2.1. Предоставлять товар Покупателю или его Представителю в количестве и ассортименте, указанном в заказе.<br>
            2.2.2. Предоставлять Покупателю или его Представителю по доверенности товаросопроводительные документы: счет и товарную накладную.</p>
            <p>2.3. Обязанности Покупателя или его Представителя по доверенности:<br>
            2.3.1. В случае отгрузки товара Представителю по доверенности, предоставлять Продавцу доверенность на получение товара от Продавца, выписанную надлежащим образом на Представителя по доверенности.<br>
            2.3.2. Принимать товар на складе Покупателя, производить его проверку при приемке по качеству (видимым дефектам упаковки и товара) и количеству (по упаковкам), передавая впоследствии Продавцу оформленную надлежащим образом товарную накладную.</p>

            <h3>3. ПОРЯДОК РАСЧЕТОВ</h3>
            <p>3.1. Покупатель обязуется осуществлять оплату полной стоимости партии товара в сроки, указанные в соответствующем счете Продавца.</p>
            <p>3.2. Стороны согласовали, что при условии стоимости сырья <strong>$${greenPrice}</strong> и требуемого объема <strong>${volume} кг/мес</strong>, примерная стоимость 1 кг обжаренного кофе фиксируется на срок <strong>${months} мес.</strong> и в зависимости от формы оплаты составляет:</p>
            
            <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background: #f0f0f0;">
                    <th>Вариант оплаты</th>
                    <th>Условия</th>
                    <th>Цена (Индикатив)</th>
                </tr>
                <tr>
                    <td><strong>100% Предоплата</strong></td>
                    <td>Оплата в течение 3 дней со дня выставления счета.</td>
                    <td>${p1}</td>
                </tr>
                <tr>
                    <td><strong>50 / 50</strong></td>
                    <td>50% до отгрузки, 50% в течение 30 дней после.</td>
                    <td>${p2}</td>
                </tr>
                <tr>
                    <td><strong>Отсрочка 30 дней</strong></td>
                    <td>100% постоплата в течение 30 дней.</td>
                    <td>${p3}</td>
                </tr>
            </table>

            <p>3.3. <strong>Валютная оговорка:</strong> Указанные цены действительны при нахождении курса ЦБ РФ в коридоре ±5% от текущего значения на дату подписания спецификации. В случае резкого изменения курса (более чем на 5% за 3 дня), Продавец имеет право пересмотреть цену неоплаченного товара пропорционально изменению курса.</p>
            <p>3.4. Все платежи по настоящему договору производятся в российских рублях. Платежи по счетам, выставленным в иностранной валюте, осуществляются в российских рублях по курсу ЦБ РФ на дату платежа.</p>
            <p>3.5. Датой платежа Стороны договорились считать дату фактического списания денежных средств с расчетного счета Покупателя.</p>

            <h3>4. ПРИЕМКА ТОВАРА И ПОРЯДОК ОТГРУЗКИ</h3>
            <p>4.1. Приемка Покупателем товара по количеству, а также по качеству (видимые дефекты упаковки и товара) производится на складе Покупателя. Доставка товара до Покупателя по адресу «Здесь адрес» производится собственными силами Продавца.</p>
            <p>4.2. Претензии и рекламации в связи с недостатками в качестве товара, которые не могли быть обнаружены визуально в ходе приемки товара, могут быть предъявлены Покупателем Продавцу в течение 10 (десяти) рабочих дней с документально подтвержденной даты получения товара Покупателем.</p>
            <p>4.3. Рекламационный акт или претензия должны быть оформлены в соответствии с требованиями действующих нормативных документов.</p>
            <p>4.4. Упаковка товара должна обеспечить его сохранность при транспортировке при условии бережного с ним обращения.</p>
            <p>4.5. Обязательства Продавца по срокам поставки, количеству упаковок и номенклатуре товаров считаются выполненными с момента передачи товара Покупателю или его Представителю по доверенности по товарной накладной.</p>

            <h3>5. ОТВЕТСТВЕННОСТЬ СТОРОН</h3>
            <p>5.1. За нарушение условий настоящего Договора стороны несут ответственность в общегражданском порядке, возмещая потерпевшей стороне убытки в виде прямого ущерба и неполученной прибыли. Бремя доказывания убытков лежит на потерпевшей стороне.</p>
            <p>5.2. Право собственности на товар переходит к Покупателю с момента принятия товара Покупателем. Риск случайной гибели товара несет собственник товара в соответствии с действующим гражданским законодательством России с момента перехода собственности на товар.</p>
            <p>5.3. В случаях недопоставки товара или наличия дефектного товара, выявленных в ходе его приемки в соответствии с пунктом 4.4. настоящего Договора, вариант урегулирования взаиморасчетов стороны согласуют дополнительно.</p>
            <p>5.4. В случае, если Покупатель обнаружит недостатки в качестве товара, которые не могли быть замечены им в ходе приемки товара, и предъявит претензию в предусмотренный настоящем договором срок, Поставщик обязан, в случае своего согласия с претензией, по желанию Покупателя, либо заменить некондиционный товар на кондиционный, либо принять его и вернуть уплаченные за некондиционный товар деньги. Возможен зачет этих денежных средств в расчетах по следующим поставкам.</p>
            <p><strong>5.5. Пени за просрочку оплаты.</strong> В случае нарушения Покупателем сроков оплаты (по схеме 50/50 или Отсрочке), Покупатель уплачивает Продавцу пени в размере <strong>0,1%</strong> от суммы задолженности за каждый день просрочки.</p>
            <p><strong>5.6. Стоп-лист.</strong> При наличии у Покупателя просроченной задолженности, Продавец имеет право в одностороннем порядке приостановить отгрузку следующих партий Товара до полного погашения долга.</p>
            <p><strong>5.7. Сохранение права собственности (Retention of Title).</strong> Право собственности на Товар переходит к Покупателю только с момента полной (100%) оплаты. До этого момента Товар находится в залоге у Продавца.</p>

            <h3>6. ФОРС-МАЖОР</h3>
            <p>6.1. Стороны освобождаются от ответственности за неисполнение (частичное неисполнение) договорных обязательств, если такое неисполнение явилось следствием наступления обстоятельств непреодолимой силы (форс-мажорных обстоятельств), которых стороны не могли ни избежать, ни предвидеть заранее.</p>
            <p>6.2. В случае наступления форс-мажорных обстоятельств, под которыми понимаются стихийные бедствия, военные действия, запретительные акты правительства, стороны либо отодвигают исполнение обязательств на соразмерный срок, либо, если форсмажорные обстоятельства продолжаются более трех месяцев, могут расторгнуть Договор без возмещения убытков. При этом никакие обстоятельства не освобождают Покупателя от обязанности оплатить товар, уже переданный ему Продавцом.</p>
            <p>6.3. Сторона, для которой создалась невозможность исполнения обязательств по Договору вследствие наступления форс-мажорных обстоятельств, обязана в течение 10 дней с даты их наступления известить о них другую сторону в письменной форме. Наступление обстоятельств непреодолимой силы должно быть подтверждено Торгово- промышленной палатой РФ.</p>

            <h3>7. РАЗРЕШЕНИЕ СПОРОВ И ПРИМЕНИМОЕ ПРАВО</h3>
            <p>7.1. Все споры по настоящему Договору решаются путем переговоров.</p>
            <p>7.2. При недостижении согласия споры решаются в государственном арбитражном суде города «Здесь город Продавца» в соответствии с действующим законодательством РФ. Предъявлению иска должно предшествовать предъявление претензии или рекламации, которая должна быть рассмотрена по существу в течение 15 дней с даты ее получения.</p>

            <h3>8. СРОК ДЕЙСТВИЯ ДОГОВОРА</h3>
            <p>8.1. Договор действителен с момента его подписания до «Здесь дата» и будет каждый раз считаться пролонгированным на каждый следующий календарный год в случае, если ни одна из Сторон не позднее чем за 15 дней до истечения срока его действия не заявит в письменном виде о желании прекратить договорные отношения.</p>
            <p>8.2. Договор может быть изменен или дополнен в течение срока его действия путем подписания Дополнений или обмена письмами. Все изменения и дополнения Договора, согласованные и подписанные сторонами, считаются его неотъемлемой частью.</p>
            <p>8.3. Стороны не вправе передавать свои права и обязанности по настоящему Договору никакой третьей стороне, за исключением Представителя Покупателя по доверенности, без письменного на то согласия другой стороны.</p>
            <p>8.4. Договор заключен в двух экземплярах по одному для каждой стороны. Одностороннее расторжение договора не допускается.</p>

            <br><br><br>
            <table style="width: 100%; margin-top: 50px;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <strong>ПРОДАВЕЦ:</strong><br>
                        ИП «Здесь ИП»<br><br>
                        _________________ / ___________
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <strong>ПОКУПАТЕЛЬ:</strong><br>
                        ООО «Здесь ООО»<br><br>
                        _________________ / ___________
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

                const blob = new Blob([contractContent], { type: 'application/msword' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'Договор_Поставки_Полный.doc';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            },

            getWholesaleUsdRate: function() {
                const manualUsd = parseFloat(this.pricingSettings?.manual_usd) || 0;
                return manualUsd > 0 ? manualUsd : (this.usdRate || 90);
            },

            resolveWholesaleRoastLossRate: function(product) {
                const e = this.wholesaleEconomics;
                const typeInfo = window.ProductManager?.getTypeInfo(product) || {};
                const catName = String(product?.category || '').toLowerCase();
                if (typeInfo.isAroma) return e.roastLossAroma;
                if (catName.includes('\u044d\u0441\u043f\u0440\u0435\u0441\u0441\u043e')) return e.roastLossEspresso;
                return e.roastLossFilter;
            },

            getWholesaleRoastLossRate: function(product) {
                const e = this.wholesaleEconomics;
                const catName = String(product?.category || '').toLowerCase();
                if (catName.includes('Р°СЂРѕРјР°С‚РёР·Р°С†')) return e.roastLossAroma;
                if (catName.includes('СЌСЃРїСЂРµСЃСЃРѕ')) return e.roastLossEspresso;
                return e.roastLossFilter;
            },

            getWholesalePackagingCost: function(weight) {
                const e = this.wholesaleEconomics;
                return weight === 1000 ? (e.pack1000 + e.stickerSet) : (e.pack250 + e.stickerSet);
            },

            getWholesaleVariablePerKg: function() {
                const e = this.wholesaleEconomics;
                return e.laborPerKg + e.utilitiesPerKg + e.packingLaborPerKg + e.amortizationPerKg + e.internalDeliveryPerKg + e.spoilageReservePerKg;
            },

            getWholesaleFixedPerKg: function() {
                const e = this.wholesaleEconomics;
                return e.monthlyVolumeKg > 0 ? (e.fixedMonthly / e.monthlyVolumeKg) : 0;
            },

            roundWholesalePrice: function(value) {
                return Math.ceil((Number(value) || 0) / 10) * 10;
            },

            calculateWholesaleUnitPrice: function(rawPriceUSD, product, weight) {
                const e = this.wholesaleEconomics;
                const usd = this.getWholesaleUsdRate();
                const lossRate = this.resolveWholesaleRoastLossRate(product);
                const yieldFactor = 1 / Math.max(0.01, (1 - lossRate));
                const landedGreenPerKg = (Number(rawPriceUSD) || 0) * usd + e.greenLogisticsPerKg;
                const roastedGreenCostPerKg = landedGreenPerKg * yieldFactor;
                const variablePerKg = this.getWholesaleVariablePerKg();
                const fixedPerKg = this.getWholesaleFixedPerKg();
                const cashCostPerKg = roastedGreenCostPerKg + variablePerKg;
                const fullEconomicCostPerKg = cashCostPerKg + fixedPerKg;
                const unitWeightKg = (Number(weight) || 0) / 1000;
                const packagingCost = this.getWholesalePackagingCost(weight);
                const unitCashCost = (cashCostPerKg * unitWeightKg) + packagingCost;
                const unitFullCost = (fullEconomicCostPerKg * unitWeightKg) + packagingCost;
                const targetContribution = e.targetContributionPerKg * unitWeightKg;
                const baseCommercialPrice = (unitCashCost + targetContribution) / Math.max(0.01, (1 - e.usnRate));
                const finalPrice = this.roundWholesalePrice(baseCommercialPrice * (1 + e.commercialMarkupRate));

                return {
                    finalPrice,
                    baseCommercialPrice,
                    unitCashCost,
                    unitFullCost,
                    cashCostPerKg,
                    fullEconomicCostPerKg,
                    roastedGreenCostPerKg,
                    variablePerKg,
                    fixedPerKg,
                    packagingCost,
                    targetContribution,
                    lossRate,
                    unitWeightKg
                };
            },

            calculateWholesaleOrderExtras: function(totalWeightGrams) {
                const e = this.wholesaleEconomics;
                const totalWeightKg = (Number(totalWeightGrams) || 0) / 1000;
                if (totalWeightKg <= 0) return { paymentDoc: 0, boxes: 0, total: 0 };

                const paymentDoc = e.paymentDocPerOrder;
                const boxes = totalWeightKg >= 10 ? Math.ceil(totalWeightKg / 10) * e.boxPer10Kg : 0;
                return { paymentDoc, boxes, total: paymentDoc + boxes };
            },

            formatWholesaleBreakdown: function(subtotalCost, orderExtras) {
                return [
                    `\u0422\u043e\u0432\u0430\u0440: ${subtotalCost.toLocaleString('ru-RU')} \u20bd`,
                    `\u041f\u043b\u0430\u0442\u0451\u0436\u043d\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442: ${orderExtras.paymentDoc.toLocaleString('ru-RU')} \u20bd`,
                    `\u041a\u043e\u0440\u043e\u0431\u0430: ${orderExtras.boxes.toLocaleString('ru-RU')} \u20bd`
                ].join(' \u2022 ');
            },

            calculateWholesalePrice: function(rawPriceUSD, product = null) {
                if (Number(rawPriceUSD) > 0) {
                    const p250 = this.calculateWholesaleUnitPrice(rawPriceUSD, product, 250);
                    const p1000 = this.calculateWholesaleUnitPrice(rawPriceUSD, product, 1000);
                    return {
                        p250: p250.finalPrice,
                        p1000: p1000.finalPrice,
                        details250: p250,
                        details1000: p1000
                    };
                }
                if (!this.pricingSettings) return { p250: 0, p1000: 0 };
                const s = this.pricingSettings;
                
                // Если курс не загрузился с cbr.ru, берем 90 для страховки
                const usd = this.usdRate || 90;

                // 1. Стоимость зеленого зерна + усредненная доставка до обжарочной (например, 50 руб/кг)
                const greenRub = (rawPriceUSD * usd) + 50;
                
                // 2. Ужарка и технические потери (в среднем кофе теряет 20% веса -> коэффициент 1.25)
                const roastedRawCost = greenRub * 1.25;

                // 3. ПОЛНАЯ СЕБЕСТОИМОСТЬ 1 КГ (COGS + OPEX)
                // Берем переменные и постоянные расходы, которые наш парсер посчитал из твоего CSV
                const varPerKg = s.varPerKg || 0;
                const opexPerKg = s.opexPerKg || 0;
                const fullCost1kg = roastedRawCost + varPerKg + opexPerKg;

                // 4. Целевая маржа (Contribution Margin)
                // Допустим, мы хотим зарабатывать сверху 30% (умножаем на 1.3)
                const marginMult = 1.3; 

                // 5. Итоговые цены
                // Округляем до десятков рублей для красоты (например, 1452 -> 1460)
                const price1000 = Math.ceil((fullCost1kg * marginMult) / 10) * 10;
                
                // Цена за 250г: делим 1 кг на 4 и накидываем стоимость маленькой пачки (например, +50 руб)
                const price250 = Math.ceil((price1000 / 4) + 50);

                return { p250: price250, p1000: price1000 };
            },
            // --- КОНЕЦ: НОВЫЙ РАСЧЕТ ОПТОВЫХ ЦЕН ---
            // --- НАЧАЛО: РАСЧЕТ РОЗНИЧНЫХ ЦЕН ---
            calculateRetailPrices: function(rawPriceUSD) {
                if (!this.pricingSettings || !rawPriceUSD) return { p250: 0, p1000: 0 };
                const s = this.pricingSettings;
                const usd = this.usdRate || 90;

                // 1. Сырье и ужарка
                const greenRub = (rawPriceUSD * usd) + 50; 
                const roastedRawCost = greenRub * 1.25; 

                // 2. Полная себестоимость 1 кг (включая OPEX и переменные из CSV)
                const fullCost1kg = roastedRawCost + (s.varPerKg || 0) + (s.opexPerKg || 0);

                // 3. Розничная наценка (80% сверху)
                // Можешь менять коэффициент 1.8 на нужный тебе
                const retailMargin = 1.8; 

                // Сначала считаем цену за 250г (плюсуем стоимость розничной пачки, напр., 60 руб)
            const cost250 = (fullCost1kg / 4) + 60;
            const price250 = Math.ceil((cost250 * retailMargin) / 10) * 10;

            // Цена за 1 кг на 10% дешевле, чем 4 пачки по 250г
            const price1000 = Math.ceil((price250 * 4 * 0.90) / 10) * 10;
            
            return { p250: price250, p1000: price1000 };
            },
            // --- КОНЕЦ: РАСЧЕТ РОЗНИЧНЫХ ЦЕН ---

            renderWholesaleTable: function() {
                const container = document.getElementById('wholesale-table-container');
                const dateEl = document.getElementById('ws-date');
                const usdEl = document.getElementById('ws-usd');
                
                if(dateEl) dateEl.textContent = new Date().toLocaleDateString();
                if(usdEl) usdEl.textContent = this.getWholesaleUsdRate().toFixed(4);
                
                let itemsList = [];

                ALL_PRODUCTS_CACHE.forEach(p => {
                    // 1. СТРОГИЙ ФИЛЬТР: Пропускаем сорта, которых нет в каталоге
                    if (p.inCatalog !== "1" && p.inCatalog !== 1 && p.inCatalog !== true) return;
                    
                    // ЗАДАЧА 4: Пропускаем всё, что не является кофе
                    const catName = (p.category || '').toLowerCase();
                    if (catName.includes('аксессуар') || catName.includes('информац')) return;

                    const rawGreen = parseFloat(p.rawGreenPrice || p.raw_green_price) || 0;
                    let ws250 = 0;
                    let ws1000 = 0;
                    
                    if (rawGreen > 0) {
                        const prices = this.calculateWholesalePrice(rawGreen, p);
                        ws250 = prices.p250;
                        ws1000 = prices.p1000;
                    } else if (p.price && parseFloat(p.price) > 0) {
                        // Если зеленого зерна нет, берем фиксированную цену из каталога
                        // и делаем оптовую скидку (сейчас стоит 30% от розницы -> коэффициент 0.7)
                        const fixedRetail = parseFloat(p.price);
                        ws250 = Math.ceil(fixedRetail * 0.7 / 10) * 10;
                        ws1000 = ws250 * 4;
                    }

                    if (ws250 === 0) return; // Пропускаем, если цена так и не рассчитана

                    itemsList.push({ ...p, ws250: ws250, ws1000: ws1000 });
                });

                // 2. СОРТИРОВКА: Эспрессо -> Фильтр -> Ароматизация. Внутри группы — по алфавиту.
                itemsList.sort((a, b) => {
                    const getSortWeight = (item) => {
                        const cat = (item.category || '').toLowerCase();
                        if (cat.includes('ароматизац')) return 0; // Ароматизация в самом низу
                        const r = parseFloat(item.roast) || 0;
                        if (r >= 10) return 2; // Эспрессо в самом верху
                        return 1; // Фильтр посередине
                    };
                    
                    const weightA = getSortWeight(a);
                    const weightB = getSortWeight(b);
                    
                    if (weightA !== weightB) {
                        return weightB - weightA;
                    }
                    return a.sample.localeCompare(b.sample);
                });

                let html = '';

                if (itemsList.length > 0) {
                    let hintHtml = '';
                    if (window.innerWidth <= 768) {
                        // ВОЗВРАЩАЕМ ВАШУ КЛАССНУЮ ПОДСКАЗКУ
                        // Добавляем align-items: flex-start и padding-top: 80px
                        // Это заставит иконку всегда висеть наверху (сразу под шапкой таблицы), а не в центре длинного полотна
                        hintHtml = `
                            <div class="scroll-hint-overlay" id="ws-scroll-hint" style="align-items: flex-start; padding-top: 80px;">
                                <div class="scroll-hint-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="8 16 4 12 8 8"></polyline>
                                        <line x1="4" y1="12" x2="20" y2="12"></line>
                                        <polyline points="16 8 20 12 16 16"></polyline>
                                    </svg>
                                    <span>Листайте вбок</span>
                                </div>
                            </div>
                        `;
                    }

                    // Возвращаем onscroll, чтобы она исчезала при касании!
                    html += `<div style="position:relative;">${hintHtml}
                        <div style="overflow-x:auto; padding-bottom:10px;" onscroll="document.getElementById('ws-scroll-hint') ? document.getElementById('ws-scroll-hint').style.opacity='0' : null">
                        <table class="admin-table" style="width:100%; min-width:650px;">
                        <thead><tr>
                            <th style="width: 28%;">Название</th>
                            <th style="width: 36%;">Описание</th>
                            <th style="width: 18%; text-align:center;">250 г (шт)</th>
                            <th style="width: 18%; text-align:center;">1 кг (шт)</th>
                        </tr></thead>
                        <tbody>`;
                    
                    itemsList.forEach(i => {
                        const catName = (i.category || '').toLowerCase();
                        const roastVal = parseFloat(i.roast) || 0;
                        
                        let typeText = 'ФИЛЬТР';
                        let typeColor = '#7A8F7C';
                        
                        // ИСПРАВЛЕНО: Используем catName вместо ошибочного catStr
                        if (catName.includes('ароматизац')) {
                            typeText = 'АРОМАТИЗАЦИЯ';
                        } else if (catName.includes('эспрессо') || (!catName.includes('фильтр') && roastVal >= 10)) {
                            typeText = 'ЭСПРЕССО';
                        }

                        // Динамический цвет из колеса
                        if (typeof SHOP_DATA !== 'undefined') {
                            const foundCat = SHOP_DATA.find(c => c.label === typeText);
                            if (foundCat && foundCat.color) typeColor = foundCat.color;
                        }
                                
                        typeColor = muteColor(typeColor, PALETTE_CONFIG.catWeight, PALETTE_CONFIG.catGrey);
                        const typeSticker = `<span style="font-size:9px; background:${typeColor}; color:#fff; border-radius:3px; padding:2px 4px; margin-right:5px; vertical-align:middle; display:inline-block; margin-bottom:4px;">${typeText}</span>`;
                        const blendLabel = ProductManager.isBlendProduct(i) ? ProductManager.getBlendBadgeHtml({ includeBottomMargin: true }) : '';
                        const displaySampleName = ProductManager.getLotDisplayName(i);
                        
                        // Исправлено: берем описание товара через ProductManager
                        const displayDesc = ProductManager.getDisplayDesc(i);
                        
                        html += `<tr>
                            <td style="font-weight:600; vertical-align:middle; line-height:1.4;">${typeSticker}${blendLabel}<br>${displaySampleName}</td>
                            <td style="font-size:10px; opacity:0.8; vertical-align:middle; line-height:1.4;">${displayDesc}</td>
                            <td style="vertical-align:middle;">
                                <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap;">
                                    <span style="white-space:nowrap;">${i.ws250} ₽</span>
                                    <input type="number" min="0" class="ws-qty-input lc-input" data-item="${i.sample}" data-weight="250" data-price="${i.ws250}" placeholder="0" style="width:45px; padding:4px; text-align:center; height:auto; margin:0;" onchange="UserSystem.updateWholesaleTotal()" onkeyup="UserSystem.updateWholesaleTotal()">
                                </div>
                            </td>
                            <td style="vertical-align:middle;">
                                <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap;">
                                    <span style="white-space:nowrap;">${i.ws1000} ₽</span>
                                    <input type="number" min="0" class="ws-qty-input lc-input" data-item="${i.sample}" data-weight="1000" data-price="${i.ws1000}" placeholder="0" style="width:45px; padding:4px; text-align:center; height:auto; margin:0;" onchange="UserSystem.updateWholesaleTotal()" onkeyup="UserSystem.updateWholesaleTotal()">
                                </div>
                            </td>
                        </tr>`;
                    });
                    html += `</tbody></table></div>`

                    html += `<div style="font-size: 10px; color: gray; margin-top: 10px;">Не является публичной офертой.</div>`;
                    html += `<button class="lc-btn" onclick="UserSystem.generatePDF()" style="margin-top: 15px; margin-bottom: 20px; width:auto; padding:10px 25px; display:inline-block;">Скачать прайс</button>`;
                }

                container.innerHTML = html || 'Нет данных для расчета.';

                const orderForm = document.getElementById('wholesale-order-form');
                if (orderForm) {
                    if (itemsList.length > 0) {
                        orderForm.style.display = 'block';
                        if (this.currentUser) {
                            const emailInput = document.getElementById('ws-order-email');
                            if (emailInput && !emailInput.value) emailInput.value = this.currentUser.email;
                        }
                    } else {
                        orderForm.style.display = 'none';
                    }
                }
            },

            updateWholesaleTotal: function() {
                let totalWeightGrams = 0;
                let subtotalCost = 0;
                
                document.querySelectorAll('.ws-qty-input').forEach(input => {
                    const qty = parseInt(input.value) || 0;
                    if (qty > 0) {
                        const w = parseInt(input.getAttribute('data-weight'));
                        const p = parseInt(input.getAttribute('data-price'));
                        totalWeightGrams += w * qty;
                        subtotalCost += p * qty;
                    }
                });
                
                const orderExtras = this.calculateWholesaleOrderExtras(totalWeightGrams);
                let totalCost = subtotalCost + orderExtras.total;

                const isUrgent = document.getElementById('ws-urgent-order') && document.getElementById('ws-urgent-order').checked;
                if (isUrgent) {
                    totalCost = Math.ceil(totalCost * 1.2);
                }
                
                const weightKg = totalWeightGrams / 1000;
                const weightEl = document.getElementById('ws-total-weight');
                const costEl = document.getElementById('ws-total-cost');
                let breakdownEl = document.getElementById('ws-cost-breakdown');
                if (!breakdownEl) {
                    const warnAnchor = document.getElementById('ws-warning');
                    if (warnAnchor?.parentElement) {
                        breakdownEl = document.createElement('div');
                        breakdownEl.id = 'ws-cost-breakdown';
                        breakdownEl.style.cssText = 'font-size:11px; opacity:0.75; margin-bottom:10px; text-align:center;';
                        warnAnchor.parentElement.insertBefore(breakdownEl, warnAnchor);
                    }
                }
                
                // Пробелы теперь стоят прямо в HTML верстке, здесь передаем только чистые цифры
                if (weightEl) weightEl.textContent = weightKg.toFixed(1);
                if (costEl) costEl.textContent = totalCost.toLocaleString('ru-RU');
                if (breakdownEl) {
                    breakdownEl.textContent = totalWeightGrams > 0
                        ? `Товар: ${subtotalCost.toLocaleString('ru-RU')} ₽ • Платёжный документ: ${orderExtras.paymentDoc.toLocaleString('ru-RU')} ₽ • Короба: ${orderExtras.boxes.toLocaleString('ru-RU')} ₽`
                        : '';
                }
                
                if (breakdownEl) {
                    breakdownEl.textContent = totalWeightGrams > 0
                        ? this.formatWholesaleBreakdown(subtotalCost, orderExtras)
                        : '';
                }

                const btn = document.getElementById('ws-btn-order');
                const warn = document.getElementById('ws-warning');
                
                if (btn && warn) {
                    if (weightKg >= 5) {
                        btn.disabled = false;
                        warn.style.display = 'none';
                    } else {
                        btn.disabled = true;
                        warn.style.display = 'block';
                    }
                }
            },

            submitWholesaleOrder: async function() {
                // Сначала собираем все позиции. Затем считаем сумму и создаем заявку.
                
                let items = [];
                let subtotalCost = 0;
                let totalWeightGrams = 0;
                
                document.querySelectorAll('.ws-qty-input').forEach(input => {
                    const qty = parseInt(input.value) || 0;
                    if (qty > 0) {
                        const w = parseInt(input.getAttribute('data-weight'));
                        const p = parseInt(input.getAttribute('data-price'));
                        const name = input.getAttribute('data-item');
                        items.push({ item: name, weight: w, grind: 'Зерно', price: p, qty: qty });
                        subtotalCost += p * qty;
                        totalWeightGrams += w * qty;
                    }
                });

                const orderExtras = this.calculateWholesaleOrderExtras(totalWeightGrams);
                let totalCost = subtotalCost + orderExtras.total;
                
                const isUrgent = document.getElementById('ws-urgent-order') && document.getElementById('ws-urgent-order').checked;
                if (isUrgent) {
                    totalCost = Math.ceil(totalCost * 1.2);
                }
                const urgentExtra = Math.max(0, totalCost - subtotalCost - orderExtras.total);
                
                const email = document.getElementById('ws-order-email').value.trim();
                const phone = document.getElementById('ws-order-phone').value.trim();
                const reqs = document.getElementById('ws-order-reqs') ? document.getElementById('ws-order-reqs').value.trim() : '';
                
                if (!email || !phone) return alert('Пожалуйста, укажите почту и телефон для связи!');

                const btn = document.getElementById('ws-btn-order');
                const originalText = btn.textContent;
                btn.textContent = 'Оформление...';
                btn.disabled = true;

                const orderData = {
                    id: 'ws_' + Date.now(),
                    total: totalCost,
                    customer: {
                        email: email,
                        phone: phone,
                        isUrgent: isUrgent,
                        requisites: reqs,
                        pricingBreakdown: {
                            subtotal: subtotalCost,
                            paymentDocument: orderExtras.paymentDoc,
                            boxes: orderExtras.boxes,
                            urgentExtra: urgentExtra,
                            totalWeightKg: totalWeightGrams / 1000,
                            finalTotal: totalCost
                        }
                    },
                    items: items
                };

                // Берем токен если есть, если нет — отправляем пустую строку
                const token = localStorage.getItem('locus_token') || ''; 

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=placeWholesaleOrder', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'placeWholesaleOrder', order: orderData })
                    });
                    const data = await res.json();
                    if(!data.success) throw new Error(data.error);
                    
                    alert('Оптовый заказ успешно оформлен!');
                    // СОХРАНЕНИЕ В ЛИЧНЫЙ КАБИНЕТ (Если авторизован)
                    if (this.uid && this.currentUser) {
                        const historyOrder = {
                            isWholesaleOrder: true,
                            orderId: orderData.id,
                            date: new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }),
                            total: totalCost,
                            pricingBreakdown: orderData.customer.pricingBreakdown,
                            items: items
                        };
                        if(!this.currentUser.history) this.currentUser.history = [];
                        this.currentUser.history.push(historyOrder);
                        
                        if(token) {
                            await fetch(LOCUS_API_URL + '?action=updateUser', {
                                method: 'POST',
                                headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'updateUser', field: 'history', data: this.currentUser.history })
                            });
                        }
                    }

                    // Очистка формы после успешного заказа
                    document.querySelectorAll('.ws-qty-input').forEach(input => input.value = ''); 
                    if(document.getElementById('ws-urgent-order')) document.getElementById('ws-urgent-order').checked = false;
                    if(document.getElementById('ws-order-reqs')) document.getElementById('ws-order-reqs').value = '';
                    this.updateWholesaleTotal();
                } catch (e) {
                    alert('Ошибка при оформлении заказа: ' + e.message);
                    btn.disabled = false;
                } finally {
                    if (btn) btn.textContent = originalText;
                }
            },
            
            generatePDF: function() {
                if(!window.pdfMake) return alert('Библиотека PDF еще не загружена');
                
                const tableBody = [
                    [
                        {text:'Название', bold:true}, 
                        {text:'Описание', bold:true}, 
                        {text:'250\u00A0г', bold:true, alignment: 'center'}, 
                        {text:'1\u00A0кг', bold:true, alignment: 'center'}
                    ]
                ];

                let pdfItems = [];

                ALL_PRODUCTS_CACHE.forEach(p => {
                    // 1. СТРОГИЙ ФИЛЬТР: Пропускаем сорта не в каталоге
                    if (p.inCatalog !== "1" && p.inCatalog !== 1 && p.inCatalog !== true) return;
                    
                    // ЗАДАЧА 4: Пропускаем всё, что не является кофе в прайсе
                    const catName = (p.category || '').toLowerCase();
                    if (catName.includes('аксессуар') || catName.includes('информац')) return;
                    
                    const rawGreen = parseFloat(p.rawGreenPrice || p.raw_green_price) || 0;
                    const fixedPrice = parseFloat(p.price) || 0;
                    
                    if (rawGreen > 0 || fixedPrice > 0) pdfItems.push(p);
                });

                // 2. СОРТИРОВКА: Эспрессо -> Фильтр -> Ароматизация
                pdfItems.sort((a, b) => {
                    const getSortWeight = (item) => {
                        const cat = (item.category || '').toLowerCase();
                        if (cat.includes('ароматизац')) return 0;
                        const r = parseFloat(item.roast) || 0;
                        if (r >= 10) return 2;
                        return 1;
                    };
                    const weightA = getSortWeight(a);
                    const weightB = getSortWeight(b);
                    
                    if (weightA !== weightB) return weightB - weightA;
                    return a.sample.localeCompare(b.sample);
                });

                // 3. ФОРМИРОВАНИЕ СТРОК ПРАЙСА
                pdfItems.forEach(p => {
                    const rawGreen = parseFloat(p.rawGreenPrice || p.raw_green_price) || 0;
                    let ws250 = 0, ws1000 = 0;
                    
                    if (rawGreen > 0) {
                        const prices = this.calculateWholesalePrice(rawGreen, p);
                        ws250 = prices.p250;
                        ws1000 = prices.p1000;
                    } else if (p.price && parseFloat(p.price) > 0) {
                        const fixedRetail = parseFloat(p.price);
                        ws250 = Math.ceil(fixedRetail * 0.7 / 10) * 10;
                        ws1000 = ws250 * 4;
                    }
                    
                    const roastVal = parseFloat(p.roast) || 0;
                    const catName = (p.category || '').toLowerCase(); // <-- ИСПРАВЛЕНИЕ: ДОБАВИЛИ ПОТЕРЯННУЮ ПЕРЕМЕННУЮ
                    
                    let typeText = 'ФИЛЬТР';
                    if (catName.includes('ароматизац')) {
                        typeText = 'АРОМАТИЗАЦИЯ';
                    } else if (catName.includes('эспрессо')) {
                        typeText = 'ЭСПРЕССО';
                    } else if (!catName.includes('фильтр') && roastVal >= 10) {
                        typeText = 'ЭСПРЕССО';
                    }

                    const blendPrefix = ProductManager.isBlendProduct(p) ? 'BLEND ' : '';
                    const prefixText = `${blendPrefix}[${typeText}] `;
                    const displaySampleName = ProductManager.getLotDisplayName(p);
                    
                    // Исправлено: используем ProductManager (для HTML-таблицы и PDF)
                    const isSpecialItem = ProductManager.getTypeInfo(p).isSpecial;
                    const displayDesc = isSpecialItem ? (p.customDesc || p.flavorDesc || '-') : (p.flavorDesc || '-');
                    
                    tableBody.push([
                        prefixText + displaySampleName, 
                        displayDesc, 
                        { text: ws250 + '\u00A0₽', alignment: 'center', noWrap: true }, 
                        { text: ws1000 + '\u00A0₽', alignment: 'center', noWrap: true }
                    ]);
                });

                const docDefinition = {
                    content: [
                        { text: 'Locus Coffee Roasters', style: 'header', alignment: 'center' },
                        { text: `Оптовый прайс-лист от ${new Date().toLocaleDateString()}`, style: 'subheader', alignment: 'center' },
                        { text: '+7 906 660 4060 | info@locus.coffee', style: 'subheader', alignment: 'center', margin: [0,0,0,20] },
                        {
                            table: {
                                widths: ['25%', '*', 'auto', 'auto'], 
                                body: tableBody
                            }
                        },
                        { text: 'Не является публичной офертой.', style: 'footerText', alignment: 'left', margin: [0, 20, 0, 0] }
                    ],
                    styles: {
                        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
                        subheader: { fontSize: 12, margin: [0, 0, 0, 5] },
                        contacts: { fontSize: 10, italics: true },
                        footerText: { fontSize: 10, color: 'gray', italics: true }
                    }
                };

                pdfMake.createPdf(docDefinition).download('locus_wholesale.pdf');
            },

            // --- CDEK INTEGRATION ---
            calculatePackage: function() {
                let packages = [];
                this.localCart.forEach(item => {
                    if (this.isArticleCartItem(item)) return;
                    for(let i=0; i<item.qty; i++) {
                        if(item.weight === 1000) {
                            packages.push({ weight: 1020, length: 12, width: 10, height: 30 });
                        } else {
                            packages.push({ weight: 265, length: 12, width: 8, height: 18 });
                        }
                    }
                });
                if(packages.length === 0) packages.push({ weight: 265, length: 12, width: 8, height: 18 });
                return packages;
            },

            // --- НАЧАЛО: ЛЕГКИЙ ИНТЕРФЕЙС СДЭК БЕЗ КАРТЫ ---
            initCDEK: function() {
                const cityInput = document.getElementById('cdek-city-input');
                const pvzSelect = document.getElementById('cdek-pvz-select');
                
                if(cityInput && !this.cdekInitialized) {
                    let debounceTimer;
                    cityInput.addEventListener('input', (e) => {
                        clearTimeout(debounceTimer);
                        const query = e.target.value.trim();
                        if(query.length < 3) {
                            document.getElementById('cdek-city-results').style.display = 'none';
                            document.getElementById('cdek-pvz-wrapper').style.display = 'none';
                            return;
                        }
                        debounceTimer = setTimeout(() => this.searchCdekCity(query), 600);
                    });

                    // Скрываем список городов при клике вне него
                    document.addEventListener('click', (e) => {
                        if(e.target !== cityInput) document.getElementById('cdek-city-results').style.display = 'none';
                    });
                }

                if(pvzSelect && !this.cdekInitialized) {
                    pvzSelect.addEventListener('change', (e) => {
                        const selectedOption = e.target.options[e.target.selectedIndex];
                        if(selectedOption.value) {
                            const pvzCode = selectedOption.value;
                            const address = selectedOption.text;
                            const cityCode = selectedOption.getAttribute('data-city-code');
                            this.selectCdekPvz(pvzCode, address, cityCode);
                        }
                    });
                }
                this.cdekInitialized = true;
            },

            toggleSelfPickup: function() {
                const cb = document.getElementById('self-pickup-checkbox');
                const codeBlock = document.getElementById('self-pickup-code-block');
                const codeEl = document.getElementById('self-pickup-code');
                const cdekWidget = document.getElementById('custom-cdek-widget');

                if (cb && cb.checked) {
                    if (this.pickupLockerCodeEnabled) {
                        // Временный флаг: код ячейки можно быстро вернуть, переключив pickupLockerCodeEnabled в true.
                        if (!this.currentPickupCode) {
                            this.currentPickupCode = Math.floor(100000 + Math.random() * 900000).toString();
                        }
                        codeEl.textContent = this.currentPickupCode;
                        codeBlock.style.display = 'block';
                    } else {
                        this.currentPickupCode = null;
                        codeEl.textContent = '';
                        codeBlock.style.display = 'none';
                    }
                    
                    // Визуально глушим блок СДЭКа
                    if(cdekWidget) { cdekWidget.style.opacity = '0.3'; cdekWidget.style.pointerEvents = 'none'; }
                    this.calculateDeliveryCost(0); // Бесплатная доставка
                } else {
                    // Возвращаем всё обратно
                    codeBlock.style.display = 'none';
                    if(cdekWidget) { cdekWidget.style.opacity = '1'; cdekWidget.style.pointerEvents = 'auto'; }
                    
                    if (this.cdekInfo && this.cdekInfo.rawPrice) {
                        this.calculateDeliveryCost(this.cdekInfo.rawPrice);
                    } else {
                        this.calculateDeliveryCost(0);
                    }
                }
            },

            searchCdekCity: async function(query) {
                const resultsDiv = document.getElementById('cdek-city-results');
                resultsDiv.innerHTML = '<div style="padding: 12px; font-size: 12px; opacity: 0.6;">Поиск города...</div>';
                resultsDiv.style.display = 'block';

                try {
                    const res = await fetch(`https://functions.yandexcloud.net/d4e5dal47a38n862fndt?action=city&city=${encodeURIComponent(query)}`);
                    const data = await res.json();

                    if(data && data.length > 0) {
                        resultsDiv.innerHTML = '';
                        data.forEach(city => {
                            const div = document.createElement('div');
                            div.className = 'suggestion-item';
                            div.style.cssText = 'padding: 12px; font-size: 12px; cursor: pointer; border-bottom: 1px solid rgba(105,58,5,0.1); transition: 0.2s;';
                            div.onmouseover = () => div.style.background = '#F4F1EA';
                            div.onmouseout = () => div.style.background = 'transparent';
                            
                            // Формируем красивое название с регионом
                            const regionText = city.region ? `, ${city.region}` : '';
                            div.textContent = `${city.city}${regionText}`;
                            
                            div.onclick = () => {
                                document.getElementById('cdek-city-input').value = city.city;
                                resultsDiv.style.display = 'none';
                                
                                // ИСПРАВЛЕНИЕ: Берем правильное поле city.code
                                this.loadCdekPvzs(city.code);
                            };
                            resultsDiv.appendChild(div);
                        });
                    } else {
                        resultsDiv.innerHTML = '<div style="padding: 12px; font-size: 12px;">Ничего не найдено</div>';
                    }
                } catch(e) {
                    resultsDiv.innerHTML = '<div style="padding: 12px; font-size: 12px; color: red;">Ошибка поиска</div>';
                }
            },

            loadCdekPvzs: async function(cityCode) {
                const pvzWrapper = document.getElementById('cdek-pvz-wrapper');
                const pvzSelect = document.getElementById('cdek-pvz-select');
                pvzWrapper.style.display = 'block';
                pvzSelect.innerHTML = '<option value="">Загрузка списка ПВЗ...</option>';
                pvzSelect.disabled = true;

                try {
                    const res = await fetch(`https://functions.yandexcloud.net/d4e5dal47a38n862fndt?action=offices&city_code=${cityCode}`);
                    const data = await res.json();

                    pvzSelect.innerHTML = '<option value="">Выберите удобный пункт выдачи...</option>';
                    if(data && data.length > 0) {
                        data.forEach(pvz => {
                            const opt = document.createElement('option');
                            opt.value = pvz.code;
                            opt.text = pvz.location.address;
                            opt.setAttribute('data-city-code', cityCode);
                            pvzSelect.appendChild(opt);
                        });
                        pvzSelect.disabled = false;
                    } else {
                        pvzSelect.innerHTML = '<option value="">Нет ПВЗ в этом городе</option>';
                    }
                } catch(e) {
                    pvzSelect.innerHTML = '<option value="">Ошибка загрузки ПВЗ</option>';
                }
            },

            selectCdekPvz: async function(pvzCode, address, cityCode) {
                const cityInput = document.getElementById('cdek-city-input').value;
                const statusEl = document.getElementById('cdek-status');
                const manualInput = document.getElementById('manual-address');
                if (manualInput) manualInput.value = ''; // Очищаем ручной ввод, если выбрали ПВЗ
                
                if(statusEl) {
                    statusEl.innerHTML = `<b>ПВЗ:</b> ${cityInput}, ${address} <br><span style="font-size: 10px; opacity: 0.7;">Рассчитываем стоимость доставки...</span>`;
                    statusEl.style.color = 'var(--locus-dark)';
                }

                try {
                    const packages = this.calculatePackage();
                    // Запрос тарифа (код 136 - Посылка склад-склад)
                    const tariffReq = {
                        type: 1, 
                        currency: 1,
                        tariff_code: 136, 
                        from_location: { code: 269 }, // 269 - это точный код Орла в базе СДЭК
                        to_location: { code: parseInt(cityCode) },
                        packages: packages
                    };

                    const res = await fetch(`https://functions.yandexcloud.net/d4e5dal47a38n862fndt?action=calculate`, {
                        method: 'POST',
                        body: JSON.stringify(tariffReq)
                    });
                    const data = await res.json();

                    let price = 350; // Страховочная цена
                    if(data && data.delivery_sum) {
                        price = Math.ceil(data.delivery_sum);
                    } else if (data && data.requests && data.requests.length > 0 && data.requests[0].errors) {
                        console.error('Ошибка СДЭК тарифа:', data.requests[0].errors);
                    }

                    this.cdekInfo = {
                        type: 'PVZ', tariff: 136, city: cityInput,
                        address: address, pvzCode: pvzCode, rawPrice: price
                    };

                    if(statusEl) {
                        statusEl.innerHTML = `<b>Доставка в ПВЗ:</b><br>${cityInput}, ${address}`;
                        statusEl.style.color = '#187a30';
                    }

                    this.calculateDeliveryCost(price);

                } catch(e) {
                    console.error("Error calculating tariff", e);
                    this.calculateDeliveryCost(350); // Fallback
                }
            },
            // --- КОНЕЦ: ЛЕГКИЙ ИНТЕРФЕЙС СДЭК БЕЗ КАРТЫ ---

            handleCdekChoice: function(type, tariff, address) {
                const price = parseInt(address.price) || 0;
                this.cdekInfo = {
                    type: type, tariff: tariff, city: address.city,
                    address: address.address, pvzCode: address.id || null, rawPrice: price
                };
                const statusEl = document.getElementById('cdek-status');
                if(statusEl) {
                    statusEl.innerHTML = `<b>${type === 'PVZ' ? 'ПВЗ' : 'Курьер'}:</b> ${address.city}, ${address.address}`;
                    statusEl.style.color = '#187a30';
                }
                this.calculateDeliveryCost(price);
            },

            calculateDeliveryCost: function(basePrice) {
                let subtotal = 0;
                this.localCart.forEach(i => subtotal += (i.price * i.qty));
                let loyaltyDiscountVal = 0;
                if(this.currentUser) {
                    const discountPercent = Math.min(Math.floor(this.currentUser.totalSpent / 3000), 15);
                    loyaltyDiscountVal = Math.floor(subtotal * (discountPercent / 100));
                }
                const totalAfterLoyalty = subtotal - loyaltyDiscountVal;

                if (totalAfterLoyalty >= 3000) this.cdekPrice = 0;
                else this.cdekPrice = basePrice;
                this.updateCartTotals();
            },
            // --- КОНЕЦ: СДЭК И РУЧНОЙ ВВОД ---

            fetchUserData: async function() {
                if(!this.uid) return;
                const token = localStorage.getItem('locus_token');
                if(!token) return;
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getUserData', {
                        headers: { 'X-Auth-Token': token } 
                    });
                    const data = await res.json();
                    if(data.user) {
                        // 1. Бронебойный парсер: превращаем строки от YDB в нормальные массивы
                        const parseSafe = (arr) => {
                            if (typeof arr === 'string') { try { return JSON.parse(arr); } catch(e) { return []; } }
                            if (Array.isArray(arr)) return arr;
                            return [];
                        };

                        this.currentUser = data.user;
                        this.currentUser.cart = parseSafe(this.currentUser.cart);
                        this.currentUser.history = parseSafe(this.currentUser.history);
                        this.currentUser.subscription = parseSafe(this.currentUser.subscription);
                        this.userDataLoaded = true;
                        this.syncWelcomeBonusFlag();
                        this.showWelcomeRegistrationPopup();

                        const pendingPaymentOrderId = localStorage.getItem('locus_pending_payment_order_id');
                        const paidPendingOrder = pendingPaymentOrderId && this.currentUser.history.some(h => h && String(h.orderId || '') === String(pendingPaymentOrderId) && h.status !== 'pending_payment');
                        const pendingOrderState = !paidPendingOrder && pendingPaymentOrderId ? await this.getPendingOrderStatus(pendingPaymentOrderId) : null;
                        const resolvedPendingOrder = pendingOrderState && pendingOrderState.found && pendingOrderState.order && pendingOrderState.order.status !== 'pending_payment';
                        const stalePendingOrder = pendingPaymentOrderId && pendingOrderState && pendingOrderState.found === false;

                        // 2. Умная синхронизация корзины с учетом возврата после оплаты
                        if (paidPendingOrder || resolvedPendingOrder) {
                            this.localCart = [];
                            this.currentUser.cart = [];
                            localStorage.removeItem('locus_cart');
                            localStorage.removeItem('locus_pending_payment_order_id');
                            this.stopPendingOrderWatcher();
                        } else if (stalePendingOrder) {
                            localStorage.removeItem('locus_pending_payment_order_id');
                            this.stopPendingOrderWatcher();
                            if (this.currentUser.cart.length > 0) {
                                this.localCart = this.currentUser.cart;
                                this.saveCart(false);
                            } else if (this.localCart.length > 0) {
                                this.saveCart(true);
                            }
                        } else if (this.currentUser.cart.length > 0) {
                            this.localCart = this.currentUser.cart;
                            this.saveCart(false);
                        } else if (pendingPaymentOrderId) {
                            // После возврата с оплаты не пушим локальную корзину обратно, пока ждем подтверждение webhook.
                            this.saveCart(false);
                        } else if (this.localCart.length > 0) {
                            // Если на сервере пусто, а локально есть товары - пушим их на сервер.
                            this.saveCart(true);
                        }

                        if (pendingPaymentOrderId && !paidPendingOrder && !resolvedPendingOrder && !stalePendingOrder) {
                            this.startPendingOrderWatcher(pendingPaymentOrderId);
                        }
                        
                        this.updateCartBadge();
                        this.syncExpiredPvzOrdersFromHistory();
                        let spent = parseFloat(this.currentUser.totalSpent);
                        if(isNaN(spent) || spent > 1000000000) spent = 0;
                        this.currentUser.totalSpent = spent;
                        
                        // Мгновенная перерисовка, если ЛК открыт
                        if(document.getElementById('lc-modal').classList.contains('active')) {
                            this.renderDashboard();
                        }
                    }
                } catch(e) { console.error('Ошибка профиля', e); }
            },
            
            backgroundSync: async function() {
                if(!this.uid) return;
                const token = localStorage.getItem('locus_token');
                if(!token) return;
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getUserData', {
                        headers: { 'X-Auth-Token': token } 
                    });
                    const data = await res.json();
                    if(data.user) {
                        const parseSafe = (arr) => {
                            if (typeof arr === 'string') { try { return JSON.parse(arr); } catch(e) { return []; } }
                            if (Array.isArray(arr)) return arr;
                            return [];
                        };

                        const serverData = data.user;
                        serverData.cart = parseSafe(serverData.cart);
                        serverData.history = parseSafe(serverData.history);
                        serverData.subscription = parseSafe(serverData.subscription);

                        if(JSON.stringify(serverData.history) !== JSON.stringify(this.currentUser.history) || 
                           JSON.stringify(serverData.subscription) !== JSON.stringify(this.currentUser.subscription) ||
                           JSON.stringify(serverData.cart) !== JSON.stringify(this.localCart)) {
                            
                            this.currentUser = serverData;
                            this.userDataLoaded = true;
                            this.syncWelcomeBonusFlag();
                            this.showWelcomeRegistrationPopup();
                            const pendingPaymentOrderId = localStorage.getItem('locus_pending_payment_order_id');
                            const paidPendingOrder = pendingPaymentOrderId && serverData.history.some(h => h && String(h.orderId || '') === String(pendingPaymentOrderId) && h.status !== 'pending_payment');
                            const pendingOrderState = !paidPendingOrder && pendingPaymentOrderId ? await this.getPendingOrderStatus(pendingPaymentOrderId) : null;
                            const resolvedPendingOrder = pendingOrderState && pendingOrderState.found && pendingOrderState.order && pendingOrderState.order.status !== 'pending_payment';
                            const stalePendingOrder = pendingPaymentOrderId && pendingOrderState && pendingOrderState.found === false;
                             
                            if (paidPendingOrder || resolvedPendingOrder) {
                                this.localCart = [];
                                this.currentUser.cart = [];
                                localStorage.removeItem('locus_cart');
                                localStorage.removeItem('locus_pending_payment_order_id');
                                this.stopPendingOrderWatcher();
                                this.updateCartBadge();
                            } else if (stalePendingOrder) {
                                localStorage.removeItem('locus_pending_payment_order_id');
                                this.stopPendingOrderWatcher();
                                if (serverData.cart.length > 0) {
                                    this.localCart = serverData.cart;
                                    this.saveCart(false);
                                    this.updateCartBadge();
                                }
                            } else if (serverData.cart.length > 0) { 
                                this.localCart = serverData.cart; 
                                this.saveCart(false); 
                                this.updateCartBadge(); 
                            }
                            
                            if (pendingPaymentOrderId && !paidPendingOrder && !resolvedPendingOrder && !stalePendingOrder) {
                                this.startPendingOrderWatcher(pendingPaymentOrderId);
                            }
                            this.syncExpiredPvzOrdersFromHistory();

                            if(document.getElementById('lc-modal').classList.contains('active')) {
                                this.renderDashboard();
                                if(document.getElementById('view-cart').classList.contains('show-view')) { this.renderCart(); }
                            }
                        }
                    }
                } catch(e) {}
            },
            // --- КОНЕЦ: ЗАМЕНА СДЭК И СИНХРОНИЗАЦИИ ---

            // --- НАЧАЛО: ИСПРАВЛЕННОЕ ОТКРЫТИЕ ОКОН ---
            toggleModal: function(show, initialView = 'dashboard') {
                const m = document.getElementById('lc-modal');
                if(!m) return;
                
                // ДОБАВЛЕНО: Получаем текущий URL
                const url = new URL(window.location);

                if(show) {
                    if (initialView === 'reset-password' && !this.getResetPasswordTokenFromUrl()) initialView = 'forgot-password';
                    document.body.style.overflow = 'hidden';
                    m.classList.add('active');
                    if(initialView === 'wholesale') m.classList.add('wide'); else m.classList.remove('wide');
                    
                    // ДОБАВЛЕНО: Обновляем URL для прямых ссылок (Опт, Корзина, Вход)
                    if (initialView === 'wholesale' || initialView === 'cart' || initialView === 'login' || initialView === 'forgot-password' || initialView === 'reset-password') {
                        url.searchParams.set('view', initialView);
                        if (initialView !== 'reset-password') url.searchParams.delete('reset_token');
                        window.history.replaceState({}, '', url);
                    }
                    
                    if(initialView === 'cart') { 
                        this.renderCart(); 
                        this.switchView('cart'); 
                    } 
                    else if (initialView === 'admin') { 
                        m.classList.add('admin-wide');
                        m.classList.add('wide');
                        this.switchView('admin'); 
                        this.switchAdminTab('catalog');
                        this.loadUsers(); 
                        this.loadPromos(); 
                        
                        PromotionSystem.loadActionsList();
                        MessageSystem.startAdminPolling();
                    }
                    else if(initialView === 'wholesale') { 
                        m.classList.add('wide'); 
                        m.classList.remove('admin-wide');
                        this.switchView('wholesale'); 
                    }
                    else if(initialView === 'forgot-password') {
                        m.classList.remove('wide'); m.classList.remove('admin-wide');
                        this.switchView('forgot-password');
                    }
                    else if(initialView === 'reset-password') {
                        m.classList.remove('wide'); m.classList.remove('admin-wide');
                        this.switchView('reset-password');
                    }
                    else if(this.uid) { 
                        m.classList.remove('wide'); m.classList.remove('admin-wide');
                        this.renderDashboard(); this.switchView('dashboard'); 
                    } 
                    else { 
                        m.classList.remove('wide'); m.classList.remove('admin-wide');
                        this.switchView('login'); 
                    }
                } else { 
                    document.body.style.overflow = '';
                    m.classList.remove('active'); 
                    MessageSystem.stopAdminPolling();
                    
                    // ДОБАВЛЕНО: Очищаем параметр view при закрытии окна, чтобы вернуть чистый URL
                    url.searchParams.delete('view');
                    url.searchParams.delete('reset_token');
                    window.history.replaceState({}, '', url);
                }
            },
            // --- КОНЕЦ: ИСПРАВЛЕННОЕ ОТКРЫТИЕ ОКОН ---

            switchView: function(viewName) {
                const authViews = ['login', 'register', 'forgot-password', 'reset-password'];
                ['view-login', 'view-register', 'view-forgot-password', 'view-reset-password', 'view-dashboard', 'view-cart', 'view-admin', 'view-wholesale'].forEach(id => {
                    const el = document.getElementById(id); if(el) el.classList.remove('show-view');
                });
                if (viewName === 'forgot-password') {
                    const forgotInput = document.getElementById('forgot-email');
                    const loginInput = document.getElementById('login-email');
                    if (forgotInput && !forgotInput.value && loginInput?.value) forgotInput.value = this.normalizeEmailAddress(loginInput.value);
                }
                if (viewName === 'reset-password') {
                    const note = document.getElementById('reset-password-note');
                    if (note) {
                        note.textContent = this.getResetPasswordTokenFromUrl()
                            ? 'Придумайте новый пароль для входа в аккаунт. После сохранения можно будет войти с новым паролем на любом устройстве.'
                            : 'Ссылка для восстановления не найдена. Запросите новую ссылку ниже.';
                    }
                    if (!this.getResetPasswordTokenFromUrl()) viewName = 'forgot-password';
                }
                if (document.getElementById('lc-modal')?.classList.contains('active') && authViews.includes(viewName)) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('view', viewName);
                    if (viewName !== 'reset-password') url.searchParams.delete('reset_token');
                    window.history.replaceState({}, '', url);
                } else if (document.getElementById('lc-modal')?.classList.contains('active')) {
                    const url = new URL(window.location.href);
                    const currentView = url.searchParams.get('view');
                    if (currentView === 'login' || currentView === 'register' || currentView === 'forgot-password' || currentView === 'reset-password') {
                        url.searchParams.delete('view');
                        url.searchParams.delete('reset_token');
                        window.history.replaceState({}, '', url);
                    }
                }
                const view = document.getElementById(`view-${viewName}`); if(view) view.classList.add('show-view');
                if (viewName !== 'admin') MessageSystem.stopAdminPolling();
            },
            
            toggleSection: function(secName) {
                const content = document.getElementById(`cont-${secName}`);
                const arrow = document.getElementById(`arrow-${secName}`);
                if (content.classList.contains('hidden')) {
                    content.classList.remove('hidden');
                    arrow.classList.remove('rotated');
                } else {
                    content.classList.add('hidden');
                    arrow.classList.add('rotated');
                }
            },
            
            switchAdminTab: function(tabName) {
                ['catalog','users', 'promos', 'subs', 'costs', 'contracts', 'actions', 'messages', 'ws-orders', 'orders'].forEach(t => {
                    const sec = document.getElementById(`admin-sec-${t}`);
                    if(sec) sec.classList.remove('active');
                });
                const activeSec = document.getElementById(`admin-sec-${tabName}`);
                if(activeSec) activeSec.classList.add('active');
                
                const tabs = document.querySelectorAll('.admin-tab');
                tabs.forEach(t => t.classList.remove('active'));
                const clickedBtn = Array.from(tabs).find(b => b.getAttribute('onclick').includes(`'${tabName}'`));
                if(clickedBtn) clickedBtn.classList.add('active');

                if (tabName === 'promos') this.loadPromos();
                if (tabName === 'subs') this.loadActiveSubs();
                if (tabName === 'users') this.loadUsers();
                if (tabName === 'actions') PromotionSystem.loadActionsList();
                if (tabName === 'messages') MessageSystem.loadMessagesForAdmin({ markAsRead: true });
                if (tabName === 'ws-orders') this.loadWholesaleOrders();
                if (tabName === 'catalog') CatalogSystem.loadData();
                if (tabName === 'orders') this.loadRetailOrders();
                if (tabName === 'contracts') this.initContractB2BAdmin();
            },

            // --- НАЧАЛО: АДМИНКА - ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ИЗ YDB ---
            loadUsers: async function() {
                const container = document.getElementById('admin-sec-users');
                container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Загрузка базы YDB...</div>';

                const token = localStorage.getItem('locus_token');
                if(!token) return container.innerHTML = 'Нет доступа';

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getAdminUsers', {
                        headers: { 'X-Auth-Token': token }
                    });
                    const data = await res.json();
                    
                    if (!data.success) throw new Error(data.error || 'Ошибка загрузки');

                    let totalRevenue = 0;
                    let totalOrders = 0;
                    let usersList = [];

                    data.users.forEach(u => {
                        const history = this.getVisibleHistoryItems(u.history || []);
                        const spent = u.totalSpent || 0;
                        totalRevenue += spent;
                        totalOrders += history.length;

                        let freq = "Нет покупок";
                        if(history.length === 1) freq = "Новичок (1)";
                        else if(history.length > 10) freq = "VIP (>10)";
                        else if(history.length > 3) freq = "Постоянный";
                        else if(history.length > 1) freq = "Активный";

                        let fav = "-";
                        if(history.length > 0) {
                            const counts = {};
                            history.forEach(h => { 
                                // Проверяем: это новый формат (Заказ) или старый (отдельная пачка)
                                if (h.isOrder && Array.isArray(h.items)) {
                                    h.items.forEach(i => {
                                        if (i.item) {
                                            const name = i.item.split(' (')[0];
                                            counts[name] = (counts[name] || 0) + (i.qty || 1); 
                                        }
                                    });
                                } else if (h.item) { // Старый формат
                                    const name = h.item.split(' (')[0];
                                    counts[name] = (counts[name] || 0) + (h.qty || 1); 
                                }
                            });
                            
                            if (Object.keys(counts).length > 0) {
                                fav = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                            }
                        }

                        let discount = Math.floor(spent / 3000);
                        if(discount > 15) discount = 15;

                        usersList.push({
                            id: u.id,
                            email: u.email,
                            spent: spent,
                            discount: discount,
                            freq: freq,
                            fav: fav
                        });
                    });

                    usersList.sort((a, b) => b.spent - a.spent);
                    this.adminUsersMap = Object.fromEntries(usersList.map(u => [u.id, u]));

                    let html = `
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; text-align:center;">
                            <div style="background:#fff; padding:10px; border:1px solid #E5E1D8; border-radius:8px;">
                                <div style="font-size:10px; color:gray; text-transform:uppercase;">Оборот</div>
                                <div style="font-size:16px; font-weight:bold;">${totalRevenue.toLocaleString()} ₽</div>
                            </div>
                            <div style="background:#fff; padding:10px; border:1px solid #E5E1D8; border-radius:8px;">
                                <div style="font-size:10px; color:gray; text-transform:uppercase;">Товаров куплено</div>
                                <div style="font-size:16px; font-weight:bold;">${totalOrders}</div>
                            </div>
                            <div style="background:#fff; padding:10px; border:1px solid #E5E1D8; border-radius:8px;">
                                <div style="font-size:10px; color:gray; text-transform:uppercase;">Ср. цена товара</div>
                                <div style="font-size:16px; font-weight:bold;">${totalOrders ? Math.round(totalRevenue/totalOrders) : 0} ₽</div>
                            </div>
                        </div>
                    `;

                    html += `
                        <div style="overflow-x:auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Клиент</th>
                                    <th>Скидка</th>
                                    <th>Любимый сорт</th>
                                    <th>Статус</th>
                                    <th>LTV (Сумма)</th>
                                    <th style="width:42px;"></th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    usersList.forEach(u => {
                        const isProtectedUser = this.normalizeEmailAddress(u.email) === 'info@locus.coffee';
                        html += `
                            <tr>
                                <td>
                                    <div style="font-weight:600;">${u.email}</div>
                                    <div style="font-size:9px; opacity:0.6;">ID: ...${u.id.slice(-5)}</div>
                                </td>
                                <td>${u.discount}%</td>
                                <td style="font-size:10px;">${u.fav}</td>
                                <td style="font-size:10px;">${u.freq}</td>
                                <td style="font-weight:bold;">${u.spent} ₽</td>
                                <td class="admin-user-actions-cell">
                                    <button class="cat-btn-icon delete admin-user-delete-btn" type="button" title="${isProtectedUser ? '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u043d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c' : '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f'}" onclick="UserSystem.deleteUser('${u.id}')" ${isProtectedUser ? 'disabled aria-disabled="true"' : ''}>&times;</button>
                                </td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table></div>`;
                    container.innerHTML = html;
                    this.startRetailCountdownTicker();

                } catch(e) {
                    console.error(e);
                    container.innerHTML = `<div style="color:#B66A58">Ошибка: ${e.message}</div>`;
                }
            },
            // --- КОНЕЦ: АДМИНКА - ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ИЗ YDB ---
            // --- НАЧАЛО: ПРОМОКОДЫ YDB ---
            loadPromos: async function() {
                const list = document.getElementById('admin-promo-list');
                list.innerHTML = 'Загрузка...';
                const token = localStorage.getItem('locus_token');
                if(!token) return list.innerHTML = 'Нет доступа';

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getPromos', {
                        headers: { 'X-Auth-Token': token }
                    });
                    const data = await res.json();
                    list.innerHTML = '';
                    if (!data.success) throw new Error(data.error);
                    
                    if(data.promos.length === 0) list.innerHTML = '<div style="opacity:0.5; font-size:12px;">Нет промокодов</div>';

                    data.promos.forEach(p => {
                        const div = document.createElement('div');
                        div.className = 'promo-list-item';
                        div.innerHTML = `
                            <div>
                                <strong>${p.id}</strong> 
                                <span style="font-size:10px; color:gray;">(${p.val} ${p.type === 'percent' ? '%' : 'RUB'})</span>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input type="checkbox" ${p.active ? 'checked' : ''} onchange="UserSystem.togglePromo('${p.id}', this.checked)">
                                <button onclick="UserSystem.deletePromo('${p.id}')" style="border:none; background:transparent; color:#B66A58; cursor:pointer;">&times;</button>
                            </div>
                        `;
                        list.appendChild(div);
                    });
                } catch(e) { console.error(e); list.innerHTML = 'Ошибка загрузки'; }
            },

            addPromo: async function() {
                const code = document.getElementById('new-promo-code').value.toUpperCase().trim();
                const val = parseFloat(document.getElementById('new-promo-val').value);
                const type = document.getElementById('new-promo-type').value;
                if(!code || !val) return alert('Заполните код и значение');
                
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=addPromo', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'addPromo', id: code, val: val, type: type, active: true })
                    });
                    document.getElementById('new-promo-code').value = '';
                    this.loadPromos();
                } catch(e) { alert('Ошибка добавления: ' + e.message); }
            },

            togglePromo: async function(id, status) {
                const token = localStorage.getItem('locus_token');
                try { 
                    await fetch(LOCUS_API_URL + '?action=togglePromo', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'togglePromo', id: id, active: status })
                    });
                } catch(e) { console.error(e); }
            },

            deletePromo: async function(id) {
                if(!confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434?')) return;
                const token = localStorage.getItem('locus_token');
                try { 
                    await fetch(LOCUS_API_URL + '?action=deletePromo', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'deletePromo', id: id })
                    });
                    this.loadPromos(); 
                } catch(e) { console.error(e); }
            },

            deleteUser: async function(userId) {
                const user = this.adminUsersMap?.[userId];
                const userEmail = user?.email || '\u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f';
                if (this.normalizeEmailAddress(userEmail) === 'info@locus.coffee') {
                    alert('\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430 \u0443\u0434\u0430\u043b\u044f\u0442\u044c \u043d\u0435\u043b\u044c\u0437\u044f.');
                    return;
                }
                if(!confirm(`\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f ${userEmail} \u0438\u0437 \u0431\u0430\u0437\u044b \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u043e\u0432? \u042d\u0442\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043e\u0431\u0440\u0430\u0442\u0438\u043c\u043e.`)) return;

                const token = localStorage.getItem('locus_token');
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=deleteUser', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'deleteUser', id: userId })
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f');
                    this.loadUsers();
                } catch(e) {
                    console.error(e);
                    alert('\u041e\u0448\u0438\u0431\u043a\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u044f: ' + e.message);
                }
            },

            applyPromo: async function() {
                const input = document.getElementById('cart-promo-input');
                const code = input.value.toUpperCase().trim();
                if(!code) return;

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=checkPromo&id=' + code);
                    const data = await res.json();
                    
                    if(data.success && data.promo && data.promo.active) {
                        this.activePromo = { ...data.promo, code: code };
                        alert(`Промокод ${code} применен!`);
                        this.updateCartTotals();
                    } else {
                        alert('Промокод не найден или неактивен');
                        this.activePromo = null;
                        this.updateCartTotals();
                    }
                } catch(e) { console.error(e); }
            },
            
            verifyActivePromo: async function() {
                if (this.activePromo) {
                    try {
                        const res = await fetch(LOCUS_API_URL + '?action=checkPromo&id=' + this.activePromo.code);
                        const data = await res.json();
                        if (!data.success || !data.promo || !data.promo.active) {
                            this.activePromo = null;
                            alert("Внимание! Примененный ранее промокод перестал действовать или был удален.");
                            this.updateCartTotals();
                        }
                    } catch(e) { console.error(e); }
                }
            },
            // --- КОНЕЦ: ПРОМОКОДЫ YDB ---

            // --- НАЧАЛО: АДМИНКА - ОТОБРАЖЕНИЕ ПОДПИСОК YDB ---
            // --- НАЧАЛО: АДМИНКА - ОТОБРАЖЕНИЕ ПОДПИСОК С ГРУППИРОВКОЙ ---
            loadActiveSubs: async function() {
                const container = document.getElementById('admin-sec-subs');
                if(!container) return;
                container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Сбор активных подписок...</div>';

                const token = localStorage.getItem('locus_token');
                if(!token) return container.innerHTML = 'Нет доступа';

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getAdminSubs', { 
                        headers: { 'X-Auth-Token': token } 
                    });
                    const data = await res.json();
                    
                    if (!data.success) throw new Error(data.error || 'Ошибка загрузки');

                    if(data.subs.length === 0) {
                        container.innerHTML = '<div style="padding:20px; opacity:0.5; text-align:center;">Активных подписок пока нет</div>';
                        return;
                    }

                    // 1. ГРУППИРУЕМ ЛОТЫ ПО EMAIL И ИЩЕМ САМУЮ СВЕЖУЮ ДАТУ
                    const groupedSubs = {};

                    data.subs.forEach(s => {
                        if (!groupedSubs[s.email]) {
                            groupedSubs[s.email] = {
                                email: s.email,
                                lots: [],
                                latestDateObj: new Date(0), // Стартовая пустая дата
                                displayDate: 'Неизвестно',
                                totalMonthlyPrice: 0
                            };
                        }

                        // Добавляем лот в группу пользователя
                        groupedSubs[s.email].lots.push(s);
                        groupedSubs[s.email].totalMonthlyPrice += (Number(s.price) || 0);

                        // Парсим дату формата ДД.ММ.ГГГГ для поиска самого последнего добавления
                        if (s.dateAdded && s.dateAdded.includes('.')) {
                            const [day, month, year] = s.dateAdded.split('.');
                            const parsedDate = new Date(`${year}-${month}-${day}`);
                            
                            // Если дата текущего лота свежее, обновляем дату всей подписки
                            if (parsedDate > groupedSubs[s.email].latestDateObj) {
                                groupedSubs[s.email].latestDateObj = parsedDate;
                                groupedSubs[s.email].displayDate = s.dateAdded;
                            }
                        } else if (groupedSubs[s.email].displayDate === 'Неизвестно') {
                            groupedSubs[s.email].displayDate = s.dateAdded;
                        }
                    });

                    // 2. ПРЕВРАЩАЕМ ОБЪЕКТ В МАССИВ И СОРТИРУЕМ (самые свежие подписки сверху)
                    const groupedArray = Object.values(groupedSubs);
                    groupedArray.sort((a, b) => b.latestDateObj - a.latestDateObj);

                    let totalLots = data.subs.length;
                    let totalUsers = groupedArray.length;

                    // 3. ОТРИСОВЫВАЕМ ТАБЛИЦУ
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
                        // Собираем все лоты клиента в единый красивый блок
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

                } catch(e) {
                    console.error(e);
                    container.innerHTML = `<div style="color:#B66A58">Ошибка: ${e.message}</div>`;
                }
            },
            // --- КОНЕЦ: АДМИНКА - ОТОБРАЖЕНИЕ ПОДПИСОК С ГРУППИРОВКОЙ ---
            
            // --- НАЧАЛО: АДМИНКА - ОПТОВЫЕ ЗАКАЗЫ ---
            loadWholesaleOrders: async function() {
                const container = document.getElementById('admin-ws-orders-list');
                if(!container) return;
                container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Загрузка заказов...</div>';
                
                const token = localStorage.getItem('locus_token');
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=getAdminWholesaleOrders', { headers: { 'X-Auth-Token': token } });
                    const data = await res.json();
                    if(!data.success) throw new Error(data.error);
                    
                    if(data.orders.length === 0) {
                        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">Новых оптовых заказов пока нет</div>';
                        return;
                    }
                    
                    // Умная сортировка дат (независимо от того, секунды от базы это или миллисекунды)
                    const getMs = (val) => {
                        const ts = Number(val);
                        if (!isNaN(ts)) return ts < 3000000000 ? ts * 1000 : ts;
                        return new Date(val).getTime() || 0;
                    };
                    data.orders.sort((a,b) => getMs(b.createdAt) - getMs(a.createdAt));
                    
                    // ИЗМЕНЕНИЕ 1: Жестко задаем ширину колонок (25%, 55%, 20%)
                    let html = '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr><th style="width: 25%;">Заказ и Клиент</th><th style="width: 55%;">Состав и Сумма</th><th style="width: 20%; min-width: 110px;">Статус</th></tr></thead><tbody>';
                    
                    data.orders.forEach(o => {
                        let d = new Date(o.createdAt);
                        const ts = Number(o.createdAt);
                        if (!isNaN(ts) && ts > 0 && ts < 3000000000) d = new Date(ts * 1000); 
                        else if (!isNaN(ts) && ts >= 3000000000) d = new Date(ts);
                        if (isNaN(d.getTime())) d = new Date();

                        const datePart = d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' });
                        const timePart = d.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
                        const dateStrHTML = `${datePart} ${timePart}`;

                        const itemsHtml = o.items.map(i => {
                            const meta = ProductManager.getDisplayMeta(i.item, i.weight, i.grind);
                            const weightText = meta.weight ? ` <span style="font-size:10px; color:gray;">(${meta.weight}г)</span>` : '';
                            return `<span style="font-weight:600">${i.item}</span>${weightText} x ${i.qty} шт.`;
                        }).join('<br>');
                        
                        const phone = o.customer && o.customer.phone ? o.customer.phone : 'Не указан';
                        const email = o.customer && o.customer.email ? o.customer.email : 'Не указан';
                        const reqs = o.customer && o.customer.requisites ? o.customer.requisites : '';
                        
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
                } catch(e) { container.innerHTML = '<div style="color:red; font-size:12px;">Ошибка загрузки</div>'; console.error(e); }
            },
            loadRetailOrders: async function() {
                const container = document.getElementById('admin-orders-list');
                if(!container) return;
                container.innerHTML = '<div class="loader" style="position:relative; top:0; color:var(--locus-dark);">Загрузка заказов...</div>';
                
                const token = localStorage.getItem('locus_token');
                try {
                    // Используем тот же API, но запрашиваем розничные заказы. 
                    // ВНИМАНИЕ: Для этого твоя Яндекс Функция должна поддерживать action=getAdminOrders
                    const res = await fetch(LOCUS_API_URL + '?action=getAdminOrders', { headers: { 'X-Auth-Token': token } });
                    const data = await res.json();
                    if(!data.success) throw new Error(data.error);
                    
                    if(data.orders.length === 0) {
                        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">Новых розничных заказов пока нет</div>';
                        return;
                    }
                    
                    // Сортировка (новые сверху)
                    data.orders.sort((a,b) => b.invId - a.invId);
                    
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
                            
                            let metaArr = [];
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
                                ${delivery.type === 'PICKUP' ? 
                                    `<div style="padding:6px; background:#f4f9f5; border:1px dashed #187a30; border-radius:4px;">
                                        <b>Самовывоз (Атолл)</b><br>
                                        <span style="color:#187a30; font-size:12px;">${delivery.code ? `Код: <b>${delivery.code}</b>` : ''}</span>
                                    </div>` 
                                : 
                                    `<b>${delivery.type === 'PVZ' ? 'СДЭК ПВЗ' : (delivery.type === 'MANUAL' ? 'Ручной ввод' : 'Курьер')}</b><br>
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
                } catch(e) { container.innerHTML = '<div style="color:red; font-size:12px;">Ошибка загрузки</div>'; console.error(e); }
            },

            updateRetailOrderStatus: async function(orderId, newStatus) {
                const token = localStorage.getItem('locus_token');
                try {
                    const res = await fetch(LOCUS_API_URL + '?action=updateOrderStatus', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'updateOrderStatus', orderId: orderId, status: newStatus })
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043a\u0430\u0437\u0430');
                    this.loadRetailOrders();
                } catch(e) { alert('Ошибка обновления статуса'); }
            },
            deleteRetailOrder: async function(orderId) {
                if(!confirm('ВНИМАНИЕ! Вы точно хотите безвозвратно удалить этот розничный заказ из базы?')) return;
                
                const token = localStorage.getItem('locus_token');
                if(!token) return alert('Пожалуйста, авторизуйтесь');

                try {
                    const res = await fetch(LOCUS_API_URL + '?action=deleteOrder', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'deleteOrder', orderId: orderId })
                    });
                    const data = await res.json();
                    
                    if(data.success) {
                        this.loadRetailOrders(); // Перезагружаем таблицу
                    } else {
                        alert('Ошибка: ' + (data.error || 'Не удалось удалить заказ'));
                    }
                } catch(e) {
                    console.error("Ошибка при удалении заказа:", e);
                    alert('Произошла ошибка при удалении заказа');
                }
            },
            updateOrderStatus: async function(orderId, newStatus) {
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=updateOrderStatus', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'updateOrderStatus', orderId: orderId, status: newStatus })
                    });
                    this.loadWholesaleOrders(); 
                } catch(e) { alert('Ошибка обновления статуса'); }
            },
            // Пункт 8: Новая функция для удаления заказа с запросом в YDB
            deleteWholesaleOrder: async function(orderId) {
                if(!confirm('Удалить этот оптовый заказ? Это действие необратимо.')) return;
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=deleteWholesaleOrder', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'deleteWholesaleOrder', orderId: orderId })
                    });
                    this.loadWholesaleOrders(); // Мгновенно обновляем таблицу
                } catch(e) { alert('Ошибка удаления: ' + e.message); }
            },

           addToCart: function(item, weight = 250, grind = "Зерно") {
                const product = ALL_PRODUCTS_CACHE.find(p => (p.sample || p.sample_no || "").trim() === item.trim());
                if(!product) return alert("Ошибка товара: лот не найден в каталоге.");
                
                // Исправлено: берем информацию о типе товара в одном общем месте
                const typeInfo = ProductManager.getTypeInfo(product);
                const isArticle = typeInfo.isArticle;
                
                // Убираем/заменяем помол для особых категорий
                if (typeInfo.isSpecial) {
                    grind = ""; 
                } else if (typeInfo.isAroma) {
                    grind = "Зерно (Ароматизация)";
                }
                
                // Подтягиваем расчет из базы или фиксированную цену
                const rawGreen = parseFloat(product.rawGreenPrice || product.raw_green_price) || 0;
                let truePrice = 0;
                
                if (rawGreen > 0) {
                    const prices = this.calculateRetailPrices(rawGreen);
                    truePrice = weight === 1000 ? prices.p1000 : prices.p250;
                } else if (product.price && parseFloat(product.price) > 0) {
                    const fixedPrice = parseFloat(product.price) || 0;
                    truePrice = weight === 1000 ? fixedPrice * 4 : fixedPrice;
                }

                if (truePrice === 0) return alert("Цена для этого лота еще не рассчитана (нет данных Extrinsic и не задана фиксированная цена в каталоге).");

                const nextItem = {
                    item,
                    price: truePrice,
                    weight: isArticle ? '' : weight,
                    qty: 1,
                    grind,
                    lotId: String(product.id || item),
                    category: product.category || '',
                    isArticle
                };

                if (isArticle) {
                    const existingArticle = this.localCart.find(i => this.isArticleCartItem(i) && String(i.lotId || i.item || '') === nextItem.lotId);
                    if (existingArticle) {
                        this.toggleModal(true, 'cart');
                        return alert('Эта статья уже лежит в корзине.');
                    }
                    this.localCart.push(nextItem);
                } else {
                    const existing = this.localCart.find(i => i.item === item && i.weight == weight && i.grind === grind);
                    if(existing) existing.qty++;
                    else this.localCart.push(nextItem);
                }
                
                this.saveCart(true);
                this.updateCartBadge();
                alert(`"${item}"${this.formatProductSelectionMeta(product, weight, grind)} добавлен в корзину`);
            },

            // --- НАЧАЛО: НОВОЕ СОХРАНЕНИЕ КОРЗИНЫ ---
            saveCart: async function(syncToDb = false) { 
                localStorage.setItem('locus_cart', JSON.stringify(this.localCart)); 
                if (syncToDb && this.uid) {
                    const token = localStorage.getItem('locus_token');
                    if(token) {
                        try {
                            await fetch(LOCUS_API_URL + '?action=updateUser', {
                                method: 'POST',
                                headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' }, // Заменили заголовок
                                body: JSON.stringify({ action: 'updateUser', field: 'cart', data: this.localCart })
                            });
                        } catch(e) { console.error('Ошибка сохранения корзины', e); }
                    }
                }
                this.cdekInitialized = false; 
            },
            // --- КОНЕЦ: НОВОЕ СОХРАНЕНИЕ КОРЗИНЫ ---

            updateCartBadge: function() {
                const badge = document.getElementById('cart-count');
                const totalQty = this.localCart.reduce((acc, i) => acc + i.qty, 0);
                if(badge) { badge.textContent = totalQty; totalQty > 0 ? badge.classList.add('show') : badge.classList.remove('show'); }
            },

            renderCart: function() {
                const list = document.getElementById('cart-items-list');
                if(!list) return;
                list.innerHTML = '';
                
                if(this.localCart.length === 0) {
                    list.style.flex = '0 0 auto';
                    list.innerHTML = '<div style="opacity:0.5; text-align:center; padding-bottom: 20px;">Корзина пуста</div>';
                    this.syncCartCheckoutMode();
                    this.updateCartTotals(); return;
                }
                
                this.localCart.forEach((p, idx) => {
                    const el = document.createElement('div');
                    el.className = 'cart-item-row';
                    const isArticleItem = this.isArticleCartItem(p);
                    
                    // Исправлено: берем мета-данные через общий helper
                    const meta = ProductManager.getDisplayMeta(p.item, p.weight, p.grind);
                    const wDisplay = meta.weight ? ` ${meta.weight} г` : '';
                    const gDisplay = meta.grind ? ` <span style="font-size:10px; opacity:0.7; border:1px solid #ccc; padding:0 3px; border-radius:3px;">${meta.grind}</span>` : '';
                    const metaText = isArticleItem ? `${p.price} ₽ • цифровой доступ на 1 месяц` : `${p.price} ₽`;
                    const controlsHtml = isArticleItem
                        ? `<div class="cart-controls"><span class="cart-article-badge">1 месяц</span><button class="qty-btn minus" aria-label="Удалить статью">×</button></div>`
                        : `<div class="cart-controls"><button class="qty-btn minus">-</button><span class="cart-qty">${p.qty}</span><button class="qty-btn plus">+</button></div>`;
                    
                    el.innerHTML = `
                        <div class="cart-item-info"><div class="cart-item-title">${p.item}${wDisplay}${gDisplay}</div><div class="cart-item-meta">${metaText}</div></div>
                        ${controlsHtml}
                    `;
                    el.querySelector('.minus').onclick = () => this.updateItemQty(idx, -1);
                    const plusBtn = el.querySelector('.plus');
                    if (plusBtn) plusBtn.onclick = () => this.updateItemQty(idx, 1);
                    list.appendChild(el);
                });
                this.syncCartCheckoutMode();
                this.updateCartTotals();
                // Автозаполнение Email, ФИО и Телефона из базы или памяти браузера (Задача 5)
                const emailInput = document.getElementById('order-email');
                if (emailInput && !emailInput.value) {
                    emailInput.value = (this.currentUser && this.currentUser.email) ? this.currentUser.email : (localStorage.getItem('locus_saved_email') || '');
                }
                const nameInput = document.getElementById('order-name');
                if (nameInput && !nameInput.value) {
                    nameInput.value = localStorage.getItem('locus_saved_name') || '';
                }
                const phoneInput = document.getElementById('order-phone');
                if (phoneInput && !phoneInput.value) {
                    phoneInput.value = localStorage.getItem('locus_saved_phone') || '';
                }
            },

            updateItemQty: function(idx, delta) {
                if (!this.localCart[idx]) return;
                if (this.isArticleCartItem(this.localCart[idx]) && delta > 0) return;
                this.localCart[idx].qty += delta;
                if(this.localCart[idx].qty <= 0) this.localCart.splice(idx, 1);
                this.saveCart(true);
                this.updateCartBadge();
                this.renderCart();
                this.cdekInitialized = false;
                this.initCDEK();
            },

            updateCartTotals: function() {
                const digitalOnly = this.hasOnlyDigitalCartItems();
                this.syncCartCheckoutMode();
                let subtotal = 0;
                this.localCart.forEach(i => subtotal += (i.price * i.qty));
                const breakdown = this.getRetailDiscountBreakdown(subtotal);
                const discountPercent = breakdown.loyaltyPercent;
                const loyaltyDiscountVal = breakdown.loyaltyDiscountVal;
                const welcomeBonusPercent = breakdown.welcomeBonusPercent;
                const welcomeDiscountVal = breakdown.welcomeDiscountVal;
                const fortuneDiscountVal = breakdown.fortuneDiscountVal;
                let totalAfterLoyalty = breakdown.totalAfterStoreDiscounts + fortuneDiscountVal;
                // --- СКИДКА УДАЧИ ---
                totalAfterLoyalty -= fortuneDiscountVal; // Вычитаем удачу из Итого

                // --- СКИДКА НА НОВИНКУ ---
                let newLotDiscountVal = 0;
                const isNewLotDiscountUsed = this.currentUser && this.currentUser.history && this.currentUser.history.some(h => 
                    h && h.isSystemMeta && h.systemType === 'NEW_LOT_DISCOUNT_USED' && h.sampleName === this.newLotDiscount?.sampleName
                );
                
                if (this.newLotDiscount && !isNewLotDiscountUsed) {
                    const newLotItem = this.localCart.find(i => i.item.includes(this.newLotDiscount.sampleName));
                    if (newLotItem) {
                        // Скидка 10% на первую пачку лота
                        newLotDiscountVal = Math.floor(newLotItem.price * 0.1);
                    }
                }
                this.currentNewLotDiscountVal = newLotDiscountVal; // Для сохранения в placeOrder

                let rowNewLot = document.getElementById('row-new-lot-discount');
                if (!rowNewLot) {
                    const promoRow = document.getElementById('row-promo-discount');
                    if (promoRow && promoRow.parentNode) {
                        rowNewLot = document.createElement('div');
                        rowNewLot.className = 'summary-row';
                        rowNewLot.id = 'row-new-lot-discount';
                        rowNewLot.style.color = '#187a30';
                        rowNewLot.style.display = 'none';
                        rowNewLot.innerHTML = `<span>Новинка каталога (10%)</span><span id="cart-new-lot-val">-0 ₽</span>`;
                        promoRow.parentNode.insertBefore(rowNewLot, promoRow.nextSibling);
                    }
                }
                
                if (rowNewLot) {
                    if (newLotDiscountVal > 0) {
                        rowNewLot.style.display = 'flex';
                        document.getElementById('cart-new-lot-val').textContent = `-${newLotDiscountVal} ₽`;
                    } else {
                        rowNewLot.style.display = 'none';
                    }
                }
                
                // Динамически добавляем строчку в интерфейс корзины
                let rowWelcome = document.getElementById('row-welcome-discount');
                if (!rowWelcome) {
                    const loyaltyRow = document.getElementById('row-discount');
                    if (loyaltyRow && loyaltyRow.parentNode) {
                        rowWelcome = document.createElement('div');
                        rowWelcome.className = 'summary-row';
                        rowWelcome.id = 'row-welcome-discount';
                        rowWelcome.style.color = '#187a30';
                        rowWelcome.style.display = 'none';
                        rowWelcome.innerHTML = `<span>Приветственный бонус</span><span id="cart-welcome-val">-0 ₽</span>`;
                        loyaltyRow.parentNode.insertBefore(rowWelcome, loyaltyRow.nextSibling);
                    }
                }

                let rowFortune = document.getElementById('row-fortune-discount');
                if (!rowFortune) {
                    const promoRow = document.getElementById('row-promo-discount');
                    if (promoRow && promoRow.parentNode) {
                        rowFortune = document.createElement('div');
                        rowFortune.className = 'summary-row';
                        rowFortune.id = 'row-fortune-discount';
                        rowFortune.style.color = '#DAA520';
                        rowFortune.style.display = 'none';
                        rowFortune.innerHTML = `<span>Скидка удачи</span><span id="cart-fortune-val">-0 ₽</span>`;
                        promoRow.parentNode.insertBefore(rowFortune, promoRow.nextSibling);
                    }
                }
                if (rowWelcome) {
                    if (welcomeDiscountVal > 0) {
                        rowWelcome.style.display = 'flex';
                        document.getElementById('cart-welcome-val').textContent = `-${welcomeDiscountVal} ₽ (${welcomeBonusPercent}%)`;
                    } else {
                        rowWelcome.style.display = 'none';
                    }
                }
                if (rowFortune) {
                    if (fortuneDiscountVal > 0) {
                        rowFortune.style.display = 'flex';
                        document.getElementById('cart-fortune-val').textContent = `-${fortuneDiscountVal} ₽`;
                    } else {
                        rowFortune.style.display = 'none';
                    }
                }

                if (digitalOnly) {
                    this.cdekPrice = 0;
                } else if (totalAfterLoyalty >= 3000) {
                    this.cdekPrice = 0;
                }

                let promoDiscountVal = 0;
                if (this.activePromo) {
                    if (this.activePromo.type === 'percent') {
                        promoDiscountVal = Math.floor(totalAfterLoyalty * (this.activePromo.val / 100));
                    } else {
                        promoDiscountVal = this.activePromo.val;
                    }
                }

                let finalTotal = totalAfterLoyalty - promoDiscountVal - newLotDiscountVal + (digitalOnly ? 0 : (this.cdekPrice || 0));
                if (finalTotal < 0) finalTotal = 1;

                const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
                setTxt('cart-subtotal', subtotal + ' ₽');
                setTxt('cart-discount-percent', discountPercent);
                setTxt('cart-discount-val', loyaltyDiscountVal + ' ₽');
                
                const shipValEl = document.getElementById('cart-shipping-val');
                if(shipValEl) {
                    if (digitalOnly) {
                        shipValEl.textContent = 'Не требуется';
                    } else if (this.cdekPrice === 0 && totalAfterLoyalty >= 3000) {
                        shipValEl.innerHTML = `<span style="color:#187a30; font-weight:bold;">Бесплатно</span>`;
                    } else if (this.cdekPrice > 0) {
                        shipValEl.textContent = this.cdekPrice + ' ₽';
                    } else {
                        shipValEl.textContent = 'Не выбрано';
                    }
                }

                setTxt('cart-total', finalTotal + ' ₽');

                const promoRow = document.getElementById('row-promo-discount');
                const promoValEl = document.getElementById('cart-promo-val');
                if (this.activePromo) {
                    promoRow.style.display = 'flex';
                    promoValEl.textContent = `-${promoDiscountVal} ₽ (${this.activePromo.code})`;
                } else {
                    promoRow.style.display = 'none';
                }
            },

            // --- НАЧАЛО: ОПЛАТА И ОФОРМЛЕНИЕ ЗАКАЗА ---
            placeOrder: async function() {
                if(this.localCart.length === 0) return alert('Корзина пуста');
                if(!this.uid) return alert('Для оформления заказа нужно войти');
                
                const name = document.getElementById('order-name').value.trim();
                const phone = document.getElementById('order-phone').value.trim();
                const emailInput = document.getElementById('order-email');
                const email = emailInput ? emailInput.value.trim() : this.currentUser.email;
                const policy = document.getElementById('policy-check').checked;
                const digitalOnly = this.hasOnlyDigitalCartItems();
                
                // СОХРАНЯЕМ ДАННЫЕ В БРАУЗЕРЕ (Задача 5)
                localStorage.setItem('locus_saved_name', name);
                localStorage.setItem('locus_saved_phone', phone);
                localStorage.setItem('locus_saved_email', email);

                // ЖЕСТКАЯ ВАЛИДАЦИЯ
                if(!name || !email || (!digitalOnly && !phone)) return alert(digitalOnly ? 'Заполните ФИО и e-mail' : 'Заполните ФИО, телефон и e-mail');
                
                const nameRegex = /^[\p{L}\s-]{2,100}$/u;
                if(!nameRegex.test(name)) {
                    return alert('Пожалуйста, введите корректное ФИО (без цифр и странных символов).');
                }

                const phoneDigits = phone.replace(/\D/g, '');
                if((!digitalOnly || phone) && (phoneDigits.length < 10 || phoneDigits.length > 15 || /(.)\1{5,}/.test(phoneDigits))) {
                    return alert('Пожалуйста, введите корректный номер телефона.');
                }

                const isPickup = document.getElementById('self-pickup-checkbox')?.checked;
                
                // Проверяем: если не выбран самовывоз, значит должен быть СДЭК
                if (!digitalOnly && !isPickup && !this.cdekInfo) {
                    return alert('Пожалуйста, выберите пункт выдачи СДЭК или Самовывоз.');
                }
                
                // Оставляем проверку ручного ввода СДЭК (на случай если он используется)
                if(!digitalOnly && !isPickup && this.cdekInfo && this.cdekInfo.type === 'MANUAL') {
                    const addr = this.cdekInfo.address;
                    if(addr.length < 10 || !/[\\p{L}\\p{N}]/u.test(addr) || /(.)\\1{4,}/.test(addr)) {
                        return alert('Пожалуйста, введите корректный и полный адрес доставки.');
                    }
                }

                if(!policy) return alert('Необходимо согласие с Политикой конфиденциальности');

                const pendingPaymentOrderId = localStorage.getItem('locus_pending_payment_order_id');
                if (pendingPaymentOrderId) {
                    const pendingState = await this.getPendingOrderStatus(pendingPaymentOrderId);
                    if (!pendingState) {
                        return alert('Не удалось проверить статус предыдущей оплаты. Чтобы избежать двойной оплаты, подождите несколько секунд и попробуйте снова.');
                    }
                    if (pendingState.found && pendingState.order) {
                        if (pendingState.order.status === 'pending_payment') {
                            const retryPayment = confirm('Предыдущая попытка оплаты еще числится как не завершенная. Если вы отказались от оплаты или закрыли страницу Robokassa, нажмите ОК, чтобы начать новую попытку оплаты.');
                            if (!retryPayment) {
                                return alert('Предыдущая попытка оплаты пока остается в ожидании. Когда будете готовы, нажмите оплату снова и подтвердите новую попытку.');
                            }
                            localStorage.removeItem('locus_pending_payment_order_id');
                            this.stopPendingOrderWatcher();
                        } else {
                            localStorage.removeItem('locus_pending_payment_order_id');
                            await this.fetchUserData();
                            return alert('Предыдущий заказ уже подтвержден. Новый платеж создавать не нужно.');
                        }
                    }
                    if (pendingState.found === false) {
                        localStorage.removeItem('locus_pending_payment_order_id');
                        this.stopPendingOrderWatcher();
                    }
                }

                const btn = document.getElementById('btn-checkout');
                if(btn) { btn.disabled = true; btn.textContent = 'Обработка...'; }

                let subtotal = 0;
                this.localCart.forEach(i => subtotal += (i.price * i.qty));
                const breakdown = this.getRetailDiscountBreakdown(subtotal);
                const discountPercent = breakdown.loyaltyPercent;
                const welcomeBonusPercent = breakdown.welcomeBonusPercent;
                let total = breakdown.totalAfterStoreDiscounts;

                let shippingCost = digitalOnly ? 0 : this.cdekPrice;
                if (!digitalOnly && total >= 3000) shippingCost = 0;

                if(this.activePromo) {
                    let promoD = 0;
                    if(this.activePromo.type === 'percent') promoD = Math.floor(total * (this.activePromo.val / 100));
                    else promoD = this.activePromo.val;
                    total -= promoD;
                }

                total += shippingCost;
                if(total < 1) total = 1;

                try {
                    const invId = Math.floor(Date.now() / 1000);
                    const orderId = invId.toString();

                    // Формируем новый ОБЪЕКТ ЗАКАЗА для истории
                    const historyOrder = {
                        isOrder: true,
                        orderId: orderId,
                        status: 'pending_payment',
                        date: new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }),
                        total: total,
                        items: JSON.parse(JSON.stringify(this.localCart)) // Копируем товары из корзины
                    };

                    let promoDiscountVal = 0;
                    if (this.activePromo) {
                        if (this.activePromo.type === 'percent') {
                            promoDiscountVal = Math.floor(breakdown.totalAfterStoreDiscounts * (this.activePromo.val / 100));
                        } else {
                            promoDiscountVal = this.activePromo.val;
                        }
                    }

                    const newLotDiscountVal = this.currentNewLotDiscountVal || 0;
        const pricingBreakdown = {
            subtotal: subtotal,
            loyaltyPercent: discountPercent,
            loyaltyDiscountVal: loyaltyDiscountVal,
            welcomeBonusPercent: welcomeBonusPercent,
            welcomeDiscountVal: welcomeDiscountVal,
            fortuneDiscountVal: fortuneDiscountVal,
            promoCode: this.activePromo ? this.activePromo.code : '',
            promoType: this.activePromo ? this.activePromo.type : '',
            promoValue: this.activePromo ? this.activePromo.val : 0,
            promoDiscountVal: promoDiscountVal,
            newLotDiscountVal: newLotDiscountVal,
            newLotSampleName: newLotDiscountVal > 0 && this.newLotDiscount ? this.newLotDiscount.sampleName : '',
            totalDiscountVal: loyaltyDiscountVal + welcomeDiscountVal + fortuneDiscountVal + promoDiscountVal + newLotDiscountVal,
            shippingCost: shippingCost,
            finalTotal: total
        };

                    historyOrder.pricingBreakdown = pricingBreakdown;

                    const orderData = {
                        id: orderId,
                        invId: invId,
                        total: total,
                        discountPercent: discountPercent,
                        promo: this.activePromo ? this.activePromo.code : '',
                        status: 'pending_payment',
                        customer: { name, phone, email: email, pricingBreakdown },
                        delivery: digitalOnly
                            ? { type: 'DIGITAL', address: '', finalCost: 0 }
                            : (isPickup
                                ? { type: 'PICKUP', address: 'ТЦ Атолл, Октябрьская 27', code: this.pickupLockerCodeEnabled ? this.currentPickupCode : '', finalCost: 0 }
                                : { ...this.cdekInfo, finalCost: shippingCost }),
                        items: JSON.parse(JSON.stringify(this.localCart)),
                        historyItems: [historyOrder] // Отправляем как заказ
                    };

                    const token = localStorage.getItem('locus_token');
                    if(!token) throw new Error('Пожалуйста, авторизуйтесь заново');

                    const res = await fetch(LOCUS_API_URL + '?action=placeOrder', {
                        method: 'POST',
                        headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'placeOrder', order: orderData })
                    });
                    const data = await res.json();
                    if (data.error || data.errorMessage) throw new Error(data.error || data.errorMessage);
                    
                    // Переход по безопасной ссылке, сгенерированной на сервере
                    if (data.paymentUrl) {
                        localStorage.setItem('locus_pending_payment_order_id', orderId);
                        window.location.href = data.paymentUrl;
                    } else {
                        alert('Ошибка генерации ссылки на оплату');
                        if(btn) { btn.disabled = false; btn.textContent = 'Оформить и оплатить'; }
                    }
                } catch (e) {
                    console.error(e);
                    alert('Ошибка создания заказа: ' + e.message);
                    if(btn) { btn.disabled = false; btn.textContent = 'Оформить и оплатить'; }
                }
            },
            // --- КОНЕЦ: ОПЛАТА И ОФОРМЛЕНИЕ ЗАКАЗА ---

            // --- НАЧАЛО: АВТОРИЗАЦИЯ ЧЕРЕЗ YDB ---
                register: async function() {
                    const emailInput = document.getElementById('reg-email');
                    const passInput = document.getElementById('reg-pass');
                    const rawEmail = emailInput ? emailInput.value : '';
                    const pass = passInput ? passInput.value : '';

                    let credentials;
                    try {
                        credentials = this.validateRegistrationCredentials(rawEmail, pass);
                    } catch (validationError) {
                        return alert(validationError.message);
                    }

                    if (emailInput) emailInput.value = credentials.email;
                    try {
                        const res = await fetch(LOCUS_API_URL + '?action=register', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'register', email: credentials.email, password: credentials.password })
                        });
                        const data = await res.json();
                        
                        if (!res.ok || data.error || data.errorMessage) {
                            throw new Error(data.error || data.errorMessage || 'Ошибка сервера: ' + res.status);
                        }
                        
                        localStorage.setItem('locus_token', data.token);
                        await this.storeCredentialWithPasswordManager(credentials.email, credentials.password);
                        this.uid = data.user.id;
                        localStorage.setItem(this.getWelcomeBonusStorageKey(this.uid), '1');
                        
                        await this.fetchUserData(); 
                        
                        this.updateUIState();
                        this.switchView('dashboard');
                        this.renderDashboard(); // ПРИНУДИТЕЛЬНАЯ ОТРИСОВКА ЛК
                        
                        if (!this.hasPendingWelcomePopup()) {
                            alert('Регистрация прошла успешно!');
                        }
                    } catch (e) { alert('Ошибка: ' + e.message); }
                },

                login: async function() {
                    const emailInput = document.getElementById('login-email');
                    const email = this.normalizeEmailAddress(emailInput?.value);
                    const pass = document.getElementById('login-pass')?.value;
                    if(!email || !pass) return alert('Заполните поля');
                    if(!this.isValidEmailAddress(email)) return alert('Укажите корректный email.');
                    if(emailInput) emailInput.value = email;
                    try {
                        const res = await fetch(LOCUS_API_URL + '?action=login', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'login', email, password: pass })
                        });
                        const data = await res.json();
                        
                        if (!res.ok || data.error || data.errorMessage) {
                            throw new Error(data.error || data.errorMessage || 'Ошибка сервера: ' + res.status);
                        }
                        
                        localStorage.setItem('locus_token', data.token);
                        this.uid = data.user.id;
                        
                        await this.fetchUserData(); 
                        
                        this.updateUIState();
                        this.switchView('dashboard');
                        this.renderDashboard(); // ПРИНУДИТЕЛЬНАЯ ОТРИСОВКА ЛК
                        
                        // Мгновенное появление кнопки админки без перезагрузки
                        if(email === 'info@locus.coffee') {
                            const btnAdmin = document.getElementById('btn-open-admin');
                            if(btnAdmin) { 
                                btnAdmin.style.display = 'flex';
                                btnAdmin.onclick = () => this.toggleModal(true, 'admin');
                            }
                        }
                    } catch (e) { alert('Ошибка: ' + e.message); }
                },

                requestPasswordReset: async function() {
                    const emailInput = document.getElementById('forgot-email');
                    const email = this.normalizeEmailAddress(emailInput?.value);
                    if (!email) return alert('Укажите email.');
                    if (!this.isValidEmailAddress(email)) return alert('Укажите корректный email.');
                    if (emailInput) emailInput.value = email;

                    try {
                        const res = await fetch(LOCUS_API_URL + '?action=requestPasswordReset', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'requestPasswordReset', email })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось отправить ссылку для сброса пароля');

                        const loginEmailInput = document.getElementById('login-email');
                        if (loginEmailInput && !loginEmailInput.value) loginEmailInput.value = email;
                        alert(data.message || 'Если аккаунт существует, ссылка для восстановления уже отправлена на почту.');
                        this.switchView('login');
                    } catch (e) {
                        alert('Ошибка: ' + e.message);
                    }
                },

                submitPasswordReset: async function() {
                    const token = this.getResetPasswordTokenFromUrl();
                    if (!token) return alert('Ссылка для восстановления не найдена или уже недействительна.');

                    const passInput = document.getElementById('reset-pass');
                    const confirmInput = document.getElementById('reset-pass-confirm');
                    const password = passInput ? passInput.value : '';
                    const confirmPassword = confirmInput ? confirmInput.value : '';
                    const passwordError = this.getRegistrationPasswordError(password);
                    if (passwordError) return alert(passwordError);
                    if (password !== confirmPassword) return alert('Пароли не совпадают.');

                    try {
                        const res = await fetch(LOCUS_API_URL + '?action=resetPassword', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'resetPassword', token, password })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось сохранить новый пароль');

                        await this.storeCredentialWithPasswordManager(data.email || '', password);
                        this.cleanupAuthUrlParams();
                        if (passInput) passInput.value = '';
                        if (confirmInput) confirmInput.value = '';
                        const loginEmailInput = document.getElementById('login-email');
                        if (loginEmailInput && data.email) loginEmailInput.value = data.email;
                        alert('Новый пароль сохранен. Теперь можно войти в аккаунт.');
                        this.switchView('login');
                    } catch (e) {
                        alert('Ошибка: ' + e.message);
                    }
                },

                logout: async function() {
                    localStorage.removeItem('locus_token');
                    this.stopPendingOrderWatcher();
                    this.stopRetailCountdownTicker();
                    this.userDataLoaded = false;
                    this.currentUser = null; this.uid = null; this.localCart = []; 
                    this.saveCart(false); this.updateCartBadge(); this.updateUIState(); this.switchView('login');
                },
                // --- КОНЕЦ: АВТОРИЗАЦИЯ ЧЕРЕЗ YDB ---

            updateUIState: function() {
                const txt = document.getElementById('auth-status-text'); if(txt) txt.textContent = this.uid ? 'Кабинет' : 'Войти';
                if(this.localCart.length > 0) this.updateCartTotals();
            },
            
            addToSubscription: async function(itemName, weight = 250, grind = "Зерно") {
                if(!this.uid) return alert("Для оформления подписки необходимо войти в Личный кабинет.");
                if(!this.currentUser.subscription) this.currentUser.subscription = [];
                
                const product = ALL_PRODUCTS_CACHE.find(p => (p.sample || p.sample_no || "").trim() === itemName.trim());
                if(!product) return alert("Ошибка товара: лот не найден в каталоге.");

                // Исправлено: берем информацию о типе товара в одном общем месте
                const typeInfo = ProductManager.getTypeInfo(product);
                
                // Убираем/заменяем помол для особых категорий
                if (typeInfo.isSpecial) {
                    grind = "";
                } else if (typeInfo.isAroma) {
                    grind = "Зерно (Ароматизация)";
                }

                if(this.currentUser.subscription.find(s => s.item === itemName && s.weight === weight && s.grind === grind)) return alert('Этот сорт уже в подписке');

                // Подтягиваем расчет из базы или фиксированную цену
                const rawGreen = parseFloat(product.rawGreenPrice || product.raw_green_price) || 0;
                let weightPrice = 0;
                
                if (rawGreen > 0) {
                    const prices = this.calculateRetailPrices(rawGreen);
                    weightPrice = weight === 1000 ? prices.p1000 : prices.p250;
                } else if (product.price && parseFloat(product.price) > 0) {
                    const fixedPrice = parseFloat(product.price) || 0;
                    weightPrice = weight === 1000 ? fixedPrice * 4 : fixedPrice;
                }
                
                if (weightPrice === 0) return alert("Цена для этого лота еще не рассчитана (нет данных Extrinsic и не задана фиксированная цена в каталоге).");
                
                const subPrice = weightPrice > 50 ? weightPrice - 50 : weightPrice;

                const subItem = { item: itemName, price: subPrice, weight: weight, grind: grind, dateAdded: new Date().toLocaleDateString(), active: true };
                this.currentUser.subscription.push(subItem);
                
                alert(`Сорт "${itemName}"${this.formatProductSelectionMeta(product, weight, grind)} добавлен в вашу подписку.`);
                this.renderDashboard();
                
                const token = localStorage.getItem('locus_token');
                if(token) {
                    try {
                        await fetch(LOCUS_API_URL + '?action=updateUser', {
                            method: 'POST',
                            headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'updateUser', field: 'subscription', data: this.currentUser.subscription })
                        });
                    } catch(e) { console.error('Ошибка добавления подписки', e); }
                }
            },
            
            toggleSubStatus: async function(itemIndex) {
                if(!this.uid || !this.currentUser.subscription[itemIndex]) return;
                const newStatus = !this.currentUser.subscription[itemIndex].active;
                this.currentUser.subscription[itemIndex].active = newStatus;
                this.renderDashboard();

                const token = localStorage.getItem('locus_token');
                if(token) {
                    try {
                        await fetch(LOCUS_API_URL + '?action=updateUser', {
                            method: 'POST',
                            headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'updateUser', field: 'subscription', data: this.currentUser.subscription })
                        });
                    } catch(e) { 
                        this.currentUser.subscription[itemIndex].active = !newStatus; 
                        this.renderDashboard(); 
                    }
                }
            },
            
            removeFromSubscription: async function(subItemFull) {
                if(!this.uid) return;
                const prev = [...this.currentUser.subscription];
                this.currentUser.subscription = this.currentUser.subscription.filter(s => !(s.item === subItemFull.item && s.weight === subItemFull.weight && s.grind === subItemFull.grind));
                this.renderDashboard(); 
                
                const token = localStorage.getItem('locus_token');
                if(token) {
                    try {
                        await fetch(LOCUS_API_URL + '?action=updateUser', {
                            method: 'POST',
                            headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'updateUser', field: 'subscription', data: this.currentUser.subscription })
                        });
                    } catch(e) { 
                        this.currentUser.subscription = prev; 
                        this.renderDashboard(); 
                    }
                }
            },

            removeFromHistory: async function(histItemFull) {
                if(!this.uid) return;
                const prev = [...this.currentUser.history];
                this.currentUser.history = this.currentUser.history.filter(h => !(h.item === histItemFull.item && h.date === histItemFull.date));
                this.renderDashboard();

                const token = localStorage.getItem('locus_token');
                if(token) {
                    try {
                        await fetch(LOCUS_API_URL + '?action=updateUser', {
                            method: 'POST',
                            headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'updateUser', field: 'history', data: this.currentUser.history })
                        });
                    } catch(e) { 
                        this.currentUser.history = prev; 
                        this.renderDashboard(); 
                    }
                }
            },
            removeOrderFromHistory: async function(orderId) {
                if(!this.uid) return;
                const prev = [...this.currentUser.history];
                this.currentUser.history = this.currentUser.history.filter(h => h.orderId !== orderId);
                this.renderDashboard();
                
                const token = localStorage.getItem('locus_token');
                if(token) {
                    try {
                        await fetch(LOCUS_API_URL + '?action=updateUser', {
                            method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'updateUser', field: 'history', data: this.currentUser.history })
                        });
                    } catch(e) { 
                        this.currentUser.history = prev; 
                        this.renderDashboard(); 
                    }
                }
            },
            // --- НАЧАЛО: ЗАМЕНА ОТОБРАЖЕНИЯ ЛК (ИСТОРИЯ) ---
            renderDashboard: function() {
                try {
                    if(!this.currentUser) return;
                const u = this.currentUser;

                const notifyEntry = u.history.find(h => h && h.isSystemMeta && h.systemType === 'NOTIFY_NEW_LOTS');
                const notifyCheck = document.getElementById('notify-new-lots-check');
                if(notifyCheck) notifyCheck.checked = notifyEntry ? notifyEntry.enabled : false;

                const safeSpent = isNaN(u.totalSpent) ? 0 : u.totalSpent;
                    let discountPercent = Math.floor(safeSpent / 3000);
                    if(discountPercent > 15) discountPercent = 15;
                    
                    const elDiscount = document.getElementById('user-discount-val'); if (elDiscount) elDiscount.textContent = discountPercent + '%';
                    let progress = discountPercent < 15 ? ((safeSpent % 3000) / 3000) * 100 : 100;
                    const elProgress = document.getElementById('user-progress-fill');
                    if (elProgress) elProgress.style.width = progress + '%';

                    const elNext = document.getElementById('user-next-level');
                    if (elNext) {
                        if(discountPercent < 15) { const remainder = 3000 - (safeSpent % 3000);
                            elNext.innerHTML = `\u041f\u043e\u0442\u0440\u0430\u0447\u0435\u043d\u043e: <b>${safeSpent} \u20bd</b>.<br>\u0414\u043e \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0433\u043e % \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c: <b>${remainder} \u20bd</b><br><span style="font-size: 10px; opacity: 0.7; margin-top: 4px; display: inline-block;">\u041c\u0430\u043a\u0441\u0438\u043c\u0430\u043b\u044c\u043d\u0430\u044f \u0441\u043a\u0438\u0434\u043a\u0430 - 15%.</span>`;
                        } 
                        else { elNext.textContent = '\u0412\u044b \u0434\u043e\u0441\u0442\u0438\u0433\u043b\u0438 \u043c\u0430\u043a\u0441\u0438\u043c\u0430\u043b\u044c\u043d\u043e\u0439 \u0441\u043a\u0438\u0434\u043a\u0438 (15%)!';
                        }
                    }

                    if (elNext && this.hasWelcomeFirstOrderBonus()) {
                        elNext.innerHTML += `<br><span style="font-size:10px; color:#187a30; margin-top:6px; display:inline-block;">\u041f\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0431\u043e\u043d\u0443\u0441: 10% \u043d\u0430 \u043f\u0435\u0440\u0432\u0443\u044e \u043f\u043e\u043a\u0443\u043f\u043a\u0443.</span>`;
                    }

                    const isAdmin = (u.email === 'info@locus.coffee');
                    const feedbackArea = document.querySelector('.feedback-area');
                    const msgSection = document.getElementById('user-messages-section');
                    
                    if (isAdmin) {
                        if(feedbackArea) feedbackArea.style.display = 'none';
                        if(msgSection) msgSection.style.display = 'none';
                    } else {
                        if(feedbackArea) feedbackArea.style.display = 'block';
                        if(msgSection) msgSection.style.display = 'block';
                    }

                    const renderList = (containerId, items, isSub) => {
                        const cont = document.getElementById(containerId); if(!cont) return;
                        cont.innerHTML = '';
                        if(!items || items.length === 0) { cont.innerHTML = '<div style="opacity:0.5; font-size:11px">\u0421\u043f\u0438\u0441\u043e\u043a \u043f\u0443\u0441\u0442</div>'; return; }

                        let itemsToShow = [...items].reverse();
                        if (!isSub) {
                            itemsToShow = itemsToShow.slice(0, 5);
                        }

                        itemsToShow.forEach((item, originalIndex) => {
                            if (!item || !item.item) return;
                            const realIndex = u.subscription.findIndex(s => s === item);

                            let productInStock;
                            const itemString = String(item.item).toLowerCase();

                            // Умный поиск: ищем частичное совпадение имени в кэше
                            productInStock = ALL_PRODUCTS_CACHE.find(p => {
                                const cacheName = String(p.sample).toLowerCase();
                                return itemString.includes(cacheName) || cacheName.includes(itemString.split(' (')[0]);
                            });

                            const el = document.createElement('div');
                            el.className = 'product-list-item';
                            
                            // ИСПРАВЛЕНИЕ: Переименовали в productMeta, чтобы не было конфликта
                            const productMeta = ProductManager.getDisplayMeta(item.item, item.weight, item.grind);
                            const wDisplay = productMeta.weight ? ` ${productMeta.weight} г` : '';
                            const gDisplay = productMeta.grind ? ` <span style="font-size:10px; opacity:0.7; border:1px solid #ccc; padding:0 3px; border-radius:3px;">${productMeta.grind}</span>` : '';

                            let meta = isSub ? `В подписке • ${item.price} ₽` : `${item.date} • ${item.price} ₽`;
                            if(!productInStock && isSub) meta += ` <span style="color:#B66A58">(Нет в наличии)</span>`;

                            let checkBoxHTML = '';
                            if (isSub) {
                                const checked = item.active !== false ? 'checked' : '';
                                checkBoxHTML = `<input type="checkbox" class="sub-active-check" ${checked} style="margin-right:10px; accent-color:var(--locus-dark); transform:scale(1.2);">`;
                            }
                            
                            el.innerHTML = `
                                <div style="display:flex; align-items:center;">
                                    ${checkBoxHTML}
                                    <div class="pli-info"><div class="pli-name">${item.item}${wDisplay}${gDisplay} ${!isSub ? `x${item.qty}` : ''}</div><div class="pli-meta">${meta}</div></div>
                                </div>
                                <div style="display:flex; gap:5px; align-items:center;">
                                    ${!isSub && productInStock ? `<button class="btn-small-reorder btn-action-reorder">Повторить</button>` : ''}
                                    <button class="btn-small-reorder btn-remove-sub" style="font-size:16px; padding:4px 8px; line-height:1;">&times;</button>
                                </div>
                            `;

                            if (isSub) {
                                const chk = el.querySelector('.sub-active-check');
                                chk.onchange = () => this.toggleSubStatus(realIndex);
                            }

                            if(!isSub && productInStock) {
                                const btnAction = el.querySelector('.btn-action-reorder');
                                if(btnAction) btnAction.onclick = (e) => {
                                    e.preventDefault(); e.stopImmediatePropagation();
                                    this.addToCart(productInStock.sample, item.weight || 250);
                                    this.toggleModal(true, 'cart');
                                };
                            }
                            const btnRemove = el.querySelector('.btn-remove-sub');
                            if(btnRemove) btnRemove.onclick = (e) => {
                                e.preventDefault(); e.stopImmediatePropagation();
                                if(confirm('Удалить?')) isSub ? this.removeFromSubscription(item) : this.removeFromHistory(item);
                            };
                            cont.appendChild(el);
                        });
                    };
                    renderList('user-subscription-list', u.subscription, true);
                   // --- НОВАЯ ОТРИСОВКА ИСТОРИИ И ОПТА ---
                    const histCont = document.getElementById('user-history-list');
                    const wsHistCont = document.getElementById('user-ws-history-list');

                    const renderOrdersList = (container, itemsFilterFn, isWholesale) => {
                        if(!container) return;
                        container.innerHTML = '';
                        const filteredItems = this.getVisibleHistoryItems(u.history || []).filter(itemsFilterFn);
                        
                        if(filteredItems.length === 0) {
                            container.innerHTML = '<div style="opacity:0.5; font-size:11px">Список пуст</div>';
                            return;
                        }
                        
                        const itemsToShow = [...filteredItems].reverse().slice(0, 15);
                        itemsToShow.forEach(hItem => {
                            if (hItem.isOrder || hItem.isWholesaleOrder) {
                                const el = document.createElement('div');
                                el.style.cssText = 'border: 1px solid var(--locus-border); border-radius: 8px; padding: 15px; margin-bottom: 15px; background: #fff; box-shadow: 0 4px 10px rgba(105,58,5,0.03);';

                                let itemsHtml = hItem.items.map(i => {
                                    // Исправлено: берем мета-данные через общий helper
                                    const meta = ProductManager.getDisplayMeta(i.item, i.weight, i.grind);
                                    const weightText = meta.weight ? ` (${meta.weight}г)` : '';
                                    const grindText = meta.grind ? ` <span style="font-size:9px; opacity:0.7; border:1px solid #ccc; padding:0 3px; border-radius:3px;">${meta.grind}</span>` : '';
                                    return `<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:8px; border-bottom:1px dashed #eee; padding-bottom:8px;">
                                        <span><b style="font-weight:600;">${i.item}</b>${weightText}${grindText} x${i.qty}</span>
                                        <span style="white-space:nowrap; font-weight:600;">${i.price * i.qty} ₽</span>
                                    </div>`;
                                }).join('');

                                // --- НАШ НОВЫЙ БЛОК СО СТАТУСАМИ ---
                                const statusMap = {
                                    'pvz_delivered': '<span style="color:#187a30;">Доставлено в пункт выдачи</span>',
                                    'pending_payment': '<span style="color:#B66A58;">Не оплачен</span>',
                                    'paid': '<span style="color:#187a30;">Оплачен</span>',
                                    'processing': '<span style="color:#8B7E66;">В сборке</span>',
                                    'shipped': '<span style="color:#187a30;">Отправлен</span>',
                                    'completed': '<span style="color:gray;">Выполнен</span>'
                                };
                                const displayStatus = hItem.status ? (statusMap[hItem.status] || hItem.status) : '<span style="color:#B66A58;">Не оплачен</span>';
                                // -----------------------------------
                                
                                const countdownInfo = !isWholesale ? this.getPvzCountdownInfo(hItem) : null;
                                const countdownHtml = countdownInfo ? `
                                    <div class="retail-order-countdown ${countdownInfo.delivered ? 'is-delivered' : 'is-active'}" data-retail-order-countdown="1" data-order-id="${hItem.orderId}" data-deadline-ms="${countdownInfo.deadlineMs || 0}" data-deadline-text="${countdownInfo.deadlineText ? `Выдача до ${countdownInfo.deadlineText}` : ''}" data-auto-status="${countdownInfo.delivered ? '0' : '1'}" style="margin-top:6px;">
                                        ${countdownInfo.delivered ? 'Доставлено в пункт выдачи' : `До выдачи: ${countdownInfo.label}`}
                                    </div>
                                ` : '';

                                let pickupHtml = '';
                                if (hItem.delivery && hItem.delivery.type === 'PICKUP') {
                                    pickupHtml = `
                                        <div style="margin-top:10px; margin-bottom:15px; padding:12px; background:#f4f9f5; border-radius:8px; border:1px dashed #187a30; display:flex; justify-content:space-between; align-items:center;">
                                            <div>
                                                <div style="font-size:11px; color:#187a30; font-weight:700; text-transform:uppercase;">Самовывоз (ТЦ Атолл)</div>
                                                <div style="font-size:11px; color:gray; margin-top:3px;">${hItem.delivery.code ? 'Код ячейки:' : ''}</div>
                                            </div>
                                            <div style="font-size:22px; font-weight:bold; letter-spacing:2px; color:var(--locus-dark);">${hItem.delivery.code || ''}</div>
                                        </div>
                                    `;
                                }

                                el.innerHTML = `
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 15px; border-bottom: 1px solid var(--locus-border); padding-bottom: 12px;">
                                        <div>
                                            <div style="font-weight:700; font-size:13px; color:var(--locus-dark); text-transform:uppercase;">Заказ № ${String(hItem.orderId).replace('ws_', '')}</div>
                                            <div style="font-size:10px; color:gray; margin-top:3px;">${hItem.date} • ${displayStatus}</div>
                                        </div>
                                        <div style="font-weight:700; font-size:16px;">${hItem.total} ₽</div>
                                    </div>
                                    <div style="margin-bottom:15px;">
                                        ${itemsHtml}
                                    </div>
                                    ${countdownHtml}
                                    ${pickupHtml}
                                    <div class="dashboard-order-actions" style="display:flex; gap:10px; justify-content:flex-end;">
                                        <button class="btn-small-reorder btn-repeat-order">Повторить заказ</button>
                                        <button class="btn-small-reorder btn-remove-sub">&times; Удалить</button>
                                    </div>
                                `;

                                el.querySelector('.btn-repeat-order').onclick = (e) => {
                                    e.preventDefault(); e.stopImmediatePropagation();
                                    if (isWholesale) {
                                        this.toggleModal(true, 'wholesale'); // Открываем опт
                                        setTimeout(() => {
                                            document.querySelectorAll('.ws-qty-input').forEach(input => input.value = '');
                                            hItem.items.forEach(i => {
                                                const input = document.querySelector(`.ws-qty-input[data-item="${i.item}"][data-weight="${i.weight}"]`);
                                                if(input) input.value = i.qty;
                                            });
                                            this.updateWholesaleTotal();
                                        }, 300); // Ждем пока отрисуется таблица
                                    } else {
                                        hItem.items.forEach(i => {
                                            const product = ALL_PRODUCTS_CACHE.find(p => (p.sample || p.sample_no || "").trim() === i.item.trim());
                                            if (!product) return; // Пропускаем лот, если он снят с продажи и его нет в каталоге
                                            
                                            // СЧИТАЕМ АКТУАЛЬНУЮ ЦЕНУ НА СЕГОДНЯШНИЙ ДЕНЬ
                                            const rawGreen = parseFloat(product.rawGreenPrice || product.raw_green_price) || 0;
                                            let currentPrice = 0;
                                            
                                            if (rawGreen > 0) {
                                                const prices = this.calculateRetailPrices(rawGreen);
                                                currentPrice = (i.weight === 1000) ? prices.p1000 : prices.p250;
                                            } else if (product.price && parseFloat(product.price) > 0) {
                                                const fixedPrice = parseFloat(product.price) || 0;
                                                currentPrice = (i.weight === 1000) ? fixedPrice * 4 : fixedPrice;
                                            }
                                            
                                            if (currentPrice > 0) {
                                                const existing = this.localCart.find(cartItem => cartItem.item === i.item && cartItem.weight == i.weight && cartItem.grind === i.grind);
                                                if(existing) {
                                                    existing.qty += i.qty;
                                                } else {
                                                    this.localCart.push({ item: i.item, price: currentPrice, weight: i.weight, qty: i.qty, grind: i.grind });
                                                }
                                            }
                                        });
                                        this.saveCart(true);
                                        this.updateCartBadge();
                                        this.toggleModal(true, 'cart');
                                    }
                                };

                                el.querySelector('.btn-remove-sub').onclick = (e) => {
                                    e.preventDefault(); e.stopImmediatePropagation();
                                    if(confirm('Удалить этот заказ из истории?')) this.removeOrderFromHistory(hItem.orderId);
                                };

                                container.appendChild(el);
                            } else if (!isWholesale) {
                                // Старые одиночные розничные покупки (совместимость)
                                const productInStock = ALL_PRODUCTS_CACHE.find(p => String(hItem.item).toLowerCase().includes(String(p.sample).toLowerCase().split(' (')[0]));
                                const el = document.createElement('div');
                                el.className = 'product-list-item';
                                
                                // Исправлено: берем мета-данные через общий helper
                                const meta = ProductManager.getDisplayMeta(hItem.item, hItem.weight, hItem.grind);
                                const wDisplay = meta.weight ? ` ${meta.weight} г` : '';
                                const gDisplay = meta.grind ? ` <span style="font-size:10px; opacity:0.7; border:1px solid #ccc; padding:0 3px; border-radius:3px;">${meta.grind}</span>` : '';
                                
                                el.innerHTML = `
                                    <div style="display:flex; align-items:center;">
                                        <div class="pli-info"><div class="pli-name">${hItem.item}${wDisplay}${gDisplay} x${hItem.qty || 1}</div><div class="pli-meta">${hItem.date} • ${hItem.price} ₽</div></div>
                                    </div>
                                    <div style="display:flex; gap:5px; align-items:center;">
                                        ${productInStock ? `<button class="btn-small-reorder btn-action-reorder">Повторить</button>` : ''}
                                        <button class="btn-small-reorder btn-remove-sub" style="font-size:16px; padding:4px 8px; line-height:1;">&times;</button>
                                    </div>
                                `;
                                if(productInStock) {
                                    el.querySelector('.btn-action-reorder').onclick = () => {
                                        this.addToCart(productInStock.sample, hItem.weight || 250, hItem.grind || 'Зерно');
                                        this.toggleModal(true, 'cart');
                                    };
                                }
                                el.querySelector('.btn-remove-sub').onclick = () => { if(confirm('Удалить?')) this.removeFromHistory(hItem); };
                                container.appendChild(el);
                            }
                        });
                    };

                    // Вызываем отрисовку для двух списков раздельно
                    renderOrdersList(histCont, h => !h.isWholesaleOrder, false); // Розница
                    renderOrdersList(wsHistCont, h => h.isWholesaleOrder, true); // Оптовые
                    this.startRetailCountdownTicker();
                    // -----------------------------------------------------------------
                    this.renderRecommendations();
                } catch(e) { console.error(e); }
            },
            // --- КОНЕЦ: ЗАМЕНА ОТОБРАЖЕНИЯ ЛК (ИСТОРИЯ) ---

            renderRecommendations: function() {
                const recContainer = document.getElementById('user-recommendations-list');
                if(!recContainer) return;
                recContainer.innerHTML = '';
                
                const history = this.getVisibleHistoryItems(this.currentUser?.history || []);
                if(history.length === 0) { recContainer.innerHTML = '<div style="font-size: 11px; opacity: 0.5;">\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043d\u0430\u0448 \u043a\u043e\u0444\u0435 \u0438 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043b\u044e\u0431\u0438\u043c\u044b\u0435 \u043b\u043e\u0442\u044b \u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043f\u043e\u043a\u0443\u043f\u043e\u043a. \u041f\u043e\u0441\u043b\u0435 \u044d\u0442\u043e\u0433\u043e \u0437\u0434\u0435\u0441\u044c \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438.</div>'; return; }

                let userDescriptors = new Set();
                history.forEach(hItem => {
                    const sourceItems = Array.isArray(hItem?.items) && hItem.items.length
                        ? hItem.items
                        : (hItem && hItem.item ? [hItem] : []);

                    sourceItems.forEach(srcItem => {
                        const rawName = String(srcItem?.item || '').trim();
                        if (!rawName) return;

                        const cleanName = rawName.split(' (')[0].trim();
                        const product = ALL_PRODUCTS_CACHE.find(p => String(p.sample || '').trim() === cleanName);
                        if(product && product.flavorNotes) {
                            product.flavorNotes.split(',').forEach(tag => {
                                const t = tag.trim().toLowerCase();
                                if(t) userDescriptors.add(t);
                            });
                        }
                    });
                });

                if(userDescriptors.size === 0) return; 

                const recommendations = ALL_PRODUCTS_CACHE.filter(p => {
                    if(p.inCatalog !== "1") return false;
                    if(!p.flavorNotes) return false;
                    const pTags = p.flavorNotes.split(',').map(t => t.trim().toLowerCase());
                    if(pTags.length === 0) return false;
                    let matchCount = 0;
                    pTags.forEach(tag => { if(userDescriptors.has(tag)) matchCount++; });
                    return (matchCount / pTags.length) >= 0.3;
                });

                const finalRecs = recommendations.slice(0, 3);
                if(finalRecs.length > 0) {
                    finalRecs.forEach(p => {
                        const el = document.createElement('div');
                        el.className = 'product-list-item';
                        el.innerHTML = `<div class="pli-info"><div class="pli-name">${p.sample}</div><div class="pli-meta">Вам понравится</div></div><button class="btn-small-reorder">В корзину</button>`;
                        el.querySelector('button').onclick = () => this.addToCart(p.sample, 250);
                        recContainer.appendChild(el);
                    });
                } else { recContainer.innerHTML = '<div style="font-size: 11px; opacity: 0.5;">Мы подбираем для вас лучшие сорта.</div>'; }
            }
        };

        window.UserSystem = UserSystem;
        Object.assign(CatalogSystem, {
            STICKER_EXPORT_DPI: UserSystem.STICKER_EXPORT_DPI,
            STICKER_EXPORT_SIZES_MM: UserSystem.STICKER_EXPORT_SIZES_MM,
            supportsStickerExport: UserSystem.supportsStickerExport,
            getCatalogProductById: UserSystem.getCatalogProductById,
            getStickerExportConfig: UserSystem.getStickerExportConfig,
            mmToPrintPixels: UserSystem.mmToPrintPixels,
            sanitizeStickerFileName: UserSystem.sanitizeStickerFileName,
            createStickerExportContainer: UserSystem.createStickerExportContainer,
            createPackPreviewExportContainer: UserSystem.createPackPreviewExportContainer,
            waitForStickerRenderReady: UserSystem.waitForStickerRenderReady,
            waitForRenderImagesReady: UserSystem.waitForRenderImagesReady,
            extractPrimaryFontFamily: UserSystem.extractPrimaryFontFamily,
            ensureStickerExportFontReady: UserSystem.ensureStickerExportFontReady,
            lockStickerFontForRender: UserSystem.lockStickerFontForRender,
            getStickerSideFromElement: UserSystem.getStickerSideFromElement,
            getCrc32Table: UserSystem.getCrc32Table,
            concatUint8Arrays: UserSystem.concatUint8Arrays,
            computeCrc32: UserSystem.computeCrc32,
            createPngPhysChunk: UserSystem.createPngPhysChunk,
            setPngBlobDpi: UserSystem.setPngBlobDpi,
            blobToBase64: UserSystem.blobToBase64,
            renderStickerElementToBlob: UserSystem.renderStickerElementToBlob,
            renderPackPreviewToBlob: UserSystem.renderPackPreviewToBlob,
            downloadStickerElement: UserSystem.downloadStickerElement,
            sendStickerPackEmail: UserSystem.sendStickerPackEmail
        });

        // --- ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ (ФИНАЛ: КОМПАКТНАЯ КНОПКА И ОТСТУПЫ) ---
        const TourSystem = {
            steps: [
                {
                    target: '#wheel-zone',
                    text: 'Это каталог магазина. Вращая колесо, нажимайте на нужные лоты, читайте описание, совершайте покупки.'
                },
                {
                    target: '#info-panel',
                    text: 'Здесь будет выводиться описание любого лота, который вы выберите на колесе-каталоге.'
                },
                {
                    target: '.top-controls',
                    text: 'Это меню сайта. Здесь находится ваш личный кабинет, корзина для оплаты и раздел опта, если это вам необходимо.'
                },
                {
                    target: null,
                    text: 'Приятных вам покупок! 🎉'
                }
            ],
            currentStep: 0,

            init: function() {
                if (localStorage.getItem('locus_tour_done')) return;
                this.createElements();
                setTimeout(() => this.start(), 2000);
            },

            createElements: function() {
                if (document.getElementById('tour-overlay')) return;

                const overlay = document.createElement('div');
                overlay.id = 'tour-overlay';
                overlay.className = 'tour-overlay';
                document.body.appendChild(overlay);

                const tooltip = document.createElement('div');
                tooltip.id = 'tour-tooltip';
                tooltip.className = 'tour-tooltip';
                
                // ИЗМЕНЕНО: Добавлены width: max-content !important и align-self: center !important
                tooltip.innerHTML = `
                    <span class="tour-arrow-icon" id="tour-arrow"></span>
                    <div class="tour-text" id="tour-text"></div>
                    <button id="tour-next-btn" style="background: var(--locus-white) !important; color: var(--locus-dark) !important; border: 1px solid var(--locus-dark) !important; padding: 10px 24px !important; border-radius: 50px !important; margin-top: 15px !important; font-weight: 800 !important; text-transform: uppercase !important; font-size: 11px !important; cursor: pointer !important; box-shadow: 0 4px 15px rgba(0,0,0,0.4) !important; transition: transform 0.2s; width: max-content !important; align-self: center !important;">Далее</button>
                `;
                document.body.appendChild(tooltip);

                const btn = document.getElementById('tour-next-btn');
                btn.onmouseover = () => btn.style.transform = 'translateY(-2px)';
                btn.onmouseout = () => btn.style.transform = 'translateY(0)';
                btn.addEventListener('click', () => this.next());
            },

            start: function() {
                const overlay = document.getElementById('tour-overlay');
                const tooltip = document.getElementById('tour-tooltip');
                if (!overlay || !tooltip) return;

                overlay.classList.add('active');
                tooltip.classList.add('active');
                this.currentStep = 0;
                this.showStep();
            },

            showStep: function() {
                // Убираем подсветку с предыдущего
                document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));

                const step = this.steps[this.currentStep];
                const textEl = document.getElementById('tour-text');
                const btnEl = document.getElementById('tour-next-btn');
                const arrowEl = document.getElementById('tour-arrow');
                const tooltip = document.getElementById('tour-tooltip');

                const isDesktop = window.innerWidth >= 768;

                textEl.textContent = step.text;
                
                // НАСТРОЙКА СТРЕЛОК
                let arrowSymbol = '';
                if (this.currentStep === 0) {
                    arrowSymbol = isDesktop ? '\uD83D\uDC48' : '\uD83D\uDC46'; 
                } else if (this.currentStep === 1) {
                    arrowSymbol = isDesktop ? '\uD83D\uDC49' : '\uD83D\uDC47'; 
                }
                
                arrowEl.textContent = arrowSymbol;
                arrowEl.style.display = arrowSymbol ? 'block' : 'none';

                textEl.style.color = 'var(--locus-white)';
                textEl.style.textShadow = '0 2px 6px rgba(0,0,0,0.8)';

                btnEl.textContent = this.currentStep === this.steps.length - 1 ? 'Начать' : 'Далее';

                // Позиционирование финального шага
                if (!step.target) {
                    tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
                    tooltip.style.top = '50%';
                    tooltip.style.left = '50%';
                    tooltip.style.right = 'auto';
                    tooltip.style.bottom = 'auto';
                    
                    arrowEl.style.order = '1';
                    textEl.style.order = '2';
                    btnEl.style.order = '3';
                    return;
                }

                // Поиск элемента
                let target = null;
                if (step.target === '.top-controls') {
                    const cartBtn = document.getElementById('btn-open-cart');
                    if (cartBtn) {
                        target = cartBtn.closest('.top-controls') || cartBtn.parentElement;
                        target.classList.add('top-controls');
                    }
                } else {
                    target = document.querySelector(step.target);
                }

                if (target) {
                    target.classList.add('tour-highlight');

                    // Скролл
                    if (step.target === '.top-controls') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    // Точное позиционирование подсказки (примерно 1 см от целевого элемента)
                    setTimeout(() => {
                        tooltip.style.top = 'auto'; tooltip.style.bottom = 'auto';
                        tooltip.style.left = 'auto'; tooltip.style.right = 'auto';
                        tooltip.style.transform = 'translate(0, 0) scale(1)';

                        const rect = target.getBoundingClientRect();
                        const spacing = 35; // ~1 сантиметр

                        if (step.target === '#wheel-zone') {
                            if (isDesktop) {
                                tooltip.style.left = (rect.right + spacing) + 'px';
                                tooltip.style.top = (rect.top + rect.height / 2) + 'px';
                                tooltip.style.transform = 'translate(0, -50%) scale(1)';
                                
                                arrowEl.style.order = '1'; textEl.style.order = '2'; btnEl.style.order = '3';
                                arrowEl.style.textAlign = 'left';
                            } else {
                                tooltip.style.top = (rect.bottom + spacing) + 'px';
                                tooltip.style.left = '50%';
                                tooltip.style.transform = 'translate(-50%, 0) scale(1)';
                                
                                arrowEl.style.order = '1'; textEl.style.order = '2'; btnEl.style.order = '3';
                                arrowEl.style.textAlign = 'center';
                            }
                            
                        } else if (step.target === '#info-panel') {
                            if (isDesktop) {
                                tooltip.style.right = (window.innerWidth - rect.left + spacing) + 'px';
                                tooltip.style.top = (rect.top + rect.height / 2) + 'px';
                                tooltip.style.transform = 'translate(0, -50%) scale(1)';
                                
                                textEl.style.order = '1'; btnEl.style.order = '2'; arrowEl.style.order = '3'; 
                                arrowEl.style.textAlign = 'right';
                            } else {
                                tooltip.style.bottom = (window.innerHeight - rect.top + spacing) + 'px';
                                tooltip.style.left = '50%';
                                tooltip.style.transform = 'translate(-50%, 0) scale(1)';
                                
                                textEl.style.order = '1'; btnEl.style.order = '2'; arrowEl.style.order = '3'; 
                                arrowEl.style.textAlign = 'center';
                            }
                            
                        } else if (step.target === '.top-controls') {
                            tooltip.style.top = (rect.bottom + spacing) + 'px';
                            const distFromRight = window.innerWidth - rect.right;
                            tooltip.style.right = Math.max(15, distFromRight) + 'px'; 
                            
                            textEl.style.order = '1'; btnEl.style.order = '2'; 
                        }

                    }, 300); // Ждем скролла
                }
            },

            next: function() {
                if (this.steps[this.currentStep].target === '#wheel-zone') {
                    document.getElementById('info-panel')?.classList.remove('active');
                    document.getElementById('wheel-zone')?.classList.remove('lot-selected');
                }

                this.currentStep++;
                if (this.currentStep >= this.steps.length) {
                    this.end();
                } else {
                    this.showStep();
                }
            },

            end: function() {
                document.getElementById('tour-overlay').classList.remove('active');
                document.getElementById('tour-tooltip').classList.remove('active');
                document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
                localStorage.setItem('locus_tour_done', 'true');
            }
        };
        window.TourSystem = TourSystem;

        // --- СИСТЕМА COOKIE УВЕДОМЛЕНИЙ ---
        function initCookieBanner() {
            // Если пользователь уже соглашался, ничего не делаем
            if (localStorage.getItem('locus_cookie_consent')) return;

            // Создаем плашку динамически
            const banner = document.createElement('div');
            banner.className = 'cookie-banner';
            banner.innerHTML = `
                <div class="cookie-text">Используя данный сайт, вы даете согласие на использование файлов cookie, помогающих нам сделать его удобнее для вас.</div>
                <button class="cookie-btn">Соглашаюсь</button>
            `;
            document.body.appendChild(banner);

            // Даем сайту загрузиться и плавно выводим плашку через 2.5 секунды
            setTimeout(() => {
                banner.classList.add('show');
            }, 2500);

            // Обработка клика по кнопке
            banner.querySelector('.cookie-btn').addEventListener('click', () => {
                localStorage.setItem('locus_cookie_consent', 'true');
                banner.classList.remove('show'); // Плавно убираем вниз
                setTimeout(() => banner.remove(), 500); // Удаляем из кода после завершения анимации
            });
        }
        // Запускаем проверку
        initCookieBanner();
        
        async function fetchExternalData() {
            try {
                // 1. Загружаем каталог и внешние данные параллельно для быстрого старта
                const [catRes, extRes] = await Promise.all([
                    fetch(YANDEX_FUNCTION_URL + "?type=catalog").then(r => r.json()),
                    fetch(LOCUS_API_URL + "?action=getExtrinsicData").then(r => r.json()).catch(() => ({success: false, data: []}))
                ]);
                
                if (!catRes.success) throw new Error(catRes.error || "Ошибка загрузки каппингов");
                console.log("ОТВЕТ БЕКЕНДА (EXT + AI):", extRes);

                // 2. Собираем словари с ЗАЩИТОЙ РЕГИСТРА
                const extMap = {};
                const aiMap = {}; 
                
                if (extRes.ai_stories) {
                    for (let k in extRes.ai_stories) {
                        aiMap[k.trim().toLowerCase()] = extRes.ai_stories[k];
                    }
                }
                
                if (extRes.success && extRes.data) {
                    extRes.data.forEach(e => {
                        if(e.sample_no) extMap[e.sample_no.trim().toLowerCase()] = e;
                    });
                }

                ALL_PRODUCTS_CACHE = [];
                
                // ОЧИЩАЕМ СТАРЫЕ ЛЕПЕСТКИ КОЛЕСА ПЕРЕД ОБНОВЛЕНИЕМ
                SHOP_DATA.forEach(cat => {
                    cat.children = [];
                });
                
                const catalogItems = [...catRes.data, ...STATIC_CATALOG_PRODUCTS];

                catalogItems.forEach(r => {
                    const sName = r.sample_no || r.sample;
                    
                    if (sName) {
                        const extItem = extMap[sName.trim().toLowerCase()] || {};
                        const extData = extItem.form_data || {};

                        const getE = (key) => {
                            if (extData[key] !== undefined && String(extData[key]).trim() !== '') return extData[key];
                            return '';
                        };

                        const raw = { 
                            id: r.id,
                            cuppingDate: r.cupping_date, 
                            sample: sName, 
                            roast: r.roast_level, 
                            smellInt: r.fragrance, 
                            aromaInt: r.aroma, 
                            aromaDesc: r.aroma_descriptors, 
                            aromaNotes: r.aroma_notes, 
                            flavorInt: r.flavor, 
                            atInt: r.aftertaste, 
                            flavorDesc: r.flavor_descriptors, 
                            mainFlavors: r.main_tastes, 
                            flavorNotes: r.flavor_notes, 
                            acidInt: r.acidity, 
                            acidNotes: r.acidity_notes, 
                            sweetInt: r.sweetness, 
                            sweetNotes: r.sweetness_notes, 
                            bodyInt: r.mouthfeel, 
                            bodyDesc: r.mouthfeel_descriptors, 
                            bodyNotes: r.mouthfeel_notes, 
                            inCatalog: r.in_catalogue, 
                            category: r.category || '', 
                            price: r.price || '0',
                            imageUrl: r.image_url || '',
                            customDesc: r.custom_desc || '',
                            externalUrl: r.external_url || '',
                            rawGreenPrice: parseFloat(r.raw_green_price || extItem.raw_green_price || getE('Farm Gate Price')) || 0,
                            
                            // ДОБАВЛЕНО ПОЛЕ ИСТОРИИ ИЗ БАЗЫ
                            aiStory: aiMap[sName.trim().toLowerCase()] || null,
                            
                            country: getE('Country'),
                            region: getE('Region'),
                            farm: getE('Name of farm or Co-op'),
                            producer: getE('Name of Producer(s)'),
                            variety: getE('Species Variety or Varieties'),
                            harvest: getE('Harvest Date/Year'),
                            processor: getE('Name of Processor(s)'),
                            wetMill: getE('Wet Mill / Station'),
                            dryMill: getE('Dry Mill'),
                            processType: getE('Process Type'),
                            washed: getE('Washed'),
                            natural: getE('Natural'),
                            decaf: getE('Decaffeinated'),
                            processDesc: getE('Process Description'),
                            grade: getE('Grade'),
                            ico: getE('ICO Number'),
                            importer: getE('Name of Importer'),
                            exporter: getE('Name of Exporter'),
                            farmGatePrice: getE('Farm Gate Price'),
                            lotSize: getE('Lot Size'),
                            cert4C: getE('4C'),
                            certFairTrade: getE('Fair trade'),
                            certOrganic: getE('Organic'),
                            certRainforest: getE('Rainforest Alliance'),
                            certFoodSafety: getE('Food Safety'),
                            otherCertifications: getE('Other_Certifications'),
                            otherFarming: getE('Other_Farming'),
                            otherProcessor: getE('Other_Processor'),
                            otherProcessType: getE('Other_Process_Type'),
                            otherTrading: getE('Other_Trading'),
                            awards: getE('Awards')
                        };

                        ALL_PRODUCTS_CACHE.push(raw);
                        
                        if(raw.inCatalog === "1" || raw.inCatalog === 1 || raw.inCatalog === true) {
                            const roastVal = parseFloat(raw.roast);
                            let targetCategoryLabel = 'ФИЛЬТР'; 
                            const typeInfo = ProductManager.getTypeInfo(raw);
                             
                            const dbCat = raw.category ? String(raw.category).toLowerCase() : '';
                            
                            if (dbCat.includes('ароматизация')) {
                                targetCategoryLabel = 'АРОМАТИЗАЦИЯ';
                            } else if (dbCat.includes('аксессуар')) {
                                targetCategoryLabel = 'АКСЕССУАРЫ';
                            } else if (dbCat.includes('информац')) {
                                targetCategoryLabel = 'ИНФОРМАЦИЯ';
                            } else if (dbCat.includes('эспрессо')) {
                                targetCategoryLabel = 'ЭСПРЕССО';
                            } else if (dbCat.includes('фильтр')) {
                                targetCategoryLabel = 'ФИЛЬТР';
                            } else if (roastVal >= 10) { 
                                targetCategoryLabel = 'ЭСПРЕССО'; 
                            }
                            
                            const target = SHOP_DATA.find(c => c.label === targetCategoryLabel);
                            if (target && !typeInfo.isArticle) {
                                // ИЗМЕНЕНИЕ: Теперь передаем только заметки о букете (где дескрипторы через запятую)
                                const petalColor = mixFlavorColors(raw.flavorNotes, target.color);
                                let wheelLabel = raw.sample;
                                const words = wheelLabel.split(' ');
                                if(words.length > 2) {
                                    const mid = Math.ceil(words.length / 2);
                                    wheelLabel = words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
                                }
                                target.children.push({ label: wheelLabel, color: petalColor, depth: 1, raw: raw });
                            }
                        }
                    }
                });
                
                // Сортируем лепестки по алфавиту внутри каждой категории на колесе
                SHOP_DATA.forEach(cat => {
                    cat.children.sort((a, b) => a.label.localeCompare(b.label));
                });

                renderWheel();
                initWheelInteraction();
                UserSystem.init();
                
                // ЗАПУСКАЕМ УДАЧУ ПРИ УСПЕШНОЙ ЗАГРУЗКЕ
                if (window.FortuneSystem) window.FortuneSystem.init();

                // ДОБАВЛЕНО: ЗАПУСКАЕМ ОБУЧЕНИЕ ДЛЯ НОВЫХ ГОСТЕЙ
                if (window.TourSystem) window.TourSystem.init();
                
                // ЧТЕНИЕ ПРЯМОЙ ССЫЛКИ ИЗ АДРЕСНОЙ СТРОКИ (DEEP LINK)
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const lotFromUrl = urlParams.get('lot');
                        if (lotFromUrl) {
                            // Ищем лепесток с нужным названием
                            const allGroups = document.querySelectorAll('#wheel-spinner svg g');
                            const targetGroup = Array.from(allGroups).find(g => g.getAttribute('data-lot') === lotFromUrl);
                             
                            if (targetGroup) {
                                // Имитируем клик
                                targetGroup.dispatchEvent(new Event('click')); 
                            } else {
                                const hiddenProduct = ALL_PRODUCTS_CACHE.find(p => String(p.sample || p.sample_no || '') === String(lotFromUrl));
                                if (hiddenProduct) {
                                    window.UserSystem?.openProductById(hiddenProduct.id, { syncUrl: false });
                                }
                            }
                        }

                    // ДОБАВЛЕНО: Чтение ссылки на разделы модального окна (Опт, Корзина и т.д.)
                    const viewFromUrl = urlParams.get('view');
                    if (viewFromUrl) {
                        if (viewFromUrl === 'wholesale') {
                            document.getElementById('btn-open-wholesale')?.click();
                        } else if (viewFromUrl === 'cart') {
                            document.getElementById('btn-open-cart')?.click();
                        } else if (viewFromUrl === 'login' || viewFromUrl === 'forgot-password' || viewFromUrl === 'reset-password') {
                            window.UserSystem?.toggleModal(true, viewFromUrl);
                        }
                    }
                }, 800); // Небольшая задержка для отрисовки интерфейса
                
            } catch (e) { 
                console.error("Ошибка загрузки каталога:", e);
                document.getElementById('loading-overlay').textContent = "Ошибка загрузки";
                renderWheel(); 
                UserSystem.init(); 
            }
        }
        // АВТООБНОВЛЕНИЕ ГОДА В ПОДВАЛЕ
        const yearSpan = document.getElementById('current-year');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        window.fetchExternalData = fetchExternalData; // ДЕЛАЕМ ГЛОБАЛЬНОЙ
        fetchExternalData();
        // ==========================================
        // ЭКСПОРТ НАКЛЕЙКИ В PNG
        // ==========================================
        window.downloadPackSticker = async function(stickerId, sampleName) {
            const stickerEl = document.getElementById(stickerId);
            if (!stickerEl) {
                alert('Ошибка: макет наклейки не найден на странице.');
                return;
            }

            try {
                const side = stickerEl.classList.contains('locus-back-sticker-canvas') ? 'back' : 'front';
                await CatalogSystem.downloadStickerElement(stickerEl, sampleName, side);
            } catch (e) {
                console.error(e);
                alert('Ошибка экспорта наклейки: ' + e.message);
            }
        };
