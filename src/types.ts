import { ModelMessage } from 'ai'

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
}

export interface SearchDataEntry {
    slug: string
    text: string
    name: string
    namespace: string
    parent?: number
    type: 'page' | 'h1' | 'h2' | 'h3'
}

export type SearchEndpointBody =
    | {
          type: 'chat'
          messages: ModelMessage[]
          namespace: string
          additionalMessages?: ModelMessage[]
      }
    | {
          type: 'semantic-search'
          query: string
          namespace: string
      }

export type DialogPosition = {
    width
    left
    top
    right
}
