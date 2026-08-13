import type { AssessmentAnswers } from '../types/assessment'
import type { AssessmentDomain, Question } from '../types/question'
import { groupQuestionsByDomain } from './scoring.service'

export interface AnswerSummaryItem {
  questionId: string
  question: string
  answerLabel: string | null
}

export interface AnswerSummaryGroup {
  domain: AssessmentDomain
  items: AnswerSummaryItem[]
  answeredCount: number
}

// Le recapitulatif reprend l'ordre et le decoupage du diagnostic : le visiteur
// doit retrouver ses reponses la ou il les a donnees.
export function buildAnswerSummary(
  questions: Question[],
  answers: AssessmentAnswers,
): AnswerSummaryGroup[] {
  return groupQuestionsByDomain(questions).map((group) => {
    const items = group.questions.map((question) => {
      const chosen = question.answers.find((answer) => answer.id === answers[question.id])

      return {
        questionId: question.id,
        question: question.text,
        // Une reponse enregistree qui ne figure plus dans les options vaut
        // absence de reponse : afficher son identifiant brut n'aiderait pas.
        answerLabel: chosen?.label ?? null,
      }
    })

    return {
      domain: group.domain,
      items,
      answeredCount: items.filter((item) => item.answerLabel !== null).length,
    }
  })
}
