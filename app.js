const DEFAULT_ACCOUNT_ID = '';
const IS_DIRECT_FILE = window.location.protocol === 'file:';
const RANKED_LOBBY = 7;
const SESSION_GAP_SECONDS = 90 * 60;

const state = {
  accountId: null,
  provider: null,
  profile: null,
  matches: [],
  heroMap: {},
  itemMap: {},
  analytics: null,
  diagnostics: null,
  steamId64: null,
  steamKey: '',
  roleOverrides: {},
  ratingAuto: {},
  ratingManual: {},
  remoteState: {available:false, loaded:false, found:false, syncing:false, updatedAt:null},
  bundleMeta: {},
  benchmark: {data:null, loading:false, heroId:null, role:null, peerSkill:null, durationMode:'auto'},
  deep: {matchId:null, loading:false, data:null},
  lang: localStorage.getItem('dotaSkillLab.lang') || 'ru',
  scope: localStorage.getItem('dotaSkillLab.matchScope') || 'ranked'
};

const $ = id => document.getElementById(id);
const els = {
  input: $('playerInput'), load: $('loadBtn'), refresh: $('refreshBtn'), historyLimit: $('historyLimit'), matchScope: $('matchScope'),
  status: $('connectionStatus'), error: $('errorBox'), setup: $('setupCard'), profileStrip: $('profileStrip'),
  avatar: $('avatar'), profileName: $('profileName'), profileMeta: $('profileMeta'), datasetChip: $('datasetChip'),
  matchesBody: $('matchesBody'), resultFilter: $('resultFilter'), roleFilter: $('roleFilter'), heroesGrid: $('heroesGrid'),
  sourceStatus: $('sourceStatus'), steamFallback: $('steamFallback'), steamKey: $('steamKeyInput'), steamLoad: $('steamLoadBtn'),
  rememberSteamKey: $('rememberSteamKey'), exportBtn: $('exportBtn'), ratingBtn: $('ratingBtn'), switchProfile: $('switchProfileBtn'), modalBox: $('modalBox')
};

const I18N = {
  ru: {
    brandSubtitle:'Product UI Final · v16', navOverview:'Обзор', navCoach:'Тренер', navMatches:'Матчи', navPatterns:'Паттерны', navSessions:'Сессии', navHeroes:'Герои', navMistakes:'Ошибки', navTraining:'Тренировка', navProgress:'Прогресс',
    analysisMethod:'Метод анализа', analysisMethodShort:'Рейтинг + роли + персональная база сравнения', analysisMethodDesc:'По умолчанию анализируются только рейтинговые матчи. Все выводы привязаны к роли, выборке и уровню уверенности.',
    personalCoach:'Личный тренер по Dota 2', dashboardTitle:'Панель развития игрока', connecting:'Подключение…', profileDepth:'Профиль и глубина анализа',
    setupDesc:'Для тренерской аналитики рекомендуем 200 последних рейтинговых матчей. Обычные матчи можно включить отдельно.', scopeRanked:'Только рейтинговые', scopeAll:'Все матчи',
    loadAnalytics:'Загрузить аналитику', rankedHint:'При выборе рейтинговых матчей сервер пролистывает историю до тех пор, пока не соберёт указанное количество таких игр.', checkingSources:'Проверяю источники…',
    mainSource:'Основной источник', steamReason:'Нужен ваш ключ Steam Web API.', loadViaSteam:'Загрузить через Steam', rememberKey:'Сохранить ключ только в этом браузере', doNotSendKey:'Ключ в чат не отправляйте.', keyLocal:'Он используется локально для запросов к api.steampowered.com.',
    rankMmr:'Ранг / MMR', exportJson:'Экспорт JSON', refresh:'Обновить', matchesAnalyzed:'Матчей в анализе', winrate:'Винрейт', avgKda:'Средний KDA', noWinLossDirect:'победа/поражение не входит напрямую в оценку', avgDeaths:'Средние смерти', last20VsHistory:'последние 20 против вашей истории', mainRole:'Основная роль', currentRank:'Текущий ранг', currentMmr:'Текущий MMR', coachScore:'Оценка тренера',
    playerDna:'Профиль игрока', currentFormProfile:'Профиль текущей формы', last20:'последние 20 матчей', dnaNote:'Индексы показывают текущую форму относительно вашей собственной истории, а не глобальный процентиль.', currentFocus:'Текущий фокус', trainingPriority:'Главный тренировочный приоритет', loadingData:'Загружаю данные…', form:'Форма', last20Matches:'Последние 20 матчей', victoryShort:'В', defeatShort:'П', roleMixLabel:'Распределение ролей', roleDistribution:'Распределение ролей', performanceLabel:'Оценка игры', recentMatchScores:'Оценка последних матчей', heroPoolLabel:'Пул героев', topHeroesBySample:'Лучшие герои по объёму данных',
    matches:'Матчи', historyPerformance:'История и оценка игры', allResults:'Все результаты', wins:'Победы', losses:'Поражения', allRoles:'Все роли', match:'Матч', hero:'Герой', role:'Роль', result:'Результат', date:'Дата', mmrDelta:'Изм. MMR', scoreLabel:'Оценка', matchOpenHint:'Нажмите «Открыть матч», чтобы увидеть оба пика, счёт, всех 10 игроков, предметы и полную доступную статистику матча.', openMatch:'Открыть матч', analyzeMistakes:'Анализ ошибок',
    patternEngine:'Движок паттернов', personalThresholds:'Персональные пороги и связи с результатом', patternNotice:'Это <strong>статистические связи</strong>, а не доказательство причины поражения. Чем больше выборка, тем выше доверие к выводу.', heroRolePatterns:'Герой + роль', heroRoleFindings:'Сильнейшие паттерны по вашим героям',
    sessionAnalytics:'Анализ сессий', sessionTitle:'Как меняется качество игры внутри сессии', gameInSession:'Номер игры в сессии', sessionPositionTitle:'Результаты по порядку игр', afterLosses:'После поражений', lossStreakTitle:'Следующая игра после серии поражений', sessionCoach:'Рекомендация по сессиям', sessionRecommendation:'Что показывает ваша статистика',
    heroCoach:'Тренер по героям', heroesConsistency:'Герои и устойчивость результатов', mistakeEngine:'Движок ошибок', repeatingPatterns:'Повторяющиеся паттерны', mistakeNotice:'Важно: v12 показывает <strong>статистические ассоциации</strong>, а не доказывает причинность. Анализ строится на выбранном наборе матчей.', matchReview:'Разбор матча', selectMatch:'Выберите матч', selectMatchHint:'Откройте матч в разделе «Матчи» и выберите «Анализ ошибок».',
    trainingCoach:'Тренировочный тренер', oneGoalAtTime:'Одна задача за раз', activeBlock:'Активный блок', startFive:'Начать блок на 5 матчей', resetBlock:'Сбросить блок', personalJournal:'Личный журнал', journalHint:'После игровой сессии фиксируйте один вывод, который можно проверить в следующих матчах.', saveNote:'Сохранить заметку', progressLabel:'Прогресс', last20VsPrevious:'Последние 20 против предыдущих 20', trendLabel:'Динамика', coachScoreBlocks:'Оценка тренера по блокам из 10 матчей', dataQuality:'Качество данных', findingReliability:'Надёжность текущих выводов',
    ranked:'РЕЙТИНГ', unranked:'ОБЫЧНЫЙ', victory:'ПОБЕДА', defeat:'ПОРАЖЕНИЕ', saved:'Сохранено', loading:'Загрузка…', importing:'Импортирую…', needSteamKey:'Нужен ключ Steam API', loadError:'Ошибка загрузки', steamUnavailable:'Steam API недоступен в этой сети', steamAvailable:'Steam API доступен', opendotaAvailable:'OpenDota доступен', opendotaBlocked:'OpenDota заблокирован/недоступен', networkDiagFailed:'Не удалось выполнить диагностику сети',
    latestFirst:'Сортировка: самые новые матчи сверху', rankedDataset:'рейтинговых', allDataset:'всех', matchesWord:'матчей', scanned:'просканировано', lowRole:'ролей с низкой уверенностью', sourceSteam:'Источник: Steam API', cloudSyncOn:'Профиль синхронизируется', cloudSyncLocal:'Настройки только на этом устройстве',
    roleManual:'подтверждено вручную', roleExplicit:'роль из данных Steam', roleHeuristic:'авто: экономика команды', confidenceHigh:'высокая', confidenceMedium:'средняя', confidenceLow:'низкая', noData:'Недостаточно данных', wait:'ОЖИДАНИЕ', active:'АКТИВНО', ready:'ГОТОВО', trainingFocus:'Фокус', nextFiveRole:'5 следующих матчей на этой роли. Проверяется одна измеримая задача.', progress:'Прогресс', completed:'выполнено', blockFixed:'закреплено', repeatBlock:'повторить', startBlockHint:'Нажмите «Начать блок», и сайт зафиксирует текущий последний матч. Следующие 5 матчей этой роли будут оцениваться по цели.', pass:'ВЫПОЛНЕНО', miss:'НЕ ВЫПОЛНЕНО', gameWord:'Игра',
    ratingTitle:'Ранг и MMR', ratingAutoTitle:'Автоматические данные', ratingManualTitle:'Ручной снимок', ratingAutoUnavailable:'Текущий публичный Steam Web API не передал медаль/MMR и изменения рейтинга. Поэтому точные значения автоматически получить из этого источника нельзя. Можно один раз сохранить текущий ранг и MMR вручную из клиента Dota 2.', medal:'Медаль', star:'Звезда', mmr:'MMR', saveRating:'Сохранить', clearRating:'Очистить ручные данные', ratingSaved:'Ранг/MMR сохранены локально.', manualSnapshot:'ручной снимок', steamRatingFields:'поля рейтинга Steam', ratingUnavailable:'нет данных в текущем Steam Web API', deltaLast20:'MMR за последние 20', exactRankNote:'Значок ниже является локальным отображением выбранной медали; это не официальное изображение Valve.',
    medalHerald:'Рекрут', medalGuardian:'Страж', medalCrusader:'Рыцарь', medalArchon:'Герой', medalLegend:'Легенда', medalAncient:'Властелин', medalDivine:'Божество', medalImmortal:'Титан', uncalibrated:'Нет данных',
    depthHigh:'ВЫСОКАЯ', depthMedium:'СРЕДНЯЯ', depthLow:'НИЗКАЯ', historyDepth:'Глубина истории', autoRoleLow:'Авто-роли с низкой уверенностью', manualRoleCorrections:'Ручных корректировок роли', topMistakeConfidence:'Уверенность главной ошибки', dataQualityNote:'Чем точнее роли и длиннее рейтинговая история, тем надёжнее пороги, процентили и приоритеты ошибок.', rankedLabel:'Рейтинговые',
    matchesLabel:'Матчи', deathsLabel:'Смерти', winrateLabel:'Винрейт', confidenceLabel:'уверенность', frequency:'Частота', wrPattern:'Винрейт при паттерне', withoutIt:'без него', nextGoal:'Следующая измеримая цель', priorityLabel:'приоритет', associationLabel:'связь с винрейтом',
    roleThisMatch:'Роль этого матча', saveRole:'Сохранить роль', autoConfidence:'Уверенность авто-роли', roleSource:'Источник роли', duration:'Длительность', performance:'Оценка игры', percentileText:'процентиль внутри вашей истории на сопоставимой роли', mainDrops:'Главные статистические просадки', noDrops:'Явных просадок ниже 25-го процентиля нет.', strongMetrics:'Сильные показатели матча', scoreNote:'Оценка игры не использует победу/поражение напрямую. Она сравнивает числовые показатели с вашей историей на той же роли.',
    matchHistoryPrivate:'История матчей скрыта. Включите «Предоставлять данные матча» в Dota 2.', invalidKey:'Нужен корректный ключ Steam Web API (32 символа).', directFile:'Запустите START_SITE.bat и открывайте сайт через http://127.0.0.1:8765/.',
    dnaSurvival:'Выживаемость', dnaEconomy:'Экономика', dnaTempo:'Темп', dnaCombat:'Бои', dnaConsistency:'Стабильность',
    mistakeHighDeaths:'Слишком много смертей', mistakeHighDeathsDesc:'Смертность выше вашего обычного диапазона на этой роли.', mistakeLowKda:'Низкая эффективность KDA', mistakeLowKdaDesc:'Участие в убийствах недостаточно относительно числа смертей.', mistakeLowGpm:'Просадка экономики', mistakeLowGpmDesc:'GPM заметно ниже вашей собственной нормы на той же роли.', mistakeLowXpm:'Просадка по опыту', mistakeLowXpmDesc:'XPM ниже вашей ролевой нормы.', mistakeLowDamage:'Низкий урон по героям в минуту', mistakeLowDamageDesc:'Урон по героям ниже вашего обычного диапазона.', mistakeLowAssists:'Низкая активность поддержки', mistakeLowAssistsDesc:'Ассисты в минуту ниже вашей нормы на роли поддержки.', mistakeLowFarm:'Низкий темп фарма', mistakeLowFarmDesc:'Ластхиты в минуту ниже вашей собственной нормы на основной роли.', mistakeLowTower:'Низкий вклад в строения', mistakeLowTowerDesc:'Урон строениям в минуту ниже вашей нормы на основной роли.',
    heroClassCore:'ОСНОВНОЙ', heroClassDevelop:'РАЗВИВАТЬ', heroClassSituational:'СИТУАТИВНЫЙ', heroClassPause:'ПАУЗА', heroClassSample:'МАЛО ДАННЫХ',
    fullMatch:'Полный матч', yourTeam:'Ваша команда', enemyTeam:'Команда соперника', radiant:'Силы Света', dire:'Силы Тьмы', matchInfo:'Информация о матче', score:'Счёт', mode:'Режим', lobby:'Лобби', firstBlood:'Первая кровь', serverCluster:'Кластер сервера', towersLeft:'Башен осталось', barracksLeft:'Казарм осталось', picks:'Пики', player:'Игрок', level:'Уровень', lastHitsDenies:'ЛХ / Денай', heroDamage:'Урон героям', towerDamage:'Урон строениям', healing:'Лечение', items:'Предметы', anonymousPlayer:'Скрытый профиль', abandoned:'Покинул игру', finished:'Завершил матч', loadingMatch:'Загружаю полный матч…', matchLoadFailed:'Не удалось загрузить полный матч.', rankedAllPick:'Рейтинговый — выбор всех', allPick:'Выбор всех', turbo:'Турбо', unknownMode:'Неизвестный режим', rankedLobby:'Рейтинговый подбор', publicLobby:'Обычный подбор',
    patternMetricDeaths:'Смерти', patternMetricKda:'KDA', patternMetricGpm:'GPM', patternMetricXpm:'XPM', patternMetricDamage:'Урон героям/мин', patternMetricAssists:'Ассисты/мин', patternMetricFarm:'Ластхиты/мин', patternMetricTower:'Урон строениям/мин',
    whenGood:'При условии', comparedWith:'против', sample:'выборка', difference:'разница', confidence:'уверенность', noReliablePatterns:'Пока нет достаточно надёжных пороговых паттернов. Увеличьте выборку или уточните роли.',
    sessions:'Сессий', avgGamesPerSession:'Игр в среднем за сессию', longestSession:'Самая длинная сессия', sessionOverallWr:'Винрейт в сессиях', gameNumber:'Игра №', avgScore:'Средняя оценка', avgDeathsShort:'Ср. смерти', nextGameAfter:'Следующая игра после', oneLoss:'1 поражения', twoLosses:'2 поражений', threeLosses:'3+ поражений', noSessionDecline:'На текущей выборке нет надёжного ухудшения результатов к концу сессии.', sessionDropAfterThree:'После третьей игры в сессии ваши показатели заметно ухудшаются. Для рейтинга стоит рассмотреть ограничение сессии тремя играми.', sessionDropAfterTwoLosses:'После двух поражений подряд следующая игра статистически заметно слабее. Рассмотрите паузу после двух поражений.', sessionSampleLow:'Для уверенного вывода по сессиям пока мало повторяющихся наблюдений.',
    previous20:'к предыдущим 20', percentagePoints:'п.п.', historySource:'История', manualRankPrompt:'Steam не передал текущий ранг. Укажите снимок из клиента Dota 2 — он сохранится только на этом компьютере.'
  },
  en: {
    brandSubtitle:'Product UI Final · v16', navOverview:'Overview', navCoach:'Coach', navMatches:'Matches', navPatterns:'Patterns', navSessions:'Sessions', navHeroes:'Heroes', navMistakes:'Mistakes', navTraining:'Training', navProgress:'Progress',
    analysisMethod:'Analysis method', analysisMethodShort:'Ranked + roles + personal baseline', analysisMethodDesc:'Ranked matches are analyzed by default. Findings are tied to role, sample size, and confidence.',
    personalCoach:'Personal Dota 2 coach', dashboardTitle:'Player development dashboard', connecting:'Connecting…', profileDepth:'Profile and analysis depth', setupDesc:'For coaching analytics, 200 recent ranked matches are recommended. Non-ranked matches can be enabled separately.', scopeRanked:'Ranked only', scopeAll:'All matches', loadAnalytics:'Load analytics', rankedHint:'With ranked selected, the server scans history until it collects the requested number of ranked matches.', checkingSources:'Checking sources…', mainSource:'Primary source', steamReason:'Your Steam Web API key is required.', loadViaSteam:'Load via Steam', rememberKey:'Save key in this browser only', doNotSendKey:'Do not send the key in chat.', keyLocal:'It is used locally for requests to api.steampowered.com.',
    rankMmr:'Rank / MMR', exportJson:'Export JSON', refresh:'Refresh', matchesAnalyzed:'Matches analyzed', winrate:'Win rate', avgKda:'Average KDA', noWinLossDirect:'win/loss is not used directly in the score', avgDeaths:'Average deaths', last20VsHistory:'last 20 versus your history', mainRole:'Main role', currentRank:'Current rank', currentMmr:'Current MMR', coachScore:'Coach Score', playerDna:'Player DNA', currentFormProfile:'Current form profile', last20:'last 20 matches', dnaNote:'Indexes show current form versus your own history, not a global percentile.', currentFocus:'Current focus', trainingPriority:'Top training priority', loadingData:'Loading data…', form:'Form', last20Matches:'Last 20 matches', victoryShort:'W', defeatShort:'L', roleMixLabel:'Role mix', roleDistribution:'Role distribution', performanceLabel:'Performance', recentMatchScores:'Recent match scores', heroPoolLabel:'Hero pool', topHeroesBySample:'Top heroes by sample size',
    matches:'Matches', historyPerformance:'History and performance score', allResults:'All results', wins:'Wins', losses:'Losses', allRoles:'All roles', match:'Match', hero:'Hero', role:'Role', result:'Result', date:'Date', mmrDelta:'MMR Δ', scoreLabel:'Score', matchOpenHint:'Click “Open match” to see both lineups, score, all 10 players, items, and all match data available from Steam.', openMatch:'Open match', analyzeMistakes:'Mistake analysis',
    patternEngine:'Pattern engine', personalThresholds:'Personal thresholds and result associations', patternNotice:'These are <strong>statistical associations</strong>, not proof of causality. Larger samples increase confidence.', heroRolePatterns:'Hero + role', heroRoleFindings:'Strongest patterns for your heroes', sessionAnalytics:'Session analytics', sessionTitle:'How your performance changes within a session', gameInSession:'Game number in session', sessionPositionTitle:'Results by game order', afterLosses:'After losses', lossStreakTitle:'Next game after a losing streak', sessionCoach:'Session coach', sessionRecommendation:'What your data shows',
    heroCoach:'Hero Coach', heroesConsistency:'Heroes and result stability', mistakeEngine:'Mistake Engine', repeatingPatterns:'Recurring patterns', mistakeNotice:'Important: v12 shows <strong>statistical associations</strong>, not proven causality. Analysis uses the selected match dataset.', matchReview:'Match review', selectMatch:'Select a match', selectMatchHint:'Open a match in “Matches” and choose “Mistake analysis”.', trainingCoach:'Training Coach', oneGoalAtTime:'One goal at a time', activeBlock:'Active block', startFive:'Start 5-match block', resetBlock:'Reset block', personalJournal:'Personal journal', journalHint:'After a session, record one observation you can test in the next matches.', saveNote:'Save note', progressLabel:'Progress', last20VsPrevious:'Last 20 versus previous 20', trendLabel:'Trend', coachScoreBlocks:'Coach Score by 10-match blocks', dataQuality:'Data quality', findingReliability:'Reliability of current findings',
    ranked:'RANKED', unranked:'UNRANKED', victory:'WIN', defeat:'LOSS', saved:'Saved', loading:'Loading…', importing:'Importing…', needSteamKey:'Steam API key required', loadError:'Load error', steamUnavailable:'Steam API is unavailable on this network', steamAvailable:'Steam API available', opendotaAvailable:'OpenDota available', opendotaBlocked:'OpenDota blocked/unavailable', networkDiagFailed:'Network diagnostics failed', latestFirst:'Sorting: newest matches first', rankedDataset:'ranked', allDataset:'all', matchesWord:'matches', scanned:'scanned', lowRole:'low-confidence roles', sourceSteam:'Source: Steam API', cloudSyncOn:'Profile sync active', cloudSyncLocal:'Settings only on this device',
    roleManual:'manually verified', roleExplicit:'Steam role field', roleHeuristic:'auto: team economy', confidenceHigh:'high', confidenceMedium:'medium', confidenceLow:'low', noData:'Not enough data', wait:'WAIT', active:'ACTIVE', ready:'READY', trainingFocus:'Focus', nextFiveRole:'next 5 matches on this role. One measurable goal is checked.', progress:'Progress', completed:'passed', blockFixed:'consolidated', repeatBlock:'repeat', startBlockHint:'Click “Start block”; the site records the latest current match and evaluates the next 5 matches on this role.', pass:'PASS', miss:'MISS', gameWord:'Game',
    ratingTitle:'Rank and MMR', ratingAutoTitle:'Automatic data', ratingManualTitle:'Manual snapshot', ratingAutoUnavailable:'The current public Steam Web API did not expose medal/MMR or rating deltas. Exact values cannot be recovered automatically from this source. You can save a current snapshot from the Dota 2 client.', medal:'Medal', star:'Star', mmr:'MMR', saveRating:'Save', clearRating:'Clear manual data', ratingSaved:'Rank/MMR saved locally.', manualSnapshot:'manual snapshot', steamRatingFields:'Steam rating fields', ratingUnavailable:'not available in the current Steam Web API', deltaLast20:'MMR over last 20', exactRankNote:'The badge below is a local visual representation of the selected medal, not an official Valve asset.',
    medalHerald:'Herald', medalGuardian:'Guardian', medalCrusader:'Crusader', medalArchon:'Archon', medalLegend:'Legend', medalAncient:'Ancient', medalDivine:'Divine', medalImmortal:'Immortal', uncalibrated:'No data', depthHigh:'HIGH', depthMedium:'MEDIUM', depthLow:'LOW', historyDepth:'History depth', autoRoleLow:'Low-confidence auto roles', manualRoleCorrections:'Manual role corrections', topMistakeConfidence:'Top mistake confidence', dataQualityNote:'Longer ranked history and more accurate roles improve thresholds, percentiles, and mistake priorities.', rankedLabel:'Ranked',
    matchesLabel:'Matches', deathsLabel:'Deaths', winrateLabel:'Win rate', confidenceLabel:'confidence', frequency:'Frequency', wrPattern:'WR with pattern', withoutIt:'without it', nextGoal:'Next measurable goal', priorityLabel:'priority', associationLabel:'win-rate association',
    roleThisMatch:'Role in this match', saveRole:'Save role', autoConfidence:'Auto-role confidence', roleSource:'Role source', duration:'Duration', performance:'Performance', percentileText:'percentile within your comparable-role history', mainDrops:'Main statistical drops', noDrops:'No clear metrics below the 25th percentile.', strongMetrics:'Strong match metrics', scoreNote:'Performance score does not use WIN/LOSS directly. It compares numeric metrics with your own history on the same role.', matchHistoryPrivate:'Match history is private. Enable “Expose Public Match Data” in Dota 2.', invalidKey:'A valid 32-character Steam Web API key is required.', directFile:'Run START_SITE.bat and open the site via http://127.0.0.1:8765/.',
    dnaSurvival:'Survival', dnaEconomy:'Economy', dnaTempo:'Tempo', dnaCombat:'Combat', dnaConsistency:'Consistency', mistakeHighDeaths:'Too many deaths', mistakeHighDeathsDesc:'Deaths are above your normal range on this role.', mistakeLowKda:'Low KDA efficiency', mistakeLowKdaDesc:'Kills + assists are too low relative to deaths.', mistakeLowGpm:'Economy drop', mistakeLowGpmDesc:'GPM is materially below your own role baseline.', mistakeLowXpm:'XP drop', mistakeLowXpmDesc:'XPM is below your role baseline.', mistakeLowDamage:'Low hero damage per minute', mistakeLowDamageDesc:'Hero damage is below your normal range.', mistakeLowAssists:'Low support activity', mistakeLowAssistsDesc:'Assists per minute are below your support-role baseline.', mistakeLowFarm:'Low core farm rate', mistakeLowFarmDesc:'Last hits per minute are below your own core-role baseline.', mistakeLowTower:'Low building contribution', mistakeLowTowerDesc:'Tower damage per minute is below your core-role baseline.',
    heroClassCore:'CORE', heroClassDevelop:'DEVELOP', heroClassSituational:'SITUATIONAL', heroClassPause:'PAUSE', heroClassSample:'LOW SAMPLE', fullMatch:'Full match', yourTeam:'Your team', enemyTeam:'Enemy team', radiant:'Radiant', dire:'Dire', matchInfo:'Match information', score:'Score', mode:'Mode', lobby:'Lobby', firstBlood:'First blood', serverCluster:'Server cluster', towersLeft:'Towers left', barracksLeft:'Barracks left', picks:'Lineups', player:'Player', level:'Level', lastHitsDenies:'LH / DN', heroDamage:'Hero damage', towerDamage:'Tower damage', healing:'Healing', items:'Items', anonymousPlayer:'Anonymous profile', abandoned:'Left match', finished:'Finished match', loadingMatch:'Loading full match…', matchLoadFailed:'Failed to load full match.', rankedAllPick:'Ranked All Pick', allPick:'All Pick', turbo:'Turbo', unknownMode:'Unknown mode', rankedLobby:'Ranked matchmaking', publicLobby:'Public matchmaking',
    patternMetricDeaths:'Deaths', patternMetricKda:'KDA', patternMetricGpm:'GPM', patternMetricXpm:'XPM', patternMetricDamage:'Hero damage/min', patternMetricAssists:'Assists/min', patternMetricFarm:'Last hits/min', patternMetricTower:'Tower damage/min', whenGood:'When', comparedWith:'versus', sample:'sample', difference:'difference', confidence:'confidence', noReliablePatterns:'No sufficiently reliable threshold patterns yet. Increase the sample or refine roles.',
    sessions:'Sessions', avgGamesPerSession:'Avg games per session', longestSession:'Longest session', sessionOverallWr:'Session win rate', gameNumber:'Game #', avgScore:'Average score', avgDeathsShort:'Avg deaths', nextGameAfter:'Next game after', oneLoss:'1 loss', twoLosses:'2 losses', threeLosses:'3+ losses', noSessionDecline:'No reliable within-session decline is visible in the current sample.', sessionDropAfterThree:'Your performance drops noticeably after the third game in a session. Consider limiting ranked sessions to three games.', sessionDropAfterTwoLosses:'The next game after two consecutive losses is materially weaker. Consider taking a break after two losses.', sessionSampleLow:'There are not enough repeated session observations for a confident recommendation yet.', previous20:'vs previous 20', percentagePoints:'pp', historySource:'History', manualRankPrompt:'Steam did not expose your current rank. Save a snapshot from the Dota 2 client; it stays on this computer only.'
  }
};

Object.assign(I18N.ru,{
  navBenchmark:'Сравнение', benchmarkEngine:'Внешняя база сравнения', benchmarkTitle:'Вы против игроков вашего уровня и очень высокого уровня',
  benchmarkNotice:'Сравнение строится по публичным рейтинговым матчам Steam для того же героя и роли. <strong>Ваш уровень</strong> — широкий уровень Steam, выбранный по вашей медали. <strong>Очень высокий уровень</strong> — Steam skill=3; это сильные матчи, но не гарантированно 7k+ или профессионалы.',
  benchmarkHero:'Герой', benchmarkRole:'Роль', peerBracket:'Ваш уровень', benchmarkLoad:'Загрузить сравнение', benchmarkLoading:'Собираю внешнюю выборку…', benchmarkNeedRank:'Сначала укажите текущую медаль в «Ранг / MMR» или выберите уровень вручную.',
  bracketAuto:'Авто по медали', bracketNormal:'Обычный уровень Steam', bracketHigh:'Высокий уровень Steam', bracketVeryHigh:'Очень высокий уровень Steam',
  yourSample:'Ваша выборка', peerSample:'Игроки вашего уровня', eliteSample:'Очень высокий уровень', benchmarkFreshness:'Свежесть базы', benchmarkMetrics:'Сравнение ключевых метрик', metric:'Метрика', you:'Вы', peer:'Ваш уровень', veryHigh:'Очень высокий', gapToElite:'Разрыв до очень высокого уровня', percentileVsElite:'Ваш процентиль',
  benchmarkGaps:'Главные разрывы', benchmarkStrengths:'Сильные стороны', benchmarkNoData:'Недостаточно матчей этого героя на выбранной роли.', benchmarkCached:'кэш', benchmarkLive:'обновлено сейчас', benchmarkLowSample:'Малая внешняя выборка — выводы предварительные.',
  benchmarkSourceNote:'Источник: Steam GetMatchHistory с фильтром hero_id + skill и полные матчи через GetMatchHistoryBySequenceNum. Роль во внешней выборке определяется тем же алгоритмом экономики команды.',
  patternValidated:'проверка на более новых матчах', patternTrain:'историческая часть', patternStability:'стабильность', patternCalibratedNotice:'Порог сначала ищется на более старой части истории, затем проверяется на более новых матчах. Это уменьшает переобучение. KDA/GPM/XPM и похожие показатели всё равно являются показателями результата матча, а не доказанной причиной победы.',
  sessionOutcomeOnly:'Винрейт к 3–4-й игре снижается, но ваша персональная оценка почти не меняется. Пока это похоже на колебание результата, а не на подтверждённое ухудшение качества игры.',
  uncertainty:'погрешность', qualityChange:'изменение оценки', sessionEvidence:'Для рекомендации учитываются одновременно винрейт, Performance Score и размер выборки.',
  benchmarkError:'Не удалось собрать внешнюю выборку.', benchmarkSameCohort:'Ваш уровень уже попадает в категорию «Очень высокий» Steam, поэтому обе внешние выборки совпадают.',
  roleConfidenceBenchmark:'Роли внешней выборки определены автоматически; используйте это как ориентир, а не абсолютную истину.',

  authVersion:'Dota Skill Lab · UI Final', authEyebrow:'Подключение профиля', authTitle:'Войдите в Dota Skill Lab', authDesc:'Укажите Dota ID и ваш Steam Web API key. Для каждого игрока статистика, роли, ранг, тренировки и заметки хранятся отдельно.', authDotaId:'Dota ID или ссылка Dotabuff', authSteamKey:'Steam Web API key', authRemember:'Запомнить вход на этом браузере', authLogin:'Войти и загрузить профиль', authForget:'Забыть сохранённый вход', authKeyNote:'API key используется только для запросов к Steam и не включается в экспорт.', switchProfile:'Сменить профиль', authBadId:'Укажите корректный Dota ID или ссылку Dotabuff.', authBadKey:'Нужен корректный Steam Web API key из 32 символов.', authConnecting:'Подключаю профиль…', authForgotten:'Сохранённый вход удалён.', itemCatalogSteam:'Каталог предметов загружен', itemCatalogFallback:'Каталог предметов загружен из резервного источника', itemCatalogMissing:'Каталог предметов недоступен — будут показаны ID.',
});
Object.assign(I18N.en,{
  navBenchmark:'Benchmark', benchmarkEngine:'External benchmark', benchmarkTitle:'You versus your skill bracket and Very High Skill players',
  benchmarkNotice:'Comparison uses public ranked Steam matches for the same hero and role. <strong>Peer</strong> is the broad Steam skill bucket mapped from your medal. <strong>Very High</strong> is Steam skill=3; it is a strong-match cohort, but not guaranteed to be 7k+ or professional players.',
  benchmarkHero:'Hero', benchmarkRole:'Role', peerBracket:'Peer bracket', benchmarkLoad:'Load benchmark', benchmarkLoading:'Building external sample…', benchmarkNeedRank:'Set your current medal in “Rank / MMR” first or choose a bracket manually.',
  bracketAuto:'Auto from medal', bracketNormal:'Normal skill', bracketHigh:'High skill', bracketVeryHigh:'Very High skill',
  yourSample:'Your sample', peerSample:'Peer sample', eliteSample:'Very High sample', benchmarkFreshness:'Benchmark freshness', benchmarkMetrics:'Key metric comparison', metric:'Metric', you:'You', peer:'Peer', veryHigh:'Very High', gapToElite:'Gap to Very High', percentileVsElite:'Your percentile',
  benchmarkGaps:'Biggest gaps', benchmarkStrengths:'Strengths', benchmarkNoData:'Not enough matches for this hero on the selected role.', benchmarkCached:'cache', benchmarkLive:'updated now', benchmarkLowSample:'External sample is small; treat findings as preliminary.',
  benchmarkSourceNote:'Source: Steam GetMatchHistory filtered by hero_id + skill, with full matches from GetMatchHistoryBySequenceNum. External roles use the same team-economy role resolver.',
  patternValidated:'validation on newer matches', patternTrain:'historical split', patternStability:'stability', patternCalibratedNotice:'The threshold is selected on the older history split and then validated on newer matches. This reduces overfitting. KDA/GPM/XPM and similar values remain outcome-linked performance indicators, not proven causes of winning.',
  sessionOutcomeOnly:'Win rate declines by games 3–4, but your personal performance score is almost unchanged. This currently looks like result variance rather than confirmed deterioration in play quality.',
  uncertainty:'uncertainty', qualityChange:'score change', sessionEvidence:'Recommendations require agreement between win rate, Performance Score, and adequate sample size.',
  benchmarkError:'Failed to build the external benchmark.', benchmarkSameCohort:'Your Peer bracket is already Very High Skill, so the two Steam cohorts are the same.',
  roleConfidenceBenchmark:'External roles are inferred automatically; treat this benchmark as directional rather than absolute.',

  authVersion:'Dota Skill Lab · UI Final', authEyebrow:'Profile connection', authTitle:'Sign in to Dota Skill Lab', authDesc:'Enter a Dota ID and your Steam Web API key. Stats, role corrections, rank, training blocks, and notes are stored separately for each player.', authDotaId:'Dota ID or Dotabuff URL', authSteamKey:'Steam Web API key', authRemember:'Remember sign-in on this browser', authLogin:'Sign in and load profile', authForget:'Forget saved sign-in', authKeyNote:'The API key is used only for Steam requests and is never included in exports.', switchProfile:'Switch profile', authBadId:'Enter a valid Dota ID or Dotabuff URL.', authBadKey:'A valid 32-character Steam Web API key is required.', authConnecting:'Connecting profile…', authForgotten:'Saved sign-in removed.', itemCatalogSteam:'Item catalog loaded', itemCatalogFallback:'Item catalog loaded from fallback source', itemCatalogMissing:'Item catalog unavailable — item IDs will be shown.',
});

Object.assign(I18N.ru,{
  v11Method:'V11: роль + длительность + герой', durationNormalized:'с поправкой на длительность',
  benchmarkDuration:'Длительность', durationAuto:'Авто по вашим играм', durationAll:'Любая', durationLt25:'до 25 мин', duration25_35:'25–35 мин', duration35_45:'35–45 мин', duration45p:'45+ мин', durationCohort:'Когорта по длительности',
  heroRoleLab:'Hero / Role Lab', heroRoleGapTitle:'Где конкретный герой сильнее или слабее вашей нормы на этой роли',
  heroRoleGapNotice:'V11 сравнивает каждую связку <strong>герой + роль</strong> с вашей собственной базой на той же роли и, где возможно, с матчами похожей длительности.',
  heroRoleGames:'Игр', roleFit:'Соответствие роли', topStrength:'Главная сила', topGap:'Главный разрыв', roleBaseline:'Ваша норма роли', heroRoleProfile:'Профиль герой + роль', durationProfile:'Профиль длительности',
  noHeroRoleData:'Пока недостаточно данных для связок герой + роль.', similarDuration:'похожая длительность', fallbackRoleDuration:'роль + длительность', fallbackRoleOnly:'только роль', fallbackAll:'общая история',
  contextualScoreNote:'Performance Score V11 сравнивает матч прежде всего с вашей историей на той же роли и в похожем диапазоне длительности. Если выборки мало, используется база только по роли.',
  benchmarkDurationNote:'Внешняя выборка ограничивается выбранной длительностью. В режиме «Авто» используется типичный диапазон ваших матчей на выбранном герое и роли.',
  benchmarkUnavailableLocal:'Внешний benchmark недоступен в этой сети. Ниже всё равно доступен локальный Hero / Role Gap Analysis — он не требует внешней выборки.',
  benchmarkBadRequestHint:'Steam отклонил запрос внешней выборки. На корпоративной сети это может быть ограничение прокси/шлюза; попробуйте benchmark позже с обычного подключения.',
  normalizedMedian:'Нормализованная медиана', matchLength:'Длина матча', durationBucket:'Диапазон длительности',
  fitExcellent:'сильное соответствие', fitGood:'выше вашей нормы', fitNeutral:'около вашей нормы', fitWeak:'ниже вашей нормы',
  gapEconomy:'экономика', gapSurvival:'выживаемость', gapTempo:'темп', gapCombat:'боевой вклад', gapFarm:'фарм', gapSupport:'support-активность', gapObjectives:'объекты',
  benchmarkSourceNoteV11:'Источник внешнего сравнения: публичные ranked-матчи Steam, тот же герой, автоматически определённая роль и выбранный диапазон длительности. Very High Skill — сильная публичная когорта Steam, но не гарантированно 7k+ / pro.',
  durationBucketLt25:'<25 мин', durationBucket25_35:'25–35 мин', durationBucket35_45:'35–45 мин', durationBucket45p:'45+ мин', patternMetricHealing:'Лечение/мин',
  heroRoleDetails:'Подробности связки', compareRoleNorm:'Сравнение с вашей нормой на этой роли', performanceContext:'Контекст оценки',
});
Object.assign(I18N.en,{
  v11Method:'V11: role + duration + hero', durationNormalized:'duration-normalized',
  benchmarkDuration:'Duration', durationAuto:'Auto from your matches', durationAll:'Any', durationLt25:'under 25 min', duration25_35:'25–35 min', duration35_45:'35–45 min', duration45p:'45+ min', durationCohort:'Duration cohort',
  heroRoleLab:'Hero / Role Lab', heroRoleGapTitle:'Where each hero is stronger or weaker than your own norm on that role',
  heroRoleGapNotice:'V11 compares every <strong>hero + role</strong> pair with your own baseline on that role and, when possible, with matches of similar duration.',
  heroRoleGames:'Games', roleFit:'Role fit', topStrength:'Top strength', topGap:'Top gap', roleBaseline:'Your role baseline', heroRoleProfile:'Hero + role profile', durationProfile:'Duration profile',
  noHeroRoleData:'Not enough hero + role data yet.', similarDuration:'similar duration', fallbackRoleDuration:'role + duration', fallbackRoleOnly:'role only', fallbackAll:'all history',
  contextualScoreNote:'V11 Performance Score first compares a match with your own history on the same role and a similar duration bucket. If the sample is too small, it falls back to role-only history.',
  benchmarkDurationNote:'The external sample is restricted by match length. “Auto” uses the typical duration range from your own matches on the selected hero and role.',
  benchmarkUnavailableLocal:'The external benchmark is unavailable on this network. Local Hero / Role Gap Analysis still works and does not need an external sample.',
  benchmarkBadRequestHint:'Steam rejected the external-sample request. On a corporate network this can be a proxy/gateway restriction; try the benchmark later on a normal connection.',
  normalizedMedian:'Normalized median', matchLength:'Match length', durationBucket:'Duration bucket',
  fitExcellent:'strong role fit', fitGood:'above your role norm', fitNeutral:'near your role norm', fitWeak:'below your role norm',
  gapEconomy:'economy', gapSurvival:'survival', gapTempo:'tempo', gapCombat:'combat impact', gapFarm:'farm', gapSupport:'support activity', gapObjectives:'objectives',
  benchmarkSourceNoteV11:'External comparison source: public ranked Steam matches, same hero, inferred role, and selected duration range. Very High Skill is a strong Steam cohort, but not guaranteed 7k+ / pro.',
  durationBucketLt25:'<25 min', durationBucket25_35:'25–35 min', durationBucket35_45:'35–45 min', durationBucket45p:'45+ min', patternMetricHealing:'Healing/min',
  heroRoleDetails:'Pair details', compareRoleNorm:'Compared with your norm on this role', performanceContext:'Score context',
});


Object.assign(I18N.ru,{
  startHere:'С чего начать', coachCockpitTitle:'Главное на этой странице', guidedView:'упрощённый фокус', quickCompare:'Быстрое сравнение', quickCompareTitle:'Последние 20 против предыдущих 20', whatChanged:'что изменилось', recommendedRoute:'Рекомендуемый маршрут', whereToLook:'Куда смотреть дальше',
  cockpitPrimaryFocus:'Главный фокус', cockpitBestSignal:'Лучшая зона', cockpitMainRisk:'Главный риск', cockpitTopHero:'Лучший рабочий герой',
  quickNow:'сейчас', quickBefore:'раньше', quickDelta:'сдвиг', improving:'улучшение', worsening:'ухудшение', stableState:'без сильных изменений',
  routeStepTraining:'1. Сначала — тренировка', routeStepTrainingDesc:'Откройте активную задачу и держите в голове только один приоритет на следующие 5 игр.', routeStepMatches:'2. Затем — матчи', routeStepMatchesDesc:'Откройте 1–2 последних поражения и сравните свой KDA, смерти и предметы.', routeStepPatterns:'3. Потом — паттерны', routeStepPatternsDesc:'Проверьте, подтверждается ли проблема статистически именно на вашей роли и герое.',
  openTrainingTab:'Открыть тренировку', openMatchesTab:'Открыть матчи', openPatternsTab:'Открыть паттерны', openHeroesTab:'Открыть героев',
  focusTarget:'Цель', signalLine:'Сигнал', riskLine:'Риск', topHeroLine:'Герой', compareMetricWinrate:'Винрейт', compareMetricScore:'Оценка тренера', compareMetricKda:'KDA', compareMetricDeaths:'Смерти',
  compareGuideNote:'Сначала смотрите красные ухудшения и только потом переходите к глубоким разделам.', scoreTrendBetter:'оценка растёт', scoreTrendWorse:'оценка падает', deathsTrendBetter:'смертей стало меньше', deathsTrendWorse:'смертей стало больше', noFocusCard:'После загрузки данных здесь появится главный приоритет и маршрут анализа.',
  focusPriorityLine:'Приоритет', confidenceShort:'Уверенность', strengthLabel:'Сильная сторона', riskLabel:'Слабое место'
});
Object.assign(I18N.en,{
  startHere:'Start here', coachCockpitTitle:'What matters on this page', guidedView:'guided focus', quickCompare:'Quick compare', quickCompareTitle:'Last 20 versus previous 20', whatChanged:'what changed', recommendedRoute:'Recommended route', whereToLook:'Where to look next',
  cockpitPrimaryFocus:'Primary focus', cockpitBestSignal:'Best area', cockpitMainRisk:'Main risk', cockpitTopHero:'Best working hero',
  quickNow:'now', quickBefore:'before', quickDelta:'change', improving:'improving', worsening:'worsening', stableState:'mostly stable',
  routeStepTraining:'1. Start with training', routeStepTrainingDesc:'Open the active training task and keep just one priority for the next 5 games.', routeStepMatches:'2. Then review matches', routeStepMatchesDesc:'Open your last 1–2 losses and compare KDA, deaths, and items.', routeStepPatterns:'3. Then confirm patterns', routeStepPatternsDesc:'Check whether the issue is statistically confirmed on your role and hero.',
  openTrainingTab:'Open Training', openMatchesTab:'Open Matches', openPatternsTab:'Open Patterns', openHeroesTab:'Open Heroes',
  focusTarget:'Target', signalLine:'Signal', riskLine:'Risk', topHeroLine:'Hero', compareMetricWinrate:'Winrate', compareMetricScore:'Coach Score', compareMetricKda:'KDA', compareMetricDeaths:'Deaths',
  compareGuideNote:'Start with the red regressions, then open the deeper sections.', scoreTrendBetter:'score is rising', scoreTrendWorse:'score is falling', deathsTrendBetter:'fewer deaths', deathsTrendWorse:'more deaths', noFocusCard:'After loading data, the main priority and analysis route will appear here.',
  focusPriorityLine:'Priority', confidenceShort:'Confidence', strengthLabel:'Strength', riskLabel:'Weak point'
});


Object.assign(I18N.ru,{
  matchCoachEngine:'Матч-тренер', matchCoachTitle:'Что вынести из последних игр', matchCoachDesc:'Сначала один вывод, затем доказательства. Без перегруза десятками метрик.', latestMatchCoach:'Последний матч', latestMatchVerdict:'Вердикт тренера', nextGamePlan:'Следующая игра', oneRuleNextGame:'Одно правило на следующий матч', reviewQueue:'Очередь разбора', matchesWorthReviewing:'Какие матчи стоит открыть', recentTen:'последние 10', recentCoachCards:'Последние матчи', recentCoachSummary:'Короткий тренерский итог',
  verdictExcellent:'Очень сильная игра', verdictStrong:'Хорошая игра', verdictMixed:'Смешанная игра', verdictWeak:'Слабая игра', verdictDespiteWin:'Победа, но личная игра ниже вашей нормы', verdictDespiteLoss:'Поражение, но личная игра была сильной',
  evidence:'Основания', strengths:'Сильные стороны', risks:'Зоны риска', nextRule:'Следующее правило', openFullMatch:'Открыть полный матч', reviewReason:'Почему открыть', teamContext:'Контекст команды', killParticipation:'Участие в убийствах', damageShare:'Доля урона команды', gpmTeamRank:'GPM в команде', xpmTeamRank:'XPM в команде', damageTeamRank:'Урон в команде', deathsTeamRank:'Смерти в команде', outOfFive:'из 5',
  coachGoodKda:'KDA выше вашей нормы', coachGoodSurvival:'Смертей меньше вашей нормы', coachGoodEconomy:'Экономика выше вашей нормы', coachGoodXp:'Темп опыта выше вашей нормы', coachGoodDamage:'Боевой урон выше вашей нормы', coachGoodAssists:'Активное участие через ассисты', coachGoodObjectives:'Хороший вклад в строения',
  coachRiskKda:'KDA заметно ниже вашей нормы', coachRiskDeaths:'Слишком много смертей относительно вашей нормы', coachRiskEconomy:'Экономика просела относительно вашей нормы', coachRiskXp:'Отставание по опыту относительно вашей нормы', coachRiskDamage:'Низкий боевой урон относительно вашей нормы', coachRiskAssists:'Низкая активность через ассисты', coachRiskFarm:'Фарм ниже нормы для этой роли', coachRiskObjectives:'Низкий вклад в строения',
  ruleSurvive:'Приоритет — выживаемость: не отдавать лишние смерти и не входить первым без необходимости.', ruleEconomy:'Приоритет — экономика: раньше получать ключевые ресурсы и избегать пустых перемещений.', ruleXp:'Приоритет — опыт: не выпадать из зон получения XP после линии.', ruleFight:'Приоритет — влияние в драках: приходить к ключевым боям и реализовывать способности.', ruleAssist:'Приоритет — участие: играть ближе к активным союзникам и повышать ассисты.', ruleFarm:'Приоритет — фарм: улучшить темп добивания и добор безопасных ресурсов.', ruleObjectives:'Приоритет — объекты: после выигранной драки переводить преимущество в башни.', ruleKda:'Приоритет — качество разменов: меньше невыгодных входов и смертей без результата.',
  reviewLowScore:'Низкая личная оценка — полезно понять, какая метрика просела сильнее всего.', reviewHighDeaths:'Смертей заметно больше вашей нормы.', reviewLowKda:'KDA находится в нижней части вашей личной выборки.', reviewLossStrong:'Интересное поражение: результат плохой, но личная оценка высокая.', reviewWinWeak:'Интересная победа: команда выиграла, но личная оценка низкая.',
  roleChecklist:'Чек-лист роли', roleCheckGood:'норма выполнена', roleCheckWarn:'требует внимания', coachOwnBaseline:'Сравнение идёт с вашей историей на той же роли и похожей длительности.', coachNoMatches:'Недостаточно матчей для тренерского отчёта.', currentMetricPercentile:'ваш процентиль', reviewPriority:'Приоритет разбора', latestMatch:'Последний матч', lastFive:'Последние 5', personalScore:'Личная оценка', resultNotScore:'Результат матча не используется как основной критерий качества.',
  coachSupportAssist:'Ассисты/мин', coachCoreFarm:'LH/мин', coachFightDamage:'Урон/мин', coachSurvival:'Выживаемость', coachTempoXp:'XPM', coachEconomyGpm:'GPM'
});
Object.assign(I18N.en,{
  matchCoachEngine:'Match Coach', matchCoachTitle:'What to take from your latest games', matchCoachDesc:'One conclusion first, then the evidence. No metric overload.', latestMatchCoach:'Latest match', latestMatchVerdict:'Coach verdict', nextGamePlan:'Next game', oneRuleNextGame:'One rule for the next match', reviewQueue:'Review queue', matchesWorthReviewing:'Matches worth opening', recentTen:'last 10', recentCoachCards:'Recent matches', recentCoachSummary:'Short coaching summary',
  verdictExcellent:'Excellent game', verdictStrong:'Strong game', verdictMixed:'Mixed game', verdictWeak:'Weak game', verdictDespiteWin:'Win, but your individual game was below your norm', verdictDespiteLoss:'Loss, but your individual game was strong',
  evidence:'Evidence', strengths:'Strengths', risks:'Risk areas', nextRule:'Next rule', openFullMatch:'Open full match', reviewReason:'Why review', teamContext:'Team context', killParticipation:'Kill participation', damageShare:'Team damage share', gpmTeamRank:'Team GPM rank', xpmTeamRank:'Team XPM rank', damageTeamRank:'Team damage rank', deathsTeamRank:'Team deaths rank', outOfFive:'of 5',
  coachGoodKda:'KDA above your norm', coachGoodSurvival:'Fewer deaths than your norm', coachGoodEconomy:'Economy above your norm', coachGoodXp:'XP tempo above your norm', coachGoodDamage:'Combat damage above your norm', coachGoodAssists:'Strong assist activity', coachGoodObjectives:'Good building contribution',
  coachRiskKda:'KDA clearly below your norm', coachRiskDeaths:'Too many deaths versus your norm', coachRiskEconomy:'Economy below your norm', coachRiskXp:'XP tempo below your norm', coachRiskDamage:'Low combat damage versus your norm', coachRiskAssists:'Low assist activity', coachRiskFarm:'Farm below the role norm', coachRiskObjectives:'Low building contribution',
  ruleSurvive:'Priority — survival: avoid unnecessary deaths and do not enter first without a reason.', ruleEconomy:'Priority — economy: reach key resources earlier and reduce empty movement.', ruleXp:'Priority — XP: stay connected to XP sources after the lane.', ruleFight:'Priority — fight impact: arrive to key fights and convert your spells.', ruleAssist:'Priority — participation: play closer to active teammates and increase assists.', ruleFarm:'Priority — farm: improve last-hit tempo and collect safe resources.', ruleObjectives:'Priority — objectives: convert won fights into towers.', ruleKda:'Priority — trade quality: reduce low-value entries and deaths without return.',
  reviewLowScore:'Low personal score — useful for finding the biggest statistical drop.', reviewHighDeaths:'Deaths are materially above your norm.', reviewLowKda:'KDA is in the lower part of your personal sample.', reviewLossStrong:'Interesting loss: team result was poor, but your individual score was strong.', reviewWinWeak:'Interesting win: the team won, but your individual score was low.',
  roleChecklist:'Role checklist', roleCheckGood:'on target', roleCheckWarn:'needs attention', coachOwnBaseline:'Comparison uses your own history on the same role and similar duration.', coachNoMatches:'Not enough matches for a coaching report.', currentMetricPercentile:'your percentile', reviewPriority:'Review priority', latestMatch:'Latest match', lastFive:'Last 5', personalScore:'Personal score', resultNotScore:'Match result is not the primary measure of individual quality.',
  coachSupportAssist:'Assists/min', coachCoreFarm:'LH/min', coachFightDamage:'Damage/min', coachSurvival:'Survival', coachTempoXp:'XPM', coachEconomyGpm:'GPM'
});


Object.assign(I18N.ru,{
  navDeep:'Глубокий разбор', deepEngine:'Deep Match Lab', deepTitle:'Что происходило внутри матча', deepDesc:'Сначала подтверждённые данные Steam; при доступности parsed replay добавляются временные ряды, покупки, вижен и teamfight.',
  deepNotice:'Точные события требуют <strong>parsed replay</strong>. На корпоративной сети этот источник может быть недоступен; тогда раздел остаётся в режиме Steam-only и не делает предположений о точных минутах смертей или перемещениях.',
  deepSelectMatch:'Матч для глубокого разбора', deepLoad:'Разобрать матч', deepChoose:'Выберите матч и нажмите «Разобрать матч».', deepLoading:'Собираю глубокий разбор…', deepSteamOnly:'STEAM-ONLY', deepParsed:'PARSED MATCH', deepUnavailable:'Parsed replay недоступен', deepUnavailableDesc:'Steam-часть разбора работает. Для точных таймингов покупок, вижена и teamfight потребуется обычное подключение, где доступен источник parsed match.',
  deepCoreSummary:'Ключевой контекст', deepRoleContext:'Контекст роли', deepTeamImpact:'Вклад в команду', deepPhaseTitle:'Фазы матча', deepPhaseDesc:'Срезы накопленных показателей по минутам parsed replay.', deepMinute:'минута', deepGold:'Золото', deepXp:'Опыт', deepLh:'Ластхиты',
  deepLane:'Линия', deepLaneEfficiency:'Эффективность линии', deepRoaming:'Роуминг', deepYes:'Да', deepNo:'Нет', laneSafe:'лёгкая линия', laneMid:'центр', laneOff:'сложная линия', laneJungle:'лес', laneUnknown:'не определено',
  deepItems:'Тайминги покупок', deepNoItems:'Нет parsed-таймингов покупок.', deepVision:'Вижен', deepObservers:'Observer wards', deepSentries:'Sentry wards', deepVisionTimes:'Время установки', deepNoVision:'Нет parsed-логов вижена.',
  deepFights:'Teamfight', deepFightWindow:'Окно драки', deepFightKills:'Убийства', deepFightDeaths:'Смерти', deepFightDamage:'Урон', deepFightGold:'Δ золота', deepFightXp:'Δ опыта', deepNoFights:'Для игрока не найдено parsed teamfight-событий.',
  deepObjectives:'События карты', deepObjectivesDesc:'События объектов из parsed match; раскрывайте только при необходимости.', deepNoObjectives:'Нет parsed-событий объектов.', deepExactDeathsPending:'Точные одиночные смерти', deepExactDeathsPendingDesc:'Не показываем без надёжного victim-event. Сейчас можно видеть окна teamfight, в которых parsed data фиксирует смерть.',
  deepDataQuality:'Качество глубоких данных', deepParsedGood:'Временные ряды и событийные логи доступны.', deepParsedPartial:'Матч найден, но replay разобран частично или событийных полей мало.', deepNetworkBlocked:'Источник parsed match недоступен в этой сети.', deepOpenMatch:'Открыть полный матч', deepCoachRule:'Правило тренера', deepSource:'Источник', deepCachedNote:'Разобранные матчи кэшируются локально и могут использоваться в следующих версиях.'
});
Object.assign(I18N.en,{
  navDeep:'Deep Review', deepEngine:'Deep Match Lab', deepTitle:'What happened inside the match', deepDesc:'Steam-confirmed context first; when parsed replay data is reachable, timelines, purchases, vision and teamfights are added.',
  deepNotice:'Exact events require a <strong>parsed replay</strong>. On a corporate network that source may be unavailable; the section then stays Steam-only and does not guess exact death times or movement.',
  deepSelectMatch:'Match for deep review', deepLoad:'Analyze match', deepChoose:'Select a match and click “Analyze match”.', deepLoading:'Building deep review…', deepSteamOnly:'STEAM-ONLY', deepParsed:'PARSED MATCH', deepUnavailable:'Parsed replay unavailable', deepUnavailableDesc:'The Steam layer still works. Exact item timings, vision and teamfights need a normal connection where the parsed-match source is reachable.',
  deepCoreSummary:'Core context', deepRoleContext:'Role context', deepTeamImpact:'Team impact', deepPhaseTitle:'Match phases', deepPhaseDesc:'Minute snapshots from parsed replay timelines.', deepMinute:'minute', deepGold:'Gold', deepXp:'XP', deepLh:'Last hits',
  deepLane:'Lane', deepLaneEfficiency:'Lane efficiency', deepRoaming:'Roaming', deepYes:'Yes', deepNo:'No', laneSafe:'safe lane', laneMid:'mid', laneOff:'off lane', laneJungle:'jungle', laneUnknown:'unknown',
  deepItems:'Item timings', deepNoItems:'No parsed item purchase timings.', deepVision:'Vision', deepObservers:'Observer wards', deepSentries:'Sentry wards', deepVisionTimes:'Placement times', deepNoVision:'No parsed vision logs.',
  deepFights:'Teamfights', deepFightWindow:'Fight window', deepFightKills:'Kills', deepFightDeaths:'Deaths', deepFightDamage:'Damage', deepFightGold:'Gold Δ', deepFightXp:'XP Δ', deepNoFights:'No parsed teamfight events were found for the player.',
  deepObjectives:'Map events', deepObjectivesDesc:'Objective events from the parsed match; expand only when needed.', deepNoObjectives:'No parsed objective events.', deepExactDeathsPending:'Exact isolated deaths', deepExactDeathsPendingDesc:'Not shown without a reliable victim event. For now, teamfight windows can show fights where parsed data records a death.',
  deepDataQuality:'Deep-data quality', deepParsedGood:'Timelines and event logs are available.', deepParsedPartial:'The match was found but replay-derived fields are partial.', deepNetworkBlocked:'Parsed-match source is unavailable on this network.', deepOpenMatch:'Open full match', deepCoachRule:'Coach rule', deepSource:'Source', deepCachedNote:'Deep-reviewed matches are cached locally and can be reused in future versions.'
});

Object.assign(I18N.ru,{
  authStep1:'Dota ID или ссылка на профиль', authStep2:'Steam Web API key', authStep3:'Загрузка и разбор матчей',
  navGroupToday:'Сегодня', navGroupAnalysis:'Анализ', navGroupGrowth:'Развитие',
  cockpitFocusDetails:'Подробнее о приоритете', recentMatchScoresDetail:'Детально по каждому матчу'
});
Object.assign(I18N.en,{
  authStep1:'Dota ID or profile link', authStep2:'Steam Web API key', authStep3:'Load and break down matches',
  navGroupToday:'Today', navGroupAnalysis:'Analysis', navGroupGrowth:'Growth',
  cockpitFocusDetails:'Priority details', recentMatchScoresDetail:'Per-match breakdown'
});


Object.assign(I18N.ru,{
  startHere:'Командный центр', coachCockpitTitle:'Ваш план на следующую игру', guidedView:'главное без шума',
  loadStageConnect:'Подключение к Steam', loadStageHistory:'История и детали матчей', loadStageAnalytics:'Роли и аналитическая модель', loadStageReady:'Профиль готов',
  currentQuest:'Текущая задача', questProgress:'Прогресс задачи', lastMatchBrief:'Последний матч', coachScoreShort:'Coach Score', formTrend:'Динамика формы',
  gradeLabel:'Грейд', strongMatch:'Сильный матч — можно использовать как референс', reviewRecommended:'Стоит пересмотреть этот матч', roleUncertain:'Роль определена с низкой уверенностью',
  activeTrainingStatus:'АКТИВНАЯ ТРЕНИРОВКА', watchStatus:'НАБЛЮДАТЬ', evidenceStatus:'ПОДТВЕРЖДЕНО ДАННЫМИ',
  winCondition:'ВАШЕ УСЛОВИЕ УСПЕХА', whenYouHit:'Когда выполняется', belowThreshold:'Ниже порога', validatedOn:'Проверено на отложенной выборке',
  sessionCoachSummary:'Вывод тренера по сессиям', noPersonalDrop:'Личная Performance Score остаётся стабильной — явного ухудшения качества игры внутри сессии не видно.',
  questOnTrack:'ПО ПЛАНУ', questReady:'ГОТОВО К СТАРТУ', questMastered:'ЗАКРЕПЛЕНО', questRepeat:'ПОВТОРИТЬ БЛОК',
  progressHeadline:'Главное изменение', progressImproved:'Форма улучшилась', progressRegressed:'Форма просела', progressStable:'Форма стабильна',
  heroPassport:'Паспорт героя', bestMetric:'Сильнейшая метрика', weakestMetric:'Главный разрыв',
  timeline:'Таймлайн матча', timelineItems:'предмет', timelineFight:'драка', timelineVision:'вижен', timelineObjective:'событие',
  loadingPrivacy:'Ключ используется только локально для запросов Steam. Экспорт его не содержит.', fullScoreboard:'Полный scoreboard и детали', advancedMetrics:'Расширенные метрики', coachVerdictLabel:'Вердикт тренера', nextGameRuleLabel:'Правило на следующую игру'
});
Object.assign(I18N.en,{
  startHere:'Command center', coachCockpitTitle:'Your plan for the next game', guidedView:'signal over noise',
  loadStageConnect:'Connecting to Steam', loadStageHistory:'Match history and details', loadStageAnalytics:'Roles and analytics model', loadStageReady:'Profile ready',
  currentQuest:'Current quest', questProgress:'Quest progress', lastMatchBrief:'Latest match', coachScoreShort:'Coach Score', formTrend:'Form trend',
  gradeLabel:'Grade', strongMatch:'Strong match — useful as a reference', reviewRecommended:'Worth reviewing this match', roleUncertain:'Role confidence is low',
  activeTrainingStatus:'ACTIVE TRAINING', watchStatus:'WATCH', evidenceStatus:'SUPPORTED BY DATA',
  winCondition:'YOUR SUCCESS CONDITION', whenYouHit:'When you hit', belowThreshold:'Below threshold', validatedOn:'Validated on holdout sample',
  sessionCoachSummary:'Session coach conclusion', noPersonalDrop:'Your Performance Score stays stable — there is no clear evidence that your personal play deteriorates within the session.',
  questOnTrack:'ON TRACK', questReady:'READY TO START', questMastered:'MASTERED', questRepeat:'REPEAT BLOCK',
  progressHeadline:'Main change', progressImproved:'Form improved', progressRegressed:'Form regressed', progressStable:'Form stable',
  heroPassport:'Hero passport', bestMetric:'Best metric', weakestMetric:'Main gap',
  timeline:'Match timeline', timelineItems:'item', timelineFight:'fight', timelineVision:'vision', timelineObjective:'event',
  loadingPrivacy:'The key is used locally for Steam requests only and is never included in exports.', fullScoreboard:'Full scoreboard and details', advancedMetrics:'Advanced metrics', coachVerdictLabel:'Coach verdict', nextGameRuleLabel:'Rule for the next game'
});


Object.assign(I18N.ru,{
  authVersion:'Web Beta · Steam Login', authEyebrow:'Безопасный вход', authTitle:'Войдите через Steam',
  authDesc:'Dota Skill Lab получит только подтверждённый Steam ID и публичные игровые данные. Пароль вводится только на стороне Steam.',
  authStep1:'Авторизация на Steam', authStep2:'Проверка истории Dota 2', authStep3:'Создание Player Model',
  authLogin:'Войти через Steam', authConnecting:'Открываю Steam…', authKeyNote:'Авторизация выполняется на steamcommunity.com. Steam Web API key хранится только на сервере приложения.',
  authTrustTitle:'Пароль Steam не передаётся Dota Skill Lab.', switchProfile:'Выйти из Steam',
  loadStageConnect:'Steam аккаунт подтверждён', profileDepth:'Глубина анализа', setupDesc:'Для быстрого первого запуска Web Beta использует 50 матчей. После загрузки можно выбрать 100 или 200.',
  steamReason:'Steam API работает через защищённый сервер приложения.', loadViaSteam:'Обновить профиль', rememberKey:'', doNotSendKey:'', keyLocal:'',
  invalidKey:'Серверный Steam API временно не настроен.', authBadKey:'Серверный Steam API временно не настроен.', authBadId:'Не удалось определить Dota ID из Steam аккаунта.',
  webSessionExpired:'Сессия Steam истекла. Войдите снова.', loggingOut:'Выход…'
});
Object.assign(I18N.en,{
  authVersion:'Web Beta · Steam Login', authEyebrow:'Secure sign-in', authTitle:'Sign in through Steam',
  authDesc:'Dota Skill Lab receives only your verified Steam ID and public game data. Your password is entered only on Steam.',
  authStep1:'Authenticate on Steam', authStep2:'Check Dota 2 history', authStep3:'Build Player Model',
  authLogin:'Sign in through Steam', authConnecting:'Opening Steam…', authKeyNote:'Authentication happens on steamcommunity.com. The Steam Web API key is stored only on the application server.',
  authTrustTitle:'Your Steam password is never sent to Dota Skill Lab.', switchProfile:'Sign out of Steam',
  loadStageConnect:'Steam account verified', profileDepth:'Analysis depth', setupDesc:'Web Beta starts with 50 matches for a faster first load. You can switch to 100 or 200 after loading.',
  steamReason:'Steam API runs through the application server.', loadViaSteam:'Refresh profile', rememberKey:'', doNotSendKey:'', keyLocal:'',
  invalidKey:'The server-side Steam API is not configured.', authBadKey:'The server-side Steam API is not configured.', authBadId:'Could not derive a Dota ID from the Steam account.',
  webSessionExpired:'Your Steam session expired. Sign in again.', loggingOut:'Signing out…'
});

const t = key => I18N[state.lang]?.[key] ?? I18N.ru[key] ?? key;

function applyI18n(){
  document.documentElement.lang = state.lang;
  document.title = `Dota Skill Lab — ${state.lang==='ru'?'Web Beta':'Web Beta'}`;
  document.querySelectorAll('[data-i18n]').forEach(el=>{ const k=el.dataset.i18n; if(I18N[state.lang][k]!=null) el.textContent=t(k); });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{ const k=el.dataset.i18nHtml; if(I18N[state.lang][k]!=null) el.innerHTML=t(k); });
  document.querySelectorAll('[data-i18n-option]').forEach(el=>{ const k=el.dataset.i18nOption; if(I18N[state.lang][k]!=null) el.textContent=t(k); });
  $('langRu').classList.toggle('active',state.lang==='ru');
  $('langEn').classList.toggle('active',state.lang==='en');
  if($('authLangRu'))$('authLangRu').classList.toggle('active',state.lang==='ru');
  if($('authLangEn'))$('authLangEn').classList.toggle('active',state.lang==='en');
  $('journal').placeholder = state.lang==='ru' ? 'Например: на Pos 4 не заходить первым в туман после 20 минуты...' : 'Example: on Pos 4, do not enter fog first after minute 20...';
}
function setLanguage(lang){ if(!['ru','en'].includes(lang)) return; state.lang=lang; localStorage.setItem('dotaSkillLab.lang',lang); queueRemoteUserStateSync(); if(state.matches.length) renderAll(); else { applyI18n(); runDiagnostics(); } }

function extractAccountId(value){ const m=String(value||'').trim().match(/(?:players\/)?(\d{5,12})(?:\D*$|$)/); return m?m[1]:null; }
function showError(msg){ els.error.textContent=msg; els.error.classList.remove('hidden'); }
function clearError(){ els.error.classList.add('hidden'); els.error.textContent=''; }
function clamp(v,min=0,max=100){ return Math.max(min,Math.min(max,v)); }
function hasNum(v){ return v!==null && v!==undefined && v!=='' && Number.isFinite(Number(v)); }
function avg(arr,fn=x=>x){ return arr.length?arr.reduce((s,x)=>s+(Number(fn(x))||0),0)/arr.length:0; }
function quantile(values,q){ const a=values.filter(Number.isFinite).slice().sort((a,b)=>a-b); if(!a.length)return 0; const pos=(a.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos); return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo); }
function stddev(values){ const a=values.filter(Number.isFinite); if(a.length<2)return 0; const m=avg(a); return Math.sqrt(avg(a,x=>(x-m)**2)); }
function fmtPct(v,d=1){ return Number.isFinite(v)?`${(v*100).toFixed(d)}%`:'—'; }
function fmtNum(v){ return hasNum(v)?Number(v).toLocaleString(state.lang==='ru'?'ru-RU':'en-US'):'—'; }
function duration(s){ const m=Math.floor((Number(s)||0)/60); return `${m}:${String((Number(s)||0)%60).padStart(2,'0')}`; }
function dateFmt(ts){ return ts?new Date(Number(ts)*1000).toLocaleString(state.lang==='ru'?'ru-RU':'en-GB',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'; }
function dateFmtLong(ts){ return ts?new Date(Number(ts)*1000).toLocaleString(state.lang==='ru'?'ru-RU':'en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'; }
function isWin(m){ return (Number(m.player_slot)<128)===!!m.radiant_win; }
function isRanked(m){ return Number(m.lobby_type)===RANKED_LOBBY; }
function kda(m){ return ((Number(m.kills)||0)+(Number(m.assists)||0))/Math.max(1,Number(m.deaths)||0); }
function safeText(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function bitCount(n){ let x=Number(n)||0,c=0; while(x){c+=x&1;x>>=1;} return c; }

function heroName(id){ const h=state.heroMap?.[String(id)]; return h?.[state.lang] || h?.en || h?.localized_name || `${t('hero')} ${id}`; }
function heroInternalName(id){ return state.heroMap?.[String(id)]?.name || ''; }
function heroImg(id){ const n=heroInternalName(id).replace('npc_dota_hero_',''); return n?`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${n}.png`:''; }
function itemName(id){ const x=state.itemMap?.[String(id)]; return x?.[state.lang] || x?.en || (Number(id)?`${state.lang==='ru'?'Предмет':'Item'} ${id}`:''); }
function itemInternalName(id){ return state.itemMap?.[String(id)]?.name || ''; }
function itemImg(id){ if(!Number(id))return''; const x=state.itemMap?.[String(id)]||{}; if(x.image)return String(x.image); const n=itemInternalName(id).replace(/^item_/,''); return n?`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${n}.png`:''; }
function roleName(r){ return r?`Pos ${r}`:'—'; }

function remoteStorageSnapshot(){
  const trainingKey=state.accountId?`dotaSkillLab.training.${state.accountId}`:null;
  const journalKey=`dotaSkillLab.journal.${state.accountId||'guest'}`;
  let training=null;
  try{training=trainingKey?JSON.parse(localStorage.getItem(trainingKey)||'null'):null;}catch{}
  return {
    role_overrides: state.roleOverrides||{},
    rating_manual: state.ratingManual||{},
    training,
    journal: localStorage.getItem(journalKey)||'',
    preferences: {
      language: state.lang,
      scope: state.scope,
      history_limit: Number(els.historyLimit?.value||localStorage.getItem('dotaSkillLab.historyLimit')||50)
    }
  };
}
function applyRemoteState(remote){
  if(!remote||!state.accountId)return;
  const roles=(remote.role_overrides&&typeof remote.role_overrides==='object')?remote.role_overrides:{};
  const rating=(remote.rating_manual&&typeof remote.rating_manual==='object')?remote.rating_manual:{};
  localStorage.setItem(`dotaSkillLab.roles.${state.accountId}`,JSON.stringify(roles));
  localStorage.setItem(`dotaSkillLab.rating.${state.accountId}`,JSON.stringify(rating));
  const tk=`dotaSkillLab.training.${state.accountId}`;
  if(remote.training) localStorage.setItem(tk,JSON.stringify(remote.training)); else localStorage.removeItem(tk);
  localStorage.setItem(`dotaSkillLab.journal.${state.accountId}`,String(remote.journal||''));
  const pref=remote.preferences||{};
  if(['ru','en'].includes(pref.language)){state.lang=pref.language;localStorage.setItem('dotaSkillLab.lang',pref.language);}
  if(['ranked','all'].includes(pref.scope)){state.scope=pref.scope;localStorage.setItem('dotaSkillLab.matchScope',pref.scope);}
  const lim=String(pref.history_limit||'');
  if(['50','100','200'].includes(lim)){localStorage.setItem('dotaSkillLab.historyLimit',lim);if(els.historyLimit)els.historyLimit.value=lim;}
  if(els.matchScope)els.matchScope.value=state.scope==='all'?'all':'ranked';
  loadRoleOverrides();loadRatingManual();
}
async function loadRemoteUserState(){
  if(!state.accountId)return false;
  try{
    const data=await fetchJson('/api/user-state');
    state.remoteState={available:!!data.available,loaded:true,found:!!data.found,syncing:false,updatedAt:data.updated_at||null};
    if(!data.available)return false;
    if(data.found&&data.state){applyRemoteState(data.state);return true;}
    loadRoleOverrides();loadRatingManual();
    await saveRemoteUserState(true);
    return false;
  }catch(e){
    console.warn('Remote user state unavailable:',e);
    state.remoteState={...state.remoteState,available:false,loaded:true,syncing:false};
    return false;
  }
}
let remoteSyncTimer=null;
function queueRemoteUserStateSync(delay=500){
  if(!state.accountId)return;
  clearTimeout(remoteSyncTimer);
  remoteSyncTimer=setTimeout(()=>saveRemoteUserState(false),delay);
}
async function saveRemoteUserState(force=false){
  if(!state.accountId||state.remoteState.syncing)return false;
  if(!force&&state.remoteState.loaded&&!state.remoteState.available)return false;
  state.remoteState.syncing=true;
  try{
    const r=await fetch('/api/user-state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(remoteStorageSnapshot())});
    const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{}
    if(!r.ok)throw Object.assign(new Error(data.error||`HTTP ${r.status}`),{status:r.status});
    state.remoteState={available:!!data.available,loaded:true,found:true,syncing:false,updatedAt:data.updated_at||null};
    return !!data.available;
  }catch(e){console.warn('Remote user state save failed:',e);state.remoteState.syncing=false;return false;}
}

function roleKey(){ return `dotaSkillLab.roles.${state.accountId||'guest'}`; }
function loadRoleOverrides(){ try{state.roleOverrides=JSON.parse(localStorage.getItem(roleKey())||'{}')||{};}catch{state.roleOverrides={};} }
function saveRoleOverrides(){ localStorage.setItem(roleKey(),JSON.stringify(state.roleOverrides)); queueRemoteUserStateSync(); }
function manualRoleValue(v){ return typeof v==='object'&&v?Number(v.role):Number(v); }
function getRole(m){ const o=state.roleOverrides[String(m.match_id)]; return Number(manualRoleValue(o)||m.role_auto||0)||null; }
function roleConfidenceLevel(m){ if(state.roleOverrides[String(m.match_id)])return'manual'; const c=Number(m.role_confidence||0); return c>=.75?'high':c>=.55?'medium':'low'; }
function roleSource(m){ if(state.roleOverrides[String(m.match_id)])return'manual'; return String(m.role_source||'team_economy_v2'); }
function roleSourceLabel(m){ const s=roleSource(m); if(s==='manual')return t('roleManual'); if(s.startsWith('steam_explicit'))return t('roleExplicit'); return t('roleHeuristic'); }
function confidenceLabel(m){ const c=roleConfidenceLevel(m); return c==='manual'?t('roleManual'):c==='high'?t('confidenceHigh'):c==='medium'?t('confidenceMedium'):t('confidenceLow'); }

function ratingStorageKey(){ return `dotaSkillLab.rating.${state.accountId||'guest'}`; }
function loadRatingManual(){ try{state.ratingManual=JSON.parse(localStorage.getItem(ratingStorageKey())||'{}')||{};}catch{state.ratingManual={};} }
function saveRatingManual(v){ state.ratingManual=v||{}; localStorage.setItem(ratingStorageKey(),JSON.stringify(state.ratingManual)); queueRemoteUserStateSync(); }
const MEDALS=['herald','guardian','crusader','archon','legend','ancient','divine','immortal'];
function medalLabel(m){ const map={herald:'medalHerald',guardian:'medalGuardian',crusader:'medalCrusader',archon:'medalArchon',legend:'medalLegend',ancient:'medalAncient',divine:'medalDivine',immortal:'medalImmortal'}; return t(map[m]||'uncalibrated'); }
function rankTierData(rankTier,leaderboardRank){
  const rt=Number(rankTier), lb=Number(leaderboardRank);
  if(Number.isFinite(lb)&&lb>0)return {medal:'immortal',star:null,label:`${t('medalImmortal')} #${lb}`,leaderboard:lb};
  if(!Number.isFinite(rt)||rt<=0)return null;
  const tier=Math.floor(rt/10),star=rt%10,medal=MEDALS[tier-1]; if(!medal)return null;
  return {medal,star:medal==='immortal'?null:Math.max(1,Math.min(5,star||1)),label:medal==='immortal'?medalLabel(medal):`${medalLabel(medal)} ${Math.max(1,Math.min(5,star||1))}`};
}
function currentRating(){
  const a=state.ratingAuto||{},m=state.ratingManual||{},auto=rankTierData(a.rank_tier,a.leaderboard_rank);
  const manual=m.medal?{medal:m.medal,star:m.medal==='immortal'?null:Number(m.star||1),label:m.medal==='immortal'?medalLabel(m.medal):`${medalLabel(m.medal)} ${Number(m.star||1)}`}:null;
  const chosen=auto||manual;
  const mmr=hasNum(a.current_mmr)&&Number(a.current_mmr)>0?Number(a.current_mmr):(hasNum(m.mmr)&&Number(m.mmr)>0?Number(m.mmr):null);
  return {rank:chosen?.label||null,medal:chosen?.medal||null,star:chosen?.star||null,mmr,rankSource:auto?t('steamRatingFields'):manual?t('manualSnapshot'):t('ratingUnavailable'),mmrSource:hasNum(a.current_mmr)&&Number(a.current_mmr)>0?t('steamRatingFields'):(mmr?t('manualSnapshot'):t('ratingUnavailable')),delta20:hasNum(a.delta_last20)?Number(a.delta_last20):null};
}
function renderRankEmblem(r){
  const el=$('rankEmblem'); if(!el)return;
  el.className=`rank-emblem ${r.medal||'uncalibrated'}`;
  const stars=r.medal&&r.medal!=='immortal'?Array.from({length:5},(_,i)=>`<span class="${i<(r.star||0)?'on':''}">★</span>`).join(''):r.medal==='immortal'?'<span class="immortal-mark">◆</span>':'';
  el.innerHTML=`<div class="rank-gem"><span>${r.medal?String(MEDALS.indexOf(r.medal)+1):'?'}</span></div><div class="rank-stars">${stars}</div>`;
}

function matchMetrics(m){
  const mins=Math.max(1,Number(m.duration||0)/60);
  return {kda:kda(m),deaths:Number(m.deaths)||0,gpm:Number(m.gold_per_min)||0,xpm:Number(m.xp_per_min)||0,lhpm:(Number(m.last_hits)||0)/mins,dmgpm:(Number(m.hero_damage)||0)/mins,assistpm:(Number(m.assists)||0)/mins,killassistpm:((Number(m.kills)||0)+(Number(m.assists)||0))/mins,towerpm:(Number(m.tower_damage)||0)/mins,healingpm:(Number(m.hero_healing)||0)/mins,mins};
}
function durationBucketFromMinutes(mins){ const x=Number(mins)||0; return x<25?'lt25':x<35?'25_35':x<45?'35_45':'45p'; }
function durationBucketForMatch(m){ return durationBucketFromMinutes(matchMetrics(m).mins); }
function durationBucketLabel(bucket){ const map={lt25:'durationBucketLt25','25_35':'durationBucket25_35','35_45':'durationBucket35_45','45p':'durationBucket45p'}; return t(map[bucket]||'durationAll'); }
function durationBounds(bucket){ if(bucket==='lt25')return{min:0,max:25};if(bucket==='25_35')return{min:25,max:35};if(bucket==='35_45')return{min:35,max:45};if(bucket==='45p')return{min:45,max:0};return{min:0,max:0}; }
function percentileRank(values,x,higherBetter=true){ const a=values.filter(Number.isFinite); if(!a.length||!Number.isFinite(x))return 50; let less=0,equal=0; for(const v of a){if(v<x)less++;else if(v===x)equal++;} const p=((less+.5*equal)/a.length)*100; return higherBetter?p:100-p; }
const ROLE_WEIGHTS={1:{gpm:.25,lhpm:.20,kda:.15,deaths:.15,dmgpm:.15,towerpm:.10},2:{xpm:.20,gpm:.20,kda:.20,dmgpm:.20,deaths:.10,lhpm:.10},3:{dmgpm:.22,kda:.18,deaths:.18,assistpm:.15,xpm:.12,gpm:.08,towerpm:.07},4:{assistpm:.24,kda:.20,deaths:.20,xpm:.14,dmgpm:.10,gpm:.07,lhpm:.05},5:{assistpm:.25,deaths:.24,kda:.19,xpm:.12,gpm:.08,healingpm:.07,dmgpm:.05}};
function baselineMatchesFor(m,all,withMeta=false){
  const r=getRole(m),bucket=durationBucketForMatch(m),sameRole=all.filter(x=>getRole(x)===r),sameContext=sameRole.filter(x=>durationBucketForMatch(x)===bucket);
  let base,mode;if(sameContext.length>=6){base=sameContext;mode='roleDuration';}else if(sameRole.length>=8){base=sameRole;mode='role';}else{base=all;mode='all';}
  return withMeta?{matches:base,mode,bucket,contextN:sameContext.length,roleN:sameRole.length}:base;
}
function computeMatchScore(m,all){
  const role=getRole(m)||4,w=ROLE_WEIGHTS[role]||ROLE_WEIGHTS[4],metrics=matchMetrics(m),ctx=baselineMatchesFor(m,all,true),base=ctx.matches; let total=0,used=0;
  for(const [key,weight] of Object.entries(w)){const vals=base.map(x=>matchMetrics(x)[key]),inv=key==='deaths',p=percentileRank(vals,metrics[key],!inv);total+=p*weight;used+=weight;}
  const sample=base.length,contextBoost=ctx.mode==='roleDuration'?1:ctx.mode==='role' ? .88 : .72,confidence=Math.round(clamp((sample/20*100)*contextBoost,20,100));
  return {score:Math.round(total/Math.max(.0001,used)),confidence,sample,contextMode:ctx.mode,durationBucket:ctx.bucket};
}
function primaryRole(matches=state.matches){ const counts={1:0,2:0,3:0,4:0,5:0}; matches.forEach(m=>{const r=getRole(m);if(r)counts[r]++;}); const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]; return top&&top[1]?Number(top[0]):null; }
function roleBaselines(matches){ const out={}; for(let r=1;r<=5;r++){const subset=matches.filter(m=>getRole(m)===r),base=subset.length>=8?subset:matches,keys=['kda','deaths','gpm','xpm','lhpm','dmgpm','assistpm','towerpm','healingpm'];out[r]={n:subset.length};for(const k of keys){const vals=base.map(m=>matchMetrics(m)[k]);out[r][k]={p25:quantile(vals,.25),p40:quantile(vals,.40),p50:quantile(vals,.50),p60:quantile(vals,.60),p75:quantile(vals,.75)};}} return out; }

const MISTAKE_DEFS=[
  {key:'highDeaths',titleKey:'mistakeHighDeaths',descKey:'mistakeHighDeathsDesc',metric:'deaths',direction:'high',roles:[1,2,3,4,5]},
  {key:'lowKda',titleKey:'mistakeLowKda',descKey:'mistakeLowKdaDesc',metric:'kda',direction:'low',roles:[1,2,3,4,5]},
  {key:'lowGpm',titleKey:'mistakeLowGpm',descKey:'mistakeLowGpmDesc',metric:'gpm',direction:'low',roles:[1,2,3,4,5]},
  {key:'lowXpm',titleKey:'mistakeLowXpm',descKey:'mistakeLowXpmDesc',metric:'xpm',direction:'low',roles:[1,2,3,4,5]},
  {key:'lowDamage',titleKey:'mistakeLowDamage',descKey:'mistakeLowDamageDesc',metric:'dmgpm',direction:'low',roles:[1,2,3,4]},
  {key:'lowAssists',titleKey:'mistakeLowAssists',descKey:'mistakeLowAssistsDesc',metric:'assistpm',direction:'low',roles:[4,5]},
  {key:'lowFarm',titleKey:'mistakeLowFarm',descKey:'mistakeLowFarmDesc',metric:'lhpm',direction:'low',roles:[1,2,3]},
  {key:'lowTower',titleKey:'mistakeLowTower',descKey:'mistakeLowTowerDesc',metric:'towerpm',direction:'low',roles:[1,2,3]}
];
function buildMistakes(matches,baselines){
  const recent=matches.slice(0,30),list=[];
  for(const def of MISTAKE_DEFS){
    const eligible=recent.filter(m=>def.roles.includes(getRole(m))); if(eligible.length<5)continue;
    const occurred=[];
    for(const m of eligible){const r=getRole(m),val=matchMetrics(m)[def.metric],b=baselines[r]?.[def.metric];if(!b)continue;const threshold=def.direction==='high'?b.p75:b.p25,hit=def.direction==='high'?val>threshold:val<threshold;if(hit)occurred.push({m,val,threshold});}
    if(occurred.length<2)continue;
    const present=occurred.map(x=>x.m),absent=eligible.filter(m=>!present.includes(m)),wrPresent=present.length?present.filter(isWin).length/present.length:0,wrAbsent=absent.length?absent.filter(isWin).length/absent.length:wrPresent,gap=wrAbsent-wrPresent,freq=present.length/eligible.length,severity=avg(occurred,x=>def.direction==='high'?(x.val-x.threshold)/Math.max(1,Math.abs(x.threshold)):(x.threshold-x.val)/Math.max(1,Math.abs(x.threshold))),confidence=clamp((eligible.length/30*.45+Math.min(1,present.length/8)*.55)*100,20,100),gapNorm=clamp(gap/.40,0,1),sevNorm=clamp(severity,0,1),priority=Math.round(clamp(100*(freq*.45+gapNorm*.35+sevNorm*.20)*(.65+.35*confidence/100),0,100));
    list.push({...def,eligible:eligible.length,count:present.length,frequency:freq,wrPresent,wrAbsent,gap,severity,confidence,priority});
  }
  return list.sort((a,b)=>b.priority-a.priority);
}
function heroClassLabel(code){ return t({CORE:'heroClassCore',DEVELOP:'heroClassDevelop',SITUATIONAL:'heroClassSituational',PAUSE:'heroClassPause','LOW SAMPLE':'heroClassSample'}[code]||'heroClassSituational'); }
function buildHeroStats(matches){
  const groups=new Map(); for(const m of matches){const k=String(m.hero_id);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);}
  return [...groups.entries()].map(([heroId,ms])=>{
    const wins=ms.filter(isWin).length,recent=ms.slice(0,5),prior=ms.slice(5,10),avgScore=avg(ms,m=>m._score||50),trend=prior.length?avg(recent,m=>m._score||50)-avg(prior,m=>m._score||50):0,roles={};
    ms.forEach(m=>{const r=getRole(m);roles[r]=(roles[r]||0)+1;}); const mainRole=Number(Object.entries(roles).sort((a,b)=>b[1]-a[1])[0]?.[0])||null;
    let classification='SITUATIONAL',cls=''; if(ms.length<5){classification='LOW SAMPLE';cls='sample';}else if(ms.length>=12&&avgScore>=58&&wins/ms.length>=.5){classification='CORE';cls='core';}else if(ms.length>=15&&avgScore<42&&wins/ms.length<.45){classification='PAUSE';cls='pause';}else if(ms.length>=7&&(trend>=4||avgScore>=52)){classification='DEVELOP';cls='develop';}
    return {hero_id:Number(heroId),matches:ms,games:ms.length,wins,wr:wins/ms.length,avgScore,trend,mainRole,classification,cls,confidence:Math.round(clamp(ms.length/15*100,15,100)),kda:avg(ms,kda),deaths:avg(ms,m=>m.deaths),gpm:avg(ms,m=>m.gold_per_min),xpm:avg(ms,m=>m.xp_per_min)};
  }).sort((a,b)=>b.games-a.games);
}
const GAP_METRIC_DEFS={
  kda:{label:'KDA',higher:true},deaths:{labelKey:'deathsLabel',higher:false},gpm:{label:'GPM',higher:true},xpm:{label:'XPM',higher:true},lhpm:{labelKey:'patternMetricFarm',higher:true},dmgpm:{labelKey:'patternMetricDamage',higher:true},assistpm:{labelKey:'patternMetricAssists',higher:true},towerpm:{labelKey:'patternMetricTower',higher:true},healingpm:{labelKey:'patternMetricHealing',higher:true}
};
function gapMetricLabel(key){const d=GAP_METRIC_DEFS[key]||{};return d.label||t(d.labelKey||key);}
function heroRoleFitLabel(v){return v>=65?t('fitExcellent'):v>=56?t('fitGood'):v>=44?t('fitNeutral'):t('fitWeak');}
function buildHeroRoleProfiles(matches){
  const groups=new Map();
  for(const m of matches){const r=getRole(m);if(!r)continue;const k=`${m.hero_id}:${r}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);}
  const out=[];
  for(const [key,ms] of groups){
    if(ms.length<4)continue;const [heroId,role]=key.split(':').map(Number),weights=ROLE_WEIGHTS[role]||ROLE_WEIGHTS[4],roleBase=matches.filter(x=>getRole(x)===role),roleOther=roleBase.filter(x=>Number(x.hero_id)!==heroId);
    const metricPcts={};
    for(const metric of Object.keys(weights)){
      const def=GAP_METRIC_DEFS[metric]||{higher:metric!=='deaths'};const pcts=[];
      for(const m of ms){
        const bucket=durationBucketForMatch(m);let base=roleOther.filter(x=>durationBucketForMatch(x)===bucket);
        if(base.length<6)base=roleOther.length>=8?roleOther:roleBase;if(base.length<5)continue;
        const value=matchMetrics(m)[metric],vals=base.map(x=>matchMetrics(x)[metric]).filter(Number.isFinite);if(vals.length>=5)pcts.push(percentileRank(vals,value,def.higher!==false));
      }
      metricPcts[metric]=pcts.length?avg(pcts):50;
    }
    let fitNum=0,fitDen=0;for(const [metric,w] of Object.entries(weights)){fitNum+=(metricPcts[metric]??50)*w;fitDen+=w;}const fitScore=fitDen?fitNum/fitDen:50;
    const ranked=Object.keys(weights).map(metric=>({metric,pct:metricPcts[metric]??50}));ranked.sort((a,b)=>b.pct-a.pct);
    const durationMix={lt25:0,'25_35':0,'35_45':0,'45p':0};ms.forEach(m=>durationMix[durationBucketForMatch(m)]++);
    const avgDur=avg(ms,m=>matchMetrics(m).mins),roleConfidence=avg(ms,m=>roleConfidenceLevel(m)==='manual'?1:Number(m.role_confidence||0));
    out.push({hero_id:heroId,role,matches:ms,n:ms.length,wr:ms.filter(isWin).length/ms.length,avgScore:avg(ms,m=>m._score||50),fitScore,metricPcts,strengths:ranked.slice(0,3),gaps:ranked.slice().sort((a,b)=>a.pct-b.pct).slice(0,3),durationMix,avgDuration:avgDur,confidence:Math.round(clamp((ms.length/15*.7+Math.min(1,roleBase.length/30)*.2+Math.min(1,roleConfidence)*.1)*100,20,100))});
  }
  return out.sort((a,b)=>b.n-a.n||b.fitScore-a.fitScore);
}
function buildDNA(matches){ const recent=matches.slice(0,20); if(!recent.length)return{}; const percentileAvg=(metric,inverse=false)=>avg(recent,m=>{const base=baselineMatchesFor(m,matches).map(x=>matchMetrics(x)[metric]);return percentileRank(base,matchMetrics(m)[metric],!inverse);}),scores=recent.map(m=>m._score||50); return {survival:percentileAvg('deaths',true),economy:avg([percentileAvg('gpm'),percentileAvg('lhpm')]),tempo:avg([percentileAvg('xpm'),percentileAvg('killassistpm')]),combat:avg([percentileAvg('dmgpm'),percentileAvg('kda')]),consistency:clamp(100-stddev(scores)*2.7,0,100)}; }
function buildProgress(matches){ const current=matches.slice(0,20),previous=matches.slice(20,40),stats=ms=>({wr:ms.length?ms.filter(isWin).length/ms.length:0,kda:avg(ms,kda),deaths:avg(ms,m=>m.deaths),gpm:avg(ms,m=>m.gold_per_min),xpm:avg(ms,m=>m.xp_per_min),score:avg(ms,m=>m._score||50)}); return {current:stats(current),previous:stats(previous),nCurrent:current.length,nPrevious:previous.length}; }

const PATTERN_METRICS=[
  {key:'deaths',label:'patternMetricDeaths',higher:false,roles:[1,2,3,4,5],digits:0},
  {key:'kda',label:'patternMetricKda',higher:true,roles:[1,2,3,4,5],digits:2},
  {key:'gpm',label:'patternMetricGpm',higher:true,roles:[1,2,3,4,5],digits:0},
  {key:'xpm',label:'patternMetricXpm',higher:true,roles:[1,2,3,4,5],digits:0},
  {key:'dmgpm',label:'patternMetricDamage',higher:true,roles:[1,2,3,4],digits:0},
  {key:'assistpm',label:'patternMetricAssists',higher:true,roles:[4,5],digits:2},
  {key:'lhpm',label:'patternMetricFarm',higher:true,roles:[1,2,3],digits:1},
  {key:'towerpm',label:'patternMetricTower',higher:true,roles:[1,2,3],digits:0}
];
function splitChronological(ms,trainShare=.65){
  const a=ms.slice().sort((x,y)=>Number(x.start_time)-Number(y.start_time));
  const cut=Math.max(8,Math.min(a.length-5,Math.floor(a.length*trainShare)));
  return {train:a.slice(0,cut),validate:a.slice(cut)};
}
function thresholdGroups(ms,def,th){
  const good=ms.filter(m=>def.higher?matchMetrics(m)[def.key]>=th:matchMetrics(m)[def.key]<=th);
  const bad=ms.filter(m=>!good.includes(m));
  const wrGood=good.length?good.filter(isWin).length/good.length:0,wrBad=bad.length?bad.filter(isWin).length/bad.length:0;
  return {good,bad,wrGood,wrBad,gap:wrGood-wrBad};
}
function bestThresholdFor(ms,def,context={}){
  if(ms.length<24)return null;
  const {train,validate}=splitChronological(ms,.65);
  if(train.length<14||validate.length<8)return null;
  const vals=train.map(m=>matchMetrics(m)[def.key]).filter(Number.isFinite); if(vals.length<14)return null;
  const qs=[.35,.5,.65],minTrain=Math.max(6,Math.ceil(train.length*.18)),minVal=Math.max(4,Math.ceil(validate.length*.18)); let best=null;
  for(const q of qs){
    const th=quantile(vals,q),tr=thresholdGroups(train,def,th),va=thresholdGroups(validate,def,th);
    if(tr.good.length<minTrain||tr.bad.length<minTrain||va.good.length<minVal||va.bad.length<minVal)continue;
    if(tr.gap<.05||va.gap<.02)continue;
    const gap=Math.min(.60,(tr.gap*.40)+(va.gap*.60));
    const stability=clamp(1-Math.abs(tr.gap-va.gap)/.30,0,1);
    const balance=Math.min(tr.good.length,tr.bad.length,va.good.length,va.bad.length)/Math.max(1,Math.min(train.length,validate.length)/2);
    const sampleFactor=Math.min(1,ms.length/70);
    const confidence=clamp(100*(.38*sampleFactor+.37*stability+.25*clamp(balance,0,1)),25,95);
    const score=gap*(.55+.45*confidence/100)*(.7+.3*stability);
    const cand={...context,metric:def.key,labelKey:def.label,higher:def.higher,digits:def.digits,threshold:th,n:ms.length,
      goodN:tr.good.length+va.good.length,badN:tr.bad.length+va.bad.length,
      wrGood:(tr.wrGood*tr.good.length+va.wrGood*va.good.length)/Math.max(1,tr.good.length+va.good.length),
      wrBad:(tr.wrBad*tr.bad.length+va.wrBad*va.bad.length)/Math.max(1,tr.bad.length+va.bad.length),
      gap,confidence,associationScore:score,trainGap:tr.gap,validationGap:va.gap,validationN:validate.length,stability};
    if(!best||cand.associationScore>best.associationScore)best=cand;
  }
  return best;
}
function buildPatterns(matches){
  const role=primaryRole(matches.slice(0,120)); const roleSet=role?matches.filter(m=>getRole(m)===role):matches; const base=roleSet.length>=30?roleSet:matches;
  const overall=[];
  for(const def of PATTERN_METRICS.filter(d=>!role||d.roles.includes(role))){const p=bestThresholdFor(base,def,{role,context:'role'});if(p)overall.push(p);}
  overall.sort((a,b)=>b.associationScore-a.associationScore);
  const heroRole=[]; const groups=new Map();
  for(const m of matches){const r=getRole(m);if(!r)continue;const key=`${m.hero_id}:${r}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
  for(const [key,ms] of groups){if(ms.length<24)continue;const [heroId,roleStr]=key.split(':').map(Number);let best=null;for(const def of PATTERN_METRICS.filter(d=>d.roles.includes(roleStr))){const p=bestThresholdFor(ms,def,{hero_id:heroId,role:roleStr,context:'heroRole'});if(p&&(!best||p.associationScore>best.associationScore))best=p;}if(best&&best.validationGap>=.05)heroRole.push(best);}
  heroRole.sort((a,b)=>b.associationScore-a.associationScore);
  return {primaryRole:role,overall,heroRole,method:'chronological_holdout_v10'};
}
function wilsonHalfWidth(p,n){ if(!n)return 0; const z=1.96,den=1+z*z/n; return z*Math.sqrt((p*(1-p)/n)+(z*z/(4*n*n)))/den; }
function buildSessions(matches){
  const sorted=matches.slice().sort((a,b)=>Number(a.start_time)-Number(b.start_time)); const sessions=[]; let current=[]; let prev=null;
  for(const m of sorted){const endPrev=prev?Number(prev.start_time)+Number(prev.duration||0):0;const gap=prev?Number(m.start_time)-endPrev:Infinity;if(!current.length||gap<=SESSION_GAP_SECONDS){current.push(m);}else{sessions.push(current);current=[m];}prev=m;} if(current.length)sessions.push(current);
  const summarized=sessions.map((games,i)=>({id:i+1,games,start:games[0]?.start_time||0,end:(games.at(-1)?.start_time||0)+(games.at(-1)?.duration||0),wins:games.filter(isWin).length,wr:games.length?games.filter(isWin).length/games.length:0,score:avg(games,m=>m._score||50),deaths:avg(games,m=>m.deaths),kda:avg(games,kda)}));
  const positions=[1,2,3,4].map(pos=>{const bucket=[];for(const s of sessions){s.forEach((m,i)=>{const p=i>=3?4:i+1;if(p===pos)bucket.push(m);});}const wr=bucket.length?bucket.filter(isWin).length/bucket.length:0;return{pos,label:pos===4?'4+':String(pos),n:bucket.length,wr,wrCi:wilsonHalfWidth(wr,bucket.length),score:avg(bucket,m=>m._score||50),deaths:avg(bucket,m=>m.deaths),kda:avg(bucket,kda)};});
  const streakBuckets={1:[],2:[],3:[]};
  for(const s of sessions){let losses=0;for(const m of s){const before=Math.min(3,losses);if(before>=1)streakBuckets[before].push(m);if(isWin(m))losses=0;else losses++;}}
  const streaks=[1,2,3].map(n=>{const ms=streakBuckets[n],wr=ms.length?ms.filter(isWin).length/ms.length:0;return{losses:n,n:ms.length,wr,wrCi:wilsonHalfWidth(wr,ms.length),score:avg(ms,m=>m._score||50),deaths:avg(ms,m=>m.deaths),kda:avg(ms,kda)};});
  const multi=summarized.filter(s=>s.games.length>=2),overallWr=matches.length?matches.filter(isWin).length/matches.length:0,overallScore=avg(matches,m=>m._score||50),avgGames=summarized.length?avg(summarized,s=>s.games.length):0,longest=Math.max(0,...summarized.map(s=>s.games.length));
  let recommendation='noSessionDecline',strength='neutral';
  const p1=positions[0],p4=positions[3],s2=streaks[1]; const wrDrop=p1.wr-p4.wr,scoreDrop=p1.score-p4.score;
  if(p1.n>=12&&p4.n>=12&&scoreDrop>=7&&wrDrop>=.08){recommendation='sessionDropAfterThree';strength='warn';}
  else if(p1.n>=12&&p4.n>=12&&wrDrop>=.08&&Math.abs(scoreDrop)<7){recommendation='sessionOutcomeOnly';strength='neutral';}
  else if(s2.n>=10&&(overallWr-s2.wr)>=.10&&(overallScore-s2.score)>=6){recommendation='sessionDropAfterTwoLosses';strength='warn';}
  else if(multi.length<10){recommendation='sessionSampleLow';strength='neutral';}
  return {sessions:summarized,positions,streaks,sessionCount:summarized.length,multiCount:multi.length,avgGames,longest,overallWr,overallScore,recommendation,strength,wrDrop,scoreDrop,method:'performance_plus_outcome_v14'};
}
function recomputeAnalytics(){
  loadRoleOverrides(); state.matches.sort((a,b)=>Number(b.start_time)-Number(a.start_time));
  for(const m of state.matches){const s=computeMatchScore(m,state.matches);m._score=s.score;m._scoreConfidence=s.confidence;m._scoreContext=s.contextMode;m._durationBucket=s.durationBucket;}
  const baselines=roleBaselines(state.matches),mistakes=buildMistakes(state.matches,baselines),heroes=buildHeroStats(state.matches),heroRoles=buildHeroRoleProfiles(state.matches),dna=buildDNA(state.matches),progress=buildProgress(state.matches),pRole=primaryRole(state.matches.slice(0,100)),patterns=buildPatterns(state.matches),sessions=buildSessions(state.matches);
  state.analytics={baselines,mistakes,heroes,heroRoles,dna,progress,primaryRole:pRole,patterns,sessions};
}

async function fetchJson(url){ const r=await fetch(url,{headers:{Accept:'application/json'}});let data=null;try{data=await r.json();}catch{}if(!r.ok){const e=new Error(data?.details||data?.error||`HTTP ${r.status}`);e.status=r.status;e.upstreamStatus=data?.upstream_status;throw e;}return data; }
function friendlyError(msg){ const s=String(msg||'');if(/private|status 15/i.test(s))return t('matchHistoryPrivate');if(/32 hexadecimal|32 символ/i.test(s))return t('invalidKey');return s; }
async function runDiagnostics(){ if(IS_DIRECT_FILE)return;try{const d=await fetchJson('/api/diagnostics');state.diagnostics=d;if(d.steam?.ok){els.sourceStatus.className='source-status ok';els.sourceStatus.textContent=`${t('steamAvailable')}${d.opendota?.ok?` · ${t('opendotaAvailable')}`:` · ${t('opendotaBlocked')}`}`;}else{els.sourceStatus.className='source-status bad';els.sourceStatus.textContent=t('steamUnavailable');}}catch{els.sourceStatus.className='source-status warn';els.sourceStatus.textContent=t('networkDiagFailed');} }


function setLoadPipeline(stage='connect',visible=true){
  const host=$('authLoadPipeline');if(!host)return;host.classList.toggle('hidden',!visible);const order=['connect','history','analytics','ready'],idx=order.indexOf(stage);
  host.querySelectorAll('.load-stage').forEach((el,i)=>{el.classList.toggle('done',i<idx);el.classList.toggle('active',i===idx);});
}

async function loadViaSteam(id){
  if(!id)throw new Error(t('authBadId'));setLoadPipeline('connect',true);
  const limit=Math.max(20,Math.min(200,Number(els.historyLimit.value)||50)),scope=els.matchScope.value==='all'?'all':'ranked'; state.scope=scope; state.steamKey='server';
  els.status.textContent=`${t('importing')} ${limit} ${scope==='ranked'?t('rankedDataset'):t('allDataset')} ${t('matchesWord')}…`;setLoadPipeline('history',true);
  const bundle=await fetchJson(`/api/steam/bundle?limit=${limit}&scope=${encodeURIComponent(scope)}`);
  setLoadPipeline('analytics',true);state.provider='steam';state.profile=bundle.profile||{};state.matches=(Array.isArray(bundle.matches)?bundle.matches:[]).sort((a,b)=>Number(b.start_time)-Number(a.start_time));state.heroMap=bundle.heroMap||{};state.itemMap=bundle.itemMap||{};state.steamId64=bundle.steam_id64||null;state.ratingAuto=bundle.rating||{};state.accountId=String(bundle.account_id||id);
  loadRoleOverrides();loadRatingManual();recomputeAnalytics();
  localStorage.setItem('dotaSkillLab.lastAccountId',state.accountId);localStorage.setItem('dotaSkillLab.historyLimit',String(limit));localStorage.setItem('dotaSkillLab.matchScope',scope);queueRemoteUserStateSync(900);
  state.bundleMeta={scanned:bundle.scanned_history_count||bundle.history_count||state.matches.length,failed:bundle.failed_matches||0,scope:bundle.scope||scope,itemSource:bundle.item_source||'none'};setLoadPipeline('ready',true); return bundle;
}
async function loadPlayer(){
  clearError();if(IS_DIRECT_FILE)return showError(t('directFile'));
  const id=state.accountId||extractAccountId(els.input.value);if(!id)return showAuthGate();state.accountId=id;els.input.value=id;els.load.disabled=true;els.load.textContent=t('loading');
  try{const bundle=await loadViaSteam(id);renderAll();loadJournal();els.status.textContent=`${t('steamAvailable')} · ${state.matches.length} ${t('matchesWord')}`;els.status.classList.add('online');els.setup.classList.add('hidden');els.steamFallback.classList.add('hidden');els.profileStrip.classList.remove('hidden');hideAuthGate();if(bundle.failed_matches>0)showError(state.lang==='ru'?`${bundle.failed_matches} матчей временно не загрузились; при обновлении сайт повторит попытку.`:`${bundle.failed_matches} match details failed temporarily and will be retried on refresh.`);}catch(e){console.error(e);if(e.status===401){showAuthGate(t('webSessionExpired'));return;}showError(`Steam API: ${friendlyError(e.message)}`);els.status.textContent=t('loadError');}finally{els.load.disabled=false;els.load.textContent=t('loadAnalytics');}
}
async function handleSteamLoad(){return loadPlayer();}


const AUTH_KEYS={remember:'dotaSkillLab.web.auth'};
function setAuthError(msg=''){const el=$('authError');if(!el)return;el.textContent=msg;el.classList.toggle('hidden',!msg);}
function showAuthGate(msg=''){
  const gate=$('authGate');if(!gate)return;gate.classList.remove('hidden');setAuthError(msg);setLoadPipeline('connect',false);
}
function hideAuthGate(){if($('authGate'))$('authGate').classList.add('hidden');}
function persistAuth(){/* Steam session is stored in a secure HttpOnly cookie by the backend. */}
async function clearRememberedAuth(){return logoutSteam();}
async function authenticateAndLoad(){
  setAuthError('');$('authLoginBtn').disabled=true;setLoadPipeline('connect',true);$('authLoginBtn').querySelector('[data-i18n]')?.replaceChildren(document.createTextNode(t('authConnecting')));window.location.assign('/api/auth/steam');
}
async function logoutSteam(){
  try{els.status.textContent=t('loggingOut');await fetchJson('/api/auth/logout');}catch{}
  state.accountId=null;state.profile=null;state.matches=[];state.analytics=null;state.steamKey='';localStorage.removeItem('dotaSkillLab.lastAccountId');showAuthGate();els.profileStrip.classList.add('hidden');els.setup.classList.add('hidden');
}
async function bootstrapSteamAuth(){
  try{
    const me=await fetchJson('/api/auth/me');
    if(!me?.authenticated){showAuthGate();return;}
    state.accountId=String(me.account_id||'');state.steamId64=String(me.steamid64||'');state.steamKey='server';els.input.value=state.accountId;
    if(me.profile)state.profile={profile:me.profile};setLoadPipeline('connect',true);await loadRemoteUserState();applyI18n();await loadPlayer();setTimeout(()=>setLoadPipeline('ready',false),650);
  }catch(e){console.error(e);showAuthGate(friendlyError(e.message));}
}
function journalStorageKey(){return `dotaSkillLab.journal.${state.accountId||'guest'}`;}
function loadJournal(){const old=localStorage.getItem('dotaSkillLab.journal');const key=journalStorageKey();if(!localStorage.getItem(key)&&old&&state.accountId)localStorage.setItem(key,old);$('journal').value=localStorage.getItem(key)||'';}

function renderAll(){ applyI18n();renderProfile();renderOverview();renderCoachPage();renderDeepSetup();renderMatches();renderPatterns();renderSessions();renderHeroes();renderMistakes();renderTraining();renderProgress();renderBenchmarkSetup();if(state.benchmark.data)renderBenchmark(); }
function renderProfile(){ const p=state.profile?.profile||{};els.avatar.src=p.avatarfull||p.avatar||'';els.avatar.style.visibility='visible';els.avatar.onerror=()=>els.avatar.style.visibility='hidden';els.profileName.textContent=p.personaname||`${state.lang==='ru'?'Игрок':'Player'} ${state.accountId}`;const low=state.matches.filter(m=>roleConfidenceLevel(m)==='low').length;els.profileMeta.textContent=`Dota ID ${state.accountId} · ${t('sourceSteam')} · ${state.scope==='ranked'?t('scopeRanked'):t('scopeAll')}`;const scanned=state.bundleMeta?.scanned||state.matches.length;const itemSource=state.bundleMeta?.itemSource||'none';const itemLabel=itemSource==='dota2_datafeed'?t('itemCatalogSteam'):itemSource==='dotaconstants_fallback'?t('itemCatalogFallback'):t('itemCatalogMissing');const syncLabel=state.remoteState?.available?t('cloudSyncOn'):t('cloudSyncLocal');els.datasetChip.textContent=`${state.matches.length} ${t('matchesWord')} · ${t('scanned')} ${scanned} · ${low} ${t('lowRole')} · ${itemLabel} · ${syncLabel}`; }
function renderOverview(){
  const ms=state.matches,a=state.analytics,w=ms.filter(isWin).length,r=currentRating();
  $('kpiMatches').textContent=ms.length;$('kpiDepth').textContent=state.scope==='ranked'?t('scopeRanked'):t('scopeAll');$('kpiWinrate').textContent=fmtPct(ms.length?w/ms.length:0,1);$('kpiRecord').textContent=state.lang==='ru'?`${w} побед · ${ms.length-w} поражений`:`${w}W – ${ms.length-w}L`;$('kpiKda').textContent=avg(ms,kda).toFixed(2);$('kpiDeaths').textContent=avg(ms,m=>m.deaths).toFixed(1);$('deathSignal').textContent=ms.length>=20?`${t('last20')}: ${avg(ms.slice(0,20),m=>m.deaths).toFixed(1)}`:'—';$('coachScore').textContent=Math.round(avg(ms.slice(0,20),m=>m._score||50));$('kpiRole').textContent=roleName(a.primaryRole);const roleN=ms.slice(0,100).filter(m=>getRole(m)===a.primaryRole).length;$('roleConfidence').textContent=a.primaryRole?`${roleN}/${Math.min(100,ms.length)}`:'—';
  $('kpiRank').textContent=r.rank||t('uncalibrated');$('rankSource').textContent=r.rankSource;renderRankEmblem(r);$('kpiMmr').textContent=r.mmr?Math.round(r.mmr).toLocaleString(state.lang==='ru'?'ru-RU':'en-US'):t('uncalibrated');$('mmrDeltaSummary').textContent=r.delta20!=null?`${t('deltaLast20')}: ${r.delta20>=0?'+':''}${r.delta20}`:r.mmrSource;
  renderDNA();renderFocus();renderTrend();renderRoleMix();renderScoreBars();renderTopHeroes();renderCoachCockpit();renderQuickCompare();renderInsightSummary();
}
function renderDNA(){ const labels={survival:'dnaSurvival',economy:'dnaEconomy',tempo:'dnaTempo',combat:'dnaCombat',consistency:'dnaConsistency'};$('dnaGrid').innerHTML=Object.entries(state.analytics.dna).map(([k,v])=>`<div class="dna-row"><span>${t(labels[k]||k)}</span><div class="dna-track"><div class="dna-fill" style="width:${clamp(v)}%"></div></div><strong>${Math.round(v)}</strong></div>`).join(''); }
function renderFocus(){ const m=state.analytics.mistakes[0],box=$('mainFocus');if(!m){$('focusPriority').textContent='—';box.innerHTML=`<p class="muted">${t('noData')}</p>`;return;}$('focusPriority').textContent=`${m.priority}/100`;const role=state.analytics.primaryRole,target=trainingTargetFor(m,role);box.innerHTML=`<strong>${t(m.titleKey)}</strong><br>${t(m.descKey)}<div class="focus-rule">${t('frequency')}: <b>${fmtPct(m.frequency,0)}</b> · ${t('wrPattern')}: <b>${fmtPct(m.wrPresent,0)}</b> · ${t('withoutIt')}: <b>${fmtPct(m.wrAbsent,0)}</b><br>${t('confidence')}: <b>${Math.round(m.confidence)}%</b>${target?`<br><br>${t('nextGoal')} ${roleName(role)}: <b>${target.label}</b>`:''}</div>`; }
function renderTrend(){ const ms=state.matches.slice(0,20).slice().reverse(),max=Math.max(1,...ms.map(m=>m._score||50));$('matchTrend').innerHTML=ms.map(m=>`<div class="trend-col ${isWin(m)?'win':'loss'}" title="${safeText(heroName(m.hero_id))} · ${t('scoreLabel')} ${m._score}" style="height:${Math.max(18,(m._score||50)/max*100)}%"><span>${m._score}</span></div>`).join(''); }
function renderRoleMix(){ const ms=state.matches.slice(0,100),counts=[1,2,3,4,5].map(r=>[r,ms.filter(m=>getRole(m)===r).length]);$('roleMix').innerHTML=counts.map(([r,n])=>`<div class="role-row"><span>Pos ${r}</span><div class="role-track"><div class="role-fill" style="width:${ms.length?n/ms.length*100:0}%"></div></div><b>${ms.length?Math.round(n/ms.length*100):0}%</b></div>`).join(''); }
function renderScoreBars(){ const ms=state.matches.slice(0,20).slice().reverse();$('scoreBars').innerHTML=ms.map(m=>`<div class="bar-wrap" title="${safeText(heroName(m.hero_id))} · ${roleName(getRole(m))} · ${t('scoreLabel')} ${m._score}"><em>${m._score}</em><div class="bar ${m._score>=60?'good':''}" style="height:${Math.max(4,m._score)}%"></div><small>${isWin(m)?'✓':'×'}</small></div>`).join(''); }
function renderTopHeroes(){ $('topHeroes').innerHTML=state.analytics.heroes.slice(0,6).map(h=>`<div class="hero-line"><img class="hero-icon" src="${heroImg(h.hero_id)}"><div><strong>${safeText(heroName(h.hero_id))}</strong><span>${h.games} ${t('matchesWord')} · ${roleName(h.mainRole)} · ${t('scoreLabel')} ${Math.round(h.avgScore)}</span></div><div class="hero-wr">${fmtPct(h.wr,0)}</div></div>`).join(''); }


function trendMeta(curr,prev,higherBetter=true){
  const c=Number(curr)||0,p=Number(prev)||0,d=c-p,eff=higherBetter?d:-d;
  let cls='flat',arrow='→',label=t('stableState');
  if(eff>0.05){cls='up';arrow='↑';label=t('improving');}
  else if(eff<-0.05){cls='down';arrow='↓';label=t('worsening');}
  return {diff:d,cls,arrow,label};
}
function fmtDeltaNumber(v,d=1){
  if(!Number.isFinite(v)) return '—';
  const sign=v>0?'+':'';
  return sign+Number(v).toFixed(d);
}
function metricCardHtml(title,value,sub,cls=''){return `<div class="cockpit-card ${cls}"><span>${title}</span><strong>${value}</strong><small>${sub}</small></div>`;}
function performanceGrade(score){const s=Number(score)||0;return s>=85?'S':s>=72?'A':s>=58?'B':s>=45?'C':'D';}
function gradeClass(score){return `grade-${performanceGrade(score).toLowerCase()}`;}
function trainingSnapshot(){
  const active=getTraining(),suggested=trainingTargetFor(state.analytics?.mistakes?.[0],state.analytics?.primaryRole),tg=active||suggested;
  if(!tg)return {active:false,tg:null,results:[],passed:0,status:t('questReady')};
  const newer=active?state.matches.filter(m=>Number(m.start_time)>Number(active.startTime||0)&&getRole(m)===Number(active.role)).slice().sort((a,b)=>a.start_time-b.start_time).slice(0,5):[];
  const results=newer.map(m=>({m,pass:passesTraining(m,tg)})),passed=results.filter(x=>x.pass).length;
  const status=!active?t('questReady'):results.length>=5?(passed>=4?t('questMastered'):t('questRepeat')):t('questOnTrack');
  return {active:!!active,tg,results,passed,status};
}
function reviewSignal(m){
  const score=Number(m._score||50),conf=roleConfidenceLevel(m),model=coachModelForMatch(m);
  if(conf==='low')return {icon:'⚠',key:'roleUncertain',cls:'uncertain'};
  if(score<45||model?.risks?.some(x=>x.pct<20))return {icon:'!',key:'reviewRecommended',cls:'review'};
  if(score>=78)return {icon:'★',key:'strongMatch',cls:'strong'};
  return null;
}
function renderCoachCockpit(){
  const host=$('coachCockpit'); if(!host) return;
  const a=state.analytics||{},focus=a.mistakes?.[0],latest=state.matches[0],snap=trainingSnapshot();
  const now=state.matches.slice(0,20),prev=state.matches.slice(20,40),score=Math.round(avg(now,m=>m._score||50)),prevScore=prev.length?Math.round(avg(prev,m=>m._score||50)):score,scoreDelta=score-prevScore;
  const grade=performanceGrade(score),target=snap.tg?.label||t('noData'),progress=snap.results.length;
  const questDots=[0,1,2,3,4].map(i=>{const x=snap.results[i];return `<i class="quest-dot ${x?(x.pass?'pass':'fail'):''}" title="${x?(x.pass?t('pass'):t('miss')):`${t('gameWord')} ${i+1}`}"></i>`}).join('');
  const latestModel=latest?coachModelForMatch(latest):null,latestSignal=latest?reviewSignal(latest):null;
  const focusName=focus?t(focus.titleKey):t('noData'),focusConfidence=focus?Math.round(focus.confidence):0;
  host.innerHTML=`
    <div class="command-score-block">
      <div class="score-ring" style="--score:${clamp(score)}"><div class="score-ring-inner"><b>${score}</b><span>${t('coachScoreShort')}</span></div></div>
      <div class="score-grade ${gradeClass(score)}"><strong>${grade}</strong><span>${t('gradeLabel')}</span></div>
      <div class="score-trend ${scoreDelta>2?'up':scoreDelta<-2?'down':'flat'}"><b>${scoreDelta>0?'+':''}${scoreDelta}</b><span>${t('formTrend')} · 20 vs 20</span></div>
    </div>
    <div class="command-focus-block">
      <div class="command-kicker"><span class="live-dot"></span>${snap.active?t('activeTrainingStatus'):t('currentQuest')}</div>
      <h2>${safeText(focusName)}</h2>
      <div class="focus-evidence"><span>${t('priorityLabel')} <b>${focus?focus.priority:'—'}/100</b></span><span>${t('confidence')} <b>${focusConfidence}%</b></span><span>${t('frequency')} <b>${focus?fmtPct(focus.frequency,0):'—'}</b></span></div>
      <div class="quest-target"><span>${t('focusTarget')}</span><strong>${safeText(target)}</strong></div>
      <div class="quest-progress-line"><div class="quest-dots">${questDots}</div><b>${progress}/5</b><span>${snap.status}</span></div>
      <div class="command-actions"><button class="primary jump-btn" data-jump="training">${t('openTrainingTab')}</button><button class="secondary jump-btn" data-jump="patterns">${t('openPatternsTab')}</button></div>
    </div>
    <div class="command-match-block">
      <div class="command-kicker">${t('lastMatchBrief')}</div>
      ${latest?`<div class="latest-match-hero"><img src="${heroImg(latest.hero_id)}"><div><strong>${safeText(heroName(latest.hero_id))}</strong><span>${roleName(getRole(latest))} · ${isWin(latest)?t('victory'):t('defeat')}</span></div><div class="match-grade ${gradeClass(latest._score||50)}">${performanceGrade(latest._score||50)}</div></div>
      <div class="latest-match-stats"><div><span>${t('scoreLabel')}</span><b>${latest._score||50}</b></div><div><span>KDA</span><b>${latest.kills}/${latest.deaths}/${latest.assists}</b></div><div><span>${t('duration')}</span><b>${duration(latest.duration)}</b></div></div>
      ${latestSignal?`<div class="match-signal ${latestSignal.cls}"><b>${latestSignal.icon}</b><span>${t(latestSignal.key)}</span></div>`:''}
      <button class="secondary full-width open-latest-match">${t('openFullMatch')}</button>`:`<div class="notice">${t('noData')}</div>`}
    </div>`;
  host.querySelectorAll('.jump-btn').forEach(btn=>btn.onclick=()=>switchSection(btn.dataset.jump));
  const open=host.querySelector('.open-latest-match');if(open&&latest)open.onclick=()=>openFullMatch(latest.match_id);
}
function renderQuickCompare(){
  const host=$('quickCompare'); if(!host) return;
  const now=state.matches.slice(0,20), prev=state.matches.slice(20,40);
  if(!now.length){host.innerHTML=`<div class="notice">${t('noData')}</div>`; return;}
  const rows=[];
  const build=(label,cur,prv,higherBetter,digits=1,percent=false)=>{const meta=trendMeta(cur,prv,higherBetter); const fmtVal=v=>percent?fmtPct(v,digits):(Number.isFinite(v)?Number(v).toFixed(digits):'—'); rows.push(`<div class="compare-row"><span>${label}</span><b>${fmtVal(cur)}</b><b>${prev.length?fmtVal(prv):'—'}</b><span class="trend-chip ${meta.cls}">${meta.arrow} ${prev.length?(percent?fmtPct(meta.diff,digits):fmtDeltaNumber(meta.diff,digits)):t('stableState')}</span></div>`)};
  build(t('compareMetricScore'),avg(now,m=>m._score||50),avg(prev,m=>m._score||50),true,0,false);
  build(t('compareMetricWinrate'),now.filter(isWin).length/now.length,prev.length?prev.filter(isWin).length/prev.length:NaN,true,0,true);
  build(t('compareMetricKda'),avg(now,kda),avg(prev,kda),true,2,false);
  build(t('compareMetricDeaths'),avg(now,m=>m.deaths),avg(prev,m=>m.deaths),false,1,false);
  host.innerHTML = `<div class="compare-grid"><div class="compare-head"><span>${t('metric')}</span><span>${t('quickNow')}</span><span>${t('quickBefore')}</span><span>${t('quickDelta')}</span></div>${rows.join('')}</div><p class="footnote">${t('compareGuideNote')}</p>`;
}
function renderInsightSummary(){
  const host=$('insightSummary'); if(!host) return;
  const topHero=state.analytics?.heroes?.[0], focus=state.analytics?.mistakes?.[0], sessions=state.analytics?.sessions;
  const focusText=focus?`${t(focus.titleKey)} · ${t('focusPriorityLine')} ${focus.priority}/100`:`${t('noData')}`;
  const sessionText=sessions?.recommendation||t('sessionRecommendation');
  host.innerHTML = `
    <div class="route-step"><div><b>${t('routeStepTraining')}</b><p>${t('routeStepTrainingDesc')}</p><small>${focusText}</small></div><button class="secondary small jump-btn" data-jump="training">${t('openTrainingTab')}</button></div>
    <div class="route-step"><div><b>${t('routeStepMatches')}</b><p>${t('routeStepMatchesDesc')}</p><small>${topHero?`${t('topHeroLine')}: ${safeText(heroName(topHero.hero_id))} · ${roleName(topHero.mainRole)}`:''}</small></div><button class="secondary small jump-btn" data-jump="matches">${t('openMatchesTab')}</button></div>
    <div class="route-step"><div><b>${t('routeStepPatterns')}</b><p>${t('routeStepPatternsDesc')}</p><small>${safeText(sessionText||'')}</small></div><button class="secondary small jump-btn" data-jump="patterns">${t('openPatternsTab')}</button></div>`;
  host.querySelectorAll('.jump-btn').forEach(btn=>btn.onclick=()=>switchSection(btn.dataset.jump));
}


function coachVerdict(m){
  const score=Number(m?._score||50), win=m?isWin(m):false;
  if(win&&score<40)return {key:'verdictDespiteWin',cls:'warn'};
  if(!win&&score>=70)return {key:'verdictDespiteLoss',cls:'good'};
  if(score>=75)return {key:'verdictExcellent',cls:'excellent'};
  if(score>=60)return {key:'verdictStrong',cls:'good'};
  if(score>=42)return {key:'verdictMixed',cls:'mixed'};
  return {key:'verdictWeak',cls:'bad'};
}
function coachMetricInsight(metric){
  const goodMap={kda:'coachGoodKda',deaths:'coachGoodSurvival',gpm:'coachGoodEconomy',xpm:'coachGoodXp',dmgpm:'coachGoodDamage',assistpm:'coachGoodAssists',towerpm:'coachGoodObjectives',lhpm:'coachGoodEconomy'};
  const badMap={kda:'coachRiskKda',deaths:'coachRiskDeaths',gpm:'coachRiskEconomy',xpm:'coachRiskXp',dmgpm:'coachRiskDamage',assistpm:'coachRiskAssists',lhpm:'coachRiskFarm',towerpm:'coachRiskObjectives'};
  return {good:t(goodMap[metric.key]||'strongMetrics'),bad:t(badMap[metric.key]||'mainDrops')};
}
function coachNextRule(metric){
  const map={deaths:'ruleSurvive',gpm:'ruleEconomy',xpm:'ruleXp',dmgpm:'ruleFight',assistpm:'ruleAssist',lhpm:'ruleFarm',towerpm:'ruleObjectives',kda:'ruleKda'};
  return t(map[metric?.key]||'ruleSurvive');
}
function coachModelForMatch(m){
  if(!m)return null;
  const metrics=metricPercentilesFor(m).sort((a,b)=>b.pct-a.pct),strengths=metrics.filter(x=>x.pct>=60).slice(0,3),risks=metrics.slice().sort((a,b)=>a.pct-b.pct).filter(x=>x.pct<45).slice(0,3),worst=risks[0]||metrics.slice().sort((a,b)=>a.pct-b.pct)[0],v=coachVerdict(m);
  const checks=roleChecklistFor(m,metrics);
  return {m,metrics,strengths,risks,worst,verdict:v,nextRule:coachNextRule(worst),checks};
}
function roleChecklistFor(m,metrics){
  const role=getRole(m)||4,keys=role<=3?['gpm','lhpm','xpm','dmgpm','deaths']:['assistpm','deaths','xpm','kda','dmgpm'];
  const labels={gpm:'coachEconomyGpm',lhpm:'coachCoreFarm',xpm:'coachTempoXp',dmgpm:'coachFightDamage',deaths:'coachSurvival',assistpm:'coachSupportAssist',kda:'KDA'};
  return keys.map(k=>{const x=metrics.find(v=>v.key===k);return x?{key:k,label:labels[k]==='KDA'?'KDA':t(labels[k]),pct:x.pct,good:x.pct>=50}:null;}).filter(Boolean).slice(0,5);
}
function coachList(items,type){return items.length?`<div class="coach-bullets">${items.map(x=>{const txt=coachMetricInsight(x)[type];return`<div class="coach-bullet ${type==='good'?'good':'bad'}"><span>${type==='good'?'✓':'!'}</span><div><b>${txt}</b><small>${x.label}: ${x.pct} ${t('currentMetricPercentile')}</small></div></div>`;}).join('')}</div>`:`<div class="muted">${t('noData')}</div>`;}
function coachMatchCard(m,compact=false){
  const model=coachModelForMatch(m),v=model.verdict;
  const issue=model.worst, reason=issue?coachMetricInsight(issue).bad:t('noData');
  return `<div class="coach-match-card ${v.cls}"><div class="coach-match-hero"><img src="${heroImg(m.hero_id)}"><div><strong>${safeText(heroName(m.hero_id))}</strong><span>${roleName(getRole(m))} · ${dateFmt(m.start_time)}</span></div></div><div class="coach-score-orb ${v.cls}">${m._score||50}</div><div class="coach-match-mid"><b>${t(v.key)}</b><span>${isWin(m)?t('victory'):t('defeat')} · ${m.kills}/${m.deaths}/${m.assists}</span>${compact?'':`<small>${safeText(reason)}</small>`}</div><button class="secondary small coach-open-match" data-match="${m.match_id}">${t('openFullMatch')}</button></div>`;
}
function renderCoachPage(){
  const latest=state.matches[0],latestHost=$('coachLatestMatch'),planHost=$('coachActionPlan'),queue=$('coachReviewQueue'),recent=$('coachRecentMatches');
  if(!latestHost||!planHost||!queue||!recent)return;
  if(!latest){latestHost.innerHTML=`<div class="notice">${t('coachNoMatches')}</div>`;planHost.innerHTML='';queue.innerHTML='';recent.innerHTML='';return;}
  const model=coachModelForMatch(latest),v=model.verdict;
  latestHost.innerHTML=`<div class="coach-verdict ${v.cls}"><div class="coach-verdict-top"><div class="coach-latest-hero"><img src="${heroImg(latest.hero_id)}"><div><span>${t('latestMatch')}</span><strong>${safeText(heroName(latest.hero_id))} · ${roleName(getRole(latest))}</strong><small>${dateFmt(latest.start_time)} · ${isWin(latest)?t('victory'):t('defeat')}</small></div></div><div class="coach-score-big"><b>${latest._score||50}</b><span>${t('personalScore')}</span></div></div><h3>${t(v.key)}</h3><p>${t('resultNotScore')}</p></div><div class="coach-two-col"><div><h4>${t('strengths')}</h4>${coachList(model.strengths,'good')}</div><div><h4>${t('risks')}</h4>${coachList(model.risks,'bad')}</div></div><div class="coach-role-check"><h4>${t('roleChecklist')}</h4>${model.checks.map(x=>`<div class="role-check-row"><span>${x.label}</span><div class="role-check-bar"><i style="width:${clamp(x.pct)}%"></i></div><b class="${x.good?'good-text':'bad-text'}">${x.pct}</b><small>${x.good?t('roleCheckGood'):t('roleCheckWarn')}</small></div>`).join('')}</div><div class="coach-actions"><button class="primary coach-open-match" data-match="${latest.match_id}">${t('openFullMatch')}</button><small>${t('coachOwnBaseline')}</small></div>`;
  planHost.innerHTML=`<div class="next-rule-card"><span>${t('nextRule')}</span><strong>${model.nextRule}</strong><small>${model.worst?`${model.worst.label}: ${model.worst.pct} ${t('currentMetricPercentile')}`:t('coachOwnBaseline')}</small><button class="secondary jump-training">${t('openTrainingTab')}</button></div>`;
  const last10=state.matches.slice(0,10),ranked=last10.map(m=>{const cm=coachModelForMatch(m);let p=100-(m._score||50);let reason=t('reviewLowScore');if(m.deaths>quantile(last10.map(x=>Number(x.deaths)||0),.7)){p+=12;reason=t('reviewHighDeaths');}if(!isWin(m)&&(m._score||50)>=70){p+=18;reason=t('reviewLossStrong');}if(isWin(m)&&(m._score||50)<40){p+=15;reason=t('reviewWinWeak');}return{m,p,reason};}).sort((a,b)=>b.p-a.p).slice(0,4);
  queue.innerHTML=ranked.map((x,i)=>`<div class="review-queue-row"><span class="review-rank">#${i+1}</span><div class="hero-cell"><img src="${heroImg(x.m.hero_id)}"><div><strong>${safeText(heroName(x.m.hero_id))}</strong><span>${roleName(getRole(x.m))} · ${dateFmt(x.m.start_time)}</span></div></div><div><b>${t('reviewReason')}</b><span>${x.reason}</span></div><div><b>${t('scoreLabel')}</b><span>${x.m._score||50}/100</span></div><button class="secondary small coach-open-match" data-match="${x.m.match_id}">${t('openFullMatch')}</button></div>`).join('');
  recent.innerHTML=state.matches.slice(0,5).map(m=>coachMatchCard(m,true)).join('');
  document.querySelectorAll('.coach-open-match').forEach(b=>b.onclick=()=>openFullMatch(b.dataset.match));
  const jt=planHost.querySelector('.jump-training');if(jt)jt.onclick=()=>switchSection('training');
}
function teamRank(players,player,fn,higher=true){const vals=players.map(p=>({p,v:Number(fn(p))||0})).sort((a,b)=>higher?b.v-a.v:a.v-b.v);const idx=vals.findIndex(x=>Number(x.p.player_slot)===Number(player.player_slot));return idx>=0?idx+1:null;}
function fullMatchTeamContext(m,r,players){
  const mine=players.find(p=>Number(p.player_slot)===Number(m.player_slot)); if(!mine)return null;
  const side=Number(m.player_slot)<128?'radiant':'dire',team=players.filter(p=>(Number(p.player_slot)<128?'radiant':'dire')===side),teamKills=team.reduce((s,p)=>s+(Number(p.kills)||0),0),teamDamage=team.reduce((s,p)=>s+(Number(p.hero_damage)||0),0),kp=teamKills?((Number(mine.kills)||0)+(Number(mine.assists)||0))/teamKills:null,damageShare=teamDamage?(Number(mine.hero_damage)||0)/teamDamage:null;
  return {kp,damageShare,gpmRank:teamRank(team,mine,p=>p.gold_per_min,true),xpmRank:teamRank(team,mine,p=>p.xp_per_min,true),damageRank:teamRank(team,mine,p=>p.hero_damage,true),deathsRank:teamRank(team,mine,p=>p.deaths,false)};
}
function teamContextHtml(ctx){if(!ctx)return'';const valPct=x=>Number.isFinite(x)?fmtPct(x,0):'—';return `<article class="team-context-card"><div class="panel-title"><div><span class="eyebrow">${t('teamContext')}</span><h3>${t('evidence')}</h3></div></div><div class="team-context-grid"><div><span>${t('killParticipation')}</span><strong>${valPct(ctx.kp)}</strong></div><div><span>${t('damageShare')}</span><strong>${valPct(ctx.damageShare)}</strong></div><div><span>${t('gpmTeamRank')}</span><strong>${ctx.gpmRank||'—'}/5</strong></div><div><span>${t('xpmTeamRank')}</span><strong>${ctx.xpmRank||'—'}/5</strong></div><div><span>${t('damageTeamRank')}</span><strong>${ctx.damageRank||'—'}/5</strong></div><div><span>${t('deathsTeamRank')}</span><strong>${ctx.deathsRank||'—'}/5</strong></div></div></article>`;}


function laneLabel(v){const n=Number(v);return n===1?t('laneSafe'):n===2?t('laneMid'):n===3?t('laneOff'):n===4?t('laneJungle'):t('laneUnknown');}
function deepTimelineValue(arr,min){if(!Array.isArray(arr)||!arr.length)return null;const i=Math.min(arr.length-1,Math.max(0,Math.round(min)));const v=Number(arr[i]);return Number.isFinite(v)?v:null;}
function formatEventTime(sec){const s=Number(sec)||0;const sign=s<0?'-':'';const a=Math.abs(Math.round(s));return `${sign}${Math.floor(a/60)}:${String(a%60).padStart(2,'0')}`;}
function itemIdByKey(key){const target=String(key||'').replace(/^item_/,'');for(const [id,x] of Object.entries(state.itemMap||{})){const n=String(x?.name||'').replace(/^item_/,'');if(n===target)return Number(id);}return null;}
function deepItemHtml(x){const id=itemIdByKey(x.key),src=id?itemImg(id):'',name=id?itemName(id):String(x.key||'item').replace(/^item_/,'').replaceAll('_',' ');return `<div class="deep-item-timing">${src?`<img src="${src}" loading="lazy">`:'<span class="deep-item-fallback">•</span>'}<div><strong>${safeText(name)}</strong><small>${formatEventTime(x.time)}</small></div></div>`;}
function objectiveLabel(type){return String(type||'event').replace(/^CHAT_MESSAGE_/,'').replaceAll('_',' ').toLowerCase();}
function renderDeepSetup(){const sel=$('deepMatchSelect'),btn=$('deepLoadBtn');if(!sel||!btn)return;const current=String(sel.value||state.deep.matchId||state.matches[0]?.match_id||'');sel.innerHTML=state.matches.slice(0,40).map(m=>`<option value="${m.match_id}">${dateFmt(m.start_time)} · ${safeText(heroName(m.hero_id))} · ${roleName(getRole(m))} · ${isWin(m)?t('victory'):t('defeat')}</option>`).join('');if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;else if(sel.options.length)sel.selectedIndex=0;if(!btn.dataset.bound){btn.onclick=loadDeepMatch;btn.dataset.bound='1';}if(!sel.dataset.bound){sel.onchange=()=>{state.deep.matchId=sel.value;state.deep.data=null;$('deepResults').innerHTML=`<div class="notice">${t('deepChoose')}</div>`;$('deepSourceStatus').textContent='—';};sel.dataset.bound='1';}}
async function loadDeepMatch(){
  const sel=$('deepMatchSelect'),host=$('deepResults'),status=$('deepSourceStatus');if(!sel||!host)return;const matchId=String(sel.value||'');if(!matchId)return;state.deep.matchId=matchId;state.deep.loading=true;host.innerHTML=`<div class="deep-loading">${t('deepLoading')}</div>`;status.textContent=t('deepLoading');$('deepLoadBtn').disabled=true;
  const steamP=fetchJson(`/api/steam/match?match_id=${encodeURIComponent(matchId)}`);
  const deepP=fetchJson(`/api/deep-match?account_id=${encodeURIComponent(state.accountId)}&match_id=${encodeURIComponent(matchId)}`);
  const [steamRes,deepRes]=await Promise.allSettled([steamP,deepP]);
  const steam=steamRes.status==='fulfilled'?steamRes.value:null,deep=deepRes.status==='fulfilled'?deepRes.value:{available:false,details:deepRes.reason?.message||''};state.deep.data={steam,deep};state.deep.loading=false;renderDeepMatch(matchId,steam,deep);$('deepLoadBtn').disabled=false;
}

function deepUnifiedTimelineHtml(deep,p,m){
  if(!(deep?.available&&deep?.parsed))return '';
  const total=Math.max(1,Number(m.duration)||1),events=[];
  (p.purchase_log||[]).filter(x=>Number(x.time)>=0).slice(0,18).forEach(x=>events.push({time:Number(x.time),type:'item',label:(()=>{const id=itemIdByKey(x.key);return id?itemName(id):String(x.key||'').replace(/^item_/,'').replaceAll('_',' ')})()}));
  (p.obs_log||[]).slice(0,8).forEach(x=>events.push({time:Number(x.time),type:'vision',label:'Observer'}));
  (p.sen_log||[]).slice(0,8).forEach(x=>events.push({time:Number(x.time),type:'vision',label:'Sentry'}));
  (deep.teamfights||[]).slice(0,8).forEach((x,i)=>events.push({time:Number(x.start),type:'fight',label:`${t('timelineFight')} #${i+1}`}));
  (deep.objectives||[]).slice(0,10).forEach(x=>events.push({time:Number(x.time),type:'objective',label:objectiveLabel(x.type)}));
  const filtered=events.filter(x=>Number.isFinite(x.time)&&x.time>=0&&x.time<=total).sort((a,b)=>a.time-b.time).slice(0,34);
  if(!filtered.length)return '';
  const ticks=[0,.25,.5,.75,1].map(f=>`<span style="left:${f*100}%">${Math.round(total*f/60)}m</span>`).join('');
  return `<article class="panel deep-panel timeline-panel"><div class="panel-title"><div><span class="eyebrow">${t('timeline')}</span><h3>${t('timeline')}</h3></div></div><div class="match-timeline"><div class="timeline-axis">${ticks}</div><div class="timeline-track">${filtered.map((e,i)=>{const left=clamp(e.time/total*100,1,99);return `<button class="timeline-event ${e.type}" style="left:${left}%" title="${formatEventTime(e.time)} · ${safeText(e.label)}"><i></i><span>${safeText(e.label)}</span></button>`}).join('')}</div><div class="timeline-legend"><span class="item">● ${t('timelineItems')}</span><span class="fight">● ${t('timelineFight')}</span><span class="vision">● ${t('timelineVision')}</span><span class="objective">● ${t('timelineObjective')}</span></div></div></article>`;
}

function renderDeepMatch(matchId,steam,deep){
  const host=$('deepResults'),status=$('deepSourceStatus'),m=state.matches.find(x=>String(x.match_id)===String(matchId));if(!host||!m)return;
  const r=steam?.match||{},players=Array.isArray(r.players)?r.players:[],ctx=fullMatchTeamContext(m,r,players),model=coachModelForMatch(m),p=deep?.player||{},parsed=!!(deep?.available&&deep?.parsed);
  status.textContent=parsed?t('deepParsed'):t('deepSteamOnly');status.className=`deep-source-pill ${parsed?'parsed':'steam'}`;
  const teamHtml=ctx?`<div class="deep-kpi-grid"><div><span>${t('killParticipation')}</span><strong>${Number.isFinite(ctx.kp)?fmtPct(ctx.kp,0):'—'}</strong></div><div><span>${t('damageShare')}</span><strong>${Number.isFinite(ctx.damageShare)?fmtPct(ctx.damageShare,0):'—'}</strong></div><div><span>${t('gpmTeamRank')}</span><strong>${ctx.gpmRank||'—'}/5</strong></div><div><span>${t('xpmTeamRank')}</span><strong>${ctx.xpmRank||'—'}/5</strong></div><div><span>${t('damageTeamRank')}</span><strong>${ctx.damageRank||'—'}/5</strong></div><div><span>${t('deathsTeamRank')}</span><strong>${ctx.deathsRank||'—'}/5</strong></div></div>`:`<div class="notice">${t('noData')}</div>`;
  const laneHtml=deep?.available?`<div class="deep-kpi-grid"><div><span>${t('deepLane')}</span><strong>${laneLabel(p.lane_role)}</strong></div><div><span>${t('deepLaneEfficiency')}</span><strong>${hasNum(p.lane_efficiency_pct)?Number(p.lane_efficiency_pct).toFixed(0)+'%':'—'}</strong></div><div><span>${t('deepRoaming')}</span><strong>${p.is_roaming?t('deepYes'):t('deepNo')}</strong></div><div><span>${t('performance')}</span><strong>${m._score||50}/100</strong></div></div>`:`<div class="deep-kpi-grid"><div><span>${t('role')}</span><strong>${roleName(getRole(m))}</strong></div><div><span>${t('performance')}</span><strong>${m._score||50}/100</strong></div><div><span>KDA</span><strong>${kda(m).toFixed(2)}</strong></div><div><span>${t('deathsLabel')}</span><strong>${m.deaths}</strong></div></div>`;
  let phases='',items='',vision='',fights='',objectives='';
  if(parsed){
    const mins=[10,20,30].filter(min=>min*60<Number(m.duration||r.duration||3600)+600);phases=`<article class="panel deep-panel"><div class="panel-title"><div><span class="eyebrow">${t('deepPhaseTitle')}</span><h3>${t('deepPhaseDesc')}</h3></div></div><div class="phase-cards">${mins.map(min=>`<div class="phase-card"><span>${min} ${t('deepMinute')}</span><b>${t('deepGold')}: ${fmtNum(deepTimelineValue(p.gold_t,min))}</b><b>${t('deepXp')}: ${fmtNum(deepTimelineValue(p.xp_t,min))}</b><b>${t('deepLh')}: ${fmtNum(deepTimelineValue(p.lh_t,min))}</b></div>`).join('')}</div></article>`;
    const purchases=(p.purchase_log||[]).filter(x=>Number(x.time)>=0).slice(0,30);items=`<article class="panel deep-panel"><div class="panel-title"><div><span class="eyebrow">${t('deepItems')}</span><h3>${t('deepItems')}</h3></div></div>${purchases.length?`<div class="deep-items-grid">${purchases.map(deepItemHtml).join('')}</div>`:`<div class="notice">${t('deepNoItems')}</div>`}</article>`;
    const obs=p.obs_log||[],sen=p.sen_log||[];vision=`<article class="panel deep-panel"><div class="panel-title"><div><span class="eyebrow">${t('deepVision')}</span><h3>${t('deepVision')}</h3></div></div><div class="deep-kpi-grid"><div><span>${t('deepObservers')}</span><strong>${obs.length}</strong></div><div><span>${t('deepSentries')}</span><strong>${sen.length}</strong></div><div class="wide"><span>${t('deepVisionTimes')}</span><strong>${[...obs,...sen].sort((a,b)=>a.time-b.time).slice(0,16).map(x=>formatEventTime(x.time)).join(' · ')||'—'}</strong></div></div></article>`;
    const tf=deep.teamfights||[];fights=`<article class="panel deep-panel"><div class="panel-title"><div><span class="eyebrow">${t('deepFights')}</span><h3>${t('deepFights')}</h3></div></div>${tf.length?`<div class="fight-list">${tf.slice(0,12).map((x,i)=>`<div class="fight-row ${Number(x.deaths)>0?'death':''}"><span>#${i+1}</span><b>${formatEventTime(x.start)}–${formatEventTime(x.end)}</b><small>${t('deepFightKills')}: ${x.kills??0} · ${t('deepFightDeaths')}: ${x.deaths??0} · ${t('deepFightDamage')}: ${fmtNum(x.damage)} · ${t('deepFightGold')}: ${fmtNum(x.gold_delta)} · ${t('deepFightXp')}: ${fmtNum(x.xp_delta)}</small></div>`).join('')}</div>`:`<div class="notice">${t('deepNoFights')}</div>`}<div class="deep-caution"><b>${t('deepExactDeathsPending')}</b><span>${t('deepExactDeathsPendingDesc')}</span></div></article>`;
    const objs=deep.objectives||[];objectives=`<details class="panel deep-details"><summary>${t('deepObjectives')} · ${objs.length}</summary><p class="muted">${t('deepObjectivesDesc')}</p>${objs.length?`<div class="objective-list">${objs.slice(0,40).map(x=>`<div><b>${formatEventTime(x.time)}</b><span>${safeText(objectiveLabel(x.type))}${x.key!=null?` · ${safeText(x.key)}`:''}</span></div>`).join('')}</div>`:`<div class="notice">${t('deepNoObjectives')}</div>`}</details>`;
  }
  const timeline=deepUnifiedTimelineHtml(deep,p,m);
  const dataQuality=parsed?t('deepParsedGood'):(deep?.available?t('deepParsedPartial'):t('deepNetworkBlocked'));
  const fallback=!parsed?`<div class="notice deep-unavailable"><strong>${t('deepUnavailable')}</strong><br>${t('deepUnavailableDesc')}<br><small>${safeText(deep?.details||'')}</small></div>`:'';
  host.innerHTML=`<div class="deep-hero-head"><div class="hero-cell"><img src="${heroImg(m.hero_id)}"><div><strong>${safeText(heroName(m.hero_id))} · ${roleName(getRole(m))}</strong><span>#${m.match_id} · ${dateFmt(m.start_time)} · ${isWin(m)?t('victory'):t('defeat')}</span></div></div><div class="deep-head-actions"><span class="deep-quality ${parsed?'good':'partial'}">${t('deepDataQuality')}: ${safeText(dataQuality)}</span><button class="secondary small deep-open-full">${t('deepOpenMatch')}</button></div></div>${fallback}<div class="grid-2"><article class="panel deep-panel"><div class="panel-title"><div><span class="eyebrow">${t('deepTeamImpact')}</span><h3>${t('deepCoreSummary')}</h3></div></div>${teamHtml}</article><article class="panel deep-panel"><div class="panel-title"><div><span class="eyebrow">${t('deepRoleContext')}</span><h3>${t('deepRoleContext')}</h3></div></div>${laneHtml}<div class="deep-rule"><span>${t('deepCoachRule')}</span><strong>${safeText(model?.nextRule||'—')}</strong></div></article></div>${timeline}${phases}<div class="grid-2">${items}${vision}</div>${fights}${objectives}<div class="data-note">${t('deepCachedNote')}</div>`;
  const b=host.querySelector('.deep-open-full');if(b)b.onclick=()=>openFullMatch(matchId);
}


function renderMatches(){
  const rf=els.resultFilter.value,ro=els.roleFilter.value;els.matchesBody.innerHTML='';$('matchesSortNote').textContent=t('latestFirst');
  const showDelta=state.matches.some(m=>hasNum(m.rank_change));document.querySelectorAll('.mmr-delta-col').forEach(el=>el.classList.toggle('hidden-col',!showDelta));
  const list=state.matches.slice().sort((a,b)=>Number(b.start_time)-Number(a.start_time)).filter(m=>(rf==='all'||(rf==='win')===isWin(m))&&(ro==='all'||getRole(m)===Number(ro)));
  for(const m of list){
    const w=isWin(m),img=heroImg(m.hero_id),score=m._score||50,grade=performanceGrade(score),signal=reviewSignal(m),delta=hasNum(m.rank_change)?Number(m.rank_change):null,tr=document.createElement('tr');
    tr.className=`match-row ${w?'match-win':'match-loss'} ${signal?.cls||''}`;
    tr.innerHTML=`<td><div class="match-id">#${m.match_id}</div><span class="${isRanked(m)?'ranked-badge':'unranked-badge'}">${isRanked(m)?t('ranked'):t('unranked')}</span></td>
    <td><div class="hero-cell match-hero-cell">${img?`<img src="${img}">`:''}<span>${safeText(heroName(m.hero_id))}</span></div></td>
    <td><span class="role-badge" title="${t('roleSource')}: ${roleSourceLabel(m)} · ${confidenceLabel(m)}">${roleName(getRole(m))}${state.roleOverrides[String(m.match_id)]?'*':''}</span><span class="role-source">${roleSourceLabel(m)}</span></td>
    <td><span class="result ${w?'win':'loss'}">${w?t('victory'):t('defeat')}</span></td>
    <td class="mmr-delta-col ${showDelta?'':'hidden-col'}">${delta==null?'—':`<b class="${delta>=0?'delta up':'delta down'}">${delta>=0?'+':''}${delta}</b>`}</td>
    <td><div class="performance-cell"><span class="match-grade ${gradeClass(score)}">${grade}</span><b>${score}</b>${signal?`<span class="review-flag ${signal.cls}" title="${safeText(t(signal.key))}">${signal.icon}</span>`:''}</div></td>
    <td><b class="kda-cell">${m.kills}/${m.deaths}/${m.assists}</b></td><td>${m.gold_per_min||'—'}</td><td>${m.xp_per_min||'—'}</td><td>${dateFmt(m.start_time)}</td><td><button class="secondary small open-match" data-match="${m.match_id}">${t('openMatch')}</button></td>`;
    els.matchesBody.appendChild(tr);tr.addEventListener('dblclick',()=>openFullMatch(m.match_id));
  }
  els.matchesBody.querySelectorAll('.open-match').forEach(b=>b.onclick=e=>{e.stopPropagation();openFullMatch(b.dataset.match);});
}

function patternConditionText(p,good=true){ const sym=p.higher?(good?'≥':'<'):(good?'≤':'>');const v=Number(p.threshold).toFixed(p.digits??0);return `${t(p.labelKey)} ${sym} ${v}`; }
function renderPatterns(){
  const p=state.analytics.patterns,box=$('patternSummary');
  if(!p.overall.length){box.innerHTML=`<div class="notice">${t('noReliablePatterns')}</div>`;}else{
    const [top,...rest]=p.overall.slice(0,6);
    const topHtml=`<article class="pattern-hero-card"><div class="pattern-hero-top"><span class="evidence-chip">${t('winCondition')}</span><span>${roleName(top.role)} · ${t('confidence')} ${Math.round(top.confidence)}%</span></div><h3>${t(top.labelKey)}</h3><div class="pattern-threshold"><span>${t('whenYouHit')}</span><strong>${patternConditionText(top,true)}</strong></div><div class="pattern-versus"><div class="good"><b>${fmtPct(top.wrGood,0)}</b><span>${t('winrateLabel')}</span></div><i>vs</i><div class="bad"><b>${fmtPct(top.wrBad,0)}</b><span>${t('belowThreshold')}</span></div></div><div class="pattern-proof"><span>${t('difference')}: <b>+${Math.round(top.gap*100)} ${t('percentagePoints')}</b></span><span>${t('validatedOn')}: <b>+${Math.round(top.validationGap*100)} ${t('percentagePoints')}</b></span><span>${t('patternStability')}: <b>${Math.round(top.stability*100)}%</b></span></div></article>`;
    const restHtml=rest.map((x,i)=>`<article class="pattern-mini-card"><div><span class="pattern-rank">#${i+2}</span><span class="eyebrow">${roleName(x.role)}</span></div><h4>${t(x.labelKey)}</h4><b>${patternConditionText(x,true)}</b><div class="mini-wr"><span>${fmtPct(x.wrGood,0)}</span><i>vs</i><span>${fmtPct(x.wrBad,0)}</span></div><small>${t('confidence')} ${Math.round(x.confidence)}% · ${t('patternStability')} ${Math.round(x.stability*100)}%</small></article>`).join('');
    box.innerHTML=`${topHtml}<div class="pattern-mini-grid">${restHtml}</div>`;
  }
  const hr=p.heroRole;$('heroRolePatterns').innerHTML=hr.length?hr.slice(0,8).map(x=>`<div class="pattern-line"><div class="hero-cell"><img src="${heroImg(x.hero_id)}"><div><strong>${safeText(heroName(x.hero_id))} · ${roleName(x.role)}</strong><span>${t(x.labelKey)}</span></div></div><div><b>${patternConditionText(x,true)}</b><span>${fmtPct(x.wrGood,0)} ${t('comparedWith')} ${fmtPct(x.wrBad,0)}</span></div><div><b>+${Math.round(x.validationGap*100)} ${t('percentagePoints')}</b><span>${t('patternValidated')} · ${t('confidence')} ${Math.round(x.confidence)}%</span></div></div>`).join(''):`<div class="notice">${t('noReliablePatterns')}</div>`;
  const note=$('patternCalibrationNote');if(note)note.innerHTML=t('patternCalibratedNotice');
}
function renderSessions(){
  const s=state.analytics.sessions;const rec=t(s.recommendation);
  $('sessionKpis').innerHTML=[[t('sessions'),s.sessionCount],[t('avgGamesPerSession'),s.avgGames.toFixed(1)],[t('longestSession'),s.longest],[t('sessionOverallWr'),fmtPct(s.overallWr,0)]].map(([l,v])=>`<div class="progress-card"><span>${l}</span><strong>${v}</strong></div>`).join('');
  $('sessionPositionTable').innerHTML=`<div class="mini-table session-visual"><div class="mini-head"><span>${t('gameNumber')}</span><span>${t('matchesLabel')}</span><span>${t('winrateLabel')}</span><span>${t('avgScore')}</span><span>${t('avgDeathsShort')}</span></div>${s.positions.map(x=>`<div class="mini-row"><span>${x.label}</span><span>${x.n}</span><span><b>${fmtPct(x.wr,0)}</b><small>±${Math.round(x.wrCi*100)} ${t('percentagePoints')}</small></span><span><b>${x.score.toFixed(0)}</b></span><span>${x.deaths.toFixed(1)}</span></div>`).join('')}</div>`;
  const lossLabel=n=>n===1?t('oneLoss'):n===2?t('twoLosses'):t('threeLosses');
  $('lossStreakTable').innerHTML=`<div class="mini-table"><div class="mini-head"><span>${t('nextGameAfter')}</span><span>${t('matchesLabel')}</span><span>${t('winrateLabel')}</span><span>${t('avgScore')}</span><span>${t('avgDeathsShort')}</span></div>${s.streaks.map(x=>`<div class="mini-row"><span>${lossLabel(x.losses)}</span><span>${x.n}</span><span>${x.n?`${fmtPct(x.wr,0)} <small>±${Math.round(x.wrCi*100)} ${t('percentagePoints')}</small>`:'—'}</span><span>${x.n?x.score.toFixed(0):'—'}</span><span>${x.n?x.deaths.toFixed(1):'—'}</span></div>`).join('')}</div>`;
  const narrative=s.recommendation==='sessionOutcomeOnly'?t('noPersonalDrop'):rec;
  $('sessionRecommendationBox').innerHTML=`<div class="session-coach-hero ${s.strength}"><span class="eyebrow">${t('sessionCoachSummary')}</span><h3>${safeText(narrative)}</h3><div class="session-evidence"><span>WR Δ 1→4+: <b>${Math.round((s.wrDrop||0)*100)} ${t('percentagePoints')}</b></span><span>Score Δ: <b>${Number(s.scoreDrop||0).toFixed(1)}</b></span></div></div><div class="muted">${t('sessionEvidence')}<br>${state.lang==='ru'?'Новая сессия начинается после перерыва более 90 минут между окончанием одной игры и началом следующей.':'A new session starts after a gap of more than 90 minutes between the previous match ending and the next match starting.'}</div>`;
}
function renderHeroRoleGapTable(){
  const host=$('heroRoleGapTable');if(!host)return;const rows=(state.analytics?.heroRoles||[]).filter(x=>x.n>=4).slice(0,24);
  if(!rows.length){host.innerHTML=`<div class="notice">${t('noHeroRoleData')}</div>`;return;}
  const metricCell=x=>x?`${gapMetricLabel(x.metric)} <b>${Math.round(x.pct)}</b>`:'—';
  host.innerHTML=`<div class="hero-role-gap-table"><div class="hero-role-gap-head"><span>${t('hero')}</span><span>${t('role')}</span><span>${t('heroRoleGames')}</span><span>${t('winrateLabel')}</span><span>${t('scoreLabel')}</span><span>${t('roleFit')}</span><span>${t('topStrength')}</span><span>${t('topGap')}</span></div>${rows.map(x=>`<button class="hero-role-gap-row" data-hero-role="${x.hero_id}:${x.role}"><span class="hero-gap-name">${heroImg(x.hero_id)?`<img src="${heroImg(x.hero_id)}">`:''}<b>${safeText(heroName(x.hero_id))}</b></span><span>${roleName(x.role)}</span><span>${x.n}</span><span>${fmtPct(x.wr,0)}</span><span>${Math.round(x.avgScore)}</span><span><b class="${x.fitScore>=56?'good-text':x.fitScore<44?'bad-text':''}">${Math.round(x.fitScore)}</b><small>${heroRoleFitLabel(x.fitScore)}</small></span><span>${metricCell(x.strengths[0])}</span><span>${metricCell(x.gaps[0])}</span></button>`).join('')}</div>`;
  host.querySelectorAll('[data-hero-role]').forEach(btn=>btn.onclick=()=>{const [h,r]=btn.dataset.heroRole.split(':').map(Number);openHeroRole(h,r);});
}
function renderHeroes(){
  renderHeroRoleGapTable();els.heroesGrid.innerHTML='';
  for(const h of state.analytics.heroes){const el=document.createElement('article');const pair=(state.analytics.heroRoles||[]).find(x=>x.hero_id===h.hero_id&&x.role===h.mainRole),best=pair?.strengths?.[0],weak=pair?.gaps?.[0],grade=performanceGrade(h.avgScore);el.className='hero-card hero-passport-card';el.innerHTML=`${heroImg(h.hero_id)?`<div class="hero-passport-art"><img src="${heroImg(h.hero_id)}"><span class="match-grade ${gradeClass(h.avgScore)}">${grade}</span></div>`:''}<div class="hero-card-body"><div class="hero-card-head"><div><span class="eyebrow">${t('heroPassport')}</span><h4>${safeText(heroName(h.hero_id))}</h4></div><span class="class-badge ${h.cls}">${heroClassLabel(h.classification)}</span></div><div class="hero-role-line">${roleName(h.mainRole)} · ${h.games} ${t('matchesWord')} · ${t('confidenceLabel')} ${h.confidence}%</div><div class="hero-stats compact"><div><span>${t('winrateLabel')}</span><strong>${fmtPct(h.wr,0)}</strong></div><div><span>${t('scoreLabel')}</span><strong>${Math.round(h.avgScore)}</strong></div><div><span>${t('roleFit')}</span><strong>${pair?Math.round(pair.fitScore):'—'}</strong></div><div><span>KDA</span><strong>${h.kda.toFixed(2)}</strong></div></div><div class="hero-gap-summary"><div class="good"><span>${t('bestMetric')}</span><b>${best?gapMetricLabel(best.metric):'—'}${best?` · ${Math.round(best.pct)}`:''}</b></div><div class="bad"><span>${t('weakestMetric')}</span><b>${weak?gapMetricLabel(weak.metric):'—'}${weak?` · ${Math.round(weak.pct)}`:''}</b></div></div></div>`;el.onclick=()=>openHero(h.hero_id);els.heroesGrid.appendChild(el);}
}
function renderMistakes(){
  const list=state.analytics.mistakes,host=$('mistakesSummary');if(!list.length){host.innerHTML=`<div class="notice">${t('noData')}</div>`;return;}
  const active=getTraining();
  host.innerHTML=list.slice(0,8).map((m,i)=>{
    const isActive=active&&active.mistakeKey===m.key,status=isActive?t('activeTrainingStatus'):(m.confidence>=75?t('evidenceStatus'):t('watchStatus'));
    return `<div class="mistake-row ${i===0?'primary-mistake':''} ${m.priority>=65?'high':''}"><div class="mistake-rank">#${i+1}</div><div class="mistake-title"><div class="mistake-status ${isActive?'active':''}">${status}</div><strong>${t(m.titleKey)}</strong><span>${t(m.descKey)}</span>${i===0?`<button class="link-btn mistake-training-jump">${t('openTrainingTab')} →</button>`:''}</div><div class="mistake-metric"><b>${fmtPct(m.frequency,0)}</b><span>${t('frequency')} · ${m.count}/${m.eligible}</span></div><div class="mistake-metric"><b>${m.gap>0?`−${Math.round(m.gap*100)} ${t('percentagePoints')}`:'—'}</b><span>${t('associationLabel')}</span></div><div class="mistake-metric"><b>${m.priority}/100</b><span>${t('priorityLabel')} · ${t('confidence')} ${Math.round(m.confidence)}%</span><div class="impact-bar"><div class="impact-fill" style="width:${m.priority}%"></div></div></div></div>`;
  }).join('');
  const jump=host.querySelector('.mistake-training-jump');if(jump)jump.onclick=()=>switchSection('training');
}
function metricPercentilesFor(m){ const defs=[['kda','KDA',true],['deaths',t('deathsLabel'),false],['gpm','GPM',true],['xpm','XPM',true],['lhpm',state.lang==='ru'?'Ластхиты/мин':'LH/min',true],['dmgpm',t('patternMetricDamage'),true],['assistpm',t('patternMetricAssists'),true],['towerpm',t('patternMetricTower'),true]],base=baselineMatchesFor(m,state.matches),mm=matchMetrics(m);return defs.map(([key,label,higher])=>({key,label,value:mm[key],pct:Math.round(percentileRank(base.map(x=>matchMetrics(x)[key]),mm[key],higher))})); }
function personalAnalysisHtml(m){
  const metrics=metricPercentilesFor(m),score=m._score||50,role=getRole(m),bad=metrics.filter(x=>x.pct<25),good=metrics.filter(x=>x.pct>=70),delta=hasNum(m.rank_change)?Number(m.rank_change):null,ctx=baselineMatchesFor(m,state.matches,true),ctxLabel=ctx.mode==='roleDuration'?t('fallbackRoleDuration'):ctx.mode==='role'?t('fallbackRoleOnly'):t('fallbackAll');
  return `<div class="role-editor"><span class="muted">${t('roleThisMatch')}:</span><select class="match-role-edit">${[1,2,3,4,5].map(r=>`<option value="${r}" ${r===role?'selected':''}>Pos ${r}</option>`).join('')}</select><button class="secondary small save-role-match">${t('saveRole')}</button><span class="muted">${t('roleSource')}: ${roleSourceLabel(m)} · ${t('autoConfidence')}: ${confidenceLabel(m)}</span></div><div class="analysis-grid"><div class="analysis-metric"><span>${t('performance')}</span><strong>${score}/100</strong></div><div class="analysis-metric"><span>${t('result')}</span><strong class="result ${isWin(m)?'win':'loss'}">${isWin(m)?t('victory'):t('defeat')}</strong></div><div class="analysis-metric"><span>K/D/A</span><strong>${m.kills}/${m.deaths}/${m.assists}</strong></div><div class="analysis-metric"><span>GPM / XPM</span><strong>${m.gold_per_min}/${m.xp_per_min}</strong></div><div class="analysis-metric"><span>${t('duration')}</span><strong>${duration(m.duration)}</strong></div>${delta==null?'':`<div class="analysis-metric"><span>${t('mmrDelta')}</span><strong>${delta>=0?'+':''}${delta}</strong></div>`}</div><div class="data-note">${t('roleSource')}: <b>${roleSourceLabel(m)}</b> · ${state.lang==='ru'?'ранг GPM':'GPM rank'} ${m.team_gpm_rank||'—'}/5 · ${state.lang==='ru'?'ранг ЛХ':'LH rank'} ${m.team_lh_rank||'—'}/5 · ${state.lang==='ru'?'ранг XPM':'XPM rank'} ${m.team_xpm_rank||'—'}/5<br>${t('performanceContext')}: <b>${ctxLabel}</b> · ${durationBucketLabel(ctx.bucket)} · n=${ctx.matches.length}</div>${metrics.map(x=>`<div class="finding ${x.pct<25?'bad':x.pct>=70?'good':''}"><strong>${x.label}</strong>: ${x.key.includes('pm')?x.value.toFixed(1):x.value.toFixed(x.key==='kda'?2:0)} · ${t('percentileText')}: <strong>${x.pct}</strong></div>`).join('')}<div class="finding ${bad.length?'bad':'good'}">${bad.length?`${t('mainDrops')}: <strong>${bad.map(x=>x.label).join(', ')}</strong>.`:t('noDrops')}</div>${good.length?`<div class="finding good">${t('strongMetrics')}: <strong>${good.map(x=>x.label).join(', ')}</strong>.</div>`:''}<p class="muted">${t('contextualScoreNote')}</p>`;
}
function bindRoleEditor(container,m,after){ const sel=container.querySelector('.match-role-edit'),btn=container.querySelector('.save-role-match');if(!sel||!btn)return;btn.onclick=()=>{state.roleOverrides[String(m.match_id)]={role:Number(sel.value),verifiedAt:Date.now()};saveRoleOverrides();recomputeAnalytics();renderAll();if(after)after();}; }
function openMatchAnalysis(matchId){ const m=state.matches.find(x=>String(x.match_id)===String(matchId));if(!m)return;$('analysisTitle').textContent=`#${m.match_id} · ${heroName(m.hero_id)}`;$('matchAnalysis').innerHTML=personalAnalysisHtml(m);bindRoleEditor($('matchAnalysis'),m,()=>openMatchAnalysis(matchId)); }

function gameModeLabel(mode){ const n=Number(mode); if(n===22)return t('rankedAllPick');if(n===1)return t('allPick');if(n===23)return t('turbo');return `${t('unknownMode')} (${n})`; }
function lobbyLabel(lobby){ const n=Number(lobby);if(n===7)return t('rankedLobby');if(n===0)return t('publicLobby');return `${t('lobby')} ${n}`; }
function leaverLabel(v){ return Number(v)>1?t('abandoned'):t('finished'); }
function playerDisplayName(p,profiles){ const id=String(p.account_id??'');if(id==='4294967295'||id==='0'||!id)return t('anonymousPlayer');return profiles?.[id]?.name||`ID ${id}`; }
function itemSlotsHtml(p){ const ids=[p.item_0,p.item_1,p.item_2,p.item_3,p.item_4,p.item_5];const backpack=[p.backpack_0??p.item_6,p.backpack_1??p.item_7,p.backpack_2??p.item_8].filter(x=>Number(x));const extras=[p.item_neutral??p.item_9,p.item_10].filter(x=>Number(x));const all=[...ids,...backpack,...extras];return `<div class="items-row">${all.map((id,i)=>{if(!Number(id))return `<span class="item-empty"></span>`;const src=itemImg(id),name=safeText(itemName(id));return src?`<img class="item-icon ${i>=6?'backpack':''}" src="${src}" title="${name}" loading="lazy" onerror="this.outerHTML='&lt;span class=&quot;item-id&quot; title=&quot;${name}&quot;&gt;#${Number(id)}&lt;/span&gt;'">`:`<span class="item-id ${i>=6?'backpack':''}" title="${name}">#${Number(id)}</span>`;}).join('')}</div>`; }
function matchTeamHtml(players,side,userSlot,profiles){
  const sorted=players.slice().sort((a,b)=>(Number(a.player_slot)&127)-(Number(b.player_slot)&127));
  return `<div class="match-team ${side}"><div class="team-scoreboard-head"><h3>${side==='radiant'?t('radiant'):t('dire')}</h3></div><div class="scoreboard-scroll"><table class="scoreboard"><thead><tr><th>${t('player')}</th><th>${t('level')}</th><th>K / D / A</th><th>${t('lastHitsDenies')}</th><th>GPM / XPM</th><th>${t('heroDamage')}</th><th>${t('towerDamage')}</th><th>${t('healing')}</th><th>${t('items')}</th></tr></thead><tbody>${sorted.map(p=>{const me=Number(p.player_slot)===Number(userSlot);return`<tr class="${me?'me-row':''}"><td><div class="score-player"><img src="${heroImg(p.hero_id)}"><div><strong>${safeText(playerDisplayName(p,profiles))}</strong><span>${safeText(heroName(p.hero_id))}${me?` · ${roleName(getRole(state.matches.find(m=>Number(m.player_slot)===Number(userSlot)&&String(m.match_id)===String(window.__openMatchId))))}`:''}</span><small class="${Number(p.leaver_status)>1?'leaver':''}">${leaverLabel(p.leaver_status)}</small></div></div></td><td>${p.level??'—'}</td><td><b>${p.kills??0}/${p.deaths??0}/${p.assists??0}</b></td><td>${p.last_hits??0} / ${p.denies??0}</td><td>${p.gold_per_min??'—'} / ${p.xp_per_min??'—'}</td><td>${fmtNum(p.hero_damage)}</td><td>${fmtNum(p.tower_damage)}</td><td>${fmtNum(p.hero_healing)}</td><td>${itemSlotsHtml(p)}</td></tr>`;}).join('')}</tbody></table></div></div>`;
}

function matchCoachInlineHtml(m){
  const model=coachModelForMatch(m),v=model.verdict;
  return `<article class="inline-match-coach ${v.cls}"><div class="inline-coach-head"><div><span class="eyebrow">${t('matchCoachEngine')}</span><h3>${t(v.key)}</h3></div><div class="coach-score-orb ${v.cls}">${m._score||50}</div></div><div class="inline-coach-columns"><div><h4>${t('strengths')}</h4>${coachList(model.strengths,'good')}</div><div><h4>${t('risks')}</h4>${coachList(model.risks,'bad')}</div></div><div class="inline-next-rule"><span>${t('nextRule')}</span><b>${model.nextRule}</b></div></article>`;
}

async function openFullMatch(matchId){
  const m=state.matches.find(x=>String(x.match_id)===String(matchId));if(!m)return;window.__openMatchId=String(matchId);els.modalBox.classList.add('match-modal');$('modalContent').innerHTML=`<div class="match-loading">${t('loadingMatch')}</div>`;$('modalBackdrop').classList.remove('hidden');
  try{
    const data=await fetchJson(`/api/steam/match?match_id=${encodeURIComponent(matchId)}`),r=data.match||{},profiles=data.playerProfiles||{},players=Array.isArray(r.players)?r.players:[],rad=players.filter(p=>Number(p.player_slot)<128),dire=players.filter(p=>Number(p.player_slot)>=128),userSide=Number(m.player_slot)<128?'radiant':'dire';
    const rs=hasNum(r.radiant_score)?Number(r.radiant_score):rad.reduce((s,p)=>s+(Number(p.kills)||0),0),ds=hasNum(r.dire_score)?Number(r.dire_score):dire.reduce((s,p)=>s+(Number(p.kills)||0),0),model=coachModelForMatch(m),verdict=model.verdict,grade=performanceGrade(m._score||50),ctx=fullMatchTeamContext(m,r,players);
    const pickStrip=arr=>arr.slice().sort((a,b)=>(Number(a.player_slot)&127)-(Number(b.player_slot)&127)).map(p=>`<div class="pick-hero"><img src="${heroImg(p.hero_id)}"><span>${safeText(heroName(p.hero_id))}</span></div>`).join('');
    const strength=model.strengths?.[0],risk=model.risks?.[0];
    $('modalContent').innerHTML=`<div class="match-header premium-match-head"><div><span class="eyebrow">${t('fullMatch')}</span><h2>${safeText(heroName(m.hero_id))} · ${roleName(getRole(m))}</h2><div class="muted">#${matchId} · ${dateFmtLong(r.start_time||m.start_time)} · ${duration(r.duration||m.duration)}</div></div><div class="match-final-score"><div class="${r.radiant_win?'winner':''}"><span>${t('radiant')}</span><strong>${rs}</strong></div><em>:</em><div class="${!r.radiant_win?'winner':''}"><strong>${ds}</strong><span>${t('dire')}</span></div></div></div>
      <article class="match-coach-hero ${verdict.cls}"><div class="match-coach-grade ${gradeClass(m._score||50)}"><b>${grade}</b><span>${m._score||50}</span></div><div class="match-coach-copy"><span class="eyebrow">${t('coachVerdictLabel')}</span><h3>${t(verdict.key)}</h3><div class="match-coach-evidence"><span class="good">✓ ${strength?safeText(coachMetricInsight(strength).good):t('noData')}</span><span class="bad">! ${risk?safeText(coachMetricInsight(risk).bad):t('noData')}</span></div><div class="inline-next-rule premium-rule"><span>${t('nextGameRuleLabel')}</span><b>${safeText(model.nextRule)}</b></div></div><div class="match-coach-quick"><div><span>KDA</span><b>${m.kills}/${m.deaths}/${m.assists}</b></div><div><span>${t('killParticipation')}</span><b>${ctx&&Number.isFinite(ctx.kp)?fmtPct(ctx.kp,0):'—'}</b></div><div><span>${t('damageShare')}</span><b>${ctx&&Number.isFinite(ctx.damageShare)?fmtPct(ctx.damageShare,0):'—'}</b></div><button class="secondary small go-mistake-analysis">${t('analyzeMistakes')}</button></div></article>
      <div class="picks-board"><div class="pick-side ${userSide==='radiant'?'your-side':''}"><div class="team-label">${t('radiant')} ${userSide==='radiant'?`· ${t('yourTeam')}`:''}</div><div class="pick-strip">${pickStrip(rad)}</div></div><div class="pick-side ${userSide==='dire'?'your-side':''}"><div class="team-label">${t('dire')} ${userSide==='dire'?`· ${t('yourTeam')}`:''}</div><div class="pick-strip">${pickStrip(dire)}</div></div></div>
      <details class="scoreboard-detail"><summary><div><span class="eyebrow">${t('fullScoreboard')}</span><strong>${t('fullScoreboard')}</strong></div><span>▾</span></summary><div class="match-meta-grid"><div><span>${t('mode')}</span><b>${gameModeLabel(r.game_mode??m.game_mode)}</b></div><div><span>${t('lobby')}</span><b>${lobbyLabel(r.lobby_type??m.lobby_type)}</b></div><div><span>${t('firstBlood')}</span><b>${duration(r.first_blood_time||0)}</b></div><div><span>${t('serverCluster')}</span><b>${r.cluster??'—'}</b></div><div><span>${t('towersLeft')} · ${t('radiant')}</span><b>${bitCount(r.tower_status_radiant)}/11</b></div><div><span>${t('towersLeft')} · ${t('dire')}</span><b>${bitCount(r.tower_status_dire)}/11</b></div><div><span>${t('barracksLeft')} · ${t('radiant')}</span><b>${bitCount(r.barracks_status_radiant)}/6</b></div><div><span>${t('barracksLeft')} · ${t('dire')}</span><b>${bitCount(r.barracks_status_dire)}/6</b></div></div>${matchTeamHtml(rad,'radiant',m.player_slot,profiles)}${matchTeamHtml(dire,'dire',m.player_slot,profiles)}</details>
      <details class="scoreboard-detail analysis-detail"><summary><div><span class="eyebrow">${t('advancedMetrics')}</span><strong>${t('matchReview')}</strong></div><span>▾</span></summary><div class="match-personal-review">${teamContextHtml(ctx)}${personalAnalysisHtml(m)}</div></details>`;
    bindRoleEditor($('modalContent'),m,()=>openFullMatch(matchId));
    const go=$('modalContent').querySelector('.go-mistake-analysis');if(go)go.onclick=()=>{$('modalBackdrop').classList.add('hidden');els.modalBox.classList.remove('match-modal');openMatchAnalysis(matchId);switchSection('mistakes');};
  }catch(e){console.error(e);$('modalContent').innerHTML=`<div class="error-box">${t('matchLoadFailed')} ${safeText(friendlyError(e.message))}</div>`;}
}

function openHeroRole(heroId,role){
  const p=(state.analytics?.heroRoles||[]).find(x=>x.hero_id===Number(heroId)&&x.role===Number(role));if(!p)return;els.modalBox.classList.remove('match-modal');
  const mix=Object.entries(p.durationMix).filter(([,n])=>n).map(([b,n])=>`${durationBucketLabel(b)}: ${n}`).join(' · '),metricRows=Object.entries(p.metricPcts).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);
  $('modalContent').innerHTML=`<div class="eyebrow">${t('heroRoleDetails')}</div><h2>${safeText(heroName(p.hero_id))} · ${roleName(p.role)}</h2><p class="muted">${p.n} ${t('matchesWord')} · ${t('confidence')} ${p.confidence}% · ${t('matchLength')} ${p.avgDuration.toFixed(1)} min</p><div class="benchmark-kpis"><div class="progress-card"><span>${t('winrateLabel')}</span><strong>${fmtPct(p.wr,0)}</strong></div><div class="progress-card"><span>${t('scoreLabel')}</span><strong>${Math.round(p.avgScore)}</strong></div><div class="progress-card"><span>${t('roleFit')}</span><strong class="${p.fitScore>=56?'good-text':p.fitScore<44?'bad-text':''}">${Math.round(p.fitScore)}</strong><small>${heroRoleFitLabel(p.fitScore)}</small></div><div class="progress-card"><span>${t('durationProfile')}</span><strong>${p.avgDuration.toFixed(1)}m</strong><small>${safeText(mix)}</small></div></div><article class="panel"><div class="panel-title"><div><span class="eyebrow">${t('compareRoleNorm')}</span><h3>${t('heroRoleProfile')}</h3></div></div><div class="hero-role-metric-grid">${metricRows.map(x=>`<div class="hero-role-metric ${x.v>=65?'good':x.v<35?'bad':''}"><span>${gapMetricLabel(x.k)}</span><strong>${Math.round(x.v)}</strong><small>${x.v>=65?t('fitGood'):x.v<35?t('fitWeak'):t('fitNeutral')}</small><div class="impact-bar"><div class="impact-fill" style="width:${clamp(x.v)}%"></div></div></div>`).join('')}</div></article><div class="data-note">${t('contextualScoreNote')}</div>`;
  $('modalBackdrop').classList.remove('hidden');
}
function openHero(heroId){
  const h=state.analytics.heroes.find(x=>x.hero_id===Number(heroId));if(!h)return;const profiles=(state.analytics.heroRoles||[]).filter(x=>x.hero_id===Number(heroId)).sort((a,b)=>b.n-a.n),main=profiles.find(x=>x.role===h.mainRole)||profiles[0],byRole=[1,2,3,4,5].map(r=>{const ms=h.matches.filter(m=>getRole(m)===r),p=profiles.find(x=>x.role===r);return{r,n:ms.length,wr:ms.length?ms.filter(isWin).length/ms.length:0,score:avg(ms,m=>m._score||50),fit:p?.fitScore,p};}).filter(x=>x.n),best=main?.strengths?.[0],weak=main?.gaps?.[0],grade=performanceGrade(h.avgScore);els.modalBox.classList.remove('match-modal');$('modalContent').innerHTML=`<div class="hero-modal-head"><div class="hero-modal-art">${heroImg(h.hero_id)?`<img src="${heroImg(h.hero_id)}">`:''}<span class="match-grade ${gradeClass(h.avgScore)}">${grade}</span></div><div><span class="eyebrow">${t('heroPassport')}</span><h2>${safeText(heroName(h.hero_id))}</h2><p class="muted">${roleName(h.mainRole)} · ${h.games} ${t('matchesWord')} · ${heroClassLabel(h.classification)} · ${t('confidence')} ${h.confidence}%</p></div></div><div class="hero-modal-kpis"><div><span>${t('winrateLabel')}</span><strong>${fmtPct(h.wr,0)}</strong></div><div><span>${t('scoreLabel')}</span><strong>${Math.round(h.avgScore)}</strong></div><div><span>KDA</span><strong>${h.kda.toFixed(2)}</strong></div><div><span>${t('deathsLabel')}</span><strong>${h.deaths.toFixed(1)}</strong></div><div><span>${t('roleFit')}</span><strong>${main?Math.round(main.fitScore):'—'}</strong></div></div><div class="hero-modal-gap"><div class="good"><span>${t('bestMetric')}</span><strong>${best?gapMetricLabel(best.metric):'—'}</strong><b>${best?Math.round(best.pct):'—'}</b></div><div class="bad"><span>${t('weakestMetric')}</span><strong>${weak?gapMetricLabel(weak.metric):'—'}</strong><b>${weak?Math.round(weak.pct):'—'}</b></div></div><div class="hero-role-tabs">${byRole.map(x=>`<button class="hero-role-open" data-role="${x.r}"><span>${roleName(x.r)}</span><b>${x.n} ${t('matchesWord')}</b><small>WR ${fmtPct(x.wr,0)} · ${t('scoreLabel')} ${Math.round(x.score)}${Number.isFinite(x.fit)?` · Fit ${Math.round(x.fit)}`:''}</small></button>`).join('')}</div>`;$('modalContent').querySelectorAll('.hero-role-open').forEach(b=>b.onclick=()=>openHeroRole(heroId,Number(b.dataset.role)));$('modalBackdrop').classList.remove('hidden');
}

function trainingTargetFor(mistake,role){ if(!mistake||!role)return null;const b=state.analytics.baselines[role]?.[mistake.metric];if(!b)return null;const higher=mistake.direction==='low',threshold=higher?b.p40:b.p60,formats={deaths:v=>state.lang==='ru'?`не более ${Math.max(1,Math.round(v))} смертей`:`no more than ${Math.max(1,Math.round(v))} deaths`,kda:v=>`KDA ≥ ${v.toFixed(2)}`,gpm:v=>`GPM ≥ ${Math.round(v)}`,xpm:v=>`XPM ≥ ${Math.round(v)}`,lhpm:v=>state.lang==='ru'?`Ластхиты/мин ≥ ${v.toFixed(1)}`:`LH/min ≥ ${v.toFixed(1)}`,dmgpm:v=>`${t('patternMetricDamage')} ≥ ${Math.round(v)}`,assistpm:v=>`${t('patternMetricAssists')} ≥ ${v.toFixed(2)}`,towerpm:v=>`${t('patternMetricTower')} ≥ ${Math.round(v)}`};return{metric:mistake.metric,direction:mistake.direction==='high'?'max':'min',threshold,label:formats[mistake.metric]?.(threshold)||`${mistake.metric} ${threshold.toFixed(1)}`,role,mistakeKey:mistake.key,titleKey:mistake.titleKey}; }
function trainingStorageKey(){ return `dotaSkillLab.training.${state.accountId}`; }
function getTraining(){ try{return JSON.parse(localStorage.getItem(trainingStorageKey())||'null');}catch{return null;} }
function passesTraining(m,tg){ if(getRole(m)!==Number(tg.role))return null;const v=matchMetrics(m)[tg.metric];return tg.direction==='max'?v<=tg.threshold:v>=tg.threshold; }
function renderTraining(){
  const suggested=trainingTargetFor(state.analytics.mistakes[0],state.analytics.primaryRole),active=getTraining();if(!suggested&&!active){$('trainingTitle').textContent=t('noData');$('trainingState').textContent=t('wait');$('trainingBody').innerHTML=`<div class="training-empty"><b>${t('noData')}</b><span>${t('startBlockHint')}</span></div>`;$('startTrainingBtn').classList.add('hidden');$('resetTrainingBtn').classList.add('hidden');return;}
  const tg=active||suggested;$('trainingTitle').textContent=t(tg.titleKey||'noData');const newer=active?state.matches.filter(m=>Number(m.start_time)>Number(active.startTime||0)&&getRole(m)===Number(active.role)).slice().sort((a,b)=>a.start_time-b.start_time).slice(0,5):[],results=newer.map(m=>({m,pass:passesTraining(m,tg)})),passed=results.filter(x=>x.pass).length;
  const status=!active?t('questReady'):results.length>=5?(passed>=4?t('questMastered'):t('questRepeat')):t('questOnTrack');$('trainingState').textContent=status;
  const pct=results.length?Math.round((passed/Math.max(1,results.length))*100):0;
  $('trainingBody').innerHTML=`<div class="quest-hero"><div class="quest-ring" style="--quest:${active?Math.round(results.length/5*100):0}"><b>${results.length}/5</b><span>${t('questProgress')}</span></div><div class="quest-copy"><span class="quest-status ${results.length>=5&&passed>=4?'mastered':results.length>=5?'repeat':active?'ontrack':'ready'}">${status}</span><h3>${safeText(tg.label)}</h3><p>${t('trainingFocus')}: <b>${roleName(tg.role)}</b> · ${t('nextFiveRole')}</p><div class="quest-run">${[0,1,2,3,4].map(i=>{const x=results[i];return`<div class="quest-game ${x?(x.pass?'pass':'fail'):''}"><i>${x?(x.pass?'✓':'×'):i+1}</i><span>${x?`${safeText(heroName(x.m.hero_id))}<small>${x.m.kills}/${x.m.deaths}/${x.m.assists}</small>`:`${t('gameWord')} ${i+1}`}</span></div>`}).join('')}</div>${active?`<div class="training-rule">${t('completed')}: <b>${passed}/5</b>${results.length>=5?` · <b>${passed>=4?t('blockFixed'):t('repeatBlock')}</b>`:''}</div>`:`<div class="training-rule">${t('startBlockHint')}</div>`}</div></div>`;
  $('startTrainingBtn').classList.toggle('hidden',!!active);$('resetTrainingBtn').classList.toggle('hidden',!active);
}
function startTraining(){ const m=state.analytics.mistakes[0],tg=trainingTargetFor(m,state.analytics.primaryRole);if(!tg)return;const latest=state.matches[0];localStorage.setItem(trainingStorageKey(),JSON.stringify({...tg,startMatchId:String(latest?.match_id||0),startTime:Number(latest?.start_time||0),startedAt:Date.now()}));queueRemoteUserStateSync();renderTraining(); }
function resetTraining(){ localStorage.removeItem(trainingStorageKey());queueRemoteUserStateSync();renderTraining(); }
function renderProgress(){
  const p=state.analytics.progress,defs=[[t('winrateLabel'),'wr',v=>fmtPct(v,0),true],['KDA','kda',v=>v.toFixed(2),true],[t('deathsLabel'),'deaths',v=>v.toFixed(1),false],['GPM','gpm',v=>Math.round(v),true],['XPM','xpm',v=>Math.round(v),true],[t('coachScore'),'score',v=>Math.round(v),true]];
  const scoreDelta=p.current.score-p.previous.score,headline=scoreDelta>3?t('progressImproved'):scoreDelta<-3?t('progressRegressed'):t('progressStable'),headCls=scoreDelta>3?'up':scoreDelta<-3?'down':'neutral';
  $('progressGrid').innerHTML=`<div class="progress-headline ${headCls}"><span>${t('progressHeadline')}</span><strong>${headline}</strong><b>${scoreDelta>0?'+':''}${scoreDelta.toFixed(0)} ${t('coachScore')}</b></div>`+defs.map(([label,key,fmt,higher])=>{const c=p.current[key],pr=p.previous[key],delta=c-pr,good=higher?delta>0:delta<0,neutral=Math.abs(delta)<.001;return`<div class="progress-card"><span>${label}</span><strong>${fmt(c)}</strong><div class="delta ${neutral?'neutral':good?'up':'down'}">${delta>0?'+':''}${key==='wr'?(delta*100).toFixed(0)+' '+t('percentagePoints'):delta.toFixed(key==='score'?0:1)} ${t('previous20')}</div></div>`;}).join('');
  const blocks=[];for(let i=0;i<Math.min(100,state.matches.length);i+=10){const b=state.matches.slice(i,i+10);if(b.length>=5)blocks.push({label:`${i+1}-${i+b.length}`,score:avg(b,m=>m._score||50)});}blocks.reverse();$('blockTrend').innerHTML=blocks.map(b=>`<div class="block-col"><div style="height:${clamp(b.score)}%" title="${t('scoreLabel')} ${b.score.toFixed(0)}"></div><span>${b.label}</span></div>`).join('');
  const lowRoles=state.matches.filter(m=>roleConfidenceLevel(m)==='low').length,manual=Object.keys(state.roleOverrides).length,depth=state.matches.length,rankedN=state.matches.filter(isRanked).length;$('confidencePanel').innerHTML=`<div class="confidence-row"><span>${t('historyDepth')}</span><b>${depth>=150?t('depthHigh'):depth>=80?t('depthMedium'):t('depthLow')} · ${depth}</b></div><div class="confidence-row"><span>${t('rankedLabel')}</span><b>${rankedN}/${depth}</b></div><div class="confidence-row"><span>${t('autoRoleLow')}</span><b>${lowRoles}</b></div><div class="confidence-row"><span>${t('manualRoleCorrections')}</span><b>${manual}</b></div><div class="confidence-row"><span>${t('topMistakeConfidence')}</span><b>${state.analytics.mistakes[0]?Math.round(state.analytics.mistakes[0].confidence)+'%':'—'}</b></div><p class="muted">${t('dataQualityNote')}</p>`;
}

function medalToSteamSkill(){
  const r=currentRating(),m=r.medal; if(!m)return null;
  if(['herald','guardian','crusader','archon'].includes(m))return 1;
  if(['legend','ancient'].includes(m))return 2;
  return 3;
}
function steamSkillLabel(skill){return Number(skill)===1?t('bracketNormal'):Number(skill)===2?t('bracketHigh'):t('bracketVeryHigh');}
const BENCH_METRICS=[
  {key:'kda',label:'KDA',higher:true,digits:2},{key:'deaths',labelKey:'deathsLabel',higher:false,digits:1},{key:'gpm',label:'GPM',higher:true,digits:0},{key:'xpm',label:'XPM',higher:true,digits:0},
  {key:'lhpm',labelKey:'patternMetricFarm',higher:true,digits:1},{key:'dmgpm',labelKey:'patternMetricDamage',higher:true,digits:0},{key:'assistpm',labelKey:'patternMetricAssists',higher:true,digits:2},{key:'towerpm',labelKey:'patternMetricTower',higher:true,digits:0}
];
function benchLabel(d){return d.label||t(d.labelKey);}
function userHeroRoleSample(heroId,role){return state.matches.filter(m=>Number(m.hero_id)===Number(heroId)&&getRole(m)===Number(role));}
function summarizeUserForBenchmark(ms){
  const out={n:ms.length,wr:ms.length?ms.filter(isWin).length/ms.length:0,metrics:{}};
  for(const d of BENCH_METRICS){const vals=ms.map(m=>matchMetrics(m)[d.key]).filter(Number.isFinite);out.metrics[d.key]={p25:quantile(vals,.25),p50:quantile(vals,.50),p75:quantile(vals,.75),values:vals};}
  return out;
}
function percentileAgainst(values,x,higher=true){return Math.round(percentileRank((values||[]).map(Number).filter(Number.isFinite),Number(x),higher));}
function benchmarkDurationSelection(userMs,rawMode){
  let mode=rawMode||'auto';if(mode==='auto'){const mins=userMs.map(m=>matchMetrics(m).mins).filter(Number.isFinite);mode=durationBucketFromMinutes(quantile(mins,.5));}
  const bounds=durationBounds(mode),filtered=mode==='all'?userMs:userMs.filter(m=>durationBucketForMatch(m)===mode);return{mode,rawMode:rawMode||'auto',bounds,filtered:filtered.length>=4?filtered:userMs,label:mode==='all'?t('durationAll'):durationBucketLabel(mode)};
}
function renderBenchmarkSetup(){
  const heroSel=$('benchmarkHero'),roleSel=$('benchmarkRole'),skillSel=$('benchmarkPeerSkill'),durationSel=$('benchmarkDuration'); if(!heroSel||!roleSel||!skillSel||!durationSel)return;
  const heroes=state.analytics?.heroes||[]; const currentHero=Number(heroSel.value||state.benchmark.heroId||heroes[0]?.hero_id||0);
  heroSel.innerHTML=heroes.map(h=>`<option value="${h.hero_id}" ${Number(h.hero_id)===currentHero?'selected':''}>${safeText(heroName(h.hero_id))} (${h.games})</option>`).join('');
  const hs=heroes.find(h=>Number(h.hero_id)===Number(currentHero)); const role=Number(roleSel.value||state.benchmark.role||hs?.mainRole||state.analytics?.primaryRole||4); roleSel.value=String(role);
  if(!skillSel.dataset.touched){skillSel.value='auto';}if(!durationSel.dataset.touched){durationSel.value=state.benchmark.durationMode||'auto';}
  $('benchmarkStatus').textContent=state.benchmark.loading?t('benchmarkLoading'):state.benchmark.data?`${safeText(heroName(state.benchmark.heroId))} · ${roleName(state.benchmark.role)}`:'';
}
function renderLocalBenchmarkFallback(heroId,role,message=''){
  const host=$('benchmarkResults'),p=(state.analytics?.heroRoles||[]).find(x=>x.hero_id===heroId&&x.role===role);if(!host)return;
  let details='';if(p){details=`<article class="panel"><div class="panel-title"><div><span class="eyebrow">${safeText(heroName(heroId))} · ${roleName(role)}</span><h3>${t('heroRoleProfile')}</h3></div></div><div class="benchmark-kpis"><div class="progress-card"><span>${t('matchesLabel')}</span><strong>${p.n}</strong></div><div class="progress-card"><span>${t('winrateLabel')}</span><strong>${fmtPct(p.wr,0)}</strong></div><div class="progress-card"><span>${t('scoreLabel')}</span><strong>${Math.round(p.avgScore)}</strong></div><div class="progress-card"><span>${t('roleFit')}</span><strong>${Math.round(p.fitScore)}</strong><small>${heroRoleFitLabel(p.fitScore)}</small></div></div><div class="hero-role-metric-grid">${Object.entries(p.metricPcts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="hero-role-metric ${v>=65?'good':v<35?'bad':''}"><span>${gapMetricLabel(k)}</span><strong>${Math.round(v)}</strong><small>${t('compareRoleNorm')}</small></div>`).join('')}</div></article>`;}
  host.innerHTML=`<div class="notice calibration-note">${t('benchmarkUnavailableLocal')}${message?`<br><small>${safeText(message)}</small>`:''}</div>${details}`;
}
async function loadBenchmark(){
  const heroId=Number($('benchmarkHero').value),role=Number($('benchmarkRole').value),rawSkill=$('benchmarkPeerSkill').value,rawDuration=$('benchmarkDuration').value||'auto';
  let peerSkill=rawSkill==='auto'?medalToSteamSkill():Number(rawSkill); if(!peerSkill){$('benchmarkStatus').textContent=t('benchmarkNeedRank');return;}
  const allUserMs=userHeroRoleSample(heroId,role); if(allUserMs.length<5){$('benchmarkStatus').textContent=t('benchmarkNoData');$('benchmarkResults').innerHTML='';return;}
  const dur=benchmarkDurationSelection(allUserMs,rawDuration),userMs=dur.filtered;
  state.benchmark={...state.benchmark,loading:true,heroId,role,peerSkill,durationMode:rawDuration,durationResolved:dur.mode};$('benchmarkLoadBtn').disabled=true;$('benchmarkLoadBtn').textContent=t('benchmarkLoading');$('benchmarkStatus').textContent=`${t('benchmarkLoading')} · ${dur.label}`;
  try{
    const q=new URLSearchParams({hero_id:String(heroId),role:String(role),peer_skill:String(peerSkill),sample:'16',duration_mode:dur.mode,min_minutes:String(dur.bounds.min||0),max_minutes:String(dur.bounds.max||0)});
    const data=await fetchJson(`/api/steam/benchmark?${q.toString()}`); state.benchmark={data,loading:false,heroId,role,peerSkill,durationMode:rawDuration,durationResolved:dur.mode}; renderBenchmark();
  }catch(e){state.benchmark.loading=false;const extra=(e.status===502&&Number(e.upstreamStatus)===400)?t('benchmarkBadRequestHint'):friendlyError(e.message);$('benchmarkStatus').textContent=`${t('benchmarkError')} ${extra}`;renderLocalBenchmarkFallback(heroId,role,extra);}
  finally{$('benchmarkLoadBtn').disabled=false;$('benchmarkLoadBtn').textContent=t('benchmarkLoad');}
}
function benchmarkGapScore(you,elite,d){
  if(!Number.isFinite(you)||!Number.isFinite(elite)||elite===0)return 0; const rel=(you-elite)/Math.max(1,Math.abs(elite)); return d.higher?-rel:rel;
}
function renderBenchmark(){
  const host=$('benchmarkResults'),data=state.benchmark.data;if(!host||!data)return;
  const heroId=state.benchmark.heroId,role=state.benchmark.role,allUser=userHeroRoleSample(heroId,role),dur=benchmarkDurationSelection(allUser,state.benchmark.durationMode||'auto'),user=summarizeUserForBenchmark(dur.filtered),peer=data.peer,elite=data.elite;
  const same=!!data.same_cohort; const rows=[];
  for(const d of BENCH_METRICS){const y=user.metrics[d.key]?.p50,p=peer?.metrics?.[d.key]?.p50,e=elite?.metrics?.[d.key]?.p50,vals=elite?.metrics?.[d.key]?.values||[];rows.push({...d,y,p,e,pct:vals.length?percentileAgainst(vals,y,d.higher):null,gap:benchmarkGapScore(y,e,d)});}
  const sortedGaps=rows.filter(x=>Number.isFinite(x.e)).slice().sort((a,b)=>b.gap-a.gap),gaps=sortedGaps.filter(x=>x.gap>.05).slice(0,4),strengths=sortedGaps.filter(x=>x.gap<-.03).sort((a,b)=>a.gap-b.gap).slice(0,4),fmt=(v,d)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
  host.innerHTML=`<div class="benchmark-kpis"><div class="progress-card"><span>${t('yourSample')}</span><strong>${user.n}</strong><small>${fmtPct(user.wr,0)}</small></div><div class="progress-card"><span>${t('peerSample')}</span><strong>${peer?.n||0}</strong><small>${steamSkillLabel(data.peer_skill)} · ${peer?fmtPct(peer.wr,0):'—'}</small></div><div class="progress-card"><span>${t('eliteSample')}</span><strong>${elite?.n||0}</strong><small>${t('bracketVeryHigh')} · ${elite?fmtPct(elite.wr,0):'—'}</small></div><div class="progress-card"><span>${t('durationCohort')}</span><strong>${dur.label}</strong><small>${t('benchmarkDurationNote')}</small></div></div>
  ${same?`<div class="notice">${t('benchmarkSameCohort')}</div>`:''}${(peer?.n||0)<15||(elite?.n||0)<15?`<div class="notice">${t('benchmarkLowSample')}</div>`:''}
  <article class="panel benchmark-panel"><div class="panel-title"><div><span class="eyebrow">${safeText(heroName(heroId))} · ${roleName(role)} · ${dur.label}</span><h3>${t('benchmarkMetrics')}</h3></div></div><div class="benchmark-table"><div class="benchmark-head"><span>${t('metric')}</span><span>${t('you')}</span><span>${t('peer')}</span><span>${t('veryHigh')}</span><span>${t('percentileVsElite')}</span></div>${rows.map(x=>`<div class="benchmark-row"><span>${benchLabel(x)}</span><b>${fmt(x.y,x.digits)}</b><span>${fmt(x.p,x.digits)}</span><span>${fmt(x.e,x.digits)}</span><span><b class="${x.pct>=65?'good-text':x.pct<35?'bad-text':''}">${x.pct==null?'—':x.pct+'%'}</b></span></div>`).join('')}</div></article>
  <div class="grid-2"><article class="panel"><div class="panel-title"><div><span class="eyebrow">${t('benchmarkGaps')}</span><h3>${t('benchmarkGaps')}</h3></div></div>${gaps.length?gaps.map(x=>`<div class="gap-line"><span>${benchLabel(x)}</span><b>${x.pct==null?'—':x.pct+'%'}</b><small>${t('percentileVsElite')}</small></div>`).join(''):`<div class="notice">${t('noData')}</div>`}</article><article class="panel"><div class="panel-title"><div><span class="eyebrow">${t('benchmarkStrengths')}</span><h3>${t('benchmarkStrengths')}</h3></div></div>${strengths.length?strengths.map(x=>`<div class="gap-line strength"><span>${benchLabel(x)}</span><b>${x.pct==null?'—':x.pct+'%'}</b><small>${t('percentileVsElite')}</small></div>`).join(''):`<div class="notice">${t('noData')}</div>`}</article></div>
  <div class="notice">${t('benchmarkSourceNoteV11')}<br>${t('roleConfidenceBenchmark')}</div>`;
  $('benchmarkStatus').textContent=`${safeText(heroName(heroId))} · ${roleName(role)} · ${steamSkillLabel(data.peer_skill)} · ${dur.label}`;
}

function openRatingSettings(){
  loadRatingManual();const a=state.ratingAuto||{},m=state.ratingManual||{},autoText=(hasNum(a.current_mmr)||hasNum(a.rank_tier))?`${t('steamRatingFields')}: MMR ${a.current_mmr??'—'} · rank_tier ${a.rank_tier??'—'} · delta ${a.delta_count||0}`:t('ratingAutoUnavailable');const medalOptions=MEDALS.map(x=>`<option value="${x}" ${m.medal===x?'selected':''}>${medalLabel(x)}</option>`).join('');els.modalBox.classList.remove('match-modal');$('modalContent').innerHTML=`<div class="eyebrow">${t('ratingTitle')}</div><h2>${t('ratingTitle')}</h2><h3>${t('ratingAutoTitle')}</h3><div class="data-note">${autoText}</div><h3>${t('ratingManualTitle')}</h3><p class="muted">${t('manualRankPrompt')}</p><div class="rating-grid"><label>${t('medal')}<select id="manualMedal"><option value="">—</option>${medalOptions}</select></label><label>${t('star')}<select id="manualStar">${[1,2,3,4,5].map(x=>`<option value="${x}" ${Number(m.star||1)===x?'selected':''}>${x}</option>`).join('')}</select></label><label>${t('mmr')}<input id="manualMmr" type="number" min="0" max="20000" step="1" value="${m.mmr||''}" placeholder="4200"></label></div><div class="rank-preview" id="rankPreview"></div><div class="data-note">${t('exactRankNote')}</div><div class="setup-row"><button class="primary small" id="saveRatingBtn">${t('saveRating')}</button><button class="secondary small" id="clearRatingBtn">${t('clearRating')}</button><span id="ratingSaveState" class="save-state"></span></div>`;
  const preview=()=>{const medal=$('manualMedal').value,star=Number($('manualStar').value||1);$('rankPreview').innerHTML=medal?`<div class="rank-emblem large ${medal}"><div class="rank-gem"><span>${MEDALS.indexOf(medal)+1}</span></div><div class="rank-stars">${medal==='immortal'?'<span class="immortal-mark">◆</span>':Array.from({length:5},(_,i)=>`<span class="${i<star?'on':''}">★</span>`).join('')}</div></div><strong>${medal==='immortal'?medalLabel(medal):`${medalLabel(medal)} ${star}`}</strong>`:'—';};preview();$('manualMedal').onchange=preview;$('manualStar').onchange=preview;
  $('saveRatingBtn').onclick=()=>{const medal=$('manualMedal').value,star=Number($('manualStar').value||1),mmr=Number($('manualMmr').value||0);saveRatingManual({medal:medal||null,star,mmr:mmr>0?mmr:null,updatedAt:Date.now()});$('ratingSaveState').textContent=t('ratingSaved');renderOverview();preview();};$('clearRatingBtn').onclick=()=>{saveRatingManual({});openRatingSettings();renderOverview();};$('modalBackdrop').classList.remove('hidden');
}
function exportAnalytics(){ const payload={version:'16',exported_at:new Date().toISOString(),language:state.lang,scope:state.scope,account_id:state.accountId,player:state.profile?.profile||{},rating:{auto:state.ratingAuto,manual:state.ratingManual},matches:state.matches.map(m=>({...m,role:getRole(m),role_final_source:roleSource(m),performance_score:m._score,performance_context:m._scoreContext,duration_bucket:m._durationBucket,coach_verdict:coachVerdict(m).key,coach_risks:coachModelForMatch(m).risks.map(x=>({key:x.key,pct:x.pct})),coach_strengths:coachModelForMatch(m).strengths.map(x=>({key:x.key,pct:x.pct}))})),analytics:{primary_role:state.analytics.primaryRole,dna:state.analytics.dna,mistakes:state.analytics.mistakes,progress:state.analytics.progress,patterns:state.analytics.patterns,sessions:state.analytics.sessions,heroes:state.analytics.heroes.map(h=>({...h,matches:undefined})),hero_roles:(state.analytics.heroRoles||[]).map(h=>({...h,matches:undefined})),benchmark:state.benchmark.data},role_overrides:state.roleOverrides};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`dota-skill-lab-${state.accountId}-v16.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function switchSection(id){ document.querySelectorAll('.content-section').forEach(s=>s.classList.toggle('hidden',s.id!==id));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.section===id));window.scrollTo({top:0,behavior:'smooth'}); }

// events
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>switchSection(b.dataset.section));
els.load.onclick=loadPlayer;els.refresh.onclick=()=>loadPlayer();if(els.steamLoad)els.steamLoad.onclick=handleSteamLoad;
els.resultFilter.onchange=renderMatches;els.roleFilter.onchange=renderMatches;els.exportBtn.onclick=exportAnalytics;els.ratingBtn.onclick=openRatingSettings;els.switchProfile.onclick=logoutSteam;$('benchmarkLoadBtn').onclick=loadBenchmark;$('benchmarkHero').onchange=()=>{state.benchmark.data=null;renderBenchmarkSetup();$('benchmarkResults').innerHTML='';};$('benchmarkRole').onchange=()=>{state.benchmark.data=null;$('benchmarkResults').innerHTML='';};$('benchmarkPeerSkill').onchange=()=>{$('benchmarkPeerSkill').dataset.touched='1';state.benchmark.data=null;$('benchmarkResults').innerHTML='';};$('benchmarkDuration').onchange=()=>{$('benchmarkDuration').dataset.touched='1';state.benchmark.durationMode=$('benchmarkDuration').value;state.benchmark.data=null;$('benchmarkResults').innerHTML='';};
$('startTrainingBtn').onclick=startTraining;$('resetTrainingBtn').onclick=resetTraining;$('langRu').onclick=()=>setLanguage('ru');$('langEn').onclick=()=>setLanguage('en');$('authLangRu').onclick=()=>setLanguage('ru');$('authLangEn').onclick=()=>setLanguage('en');
$('saveJournal').onclick=()=>{localStorage.setItem(journalStorageKey(),$('journal').value);queueRemoteUserStateSync();$('journalSaved').textContent=t('saved');setTimeout(()=>$('journalSaved').textContent='',1300);};
$('modalClose').onclick=()=>{$('modalBackdrop').classList.add('hidden');els.modalBox.classList.remove('match-modal');};$('modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop'){$('modalBackdrop').classList.add('hidden');els.modalBox.classList.remove('match-modal');}};
$('authLoginBtn').onclick=authenticateAndLoad;if($('authForgetBtn'))$('authForgetBtn').onclick=clearRememberedAuth;

const savedLimit=localStorage.getItem('dotaSkillLab.historyLimit');if(savedLimit&&['50','100','200'].includes(savedLimit))els.historyLimit.value=savedLimit;els.matchScope.value=state.scope==='all'?'all':'ranked';
applyI18n();
(async()=>{
  await runDiagnostics();
  await bootstrapSteamAuth();
})();
