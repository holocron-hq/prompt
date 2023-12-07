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
    // href: string
    index?: number
    type: 'page' | 'h1' | 'h2' | 'h3'
    // parent: number
}
export type VectorAttributes = {
    text: string
    slug: string
}
