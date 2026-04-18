export function installAdminContracts(context) {
    const { UserSystem, LOCUS_API_URL } = context;
    if (UserSystem.adminContractsInstalled) return;
    UserSystem.adminContractsInstalled = true;

    Object.assign(UserSystem, {
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
    });
}
