export interface AskUserQuestionInput {
  question: string
  options?: string[]
  allowCustom?: boolean
}

export interface AskUserQuestionUi {
  input(question: string): Promise<string | null>
  select(question: string, options: string[]): Promise<string | null>
}

export interface AskUserQuestionResult {
  answer: string | null
  mode: "input" | "select" | "custom" | "cancelled"
}

const CUSTOM_OPTION = "Other"

export function createAskUserQuestionTool() {
  return {
    name: "ask_user_question",
    async execute(
      input: AskUserQuestionInput,
      ui: AskUserQuestionUi,
    ): Promise<AskUserQuestionResult> {
      const options = input.options ?? []

      if (options.length === 0) {
        const answer = await ui.input(input.question)
        return answer === null
          ? { answer: null, mode: "cancelled" }
          : { answer, mode: "input" }
      }

      const allowCustom = input.allowCustom ?? true
      const selectOptions = allowCustom ? [...options, CUSTOM_OPTION] : options
      const selected = await ui.select(input.question, selectOptions)

      if (selected === null) {
        return { answer: null, mode: "cancelled" }
      }

      if (allowCustom && selected === CUSTOM_OPTION) {
        const customAnswer = await ui.input("Your answer")
        return customAnswer === null
          ? { answer: null, mode: "cancelled" }
          : { answer: customAnswer, mode: "custom" }
      }

      return { answer: selected, mode: "select" }
    },
  }
}
