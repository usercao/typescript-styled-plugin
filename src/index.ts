// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import type * as ts from 'typescript/lib/tsserverlibrary.js'

import { TsServerStyledPlugin } from './tsserver/tsserver-plugin.ts'

const createPlugin = (mod: { typescript: typeof ts }) => new TsServerStyledPlugin(mod.typescript)

export { createPlugin as 'module.exports' }
