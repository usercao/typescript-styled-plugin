import { Bench } from 'tinybench'

import {
  createTemplateContext,
  createTemplateLanguageService,
} from './template-language-service-fixture.ts'

const largeTemplate = createLargeTemplate(400)
const interpolatedTemplate = createInterpolatedTemplate(120)
const cachedContext = createTemplateContext(largeTemplate)
const cachedService = createTemplateLanguageService()
const cachedPosition = cachedContext.toPosition(largeTemplate.length)

cachedService.getCompletionsAtPosition(cachedContext, cachedPosition)

const benchmark = new Bench({
  iterations: 20,
  time: 1_000,
  warmupIterations: 5,
  warmupTime: 250,
})

benchmark
  .add('completes a large template', () => {
    const context = createTemplateContext(largeTemplate)
    const service = createTemplateLanguageService()
    service.getCompletionsAtPosition(context, context.toPosition(largeTemplate.length))
  })
  .add('completes a template with many interpolations', () => {
    const context = createTemplateContext(interpolatedTemplate)
    const service = createTemplateLanguageService()
    service.getCompletionsAtPosition(context, context.toPosition(interpolatedTemplate.length))
  })
  .add('reuses completions at the same position', () => {
    cachedService.getCompletionsAtPosition(cachedContext, cachedPosition)
  })

void main()

async function main() {
  collectGarbage()
  const heapBefore = process.memoryUsage().heapUsed
  await benchmark.run()
  collectGarbage()
  const heapAfter = process.memoryUsage().heapUsed

  for (const task of benchmark.tasks) {
    const result = task.result
    if (!result || result.state !== 'completed') {
      throw new Error(`Benchmark did not complete for ${task.name}.`)
    }

    console.log(
      `${task.name}: ${formatMilliseconds(result.latency.mean)} mean, ${formatNumber(result.throughput.mean)} ops/s`,
    )
  }

  console.log(`Retained heap delta: ${formatMegabytes(heapAfter - heapBefore)} MB`)
}

function createLargeTemplate(ruleCount: number): string {
  return (
    Array.from(
      { length: ruleCount },
      (_, index) => `.rule-${index} { color: red; margin: 0; padding: 0; }`,
    ).join('\n') + '\ncolor:'
  )
}

function createInterpolatedTemplate(interpolationCount: number): string {
  return (
    Array.from(
      { length: interpolationCount },
      (_, index) => `.rule-${index} { color: \${value${index}}; margin: \${space${index}}; }`,
    ).join('\n') + '\ncolor:'
  )
}

function formatMilliseconds(milliseconds: number): string {
  return `${milliseconds.toFixed(3)} ms`
}

function formatMegabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2)
}

function formatNumber(value: number): string {
  return value.toFixed(0)
}

function collectGarbage() {
  const garbageCollector = (globalThis as typeof globalThis & { gc?: () => void }).gc
  garbageCollector?.()
}
