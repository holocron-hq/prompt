import { CreateMessage } from 'ai'

export interface SearchDataEntry {
    slug: string
    text: string
    name: string
    parent?: number
    type: 'page' | 'h1' | 'h2' | 'h3'
}

export type SearchEndpointBody = {
    messages: CreateMessage[]
    namespace: string
    additionalMessages?: CreateMessage[]
}

export type DialogPosition = {
    width
    left
    top
    right
}
