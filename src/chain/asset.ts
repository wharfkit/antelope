import {ABISerializableObject} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'
import {ABIDecoder} from '../serializer/decoder'
import {isInstanceOf} from '../utils'

import {Int64, Int64Type, Name, NameType, UInt64} from '../'

export type AssetType = Asset | string

export class Asset implements ABISerializableObject {
    static abiName = 'asset'

    units: Int64
    symbol: Asset.Symbol

    static from(value: AssetType): Asset
    static from(value: number, symbol: Asset.SymbolType): Asset
    static from(value: AssetType | number, symbol?: Asset.SymbolType) {
        if (isInstanceOf(value, Asset)) {
            return value
        }
        switch (typeof value) {
            case 'number':
                if (!symbol) {
                    throw new Error('Symbol is required when creating Asset from number')
                }
                return this.fromFloat(value, symbol)
            case 'string':
                return this.fromString(value)
            default:
                throw new Error('Invalid asset')
        }
    }

    static fromString(value: string) {
        const parts = (typeof value === 'string' ? value : '').split(' ')
        if (parts.length !== 2) {
            throw new Error('Invalid asset string')
        }
        const amount = parts[0].replace('.', '')
        const precision = (parts[0].split('.')[1] || '').length
        const symbol = Asset.Symbol.fromParts(parts[1], precision)
        return new Asset(Int64.from(amount), symbol)
    }

    static fromFloat(value: number, symbol: Asset.SymbolType) {
        const s = Asset.Symbol.from(symbol)
        return new Asset(s.convertFloat(value), s)
    }

    static fromUnits(value: Int64Type, symbol: Asset.SymbolType) {
        return new Asset(Int64.from(value), Asset.Symbol.from(symbol))
    }

    static fromABI(decoder: ABIDecoder): Asset {
        const units = Int64.fromABI(decoder)
        const symbol = Asset.Symbol.fromABI(decoder)
        return new Asset(units, symbol)
    }

    static abiDefault() {
        return new this(Int64.from(0), Asset.Symbol.abiDefault())
    }

    constructor(units: Int64, symbol: Asset.Symbol) {
        this.units = units
        this.symbol = symbol
    }

    equals(other: AssetType) {
        const {symbol, units} = Asset.from(other)
        return this.symbol.value.equals(symbol.value) && this.units.equals(units)
    }

    get value(): number {
        return this.symbol.convertUnits(this.units)
    }

    set value(newValue: number) {
        this.units = this.symbol.convertFloat(newValue)
    }

    toABI(encoder: ABIEncoder) {
        this.units.toABI(encoder)
        this.symbol.toABI(encoder)
    }

    toString() {
        const digits = this.units.toString().split('')
        let negative = false
        if (digits[0] === '-') {
            negative = true
            digits.shift()
        }
        const p = this.symbol.precision
        while (digits.length <= p) {
            digits.unshift('0')
        }
        if (p > 0) {
            digits.splice(digits.length - p, 0, '.')
        }
        let rv = digits.join('')
        if (negative) {
            rv = '-' + rv
        }
        return rv + ' ' + this.symbol.name
    }

    toJSON() {
        return this.toString()
    }
}

export namespace Asset {
    // eslint-disable-next-line @typescript-eslint/ban-types
    export type SymbolType = Symbol | UInt64 | string
    export class Symbol implements ABISerializableObject {
        static abiName = 'symbol'
        static maxPrecision = 18

        static from(value: SymbolType) {
            if (isInstanceOf(value, Symbol)) {
                return value
            }
            if (isInstanceOf(value, UInt64)) {
                return new Symbol(value)
            }
            const parts = value.split(',')
            if (parts.length !== 2 && value !== '0,') {
                throw new Error('Invalid symbol string')
            }
            if (value === '0,') {
                parts.push('')
            }
            const precision = Number.parseInt(parts[0])
            return Symbol.fromParts(parts[1], precision)
        }

        static fromParts(name: string, precision: number) {
            return new Symbol(toRawSymbol(name, precision))
        }

        // eslint-disable-next-line @typescript-eslint/ban-types
        static fromABI(decoder: ABIDecoder): Symbol {
            return new Symbol(UInt64.fromABI(decoder))
        }

        static abiDefault() {
            return this.from('4,SYS') // CORE_SYMBOL = 4,CORE_SYMBOL_NAME
        }

        value: UInt64

        constructor(value: UInt64) {
            if (toSymbolPrecision(value) > Symbol.maxPrecision) {
                throw new Error('Invalid asset symbol, precision too large')
            }
            if (!value.equals(0) && !SymbolCode.pattern.test(toSymbolName(value))) {
                throw new Error('Invalid asset symbol, name must be uppercase A-Z')
            }
            this.value = value
        }

        equals(other: SymbolType) {
            return this.value.equals(Symbol.from(other).value)
        }

        get name(): string {
            return toSymbolName(this.value)
        }

        get precision(): number {
            return toSymbolPrecision(this.value)
        }

        get code(): SymbolCode {
            return new SymbolCode(UInt64.from(this.value.value.clone().iushrn(8)))
        }

        toABI(encoder: ABIEncoder) {
            this.value.toABI(encoder)
        }

        /**
         * Convert units to floating point number according to symbol precision.
         * @throws If the given units can't be represented in 53 bits.
         **/
        convertUnits(units: Int64): number {
            return units.value.toNumber() / Math.pow(10, this.precision)
        }

        /**
         * Convert floating point to units according to symbol precision.
         * Note that the value will be rounded to closest precision.
         **/
        convertFloat(float: number): Int64 {
            return Int64.from(float.toFixed(this.precision).replace('.', ''))
        }

        toString() {
            return `${this.precision},${this.name}`
        }

        toJSON() {
            return this.toString()
        }
    }

    export type SymbolCodeType = SymbolCode | UInt64 | string | number
    export class SymbolCode implements ABISerializableObject {
        static abiName = 'symbol_code'
        static pattern = /^[A-Z]{0,7}$/

        static from(value: SymbolCodeType) {
            if (isInstanceOf(value, SymbolCode)) {
                return value
            }
            if (typeof value === 'string') {
                value = UInt64.from(toRawSymbolCode(value))
            }
            return new this(UInt64.from(value))
        }

        static fromABI(decoder: ABIDecoder) {
            return new SymbolCode(UInt64.fromABI(decoder))
        }

        static abiDefault() {
            return this.from('SYS') // CORE_SYMBOL_NAME
        }

        value: UInt64

        constructor(value: UInt64) {
            if (!value.equals(0) && !SymbolCode.pattern.test(toSymbolName(value))) {
                throw new Error('Invalid asset symbol, name must be uppercase A-Z')
            }
            this.value = value
        }

        equals(other: SymbolCodeType) {
            return this.value.equals(SymbolCode.from(other).value)
        }

        toABI(encoder: ABIEncoder) {
            this.value.toABI(encoder)
        }

        toString() {
            return charsToSymbolName(this.value.value.toArray('be'))
        }

        toJSON() {
            return this.toString()
        }
    }
}

export type ExtendedAssetType = ExtendedAsset | {quantity: AssetType; contract: NameType}
export class ExtendedAsset implements ABISerializableObject {
    static abiName = 'extended_asset'

    static from(value: ExtendedAssetType) {
        if (isInstanceOf(value, ExtendedAsset)) {
            return value
        }
        return new this(Asset.from(value.quantity), Name.from(value.contract))
    }

    static fromABI(decoder: ABIDecoder) {
        return new ExtendedAsset(Asset.fromABI(decoder), Name.fromABI(decoder))
    }

    quantity: Asset
    contract: Name

    constructor(quantity: Asset, contract: Name) {
        this.quantity = quantity
        this.contract = contract
    }

    equals(other: ExtendedAssetType) {
        return this.quantity.equals(other.quantity) && this.contract.equals(other.contract)
    }

    toABI(encoder: ABIEncoder) {
        this.quantity.toABI(encoder)
        this.contract.toABI(encoder)
    }

    toJSON() {
        return {
            quantity: this.quantity,
            contract: this.contract,
        }
    }
}

export type ExtendedSymbolType = ExtendedSymbol | {sym: Asset.SymbolType; contract: NameType}
export class ExtendedSymbol implements ABISerializableObject {
    static abiName = 'extended_symbol'

    static from(value: ExtendedSymbolType) {
        if (isInstanceOf(value, ExtendedSymbol)) {
            return value
        }
        return new this(Asset.Symbol.from(value.sym), Name.from(value.contract))
    }

    static fromABI(decoder: ABIDecoder) {
        return new ExtendedSymbol(Asset.Symbol.fromABI(decoder), Name.fromABI(decoder))
    }

    sym: Asset.Symbol
    contract: Name

    constructor(sym: Asset.Symbol, contract: Name) {
        this.sym = sym
        this.contract = contract
    }

    equals(other: ExtendedSymbolType) {
        return this.sym.equals(other.sym) && this.contract.equals(other.contract)
    }

    toABI(encoder: ABIEncoder) {
        this.sym.toABI(encoder)
        this.contract.toABI(encoder)
    }

    toJSON() {
        return {
            sym: this.sym,
            contract: this.contract,
        }
    }
}

function toSymbolPrecision(rawSymbol: UInt64) {
    return rawSymbol.value.and(UInt64.from(0xff).value).toNumber()
}

function toSymbolName(rawSymbol: UInt64) {
    const chars = rawSymbol.value.toArray('be').slice(0, -1)
    return charsToSymbolName(chars)
}

function charsToSymbolName(chars: number[]) {
    return chars
        .map((char) => String.fromCharCode(char))
        .reverse()
        .join('')
}

function toRawSymbol(name: string, precision: number) {
    const code = toRawSymbolCode(name)
    const bytes = new Uint8Array(code.length + 1)
    bytes[0] = precision
    bytes.set(code, 1)
    return UInt64.from(bytes)
}

function toRawSymbolCode(name: string) {
    const length = Math.min(name.length, 7)
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        bytes[i] = name.charCodeAt(i)
    }
    return bytes
}
