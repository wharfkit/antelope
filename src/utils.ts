export function arrayEquals(a: ArrayLike<number>, b: ArrayLike<number>) {
    const len = a.length
    if (len !== b.length) {
        return false
    }
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) {
            return false
        }
    }
    return true
}
