import {isInstanceOf} from '../utils'

import {Name, NameType} from '../'

export type ABIDef = string | Partial<ABI.Def> | ABI

export class ABI {
    static __className = 'ABI'
    static version = 'eosio::abi/1.1'

    version: string
    /// List of type aliases.
    types: ABI.TypeDef[]
    /// List of variant types.
    variants: ABI.Variant[]
    /// List of struct types.
    structs: ABI.Struct[]
    /// List of contract actions.
    actions: ABI.Action[]
    /// List of contract tables.
    tables: ABI.Table[]
    /// Ricardian contracts.
    ricardian_clauses: ABI.Clause[]

    constructor(args: Partial<ABI.Def>) {
        this.version = args.version || ABI.version
        this.types = args.types || []
        this.variants = args.variants || []
        this.structs = args.structs || []
        this.actions = args.actions || []
        this.tables = args.tables || []
        this.ricardian_clauses = args.ricardian_clauses || []
    }

    static from(value: ABIDef) {
        if (isInstanceOf(value, ABI)) {
            return value
        }
        if (typeof value === 'string') {
            return new ABI(JSON.parse(value))
        }
        return new ABI(value)
    }

    resolveType(name: string): ABI.ResolvedType {
        const types: {[name: string]: ABI.ResolvedType} = {}
        return this.resolve({name, types}, {id: 0})
    }

    resolveAll() {
        const types: {[name: string]: ABI.ResolvedType} = {}
        const ctx: {id: number} = {id: 0}
        return {
            types: this.types.map((t) => this.resolve({name: t.new_type_name, types}, ctx)),
            variants: this.variants.map((t) => this.resolve({name: t.name, types}, ctx)),
            structs: this.structs.map((t) => this.resolve({name: t.name, types}, ctx)),
        }
    }

    private resolve(
        {name, types}: {name: string; types: {[name: string]: ABI.ResolvedType}},
        ctx: {id: number}
    ): ABI.ResolvedType {
        const existing = types[name]
        if (existing) {
            return existing
        }
        const type = new ABI.ResolvedType(name, ++ctx.id)
        types[type.typeName] = type
        const alias = this.types.find((typeDef) => typeDef.new_type_name == type.name)
        if (alias) {
            type.ref = this.resolve({name: alias.type, types}, ctx)
            return type
        }
        const struct = this.getStruct(type.name)
        if (struct) {
            if (struct.base) {
                type.base = this.resolve({name: struct.base, types}, ctx)
            }
            type.fields = struct.fields.map((field) => {
                return {
                    name: field.name,
                    type: this.resolve({name: field.type, types}, ctx),
                }
            })
            return type
        }
        const variant = this.getVariant(type.name)
        if (variant) {
            type.variant = variant.types.map((name) => this.resolve({name, types}, ctx))
            return type
        }
        // builtin or unknown type
        return type
    }

    getStruct(name: string): ABI.Struct | undefined {
        return this.structs.find((struct) => struct.name == name)
    }

    getVariant(name: string): ABI.Variant | undefined {
        return this.variants.find((variant) => variant.name == name)
    }

    /** Return arguments type of an action in this ABI. */
    getActionType(actionName: NameType): string | undefined {
        const name = Name.from(actionName).toString()
        const action = this.actions.find((a) => a.name.toString() === name)
        if (action) {
            return action.type
        }
    }
}

export namespace ABI {
    export interface TypeDef {
        new_type_name: string
        type: string
    }
    export interface Field {
        name: string
        type: string
    }
    export interface Struct {
        name: string
        base: string
        fields: Field[]
    }
    export interface Action {
        name: NameType
        type: string
        ricardian_contract: string
    }
    export interface Table {
        name: NameType
        index_type: string
        key_names: string[]
        key_types: string[]
        type: string
    }
    export interface Clause {
        id: string
        body: string
    }
    export interface Variant {
        name: string
        types: string[]
    }
    export interface Def {
        version: string
        types: TypeDef[]
        variants: Variant[]
        structs: Struct[]
        actions: Action[]
        tables: Table[]
        ricardian_clauses: Clause[]
    }
    export class ResolvedType {
        name: string
        id: number
        isArray: boolean
        isOptional: boolean
        isExtension: boolean

        base?: ResolvedType
        fields?: {name: string; type: ResolvedType}[]
        variant?: ResolvedType[]
        ref?: ResolvedType

        constructor(fullName: string, id = 0) {
            let name = fullName
            if (name.endsWith('$')) {
                name = name.slice(0, -1)
                this.isExtension = true
            } else {
                this.isExtension = false
            }
            if (name.endsWith('?')) {
                name = name.slice(0, -1)
                this.isOptional = true
            } else {
                this.isOptional = false
            }
            if (name.endsWith('[]')) {
                name = name.slice(0, -2)
                this.isArray = true
            } else {
                this.isArray = false
            }
            this.id = id
            this.name = name
        }

        /**
         * Type name including suffixes: [] array, ? optional, $ binary ext
         */
        get typeName(): string {
            let rv = this.name
            if (this.isArray) {
                rv += '[]'
            }
            if (this.isOptional) {
                rv += '?'
            }
            if (this.isExtension) {
                rv += '$'
            }
            return rv
        }

        /** All fields including base struct(s), undefined if not a struct type. */
        get allFields() {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            let current: ResolvedType | undefined = this
            const rv: {name: string; type: ResolvedType}[] = []
            const seen = new Set<string>()
            do {
                if (!current.fields) {
                    return // invalid struct
                }
                if (seen.has(current.name)) {
                    return // circular ref
                }
                for (let i = current.fields.length - 1; i >= 0; i--) {
                    rv.unshift(current.fields[i])
                }
                seen.add(current.name)
                current = current.base
            } while (current !== undefined)
            return rv
        }
    }
}
