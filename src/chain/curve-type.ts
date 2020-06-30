/** Supported EOSIO curve types. */
export enum CurveType {
    K1 = 'K1',
    R1 = 'R1',
    WA = 'WA',
}

export namespace CurveType {
    export function indexFor(value: CurveType) {
        switch (value) {
            case CurveType.K1:
                return 0
            case CurveType.R1:
                return 1
            case CurveType.WA:
                return 2
            default:
                throw new Error(`Unknown curve type: ${value}`)
        }
    }
    export function from(value: number | string) {
        let index: number
        if (typeof value !== 'number') {
            index = CurveType.indexFor(value as CurveType)
        } else {
            index = value
        }
        switch (index) {
            case 0:
                return CurveType.K1
            case 1:
                return CurveType.R1
            case 2:
                return CurveType.WA
            default:
                throw new Error('Unknown curve type')
        }
    }
}
