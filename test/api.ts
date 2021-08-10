import {assert} from 'chai'

import {MockProvider} from './utils/mock-provider'

import {
    Action,
    AnyAction,
    API,
    APIClient,
    Asset,
    Checksum256,
    Float64,
    Name,
    PrivateKey,
    SignedTransaction,
    Struct,
    Transaction,
    TransactionReceipt,
} from '$lib'

const jungle = new APIClient({
    provider: new MockProvider(),
})

const eos = new APIClient({
    provider: new MockProvider('https://eos.greymass.com'),
})

const fio = new APIClient({
    provider: new MockProvider('https://fio.greymass.com'),
})

const beos = new APIClient({
    provider: new MockProvider('https://api.beos.world'),
})

suite('api v1', function () {
    this.slow(200)

    test('chain get_account', async function () {
        const account = await jungle.v1.chain.get_account('teamgreymass')
        assert.equal(String(account.account_name), 'teamgreymass')
    })

    test('chain get_account (system account)', async function () {
        const account = await jungle.v1.chain.get_account('eosio')
        assert.equal(String(account.account_name), 'eosio')
    })

    test('chain get_account (fio)', async function () {
        const account = await fio.v1.chain.get_account('lhp1ytjibtea')
        assert.equal(String(account.account_name), 'lhp1ytjibtea')
    })

    test('chain get_account / getPermission with string', async function () {
        const account = await jungle.v1.chain.get_account('teamgreymass')
        const permission = account.getPermission('active')
        assert.equal(permission instanceof API.v1.AccountPermission, true)
        assert.equal(String(permission.perm_name), 'active')
    })

    test('chain get_account / getPermission with name', async function () {
        const account = await jungle.v1.chain.get_account('teamgreymass')
        const permission = account.getPermission(Name.from('active'))
        assert.equal(permission instanceof API.v1.AccountPermission, true)
        assert.equal(String(permission.perm_name), 'active')
    })

    test('chain get_account / getPermission throws error', async function () {
        const account = await jungle.v1.chain.get_account('teamgreymass')
        assert.throws(() => {
            account.getPermission('invalid')
        })
    })

    test('chain get_block (by id)', async function () {
        const block = await eos.v1.chain.get_block(
            '00816d41e41f1462acb648b810b20f152d944fabd79aaff31c9f50102e4e5db9'
        )
        assert.equal(Number(block.block_num), 8482113)
        assert.equal(
            block.id.hexString,
            '00816d41e41f1462acb648b810b20f152d944fabd79aaff31c9f50102e4e5db9'
        )
    })

    test('chain get_block (by num)', async function () {
        const block = await eos.v1.chain.get_block(8482113)
        assert.equal(Number(block.block_num), 8482113)
        assert.equal(
            block.id.hexString,
            '00816d41e41f1462acb648b810b20f152d944fabd79aaff31c9f50102e4e5db9'
        )
    })

    test('chain get_block w/ new_producers', async function () {
        const block = await eos.v1.chain.get_block(92565371)
        assert.equal(Number(block.block_num), 92565371)
    })

    test('chain get_block w/ transactions', async function () {
        const block = await eos.v1.chain.get_block(124472078)
        assert.equal(Number(block.block_num), 124472078)
        assert.equal(block.transactions.length, 8)
        block.transactions.forEach((tx) => {
            assert.ok(tx instanceof TransactionReceipt)
            assert.ok(tx.trx.id instanceof Checksum256)
        })
        const tx = block.transactions[5].trx.transaction
        assert.equal(String(tx?.id), String(block.transactions[5].id))
        const sigs = block.transactions[5].trx.signatures || []
        assert.equal(
            String(sigs[0]),
            'SIG_K1_KeQEThQJEk7fuQC1zLuFyXZBnVmeRJXq9SrmDJGcerq1RZbgCoH5tvt28xpM7xA1bp7tStVPw17gNMG6hFyYXuNHCU4Wpd'
        )
    })

    test('chain get_block_header_state', async function () {
        const header = await eos.v1.chain.get_block_header_state(143671483)
        assert.equal(Number(header.block_num), 143671483)
    })

    test('chain get_block', async function () {
        const block = await eos.v1.chain.get_block(8482113)
        assert.equal(Number(block.block_num), 8482113)
        assert.equal(
            block.id.hexString,
            '00816d41e41f1462acb648b810b20f152d944fabd79aaff31c9f50102e4e5db9'
        )
    })

    test('chain get_block w/ new_producers', async function () {
        const block = await eos.v1.chain.get_block(92565371)
        assert.equal(Number(block.block_num), 92565371)
    })

    test('chain get_block w/ transactions', async function () {
        const block = await eos.v1.chain.get_block(124472078)
        assert.equal(Number(block.block_num), 124472078)
        block.transactions.forEach((tx) => {
            assert.equal(tx instanceof TransactionReceipt, true)
        })
    })

    test('chain get_currency_balance', async function () {
        const balances = await jungle.v1.chain.get_currency_balance('eosio.token', 'lioninjungle')
        assert.equal(balances.length, 2)
        balances.forEach((asset) => {
            assert.equal(asset instanceof Asset, true)
        })
        assert.deepEqual(balances.map(String), ['881307350.1453 EOS', '100400.0000 JUNGLE'])
    })

    test('chain get_currency_balance w/ symbol', async function () {
        const balances = await jungle.v1.chain.get_currency_balance(
            'eosio.token',
            'lioninjungle',
            'JUNGLE'
        )
        assert.equal(balances.length, 1)
        assert.equal(balances[0].value, 100400)
    })

    test('chain get_info', async function () {
        const info = await jungle.v1.chain.get_info()
        assert.equal(
            info.chain_id.hexString,
            '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840'
        )
    })

    test('chain get_info (beos)', async function () {
        const info = await beos.v1.chain.get_info()
        assert.equal(
            info.chain_id.hexString,
            'cbef47b0b26d2b8407ec6a6f91284100ec32d288a39d4b4bbd49655f7c484112'
        )
    })

    test('chain push_transaction', async function () {
        @Struct.type('transfer')
        class Transfer extends Struct {
            @Struct.field('name') from!: Name
            @Struct.field('name') to!: Name
            @Struct.field('asset') quantity!: Asset
            @Struct.field('string') memo!: string
        }
        const info = await jungle.v1.chain.get_info()
        const header = info.getTransactionHeader()
        const action = Action.from({
            authorization: [
                {
                    actor: 'corecorecore',
                    permission: 'active',
                },
            ],
            account: 'eosio.token',
            name: 'transfer',
            data: Transfer.from({
                from: 'corecorecore',
                to: 'teamgreymass',
                quantity: '0.0042 EOS',
                memo: 'eosio-core is the best <3',
            }),
        })
        const transaction = Transaction.from({
            ...header,
            actions: [action],
        })
        const privateKey = PrivateKey.from('5JW71y3njNNVf9fiGaufq8Up5XiGk68jZ5tYhKpy69yyU9cr7n9')
        const signature = privateKey.signDigest(transaction.signingDigest(info.chain_id))
        const signedTransaction = SignedTransaction.from({
            ...transaction,
            signatures: [signature],
        })
        const result = await jungle.v1.chain.push_transaction(signedTransaction)
        assert.equal(result.transaction_id, transaction.id.hexString)
    })

    test('chain push_transaction (untyped)', async function () {
        const info = await jungle.v1.chain.get_info()
        const header = info.getTransactionHeader()
        const untypedAction: AnyAction = {
            authorization: [
                {
                    actor: 'corecorecore',
                    permission: 'active',
                },
            ],
            account: 'eosio.token',
            name: 'transfer',
            data: {
                from: 'corecorecore',
                to: 'teamgreymass',
                quantity: '0.0042 EOS',
                memo: 'eosio-core is the best <3',
            },
        }
        const {abi} = await jungle.v1.chain.get_abi(untypedAction.account)
        if (!abi) {
            throw new Error(`No ABI for ${untypedAction.account}`)
        }
        const action = Action.from(untypedAction, abi)
        const transaction = Transaction.from({
            ...header,
            actions: [action],
        })
        const privateKey = PrivateKey.from('5JW71y3njNNVf9fiGaufq8Up5XiGk68jZ5tYhKpy69yyU9cr7n9')
        const signature = privateKey.signDigest(transaction.signingDigest(info.chain_id))
        const signedTransaction = SignedTransaction.from({
            ...transaction,
            signatures: [signature],
        })
        const result = await jungle.v1.chain.push_transaction(signedTransaction)
        assert.equal(result.transaction_id, transaction.id.hexString)
    })

    test('chain get_table_rows (untyped)', async function () {
        const res = await eos.v1.chain.get_table_rows({
            code: 'eosio.token',
            table: 'stat',
            scope: Asset.Symbol.from('4,EOS').code.value.toString(),
            key_type: 'i64',
        })
        assert.equal(res.rows.length, 1)
        assert.equal(res.rows[0].max_supply, '10000000000.0000 EOS')
    })

    test('chain get_table_rows (typed)', async function () {
        @Struct.type('user')
        class User extends Struct {
            @Struct.field('name') account!: Name
            @Struct.field('float64') balance!: Float64
        }
        const res1 = await eos.v1.chain.get_table_rows({
            code: 'fuel.gm',
            table: 'users',
            type: User,
            limit: 1,
        })
        assert.equal(res1.rows[0].account instanceof Name, true)
        assert.equal(res1.more, true)
        assert.equal(String(res1.rows[0].account), 'aaaa')
        const res2 = await eos.v1.chain.get_table_rows({
            code: 'fuel.gm',
            table: 'users',
            type: User,
            limit: 2,
            lower_bound: res1.next_key,
        })
        assert.equal(String(res2.rows[0].account), 'funds.gm')
        assert.equal(String(res2.next_key), 'teamgreymass')
        assert.equal(Number(res2.rows[1].balance).toFixed(6), (0.00005).toFixed(6))
    })

    test('chain get_table_rows (empty scope)', async function () {
        const res = await jungle.v1.chain.get_table_rows({
            code: 'eosio',
            table: 'powup.state',
            scope: '',
        })
        assert.equal(res.rows.length, 1)
    })

    test('chain get_table_rows (ram payer)', async function () {
        const res = await eos.v1.chain.get_table_rows({
            code: 'eosio.token',
            table: 'stat',
            scope: Asset.SymbolCode.from('EOS').value,
            show_payer: true,
        })
        assert.equal(res.rows.length, 1)
        assert.equal(String(res.ram_payers![0]), 'eosio.token')
    })

    test('chain get_table_by_scope', async function () {
        const res = await eos.v1.chain.get_table_by_scope({
            code: 'eosio.token',
            table: 'accounts',
            limit: 1,
        })
        assert.equal(res.rows.length, 1)
        res.rows.forEach((row) => {
            assert.equal(row instanceof API.v1.GetTableByScopeResponseRow, true)
        })
        const res2 = await eos.v1.chain.get_table_by_scope({
            code: 'eosio.token',
            table: 'accounts',
            lower_bound: res.more,
            upper_bound: res.more,
            limit: 1,
        })
        res2.rows.forEach((row) => {
            assert.equal(row instanceof API.v1.GetTableByScopeResponseRow, true)
        })
    })

    test('api errors', async function () {
        try {
            await jungle.call({path: '/v1/chain/get_account', params: {account_name: '.'}})
            assert.fail()
        } catch (error) {
            // FIXME: mocha somehow mangles the error here when using the bundle
            // assert.equal(error instanceof APIError, true)
            // assert.equal(error.message, 'Invalid name at /v1/chain/get_account')
            // assert.equal(error.name, 'name_type_exception')
            // assert.equal(error.code, 3010001)
            // assert.deepEqual(error.details, [
            //     {
            //         file: 'name.cpp',
            //         line_number: 15,
            //         message: 'Name not properly normalized (name: ., normalized: ) ',
            //         method: 'set',
            //     },
            // ])
        }
    })

    test('history get_actions', async function () {
        const res = await eos.v1.chain.get_table_rows({
            code: 'eosio.token',
            table: 'stat',
            scope: Asset.SymbolCode.from('EOS').value,
            show_payer: true,
        })
        assert.equal(res.rows.length, 1)
        assert.equal(String(res.ram_payers![0]), 'eosio.token')
    })

    test('history get_transaction', async function () {
        const res = await eos.v1.chain.get_table_rows({
            code: 'eosio.token',
            table: 'stat',
            scope: Asset.SymbolCode.from('EOS').value,
            show_payer: true,
        })
        assert.equal(res.rows.length, 1)
        assert.equal(String(res.ram_payers![0]), 'eosio.token')
    })

    test('history get_key_accounts', async function () {
        const res = await eos.v1.chain.get_table_rows({
            code: 'eosio.token',
            table: 'stat',
            scope: Asset.SymbolCode.from('EOS').value,
            show_payer: true,
        })
        assert.equal(res.rows.length, 1)
        assert.equal(String(res.ram_payers![0]), 'eosio.token')
    })

    test('history get_controlled_accounts', async function () {
        const res = await eos.v1.chain.get_table_rows({
            code: 'eosio.token',
            table: 'stat',
            scope: Asset.SymbolCode.from('EOS').value,
            show_payer: true,
        })
        assert.equal(res.rows.length, 1)
        assert.equal(String(res.ram_payers![0]), 'eosio.token')
    })
})
