# Интеграция в СББОЛ (dbo-front-copy)

## Масштаб использования

| Метрика | Оценка |
|---------|--------|
| Файлы с импортом `react-redux-form` | ~250+ |
| Зарегистрированных форм в `initial-form-states.ts` | ~100 ключей (документы + children + служебные формы) |
| `*Connected` контролов (`createControlConnected`) | ~100+ компонентов |
| `Field` из RRF | 2 файла (почти не используется) |
| `track` | `acControls`, один TSX-документ |

Админка (`admin`) RRF **не подключает**.

## Форк из Git (2026-05-29)

Клиент переведён с npm `^1.16.14` на форк:

```json
"react-redux-form": "github:maullerz/react-redux-form#84f1669"
```

| Проверка | Результат |
|----------|-----------|
| `npm install` + `prepare` | `lib/index.js` собран |
| Вложенный `node_modules` у пакета | нет |
| `npm run rspack:prod` | ok |
| Ручной прогон UI | без выявленных проблем |

Подробно: [08-client-install.md](./08-client-install.md). При смене SHA форка — обновить lockfile и переустановить пакет.

**Остаётся техдолг:**

- Синхронизировать `utils/react-redux-form/*` с `src/` форка.
- `components/form/Error/Error.js` — не импортировать из `react-redux-form/src/…`.

## Схема Redux

```
state.forms                          ← combineForms root model prefix
├── PAYMENT_ORDER                    ← model values (business data)
├── APPLCREDITSEVENMINUTES
├── …
└── forms                            ← form meta tree (RRF internal)
    ├── PAYMENT_ORDER
    │   ├── $form
    │   ├── AMOUNT { value, valid, errors, touched, … }
    │   └── …
    └── …
```

Селекторы (`selectors/forms.js`):

- `getFormData(state, docType)` → `state.forms[docType]` — **значения**.
- `getFormState(state, docType)` → `state.forms.forms[docType]` — **мета**.

Паттерн дублирования осознанный: API/сохранение читают values; UI ошибок и `valid` — meta.

## Регистрация форм

`reducers/forms/index.js`:

```js
const combineForm = combineForms({ ...initialFormStates, auth, dashboard, … }, ROOT_FORMS_MODEL);
```

`ROOT_FORMS_MODEL` = `'forms'` (`constants/formModels.js`, дубль в `src/constants/document-types.ts`).

Поверх `combineForm` — **кастомные ветки** reducer:

| Action | Зачем |
|--------|-------|
| `ERRORS_BATCH` | Массовая простановка ошибок с бэка без N×`setErrors` |
| `TOUCH_RESET_BATCH` | `setTouched` / `resetValidity` по списку атрибутов (в т.ч. внутри child-моделей) |

Это обход отсутствия нативного «batch touch + errors» в RRF с нужной семантикой СББОЛ. Реализация мутирует копию через `lodash set` — **вне** icepick RRf, но только в этих action types.

## Цепочка connected-контрола

Типичный input (например `TextInputWithLabelConnected`):

```
TextInput
  ← wrapWithFormControl → <Control component={TextInput} />
  ← createControlConnected (compose):
       wrapWithErrorSystem
       wrapWithModelResolver
       connect(wrapMapStateToProps)     // formatControls, curVal
       connect(dispatch upsert…)
       documentConnect                  // viewMode, disabled
       wrapWithValidationByFormat
       wrapWithValidationByLogic
       wrapWithPropsOmit
```

**Итого:** 1× RRF `Control` (внутри свой `connect`) + до **4** дополнительных `connect` на одно поле.

`wrapMapStateToProps` (`components/higher-order/wrapMapStateToProps/wrapMapStateToProps.js`):

- Парсит `ownProps.model` → `documentType`, `attribute`.
- Тянет `formatControls` из Redux на **каждое** поле.

## Документ-форма

`components/form/Document/Document.jsx`:

- `<Form model={docFormModel}>` из RRF.
- Submit/save/sign — через `actions` RRF + доменные `acDocuments*`.
- Интеграция с `@reduxjs/toolkit` slices (`document-form`) для UI-флагов (не замена RRF).

## Императивное управление: `actions/acControls.js`

Центральный модуль (~1300 строк). Использует:

- `actions.change`, `merge`, `reset`, `resetValidity`, `setErrors`, `setTouched`, …
- `track` — для подписки на изменения модели.
- `getFieldFromState` из **локальной копии** `utils/react-redux-form/get-field-from-state.js` (расширена vs upstream).

Ключевой паттерн — **`upsertAndSetFieldsByModel`**:

1. `actions.merge` в model slice.
2. Для каждого атрибута — цепочка `resetValidity` / `setTouched` / `setDirty` / `setSubmitted`…
3. `docUpsert` — сохранение на сервер.

На одно программное обновление нескольких полей — **много dispatch**, частично смягчается `@manaflair/redux-batch` на уровне store (если включён для этих action types — проверять middleware chain в `configureStore`).

## Локальные форки утилит RRF

Каталог `dbo-front-copy/utils/react-redux-form/`:

| Файл | Отличие от lib |
|------|----------------|
| `get-form.js` | Копия с кэшем; **должна** синхронизироваться с форком |
| `get-field-from-state.js` | Доп. проверка `form.$form.model === modelString`; хелперы child form |
| `resolveModel.js` | Резолв относительно `parentModel` |
| `path-starts-with.js` | Для getForm |

`components/form/Error/Error.js` импортирует **`react-redux-form/src/constants/initial-field-state`** — хрупкая зависимость от исходников пакета (ломается при отсутствии `src/` в npm-пакете). Лучше импорт из корня: `react-redux-form` → `initialFieldState` export.

## Валидация

Три слоя:

1. **RRF Control** — локальные validators (редко на connected-обёртках).
2. **Format controls** — серверный справочник правил (`wrapWithValidationByFormat`, API `getFormatControlsService`).
3. **Logic controls** — `validateLogicControlsService`, `validateFormService`.

Серверные ошибки часто идут через `actions.setErrors` или кастомный `ERRORS_BATCH`.

## Загрузка документа

Типичный action creator документа:

- `actions.load(model, data)` или `change` + `merge` по полям.
- Инициализация из `initial-form-states` при первом открытии типа.

Дерево meta пересоздаётся/обновляется form reducer — на больших документах **дорогая** операция load.

## Что СББОЛ почти не использует

- `Field`, `Fieldset`, `Errors` (свой `Error.js`).
- `LocalForm` (изолированный store) — редко.
- `immutable` entry.
- Встроенные validators RRF в пользу format/logic controls.
- `react-hook-form` — есть в dependencies, но **не** замена document forms (отдельные сценарии).

## Риски при обновлении форка

1. Рассинхрон `utils/react-redux-form/*` и `lib/` форка.
2. `Error.js` import из `src/`.
3. Зависимость от внутренних полей field state (`intents`, `retouched` семантика) в `TOUCH_RESET_BATCH`.
4. При смене SHA форка — регрессия submit/touch на эталонных документах; форк тестируется на react-redux **7.1.3** в dev.
