# react-redux-form — документация для AI и команды СББОЛ

Документация описывает форк [`maullerz/react-redux-form`](https://github.com/maullerz/react-redux-form) (ветка `master`, v1.16.14) и его роль в клиенте СББОЛ (`dbo-front-copy`). **document-v2 не рассматривается** — предполагается долгосрочное использование текущей модели форм на RRF.

## Цель

- Зафиксировать устройство библиотеки и отличия форка от upstream.
- Описать, как СББОЛ встраивает RRF (редьюсеры, HOC, actions).
- Выделить узкие места производительности и направления оптимизации **в форке и в прикладном коде**.

## Порядок чтения

| # | Файл | Когда читать |
|---|------|----------------|
| 1 | [01-fork-lineage.md](./01-fork-lineage.md) | Нужен контекст форка, коммиты, совместимость со стеком СББОЛ |
| 2 | [02-architecture.md](./02-architecture.md) | Разбор reducers, компонентов, потока `change` / валидации |
| 3 | [03-sbbool-integration.md](./03-sbbool-integration.md) | Как устроен `state.forms`, HOC, `acControls`, кастомные редьюсеры |
| 4 | [04-performance-analysis.md](./04-performance-analysis.md) | Горячие пути, дублирование state, connect-шторм |
| 5 | [05-optimization-roadmap.md](./05-optimization-roadmap.md) | Приоритизированный план работ (форк vs приложение) |
| 6 | [06-react-upgrade.md](./06-react-upgrade.md) | React 17 / 18, react-redux 7, патчи в `src/` |
| 7 | [07-testing.md](./07-testing.md) | `npm test`, Node 22, harness React 18 |
| 8 | [08-client-install.md](./08-client-install.md) | **Git-зависимость**, `prepare`, сборка СББОЛ |

## Связанные репозитории

| Репозиторий | Роль |
|-------------|------|
| `react-redux-form` (этот) | Форк библиотеки, `docs/ai/` |
| `dbo-front-copy` | Основной потребитель: ~250+ файлов с импортом RRF, ~100 форм в `initial-form-states` |
| `admin` | RRF **не используется** |

## Краткие выводы (TL;DR)

1. **Двойное состояние**: для каждого документа в Redux одновременно живут **значения полей** (`state.forms.APPL…`) и **метаданные RRF** (`state.forms.forms.APPL….$form`, вложенные поля с `valid`, `touched`, …). Любой `change` обновляет оба слоя через `combineForms`.
2. **Масштаб**: десятки `*Connected` контролов → каждый `Control` подписан на store; на больших формах это главный источник лишних ререндеров.
3. **Слой СББОЛ**: `createControlConnected` добавляет 4–5 `connect` на поле + серверная валидация — оптимизация только в форке не снимет весь overhead.
4. **Форк**: `prepare` для Git-install, кэш `getForm` сбрасывается в `Form.componentDidMount`, React 18 feasibility, **react-redux 7** в dev тестах.
5. **Тесты форка**: `npm test` на Node 22 — **1307 passing, 6 pending** — [07-testing.md](./07-testing.md).
6. **СББОЛ**: форк подключён через **`github:maullerz/react-redux-form#<sha>`**, `prepare` собирает `lib/`, `rspack:prod` и ручная регрессия — ок (2026-05-29). Детали — [08-client-install.md](./08-client-install.md).

## Решения команды (зафиксировано)

| Тема | Решение |
|------|---------|
| Минимальный React | **16.14.0**; поддержка React **15 снята** |
| React в форке | Peer **16.14 \|\| 17 \|\| 18**; dev-тесты на **18.3.1** |
| react-redux | Peer **^4 \|\| ^5 \|\| ^7**; dev **^7.1.3** (как в СББОЛ) |
| Подключение в `dbo-front-copy` | Git: `github:maullerz/react-redux-form#<commit-sha>`; **`lib/` не в Git** — сборка через `prepare` |
| Репозиторий форка | [`maullerz/react-redux-form`](https://github.com/maullerz/react-redux-form), ветка `master` |
| Эталонные документы | `APPLCREDITSEVENMINUTES`, `PAYMENT_ORDER`, `APPLCOMPLEXSERVICE` |

Подробности: [06-react-upgrade.md](./06-react-upgrade.md), [08-client-install.md](./08-client-install.md).

---

## REQ-SBBOL-16

Обязательные условия для SHA форка в **СББОЛ** (`dbo-front-copy`). Статус на **2026-05-29**.

### REQ-SBBOL-16.0 — Минимальная версия React

- [x] React **15** снят из peer
- [x] Минимум **^16.14.0**; ветки **^17**, **^18** в peer

### REQ-SBBOL-16.1 — Peer и установка в клиенте

- [x] `npm install` в `dbo-front-copy` с `react@16.14` и Git-форком **без** peer conflict (при актуальном lockfile)

### REQ-SBBOL-16.2 — Runtime `src/`

- [x] Код работает на React **16.14** приложения (ручная проверка + rspack)
- [x] Нет API только для React 18 в `src/`

### REQ-SBBOL-16.3 — Тесты форка

- [x] `npm test` на React **18.3.1** + react-redux **7.1.3**: **1307 passing**, 6 pending
- [ ] Отдельный прогон devDependencies на **react@16.14.x** (опционально)

### REQ-SBBOL-16.4 — Патчи Control / Form

- [x] `findDOMNode` → `getControlRef` / `mergeRefs` в `Control`
- [x] `connect(..., { forwardRef: true })` на `Form` (ref снаружи на DOM form)

### REQ-SBBOL-16.5 — Pin в `dbo-front-copy`

- [x] `"react-redux-form": "github:maullerz/react-redux-form#84f1669"` (пример; обновлять SHA при релизах)
- [x] `prepare` → `lib/` + `umd/`; **rspack:prod** успешен
- [x] Ручная регрессия приложения — без выявленных проблем
- [ ] Сверка `utils/react-redux-form/*` с `src/` форка
- [ ] `Error.js`: убрать импорт из `react-redux-form/src/`
- [ ] Формальная регрессия на трёх эталонных документах (чеклист QA)

Целевые `peerDependencies` (в [package.json](../package.json)):

```json
"react": "^16.14.0 || ^17.0.0 || ^18.0.0",
"react-dom": "^16.14.0 || ^17.0.0 || ^18.0.0",
"react-redux": "^4.0.0 || ^5.0.0 || ^7.0.0"
```
