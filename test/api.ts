import {assert} from 'chai'

import {MockProvider} from './utils/mock-provider'
import {makeMockTransaction, signMockTransaction} from './utils/mock-transfer'
import fetch from 'node-fetch'

import {
    ABI,
    Action,
    AnyAction,
    API,
    APIClient,
    APIError,
    Asset,
    Blob,
    BlockId,
    Bytes,
    Checksum256,
    CompressionType,
    FetchProvider,
    Float64,
    Name,
    PackedTransaction,
    PrivateKey,
    Serializer,
    SignedTransaction,
    Struct,
    Transaction,
    TransactionReceipt,
} from '$lib'

const jungle = new APIClient({
    provider: new MockProvider(),
})

const jungle4 = new APIClient({
    provider: new MockProvider('https://jungle4.api.eosnation.io'),
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

const wax = new APIClient({
    provider: new MockProvider('https://wax.greymass.com'),
})

@Struct.type('transfer')
class Transfer extends Struct {
    @Struct.field('name') from!: Name
    @Struct.field('name') to!: Name
    @Struct.field('asset') quantity!: Asset
    @Struct.field('string') memo!: string
}

suite('api v1', function () {
    this.slow(200)
    this.timeout(10 * 10000)

    test('FetchProvider methods', async function () {
        const defaultresponse = await jungle4.provider.call({
            path: '/v1/chain/get_info',
        })
        assert.equal(defaultresponse.status, 200)
        const getresponse = await jungle4.provider.call({
            path: '/v1/chain/get_info',
            method: 'GET',
        })
        assert.equal(getresponse.status, 200)
        const postresponse = await jungle4.provider.call({
            path: '/v1/chain/get_info',
            method: 'GET',
        })
        assert.equal(postresponse.status, 200)
    })

    test('FetchProvider headers', async function () {
        const test = new APIClient({
            provider: new MockProvider('https://wax.greymass.com', {
                reqHeaders: {'X-Test': 'true'},
            }),
        })
        const defaultresponse = await test.provider.call({
            path: '/v1/chain/get_info',
        })
        assert.equal(defaultresponse.status, 200)
    })

    test('chain get_abi', async function () {
        const response = await jungle4.v1.chain.get_abi('eosio.token')
        assert.equal(response.account_name, 'eosio.token')
        assert.isObject(response.abi)
        if (response.abi) {
            assert.equal(response.abi.version, 'eosio::abi/1.2')
        }
    })

    test('ABI to blob to ABI', async function () {
        // Get an ABI from the API
        const response = await jungle4.v1.chain.get_abi('eosio.token')
        if (!response.abi) {
            throw Error('unable to load ABI')
        }

        // Convert the ABI in the response to an ABI serializable object
        const originalAbi = ABI.from(response.abi)

        // Encode the ABI
        const serializedABI = Serializer.encode({object: originalAbi, type: ABI})

        // Convert the serialized ABI data into a blob
        const blob = new Blob(serializedABI.array)

        // String representation of the blob
        const string = String(blob)

        // Restore a new ABI instance from the string representation of the blob
        const abiFromBlob = ABI.from(Blob.from(string))

        // Ensure the two ABIs match
        assert.isTrue(originalAbi.equals(abiFromBlob))
        assert.equal(abiFromBlob.tables[0].name, originalAbi.tables[0].name)
        assert.equal(originalAbi.tables[0].name, abiFromBlob.tables[0].name)
    })

    test('chain get_raw_abi', async function () {
        const response = await jungle4.v1.chain.get_raw_abi('eosio.token')
        assert.instanceOf(response, API.v1.GetRawAbiResponse)
        assert.instanceOf(response.account_name, Name)
        assert.equal(response.account_name, 'eosio.token')
        assert.instanceOf(response.code_hash, Checksum256)
        assert.equal(
            response.code_hash,
            '33109b3dd5d354cab5a425c1d4c404c4db056717215f1a8b7ba036a6692811df'
        )
        assert.isTrue(
            response.code_hash.equals(
                '33109b3dd5d354cab5a425c1d4c404c4db056717215f1a8b7ba036a6692811df'
            )
        )
        assert.instanceOf(response.abi_hash, Checksum256)
        assert.equal(
            response.abi_hash,
            'd84356074da34a976528321472d73ac919227b9b01d9de59d8ade6d96440455c'
        )
        assert.isTrue(
            response.abi_hash.equals(
                'd84356074da34a976528321472d73ac919227b9b01d9de59d8ade6d96440455c'
            )
        )
        assert.instanceOf(response.abi, Blob)
        const abi = ABI.from(response.abi)
        assert.instanceOf(abi, ABI)
        assert.equal(abi.version, 'eosio::abi/1.2')
    })

    test('chain get_code', async function () {
        const response = await jungle4.v1.chain.get_code('eosio.token')
        assert.instanceOf(response, API.v1.GetCodeResponse)
    })

    test('chain get_account', async function () {
        const account = await jungle.v1.chain.get_account('teamgreymass')
        assert.equal(String(account.account_name), 'teamgreymass')
    })

    test('chain get_account (voter info)', async function () {
        const account = await eos.v1.chain.get_account('teamgreymass')
        assert.equal(String(account.account_name), 'teamgreymass')
        const voterinfo = account.voter_info
        assert.instanceOf(voterinfo!.last_vote_weight, Float64)
        assert.instanceOf(voterinfo!.proxied_vote_weight, Float64)
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

    test('chain get_account (linked actions)', async function () {
        const account = await jungle4.v1.chain.get_account('wharfkit1115')
        assert.equal(String(account.account_name), 'wharfkit1115')
        const permission = account.getPermission(Name.from('test'))
        assert.equal(permission.linked_actions.length, 1)
        assert.isTrue(permission.linked_actions[0].account.equals('eosio.token'))
        assert.isTrue(permission.linked_actions[0].action.equals('transfer'))
    })

    test('chain get_accounts_by_authorizers (keys)', async function () {
        const response = await jungle4.v1.chain.get_accounts_by_authorizers({
            keys: ['PUB_K1_6RWZ1CmDL4B6LdixuertnzxcRuUDac3NQspJEvMnebGcXY4zZj'],
        })
        assert.lengthOf(response.accounts, 13)
        assert.isTrue(response.accounts[0].account_name.equals('testtestasdf'))
        assert.isTrue(response.accounts[0].permission_name.equals('owner'))
        assert.isTrue(
            response.accounts[0].authorizing_key.equals(
                'PUB_K1_6RWZ1CmDL4B6LdixuertnzxcRuUDac3NQspJEvMnebGcXY4zZj'
            )
        )
        assert.isTrue(response.accounts[0].weight.equals(1))
        assert.isTrue(response.accounts[0].threshold.equals(1))
    })

    test('chain get_accounts_by_authorizers (accounts)', async function () {
        const response = await jungle4.v1.chain.get_accounts_by_authorizers({
            accounts: ['eosio.prods'],
        })
        assert.lengthOf(response.accounts, 1)
        assert.isTrue(response.accounts[0].account_name.equals('eosio'))
        assert.isTrue(response.accounts[0].permission_name.equals('active'))
        assert.isTrue(response.accounts[0].authorizing_account.actor.equals('eosio.prods'))
        assert.isTrue(response.accounts[0].authorizing_account.permission.equals('active'))
        assert.isTrue(response.accounts[0].weight.equals(1))
        assert.isTrue(response.accounts[0].threshold.equals(1))
    })

    test('chain get_activated_protocol_features', async function () {
        const response = await jungle4.v1.chain.get_activated_protocol_features()
        assert.lengthOf(response.activated_protocol_features, 10)
        assert.isTrue(response.more.equals(10))
        const [feature] = response.activated_protocol_features
        assert.isTrue(
            feature.feature_digest.equals(
                '0ec7e080177b2c02b278d5088611686b49d739925a92d9bfcacd7fc6b74053bd'
            )
        )
        assert.isTrue(feature.activation_ordinal.equals(0))
        assert.isTrue(feature.activation_block_num.equals(4))
        assert.isTrue(
            feature.description_digest.equals(
                '64fe7df32e9b86be2b296b3f81dfd527f84e82b98e363bc97e40bc7a83733310'
            )
        )
        assert.isArray(feature.dependencies)
        assert.lengthOf(feature.dependencies, 0)
        assert.equal(feature.protocol_feature_type, 'builtin')
        assert.isArray(feature.specification)
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

    test('chain get_block (by id, typed)', async function () {
        const block = await eos.v1.chain.get_block(
            BlockId.from('00816d41e41f1462acb648b810b20f152d944fabd79aaff31c9f50102e4e5db9')
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
        const header = await eos.v1.chain.get_block_header_state(323978187)
        assert.equal(Number(header.block_num), 323978187)
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

    test('chain get_block w/ compression', async function () {
        const block = await wax.v1.chain.get_block(258546986)
        assert.equal(Number(block.block_num), 258546986)
        for (const tx of block.transactions) {
            assert.instanceOf(tx.trx.transaction, Transaction)
        }
    })

    test('chain get_currency_balance', async function () {
        const balances = await jungle.v1.chain.get_currency_balance('eosio.token', 'lioninjungle')
        assert.equal(balances.length, 2)
        balances.forEach((asset) => {
            assert.equal(asset instanceof Asset, true)
        })
        assert.deepEqual(balances.map(String), ['539235868.8986 EOS', '100360.0680 JUNGLE'])
    })

    test('chain get_currency_balance w/ symbol', async function () {
        const balances = await jungle.v1.chain.get_currency_balance(
            'eosio.token',
            'lioninjungle',
            'JUNGLE'
        )
        assert.equal(balances.length, 1)
        assert.equal(balances[0].value, 100360.068)
    })

    test('chain get_currency_stats', async function () {
        const stats = await jungle4.v1.chain.get_currency_stats('eosio.token', 'EOS')
        assert.instanceOf(stats.EOS.supply, Asset)
        assert.instanceOf(stats.EOS.max_supply, Asset)
        assert.instanceOf(stats.EOS.issuer, Name)
    })

    test('chain get_info', async function () {
        const info = await jungle.v1.chain.get_info()
        assert.equal(
            info.chain_id.hexString,
            '73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d'
        )
    })

    test('chain get_info (beos)', async function () {
        const info = await beos.v1.chain.get_info()
        assert.equal(
            info.chain_id.hexString,
            'cbef47b0b26d2b8407ec6a6f91284100ec32d288a39d4b4bbd49655f7c484112'
        )
    })

    test('chain get_producer_schedule', async function () {
        const schedule = await jungle.v1.chain.get_producer_schedule()
        assert.isTrue(schedule.active.version.equals(72))
        assert.lengthOf(schedule.active.producers, 21)
        assert.isTrue(schedule.active.producers[0].producer_name.equals('alohaeostest'))
        assert.lengthOf(schedule.active.producers[0].authority, 2)
        assert.isTrue(schedule.active.producers[0].authority[1].threshold.equals(1))
        assert.lengthOf(schedule.active.producers[0].authority[1].keys, 1)
        assert.isTrue(schedule.active.producers[0].authority[1].keys[0].weight.equals(1))
        assert.isTrue(
            schedule.active.producers[0].authority[1].keys[0].key.equals(
                'PUB_K1_8QwUpioje5txP4XwwXjjufqMs7wjrxkuWhUxcVMaxqrr14Sd2v'
            )
        )
    })

    test('chain push_transaction', async function () {
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

    test('chain push_transaction (compression by default)', async function () {
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
        const packed = PackedTransaction.fromSigned(signedTransaction)
        assert.equal(packed.compression, CompressionType.zlib)
    })

    test('chain push_transaction (optional uncompressed)', async function () {
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
        const packed = PackedTransaction.fromSigned(signedTransaction, CompressionType.none)
        assert.equal(packed.compression, CompressionType.none)
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

    test('chain compute_transaction', async function () {
        const info = await jungle4.v1.chain.get_info()
        const transaction = await makeMockTransaction(info)
        const signedTransaction = await signMockTransaction(transaction, info)
        const result = await jungle4.v1.chain.compute_transaction(signedTransaction)
        assert.equal(result.transaction_id, transaction.id.hexString)
    })

    test('chain send_transaction', async function () {
        const info = await jungle4.v1.chain.get_info()
        const transaction = await makeMockTransaction(info)
        const signedTransaction = await signMockTransaction(transaction, info)
        const result = await jungle4.v1.chain.send_transaction(signedTransaction)
        assert.equal(result.transaction_id, transaction.id.hexString)
    })

    test('chain send_transaction2 (default)', async function () {
        const info = await jungle4.v1.chain.get_info()
        const memo = this.test ? this.test.title : undefined
        const transaction = await makeMockTransaction(info, memo)
        const signedTransaction = await signMockTransaction(transaction, info)
        const result = await jungle4.v1.chain.send_transaction2(signedTransaction)
        assert.equal(result.transaction_id, transaction.id.hexString)
    })

    test('chain send_transaction2 (failure traces)', async function () {
        const info = await jungle4.v1.chain.get_info()
        const memo = this.test ? this.test.title : undefined
        const transaction = await makeMockTransaction(info, memo)
        const signedTransaction = await signMockTransaction(transaction, info)
        const result = await jungle4.v1.chain.send_transaction2(signedTransaction, {
            return_failure_trace: true,
        })
        assert.equal(result.transaction_id, transaction.id.hexString)
    })

    test('chain send_transaction2 (retry)', async function () {
        const info = await jungle4.v1.chain.get_info()
        const memo = this.test ? this.test.title : undefined
        const transaction = await makeMockTransaction(info, memo)
        const signedTransaction = await signMockTransaction(transaction, info)
        const result = await jungle4.v1.chain.send_transaction2(signedTransaction, {
            retry_trx: true,
            retry_trx_num_blocks: 10,
        })
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
        assert.equal(String(res2.rows[0].account), 'atomichub')
        assert.equal(String(res2.next_key), 'boidservices')
        assert.equal(Number(res2.rows[1].balance).toFixed(6), (0.02566).toFixed(6))
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

    test('chain send_read_only_transaction', async function () {
        const info = await jungle4.v1.chain.get_info()
        const header = info.getTransactionHeader(90)

        @Struct.type('returnvalue')
        class Returnvalue extends Struct {
            @Struct.field(Name) message!: Name
        }

        const action = Action.from({
            authorization: [], // No authorizations
            account: 'abcabcabc333',
            name: 'returnvalue',
            data: Returnvalue.from({
                message: 'hello',
            }),
        })

        const transaction = Transaction.from({
            ...header,
            actions: [action],
        })

        const res = await jungle4.v1.chain.send_read_only_transaction(transaction)

        assert.equal(res.processed.action_traces.length, 1)
        assert.equal(res.processed.action_traces[0].return_value_data, 'Validation has passed.')
        assert.equal(
            res.processed.action_traces[0].return_value_hex_data,
            '1656616c69646174696f6e20686173207061737365642e'
        )

        // Test decoding raw hex data as string
        const decoded = Serializer.decode({
            type: 'string',
            data: Bytes.from(res.processed.action_traces[0].return_value_hex_data),
        })
        assert.equal(decoded, 'Validation has passed.')
    })

    test('api errors', async function () {
        try {
            await jungle.call({path: '/v1/chain/get_account', params: {account_name: 'nani1'}})
            assert.fail()
        } catch (error) {
            assert.equal(error instanceof APIError, true)
            const apiError = error as APIError
            assert.equal(apiError.message, 'Account not found at /v1/chain/get_account')
            assert.equal(apiError.name, 'exception')
            assert.equal(apiError.code, 0)
            assert.equal(error.response.headers['access-control-allow-origin'], '*')
            assert.equal(error.response.headers.date, 'Fri, 04 Aug 2023 18:50:00 GMT')
            assert.deepEqual(apiError.details, [
                {
                    file: 'http_plugin.cpp',
                    line_number: 954,
                    message:
                        'unknown key (boost::tuples::tuple<bool, eosio::chain::name, boost::tuples::null_type, boost::tuples::null_type, boost::tuples::null_type, boost::tuples::null_type, boost::tuples::null_type, boost::tuples::null_type, boost::tuples::null_type, boost::tuples::null_type>): (0 nani1)',
                    method: 'handle_exception',
                },
            ])
        }
    })

    test('history get_actions', async function () {
        const res = await eos.v1.history.get_actions('teamgreymass', 1, 1)
        assert.equal(res.actions.length, 1)
    })

    test('history get_transaction', async function () {
        const res = await eos.v1.history.get_transaction(
            '03ef96a276a252b66595d91006ad0ff38ed999816f078bc5d87f88368a9354e7'
        )
        assert(Array.isArray(res.traces), 'response should have traces')
        assert.equal(res.id, '03ef96a276a252b66595d91006ad0ff38ed999816f078bc5d87f88368a9354e7')
        assert.equal(res.block_num, 199068081)
    })

    test('history get_transaction (no traces)', async function () {
        const res = await eos.v1.history.get_transaction(
            '03ef96a276a252b66595d91006ad0ff38ed999816f078bc5d87f88368a9354e7',
            {excludeTraces: true}
        )
        assert.equal(res.traces, null, 'response should not have traces')
        assert.equal(res.id, '03ef96a276a252b66595d91006ad0ff38ed999816f078bc5d87f88368a9354e7')
        assert.equal(res.block_num, 199068081)
    })

    test('history get_key_accounts', async function () {
        const res = await eos.v1.history.get_key_accounts(
            'PUB_K1_6gqJ7sdPgjHLFLtks9cRPs5qYHa9U3CwK4P2JasTLWKQBdT2GF'
        )
        assert.equal(res.account_names.length, 2)
    })

    test('history get_controlled_accounts', async function () {
        const res = await eos.v1.history.get_controlled_accounts('teamgreymass')
        assert.equal(res.controlled_accounts.length, 2)
    })

    test('chain get_transaction_status', async function () {
        const res = await jungle4.v1.chain.get_transaction_status(
            '153207ae7b30621421b968fa3c327db0d89f70975cf2bee7f8118c336094019a'
        )
        assert.equal(res.state, 'UNKNOWN')
    })

    test('chain set_abi w/ action results', async function () {
        const raw = {
            ____comment: 'This file was generated with eosio-abigen. DO NOT EDIT ',
            version: 'eosio::abi/1.2',
            types: [],
            structs: [
                {
                    name: 'Result',
                    base: '',
                    fields: [
                        {
                            name: 'id',
                            type: 'uint32',
                        },
                    ],
                },
                {
                    name: 'test',
                    base: '',
                    fields: [
                        {
                            name: 'eos_account',
                            type: 'name',
                        },
                    ],
                },
            ],
            actions: [
                {
                    name: 'test',
                    type: 'test',
                    ricardian_contract: '',
                },
            ],
            tables: [],
            ricardian_clauses: [],
            variants: [],
            action_results: [
                {
                    name: 'test',
                    result_type: 'Result',
                },
            ],
        }
        const info = await jungle4.v1.chain.get_info()
        const header = info.getTransactionHeader()
        const untypedAction: AnyAction = {
            authorization: [
                {
                    actor: 'corecorecore',
                    permission: 'active',
                },
            ],
            account: 'eosio',
            name: 'setabi',
            data: {
                abi: Serializer.encode({object: ABI.from(raw)}),
                account: 'corecorecore',
            },
        }
        const {abi} = await jungle4.v1.chain.get_abi(untypedAction.account)
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
        const result = await jungle4.v1.chain.push_transaction(signedTransaction)
        assert.equal(result.transaction_id, transaction.id.hexString)

        const returned1 = await jungle4.v1.chain.get_abi('corecorecore')
        if (returned1 && returned1.abi) {
            const abi1 = ABI.from(returned1.abi)
            assert.instanceOf(abi1, ABI)
            assert.equal(abi1.action_results.length, 1)
        }

        const returned2 = await jungle4.v1.chain.get_raw_abi('corecorecore')
        if (returned2 && returned2.abi) {
            const abi1 = ABI.from(returned2.abi)
            assert.instanceOf(abi1, ABI)
            assert.equal(abi1.action_results.length, 1)
        }
    })
})
