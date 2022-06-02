# babel-plugin-catch-reporter

A babel plugin that:

1. Add catch clause to your Promise if you forget to do so.
2. Add a logger to all catch clauses, whether it's a catch block or a promise `.catch()` function call.
3. Automatically import the logging service when needed.

## Config:

-   `name: string` - The name of the your logging service.
-   `source: string` - The import path name of your logging service.
-   `methodName: string` - Which logging method to invoke.
-   `catchPromise: boolean` - Whether to catch promises.
-   `namespaced: boolean` - Whether to import the logging service as a namespace module.

## Demo

`.babelrc.json`

```json
{
    "plugins": [
        [
            "babel-plugin-catch-reporter",
            {
                "name": "Sentry",
                "source": "@sentry/node",
                "methodName": "captureException",
                "catchPromise": true,
                "namespaced": true
            }
        ]
    ]
}
```

`src/foo.js`

```js
export function noop() {
    try {
        return nonexistent
    } catch (ignore) {
        // console.log(ignore);
    }
}

export function bar() {
    return fetch('https://google.com').json().then(console.log)
}

export function baz() {
    return fetch('https://google.com')
        .json()
        .then(console.log)
        .catch((e) => {
            console.error(e)
        })
}
```

gets compiled to:

```js
import * as Sentry from '@sentry/node'
export function noop() {
    try {
        return nonexistent
    } catch (ignore) {
        // console.log(ignore);

        Sentry.captureException(ignore)
    }
}
export function bar() {
    return fetch('https://google.com')
        .json()
        .then(console.log)
        .catch(function (_e) {
            Sentry.captureException(_e)
        })
}
export function baz() {
    return fetch('https://google.com')
        .json()
        .then(console.log)
        .catch((e) => {
            Sentry.captureException(e)
            console.error(e)
        })
}
```

`src/bar.js`

```js
fetch().json().then(console.log)
```

gets compiled to:

```js
import * as Sentry from '@sentry/node'
fetch()
    .json()
    .then(console.log)
    .catch(function (_e) {
        Sentry.captureException(_e)
    })
```
