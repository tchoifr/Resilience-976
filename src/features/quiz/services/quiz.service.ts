import type { QuizQuestion, QuizRisk, QuizSessionItem } from '../types/quiz'

const RISKS: QuizRisk[] = ['cyclone', 'inondation', 'seisme', 'mouvement_terrain']
export const DEFAULT_QUESTIONS_PER_RISK = 2

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

function buildSessionItem(question: QuizQuestion): QuizSessionItem {
  const shuffledIndexes = shuffle(question.options.map((_, index) => index))
  const options = shuffledIndexes
    .map((index) => question.options[index])
    .filter((option): option is string => option !== undefined)

  return {
    question,
    options,
    correctOptionIndex: shuffledIndexes.indexOf(question.correctOptionIndex),
  }
}

// Draws a balanced, randomized session: an equal share per risk (so a single
// risk can't dominate the draw) with the option order also shuffled, so the
// correct answer's position never becomes a pattern across a session.
export function drawQuizSession(
  questions: QuizQuestion[],
  questionsPerRisk: number = DEFAULT_QUESTIONS_PER_RISK,
): QuizSessionItem[] {
  const drawn = RISKS.flatMap((risk) =>
    shuffle(questions.filter((question) => question.risk === risk)).slice(0, questionsPerRisk),
  )

  return shuffle(drawn).map(buildSessionItem)
}
