# TypeScript Styled Plugin 现代化改造待办

> 状态：实施中
>
> 最后核对：2026-09-15
>
> 范围：`@styled/typescript-styled-plugin`。本项目只交付由 TypeScript Server 同步加载的语言服务插件，不是 VS Code 扩展，也不是独立 LSP server；现代化必须保持 CommonJS `export = init` 入口和 tsserver 宿主兼容性，不能直接照搬扩展的 `vscode` 运行时 API。
>
> 宿主策略：VS Code 工作区 TypeScript 是首要验证环境，但不因此引入 `vscode` 生产依赖或扩展激活逻辑。Visual Studio、Sublime 等仅在实际宿主验证通过后，才可列为正式支持。

## 目标与原则

- [ ] 明确支持的宿主范围：以当前稳定版 TypeScript 与前一个主版本为基础，先验证 VS Code 的工作区 TypeScript；Visual Studio、Sublime 等宿主需分别验证后才列为正式支持。
- [ ] 保持既有能力不回退：补全、补全详情、悬浮、语义诊断、代码修复、折叠、Emmet、插值替换与 `keyframes` 虚拟文档包装。
- [ ] 先建回归安全网，再升级运行时依赖；不把“依赖可安装”当作“语言服务行为兼容”。
- [ ] 采用最小运行时依赖和清晰的发布物；构建、测试、格式化、检查与发布必须在干净的 `yarn install --immutable` 环境可复现。
- [ ] 不在首轮改造中改变插件配置字段或默认语义。配置变更必须有弃用周期与迁移说明。

## 已确认的现状

- [x] 入口为 `src/index.ts`，以 `export =` 导出 TypeScript Server Plugin 工厂；`src/api.ts` 另提供可被其他库消费的 API。
- [x] 核心流程为 `StyledPlugin` -> `typescript-template-language-service-decorator` -> `StyledTemplateLanguageService`；后者将标签模板映射为虚拟 SCSS 文档，再调用 CSS/SCSS 语言服务。
- [x] 插值替换、虚拟文档映射、TypeScript API 转换和 CSS 功能实现目前分散于少量源文件；这是可逐步拆分的良好起点。
- [x] 已有位于 `test/unit` 的单元测试和位于 `test/e2e` 的 `tsserver` 集成测试；补全测试已改为关键候选、过滤项和类型修饰符等语义断言。
- [x] 已切换到 Yarn 4 并使用 `node-modules` 链接器；CI 已使用 Node 24、Corepack、`yarn install --immutable` 和当前 GitHub Actions，但仍缺少统一的 `check`、`test`、发布校验和依赖安全检查入口。
- [x] 已通过 `yarn install --immutable` 验证根 workspace 与 `test/e2e` workspace 可按锁文件安装。

## 架构取舍

### 产品定位与模块格式决策

本仓库的主产品是可由 TypeScript Server 宿主加载的语言服务插件，目标是让兼容 tsserver plugin 加载模型的宿主复用同一套 IntelliSense 能力。VS Code 是首要验证宿主，不是本包的运行时平台。这与仅面向 VS Code 的扩展不同：扩展可使用 Provider API 和 ESM-only 发布物；本仓库不能以牺牲 tsserver 宿主兼容性来换取这些能力。

- [x] 决定优先级：跨 tsserver 宿主兼容性优先于 ESM-only 发布或 VS Code 专有能力。
- [x] 使用 `tsdown` 现代化构建；可复用核心模块可使用 ESM，但 npm 主入口必须保留 tsserver 能同步加载的 CommonJS 兼容桥与 `export = init` 契约。
- [x] 不设置根包的 `"type": "module"`，也不将纯 ESM 文件作为 `main` 或 `typescriptServerPlugins` 的入口；这会使 tsserver 的同步 `require()` 加载失败。
- [ ] 若未来维护 VS Code 扩展，应创建独立包或独立仓库，并仅复用已抽出的 ESM 核心；本包继续保留 CommonJS tsserver 适配层。
- [ ] 若要发布 ESM-only 核心库或独立 LSP/VS Code 产品，应明确其支持范围，不得改变本包的 tsserver 插件加载契约。

### 借鉴 `vscode-yak`，但不照搬

其他编辑器扩展可借鉴的仅是能力分层：模板解析/虚拟文档、补全、诊断、悬浮和代码操作，以及单元测试与宿主集成测试的分层。扩展激活、语法注入、打包 VSIX、`vscode` 依赖和直接注册 Provider 不属于本 npm tsserver 插件的范围。

- [x] 维持 tsserver 主入口的 CommonJS 发布格式，直到 TypeScript Server Plugin 生态明确支持 ESM 加载；不要因构建工具现代化而先改为 ESM-only。
- [x] 保持 `export = init` 插件入口；将可复用逻辑放入具名 ESM 模块，由同步 CommonJS 入口做兼容性边界适配。
- [ ] 以“虚拟 CSS 文档 + 源码偏移映射”为核心内部契约，集中处理位置、范围和编辑映射，避免每个 feature 重复转换。
- [ ] 按功能拆分实现：`template/`、`virtual-document/`、`features/completions`、`features/diagnostics`、`features/hover`、`features/code-actions`、`features/folding`、`configuration/`、`tsserver/`。
- [ ] 为每个功能注入窄接口（例如 CSS language service 的 `Pick` 类型），使单测不依赖真实 tsserver 进程。
- [x] 保留端到端 tsserver 测试作为宿主契约测试；若未来提供 VS Code 扩展，再新增独立包或独立仓库，不把 `vscode` 加进本插件的生产依赖。

## 阶段 0：基线与治理

- [x] 已声明 Yarn 4 与最低 Node 24.20.0 版本；后续可补充 `.nvmrc` 或等效版本文件以方便本地切换。
- [x] 使用支持的 Node LTS 执行 `yarn install --immutable`，确认根 workspace（包含 `test/e2e` 夹具）能从零安装。
- [x] 已建立 `format`、`format:check`、`lint`、`lint:fix`、`compile`、`unit`、`e2e`、`typecheck`、`test` 与串联发布前检查的 `verify` 命令。
- [ ] 执行并记录当前基线：Node/npm/TypeScript 版本、`npm audit`、构建产物文件列表、单测/端到端测试结果、npm 包体积和 `npm pack --dry-run` 清单。
- [ ] 确认 npm 发布权限、包名所有权、双因素认证与维护者名单；发布前不要只依赖历史仓库权限。
- [ ] 明确分支保护：合并必须通过 `verify`，依赖更新走单独 PR，发布由 tag 或 GitHub Release 触发。

验收：全新检出后执行一次安装和 `yarn verify` 即可得到确定结果；基线数据和支持范围记录在贡献文档或本文件的决策记录中。

## 阶段 1：测试先行与兼容矩阵

- [x] 已将单元测试和 tsserver 端到端测试迁移至 Vitest，并保留端到端夹具的串行执行；端到端夹具与用例已迁移为 TypeScript，支持 TypeScript 6 的 `Content-Length` 响应帧。
- [x] 已覆盖 `getSubstitutions` 的主要边界、虚拟文档 offset/position 双向映射与 `keyframes` 包装，以及插值后的诊断和代码修复位置映射。
- [ ] 补充配置合并、补全项转换、悬浮、折叠范围和无效映射边界的单测。
- [ ] 为插值补充尚未覆盖的对象插值和复杂嵌套模板边界；不完整模板继续以 tsserver 编辑态集成测试验证。
- [x] 端到端断言已验证关键项目、编辑范围、诊断代码/位置和无异常；补全测试不再硬编码候选总数。
- [ ] 在端到端夹具中分别使用“最低支持 TypeScript”“当前稳定 TypeScript”“下一主版本/夜ly”运行；夜ly 仅作允许失败的预警任务。
- [ ] 添加插件加载失败、无效配置、无效 TypeScript 版本与配置热更新的端到端覆盖。
- [ ] 为真实 styled-components 常见写法扩充夹具：`styled.div`、`styled(Component)`、`css`、`keyframes`、`createGlobalStyle`、`.extend` 的历史兼容行为及 TSX 文件。
- [ ] 明确 JavaScript/TypeScript/JSX/TSX 是否均为正式支持，并在每种脚本模式至少保留一个端到端案例。

验收：任一核心 feature 的映射算法可用快速单测定位；宿主 API 兼容性问题由 tsserver 端到端测试拦截；上游 CSS 数据更新不会因候选条目数量变化造成无意义失败。

## 阶段 2：依赖处置

### 运行时依赖

| 依赖                                             | 当前声明   | 建议                                                  | 理由与验收                                                                                                                                                                     |
| ------------------------------------------------ | ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typescript`                                     | 仅开发依赖 | 改为 `peerDependencies`，并在开发依赖固定测试版本     | 插件由宿主 TypeScript 加载，运行时 API 必须由宿主提供。声明支持范围并用矩阵验证，避免 npm 安装一份与宿主不同的 TypeScript。                                                    |
| `typescript-template-language-service-decorator` | `^2.3.2`   | 短期保留并固定验证；中期以本地薄适配层替代            | 最新发布仍为 2.3.2（2023-04），依赖 TypeScript 内部语言服务接口，是升级风险最高的边界。先抽象出 `tsserver/decorator-adapter.ts`，测试通过后再评估 fork、替换或自维护最小实现。 |
| `vscode-css-languageservice`                     | `^6.2.11`  | 保留并升级至当前稳定版                                | 核心 CSS/SCSS 解析、补全、诊断、代码操作和折叠来源。逐小版本升级，每次运行完整测试；保留版本上限策略以应对破坏性 API。                                                         |
| `@vscode/emmet-helper`                           | `^2.9.2`   | 保留并升级至当前稳定版                                | 是 Emmet 补全的直接实现，非冗余。添加启用/关闭与典型缩写的回归测试。                                                                                                           |
| `vscode-languageserver-textdocument`             | `^1.0.11`  | 保留并升级，优先使用其标准 `TextDocument.create` 实现 | CSS 服务 API 直接使用该文档模型。重构虚拟文档时移除手写的 `TextDocument` 结构，降低协议兼容风险。                                                                              |
| `vscode-languageserver-types`                    | `^3.17.5`  | 保留为显式直接依赖，随 LSP 依赖族同步升级             | 源码直接引用其 `CompletionList`、`Range`、`Diagnostic` 等类型；不是可删除的纯传递依赖。升级后检查类型重复与版本偏差。                                                          |

### 开发与工具依赖

- [x] 已升级根项目和 `test/e2e` workspace 至 TypeScript `~6.0.2`，并通过初始类型检查；后续以 tsserver 集成测试验证运行时兼容性。
- [x] 已采用 `oxfmt` 和 `oxlint`，并将格式检查接入 CI；当前 9 条非阻断 warning 来自测试夹具和冗余转义，后续单独清理。
- [x] 已移除 ESLint、Prettier 及 `eslint-plugin-prettier`；格式化通过独立 `format:check` 执行。
- [x] 移除未使用的 `glob` 开发依赖；确认没有脚本或测试使用它。
- [x] 已升级 `@types/node` 至 Vitest 所需版本，并移除 Chai、Mocha 及其类型；`yarn.lock` 中的 Chai 仅为 Vitest 的传递依赖。
- [x] 已以独立格式化基线提交前变更应用 `oxfmt`，后续功能改动应避免混入全仓机械格式化。
- [ ] 添加依赖更新机器人（Renovate 或 Dependabot），将运行时依赖、开发工具、GitHub Actions 分组，避免大跨度堆叠升级。

验收：每个保留依赖都有直接职责和回归测试；每个删除依赖都通过 `npm ls`、脚本搜索与干净安装验证；没有未声明但依赖提升安装才能工作的运行时包。

## 阶段 3：实现重构

- [ ] 创建新的内部模块结构，但先通过 re-export 保持 `src/api.ts` 的公开导出不变。
- [ ] 将 `StyledVirtualDocumentFactory` 改为基于标准 `TextDocument.create` 的不可变虚拟文档对象，统一保存前缀长度、源起点和可映射范围。
- [ ] 为 offset/range 映射增加明确的无效范围处理：虚拟包装前后位置、插值掩码位置、文档末尾和多行边界不得映射到源码外。
- [ ] 将补全缓存键改为显式值对象（文件、文档版本/文本、位置、配置）；配置变更时清除缓存，避免旧配置的候选被复用。
- [ ] 将 CSS 和 SCSS 服务初始化、配置更新、Emmet 调用包装为可替换的运行时依赖，消除 feature 类中的全局状态耦合。
- [ ] 检查 `validate: false` 是否实际阻断语义诊断；补足测试并修正不一致行为，作为有记录的 bug fix。
- [ ] 重新审查标签识别策略：当前按标签名工作；决定是否保持兼容、是否新增导入来源识别，以及对 `styled-components` v6、Emotion 等库的明确策略。
- [ ] 为对外 API 加入 API 兼容测试；如果需要破坏性变更，升级主版本并提供迁移说明。
- [ ] 评估性能：在大型模板、多个插值和连续补全请求下记录延迟与内存；仅在基线证明问题后引入缓存或增量解析优化。

验收：模块边界与测试目录对应；行为保持与阶段 1 的快照/端到端契约一致；对 TypeScript 内部行为的依赖必须被隔离、记录并由宿主兼容测试保护。

## 阶段 4：构建、包与 CI

- [x] 使用 `tsdown` 替换 `tsc` 作为构建工具，产出 ESM 核心模块与 tsserver 所需 CommonJS 兼容入口；不将打包工具升级误解为 ESM-only 迁移。
- [x] 已增加 `tsc --noEmit` 的 `typecheck` 命令，避免将类型检查与产物输出绑定。
- [x] 在 `package.json` 添加 `exports`、`types` 和 `files` 的发布清单；`npm pack --dry-run` 已验证 `lib/index.cjs`、声明文件、许可证与 README 均在包内。
- [x] 保留 `src/api.ts` 的独立入口，并通过 `./api` ESM 子路径导出打包产物。
- [x] CI 已更新为当前稳定的 `actions/checkout`、`actions/setup-node`，使用 Corepack、`yarn install --immutable` 和 Yarn 缓存。
- [x] CI 执行 `format:check`、`lint`、`typecheck`、单测、端到端测试和 `npm pack --dry-run`。
- [ ] 添加 TypeScript 版本矩阵与 OS 策略：日常 Linux 必跑，发布前或定期加入 Windows/macOS 端到端验证。
- [ ] 设置发布工作流：tag 驱动、先 `verify`、使用 npm provenance、创建 GitHub Release、自动生成或校验 changelog。
- [ ] 配置 Dependabot/Renovate、CodeQL（适用时）和 `npm audit` 的告警策略；高危生产依赖问题应阻止发布。

验收：CI 与本地 `verify` 使用同一脚本；产物可以在独立临时项目中安装、被 tsserver 发现并完成至少一项补全测试；发布不依赖人工复制构建文件。

## 阶段 5：文档、社区与发布

- [ ] 更新 README 的最低 TypeScript 版本（当前文字仍写“2.4 or later”，而代码检查为主版本 >= 3），补充实际支持矩阵和已验证编辑器。
- [ ] 用当前 VS Code 与其他已验证宿主的文档替换陈旧链接，核实 `tsconfig.json`/`jsconfig.json` 配置结论；不把未验证宿主写入支持范围。
- [ ] 为 `tags`、`validate`、`lint`、`emmet` 提供完整类型、默认值、示例与配置变更说明。
- [ ] 增加 `CONTRIBUTING.md`：环境版本、安装、`verify`、夹具测试、调试 tsserver、变更日志规则与发布流程。
- [ ] 添加 issue/PR 模板：最小复现、宿主与 TypeScript 版本、插件配置、预期/实际诊断或补全内容。
- [ ] 制定语义化版本策略：修复为 patch、功能为 minor、配置/API/最低宿主版本调整为 major；首次现代化发布前写出变更清单。
- [ ] 发布候选版本到 `next` dist-tag，在真实项目及 VS Code 工作区 TypeScript 环境中手工验收；只有已通过对应验证的其他 tsserver 宿主才作为额外发布门槛。

验收：新维护者可仅依靠仓库文档复现测试、定位夹具和发布候选版本；用户能判断自己的编辑器/TypeScript 是否受支持。

## 推荐执行顺序

1. 阶段 0：选定运行时版本与包管理器，完成干净安装和现状基线。
2. 阶段 1：先稳定测试，尤其是虚拟文档映射与 tsserver 端到端行为。
3. 阶段 2：按一类依赖一个变更集的节奏升级；优先 CSS/Emmet/LSP 类型依赖，最后处理模板装饰器和 TypeScript 大版本，并在每次升级后验证 tsserver 宿主契约。
4. 阶段 3：在测试保护下抽取内部边界，并决定是否自维护模板装饰器适配层；不得引入 VS Code 运行时 API。
5. 阶段 4：整理构建、打包、CI 和发布自动化。
6. 阶段 5：同步完成文档、维护流程和 `next` 预发布。

## 首个实施批次

- [ ] 添加 Node/npm 版本约束与统一脚本，不改变运行时代码。
- [ ] 让 `yarn install --immutable && yarn verify` 在本地通过，并修复仅由当前依赖安装方式暴露的问题。
- [x] 添加虚拟文档映射单测；配置开关的单测仍待补充。
- [x] 将端到端补全测试改为语义断言，删除总数断言。
- [ ] 升级 `vscode-css-languageservice`、`@vscode/emmet-helper` 和 LSP 文档/类型依赖到当前稳定版本，逐项验证。
- [ ] 增加打包预检和 Node/TypeScript 兼容矩阵。

完成这一批后再决定是否迁移 Vitest/ESLint 9，以及是否替换 `typescript-template-language-service-decorator`。这两个改动都可能触及测试工具或 tsserver 装饰机制，不应和核心运行时升级捆绑。
