export interface TranslationDraftEntry {
  id: string
  frenchText: string
  status: 'pending' | 'success' | 'error'
  swahili?: string
  shimaore?: string
  errorText?: string
}
