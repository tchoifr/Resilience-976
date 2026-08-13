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

// Un score sur 100 ne dit rien a qui vient de terminer une mise en
// situation : le niveau qualitatif est ce qu'il retient. Le seuil bas est
// formule sans jugement, conformement au ton editorial du site.
export function getScenarioLevel(
  score: number,
): 'toImprove' | 'good' | 'excellent' {
  if (score <= 49) {
    return 'toImprove'
  }

  if (score <= 79) {
    return 'good'
  }

  return 'excellent'
}
