import { CoreMessage } from 'ai'

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
          messages: CoreMessage[]
          namespace: string
          additionalMessages?: CoreMessage[]
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
