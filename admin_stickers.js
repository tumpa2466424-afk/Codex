export function installAdminStickers(context) {
    const {
        UserSystem,
        CatalogSystem,
        ProductManager,
        LOCUS_API_URL,
        ensureHtml2CanvasLoaded
    } = context;

    const STICKER_EXPORT_DPI = 300;
    const STICKER_EXPORT_SIZES_MM = {
        front: { width: 80, height: 80 },
        back: { width: 60, height: 60 },
        back80: { width: 80, height: 80 }
    };

    let crc32Table = null;

    const supportsStickerExport = (product) => {
        return !!product && !ProductManager.getTypeInfo(product).isSpecial;
    };

    const getCatalogProductById = (productId) => {
        return (CatalogSystem.ALL_PRODUCTS || []).find(item => String(item.id) === String(productId)) || null;
    };

    const getStickerExportConfig = (side) => {
        return STICKER_EXPORT_SIZES_MM[side] || STICKER_EXPORT_SIZES_MM.front;
    };

    const mmToPrintPixels = (mm, dpi = STICKER_EXPORT_DPI) => {
        return Math.round((Number(mm) || 0) * dpi / 25.4);
    };

    const sanitizeStickerFileName = (value) => {
        const normalized = String(value || 'sticker')
            .replace(/[\\/:*?"<>|]+/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\s/g, '_');
        return normalized.slice(0, 80) || 'sticker';
    };

    const createStickerExportContainer = (product) => {
        const host = document.createElement('div');
        host.className = 'sticker-export-host';
        host.style.cssText = 'position:fixed; left:-10000px; top:0; pointer-events:none; background:#fff; padding:0; margin:0; z-index:-1;';
        host.innerHTML = `<div>${CatalogSystem.getViewHtml(product)}</div>`;
        document.body.appendChild(host);
        return host;
    };

    const createPackPreviewExportContainer = (product) => {
        const host = document.createElement('div');
        host.className = 'sticker-export-host';
        host.style.cssText = 'position:fixed; left:-10000px; top:0; pointer-events:none; background:transparent; padding:0; margin:0; z-index:-1; width:420px;';
        host.innerHTML = `
            <div id="coffee-shop-wheel" class="cs-widget-container" style="min-height:0; display:block; background:transparent;">
                <div class="info-area" style="padding:20px; height:auto; background:transparent;">
                    <div id="product-info" class="info-card active" style="transform:none; display:block;">
                        <div id="p-simple-desc" class="simple-desc">
                            ${CatalogSystem.getPackPreviewHtml(product)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(host);
        return host;
    };

    const waitForStickerRenderReady = async () => {
        if (document.fonts?.ready) {
            try {
                await document.fonts.ready;
            } catch (e) {}
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    };

    const waitForRenderImagesReady = async (rootEl) => {
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
    };

    const extractPrimaryFontFamily = (fontFamily) => {
        const raw = String(fontFamily || '').trim();
        if (!raw) return '';
        const firstPart = raw.split(',')[0]?.trim() || '';
        return firstPart.replace(/^['"]+|['"]+$/g, '').trim();
    };

    const ensureStickerExportFontReady = async (stickerEl) => {
        const computedFontFamily = window.getComputedStyle(stickerEl).fontFamily || '';
        const primaryFont = extractPrimaryFontFamily(computedFontFamily);
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
    };

    const lockStickerFontForRender = (stickerEl, fontFamily) => {
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
    };

    const getStickerSideFromElement = (stickerEl) => {
        if (stickerEl?.classList.contains('is-80')) return 'back80';
        return stickerEl?.classList.contains('locus-back-sticker-canvas') ? 'back' : 'front';
    };

    const getCrc32Table = () => {
        if (crc32Table) return crc32Table;
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c >>> 0;
        }
        crc32Table = table;
        return table;
    };

    const concatUint8Arrays = (...arrays) => {
        const totalLength = arrays.reduce((sum, arr) => sum + (arr?.length || 0), 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        arrays.forEach(arr => {
            if (!arr?.length) return;
            result.set(arr, offset);
            offset += arr.length;
        });
        return result;
    };

    const computeCrc32 = (bytes) => {
        const table = getCrc32Table();
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const createPngPhysChunk = (dpi) => {
        const pixelsPerMeter = Math.round(Number(dpi || STICKER_EXPORT_DPI) * 39.37007874);
        const chunkData = new Uint8Array(9);
        const dataView = new DataView(chunkData.buffer);
        dataView.setUint32(0, pixelsPerMeter);
        dataView.setUint32(4, pixelsPerMeter);
        chunkData[8] = 1;

        const chunkType = new TextEncoder().encode('pHYs');
        const crcInput = concatUint8Arrays(chunkType, chunkData);
        const crc = computeCrc32(crcInput);

        const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
        const chunkView = new DataView(chunk.buffer);
        chunkView.setUint32(0, chunkData.length);
        chunk.set(chunkType, 4);
        chunk.set(chunkData, 8);
        chunkView.setUint32(8 + chunkData.length, crc);
        return chunk;
    };

    const setPngBlobDpi = async (blob, dpi = STICKER_EXPORT_DPI) => {
        if (!blob) throw new Error('PNG-файл не создан');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (bytes.length < 8 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
            return blob;
        }

        const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const physChunk = createPngPhysChunk(dpi);
        let offset = 8;
        let insertOffset = 8;

        while (offset + 8 <= bytes.length) {
            const chunkLength = dataView.getUint32(offset);
            const chunkType = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
            const nextOffset = offset + 12 + chunkLength;
            if (chunkType === 'IHDR') insertOffset = nextOffset;
            if (chunkType === 'pHYs') {
                const updated = concatUint8Arrays(bytes.slice(0, offset), physChunk, bytes.slice(nextOffset));
                return new Blob([updated], { type: 'image/png' });
            }
            offset = nextOffset;
        }

        const updated = concatUint8Arrays(bytes.slice(0, insertOffset), physChunk, bytes.slice(insertOffset));
        return new Blob([updated], { type: 'image/png' });
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                resolve(result.includes(',') ? result.split(',')[1] : result);
            };
            reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
            reader.readAsDataURL(blob);
        });
    };

    const renderStickerElementToBlob = async (stickerEl, side = getStickerSideFromElement(stickerEl)) => {
        if (!stickerEl) throw new Error('Макет наклейки не найден.');
        await ensureHtml2CanvasLoaded();

        const exportConfig = getStickerExportConfig(side);
        const targetWidthPx = mmToPrintPixels(exportConfig.width);
        const originalBorderColor = stickerEl.style.borderColor;
        const computedStickerFontFamily = await ensureStickerExportFontReady(stickerEl);
        const unlockStickerFont = lockStickerFontForRender(stickerEl, computedStickerFontFamily);
        stickerEl.style.borderColor = 'transparent';

        try {
            await waitForStickerRenderReady();
            await waitForRenderImagesReady(stickerEl);
            const rect = stickerEl.getBoundingClientRect();
            const scale = rect.width > 0 ? targetWidthPx / rect.width : (STICKER_EXPORT_DPI / 96);
            const canvas = await html2canvas(stickerEl, {
                scale: Math.max(scale, 1),
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false
            });

            const pngBlob = await new Promise((resolve, reject) => {
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать PNG-файл.')), 'image/png');
            });
            return await setPngBlobDpi(pngBlob, STICKER_EXPORT_DPI);
        } finally {
            stickerEl.style.borderColor = originalBorderColor;
            unlockStickerFont();
        }
    };

    const renderPackPreviewToBlob = async (product) => {
        if (!product) throw new Error('Лот не найден.');
        await ensureHtml2CanvasLoaded();
        let host = null;
        try {
            host = createPackPreviewExportContainer(product);
            const packEl = host.querySelector('.product-pack-preview');
            if (!packEl) throw new Error('Не удалось собрать пачку с лицевой наклейкой.');

            const computedStickerFontFamily = await ensureStickerExportFontReady(packEl);
            const unlockStickerFont = lockStickerFontForRender(packEl, computedStickerFontFamily);

            await waitForStickerRenderReady();
            await waitForRenderImagesReady(packEl);

            const rect = packEl.getBoundingClientRect();
            const targetWidthPx = Math.max(Math.round((rect.width || 380) * 4), 1400);
            const scale = rect.width > 0 ? targetWidthPx / rect.width : 4;
            const canvas = await html2canvas(packEl, {
                scale: Math.max(scale, 1),
                backgroundColor: null,
                useCORS: true,
                logging: false
            });

            unlockStickerFont();

            return await new Promise((resolve, reject) => {
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать PNG-файл пачки.')), 'image/png');
            });
        } finally {
            if (host && host.parentNode) host.parentNode.removeChild(host);
        }
    };

    const downloadStickerElement = async (stickerEl, sampleName, side) => {
        const resolvedSide = side || getStickerSideFromElement(stickerEl);
        const pngBlob = await renderStickerElementToBlob(stickerEl, resolvedSide);
        const safeName = sanitizeStickerFileName(sampleName);
        const objectUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.download = `Sticker_${safeName}_300dpi.png`;
        link.href = objectUrl;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    };

    const sendStickerPackEmail = async (productId, event) => {
        const product = getCatalogProductById(productId);
        if (!supportsStickerExport(product)) {
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

            host = createStickerExportContainer(product);

            const frontStickerEl = host.querySelector('.locus-sticker-canvas');
            const backStickerEl = host.querySelector('.locus-back-sticker-canvas:not(.is-80)');
            const back80StickerEl = host.querySelector('.locus-back-sticker-canvas.is-80');

            if (!frontStickerEl || !backStickerEl || !back80StickerEl) {
                throw new Error('Не удалось собрать все наклейки для отправки.');
            }

            const [frontBlob, backBlob, back80Blob] = await Promise.all([
                renderStickerElementToBlob(frontStickerEl, 'front'),
                renderStickerElementToBlob(backStickerEl, 'back'),
                renderStickerElementToBlob(back80StickerEl, 'back80')
            ]);

            const safeBaseName = sanitizeStickerFileName(product.sample || 'lot');
            const [frontBase64, backBase64, back80Base64] = await Promise.all([
                blobToBase64(frontBlob),
                blobToBase64(backBlob),
                blobToBase64(back80Blob)
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
    };

    const methods = {
        supportsStickerExport,
        getCatalogProductById,
        getStickerExportConfig,
        mmToPrintPixels,
        sanitizeStickerFileName,
        createStickerExportContainer,
        createPackPreviewExportContainer,
        waitForStickerRenderReady,
        waitForRenderImagesReady,
        extractPrimaryFontFamily,
        ensureStickerExportFontReady,
        lockStickerFontForRender,
        getStickerSideFromElement,
        getCrc32Table,
        concatUint8Arrays,
        computeCrc32,
        createPngPhysChunk,
        setPngBlobDpi,
        blobToBase64,
        renderStickerElementToBlob,
        renderPackPreviewToBlob,
        downloadStickerElement,
        sendStickerPackEmail
    };

    Object.assign(UserSystem, {
        STICKER_EXPORT_DPI,
        STICKER_EXPORT_SIZES_MM,
        ...methods
    });
    Object.assign(CatalogSystem, {
        STICKER_EXPORT_DPI,
        STICKER_EXPORT_SIZES_MM,
        ...methods
    });
}
