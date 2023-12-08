import React, { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import useSwr from 'swr'
import MiniSearch from 'minisearch'

import { PagesTree, SearchDataEntry } from './types'
import {
    debounce,
    deduplicateByKeyFn,
    groupBy,
    mean,
    pagesTreeBfs,
} from './utils'
import { SearchAndChatProps } from './search'

type SearchResult = SearchDataEntry & {
    sections?: SearchDataEntry[]
}

export const promptContext = React.createContext<
    SearchAndChatProps | undefined
>(undefined)

export function usePromptContext() {
    const ctx = React.useContext(promptContext)
    if (!ctx) {
        throw new Error('usePromptContext must be used within a PromptProvider')
    }
    return ctx
}

export function useMiniSearch({
    pagesTree,
    getSearchData,
    searchDataKey,
    isOpen,
}: {
    pagesTree: PagesTree[]
    getSearchData: () => Promise<{
        searchData: SearchDataEntry[]
    }>

    searchDataKey: string
    isOpen: boolean
}) {
    const { data: { miniSearch, searchableItems } = {}, isLoading } = useSwr(
        isOpen ? searchDataKey : null,
        async function loadSearch() {
            const { searchData: searchableItems = [] } = await getSearchData()

            searchableItems.forEach((item, i) => {
                item.index = i
            })
            // console.log('searchableItems', searchableItems)

            let miniSearch = new MiniSearch({
                fields: ['text', 'name'],
                storeFields: ['index'],
                idField: 'index',
            })
            await miniSearch.addAllAsync(searchableItems)

            return { miniSearch, searchableItems }
        },
        {
            // keepPreviousData: true,
        },
    )

    const [query, setQuery] = React.useState('')
    const initialResults: SearchDataEntry[] = React.useMemo(() => {
        return pagesTreeBfs(pagesTree)
            .filter((x) => x.pageId)
            .slice(0, 10)
            .map((x) => {
                return {
                    ...x,
                    name: x.title || x.slug,
                    type: 'page',
                    text: '',
                }
            })
    }, [pagesTree])
    const [results, setResults] = React.useState<SearchResult[]>(initialResults)
    React.useEffect(() => {
        if (!isOpen) {
            setQuery('')
            setResults(initialResults)
        }
    }, [isOpen])

    const onQueryChange = React.useMemo(
        () =>
            debounce((x) => {
                setQuery(x)
            }, 100),
        [],
    )

    React.useEffect(() => {
        if (query.length < 1) {
            setResults(initialResults)
            return
        }
        if (!miniSearch) {
            console.warn('miniSearch not created')
            return
        }

        if (!searchableItems?.length) {
            console.warn('searchData is empty')
            return
        }

        const searchResult = miniSearch
            .search(query, {
                prefix: true,
                fuzzy: 0.15,

                boost: {
                    text: 1,
                    name: 2,
                },
                weights: {
                    fuzzy: 0.5,
                    prefix: 0.25,
                },
                // boostDocument(id, term, doc: any) {
                //     if (doc.type === 'h1') {
                //         return 2
                //     }
                //     if (doc.type === 'h2') {
                //         return 1
                //     }
                //     if (doc.type === 'h3') {
                //         return 1
                //     }
                //     return 1
                // },
            })
            .slice(0, MAX_SEARCH_RESULTS)

        const data = searchResult.map((x) => {
            const hit = searchableItems[x.index]
            const { score } = x
            return { hit, score }
        })
        const grouped = groupBy(data, ({ hit }) => {
            if (hit.type !== 'page') {
                return hit.parent || ''
            } else {
                return ''
            }
        }).flatMap((x, i) => {
            if (!x.key) {
                return x.group.map((item, i) => {
                    return {
                        key: String(-(i + 1)),
                        group: [item],
                    }
                })
            }
            return x
        })
        // console.log('grouped', grouped)

        const sortedGroups = grouped.sort((a, b) => {
            const scoreA = mean(a.group.map((x) => x.score))
            const scoreB = mean(b.group.map((x) => x.score))

            return scoreA < scoreB ? 1 : -1
        })

        let results: SearchResult[] = sortedGroups.flatMap(
            ({ key: parentIndex, group }) => {
                const parent = searchableItems[parseInt(parentIndex)]
                if (!parent) {
                    return group.map((x) => x.hit)
                }
                const sections = group
                    .sort((a, b) => {
                        return a.score < b.score ? 1 : -1
                    })
                    .map((x) => x.hit)

                return {
                    ...parent,
                    sections,
                }
            },
        )
        results = deduplicateByKeyFn(results, (x) => x.slug)
        // console.log('results', results)
        setResults(results)
        return
    }, [query, isLoading, miniSearch, initialResults])

    return { onQueryChange, isLoading, results, searchableItems }
}

export function usePrevious(value) {
    const ref = useRef()
    useEffect(() => {
        ref.current = value
    }, [value])
    return ref.current
}
const MAX_SEARCH_RESULTS = 20

export const useRouteChanged = (callback) => {
    const pathname = usePathname()
    const previous = usePrevious(pathname)
    React.useEffect(() => {
        if (previous && previous !== pathname) {
            callback(pathname)
        }
    }, [pathname, callback])
}
