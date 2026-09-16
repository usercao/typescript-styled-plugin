import ts = require('typescript/lib/tsserverlibrary.js')

declare const createPlugin: (mod: { typescript: typeof ts }) => ts.server.PluginModule

export = createPlugin
