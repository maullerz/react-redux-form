# Анализ производительности

Контекст: крупные документы (сотни полей, вложенные списки), долгая сессия без перезагрузки, React 16 + react-redux 7.

## 1. Двойное дерево state

**Проблема:** любое изменение поля обновляет:

- slice `state.forms[docType].field` (model),
- узел `state.forms.forms[docType].field` (meta),
- цепочку родительских `$form` (valid, pristine, …).

**Симптом:** один keystroke → большой subtree в Redux DevTools; все подписанные `connect` на форму/родителей получают шанс ререндера.

**Измерить:** React Profiler + счётчик dispatch на символ в `TextInputWithLabelConnected`.

## 2. Connect-шторм на полях

Цепочка СББОЛ (см. [03-sbbool-integration.md](./03-sbbool-integration.md)): до 5 подписок на store **на одно** поле.

RRF `Control.mapStateToProps` вызывается при **любом** изменении в `state`, если не сузить store (нет `connect` options с `storeKey` / context local store).

`wrapMapStateToProps` не мемоизирован — при изменении **любой** части store пересчитывает, но возвращает только `formatControls` + `curVal`; лишние ререндеры если `formatControls` стабилен, а `curVal` — нет у соседних полей (каждое поле подписано на свой model path через RRF — ок для curVal, но formatControls селектор общий на docType).

**Гипотеза:** при массовом `merge` документа обновляются все Controls документа.

## 3. Eager form tree при инициализации

`createFormState` без `lazy: true` строит meta для **всех** ключей initial state.

~100 форм в `combineForms` → при старте приложения создаётся meta для **всех** типов документов сразу (не лениво по первому открытию).

**Симптом:** тяжёлый initial Redux state, долгий hydration, память.

**Проверка:** размер `state.forms.forms` в DevTools до открытия документа.

## 4. `getForm` / `getFieldFromState`

Рекурсивный поиск формы O(число ключей в дереве forms) без кэша при промахе.

Кэш по `modelString` помогает после первого обращения; очистка при mount `Form` — корректно.

Дублирование логики в `dbo-front-copy/utils/react-redux-form/get-form.js` — риск двойного кэша (разные module instances, если резолвятся разные копии пакета).

## 5. `updateParentForms` / `updateSubFields`

На каждый `change`/`blur` с валидацией — обход предков и/или потомков с `$form`.

Глубокие документы (списки учредителей, вложенные child-документы) увеличивают стоимость.

## 6. Множественные dispatch из прикладного кода

`upsertAndSetFieldsByModel`:

```js
dispatch(actions.merge(...));
attributes.forEach(attr => {
  dispatch(actions.resetValidity(model));
  dispatch(actions.setTouched(model));
  dispatch(actions.setDirty(model));
});
```

N полей → 1 + 3N actions (если не batch middleware).

`ERRORS_BATCH` / `TOUCH_RESET_BATCH` — правильный паттерн СББОЛ для снижения нагрузки; стоит расширять на другие массовые операции.

## 7. `actions.merge` vs точечный `change`

`merge` на поддереве может затронуть большой объект model + form reducer пересчитает ветку.

Предпочтительнее batch из точечных `change` с `rrf/batch` — если form reducer поддерживает (да, через `createBatchReducer`).

## 8. Отсутствие селекторной гранулярности в RRF

`Control` не использует `reselect` — только shallow compare props.

Нет официального API «подписаться только на `fieldValue.errors`».

СББОЛ частично компенсирует `PureComponent` обёртками, но не на уровне RRF.

## 9. Legacy React API

~~`findDOMNode` в Control~~ — **снято** (ref callback, 2025-05); HTML5 validation через `this.node` из ref.

Для СББОЛ HTML5 `willValidate` используется редко — кандидат на feature flag / отключение.

## 10. Сравнение с альтернативами (только для контекста)

| Подход | Плюс | Минус для СББОЛ сейчас |
|--------|------|-------------------------|
| Оставить RRF + оптимизации | Низкий риск миграции | Потолок архитектуры |
| react-hook-form только для новых экранов | Легче UI | Два парадигмы, document-v2 отложен |
| Полная замена | Чистый state | Годы работы |

Документ фиксирует оптимизацию **в рамках RRF**.

## Профилирование (рекомендуемый чеклист)

**Эталонные документы СББОЛ** (зафиксировано командой):

| `DocumentTypes` | Название |
|-----------------|----------|
| `APPLCREDITSEVENMINUTES` | Кредит за 7 минут |
| `PAYMENT_ORDER` | Платёжные поручения |
| `APPLCOMPLEXSERVICE` | APPLCOMPLEXSERVICE |

На фазе исследований замеры в клиенте — по согласованию; приоритет — воспроизводимые сценарии и прототипы в репозитории форка.

1. На каждом эталоне: open form, ввод в одно поле, tab между полями, load с сервера, save.
2. Chrome Performance: те же сценарии.
3. Redux DevTools: число actions на операцию; включить `@manaflair/redux-batch` trace.
4. React DevTools Profiler: «why did this render» на `Control` и `TextInputWithLabelConnected`.
5. `rrf/batch` эксперимент в форке для `merge` + touch цепочек.

## Метрики успеха (предложение)

| Метрика | Базовый замер | Цель |
|---------|---------------|------|
| dispatch на 1 символ в поле | TBD | −50%+ |
| commit time ввод (p95) | TBD | < 16ms |
| размер `state.forms.forms` при idle | TBD | −30% (lazy forms) |
| ререндеры соседних полей при вводе | TBD | 0 |
