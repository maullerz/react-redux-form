# Исследование: React 16.14, 17 и 18

Статус: **feasibility React 18 — пройдена**; **интеграция в СББОЛ (React 16.14) — пройдена** (2026-05-29).

## Итог одной таблицей

| Вопрос | Ответ |
|--------|--------|
| Можно ли поднять форк до React 18? | **Да** (`npm test` 1307 pass на 18.3.1) |
| Работает ли форк в СББОЛ на React 16.14? | **Да** (git pin + `prepare` + rspack + ручной прогон) |
| react-redux **7.1.3** (клиент) | **Да**; peer `^4 \|\| ^5 \|\| ^7`, dev форка на 7.1.3 |
| Обязательные патчи в `src/` | `Control`: ref вместо `findDOMNode`; `Form`: `forwardRef` |
| Патчи в `test/` | [assert-synthetic-event.js](../test/helpers/assert-synthetic-event.js), [patch-react-18-test-utils.js](../test/helpers/patch-react-18-test-utils.js) |

Установка в клиенте: [08-client-install.md](./08-client-install.md). Требования: [README.md](./README.md#req-sbbol-16).

---

## Политика версий React

| Версия | Поддержка |
|--------|-----------|
| React 15 / react-dom 0.14–15 | **Снята** |
| React **16.14+** | **Минимум** (СББОЛ) |
| React 17 | В peer; отдельный прогон тестов — опционально |
| React 18 | В peer; dev-тесты форка на **18.3.1** |

Актуальные `peerDependencies` в [package.json](../package.json):

```json
"react": "^16.14.0 || ^17.0.0 || ^18.0.0",
"react-dom": "^16.14.0 || ^17.0.0 || ^18.0.0"
```

---

## react-redux

| | Форк | СББОЛ |
|---|------|------|
| Версия | dev **^7.1.3** | **7.1.3** |
| peer | `^4.0.0 \|\| ^5.0.0 \|\| ^7.0.0` | — |
| API в `src/` | `connect`, `Provider`, `areOwnPropsEqual` / `areStatePropsEqual` | без изменений |

`connect` в v7 реализован через hooks; на runtime в приложении это прозрачно. В **тестах** legacy `TestUtils` не видит DOM под hook-`connect` — см. [07-testing.md](./07-testing.md).

Дополнительно для ref на `<Form>` с react-redux 7:

```js
return connect(mapStateToProps, null, null, { forwardRef: true })(Form);
```

([form-component.js](../src/components/form-component.js))

---

## Патчи в `src/` (React 18)

### Control — ref вместо `findDOMNode`

Файлы:

- [control-component-factory.js](../src/components/control-component-factory.js) — `mergeRefs`, `getControlRef`, `attachNode(node)`
- [control-component.js](../src/components/control-component.js), [immutable.js](../src/immutable.js) — убран `findDOMNode` из strategy

HTML5 validation (`willValidate`) по-прежнему использует `this.node`, полученный через ref callback.

### Form — forwardRef

`connect(..., { forwardRef: true })` — чтобы внешний `ref` на connected `Form` доходил до class-компонента (нужно для сценариев вроде `findDOMNode` + `form.submit()` в тестах/legacy-коде).

### Тесты — SyntheticEvent

В React 17+ имя конструктора события — `SyntheticBaseEvent`. Хелпер [assert-synthetic-event.js](../test/helpers/assert-synthetic-event.js).

---

## Текущее состояние

| Компонент | React 16.14 (СББОЛ) | React 18 (dev форка) |
|-----------|----------------------|----------------------|
| `peerDependencies` | ^16.14 \|\| ^17 \|\| ^18 | то же |
| `npm test` в форке | — (dev на 18) | **1307 pass**, 6 pending |
| `Control` | ok (ref) | ok |
| `Form` / `Field` | ok | ok |
| Клиент `rspack:prod` | ok (SHA `84f1669`) | — |

---

## Чеклист

### Форк — сделано

- [x] Ref-spike `Control` (2025-05-28)
- [x] peer: min ^16.14, без 15, \|\| ^18
- [x] dev: react/react-dom ^18.3.1
- [x] dev: react-redux ^7.1.3
- [x] Тестовый harness React 18 + RR7
- [x] `Form` forwardRef
- [x] assert SyntheticBaseEvent

### СББОЛ — сделано (2026-05-29)

- [x] Git pin `github:maullerz/react-redux-form#84f1669`
- [x] `prepare` → `lib/`, без nested `node_modules` у пакета
- [x] `npm run rspack:prod`
- [x] Ручной прогон UI — без замечаний

### Опционально / позже

- [ ] `npm test` форка с react@16.14.x в devDependencies
- [ ] `npm test` с React 17
- [ ] Strict Mode spec для `Form` / `clearGetFormCacheForModel`
- [ ] Сверка `utils/react-redux-form/*`, fix `Error.js` import из `src/`
- [ ] Формальный QA на трёх эталонных документах

---

## Известные ограничения (не блокеры)

1. **Class components** — форк остаётся на class API; concurrent features React 18 в RRF не используются.
2. **Legacy context** (`contextTypes` на `Form` / `resolve-model`) — предупреждения в Strict Mode; в СББОЛ Strict Mode на document routes — проверять отдельно.
3. **Babel 6** — только сборка `lib/`; на runtime клиента не влияет.
4. **`file:` локальная ссылка** на форк — риск вложенных `node_modules` и `core-js` в rspack; для команды использовать **только Git + prepare** ([08-client-install.md](./08-client-install.md)).

## Куда смотреть дальше

- Roadmap: [05-optimization-roadmap.md](./05-optimization-roadmap.md)
- Производительность / бывший `findDOMNode`: [04-performance-analysis.md](./04-performance-analysis.md)
