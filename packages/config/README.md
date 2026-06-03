# @caeorta/config

Shared TypeScript, ESLint, and Prettier configuration for the Caeorta monorepo.

## Exports

| Subpath | Use |
|---|---|
| `@caeorta/config/tsconfig/base.json` | Strict TS base. Extend it (compose with framework bases via an `extends` array). |
| `@caeorta/config/eslint` | Full flat ESLint config for plain TS packages. |
| `@caeorta/config/eslint-strict` | Rules-only fragment to layer on framework configs (expo/next) in the apps. |
| `@caeorta/config/prettier` | Shared Prettier config. |

## Usage

`tsconfig.json` (a plain package):

```jsonc
{ "extends": "@caeorta/config/tsconfig/base.json", "compilerOptions": { /* target/module/lib */ } }
```

`tsconfig.json` (an app, composing with its framework base):

```jsonc
{ "extends": ["expo/tsconfig.base", "@caeorta/config/tsconfig/base.json"] }
```

`eslint.config.mjs` (a plain package):

```js
import config from '@caeorta/config/eslint';
export default config;
```

`package.json` (Prettier, anywhere):

```jsonc
{ "prettier": "@caeorta/config/prettier" }
```

The base tsconfig deliberately omits `target`/`module`/`moduleResolution`/`lib`/`jsx` so it can
compose with framework bases (`expo/tsconfig.base`, Next's defaults) without clobbering them.
`noUnusedLocals`/`noUnusedParameters` are left to ESLint, not `tsc`.
