# Roadmap оптимизаций

Приоритет: **P0** — исследования и низкий риск; **P1** — средний объём; **P2** — стратегические изменения.

Разделение: **[Fork]** — патчи в `maullerz/react-redux-form`; **[App]** — `dbo-front-copy` (pin форка сделан, оптимизации — по профилю).

## Контекст (решения команды)

- **Фаза:** исследования React 18 / RR7 **закрыты**; в `dbo-front-copy` — **Git pin** форка (2026-05-29).
- **Форк:** [`maullerz/react-redux-form`](https://github.com/maullerz/react-redux-form), патчи в `master`, SHA в lockfile.
- **Эталоны для замеров:** `APPLCREDITSEVENMINUTES`, `PAYMENT_ORDER`, `APPLCOMPLEXSERVICE`.
- **React в клиенте:** пока **16.14**; форк готов к 17/18 по peer.

---

## P0 — исследования (текущая фаза)

| # | Задача | Где | Effort |
|---|--------|-----|--------|
| 0.1 | Базовый профиль на 3 эталонных документах (сценарии: open, ввод, load, save) | [Fork] docs + заметки; позже [App] | M |
| 0.2 | Матрица совместимости React 16 / 17 / 18 для форка | [Fork] | **частично** — 18 + СББОЛ 16.14 ok, [06-react-upgrade.md](./06-react-upgrade.md) |
| 0.3 | Блокеры React 18 (`ref` в `Control`) | [Fork] | **done** |
| 0.4 | Сверить `utils/react-redux-form/*` в СББОЛ с `src/` форка — список расхождений | [Fork] doc | S |
| 0.5 | Базовая линия тестов форка зафиксирована | [Fork] [07-testing.md](./07-testing.md) | S |

### Клиент — после первого pin (2026-05-29)

| # | Задача | Статус |
|---|--------|--------|
| — | `github:maullerz/react-redux-form#<sha>` | **done** |
| — | `prepare` / rspack / ручной UI | **done** |
| — | Синхронизация `utils/react-redux-form/*` | open |
| — | `Error.js`: импорт не из `src/` | open |
| — | Формальный QA на 3 эталонных документах | open |

---

## P1 — форк, обратная совместимость

| # | Задача | Описание | Effort |
|---|--------|----------|--------|
| 1.1 | **[Fork]** Опция `lazy: true` в `combineForms` по умолчанию для СББОЛ | Meta полей создаётся при первом touch/change, не при старте | M |
| 1.2 | **[Fork]** Расширить `rrf/batch` хелпер `actions.batch([...])` в публичном API | Упростить замену циклов dispatch в [App] | S |
| 1.3 | **[Fork]** `connect` option / context `localStore` документировать; Form передаёт store | Изоляция фильтров уже есть паттерн LocalForm | S |
| 1.4 | **[Fork]** Селектор `makeFieldSelector(model)` с мемоизацией | Control подписывается только на свой field meta + value | L |
| 1.5 | **[Fork]** Флаг `disableFindDOMNode` / отключение HTML5 node validation | Меньше работы в hot path | S |
| 1.6 | **[Fork]** Short-circuit в `changeActionReducer` если value deepEqual | Уже частично для model; усилить для form meta | M |
| 1.7 | **[App]** Обернуть `upsertAndSetFieldsByModel` в один `actions.batch` | Снижение N dispatch | M |
| 1.8 | **[App]** Расширить `ERRORS_BATCH`/`TOUCH_RESET_BATCH` на другие массовые сценарии | По результатам профилирования | M |

---

## P1 — прикладной слой СББОЛ

| # | Задача | Описание | Effort |
|---|--------|----------|--------|
| 2.1 | **[App]** Свести `createControlConnected` к 1–2 `connect` | Вынести formatControls в context документа; dispatch — один connect | L |
| 2.2 | **[App]** `formatControls` — селектор на docType, context provider в `Document` | Убрать per-field fetch в mapState | M |
| 2.3 | **[App]** Ленивая регистрация форм | Не держать все ~100 form meta в root reducer; dynamic reducer injection (RTK) | L |
| 2.4 | **[App]** `reselect` для `getFormState` / списков errors на таб | Таб ререндерится только при своих полях | M |

---

## Исследование React (17 → 18) — статус

Итоги: [06-react-upgrade.md](./06-react-upgrade.md), установка: [08-client-install.md](./08-client-install.md).

| Этап | Статус |
|------|--------|
| R18 feasibility | **done** — ref в `Control`, тесты на 18.3.1 |
| react-redux 7 | **done** — dev ^7.1.3, peer ^7 |
| СББОЛ на 16.14 + Git pin | **done** (2026-05-29) |
| R17 отдельный прогон | open |
| Strict Mode / legacy context | open (не блокировало pin) |

| # | Задача | Статус |
|---|--------|--------|
| R.1 | CI matrix React 16.14 / 17 / 18 | open |
| R.2 | `findDOMNode` → ref | **done** |
| R.3 | dev react-redux v7 | **done** |

---

## P2 — стратегия форка (после исследований)

| # | Задача | Описание | Effort |
|---|--------|----------|--------|
| 3.1 | **[Fork]** Опциональный упрощённый режим meta (без breaking по умолчанию) | Только за явным flag в `combineForms` | XL |
| 3.2 | **[Fork]** Миграция сборки: Babel 7 + tsup/esbuild, ESM | Публичный пакет, проще контрибьютить | L |
| 3.3 | **[Fork]** React 18: ref на Control | **done** |
| 3.4 | **[Fork]** TypeScript definitions из исходников | DX для TS-документов СББОЛ | M |
| 3.5 | **[App]** Типизированные model paths | После подключения форка в клиент | L |

---

## Анти-паттерны (не делать без измерений)

- Полный fork rewrite на Immer/Zustand без поэтапной миграции документов.
- Отключение form reducer meta — сломает `valid`/`touched` и существующие селекторы.
- Замена всех Control на uncontrolled inputs без связи с Redux — потеря единого source of truth.

---

## Предлагаемые эксперименты (spike, 1–2 дня каждый)

Профилирование и прототипы — на эталонах **`APPLCREDITSEVENMINUTES`**, **`PAYMENT_ORDER`**, **`APPLCOMPLEXSERVICE`** (в клиенте; на фазе исследований — через локальный линк форка или изолированный пример).

1. **Lazy meta** в форке: unit/integration тест + оценка размера дерева meta на типичном initial state эталонов.
2. **Field selector** в форке: прототип Control с узкой подпиской — synthetic form с ~50 полями.
3. **React 17/18**: прогон тестов форка + checklist для `Control`/`Form`.

---

## Версионирование форка

- Публичный **`master`** на GitHub, semver-теги при релизах (`v1.16.15`, …).
- Потребители (в т.ч. СББОЛ) pin по тегу или SHA при интеграции — **не в текущей фазе**.

---

## Связь с document-v2

document-v2 (react-hook-form / иная архитектура) **вне scope**. Roadmap не блокирует v2, но снижает боль legacy до её появления (если появится).
