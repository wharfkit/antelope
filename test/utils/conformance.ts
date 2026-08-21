import {ABI, Int128, Int32, UInt128, UInt32, UInt64} from '$lib'

export const CASE_TYPE = 'fp_case'

export const NON_OP_ACTIONS = ['fpcase', 'seed', 'version', 'wipe']

export const BINARY_OPS = [
    'add',
    'copysign',
    'div',
    'eq',
    'ge',
    'gt',
    'le',
    'lt',
    'max',
    'min',
    'mul',
    'ne',
    'sub',
    'unord',
]

export const UNARY_OPS = [
    'abs',
    'ceil',
    'echo',
    'floor',
    'nearest',
    'neg',
    'round',
    'sqrt',
    'tofd',
    'tofq',
    'tofs',
    'toil',
    'tois',
    'toix',
    'toul',
    'tous',
    'toux',
    'trunc',
]

export const WIDTHS = ['fd', 'fq', 'fs']

export function opActionNames(abi: ABI): string[] {
    return abi.actions
        .map((action) => String(action.name))
        .filter((name) => !NON_OP_ACTIONS.includes(name))
}

export function caseFieldTypes(abi: ABI): Map<string, string> {
    const found = abi.structs.find((s) => String(s.name) === CASE_TYPE)
    if (!found) throw new Error(`the ABI carries no ${CASE_TYPE} struct`)
    return new Map(found.fields.map((f) => [String(f.name), String(f.type)]))
}

// A read-only op returns a case built from its arguments alone, so id and label stay at their defaults.
export function maskedCase(row: any, abi: ABI): Record<string, unknown> {
    const masked: Record<string, unknown> = {}
    for (const name of caseFieldTypes(abi).keys()) {
        masked[name] = row[name]
    }
    masked.id = 0
    masked.label = ''
    return masked
}

export function precisionFromLabel(label: string): number {
    const match = / p(\d+)$/.exec(label)
    if (!match) throw new Error(`label carries no precision: ${label}`)
    return Number(match[1])
}

// Unsigned from-int operands are stored in the row's signed column as their two's-complement pattern.
function unsignedFrom(value: unknown, bits: number): string {
    return String(BigInt(String(value)) & ((1n << BigInt(bits)) - 1n))
}

// `row` must be a decoded fp_case; objectified rows lose float32 precision and will not round trip.
export function argsFor(row: any): Record<string, unknown> {
    const op = String(row.op)
    if (op === 'fdtoamt') {
        return {v: row.a64, precision: precisionFromLabel(String(row.label))}
    }
    if (op === 'amttofd') {
        return {units: row.ri, precision: precisionFromLabel(String(row.label))}
    }
    const width = op.slice(0, 2)
    const rest = op.slice(2)
    if (!WIDTHS.includes(width)) {
        throw new Error(`op carries no known width prefix: ${op}`)
    }
    if (rest.startsWith('from')) {
        switch (rest) {
            case 'fromis':
                return {a: Int32.from(String(row.ri))}
            case 'fromil':
                return {a: row.ri}
            case 'fromus':
                return {a: UInt32.from(unsignedFrom(row.ri, 32))}
            case 'fromul':
                return {a: UInt64.from(unsignedFrom(row.ri, 64))}
            case 'fromix':
                return {a: Int128.from(String(row.ax))}
            case 'fromux':
                return {a: UInt128.from(unsignedFrom(row.ax, 128))}
            default:
                throw new Error(`unhandled from-int op: ${op}`)
        }
    }
    const a = width === 'fs' ? row.a32 : width === 'fd' ? row.a64 : row.a128
    const b = width === 'fs' ? row.b32 : width === 'fd' ? row.b64 : row.b128
    if (BINARY_OPS.includes(rest)) {
        return {a, b}
    }
    if (UNARY_OPS.includes(rest)) {
        return {a}
    }
    throw new Error(`unhandled op: ${op}`)
}

export function parseFloatText(text: string): number {
    const t = String(text).trim().toLowerCase()
    if (t.endsWith('nan')) return NaN
    if (t === 'inf' || t === 'infinity' || t === '+inf' || t === '+infinity') return Infinity
    if (t === '-inf' || t === '-infinity') return -Infinity
    return Number(t)
}

export function boolText(text: string): string {
    if (text === '1' || text === 'true') return 'true'
    if (text === '0' || text === 'false') return 'false'
    return text
}
