// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import type * as ts from 'typescript/lib/tsserverlibrary'

import { StyledPlugin } from './_plugin'

const init = (mod: { typescript: typeof ts }) => new StyledPlugin(mod.typescript)

export { init as 'module.exports' }
