import { LOGGER_API } from './constants'

function getMatcher(matcher, matcherName, defaultMatcher = []) {
    let matcherForRegExp

    if (matcher) {
        const matcherAsArray = Array.isArray(matcher)

        if (matcherAsArray) {
            const validMatcher = matcher
                .filter(Boolean)
                .map((stringMatcher) => `(${stringMatcher})`)

            matcherForRegExp = validMatcher.join('|')
        } else if (typeof matcher === 'string') {
            matcherForRegExp = matcher
        } else {
            throw new Error(
                `[babel-plugin-catch-reporter] '${matcherName}' can be string or array with strings`
            )
        }
    } else {
        matcherForRegExp = defaultMatcher
            .map((stringMatcher) => `(${stringMatcher})`)
            .join('|')
    }

    return new RegExp(matcherForRegExp)
}

function getSourceMatcher() {
    return ['.*js(x)?$']
}

function getSourceExcludeMatcher() {
    return [
        '__fixtures__',
        '__mocks__',
        '__tests__',
        '__snapshots__',
        'node_modules',
    ]
}

function getOutput(settings) {
    const validTypes = ['simple', 'object']
    const options = {
        argsAsObject: false,
        type: 'simple',
    }

    if (settings && typeof settings === 'object') {
        const useType = settings.type
        const isValidType = validTypes.includes(useType)
        if (isValidType) {
            options.type = useType
            options.argsAsObject = settings.argsAsObject === true

            if (useType === 'object') {
                options.source = settings.source || 'source'
                options.name = settings.name || 'name'
                options.args = settings.args || 'args'
            }
        }
    }

    return options
}

export function getOptions(loggingData) {
    const options = {}
    const { name, source, methodName } = loggingData || {}

    options.name = name || LOGGER_API
    if (options.name === LOGGER_API) {
        options.source = ''
    } else {
        options.source = source || ''
    }

    options.methodName = methodName || 'log'

    return { ...loggingData, ...options }
}

export function prepare(receivedOptions) {
    const options = {}

    options.sourceMatcher = getMatcher(
        receivedOptions.sourceMatcher,
        'sourceMatcher',
        getSourceMatcher()
    )

    options.sourceExcludeMatcher = getMatcher(
        receivedOptions.sourceExcludeMatcher,
        'sourceExcludeMatcher',
        getSourceExcludeMatcher()
    )

    options.output = getOutput(receivedOptions.output)
    return { ...options, ...getOptions(receivedOptions) }
}
