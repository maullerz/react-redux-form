# Форк: происхождение и изменения

## Цепочка наследования

```
davidkpiano/react-redux-form (оригинал, ~2016–2018)
    └── community forks / PR merges
        └── [промежуточный форк с доработками]
            └── maullerz/react-redux-form (текущий)
```

Upstream по сути **не поддерживается**; форк — рабочая база для долгой эксплуатации в СББОЛ.

**Remote:** [`github.com/maullerz/react-redux-form`](https://github.com/maullerz/react-redux-form)  
**Версия в package.json:** `1.16.14` (номер совпадает с npm upstream, **содержимое другое**).

## Коммиты форка (хронология, выборочно)

| SHA | Сообщение | Суть |
|-----|-----------|------|
| `3fe9ec1` | feat: add prepare command | `prepare` → сборка `lib/` + `umd/` при `npm install` из Git |
| `8fb2b7b` | feat: support react 17 | peer React 17 |
| `32bd086` | feat: remove react native support | Удалены native entry |
| `55e834a` | chore: drop node 17 support | engines Node >=18 |
| `da2fc5a` | added React 18 support, fixed tests | ref в `Control`, peer ^18, synthetic event tests |
| `2e9f4ce` | eslint fixes | lint по патчам |
| `84f1669` | upgraded react-redux@7.1.3, fixed tests | dev RR7, test harness, `Form` forwardRef |

Актуальный SHA для клиента — смотреть `package-lock.json` в `dbo-front-copy` или тег команды; пример проверенный: **`84f1669`**.

## Значимые коммиты до форка (уже в кодовой базе)

| SHA | Тема |
|-----|------|
| `3f235c8` | Кэш `getForm`: очистка в `Form.componentDidMount` |
| `7123c34` | `model` как массив в propTypes Control/Field |

## Зависимости runtime

```json
"dependencies": {
  "icepick": "^1.1.0",
  "invariant": "~2.2.1",
  "lodash.get": "~4.4.2",
  "lodash.topath": "~4.5.2",
  "prop-types": "^15.5.6",
  "shallow-compare": "^1.2.1"
}
```

Сборка: **Babel 6** → `lib/` (не в Git), UMD → `umd/ReactReduxForm.min.js`.

## Совместимость со стеком СББОЛ (dbo-front-copy)

| Технология | СББОЛ | Форк | Замечание |
|------------|-------|------|-----------|
| React | 16.14 | peer **^16.14 \|\| ^17 \|\| ^18**; dev 18.3 | [06-react-upgrade.md](./06-react-upgrade.md) |
| react-redux | **7.1.3** | peer **^4 \|\| ^5 \|\| ^7**; dev **^7.1.3** | Проверено в клиенте |
| redux | 4.0.5 | ^3 \|\| ^4 | ok |
| immutable | не в приложении | entry `lib/immutable.js` | Для СББОЛ не используется |

### Подключение в клиенте

**Сейчас (2026-05-29):** Git-зависимость, не npm registry:

```json
"react-redux-form": "github:maullerz/react-redux-form#84f1669"
```

Инструкция: [08-client-install.md](./08-client-install.md).

## Что уже сделано для «долгой жизни»

- **`prepare`** — установка из Git без коммита `lib/`.
- Убран React Native.
- engines Node 18+.
- Кэш `getForm` — fix PR #1218 lineage.
- React 18 + react-redux 7 в тестах и peer.
- `findDOMNode` снят с `Control` (ref).

## Что форк пока не делает (потенциал)

- Нет ESM / modern bundle (только CJS `lib/` + UMD).
- Babel 6 / старый ESLint.
- Legacy `contextTypes` (предупреждения в dev Strict Mode).
- Оптимизации connect-шторма — см. [04-performance-analysis.md](./04-performance-analysis.md), [05-optimization-roadmap.md](./05-optimization-roadmap.md).
