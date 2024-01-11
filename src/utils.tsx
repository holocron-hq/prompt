

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

export function basename(path) {
    return path.split(/[\\/]/).pop()
}
