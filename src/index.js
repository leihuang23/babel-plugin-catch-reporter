import { declare } from '@babel/helper-plugin-utils'

import { pre, post } from './setup'
import { Program, CatchClause, CallExpression } from './visitors'

function babelPluginAutoReportError(api) {
    api.assertVersion(7)

    return {
        name: 'babel-plugin-catch-reporter',
        post,
        pre,
        visitor: {
            CatchClause,
            Program: { exit: Program },
            CallExpression,
        },
    }
}

export default declare(babelPluginAutoReportError)
