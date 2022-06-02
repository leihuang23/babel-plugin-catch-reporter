import * as types from '@babel/types'
import { getArgs } from './arguments'
import { getSrc } from './source-file'
import { MEMBER_EXPRESSION_CATCH } from './constants'

function hasLogging(bodyNode, state) {
    const isExpressionStatement = types.isExpressionStatement(bodyNode)

    if (!isExpressionStatement) {
        return false
    }

    const expression = bodyNode.expression
    const isCallExpression = types.isCallExpression(expression)

    if (!isCallExpression) {
        return false
    }

    const callee = expression.callee
    const isMemberExpression = types.isMemberExpression(callee)

    if (!isMemberExpression) {
        return false
    }

    const calleeObject = callee.object
    const isIdentifier = types.isIdentifier(calleeObject)

    if (!isIdentifier) {
        return false
    }

    const loggerName = getLoggerName(state)

    return calleeObject.name === loggerName
}

function canBeAdded(path, state) {
    const isBlockStatement = types.isBlockStatement(path)

    if (!isBlockStatement) {
        return false
    }

    const blockBody = path.node.body

    const foundLogger = blockBody.find((bodyNode) =>
        hasLogging(bodyNode, state)
    )

    return !foundLogger
}

function getPathForInsert(path) {
    const insertPath = path.get('body')

    const isBlockStatement = types.isBlockStatement(insertPath)

    if (isBlockStatement) {
        return insertPath
    }

    const isArrowFunctionExpression = types.isArrowFunctionExpression(
        insertPath
    )

    if (isArrowFunctionExpression) {
        return getPathForInsert(insertPath)
    }

    return undefined
}

function getLocation(path) {
    const { loc: { start: { column, line } = {} } = {} } = path.node || {}

    return {
        column,
        line,
    }
}

function getName(path) {
    const isCatchClause = types.isCatchClause(path)

    if (isCatchClause) {
        return 'catchClause'
    }

    const { container = {}, node = {}, parent = {} } = path

    if (node.id) {
        return node.id.name
    }

    if (container.id) {
        return container.id.name
    }

    if (parent.left && parent.left.property) {
        return parent.left.property.name
    }

    if (parent.left && parent.left.name) {
        return parent.left.name
    }

    const { key: nodeKey = {} } = node

    if (nodeKey && nodeKey.name) {
        return nodeKey.name
    }

    const { key: parentKey = {} } = parent

    if (parentKey && parentKey.name) {
        return parentKey.name
    }

    const { callee: { property } = {} } = parent

    if (property && property.name === 'catch') {
        return MEMBER_EXPRESSION_CATCH
    }

    if (path.inList && Number.isInteger(path.key)) {
        return `array-item-${path.key}`
    }

    return undefined
}

function insertLogging(path, insertPath, state, partialData) {
    const source = getSrc(state)
    const knownData = {
        column: partialData.column,
        line: partialData.line,
        name: partialData.name,
        source,
    }

    const methodName = state.babelPluginLoggerSettings.methodName
    if (methodName) {
        insertPath.unshiftContainer(
            'body',
            types.expressionStatement(
                types.callExpression(
                    types.memberExpression(
                        types.identifier(getLoggerName(state)),
                        types.identifier(methodName)
                    ),
                    getArgs(path, state, knownData)
                )
            )
        )
    }
}

export function getLoggerName(state) {
    return state.babelPluginLoggerSettings.name
}

export function getLoggerSource(state) {
    return state.babelPluginLoggerSettings.source
}

export function isValidPathAndState(path, state) {
    if (path.node._generated) {
        return false
    }

    const { filename } = state.file.opts

    const {
        sourceMatcher,
        sourceExcludeMatcher,
    } = state.babelPluginLoggerSettings

    const allowFromSource = sourceMatcher.test(filename)
    if (!allowFromSource) {
        return false
    }

    const excludeFromSource = sourceExcludeMatcher.test(filename)

    return !excludeFromSource
}

export function addLogger(path, state) {
    const name = getName(path)

    if (!name) {
        return false
    }

    const insertPath = getPathForInsert(path)

    if (!insertPath) {
        return false
    }

    const { column, line } = getLocation(insertPath)

    const sourceCode = column !== undefined && line !== undefined

    if (!sourceCode) {
        return false
    }

    const loggerCanBeAdded = canBeAdded(insertPath, state)

    if (loggerCanBeAdded) {
        insertLogging(path, insertPath, state, {
            column,
            line,
            name,
        })
        state.caught = true
        return true
    }

    return false
}
