import * as types from '@babel/types'
import {
    isValidPathAndState,
    addLogger,
    getLoggerName,
    getLoggerSource,
} from './utils'
import {
    promiseCatchStatement,
    promiseCatchEnhancer,
    returnStatement,
} from './template'
import { LOGGER_API } from './constants'

const expressionCache = new Set()

export function Program(path, state) {
    if (!state.caught) return
    const validPathAndState = isValidPathAndState(path, state)

    if (validPathAndState) {
        const loggerName = getLoggerName(state)
        const isDefaultLoggerName = loggerName === LOGGER_API
        const loggerWasImported = Boolean(path.scope.bindings[loggerName])

        if (!isDefaultLoggerName && !loggerWasImported) {
            path.unshiftContainer(
                'body',
                types.importDeclaration(
                    [
                        state.babelPluginLoggerSettings.namespaced
                            ? types.importNamespaceSpecifier(
                                  types.identifier(loggerName)
                              )
                            : types.ImportDefaultSpecifier(
                                  types.identifier(loggerName)
                              ),
                    ],
                    types.stringLiteral(getLoggerSource(state))
                )
            )
        }
    }
}

export function CatchClause(path, state) {
    const validPathAndState = isValidPathAndState(path, state)

    if (validPathAndState) {
        addLogger(path, state)
    }
}

function getCalleeName(callee) {
    if (!callee) return
    if (callee.computed) {
        return callee.property.value
    }
    return (callee.property || {}).name
}

function findOutmostCallExp(path) {
    let depth = 0
    const p = path.findParent((p) => {
        depth++
        return types.isCallExpression(p) || depth > 2
    })
    if (depth === 2 && p?.isCallExpression()) {
        return findOutmostCallExp(p)
    }
    return path
}

export function CallExpression(path, state) {
    if (!path.node.loc || !state.babelPluginLoggerSettings.catchPromise) return
    let methodName = getCalleeName(path.node.callee)
    if (methodName === 'then' || methodName === 'catch') {
        state.caught = true
        const callExpressionOutermost = findOutmostCallExp(path)
        if (expressionCache.has(callExpressionOutermost.node)) return
        const outermostName = getCalleeName(callExpressionOutermost.node.callee)
        if (outermostName === 'catch') {
            const catchFn = callExpressionOutermost.node.arguments[0]
            if (!catchFn) return
            let argName
            if (!catchFn.params.length) {
                argName = path.scope.generateUidIdentifier('e')
                catchFn.params.push(argName)
            } else {
                argName = types.identifier(catchFn.params[0].name)
            }
            let fnBody = catchFn.body.body
            if (!fnBody) {
                callExpressionOutermost.get('arguments.0.body').replaceWith(
                    returnStatement({
                        STATEMENT: catchFn.body,
                    })
                )
                fnBody = catchFn.body.body
            }
            callExpressionOutermost.get('arguments.0.body').replaceWith(
                promiseCatchEnhancer({
                    BODY: fnBody,
                    ARGUMENTS: argName,
                    HANDLER: types.memberExpression(
                        types.identifier(state.babelPluginLoggerSettings.name),
                        types.identifier(
                            state.babelPluginLoggerSettings.methodName
                        )
                    ),
                })
            )
            expressionCache.add(callExpressionOutermost.node)
        } else {
            const errorVariableName = path.scope.generateUidIdentifier('e')
            callExpressionOutermost.replaceWith(
                promiseCatchStatement({
                    BODY: callExpressionOutermost.node,
                    ERR: errorVariableName,
                    HANDLER: types.memberExpression(
                        types.identifier(state.babelPluginLoggerSettings.name),
                        types.identifier(
                            state.babelPluginLoggerSettings.methodName
                        )
                    ),
                })
            )
            expressionCache.add(callExpressionOutermost.node)
        }
    }
}
