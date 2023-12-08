import { CreateMessage } from 'ai'

export type PagesTree<T = {}> = {
    slug: string
    pageId?: string
    iconUrl?: string
    title?: string

    placeholder?: boolean
    children?: PagesTree<T>[]
} & T

export interface SearchDataEntry {
    slug: string
    text: string
    name: string
    parent?: number
    // href: string
    index?: number
    type: 'page' | 'h1' | 'h2' | 'h3'
    // parent: number
}

export type SearchEndpointBody = {
    messages: CreateMessage[]
    namespace: string
    additionalMessages?: CreateMessage[]
}
