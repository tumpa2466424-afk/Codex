import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, collection, deleteDoc, getDocs, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        // // --- КОНФИГУРАЦИЯ FIREBASE ---
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
        
        const CATEGORY_COLORS = { 'Эспрессо': '#9c4c00', 'Фильтр': '#e78b00', 'Ароматизация': '#ad6565', 'Аксессуары': '#538a8b', 'Информация': '#9e9076' };

        const CATEGORY_DESCRIPTIONS = {
            'ЭСПРЕССО': 'В этой категории собраны сорта и смеси, которые подойдут для приготовления в эспрессо, турке, гейзере и другими способами. Идеально под молоко.',
            'ФИЛЬТР': 'В этой категории собраны сорта и смеси, которые подойдут для приготовления в любых фильтровых способах: воронки, аэропресс, капельные.',
            'АРОМАТИЗАЦИЯ': 'Десертные сорта с мягкой ароматизацией. Применяются кондитерские ароматизаторы. Идеальный выбор для тех, кто хочет разнообразить кофейную рутину новыми яркими ароматами.',
            'АКСЕССУАРЫ': 'Все, с помощью чего вы сможете приготовить себе чашку вкусного кофе.',
            'ИНФОРМАЦИЯ': 'Ознакомьтесь с информацией в этом разделе, чтобы узнать о нас больше.'
        };
        
        const SCA_CSV_MAP = {
            // ФРУКТОВЫЙ (Fruity)
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

            // ДРУГИЕ (Other: бумажный, химический, животный)
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

            // ОБЖАРЕННЫЙ (Roasted / Cereal)
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

            // ОРЕХОВЫЙ / КАКАО (Nutty/Cocoa)
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
            
            // Настройки для КАТЕГОРИЙ (Эспрессо, Фильтр - Внутренний круг и стикеры)
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
            
            // 1. Разбиваем по ';' и сразу отбрасываем пустые элементы (решает проблему висящих "; Группа;")
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
        // ЕДИНЫЙ ЦЕНТР УПРАВЛЕНИЯ ТОВАРАМИ (PRODUCT MANAGER)
        // Вся логика типов товаров, веса, помола и описаний централизована здесь.
        // ============================================================================
        const ProductManager = {
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
                if (!p) return { isSpecial: false, isAroma: false, isCoffee: true, isDrip: false };

                const cat = (p.category || '').toLowerCase();
                const sName = (p.sample || '').toLowerCase();

                const isAroma = cat.includes('ароматизац');
                const isAcc = cat.includes('аксессуар');
                const isInfo = cat.includes('информац');
                const isDrip = sName.includes('дрип');

                return {
                    isSpecial: isAcc || isInfo || isDrip, // Всё, что не классический кофе
                    isAccessory: isAcc,
                    isInfo: isInfo,
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
            getDisplayDesc: function(product) {
                if (!product) return '-';
                const type = this.getTypeInfo(product);
                if (type.isSpecial) {
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
            setTimeout(() => { pInfo.style.display = 'none'; dMsg.style.display = 'block'; setTimeout(() => dMsg.classList.add('active'), 50); }, 250);
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
                    
                    
                    // Рефакторинг: используем ProductManager
                    const typeInfo = ProductManager.getTypeInfo(r);
                    const { isAroma, isInfo, isSpecial } = typeInfo;

                  
                    // ВОЗВРАЩАЕМ ПОТЕРЯННЫЕ ПЕРЕМЕННЫЕ КНОПОК
                    const toggleBtn = document.getElementById('btn-toggle-details');
                    const toggleExtBtn = document.getElementById('btn-toggle-extrinsic');
                    const toggleAiBtn = document.getElementById('btn-toggle-ai');
                    const lotDescWrapper = document.getElementById('lot-desc-wrapper');

                    // Находим кнопки и блоки для скрытия (Вес, Подписка)
                    const weightSelector = document.getElementById('weight-selector-block');
                    const subBtn = document.getElementById('btn-subscription');
                    const cartBtn = document.getElementById('btn-cart');
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
                        let descHtml = galleryHtml + `<div style="text-align: justify; line-height: 1.5; white-space: pre-wrap;">${r.customDesc || r.flavorDesc || ''}</div>`;
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
                        
                        const grid = document.getElementById('cupping-data');
                        if(grid) grid.innerHTML = ''; // Убираем таблицу каппинга
                        
                    } else if (isAroma) {
                        // 2. АРОМАТИЗАЦИЯ
                        let descHtml = galleryHtml + formatFlavorDesc(r.flavorDesc);
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
                        let descHtml = galleryHtml + formatFlavorDesc(r.flavorDesc);
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

                    // ЛОГИКА КНОПКИ ПОКУПКИ (Скрываем для раздела Инфо с ценой 0)
                    const priceVal = parseFloat(r.price) || 0;
                    if (isInfo && priceVal === 0) {
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
                pInfo.style.display = 'block';
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

        if (btnDetails) {
            btnDetails.addEventListener('click', () => {
                const isHidden = blockDetails.style.display === 'none' || blockDetails.style.display === '';
                closeAllDescTabs();
                if (isHidden) {
                    blockDetails.style.display = 'block';
                    btnDetails.classList.add('active');
                }
            });
        }

        if (btnExtrinsic) {
            btnExtrinsic.addEventListener('click', () => {
                const isHidden = blockExtrinsic.style.display === 'none' || blockExtrinsic.style.display === '';
                closeAllDescTabs();
                if (isHidden) {
                    blockExtrinsic.style.display = 'block';
                    btnExtrinsic.classList.add('active');
                }
            });
        }

        if (btnAi) {
            btnAi.addEventListener('click', () => {
                const isHidden = blockAi.style.display === 'none' || blockAi.style.display === '';
                closeAllDescTabs();
                if (isHidden) {
                    blockAi.style.display = 'block';
                    btnAi.classList.add('active');
                }
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
                                const isBlend = r.sample.toLowerCase().includes('blend') || r.sample.toLowerCase().includes('смесь');
                                const blendLabel = isBlend ? `<span style="font-size:9px; border:1px solid #ccc; border-radius:3px; padding:0 2px; margin-right:5px; vertical-align:middle; display:inline-block; color:var(--locus-dark);">BLEND</span>` : '';

                                const item = document.createElement('div');
                                item.className = 'catalog-item';
                                item.id = `cat-item-row-${r.id}`;

                                item.innerHTML = `
                                    <div class="catalog-item-header" onclick="CatalogSystem.toggleDetails('${r.id}')">
                                        <div class="item-title" style="display:flex; align-items:center; flex-wrap:wrap;">
                                            ${(gName==='Эспрессо'||gName==='Фильтр') ? typeSticker : ''}${blendLabel} <span>${r.sample}</span>
                                        </div>
                                        <div class="item-controls" onclick="event.stopPropagation()">
                                            <div class="cat-checkbox-wrapper">
                                                <span id="cat-status-${r.id}" class="save-status"></span>
                                                <input type="checkbox" id="cat-check-${r.id}" ${isChecked} onchange="CatalogSystem.updateCatalogRow('${r.id}', this)">
                                                В каталоге
                                            </div>
                                            <button class="cat-btn-icon" title="Редактировать лот" onclick="CatalogSystem.openEditMode('${r.id}', event)">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button class="cat-btn-icon" title="Дублировать лот" onclick="CatalogSystem.duplicateRow('${r.id}', event)">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                            <button class="cat-btn-icon delete" id="cat-btn-delete-${r.id}" title="Удалить лот" onclick="CatalogSystem.deleteRow('${r.id}', '${r.sample}')">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
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

            getViewHtml: function(r) {
                const typeInfo = ProductManager.getTypeInfo(r);
                const isSpecial = typeInfo.isSpecial;
                const isAroma = typeInfo.isAroma;

                if (isSpecial) {
                    return `
                        <div class="cupping-grid">
                            <div class="cupping-item full-width">
                                <span class="cupping-label">Текстовое описание</span>
                                <span class="cupping-value" style="white-space: pre-wrap; font-size: 13px;">${r.customDesc || r.flavorDesc || 'Нет описания'}</span>
                            </div>
                        </div>
                    `;
                }

                // --- ГЕНЕРАТОР НАКЛЕЕК (ЛИЦО И ЗАДНИК) ---
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

                const safeSampleId = r.sample ? r.sample.toString().replace(/[^a-zA-Z0-9]/g, '_') : Math.floor(Math.random() * 10000);
                const frontStickerId = `front-${safeSampleId}`;
                const backStickerId = `back-${safeSampleId}`;

                // Выводим обе наклейки рядом (flex-контейнер)
                const stickerPreview = `
                    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
                        
                        <div style="background: #f4f1ea; padding: 20px; border-radius: 8px; border: 1px solid var(--locus-border); flex: 1; min-width: 320px; display: flex; flex-direction: column; align-items: center;">
                            <div style="text-align:center; font-size:12px; font-weight:bold; color:var(--locus-accent); margin-bottom:15px; text-transform:uppercase;">Лицо (80х80 мм)</div>
                            
                            <div class="locus-sticker-canvas" id="${frontStickerId}">
                                <div class="s-roast-text">${roastTextLabel}</div>
                                <div class="s-country">${country}</div>
                                <div class="s-farm">${farm}</div>
                                <div class="s-descriptors">${formattedNotes}</div>
                            </div>

                            <button type="button" onclick="window.downloadPackSticker('${frontStickerId}', '${r.sample}_FRONT')" style="margin-top: 15px; background: var(--locus-dark); color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px;">Скачать ЛИЦО</button>
                        </div>

                        <div style="background: #f4f1ea; padding: 20px; border-radius: 8px; border: 1px solid var(--locus-border); flex: 1; min-width: 320px; display: flex; flex-direction: column; align-items: center;">
                            <div style="text-align:center; font-size:12px; font-weight:bold; color:var(--locus-accent); margin-bottom:15px; text-transform:uppercase;">Задник (60х60 мм)</div>
                            
                            <div class="locus-back-sticker-canvas" id="${backStickerId}">
                                <div class="sb-top">
                                    <div class="sb-brand">Locus Coffee</div>
                                    <div class="sb-sub">Свежеобжаренный кофе</div>
                                </div>
                                
                                <div class="sb-grid">
                                    <div class="sb-label">Страна:</div><div class="sb-value">${country}</div>
                                    <div class="sb-label">Регион:</div><div class="sb-value">${region}</div>
                                    <div class="sb-label">Ферма:</div><div class="sb-value">${farm}</div>
                                    <div class="sb-label">Вид/Разновидность:</div><div class="sb-value">${variety}</div>
                                    <div class="sb-label">Год урожая:</div><div class="sb-value">${harvest}</div>
                                    <div class="sb-label">Описание обработки:</div><div class="sb-value">${processing}</div>
                                </div>

                                <div class="sb-info">
                                    Состав: ${variety}<br>
                                    Срок годности: 1 год<br>
                                    Срок реализации: 1 месяц<br>
                                    Производитель: ИП Зуева Е.В.<br>
                                    Адрес: г. Орёл, ул. Наугорское шоссе, д. 5.<br>
                                    Нетто: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; г.
                                </div>

                                <div class="sb-footer">
                                    +7 906 660 4060 | locus.coffee
                                </div>
                            </div>

                            <button type="button" onclick="window.downloadPackSticker('${backStickerId}', '${r.sample}_BACK')" style="margin-top: 15px; background: var(--locus-dark); color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px;">Скачать ЗАДНИК</button>
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

            getEditHtml: function(r) {
                // Рефакторинг: используем ProductManager
                const isSpecial = ProductManager.getTypeInfo(r).isSpecial;
                const extraStyle = isSpecial ? 'display: none;' : 'display: contents;';

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

                        <div class="cupping-item full-width">
                            <span class="cupping-label">Текстовое описание (HTML или обычный текст с абзацами)</span>
                            <textarea id="cat-edit-customDesc-${r.id}" class="edit-textarea" style="height:100px;">${r.customDesc || ''}</textarea>
                        </div>
                        
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

            toggleDetails: function(id) {
                const item = document.getElementById(`cat-item-row-${id}`);
                if(item) {
                    item.classList.toggle('open');
                    if(!item.classList.contains('open')) this.cancelEdit(id);
                }
            },

            openEditMode: function(id, event) {
                event.stopPropagation();
                const item = document.getElementById(`cat-item-row-${id}`);
                const contentDiv = document.getElementById(`cat-content-${id}`);
                const product = this.ALL_PRODUCTS.find(p => p.id === id);
                if (!item.classList.contains('open')) item.classList.add('open');
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
                const updatedData = {
                    id: id,
                    sample: document.getElementById(`cat-edit-sample-${id}`).value,
                    category: document.getElementById(`cat-edit-category-${id}`).value,
                    price: document.getElementById(`cat-edit-price-${id}`).value,
                    imageUrl: document.getElementById(`cat-edit-imageUrl-${id}`).value,
                    customDesc: document.getElementById(`cat-edit-customDesc-${id}`).value,
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
                    const response = await fetch(YANDEX_FUNCTION_URL + "?type=catalog_edit", {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData)
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error("Сервер вернул ошибку");
                    
                    const pIndex = this.ALL_PRODUCTS.findIndex(p => p.id === id);
                    this.ALL_PRODUCTS[pIndex] = { ...this.ALL_PRODUCTS[pIndex], ...updatedData };
                    document.querySelector(`#cat-item-row-${id} .item-title span`).textContent = updatedData.sample;
                    this.cancelEdit(id);
                    if (window.fetchExternalData) window.fetchExternalData(); // Обновляем витрину
                } catch (error) {
                    alert("Ошибка сети при сохранении изменений.");
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
                
                statusEl.textContent = "Загрузка изображения на ImgBB...";
                statusEl.style.color = "#8B7E66";

                const formData = new FormData();
                formData.append("image", file);
                
                // ВАЖНО: Вставь сюда свой API ключ от ImgBB!
                const IMGBB_API_KEY = "a82462eb247f9d0aee41ded68240ed02"; 
                
                try {
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        const currentVal = urlInput.value.trim();
                        urlInput.value = currentVal ? currentVal + ', ' + data.data.url : data.data.url;
                        statusEl.textContent = "Фото успешно загружено!";
                        statusEl.style.color = "#187a30";
                    } else {
                        throw new Error(data.error ? data.error.message : "Неизвестная ошибка");
                    }
                } catch (e) {
                    console.error(e);
                    statusEl.textContent = "Ошибка загрузки: " + e.message;
                    statusEl.style.color = "#B66A58";
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
                    if (pIndex !== -1) this.ALL_PRODUCTS[pIndex].inCatalog = isChecked ? "1" : "";

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
                div.style.cssText = 'position:absolute; right:20px; top:120px; background:#fff; padding:15px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.15); z-index:50; width:220px; border:1px solid var(--locus-border); text-align:center;';
                div.innerHTML = `
                    <div style="font-weight:bold; color:var(--locus-dark); margin-bottom:10px;">Колесо удачи! 🎁</div>
                    <div style="font-size:12px; margin-bottom:15px; color:#555;">Испытайте удачу и получите дополнительную скидку 10% на случайный сорт.</div>
                    <button class="lc-btn" style="padding:8px; font-size:12px; margin-bottom:8px; width:100%;" onclick="FortuneSystem.accept()">Участвую!</button>
                    <div style="font-size:10px; color:gray; cursor:pointer; text-decoration:underline;" onclick="FortuneSystem.decline()">Перейти в каталог</div>
                `;
                const zone = document.getElementById('wheel-zone');
                if(zone) zone.appendChild(div);
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
            
            // WHOLESALE & PRICING
            pricingSettings: null,
            usdRate: 0,

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
                        this.currentUser = { id: this.uid, email: payload.email, totalSpent: 0, cart: [], history: [], subscription: [] }; 
                        this.updateUIState();
                        
                        // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Принудительно скачиваем реальную историю и корзину из YDB при загрузке
                        this.fetchUserData();
                        
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
                safeListen('btn-close-lc', () => this.toggleModal(false));
                safeListen('link-to-reg', () => this.switchView('register'));
                safeListen('link-to-login', () => this.switchView('login'));
                safeListen('btn-action-reg', () => this.register());
                safeListen('btn-action-login', () => this.login());
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
            },

            // --- PRICING LOGIC ---
            fetchUSDRate: async function() {
                try {
                    const resp = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
                    const data = await resp.json();
                    if(data && data.Valute && data.Valute.USD) {
                        this.usdRate = data.Valute.USD.Value;
                    }
                } catch(e) { console.error('USD Fetch Error', e); this.usdRate = 90; } // Fallback
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
            calculateWholesalePrice: function(rawPriceUSD) {
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

                // 4. МАРЖА ОПТА (Contribution Margin)
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

                // 3. РОЗНИЧНАЯ НАЦЕНКА (80% сверху)
                // Можешь менять коэффициент 1.8 на нужный тебе
                const retailMargin = 1.8; 

                // Математика (округляем до десятков)
                const price1000 = Math.ceil((fullCost1kg * retailMargin) / 10) * 10;
                
                // Для 250г плюсуем стоимость розничной пачки (напр., 60 руб)
                const cost250 = (fullCost1kg / 4) + 60;
                const price250 = Math.ceil((cost250 * retailMargin) / 10) * 10;

                return { p250: price250, p1000: price1000 };
            },
            // --- КОНЕЦ: РАСЧЕТ РОЗНИЧНЫХ ЦЕН ---

            renderWholesaleTable: function() {
                const container = document.getElementById('wholesale-table-container');
                const dateEl = document.getElementById('ws-date');
                const usdEl = document.getElementById('ws-usd');
                
                if(dateEl) dateEl.textContent = new Date().toLocaleDateString();
                if(usdEl) usdEl.textContent = this.usdRate.toFixed(4);
                
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
                        const prices = this.calculateWholesalePrice(rawGreen);
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
                        const isBlend = i.sample.toLowerCase().includes('blend') || i.sample.toLowerCase().includes('смесь');
                        const blendLabel = isBlend ? `<span style="font-size:9px; border:1px solid #ccc; border-radius:3px; padding:0 2px; margin-right:5px; vertical-align:middle; display:inline-block; margin-bottom:4px;">BLEND</span>` : '';
                        
                        // Рефакторинг: получаем правильное описание через ProductManager
                        const displayDesc = ProductManager.getDisplayDesc(i);
                        
                        html += `<tr>
                            <td style="font-weight:600; vertical-align:middle; line-height:1.4;">${typeSticker}${blendLabel}<br>${i.sample}</td>
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
                let totalCost = 0;
                
                document.querySelectorAll('.ws-qty-input').forEach(input => {
                    const qty = parseInt(input.value) || 0;
                    if (qty > 0) {
                        const w = parseInt(input.getAttribute('data-weight'));
                        const p = parseInt(input.getAttribute('data-price'));
                        totalWeightGrams += w * qty;
                        totalCost += p * qty;
                    }
                });
                
                const isUrgent = document.getElementById('ws-urgent-order') && document.getElementById('ws-urgent-order').checked;
                if (isUrgent) {
                    totalCost = Math.ceil(totalCost * 1.2);
                }
                
                const weightKg = totalWeightGrams / 1000;
                const weightEl = document.getElementById('ws-total-weight');
                const costEl = document.getElementById('ws-total-cost');
                
                // Пробелы теперь стоят прямо в HTML верстке, здесь передаем только чистые цифры
                if (weightEl) weightEl.textContent = weightKg.toFixed(1);
                if (costEl) costEl.textContent = totalCost.toLocaleString('ru-RU');
                
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
                // УБРАНА ПРОВЕРКА АВТОРИЗАЦИИ. Теперь любой гость может сделать оптовый заказ.
                
                let items = [];
                let totalCost = 0;
                
                document.querySelectorAll('.ws-qty-input').forEach(input => {
                    const qty = parseInt(input.value) || 0;
                    if (qty > 0) {
                        const w = parseInt(input.getAttribute('data-weight'));
                        const p = parseInt(input.getAttribute('data-price'));
                        const name = input.getAttribute('data-item');
                        items.push({ item: name, weight: w, grind: 'Зерно', price: p, qty: qty });
                        totalCost += p * qty;
                    }
                });
                
                const isUrgent = document.getElementById('ws-urgent-order') && document.getElementById('ws-urgent-order').checked;
                if (isUrgent) {
                    totalCost = Math.ceil(totalCost * 1.2);
                }
                
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
                    customer: { email: email, phone: phone, isUrgent: isUrgent, requisites: reqs },
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
                        const prices = this.calculateWholesalePrice(rawGreen);
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
                        typeText = 'АРОМА';
                    } else if (catName.includes('эспрессо')) {
                        typeText = 'ЭСПРЕССО';
                    } else if (!catName.includes('фильтр') && roastVal >= 10) {
                        typeText = 'ЭСПРЕССО';
                    }

                    const isBlend = p.sample.toLowerCase().includes('blend') || p.sample.toLowerCase().includes('смесь');
                    const prefixText = (isBlend ? '[BLEND] ' : '') + `[${typeText}] `;
                    
                    // Рефакторинг: используем ProductManager (без HTML-тегов для PDF)
                    const isSpecialItem = ProductManager.getTypeInfo(p).isSpecial;
                    const displayDesc = isSpecialItem ? (p.customDesc || p.flavorDesc || '-') : (p.flavorDesc || '-');
                    
                    tableBody.push([
                        prefixText + p.sample, 
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
                    // Генерируем 6-значный код, если его еще нет
                    if (!this.currentPickupCode) {
                        this.currentPickupCode = Math.floor(100000 + Math.random() * 900000).toString();
                    }
                    codeEl.textContent = this.currentPickupCode;
                    codeBlock.style.display = 'block';
                    
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

                        // 2. Умная синхронизация корзины (решает проблему исчезновения)
                        if (this.currentUser.cart.length > 0) {
                            this.localCart = this.currentUser.cart;
                            this.saveCart(false); 
                        } else if (this.localCart.length > 0) {
                            // Если на сервере пусто, а локально есть товары - пушим их на сервер!
                            this.saveCart(true);
                        }
                        
                        this.updateCartBadge();
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
                            
                            if (serverData.cart.length > 0) { 
                                this.localCart = serverData.cart; 
                                this.saveCart(false); 
                                this.updateCartBadge(); 
                            }
                            
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
                    document.body.style.overflow = 'hidden';
                    m.classList.add('active');
                    if(initialView === 'wholesale') m.classList.add('wide'); else m.classList.remove('wide');
                    
                    // ДОБАВЛЕНО: Обновляем URL для прямых ссылок (Опт, Корзина, Вход)
                    if (initialView === 'wholesale' || initialView === 'cart' || initialView === 'login') {
                        url.searchParams.set('view', initialView);
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
                        MessageSystem.loadMessagesForAdmin();
                    }
                    else if(initialView === 'wholesale') { 
                        m.classList.add('wide'); 
                        m.classList.remove('admin-wide');
                        this.switchView('wholesale'); 
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
                    
                    // ДОБАВЛЕНО: Очищаем параметр view при закрытии окна, чтобы вернуть чистый URL
                    url.searchParams.delete('view');
                    window.history.replaceState({}, '', url);
                }
            },
            // --- КОНЕЦ: ИСПРАВЛЕННОЕ ОТКРЫТИЕ ОКОН ---

            switchView: function(viewName) {
                ['view-login', 'view-register', 'view-dashboard', 'view-cart', 'view-admin', 'view-wholesale'].forEach(id => {
                    const el = document.getElementById(id); if(el) el.classList.remove('show-view');
                });
                const view = document.getElementById(`view-${viewName}`); if(view) view.classList.add('show-view');
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
                ['catalog','users', 'promos', 'subs', 'costs', 'actions', 'messages', 'ws-orders', 'orders'].forEach(t => {
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
                if (tabName === 'messages') MessageSystem.loadMessagesForAdmin();
                if (tabName === 'ws-orders') this.loadWholesaleOrders();
                if (tabName === 'catalog') CatalogSystem.loadData();
                if (tabName === 'orders') this.loadRetailOrders();
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
                        const history = u.history || [];
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
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    usersList.forEach(u => {
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
                if(!confirm('Удалить промокод?')) return;
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
                        else if (o.status === 'completed' || o.status === 'shipped') rowStyle = 'background-color:#f0f0f0; opacity: 0.6;'; 

                        html += `<tr style="${rowStyle}">
                            <td style="vertical-align:top; padding-top:10px; font-size:12px; line-height:1.4;">
                                <b style="font-size:13px;">№ ${o.id}</b><br>
                                <span style="font-size:10px; color:gray;">${datePart}</span><br>
                                <div style="margin-top:8px;"><b>${customer.name || 'Без ФИО'}</b></div>
                                <div style="color:gray;">${customer.phone || ''}</div>
                                <div style="color:gray;">${customer.email || ''}</div>
                            </td>
                            <td style="vertical-align:top; padding-top:10px; font-size:12px; line-height:1.5;">
                                ${itemsHtml}
                                <div style="margin-top:8px; font-weight:bold; font-size:14px;">Итого: ${o.total.toLocaleString('ru-RU')} ₽</div>
                            </td>
                            <td style="vertical-align:top; padding-top:10px; font-size:11px; line-height:1.4;">
                                ${delivery.type === 'PICKUP' ? 
                                    `<div style="padding:6px; background:#f4f9f5; border:1px dashed #187a30; border-radius:4px;">
                                        <b>Самовывоз (Атолл)</b><br>
                                        <span style="color:#187a30; font-size:12px;">Код: <b>${delivery.code}</b></span>
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
                } catch(e) { container.innerHTML = '<div style="color:red; font-size:12px;">Ошибка загрузки</div>'; console.error(e); }
            },

            updateRetailOrderStatus: async function(orderId, newStatus) {
                const token = localStorage.getItem('locus_token');
                try {
                    await fetch(LOCUS_API_URL + '?action=updateOrderStatus', {
                        method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'updateOrderStatus', orderId: orderId, status: newStatus })
                    });
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
                
                // Рефакторинг: получаем информацию о типе товара через единый центр
                const typeInfo = ProductManager.getTypeInfo(product);
                
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

                const existing = this.localCart.find(i => i.item === item && i.weight == weight && i.grind === grind);
                if(existing) existing.qty++;
                else this.localCart.push({ item, price: truePrice, weight: weight, qty: 1, grind: grind });
                
                this.saveCart(true);
                this.updateCartBadge();
                alert(`"${item}" (${weight} г, ${grind}) добавлен в корзину`);
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
                    this.updateCartTotals(); return;
                }
                
                this.localCart.forEach((p, idx) => {
                    const el = document.createElement('div');
                    el.className = 'cart-item-row';
                    
                    // Рефакторинг: получаем мета-данные через единый центр
                    const meta = ProductManager.getDisplayMeta(p.item, p.weight, p.grind);
                    const wDisplay = meta.weight ? ` ${meta.weight} г` : '';
                    const gDisplay = meta.grind ? ` <span style="font-size:10px; opacity:0.7; border:1px solid #ccc; padding:0 3px; border-radius:3px;">${meta.grind}</span>` : '';
                    
                    el.innerHTML = `
                        <div class="cart-item-info"><div class="cart-item-title">${p.item}${wDisplay}${gDisplay}</div><div class="cart-item-meta">${p.price} ₽</div></div>
                        <div class="cart-controls"><button class="qty-btn minus">-</button><span class="cart-qty">${p.qty}</span><button class="qty-btn plus">+</button></div>
                    `;
                    el.querySelector('.minus').onclick = () => this.updateItemQty(idx, -1);
                    el.querySelector('.plus').onclick = () => this.updateItemQty(idx, 1);
                    list.appendChild(el);
                });
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
                this.localCart[idx].qty += delta;
                if(this.localCart[idx].qty <= 0) this.localCart.splice(idx, 1);
                this.saveCart(true);
                this.updateCartBadge();
                this.renderCart();
                this.cdekInitialized = false;
                this.initCDEK();
            },

            updateCartTotals: function() {
                let subtotal = 0;
                this.localCart.forEach(i => subtotal += (i.price * i.qty));
                let discountPercent = 0;
                if(this.currentUser) {
                    discountPercent = Math.floor(this.currentUser.totalSpent / 3000);
                    if(discountPercent > 15) discountPercent = 15;
                }
                
                let loyaltyDiscountVal = Math.floor(subtotal * (discountPercent / 100));
                let totalAfterLoyalty = subtotal - loyaltyDiscountVal;
                // --- СКИДКА УДАЧИ ---
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
                totalAfterLoyalty -= fortuneDiscountVal; // Вычитаем удачу из Итого
                
                // Динамически добавляем строчку в интерфейс корзины
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
                if (rowFortune) {
                    if (fortuneDiscountVal > 0) {
                        rowFortune.style.display = 'flex';
                        document.getElementById('cart-fortune-val').textContent = `-${fortuneDiscountVal} ₽`;
                    } else {
                        rowFortune.style.display = 'none';
                    }
                }

                if (totalAfterLoyalty >= 3000) {
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

                let finalTotal = totalAfterLoyalty - promoDiscountVal + (this.cdekPrice || 0);
                if (finalTotal < 0) finalTotal = 1;

                const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
                setTxt('cart-subtotal', subtotal + ' ₽');
                setTxt('cart-discount-percent', discountPercent);
                setTxt('cart-discount-val', loyaltyDiscountVal + ' ₽');
                
                const shipValEl = document.getElementById('cart-shipping-val');
                if(shipValEl) {
                    if (this.cdekPrice === 0 && totalAfterLoyalty >= 3000) {
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

            // --- НАЧАЛО: ВАЛИДАЦИЯ И ОФОРМЛЕНИЕ ЗАКАЗА ---
            placeOrder: async function() {
                if(this.localCart.length === 0) return alert('Корзина пуста');
                if(!this.uid) return alert('Для оформления заказа нужно войти');
                
                const name = document.getElementById('order-name').value.trim();
                const phone = document.getElementById('order-phone').value.trim();
                const emailInput = document.getElementById('order-email');
                const email = emailInput ? emailInput.value.trim() : this.currentUser.email;
                const policy = document.getElementById('policy-check').checked;
                
                // СОХРАНЯЕМ ДАННЫЕ В БРАУЗЕРЕ (Задача 5)
                localStorage.setItem('locus_saved_name', name);
                localStorage.setItem('locus_saved_phone', phone);
                localStorage.setItem('locus_saved_email', email);

                // ЖЕСТКАЯ ВАЛИДАЦИЯ
                if(!name || !phone || !email) return alert('Заполните ФИО, телефон и e-mail');

                // ЖЕСТКАЯ ВАЛИДАЦИЯ
                if(!name || !phone || !email) return alert('Заполните ФИО, телефон и e-mail');
                
                const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-]{2,100}$/;
                if(!nameRegex.test(name)) {
                    return alert('Пожалуйста, введите корректное ФИО (без цифр и странных символов).');
                }

                const phoneDigits = phone.replace(/\D/g, '');
                if(phoneDigits.length < 10 || phoneDigits.length > 15 || /(.)\1{5,}/.test(phoneDigits)) {
                    return alert('Пожалуйста, введите корректный номер телефона.');
                }

                const isPickup = document.getElementById('self-pickup-checkbox')?.checked;
                
                // Проверяем: если не выбран самовывоз, значит должен быть СДЭК
                if (!isPickup && !this.cdekInfo) {
                    return alert('Пожалуйста, выберите пункт выдачи СДЭК или Самовывоз.');
                }
                
                // Оставляем проверку ручного ввода СДЭК (на случай если он используется)
                if(!isPickup && this.cdekInfo && this.cdekInfo.type === 'MANUAL') {
                    const addr = this.cdekInfo.address;
                    if(addr.length < 10 || !/[a-zA-Zа-яА-ЯёЁ]/.test(addr) || /(.)\1{4,}/.test(addr)) {
                        return alert('Пожалуйста, введите корректный и полный адрес доставки.');
                    }
                }

                if(!policy) return alert('Необходимо согласие с Политикой конфиденциальности');

                const btn = document.getElementById('btn-checkout');
                if(btn) { btn.disabled = true; btn.textContent = 'Обработка...'; }

                let subtotal = 0;
                this.localCart.forEach(i => subtotal += (i.price * i.qty));
                let discountPercent = Math.floor(this.currentUser.totalSpent / 3000);
                if(discountPercent > 15) discountPercent = 15;
                let total = subtotal - Math.floor(subtotal * (discountPercent / 100));

                let shippingCost = this.cdekPrice;
                if (total >= 3000) shippingCost = 0;

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

                    const orderData = {
                        id: orderId,
                        invId: invId,
                        total: total,
                        discountPercent: discountPercent,
                        promo: this.activePromo ? this.activePromo.code : '',
                        status: 'pending_payment',
                        customer: { name, phone, email: email },
                        delivery: isPickup ? { type: 'PICKUP', address: 'ТЦ Атолл, Октябрьская 27', code: this.currentPickupCode, finalCost: 0 } : { ...this.cdekInfo, finalCost: shippingCost },
                        items: this.localCart,
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
                        // ОЧИЩАЕМ ЛОКАЛЬНУЮ КОРЗИНУ ПЕРЕД ПЕРЕХОДОМ В РОБОКАССУ (Задача 1)
                        this.localCart = [];
                        localStorage.removeItem('locus_cart');
                        this.updateCartBadge();
                        
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
            // --- КОНЕЦ: ВАЛИДАЦИЯ И ОФОРМЛЕНИЕ ЗАКАЗА ---

            // --- НАЧАЛО: НОВАЯ АВТОРИЗАЦИЯ ЧЕРЕЗ YDB ---
                register: async function() {
                    const email = document.getElementById('reg-email')?.value; 
                    const pass = document.getElementById('reg-pass')?.value;
                    if(!email || !pass) return alert('Заполните поля');
                    try {
                        const res = await fetch(LOCUS_API_URL + '?action=register', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'register', email, password: pass })
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
                        
                        alert('Регистрация успешна!');
                    } catch (e) { alert('Ошибка: ' + e.message); }
                },

                login: async function() {
                    const email = document.getElementById('login-email')?.value; 
                    const pass = document.getElementById('login-pass')?.value;
                    if(!email || !pass) return alert('Заполните поля');
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

                logout: async function() {
                    localStorage.removeItem('locus_token');
                    this.currentUser = null; this.uid = null; this.localCart = []; 
                    this.saveCart(false); this.updateCartBadge(); this.updateUIState(); this.switchView('login');
                },
                // --- КОНЕЦ: НОВАЯ АВТОРИЗАЦИЯ ЧЕРЕЗ YDB ---

            updateUIState: function() {
                const txt = document.getElementById('auth-status-text'); if(txt) txt.textContent = this.uid ? 'Кабинет' : 'Войти';
                if(this.localCart.length > 0) this.updateCartTotals();
            },
            
            addToSubscription: async function(itemName, weight = 250, grind = "Зерно") {
                if(!this.uid) return alert("Для оформления подписки необходимо войти в Личный кабинет.");
                if(!this.currentUser.subscription) this.currentUser.subscription = [];
                
                const product = ALL_PRODUCTS_CACHE.find(p => (p.sample || p.sample_no || "").trim() === itemName.trim());
                if(!product) return alert("Ошибка товара: лот не найден в каталоге.");

                // Рефакторинг: получаем информацию о типе товара через единый центр
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
                
                alert(`Сорт "${itemName}" (${weight} г, ${grind}) добавлен в вашу подписку.`);
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
                            elNext.innerHTML = `Потрачено: <b>${safeSpent} ₽</b>.<br>До следующего % осталось: <b>${remainder} ₽</b><br><span style="font-size: 10px; opacity: 0.7; margin-top: 4px; display: inline-block;">Максимальная скидка - 15%.</span>`;
                        } 
                        else { elNext.textContent = 'Вы достигли максимальной скидки (15%)!';
                        }
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
                        if(!items || items.length === 0) { cont.innerHTML = '<div style="opacity:0.5; font-size:11px">Список пуст</div>'; return; }

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
                        const filteredItems = (u.history || []).filter(itemsFilterFn);
                        
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
                                    // Рефакторинг: получаем мета-данные через единый центр
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
                                    'pending_payment': '<span style="color:#B66A58;">Не оплачен</span>',
                                    'paid': '<span style="color:#187a30;">Оплачен</span>',
                                    'processing': '<span style="color:#8B7E66;">В сборке</span>',
                                    'shipped': '<span style="color:#187a30;">Отправлен</span>',
                                    'completed': '<span style="color:gray;">Выполнен</span>'
                                };
                                const displayStatus = hItem.status ? (statusMap[hItem.status] || hItem.status) : '<span style="color:#B66A58;">Не оплачен</span>';
                                // -----------------------------------
                                
                                let pickupHtml = '';
                                if (hItem.delivery && hItem.delivery.type === 'PICKUP') {
                                    pickupHtml = `
                                        <div style="margin-top:10px; margin-bottom:15px; padding:12px; background:#f4f9f5; border-radius:8px; border:1px dashed #187a30; display:flex; justify-content:space-between; align-items:center;">
                                            <div>
                                                <div style="font-size:11px; color:#187a30; font-weight:700; text-transform:uppercase;">Самовывоз (ТЦ Атолл)</div>
                                                <div style="font-size:11px; color:gray; margin-top:3px;">Код ячейки:</div>
                                            </div>
                                            <div style="font-size:22px; font-weight:bold; letter-spacing:2px; color:var(--locus-dark);">${hItem.delivery.code}</div>
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
                                    ${pickupHtml}
                                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                                        <button class="btn-small-reorder btn-repeat-order" style="padding:8px 15px; font-size:10px;">Повторить заказ</button>
                                        <button class="btn-small-reorder btn-remove-sub" style="font-size:12px; padding:8px 12px;">&times; Удалить</button>
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
                                
                                // Рефакторинг: получаем мета-данные через единый центр
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
                    renderOrdersList(histCont, h => !h.isWholesaleOrder, false); // Розничные
                    renderOrdersList(wsHistCont, h => h.isWholesaleOrder, true); // Оптовые
                    // -----------------------------------------------------------------
                    this.renderRecommendations();
                } catch(e) { console.error(e); }
            },
            // --- КОНЕЦ: ЗАМЕНА ОТОБРАЖЕНИЯ ЛК (ИСТОРИЯ) ---

            renderRecommendations: function() {
                const recContainer = document.getElementById('user-recommendations-list');
                if(!recContainer) return;
                recContainer.innerHTML = '';
                
                const history = this.currentUser?.history || [];
                if(history.length === 0) { recContainer.innerHTML = '<div style="font-size: 11px; opacity: 0.5;">Сделайте заказ для рекомендаций.</div>'; return; }

                let userDescriptors = new Set();
                history.forEach(hItem => {
                    const cleanName = hItem.item.split(' (')[0].trim();
                    const product = ALL_PRODUCTS_CACHE.find(p => p.sample.trim() === cleanName);
                    if(product && product.flavorNotes) {
                        product.flavorNotes.split(',').forEach(tag => {
                            const t = tag.trim().toLowerCase();
                            if(t) userDescriptors.add(t);
                        });
                    }
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
                    arrowSymbol = isDesktop ? '👈' : '👆'; 
                } else if (this.currentStep === 1) {
                    arrowSymbol = isDesktop ? '👉' : '👇'; 
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

                    // АДАПТИВНОЕ ПОЗИЦИОНИРОВАНИЕ (1 см от краев элемента)
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
                // 1. Делаем два запроса ПАРАЛЛЕЛЬНО для максимальной скорости загрузки
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
                
                catRes.data.forEach(r => {
                    const sName = r.sample_no || r.sample;
                    
                    if (sName) {
                        const extItem = extMap[sName.trim().toLowerCase()] || {};
                        const extData = extItem.form_data || {};

                        const getE = (key) => {
                            if (extData[key] !== undefined && String(extData[key]).trim() !== '') return extData[key];
                            return '';
                        };

                        const raw = { 
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
                            if (target) {
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
                        }
                    }

                    // ДОБАВЛЕНО: Чтение ссылки на разделы модального окна (Опт, Корзина и т.д.)
                    const viewFromUrl = urlParams.get('view');
                    if (viewFromUrl) {
                        if (viewFromUrl === 'wholesale') {
                            document.getElementById('btn-open-wholesale')?.click();
                        } else if (viewFromUrl === 'cart') {
                            document.getElementById('btn-open-cart')?.click();
                        } else if (viewFromUrl === 'login') {
                            document.getElementById('btn-open-lc')?.click();
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
        window.downloadPackSticker = function(stickerId, sampleName) {
            const stickerEl = document.getElementById(stickerId); // Ищем строго нужный макет
            if (!stickerEl) {
                alert('Ошибка: макет наклейки не найден на странице.');
                return;
            }
            
            if (typeof html2canvas === 'undefined') {
                alert('Модуль генерации изображений еще загружается, попробуйте через пару секунд.');
                return;
            }

            const originalBorder = stickerEl.style.border;
            stickerEl.style.border = 'none';

            html2canvas(stickerEl, {
                scale: 4, 
                backgroundColor: '#ffffff'
            }).then(canvas => {
                stickerEl.style.border = originalBorder;
                
                const link = document.createElement('a');
                link.download = `Sticker_${sampleName}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        };