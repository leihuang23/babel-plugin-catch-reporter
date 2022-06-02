import { prepare } from './options'

export function pre() {
    this.babelPluginLoggerSettings = prepare(this.opts)
}

export function post() {
    this.babelPluginLoggerSettings = undefined
}
