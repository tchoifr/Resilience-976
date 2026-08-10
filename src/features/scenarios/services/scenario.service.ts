import type { Scenario, ScenarioSessionStep } from '../types/scenario'

function shuffle<T>(items: T[]): T[] {
  const shuffled = items.map((item) => item)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    const swapped = shuffled[swapIndex]

    if (current === undefined || swapped === undefined) {
      continue
    }

    shuffled[index] = swapped
    shuffled[swapIndex] = current
  }

  return shuffled
}

// Options carry their own score, unlike the quiz's shuffled option
// indexes: no reverse mapping is needed to know what was picked.
export function buildScenarioSession(scenario: Scenario): ScenarioSessionStep[] {
  return scenario.steps.map((step) => ({
    step,
    options: shuffle(step.options),
  }))
}
