# Установка форка в клиенте (Git + prepare)

Как подключить [`maullerz/react-redux-form`](https://github.com/maullerz/react-redux-form) в `dbo-front-copy` без публикации в npm.

## Варианты подключения в клиенте

| Способ | Когда |
|--------|--------|
| **Vendor `vendor/react-redux-form/lib`** (alias, без `package.json` в vendor) | Jenkins без GitHub, только Nexus — **текущий для `dbo-front-copy`** |
| `github:maullerz/react-redux-form#<sha>` | Локальная разработка с доступом к GitHub |
| Nexus npm hosted | Корпоративный registry с публикацией `.tgz` |

### Vendor в репозитории клиента (без package.json в vendor)

1. `vendor/react-redux-form/lib/` — **ESM** (`babel` с `modules: false`), результат `npm run build:lib`; `react-redux-form.d.ts`, `LICENSE`, `README.md` (commit SHA).
2. В `configs/rspack.base.js`: `react-redux-form$` → `vendor/.../lib/index.js` (без alias `react-redux-form/src`).
3. В `tsconfig.json` `paths`: `react-redux-form` → `react-redux-form.d.ts`.
4. Runtime-deps форка в **корневом** `package.json` клиента: `icepick`, `invariant`, `shallow-compare` (+ `prop-types`; `lodash-es` резолвится из клиента для импортов в `lib/`).
5. Зависимость `react-redux-form` из `package.json` клиента **удалена** — Jenkins/Nexus не ходят в GitHub.
6. Публичные импорты только с корня: `import { actions, Form, initialFieldState } from 'react-redux-form'` (без deep-import внутренних путей).

### Git (исторический)

```json
"react-redux-form": "github:maullerz/react-redux-form#<commit-sha>"
```

Рекомендуется **фиксировать полный SHA**, а не плавающий `master`:

```json
"react-redux-form": "github:maullerz/react-redux-form#84f1669"
```

В `package-lock.json` появится resolved вида:

```text
git+ssh://git@github.com/maullerz/react-redux-form.git#84f1669625b0b66688e134840b0be9d66ac8b113
```

После обновления форка: сменить SHA → `rm -rf node_modules/react-redux-form` → `npm install` → закоммитить lockfile.

## Что происходит при `npm install`

1. npm клонирует репозиторий (ветка/commit по ссылке).
2. В каталоге пакета выполняется скрипт **`prepare`** из [package.json](../package.json):

   ```json
   "prepare": "npm run build:lib"
   ```

3. Babel собирает `src/` → **`lib/`** (ESM, `"main": "./lib/index.js"`).

Каталоги **`lib/`** и **`umd/`** в Git **не коммитятся** (см. [.gitignore](../.gitignore)) — это нормально. Без успешного `prepare` клиент получит пакет без `lib/index.js` и сборка упадёт.

### Проверка после install

```bash
test -f node_modules/react-redux-form/lib/index.js && echo OK
npm ls react-redux-form
```

В собранном `lib/components/control-component-factory.js` должны быть патчи React 18 (`mergeRefs`, `getControlRef`), а не `findDOMNode`.

## Peer-зависимости (СББОЛ)

| Пакет | СББОЛ | Форк (peer) |
|-------|-------|-------------|
| react / react-dom | 16.14.0 | ^16.14.0 \|\| ^17 \|\| ^18 |
| react-redux | 7.1.3 | ^4 \|\| ^5 \|\| ^7 |
| redux | 4.0.5 | ^3 \|\| ^4 |

`npm install` в клиенте **без** `--legacy-peer-deps` проходит при корректном lockfile.

## Lodash в `package.json` форка (не путать с клиентом)

В репозитории **форка**, не в `dbo-front-copy`:

| Пакет | `dependencies` | `devDependencies` |
|-------|----------------|---------------------|
| `lodash-es` | **да** — runtime `lib/` | **нет** (дубликат не нужен) |
| `lodash.get`, `lodash.topath` | **нет** | **да** — только для `test/*`, пока тесты не переведены на `lodash-es` |

В **СББОЛ** отдельно ставить `lodash.get` / `lodash.topath` не нужно: в vendored `lib/` уже `import … from 'lodash-es/…'`, бандлер берёт `lodash-es` из корневого `package.json` клиента.

Подробнее: [01-fork-lineage.md](./01-fork-lineage.md) — раздел «Lodash: dependencies vs devDependencies».

## Почему не `file:` и не коммит `lib/` в форк

| Способ | Проблема |
|--------|----------|
| `file:../react-redux-form` | Часто тянет **вложенный** `node_modules` форка (devDeps: React 18, webpack) → rspack резолвит чужие `react-redux` / `core-js` |
| Коммит `lib/` в Git | Дублирование, рассинхрон с `src/`, лишний шум в diff |
| **Git + prepare** | Один артефакт `lib/` на машине разработчика/CI; **нет** nested `node_modules` у пакета, если devDependencies форка не ставятся в дерево клиента |

Проверено на `dbo-front-copy` (2026-05-29): `npm install` → `prepare` → **`npm run rspack:prod`** без ошибок `core-js`; ручная регрессия приложения — без замечаний.

## Типичные сбои

### `lib/index.js` отсутствует

- `prepare` не запустился (корпоративный `.npmrc` с `ignore-scripts=true` — проверить политику).
- Ошибка сборки в форке (нет webpack/babel в devDeps при установке только production — для git-зависимости npm обычно ставит devDeps пакета для `prepare`).

**Лечение:** переустановить пакет; локально в клоне форка: `npm install && npm run build:lib`.

### Старый код в `node_modules` после смены SHA

```bash
rm -rf node_modules/react-redux-form
npm install
```

### Кэш npm

При сомнениях: `npm cache clean --force` и повтор install (редко нужно).

## Отличия от npm `react-redux-form@^1.16.14`

- Тот же номер версии **1.16.14**, другое содержимое: React 17/18 peer, ref в `Control`, `Form` с `forwardRef`, react-redux 7 в тестах форка, без React Native.
- Не путать с пакетом с npmjs — pin только на Git SHA команды.

## Связанные документы

- [REQ-SBBOL-16](./README.md#req-sbbol-16) — требования к релизу SHA для клиента
- [06-react-upgrade.md](./06-react-upgrade.md) — React / react-redux / патчи
- [03-sbbool-integration.md](./03-sbbool-integration.md) — как RRF встроен в приложение
