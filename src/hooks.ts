import React, { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import useSwr from 'swr'
import MiniSearch from 'minisearch'

import { PagesTree, SearchDataEntry } from './types'
import { debounce, pagesTreeBfs } from './utils'

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
    const initialResults: { hit: SearchDataEntry; terms?: string[] }[] =
        React.useMemo(() => {
            return pagesTreeBfs(pagesTree)
                .filter((x) => x.pageId)
                .slice(0, 10)
                .map((x) => {
                    return {
                        hit: {
                            ...x,
                            name: x.title || x.slug,
                            type: 'page',
                            text: '',
                        },
                        terms: [],
                    }
                })
        }, [pagesTree])
    const [results, setResults] = React.useState(initialResults)
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

        const results = miniSearch
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

        const data = results.map((x) => {
            const hit = searchableItems[x.index]
            return { ...x, terms: [query], hit }
        })
        setResults(data || [])
        return
    }, [query, isLoading, miniSearch, initialResults])

    return { onQueryChange, results, searchableItems }
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
