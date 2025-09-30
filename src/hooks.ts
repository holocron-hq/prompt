import MiniSearch from 'minisearch'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import useSwr from 'swr'

import { SearchAndChatProps } from './search'
import { SearchDataEntry } from './types'
import { debounce, deduplicateByKeyFn, groupBy, mean } from './utils'
import toast from 'react-hot-toast'

export type SearchResult = SearchDataEntry & {
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
    getSearchData,
    searchDataKey,
    isOpen,
    initialResults,
}: {
    getSearchData: () => Promise<{
        searchData: SearchDataEntry[]
    }>
    initialResults: SearchResult[]
    searchDataKey: string
    isOpen: boolean
}) {
    const { data: { miniSearch, searchableItems } = {}, isLoading } = useSwr(
        isOpen ? searchDataKey : null,
        async function loadSearch() {
            const { searchData: searchableItems = [] } = await getSearchData()

            searchableItems.forEach((item, i) => {
                // @ts-ignore
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
                    name: 3,
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
        results = deduplicateByKeyFn(results || [], (x) => x.slug)
        // console.log('results', results)
        setResults(results)
        return
    }, [query, isLoading, miniSearch, initialResults])

    return { onQueryChange, isLoading, results, searchableItems }
}

export function usePrevious(value) {
    const ref = useRef(undefined)
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

export function useThrowingFn({ fn: fnToWrap, successMessage = '' }) {
    const [isLoading, setIsLoading] = useState(false)

    const fn = async function wrappedThrowingFn(...args) {
        try {
            setIsLoading(true)
            const result = await fnToWrap(...args)
            if (result?.skipToast) {
                return result
            }
            if (successMessage) {
                toast.success(successMessage)
            }

            return result
        } catch (err) {
            console.error(err)
            // how to handle unreadable errors? simply don't return them from APIs, just return something went wrong
            if (err instanceof Error && !err?.['skipToast']) {
                toast.error(err.message, {})
                return err
            }
            return err
        } finally {
            setIsLoading(false)
        }
    }

    return {
        isLoading,
        fn,
    }
}

export function useDebouncedEffect(
    effect: React.EffectCallback,
    delay: number,
    deps?: React.DependencyList,
) {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay)
        return () => clearTimeout(handler)
    }, deps)
}

export function useEvent<T extends Function>(handler: T): T {
    // Store the handler in a ref so it can be stable across re-renders
    const handlerRef = useRef(handler)

    // Update the ref each render so it always has the latest handler
    useEffect(() => {
        handlerRef.current = handler
    }, [handler])

    // Return a stable function that calls the latest handler
    return useCallback(
        ((...args) => {
            const currentHandler = handlerRef.current
            if (currentHandler) {
                currentHandler(...args)
            }
        }) as any,
        [],
    ) // Dependencies array is empty to ensure stability
}
