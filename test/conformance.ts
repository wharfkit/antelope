import {assert} from 'chai'

import {MockProvider} from './utils/mock-provider'
import {
    argsFor,
    boolText,
    CASE_TYPE,
    caseFieldTypes,
    maskedCase,
    parseFloatText,
    recompute,
} from './utils/conformance'

import {
    ABI,
    Action,
    APIClient,
    Float128,
    Float32,
    Float64,
    Int128,
    Int64,
    Serializer,
    Transaction,
    UInt64,
} from '$lib'

type Row = Record<string, any>

const ACCOUNT = 'conform.gm'
const NODE_VERSION = 'v1.1.5'
const GRID_SIZE = 2333
const FQ_START = 1804
const ACTION_COUNT = 100
const PAGE_SIZE = 500
const BATCH_SIZE = 25
const RECOMPUTED_ROWS = 1898
const NAN_RESULT_ROWS = 74
const POSITIVE_NAN_ROWS = 40

const EXPECTED = {
    binary: 0,
    exact: 0,
    index: 0,
    format: 15485,
    lossy: 260,
}

const provider = new MockProvider()
provider.setContext('conformance')
const client = new APIClient({provider})

const api = new APIClient({provider: new MockProvider()})

let abi: ABI
let types: Map<string, string>
let floatFields: Set<string>
let jsonRows: Row[]
let hexRows: string[]
let decodedRows: Row[]

function readOnlyTransaction(actions: Action[]) {
    return Transaction.from({
        ref_block_num: 0,
        ref_block_prefix: 0,
        expiration: 0,
        actions,
    })
}

async function sendReadOnly(actions: Action[]): Promise<string[]> {
    const res: any = await client.v1.chain.send_read_only_transaction(readOnlyTransaction(actions))
    assert.notExists(res.processed.except, JSON.stringify(res.processed.except))
    const traces = res.processed.action_traces
    assert.equal(traces.length, actions.length)
    return traces.map((trace: any) => String(trace.return_value_hex_data).toLowerCase())
}

async function fetchAll(json: boolean): Promise<any[]> {
    const collected: any[] = []
    let lower = UInt64.from(0)
    for (;;) {
        const res: any = await client.v1.chain.get_table_rows({
            code: ACCOUNT,
            scope: ACCOUNT,
            table: 'fpcases',
            key_type: 'i64',
            lower_bound: lower,
            limit: PAGE_SIZE,
            json,
        } as any)
        collected.push(...res.rows)
        if (!res.more || !res.next_key) break
        lower = UInt64.from(res.next_key)
    }
    return collected
}

function indexQuery(params: Record<string, unknown>) {
    return client.v1.chain.get_table_rows({
        code: ACCOUNT,
        scope: ACCOUNT,
        table: 'fpcases',
        json: true,
        limit: 5,
        ...params,
    } as any)
}

function where(row: Row) {
    return `id=${row.id} op=${row.op} label="${row.label}"`
}

// The node renders through fc %.17f, so a chain text that loses digits is std::fixed of the SDK value.
function isLossyChainText(chainText: string, sdkValue: number) {
    return sdkValue.toFixed(17) === chainText && !Object.is(Number(chainText), sdkValue)
}

suite('conformance', function () {
    this.slow(10000)
    this.timeout(60000)

    test('pins the node, the contract, and the ABI', async function () {
        const info = await client.v1.chain.get_info()
        assert.equal(String(info.server_version_string), NODE_VERSION)

        abi = ABI.from((await client.v1.chain.get_abi(ACCOUNT)).abi!)
        assert.equal(abi.actions.length, ACTION_COUNT)
        types = caseFieldTypes(abi)
        floatFields = new Set(
            [...types.entries()]
                .filter(([, type]) => type === 'float32' || type === 'float64')
                .map(([name]) => name)
        )

        const action = Action.from(
            {account: ACCOUNT, name: 'version', authorization: [], data: {}},
            abi
        )
        const [hex] = await sendReadOnly([action])
        const version: Row = Serializer.decode({data: hex, type: 'version_row', abi})
        assert.equal(Number(version.grid_size), GRID_SIZE)
        assert.equal(Number(version.fq_start), FQ_START)
        assert.equal(String(version.contract_version), '0.1.0')
        assert.isFalse(String(version.seeded_at).startsWith('1970'))
    })

    test('serves the full grid as JSON and as binary', async function () {
        jsonRows = await fetchAll(true)
        hexRows = (await fetchAll(false)).map((row) => String(row))
        assert.equal(jsonRows.length, GRID_SIZE)
        assert.equal(hexRows.length, GRID_SIZE)
        decodedRows = hexRows.map((hex) =>
            Serializer.decode({data: hex, type: CASE_TYPE, abi})
        ) as Row[]
        for (let i = 0; i < decodedRows.length; i++) {
            assert.equal(String(jsonRows[i].id), String(decodedRows[i].id), `row offset ${i}`)
        }
    })

    test('binary parity: every decoded row re-encodes to the bytes the node served', function () {
        let differences = 0
        for (let i = 0; i < decodedRows.length; i++) {
            const reencoded = Serializer.encode({
                object: decodedRows[i],
                type: CASE_TYPE,
                abi,
            }).hexString
            if (reencoded.toLowerCase() !== hexRows[i].toLowerCase()) {
                differences++
                assert.fail(`${where(decodedRows[i])}: chain=${hexRows[i]} sdk=${reencoded}`)
            }
        }
        assert.equal(differences, EXPECTED.binary)
    })

    test('text parity: every field renders as the node does, or differs only in float format', function () {
        const counts = {exact: 0, format: 0, lossy: 0}
        for (let i = 0; i < decodedRows.length; i++) {
            const objectified: Row = Serializer.objectify(decodedRows[i])
            const jsonRow = jsonRows[i]
            for (const name of types.keys()) {
                const chainText = String(jsonRow[name])
                const sdkText = String(objectified[name])
                if (chainText === sdkText) continue
                const detail = `${where(decodedRows[i])} ${name}: chain=${chainText} sdk=${sdkText}`
                if (types.get(name) === 'bool' && boolText(chainText) === boolText(sdkText)) {
                    continue
                }
                if (!floatFields.has(name)) {
                    counts.exact++
                    assert.fail(detail)
                }
                const chainValue = parseFloatText(chainText)
                const sdkValue = parseFloatText(sdkText)
                if (Object.is(chainValue, sdkValue)) {
                    counts.format++
                    continue
                }
                assert.isTrue(isLossyChainText(chainText, sdkValue), detail)
                counts.lossy++
            }
        }
        assert.equal(counts.exact, EXPECTED.exact)
        assert.equal(counts.format, EXPECTED.format)
        assert.equal(counts.lossy, EXPECTED.lossy)
    })

    test('math parity: every row recomputes through its read-only action', async function () {
        for (let start = 0; start < decodedRows.length; start += BATCH_SIZE) {
            const batch = decodedRows.slice(start, start + BATCH_SIZE)
            const actions = batch.map((row) =>
                Action.from(
                    {account: ACCOUNT, name: String(row.op), authorization: [], data: argsFor(row)},
                    abi
                )
            )
            const returned = await sendReadOnly(actions)
            for (let i = 0; i < batch.length; i++) {
                const expected = Serializer.encode({
                    object: maskedCase(batch[i], abi),
                    type: CASE_TYPE,
                    abi,
                }).hexString.toLowerCase()
                assert.equal(returned[i], expected, where(batch[i]))
            }
        }
    })

    test('math parity: every fs and fd row recomputes in JavaScript', function () {
        let recomputed = 0
        let nanRows = 0
        let positiveNanRows = 0
        const mismatches: string[] = []
        for (const row of decodedRows) {
            const result = recompute(row)
            if (!result) continue
            recomputed++
            const stored = row[result.field]
            if (result.field === 'rb') {
                if (result.value !== stored)
                    mismatches.push(`${where(row)} rb=${stored} js=${result.value}`)
                continue
            }
            const type =
                result.field === 'r32'
                    ? Float32
                    : result.field === 'r64'
                      ? Float64
                      : result.field === 'ri'
                        ? Int64
                        : Int128
            const expected = Serializer.encode({object: stored}).hexString
            const actual = Serializer.encode({object: type.from(result.value as any)}).hexString
            if (actual === expected) continue
            // A JS number carries no NaN payload, so a propagated positive NaN encodes as the default.
            if (
                typeof result.value === 'number' &&
                Number.isNaN(result.value) &&
                Number.isNaN(stored.value)
            ) {
                positiveNanRows++
                continue
            }
            mismatches.push(
                `${where(row)} ${result.field}: chain=${expected} js=${actual} (${String(result.value)})`
            )
        }
        for (const row of decodedRows) {
            const result = recompute(row)
            if (result && typeof result.value === 'number' && Number.isNaN(result.value)) nanRows++
        }
        assert.deepEqual(mismatches, [], `${mismatches.length} rows differ`)
        assert.equal(recomputed, RECOMPUTED_ROWS)
        assert.equal(nanRows, NAN_RESULT_ROWS)
        assert.equal(positiveNanRows, POSITIVE_NAN_ROWS)
    })

    test('index: float64 secondary over [1, 2]', async function () {
        const res: any = await indexQuery({
            index_position: 'secondary',
            key_type: 'float64',
            lower_bound: '1',
            upper_bound: '2',
        })
        assert.equal(res.rows.length, 5)
        let outside = 0
        for (const row of res.rows) {
            const value = parseFloatText(String(row.by_f64))
            if (!(value >= 1 && value <= 2)) outside++
        }
        assert.equal(outside, EXPECTED.index)
    })

    test('index: float128 tertiary at 1.0 by Float128 bound', async function () {
        const res = await api.v1.chain.get_table_rows({
            code: ACCOUNT,
            table: 'fpcases',
            scope: ACCOUNT,
            index_position: 'tertiary',
            lower_bound: Float128.from('0x0000000000000000000000000000ff3f'),
            upper_bound: Float128.from('0x0000000000000000000000000000ff3f'),
            limit: 100,
        })
        assert.equal(res.rows.length, 11)
        for (const row of res.rows) {
            assert.equal(row.by_f128, '0x0000000000000000000000000000ff3f')
        }
    })

    test('index: float128 decimal next_key decodes', async function () {
        const res = await api.v1.chain.get_table_rows({
            code: ACCOUNT,
            table: 'fpcases',
            scope: ACCOUNT,
            index_position: 'tertiary',
            key_type: 'float128',
            encode_type: 'hex',
            lower_bound: '0x3fff0000000000000000000000000000',
            limit: 3,
        })
        assert.equal(res.rows.length, 3)
        assert.equal(res.more, true)
        assert.instanceOf(res.next_key, Float128)
        assert.equal(String(res.next_key), '0x0000000000000000000000000000ff3f')
    })

    test('index: NaN lower bound on the float64 index is rejected', async function () {
        let rejected = false
        try {
            await indexQuery({index_position: 'secondary', key_type: 'float64', lower_bound: 'nan'})
        } catch (error) {
            rejected = true
            assert.include(String(error), 'contract_table_query_exception')
        }
        assert.isTrue(rejected)
    })
})
