export function getSrc(state) {
    const {
        parserOpts,
        root,
        sourceFileName,
        sourceMapTarget,
    } = state.file.opts

    let sourceFile =
        sourceMapTarget ||
        sourceFileName ||
        (parserOpts &&
            (parserOpts.sourceMapTarget || parserOpts.sourceFileName))

    if (sourceFile && root) {
        sourceFile = sourceFile.replace(root, '')
    }

    return sourceFile || ''
}
