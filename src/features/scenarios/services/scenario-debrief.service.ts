import type { ScenarioChoice, ScenarioOption } from '../types/scenario'

export interface ScenarioDebriefEntry {
  choice: ScenarioChoice
  bestOption: ScenarioOption
  isBest: boolean
}

export interface ScenarioDebrief {
  entries: ScenarioDebriefEntry[]
  goodCount: number
  total: number
}

// Le debrief compare la reponse donnee a la meilleure option de l'etape :
// « votre choix » seul obligeait le visiteur a deviner s'il avait bien fait.
// A egalite de score, la premiere option rencontree fait reference — deux
// options aussi sures ne peuvent pas se departager.
function findBestOption(options: ScenarioOption[]): ScenarioOption | undefined {
  return options.reduce<ScenarioOption | undefined>((best, option) => {
    return !best || option.score > best.score ? option : best
  }, undefined)
}

export function buildScenarioDebrief(choices: ScenarioChoice[]): ScenarioDebrief {
  const entries: ScenarioDebriefEntry[] = []

  for (const choice of choices) {
    const bestOption = findBestOption(choice.step.options)

    if (!bestOption) {
      continue
    }

    entries.push({
      choice,
      bestOption,
      // Le score fait foi, pas l'identifiant : deux options au meme score
      // sont aussi sures l'une que l'autre.
      isBest: choice.selectedOption.score >= bestOption.score,
    })
  }

  return {
    entries,
    goodCount: entries.filter((entry) => entry.isBest).length,
    total: entries.length,
  }
}
