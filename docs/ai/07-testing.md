# Тесты форка

Как запускать, что означает отчёт Mocha, известные особенности окружения.

## Запуск

```bash
npm test
# то же: NODE_ENV=test mocha --require babel-register --require ./test/spec-setup.js
```

| Параметр | Значение |
|----------|----------|
| Раннер | Mocha **2.5** |
| Транспиляция | `babel-register` + `.babelrc` (Babel 6); для `NODE_ENV=test` — preset `modules: commonjs` (см. `env.test` в `.babelrc`) |
| DOM | jsdom **9** (`test/spec-setup.js`) |
| Lodash в тестах | `lodash.get`, `lodash.topath` в **devDependencies** форка — импорты в `test/*`, не в `lib/` |
| Рекомендуемый Node | `>=18.11` (`package.json` `engines`), в Volta: **22.18.0** |

Ожидаемый результат после настройки окружения:

```text
1307 passing
6 pending
```

**Pending — не ошибка.** Это намеренно отключённые тесты (`xit` / `xdescribe`), см. ниже.

---

## Node.js 22+ и `test/spec-setup.js`

На **Node 21+** (в т.ч. 22.18) в связке с `babel-register` свойство `global.navigator` уже объявлено как **read-only getter**. Старый setup падал:

```text
TypeError: Cannot set property navigator of #<Object> which has only a getter
```

**Исправление** (в `test/spec-setup.js`):

- `navigator` задаётся через `Object.defineProperty(global, 'navigator', { value: global.window.navigator, … })`, а не присваиванием `{ userAgent: 'node.js' }`.
- `requestAnimationFrame` — лёгкий polyfill через `window` / `setTimeout` (вместо throw), чтобы React DOM-тесты не ломались.

На Node 16–18 без глобального `navigator` старый код мог работать; поломка проявляется именно на новых Node.

---

## Почему «6 pending»?

В отчёте Mocha **pending** = пропущенный тест (аналог `it.skip` / `describe.skip`).

Фактически отключено **3 сценария**, в счётчике **6**, потому что многие спеки дублируются для двух режимов хранилища:

```js
const testContexts = { standard: { … }, immutable: { … } };
Object.keys(testContexts).forEach((testKey) => {
  describe(`<Form> component (${testKey} context)`, () => { … });
});
```

Один и тот же `xit` / `xdescribe` внутри цикла регистрируется **дважды** (standard + immutable). Для СББОЛ immutable-ветка **не используется**, но тесты upstream её сохраняют.

### Таблица отключённых тестов

| # | Файл | Отключение | Сценарий | Заметка |
|---|------|------------|----------|---------|
| 1 | `test/form-component-spec.js` | `xdescribe('reset event on form')` | Сброс model по `<button type="reset">` | Весь блок выключен |
| 2 | `test/field-component-spec.js` | `xit('should render a Component with an idempotent mapStateToProps')` | `Connect(Control)` не меняет `stateProps` без нужды | Комментарий `// TODO: control` |
| 3 | `test/control-component-spec.js` | `xit('should manually blur the control')` | `actions.blur` снимает фокус с input | Рядом есть рабочий тест на `focus`; blur в jsdom, вероятно, нестабилен |

### Соответствие счётчику

| Сценарий | Записей pending | Причина |
|----------|-----------------|---------|
| reset on form | **2** | standard + immutable (`<Form> component (… context)`) |
| idempotent mapStateToProps | **2** | standard + immutable (`<Field /> component`) |
| manual blur | **2** | standard + immutable (`<Control> component (… context)`) |
| **Итого** | **6** | 3 уникальных сценария × 2 контекста |

Уникальных названий в дереве Mocha при этом **4**: у reset в title есть `(standard context)` / `(immutable context)`, у Field/Control blur — одинаковый `fullTitle` в обоих прогонах, поэтому в сводке «уникальных» меньше, чем 6.

### Наследие upstream

Отключения **не связаны** с форком `maullerz` и не с Node 22 — это исторические `x*` в оригинальном react-redux-form. Для исследовательской фазы их можно не трогать; цель «0 pending» — отдельная задача (починить или удалить устаревшие спеки).

---

## Структура тестов

| Путь | Назначение |
|------|------------|
| `test/*-spec.js` | 28 файлов — основные спеки |
| `test/spec-setup.js` | jsdom, chai-subset; подключает harness ниже |
| `test/helpers/patch-react-18-test-utils.js` | React 18 + react-redux 7: DOM-query вместо сломанного `TestUtils` |
| `test/helpers/assert-synthetic-event.js` | `SyntheticEvent` / `SyntheticBaseEvent` |
| `test/utils.js` | `testCreateStore`, `testRender`, контексты standard/immutable |
| `test/immutable-*-spec.js` | Отдельные тесты entry `lib/immutable.js` |

Mocha по умолчанию подхватывает все `*.js` в `test/`; `spec-setup.js` подключается только через `--require`, не как спека.

---

## React 18 + react-redux 7 (test harness)

С **react-redux 7** `connect` — function component с hooks. В связке с **React 18**:

- `ReactDOM.render` возвращает `null` (нет instance для `TestUtils`).
- `TestUtils.findRenderedDOMComponentWithTag` не находит DOM внутри hook-`connect`.

Файл [patch-react-18-test-utils.js](./helpers/patch-react-18-test-utils.js) (подключается из `spec-setup.js`):

| Патч | Зачем |
|------|--------|
| `TestUtils.renderIntoDocument` | рендер в detached `div`, stub `{ __rrfContainer }` |
| `ReactDOM.render` | возвращает тот же stub (для спеков с прямым `ReactDOM.render`) |
| `find*` / `scry*` по tag/class | `querySelector(All)` по контейнеру |
| `ReactDOM.createPortal` | detached portal root → append в `body` (тест portal form) |

Контейнеры **не** вешаются на `document.body` при обычном render (иначе сотни узлов от describe-level render ломают radio-тесты).

**devDependencies** форка: `react` / `react-dom` **^18.3.1**, `react-redux` **^7.1.3** — совпадает с peer клиента по major линии RR7.

---

## Полезные команды

```bash
npm run test:watch   # mocha -w
npm run lint         # eslint
```

Запуск одного файла:

```bash
NODE_ENV=test npx mocha --require babel-register --require ./test/spec-setup.js test/control-component-spec.js
```

---

## Связанные документы

- [06-react-upgrade.md](./06-react-upgrade.md) — Node / React в матрице совместимости
- [01-fork-lineage.md](./01-fork-lineage.md) — `engines`, Volta, `prepare`
