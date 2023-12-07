import { PagesTree } from './types'

export function pagesTreeBfs<T>(
    tree: PagesTree<T>[],
    stop?: (node: PagesTree<T>, parent?: PagesTree<T>) => boolean,
) {
    if (!tree) {
        return []
    }
    const results: PagesTree<T>[] = []

    var queue = [...tree]

    const visited = new Set()

    if (stop) {
        const firstStopIndex = tree.findIndex((x) => stop(x, undefined))
        if (firstStopIndex !== -1) {
            return tree.slice(0, firstStopIndex + 1)
        }
    }

    while (queue.length > 0) {
        let n = queue.shift()!

        if (visited.has(n)) {
            continue
        }
        visited.add(n)
        results.push(n)

        if (!n.children) {
            continue
        }

        for (var i = 0; i < n.children.length; i++) {
            const child = n.children[i]
            if (!child || visited.has(child)) {
                continue
            }

            if (stop && stop(child, n)) {
                return [...results, child]
            }
            queue.push(child)
        }
    }
    return results
}

export function debounce<T extends Function>(fn: T, delay: number) {
    let timerId
    let lastResult
    return function (...args) {
        clearTimeout(timerId)
        timerId = setTimeout(() => {
            lastResult = fn(...args)
        }, delay)
        return lastResult
    }
}
