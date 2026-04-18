export function installAdminCatalog(context) {
    const {
        CatalogSystem,
        ProductManager,
        UserSystem,
        YANDEX_FUNCTION_URL,
        LOCUS_API_URL,
        PALETTE_CONFIG,
        muteColor,
        getScale,
        getCurrentActiveProduct,
        getAllProductsCache,
        getShopData
    } = context;
    if (CatalogSystem.adminCatalogInstalled) return;
    CatalogSystem.adminCatalogInstalled = true;

    const allProductsCache = () => (typeof getAllProductsCache === 'function' ? (getAllProductsCache() || []) : []);
    const shopData = () => (typeof getShopData === 'function' ? (getShopData() || []) : []);
    const currentActiveProduct = () => (typeof getCurrentActiveProduct === 'function' ? getCurrentActiveProduct() : null);

    Object.assign(CatalogSystem, {
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
                                if (typeof shopData() !== 'undefined') {
                                    const foundCat = shopData().find(c => c.label === typeText);
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
                const fullProduct = (typeof allProductsCache() !== 'undefined' && Array.isArray(allProductsCache()))
                    ? allProductsCache().find(p => p.sample === r.sample)
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

                if (typeof allProductsCache() !== 'undefined' && Array.isArray(allProductsCache())) {
                    const sampleKey = String(product?.sample || product?.sample_no || '').trim();
                    if (sampleKey) {
                        const fullProduct = allProductsCache().find(p =>
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

                const fullProduct = (typeof allProductsCache() !== 'undefined' && Array.isArray(allProductsCache()))
                    ? allProductsCache().find(p => p.sample === r.sample)
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
                const fullProduct = (typeof allProductsCache() !== 'undefined') ? allProductsCache().find(p => p.sample === r.sample) : null;
                
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
                const cacheProduct = adminProduct ? allProductsCache().find(p => p.id === id || p.sample === adminProduct.sample) : null;
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
                const cacheProduct = adminProduct ? allProductsCache().find(p => p.id === id || p.sample === adminProduct.sample) : null;
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
                    const targetCacheProduct = allProductsCache().find(p => p.id === id || p.sample === targetSample);
                    if (targetCacheProduct) Object.assign(targetCacheProduct, localUpdate);

                    if (adminProduct) Object.assign(adminProduct, localUpdate);

                    const activeProduct = currentActiveProduct();
                    if (activeProduct && activeProduct.sample === targetSample) {
                        Object.assign(activeProduct, localUpdate);
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
                const prod = allProductsCache().find(p => p.sample === sampleName);
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
                                const fullProduct = (typeof allProductsCache() !== 'undefined' && Array.isArray(allProductsCache()))
                                    ? (allProductsCache().find(p => String(p?.id || '') === String(product.id || '')) || allProductsCache().find(p => String(p?.sample || '') === String(product.sample || '')))
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
    });
}
