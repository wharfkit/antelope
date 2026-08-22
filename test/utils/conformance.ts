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

const TWO_53 = 1n << 53n

function signedZero(result: number, input: number) {
    return result === 0 && (input < 0 || Object.is(input, -0)) ? -0 : result
}

function roundHalfEven(x: number) {
    if (!Number.isFinite(x) || Math.abs(x) >= 2 ** 52) return x
    const floor = Math.floor(x)
    const diff = x - floor
    let r = floor
    if (diff > 0.5 || (diff === 0.5 && floor % 2 !== 0)) r = floor + 1
    return signedZero(r, x)
}

function roundHalfAway(x: number) {
    if (!Number.isFinite(x) || Math.abs(x) >= 2 ** 52) return x
    const t = Math.trunc(x)
    const r = Math.abs(x - t) >= 0.5 ? t + Math.sign(x) : t
    return signedZero(r, x)
}

function fmin(a: number, b: number) {
    if (Number.isNaN(a)) return b
    if (Number.isNaN(b)) return a
    return Math.min(a, b)
}

function fmax(a: number, b: number) {
    if (Number.isNaN(a)) return b
    if (Number.isNaN(b)) return a
    return Math.max(a, b)
}

function copysign(a: number, b: number) {
    const negative = b < 0 || Object.is(b, -0) || (Number.isNaN(b) && Object.is(Math.sign(b), -0))
    return negative ? -Math.abs(a) : Math.abs(a)
}

function bigIntToFloat64(v: bigint) {
    return Number(v)
}

// Number() then fround would round twice; values beyond 2^53 need a single rounding to 24 bits.
function bigIntToFloat32(v: bigint) {
    const mag = v < 0n ? -v : v
    if (mag < TWO_53) return Math.fround(Number(v))
    const bits = mag.toString(2).length
    const shift = BigInt(bits - 24)
    let mant = mag >> shift
    const rem = mag & ((1n << shift) - 1n)
    const half = 1n << (shift - 1n)
    if (rem > half || (rem === half && (mant & 1n) === 1n)) mant += 1n
    const result = Number(mant) * 2 ** Number(shift)
    return v < 0n ? -result : result
}

function truncToBigInt(x: number) {
    return BigInt(Math.trunc(x))
}

function signedWrap(v: bigint, bits: number) {
    return BigInt.asIntN(bits, v)
}

const FQ_BLOCK_START = 1898

export interface Recomputed {
    field: string
    value: number | bigint | boolean
}

// Mirrors the contract's fs/fd switch; ops at or above the float128 block have no JS equivalent.
export function recompute(row: any): Recomputed | undefined {
    if (Number(row.id) >= FQ_BLOCK_START) return undefined
    const op = String(row.op)
    const ri = BigInt(String(row.ri))
    const ax = BigInt(String(row.ax))
    if (op === 'fdtoamt') {
        const scaled = row.a64.value * 10 ** precisionFromLabel(String(row.label))
        return {field: 'r64', value: roundHalfAway(scaled)}
    }
    if (op === 'amttofd') {
        let divisor = 1
        for (let i = 0; i < precisionFromLabel(String(row.label)); i++) divisor *= 10
        return {field: 'r64', value: Number(ri) / divisor}
    }
    const width = op.slice(0, 2)
    const rest = op.slice(2)
    const single = width === 'fs'
    const narrow = single ? Math.fround : (x: number) => x
    const field = single ? 'r32' : 'r64'
    const a = (single ? row.a32 : row.a64).value
    const b = (single ? row.b32 : row.b64).value
    switch (rest) {
        case 'echo':
            return {field, value: a}
        case 'add':
            return {field, value: narrow(a + b)}
        case 'sub':
            return {field, value: narrow(a - b)}
        case 'mul':
            return {field, value: narrow(a * b)}
        case 'div':
            return {field, value: narrow(a / b)}
        case 'min':
            return {field, value: fmin(a, b)}
        case 'max':
            return {field, value: fmax(a, b)}
        case 'copysign':
            return {field, value: copysign(a, b)}
        case 'floor':
            return {field, value: Math.floor(a)}
        case 'ceil':
            return {field, value: Math.ceil(a)}
        case 'trunc':
            return {field, value: Math.trunc(a)}
        case 'nearest':
            return {field, value: roundHalfEven(a)}
        case 'round':
            return {field, value: roundHalfAway(a)}
        case 'sqrt':
            return {field, value: narrow(Math.sqrt(a))}
        case 'neg':
            return {field, value: -a}
        case 'abs':
            return {field, value: Math.abs(a)}
        case 'eq':
            return {field: 'rb', value: a === b}
        case 'ne':
            return {field: 'rb', value: a !== b}
        case 'lt':
            return {field: 'rb', value: a < b}
        case 'le':
            return {field: 'rb', value: a <= b}
        case 'gt':
            return {field: 'rb', value: a > b}
        case 'ge':
            return {field: 'rb', value: a >= b}
        case 'tofd':
            return {field: 'r64', value: a}
        case 'tofs':
            return {field: 'r32', value: Math.fround(a)}
        case 'tois':
            return {field: 'ri', value: signedWrap(truncToBigInt(a), 32)}
        case 'tous':
            return {field: 'ri', value: BigInt.asUintN(32, truncToBigInt(a))}
        case 'toil':
            return {field: 'ri', value: signedWrap(truncToBigInt(a), 64)}
        case 'toul':
            return {field: 'ri', value: signedWrap(BigInt.asUintN(64, truncToBigInt(a)), 64)}
        case 'toix':
            return {field: 'rx', value: signedWrap(truncToBigInt(a), 128)}
        case 'toux':
            return {field: 'rx', value: signedWrap(BigInt.asUintN(128, truncToBigInt(a)), 128)}
        case 'fromis':
            return {field, value: (single ? bigIntToFloat32 : bigIntToFloat64)(signedWrap(ri, 32))}
        case 'fromus':
            return {
                field,
                value: (single ? bigIntToFloat32 : bigIntToFloat64)(BigInt.asUintN(32, ri)),
            }
        case 'fromil':
            return {field, value: (single ? bigIntToFloat32 : bigIntToFloat64)(ri)}
        case 'fromul':
            return {
                field,
                value: (single ? bigIntToFloat32 : bigIntToFloat64)(BigInt.asUintN(64, ri)),
            }
        case 'fromix':
            return {field, value: bigIntToFloat64(ax)}
        case 'fromux':
            return {field, value: bigIntToFloat64(BigInt.asUintN(128, ax))}
        default:
            throw new Error(`unhandled op: ${op}`)
    }
}
