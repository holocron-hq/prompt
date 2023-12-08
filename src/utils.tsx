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

export function groupBy<T>(arr: T[], key: (x: T) => string | number) {
    const grouped = arr.reduce((acc, x) => {
        const k = key(x)
        if (!acc[k]) {
            acc[k] = []
        }
        acc[k].push(x)
        return acc
    }, {} as Record<string, T[]>)
    return Object.entries(grouped).map(([k, v]) => {
        return { key: k, group: v }
    })
}

export function mean(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function deduplicateByKeyFn<T>(arr: T[], key: (k: T) => string) {
    const set = new Set<string>()
    const res: T[] = []
    for (let x of arr) {
        if (set.has(key(x))) {
            continue
        }
        set.add(key(x))
        res.push(x)
    }
    return res
}
