const { Driver, getCredentialsFromEnv, TypedValues, TypedData } = require('ydb-sdk');
const { v4: uuidv4 } = require('uuid');
const querystring = require('querystring');

let driver;

async function getDriver() {
    if (!driver) {
        driver = new Driver({
            endpoint: process.env.YDB_ENDPOINT,
            database: process.env.YDB_DATABASE,
            authService: getCredentialsFromEnv(),
        });
        const timeout = 10000;
        if (!await driver.ready(timeout)) {
            throw new Error("Не удалось подключиться к YDB");
        }
    }
    return driver;
}

module.exports.handler = async function (event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    try {
        const dbDriver = await getDriver();
        const formType = event.queryStringParameters ? event.queryStringParameters.type : null;
        
        // 1. ПОЛУЧЕНИЕ КАТАЛОГА (Бронебойное слияние в памяти)
        if (event.httpMethod === 'GET' && formType === 'catalog') {
            let items = [];
            await dbDriver.tableClient.withSession(async (session) => {
                
                // А. Достаем все лоты из каталога
                const queryCvad = `SELECT * FROM cvad_results ORDER BY created_at DESC;`;
                const resultCvad = await session.executeQuery(queryCvad);
                let cvadItems = [];
                if (resultCvad.resultSets && resultCvad.resultSets.length > 0) {
                    cvadItems = TypedData.createNativeObjects(resultCvad.resultSets[0]);
                }

                // Б. Достаем цены из экстринсик формы
                const queryExt = `SELECT sample_no, raw_green_price FROM extrinsic_results;`;
                const resultExt = await session.executeQuery(queryExt);
                let extItems = [];
                if (resultExt.resultSets && resultExt.resultSets.length > 0) {
                    extItems = TypedData.createNativeObjects(resultExt.resultSets[0]);
                }

                // В. Собираем словарь цен по номеру лота
                const priceMap = {};
                extItems.forEach(e => {
                    if (e.sample_no) priceMap[e.sample_no] = e.raw_green_price;
                });

                // Г. Приклеиваем цену к каждому лоту
                items = cvadItems.map(item => {
                    item.raw_green_price = priceMap[item.sample_no] || 0;
                    return item;
                });
            });
            
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: items }) };
        }

        // Парсинг тела для POST запросов
        let bodyData = {};
        if (event.isBase64Encoded) {
            const decodedBody = Buffer.from(event.body, 'base64').toString('utf8');
            if (formType === 'cvaa' || formType === 'cvaext' || formType === 'catalog_update' || formType === 'catalog_delete' || formType === 'catalog_edit' || formType === 'catalog_duplicate') {
                bodyData = JSON.parse(decodedBody);
            } else {
                bodyData = querystring.parse(decodedBody);
            }
        } else if (event.body) {
            if (formType === 'cvaa' || formType === 'cvaext' || formType === 'catalog_update' || formType === 'catalog_delete' || formType === 'catalog_edit' || formType === 'catalog_duplicate') {
                bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } else {
                bodyData = querystring.parse(event.body);
            }
        }

        // 2. Обновление статуса
        if (formType === 'catalog_update') {
            await dbDriver.tableClient.withSession(async (session) => {
                const query = `
                    DECLARE $id AS Utf8; DECLARE $in_catalogue AS Utf8;
                    UPDATE cvad_results SET in_catalogue = $in_catalogue WHERE id = $id;
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(bodyData.id),
                    '$in_catalogue': TypedValues.utf8(bodyData.inCatalog || '')
                });
            });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // 3. Удаление лота
        if (formType === 'catalog_delete') {
            await dbDriver.tableClient.withSession(async (session) => {
                const query = `DECLARE $id AS Utf8; DELETE FROM cvad_results WHERE id = $id;`;
                await session.executeQuery(query, { '$id': TypedValues.utf8(bodyData.id) });
            });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // Дублирование лота
        if (formType === 'catalog_duplicate') {
            const newId = uuidv4();
            const createdAt = new Date().toISOString();
            
            await dbDriver.tableClient.withSession(async (session) => {
                // 1. Получаем оригинал из базы
                const querySelect = `DECLARE $orig_id AS Utf8; SELECT * FROM cvad_results WHERE id = $orig_id;`;
                const res = await session.executeQuery(querySelect, { '$orig_id': TypedValues.utf8(bodyData.id) });
                const rows = TypedData.createNativeObjects(res.resultSets[0]);
                
                if (rows.length > 0) {
                    const r = rows[0];
                    const duplicateSampleNo = (r.sample_no || '') + ' (Копия)';
                    // 2. Вставляем как новую запись с новым ID
                    const queryInsert = `
                        DECLARE $id AS Utf8; DECLARE $created_at AS Timestamp;
                        DECLARE $taster_name AS Utf8; DECLARE $cupping_date AS Utf8; DECLARE $purpose AS Utf8;
                        DECLARE $sample_no AS Utf8; DECLARE $roast_level AS Utf8; DECLARE $fragrance AS Utf8;
                        DECLARE $aroma AS Utf8; DECLARE $aroma_descriptors AS Utf8; DECLARE $aroma_notes AS Utf8;
                        DECLARE $flavor AS Utf8; DECLARE $aftertaste AS Utf8; DECLARE $flavor_descriptors AS Utf8;
                        DECLARE $main_tastes AS Utf8; DECLARE $flavor_notes AS Utf8; DECLARE $acidity AS Utf8;
                        DECLARE $acidity_notes AS Utf8; DECLARE $sweetness AS Utf8; DECLARE $sweetness_notes AS Utf8;
                        DECLARE $mouthfeel AS Utf8; DECLARE $mouthfeel_descriptors AS Utf8; DECLARE $mouthfeel_notes AS Utf8;
                        DECLARE $in_catalogue AS Utf8;
                        DECLARE $category AS Utf8; DECLARE $price AS Utf8;
                        
                        INSERT INTO cvad_results (id, created_at, taster_name, cupping_date, purpose, sample_no, roast_level, fragrance, aroma, aroma_descriptors, aroma_notes, flavor, aftertaste, flavor_descriptors, main_tastes, flavor_notes, acidity, acidity_notes, sweetness, sweetness_notes, mouthfeel, mouthfeel_descriptors, mouthfeel_notes, in_catalogue, category, price)
                        VALUES ($id, $created_at, $taster_name, $cupping_date, $purpose, $sample_no, $roast_level, $fragrance, $aroma, $aroma_descriptors, $aroma_notes, $flavor, $aftertaste, $flavor_descriptors, $main_tastes, $flavor_notes, $acidity, $acidity_notes, $sweetness, $sweetness_notes, $mouthfeel, $mouthfeel_descriptors, $mouthfeel_notes, $in_catalogue, $category, $price);
                    `;
                    
                    await session.executeQuery(queryInsert, {
                        '$id': TypedValues.utf8(newId),
                        '$created_at': TypedValues.timestamp(new Date(createdAt)),
                        '$taster_name': TypedValues.utf8(r.taster_name || ''),
                        '$cupping_date': TypedValues.utf8(r.cupping_date || ''),
                        '$purpose': TypedValues.utf8(r.purpose || ''),
                        '$sample_no': TypedValues.utf8(duplicateSampleNo),
                        '$roast_level': TypedValues.utf8(r.roast_level || ''),
                        '$fragrance': TypedValues.utf8(r.fragrance || ''),
                        '$aroma': TypedValues.utf8(r.aroma || ''),
                        '$aroma_descriptors': TypedValues.utf8(r.aroma_descriptors || ''),
                        '$aroma_notes': TypedValues.utf8(r.aroma_notes || ''),
                        '$flavor': TypedValues.utf8(r.flavor || ''),
                        '$aftertaste': TypedValues.utf8(r.aftertaste || ''),
                        '$flavor_descriptors': TypedValues.utf8(r.flavor_descriptors || ''),
                        '$main_tastes': TypedValues.utf8(r.main_tastes || ''),
                        '$flavor_notes': TypedValues.utf8(r.flavor_notes || ''),
                        '$acidity': TypedValues.utf8(r.acidity || ''),
                        '$acidity_notes': TypedValues.utf8(r.acidity_notes || ''),
                        '$sweetness': TypedValues.utf8(r.sweetness || ''),
                        '$sweetness_notes': TypedValues.utf8(r.sweetness_notes || ''),
                        '$mouthfeel': TypedValues.utf8(r.mouthfeel || ''),
                        '$mouthfeel_descriptors': TypedValues.utf8(r.mouthfeel_descriptors || ''),
                        '$mouthfeel_notes': TypedValues.utf8(r.mouthfeel_notes || ''),
                        '$in_catalogue': TypedValues.utf8(r.in_catalogue || ''),
                        '$in_catalogue': TypedValues.utf8(r.in_catalogue || ''),
                        '$category': TypedValues.utf8(r.category || ''),
                        '$price': TypedValues.utf8(r.price || ''),
                        '$image_url': TypedValues.utf8(bodyData.imageUrl || ''),
                    '$custom_desc': TypedValues.utf8(bodyData.customDesc || '')
                    });

                    const extQuery = `
                        DECLARE $sample_no AS Utf8;
                        SELECT sample_no, raw_green_price, form_data
                        FROM extrinsic_results
                        WHERE sample_no = $sample_no;
                    `;
                    const extRes = await session.executeQuery(extQuery, {
                        '$sample_no': TypedValues.utf8(r.sample_no || '')
                    });
                    const extRows = TypedData.createNativeObjects(extRes.resultSets[0]);

                    if (extRows.length > 0) {
                        const extRow = extRows[0];
                        let formData = extRow.form_data || extRow.formdata || {};

                        if (typeof formData === 'string') {
                            try {
                                formData = JSON.parse(formData);
                            } catch (e) {
                                formData = {};
                            }
                        }

                        if (!formData || typeof formData !== 'object') formData = {};
                        formData['Sample No'] = duplicateSampleNo;

                        const extInsertQuery = `
                            DECLARE $sample_no AS Utf8;
                            DECLARE $created_at AS Timestamp;
                            DECLARE $raw_green_price AS Double;
                            DECLARE $form_data AS JsonDocument;

                            UPSERT INTO extrinsic_results (sample_no, created_at, raw_green_price, form_data)
                            VALUES ($sample_no, $created_at, $raw_green_price, $form_data);
                        `;

                        await session.executeQuery(extInsertQuery, {
                            '$sample_no': TypedValues.utf8(duplicateSampleNo),
                            '$created_at': TypedValues.timestamp(new Date(createdAt)),
                            '$raw_green_price': TypedValues.double(Number(extRow.raw_green_price || extRow.rawgreenprice) || 0),
                            '$form_data': TypedValues.jsonDocument(JSON.stringify(formData))
                        });
                    }
                }
            });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // Обновление всей информации о лоте (Редактирование)
        if (formType === 'catalog_edit') {
            await dbDriver.tableClient.withSession(async (session) => {
                const query = `
                    DECLARE $id AS Utf8;
                    DECLARE $cupping_date AS Utf8;
                    DECLARE $sample_no AS Utf8;
                    DECLARE $roast_level AS Utf8;
                    DECLARE $fragrance AS Utf8;
                    DECLARE $aroma AS Utf8;
                    DECLARE $aroma_descriptors AS Utf8;
                    DECLARE $aroma_notes AS Utf8;
                    DECLARE $flavor AS Utf8;
                    DECLARE $aftertaste AS Utf8;
                    DECLARE $flavor_descriptors AS Utf8;
                    DECLARE $main_tastes AS Utf8;
                    DECLARE $flavor_notes AS Utf8;
                    DECLARE $acidity AS Utf8;
                    DECLARE $acidity_notes AS Utf8;
                    DECLARE $sweetness AS Utf8;
                    DECLARE $sweetness_notes AS Utf8;
                    DECLARE $mouthfeel AS Utf8;
                    DECLARE $mouthfeel_descriptors AS Utf8;
                    DECLARE $mouthfeel_notes AS Utf8;
                    DECLARE $category AS Utf8; DECLARE $price AS Utf8;
                    DECLARE $image_url AS Utf8; DECLARE $custom_desc AS Utf8;

                    UPDATE cvad_results SET
                        cupping_date = $cupping_date, sample_no = $sample_no, roast_level = $roast_level,
                        fragrance = $fragrance, aroma = $aroma, aroma_descriptors = $aroma_descriptors, aroma_notes = $aroma_notes,
                        flavor = $flavor, aftertaste = $aftertaste, flavor_descriptors = $flavor_descriptors,
                        main_tastes = $main_tastes, flavor_notes = $flavor_notes, acidity = $acidity,
                        acidity_notes = $acidity_notes, sweetness = $sweetness, sweetness_notes = $sweetness_notes,
                        mouthfeel = $mouthfeel, mouthfeel_descriptors = $mouthfeel_descriptors, mouthfeel_notes = $mouthfeel_notes,
                        category = $category, price = $price, image_url = $image_url, custom_desc = $custom_desc
                    WHERE id = $id;
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(bodyData.id),
                    '$cupping_date': TypedValues.utf8(bodyData.cuppingDate || ''),
                    '$sample_no': TypedValues.utf8(bodyData.sample || ''),
                    '$roast_level': TypedValues.utf8(String(bodyData.roast || '')),
                    '$fragrance': TypedValues.utf8(String(bodyData.smellInt || '')),
                    '$aroma': TypedValues.utf8(String(bodyData.aromaInt || '')),
                    '$aroma_descriptors': TypedValues.utf8(bodyData.aromaDesc || ''),
                    '$aroma_notes': TypedValues.utf8(bodyData.aromaNotes || ''),
                    '$flavor': TypedValues.utf8(String(bodyData.flavorInt || '')),
                    '$aftertaste': TypedValues.utf8(String(bodyData.atInt || '')),
                    '$flavor_descriptors': TypedValues.utf8(bodyData.flavorDesc || ''),
                    '$main_tastes': TypedValues.utf8(bodyData.mainFlavors || ''),
                    '$flavor_notes': TypedValues.utf8(bodyData.flavorNotes || ''),
                    '$acidity': TypedValues.utf8(String(bodyData.acidInt || '')),
                    '$acidity_notes': TypedValues.utf8(bodyData.acidNotes || ''),
                    '$sweetness': TypedValues.utf8(String(bodyData.sweetInt || '')),
                    '$sweetness_notes': TypedValues.utf8(bodyData.sweetNotes || ''),
                    '$mouthfeel': TypedValues.utf8(String(bodyData.bodyInt || '')),
                    '$mouthfeel_descriptors': TypedValues.utf8(bodyData.bodyDesc || ''),
                    '$mouthfeel_notes': TypedValues.utf8(bodyData.bodyNotes || ''),
                    '$mouthfeel_notes': TypedValues.utf8(bodyData.bodyNotes || ''),
                    '$category': TypedValues.utf8(bodyData.category || ''),
                    '$price': TypedValues.utf8(String(bodyData.price || '')),
                    '$image_url': TypedValues.utf8(bodyData.imageUrl || ''),
                    '$custom_desc': TypedValues.utf8(bodyData.customDesc || '')
                });
            });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        const id = uuidv4();
        const createdAt = new Date().toISOString();

        await dbDriver.tableClient.withSession(async (session) => {
            // 4. Добавление CVA Descriptive
            if (formType === 'cvad') {
                const query = `
                    DECLARE $id AS Utf8; DECLARE $created_at AS Timestamp;
                    DECLARE $taster_name AS Utf8; DECLARE $cupping_date AS Utf8; DECLARE $purpose AS Utf8;
                    DECLARE $sample_no AS Utf8; DECLARE $roast_level AS Utf8; DECLARE $fragrance AS Utf8;
                    DECLARE $aroma AS Utf8; DECLARE $aroma_descriptors AS Utf8; DECLARE $aroma_notes AS Utf8;
                    DECLARE $flavor AS Utf8; DECLARE $aftertaste AS Utf8; DECLARE $flavor_descriptors AS Utf8;
                    DECLARE $main_tastes AS Utf8; DECLARE $flavor_notes AS Utf8; DECLARE $acidity AS Utf8;
                    DECLARE $acidity_notes AS Utf8; DECLARE $sweetness AS Utf8; DECLARE $sweetness_notes AS Utf8;
                    DECLARE $mouthfeel AS Utf8; DECLARE $mouthfeel_descriptors AS Utf8; DECLARE $mouthfeel_notes AS Utf8;
                    DECLARE $in_catalogue AS Utf8;
                    DECLARE $category AS Utf8; DECLARE $price AS Utf8;
                    INSERT INTO cvad_results (id, created_at, taster_name, cupping_date, purpose, sample_no, roast_level, fragrance, aroma, aroma_descriptors, aroma_notes, flavor, aftertaste, flavor_descriptors, main_tastes, flavor_notes, acidity, acidity_notes, sweetness, sweetness_notes, mouthfeel, mouthfeel_descriptors, mouthfeel_notes, in_catalogue, category, price)
                    VALUES ($id, $created_at, $taster_name, $cupping_date, $purpose, $sample_no, $roast_level, $fragrance, $aroma, $aroma_descriptors, $aroma_notes, $flavor, $aftertaste, $flavor_descriptors, $main_tastes, $flavor_notes, $acidity, $acidity_notes, $sweetness, $sweetness_notes, $mouthfeel, $mouthfeel_descriptors, $mouthfeel_notes, $in_catalogue, $category, $price);
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(id), '$created_at': TypedValues.timestamp(new Date(createdAt)),
                    '$taster_name': TypedValues.utf8(bodyData['Name'] || ''), '$cupping_date': TypedValues.utf8(bodyData['Date'] || ''),
                    '$purpose': TypedValues.utf8(bodyData['Purpose'] || ''), '$sample_no': TypedValues.utf8(bodyData['Sample No'] || ''),
                    '$roast_level': TypedValues.utf8(String(bodyData['Roast Level'] || '')), '$fragrance': TypedValues.utf8(String(bodyData['Fragrance'] || '')),
                    '$aroma': TypedValues.utf8(String(bodyData['Aroma'] || '')), '$aroma_descriptors': TypedValues.utf8(bodyData['Aroma Descriptors'] || ''),
                    '$aroma_notes': TypedValues.utf8(bodyData['Aroma Notes'] || ''), '$flavor': TypedValues.utf8(String(bodyData['Flavor'] || '')),
                    '$aftertaste': TypedValues.utf8(String(bodyData['Aftertaste'] || '')), '$flavor_descriptors': TypedValues.utf8(bodyData['Flavor Descriptors'] || ''),
                    '$main_tastes': TypedValues.utf8(bodyData['Main Tastes'] || ''), '$flavor_notes': TypedValues.utf8(bodyData['Flavor Notes'] || ''),
                    '$acidity': TypedValues.utf8(String(bodyData['Acidity'] || '')), '$acidity_notes': TypedValues.utf8(bodyData['Acidity Notes'] || ''),
                    '$sweetness': TypedValues.utf8(String(bodyData['Sweetness'] || '')), '$sweetness_notes': TypedValues.utf8(bodyData['Sweetness Notes'] || ''),
                    '$mouthfeel': TypedValues.utf8(String(bodyData['Mouthfeel'] || '')), '$mouthfeel_descriptors': TypedValues.utf8(bodyData['Mouthfeel Descriptors'] || ''),
                    '$mouthfeel_notes': TypedValues.utf8(bodyData['Mouthfeel Notes'] || ''), '$in_catalogue': TypedValues.utf8(bodyData['In Cataloque'] || ''),
                    '$category': TypedValues.utf8(''), '$price': TypedValues.utf8(''), '$image_url': TypedValues.utf8(bodyData.imageUrl || ''),
                    '$custom_desc': TypedValues.utf8(bodyData.customDesc || '')
                });
            } 
            // 5. Добавление CVA Affective
            else if (formType === 'cvaa') {
                const query = `
                    DECLARE $id AS Utf8; DECLARE $created_at AS Timestamp;
                    DECLARE $fio AS Utf8; DECLARE $email AS Utf8; DECLARE $lot AS Utf8; DECLARE $goal AS Utf8;
                    DECLARE $fragrance_score AS Utf8; DECLARE $fragrance_text AS Utf8; DECLARE $aroma_score AS Utf8; DECLARE $aroma_text AS Utf8;
                    DECLARE $bouquet_score AS Utf8; DECLARE $bouquet_text AS Utf8; DECLARE $aftertaste_score AS Utf8; DECLARE $aftertaste_text AS Utf8;
                    DECLARE $acidity_score AS Utf8; DECLARE $acidity_text AS Utf8; DECLARE $sweetness_score AS Utf8; DECLARE $sweetness_text AS Utf8;
                    DECLARE $tactility_score AS Utf8; DECLARE $tactility_text AS Utf8; DECLARE $overall_score AS Utf8; DECLARE $overall_text AS Utf8;
                    DECLARE $analytical_report AS Utf8;
                    INSERT INTO cvaa_results (id, created_at, fio, email, lot, goal, fragrance_score, fragrance_text, aroma_score, aroma_text, bouquet_score, bouquet_text, aftertaste_score, aftertaste_text, acidity_score, acidity_text, sweetness_score, sweetness_text, tactility_score, tactility_text, overall_score, overall_text, analytical_report)
                    VALUES ($id, $created_at, $fio, $email, $lot, $goal, $fragrance_score, $fragrance_text, $aroma_score, $aroma_text, $bouquet_score, $bouquet_text, $aftertaste_score, $aftertaste_text, $acidity_score, $acidity_text, $sweetness_score, $sweetness_text, $tactility_score, $tactility_text, $overall_score, $overall_text, $analytical_report);
                `;
                await session.executeQuery(query, {
                    '$id': TypedValues.utf8(id), '$created_at': TypedValues.timestamp(new Date(createdAt)),
                    '$fio': TypedValues.utf8(bodyData.fio || ''), '$email': TypedValues.utf8(bodyData.email || ''),
                    '$lot': TypedValues.utf8(bodyData.lot || ''), '$goal': TypedValues.utf8(bodyData.goal || ''),
                    '$fragrance_score': TypedValues.utf8(String(bodyData.fragrance_score || '')), '$fragrance_text': TypedValues.utf8(bodyData.fragrance_text || ''),
                    '$aroma_score': TypedValues.utf8(String(bodyData.aroma_score || '')), '$aroma_text': TypedValues.utf8(bodyData.aroma_text || ''),
                    '$bouquet_score': TypedValues.utf8(String(bodyData.bouquet_score || '')), '$bouquet_text': TypedValues.utf8(bodyData.bouquet_text || ''),
                    '$aftertaste_score': TypedValues.utf8(String(bodyData.aftertaste_score || '')), '$aftertaste_text': TypedValues.utf8(bodyData.aftertaste_text || ''),
                    '$acidity_score': TypedValues.utf8(String(bodyData.acidity_score || '')), '$acidity_text': TypedValues.utf8(bodyData.acidity_text || ''),
                    '$sweetness_score': TypedValues.utf8(String(bodyData.sweetness_score || '')), '$sweetness_text': TypedValues.utf8(bodyData.sweetness_text || ''),
                    '$tactility_score': TypedValues.utf8(String(bodyData.tactility_score || '')), '$tactility_text': TypedValues.utf8(bodyData.tactility_text || ''),
                    '$overall_score': TypedValues.utf8(String(bodyData.overall_score || '')), '$overall_text': TypedValues.utf8(bodyData.overall_text || ''),
                    '$analytical_report': TypedValues.utf8(bodyData.analytical_report || '')
                });
            }
            // 6. ДОБАВЛЕНИЕ EXTRINSIC ФОРМЫ (ЦЕНА И ВСЕ ДАННЫЕ)
            else if (formType === 'cvaext') {
                const query = `
                    DECLARE $sample_no AS Utf8; DECLARE $created_at AS Timestamp;
                    DECLARE $raw_green_price AS Double; DECLARE $form_data AS JsonDocument;
                    
                    UPSERT INTO extrinsic_results (sample_no, created_at, raw_green_price, form_data)
                    VALUES ($sample_no, $created_at, $raw_green_price, $form_data);
                `;
                
                const sampleNo = bodyData['Sample No'] || '';
                
                // УМНЫЙ ПОИСК ЦЕНЫ: сначала смотрим Farm Gate Price, если там пусто — смотрим Other_Trading
                let rawPriceStr = bodyData['Farm Gate Price'] || bodyData['Other_Trading'] || '0';
                
                // ИСПРАВЛЕНИЕ ЗАПЯТОЙ: меняем запятую на точку (15,5 -> 15.5) и удаляем буквы, если они есть
                rawPriceStr = String(rawPriceStr).replace(',', '.').replace(/[^0-9.-]+/g, "");
                const rawPrice = parseFloat(rawPriceStr) || 0;

                await session.executeQuery(query, {
                    '$sample_no': TypedValues.utf8(sampleNo),
                    '$created_at': TypedValues.timestamp(new Date(createdAt)),
                    '$raw_green_price': TypedValues.double(rawPrice),
                    '$form_data': TypedValues.jsonDocument(JSON.stringify(bodyData))
                });
            }
            else {
                throw new Error("Неизвестный тип формы. Укажите ?type=cvad, ?type=cvaa или ?type=cvaext");
            }
        });

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("Ошибка:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
    }
};
