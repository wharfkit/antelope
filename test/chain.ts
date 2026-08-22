import {assert} from 'chai'

import {
    ABI,
    ABIDef,
    Action,
    AnyTransaction,
    Asset,
    Authority,
    Blob,
    BlockId,
    BlockTimestamp,
    Bytes,
    Checksum160,
    Checksum256,
    Checksum512,
    Float32,
    Float64,
    Float128,
    Int32,
    Int64,
    Name,
    PackedTransaction,
    PermissionLevel,
    PublicKey,
    Serializer,
    Signature,
    SignedTransaction,
    Struct,
    TimePoint,
    TimePointSec,
    Transaction,
    UInt128,
    UInt32,
    UInt64,
    Variant,
} from '$lib'

suite('chain', function () {
    test('asset', function () {
        assert.equal(Asset.from('-1.2345 NEGS').toString(), '-1.2345 NEGS')
        assert.equal(Asset.from('-0.2345 NEGS').toString(), '-0.2345 NEGS')
        assert.equal(Asset.from('0.0000000000000 DUCKS').toString(), '0.0000000000000 DUCKS')
        assert.equal(Asset.from('99999999999 DUCKS').toString(), '99999999999 DUCKS')
        assert.equal(Asset.from('-99999999999 DUCKS').toString(), '-99999999999 DUCKS')
        assert.equal(Asset.from('-0.0000000000001 DUCKS').toString(), '-0.0000000000001 DUCKS')

        let asset = Asset.from(Asset.from('1.000000000 FOO'))
        assert.equal(asset.value, 1.0)
        asset.value += 0.000000001
        assert.equal(asset.value, 1.000000001)
        asset.value = -100
        assert.equal(asset.toString(), '-100.000000000 FOO')
        assert.equal(asset.units.toString(), '-100000000000')

        const symbol = Asset.Symbol.from(Asset.Symbol.from('10,K'))
        assert.equal(symbol.name, 'K')
        assert.equal(symbol.precision, '10')
        assert.equal(Asset.Symbol.from(symbol.value).toString(), symbol.toString())

        assert.throws(() => Asset.Symbol.from('0,0'))

        const nft_symbol = Asset.Symbol.from(Asset.Symbol.from('0,'))
        assert.equal(nft_symbol.name, '')
        assert.equal(nft_symbol.precision, 0)
        assert.equal(nft_symbol.value, 0)
        assert.isTrue(nft_symbol.code.value.equals(0))
        assert.equal(Asset.Symbol.from(nft_symbol).toString(), nft_symbol.toString())

        // test null asset
        asset = Asset.from('0 ')
        assert.equal(Number(asset.value), 0)
        assert.equal(String(asset), '0 ')

        asset = Asset.from(10, '4,POX')
        assert.equal(asset.value, 10)
        assert.equal(Number(asset.units), 100000)

        asset = Asset.fromUnits(1, '10,KEK')
        assert.equal(asset.value, 0.0000000001)
        asset.value += 0.0000000001
        assert.equal(Number(asset.units), 2)

        asset = Asset.from(3.004, '4,RAR')
        asset.value += 1
        assert.equal(asset.toString(), '4.0040 RAR')
        assert.equal(asset.value, 4.004)

        asset = Asset.from(3.004, '8,RAR')
        asset.value += 1
        assert.equal(asset.units.toNumber(), 400400000)
        assert.equal(asset.toString(), '4.00400000 RAR')
        assert.equal(asset.value, 4.004)

        assert.throws(() => {
            symbol.convertUnits(Int64.from('9223372036854775807'))
        })
        assert.throws(() => {
            Asset.from('')
        })
        assert.throws(() => {
            Asset.from('1POP')
        })
        assert.throws(() => {
            Asset.from('1.0000000000000000000000 BIGS')
        })
        assert.throws(() => {
            Asset.from('1.2 horse')
        })
        assert.throws(() => {
            Asset.Symbol.from('12')
        })
    })

    test('block id', function () {
        const string = '048865fb643bca3b644647177f0cf363f7956794d0a7ec3bc6d29d93d9637308'
        const blockId = BlockId.from(string)
        assert.equal(String(blockId), string)
        assert.equal(Number(blockId.blockNum), 76047867)
        assert.equal(blockId.blockNum.equals(76047867), true)
        assert.equal(blockId.blockNum.equals(UInt32.from(76047867)), true)
        const blockId2 = BlockId.fromBlockChecksum(
            '61375f2d5fbe6bbad86e424962a190e8309394b7bff4bf3e16b0a2a71e5a617c',
            7
        )
        assert.equal(
            String(blockId2),
            '000000075fbe6bbad86e424962a190e8309394b7bff4bf3e16b0a2a71e5a617c'
        )
        assert.equal(blockId2.blockNum.equals(7), true)
    })

    test('blob', function () {
        const expected = Bytes.from([0xbe, 0xef, 0xfa, 0xce])

        // Correct
        const string = 'vu/6zg=='
        const blob = Blob.from(string)
        assert.isTrue(Bytes.from(blob.array).equals(expected))

        // Wrong padding, ensure it still works
        const string2 = 'vu/6zg='
        const blob2 = Blob.from(string2)
        assert.isTrue(Bytes.from(blob2.array).equals(expected))

        const string3 = 'vu/6zg'
        const blob3 = Blob.from(string3)
        assert.isTrue(Bytes.from(blob3.array).equals(expected))

        const string4 = 'vu/6zg==='
        const blob4 = Blob.from(string4)
        assert.isTrue(Bytes.from(blob4.array).equals(expected))
    })

    test('float', function () {
        // float32 decodes to the stored 32-bit value widened to a double, matching nodeos
        const small = Serializer.decode({data: '2d740139', type: Float32})
        assert.equal(small.value, 0.0001234567753272131)
        assert.equal(String(small), '0.0001234567753272131')
        assert.equal(JSON.stringify(small), '"0.0001234567753272131"')
        assert.equal(Float32.from(small.toString()).value, small.value)
        const pi = Float32.from(3.1415925)
        assert.equal(String(pi), '3.1415925')
        assert.equal(String(Serializer.decode({data: Serializer.encode({object: pi}), type: Float32})), '3.141592502593994')
        const d = Float64.from(0.1 + 0.2)
        assert.equal(String(d), '0.30000000000000004')
        assert.equal(Float64.from(d.toString()).value, d.value)
    })

    test('float from accepts the infinity and nan spellings nodeos emits', function () {
        assert.equal(Float64.from('inf').value, Infinity)
        assert.equal(Float64.from('+inf').value, Infinity)
        assert.equal(Float64.from('infinity').value, Infinity)
        assert.equal(Float64.from('-inf').value, -Infinity)
        assert.equal(Float64.from('-infinity').value, -Infinity)
        assert.isNaN(Float64.from('nan').value)
        assert.equal(Float32.from('inf').value, Infinity)
        assert.equal(Float32.from('-inf').value, -Infinity)
        assert.isNaN(Float32.from('nan').value)
    })

    test('float from still parses ordinary numeric text', function () {
        assert.equal(Float64.from('1.5').value, 1.5)
        assert.equal(Float64.from('-0.25').value, -0.25)
        assert.equal(Float64.from('Infinity').value, Infinity)
    })

    test('float keeps the sign of negative zero in text', function () {
        assert.equal(String(Float64.from(-0)), '-0')
        assert.equal(String(Float32.from(-0)), '-0')
        assert.equal(JSON.stringify(Float64.from(-0)), '"-0"')
        assert.equal(String(Serializer.decode({data: '0000000000000080', type: Float64})), '-0')
        assert.equal(String(Float64.from(0)), '0')
    })

    test('float renders infinity and nan the way nodeos does', function () {
        assert.equal(String(Float64.from(Infinity)), 'inf')
        assert.equal(String(Float64.from(-Infinity)), '-inf')
        assert.equal(String(Float64.from('nan')), 'nan')
        assert.equal(String(Float32.from(Infinity)), 'inf')
        assert.equal(JSON.stringify(Float64.from(-Infinity)), '"-inf"')
        assert.equal(Float64.from(String(Float64.from(Infinity))).value, Infinity)
        assert.equal(Float64.from(String(Float64.from(-Infinity))).value, -Infinity)
    })

    test('float from a negative nan word carries the sign into bytes and text', function () {
        assert.equal(Serializer.encode({object: Float32.from('-nan')}).hexString, '0000c0ff')
        assert.equal(Serializer.encode({object: Float64.from('-nan')}).hexString, '000000000000f8ff')
        assert.equal(String(Float32.from('-nan')), '-nan')
        assert.equal(Serializer.encode({object: Float32.from('nan')}).hexString, '0000c07f')
        assert.equal(String(Float32.from('nan')), 'nan')
    })

    test('float renders a decoded negative nan with its sign', function () {
        assert.equal(String(Serializer.decode({data: '0000c0ff', type: Float32})), '-nan')
        assert.equal(String(Serializer.decode({data: '0000c07f', type: Float32})), 'nan')
        assert.equal(String(Serializer.decode({data: '000000000000f8ff', type: Float64})), '-nan')
    })

    test('float32 keeps the decoded bytes when the engine canonicalizes NaN', function () {
        const f = Serializer.decode({data: '0000c0ff', type: Float32}) as Float32
        f.value = NaN
        assert.equal(Serializer.encode({object: f}).hexString, '0000c0ff')
    })

    test('float64 keeps the decoded bytes when the engine canonicalizes NaN', function () {
        const f = Serializer.decode({data: '000000000000f8ff', type: Float64}) as Float64
        f.value = NaN
        assert.equal(Serializer.encode({object: f}).hexString, '000000000000f8ff')
    })

    test('float assigning a real number discards the decoded bytes', function () {
        const f = Serializer.decode({data: '0000c0ff', type: Float32}) as Float32
        f.value = 1.5
        assert.equal(Serializer.encode({object: f}).hexString, '0000c03f')
    })

    test('float NaN built from a number encodes as the chain default NaN', function () {
        assert.equal(Serializer.encode({object: Float32.from(NaN)}).hexString, '0000c0ff')
        assert.equal(Serializer.encode({object: Float64.from(NaN)}).hexString, '000000000000f8ff')
        assert.equal(Serializer.encode({object: Float64.from(0 / 0)}).hexString, '000000000000f8ff')
        assert.equal(String(Float64.from(NaN)), '-nan')
    })

    // Bit patterns below are read from the conformance contract at conform.gm, op fdtofq.
    test('float128 from double', function () {
        const bits = (value: number) => String(Float128.fromDouble(value))
        assert.equal(bits(0), '0x00000000000000000000000000000000')
        assert.equal(bits(-0), '0x00000000000000000000000000000080')
        assert.equal(bits(1), '0x0000000000000000000000000000ff3f')
        assert.equal(bits(-1), '0x0000000000000000000000000000ffbf')
        assert.equal(bits(2), '0x00000000000000000000000000000040')
        assert.equal(bits(0.5), '0x0000000000000000000000000000fe3f')
        assert.equal(bits(0.1), '0x00000000000000a0999999999999fb3f')
        assert.equal(bits(Infinity), '0x0000000000000000000000000000ff7f')
        assert.equal(bits(-Infinity), '0x0000000000000000000000000000ffff')
    })

    test('float128 from double widens subnormal doubles', function () {
        assert.equal(
            String(Float128.fromDouble(Number.MIN_VALUE)),
            '0x0000000000000000000000000000cd3b'
        )
    })

    test('float128 from nodeos decimal text', function () {
        assert.equal(
            String(Float128.fromDecimal('1.00000000000000000')),
            '0x0000000000000000000000000000ff3f'
        )
        assert.equal(
            String(Float128.fromDecimal('-1.00000000000000000')),
            '0x0000000000000000000000000000ffbf'
        )
        assert.equal(String(Float128.fromDecimal('0.5')), '0x0000000000000000000000000000fe3f')
        assert.equal(String(Float128.fromDecimal('inf')), '0x0000000000000000000000000000ff7f')
        assert.equal(String(Float128.fromDecimal('-inf')), '0x0000000000000000000000000000ffff')
    })

    test('float128 from keeps hex spellings on the hex path', function () {
        assert.equal(
            String(Float128.from('0x0000000000000000000000000000ff3f')),
            '0x0000000000000000000000000000ff3f'
        )
        assert.equal(
            String(Float128.from('0000000000000000000000000000ff3f')),
            '0x0000000000000000000000000000ff3f'
        )
        assert.equal(
            String(Float128.from(Float128.fromDouble(1))),
            '0x0000000000000000000000000000ff3f'
        )
    })

    test('float128 from routes nodeos decimal text to the decimal path', function () {
        assert.equal(
            String(Float128.from('1.00000000000000000')),
            '0x0000000000000000000000000000ff3f'
        )
        assert.equal(
            String(Float128.from('-1.00000000000000000')),
            '0x0000000000000000000000000000ffbf'
        )
        assert.equal(String(Float128.from('inf')), '0x0000000000000000000000000000ff7f')
        assert.equal(String(Float128.from('-inf')), '0x0000000000000000000000000000ffff')
    })

    test('float128 from still rejects a malformed hex string', function () {
        assert.throws(() => Float128.from('1234'))
        assert.throws(() => Float128.from('0xbeef'))
        assert.throws(() => Float128.from('nonsense'))
    })

    test('float128 from rejects decimal text nodeos would not emit', function () {
        assert.throws(() => Float128.from('1.1'))
        assert.throws(() => Float128.from('0.5'))
        assert.throws(() => Float128.from('1.0000000000000000'))
        assert.throws(() => Float128.from('1.000000000000000000'))
    })

    test('float128 fromDecimal accepts every spelling nodeos emits', function () {
        const bits = (text: string) => String(Float128.fromDecimal(text))
        assert.equal(bits('inf'), '0x0000000000000000000000000000ff7f')
        assert.equal(bits('+inf'), '0x0000000000000000000000000000ff7f')
        assert.equal(bits('infinity'), '0x0000000000000000000000000000ff7f')
        assert.equal(bits('+infinity'), '0x0000000000000000000000000000ff7f')
        assert.equal(bits('-inf'), '0x0000000000000000000000000000ffff')
        assert.equal(bits('-infinity'), '0x0000000000000000000000000000ffff')
    })

    test('float128 fromDecimal rejects words that merely end in nan', function () {
        assert.throws(() => Float128.fromDecimal('xnan'))
        assert.throws(() => Float128.fromDecimal('banan'))
        assert.throws(() => Float128.fromDecimal(''))
    })

    test('float128 bound hex is the byte reverse of the row spelling', function () {
        // nodeos reads a bound as a big-endian integer, the reverse of the row rendering.
        assert.equal(Float128.fromDouble(1).toBoundHex(), '0x3fff0000000000000000000000000000')
        assert.equal(Float128.fromDouble(-1).toBoundHex(), '0xbfff0000000000000000000000000000')
        assert.equal(Float128.fromDouble(0).toBoundHex(), '0x00000000000000000000000000000000')
        assert.equal(Float128.fromDouble(0.1).toBoundHex(), '0x3ffb999999999999a000000000000000')
        assert.equal(
            Float128.from('0x0000000000000000000000000000ff3f').toBoundHex(),
            '0x3fff0000000000000000000000000000'
        )
    })

    test('float128 NaN keeps the sign the text carries', function () {
        assert.equal(String(Float128.fromDouble(NaN)), '0x0000000000000000000000000080ff7f')
        assert.equal(String(Float128.fromDecimal('nan')), '0x0000000000000000000000000080ff7f')
        assert.equal(String(Float128.fromDecimal('-nan')), '0x0000000000000000000000000080ffff')
        assert.equal(String(Float128.from('-nan')), '0x0000000000000000000000000080ffff')
    })

    test('bytes', function () {
        assert.equal(Bytes.from('hello', 'utf8').toString('hex'), '68656c6c6f')
        assert.equal(Bytes.equal('beef', 'beef'), true)
        assert.equal(Bytes.equal('beef', 'face'), false)
        assert.equal(Bytes.from('68656c6c6f').toString('utf8'), 'hello')
        assert.equal(Bytes.from([0xff, 0x00, 0xff, 0x00]).copy().hexString, 'ff00ff00')
        assert.equal(
            Checksum256.hash(Bytes.from('hello world', 'utf8')).hexString,
            'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
        )
        assert.equal(
            Checksum512.hash(Bytes.from('hello world', 'utf8')).hexString,
            '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f' +
                '989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f'
        )
        assert.equal(
            Checksum160.hash(Bytes.from('hello world', 'utf8')).hexString,
            '98c615784ccb5fe5936fbc0cbe9dfdb408d92f0f'
        )
        assert.throws(() => {
            Bytes.from('numeris in culus', 'latin' as any)
        })
        assert.throws(() => {
            Bytes.from('babababa').toString('latin' as any)
        })
        assert.equal(Bytes.from('beef').zeropadded(4).toString('hex'), '0000beef')
        assert.equal(Bytes.from('beef').zeropadded(2).toString('hex'), 'beef')
        assert.equal(Bytes.from('beef').zeropadded(1).toString('hex'), 'beef')
        assert.equal(Bytes.from('beef').zeropadded(1, true).toString('hex'), 'be')
        assert.equal(Bytes.from('beef').zeropadded(2, true).toString('hex'), 'beef')
        assert.equal(Bytes.from('beef').zeropadded(3, true).toString('hex'), '00beef')
    })

    test('time', function () {
        const now = new Date()
        assert.equal(TimePoint.from(now).toMilliseconds(), now.getTime())
        assert.equal(
            TimePointSec.from(TimePointSec.from(now)).toMilliseconds() / 1000,
            Math.round(now.getTime() / 1000)
        )
        assert.throws(() => {
            TimePoint.from('blah')
        })
        assert.equal(BlockTimestamp.from('2021-08-25T02:37:24.500'), '2021-08-25T02:37:24.500')
        assert.equal(
            Math.round(BlockTimestamp.from(now).toMilliseconds() / 500),
            Math.round(now.getTime() / 500)
        )
    })

    test('transaction', function () {
        @Struct.type('transfer')
        class Transfer extends Struct {
            @Struct.field('name') from!: Name
            @Struct.field('name') to!: Name
            @Struct.field('asset') quantity!: Asset
            @Struct.field('string') memo!: string
        }
        const action = Action.from({
            authorization: [],
            account: 'eosio.token',
            name: 'transfer',
            data: Transfer.from({
                from: 'foo',
                to: 'bar',
                quantity: '1.0000 EOS',
                memo: 'hello',
            }),
        })
        const transaction = Transaction.from({
            ref_block_num: 0,
            ref_block_prefix: 0,
            expiration: 0,
            actions: [action],
        })
        assert.equal(
            transaction.id.hexString,
            '97b4d267ce0e0bd6c78c52f85a27031bd16def0920703ca3b72c28c2c5a1a79b'
        )
        const transfer = transaction.actions[0].decodeData(Transfer)
        assert.equal(String(transfer.from), 'foo')

        const signed = SignedTransaction.from({
            ...transaction,
            signatures: [
                'SIG_K1_KdNTcLLSyzUFC4AdMxEDn58X8ZN368euanvet4jucUdSPXvLkgsG32tpcqVvnDR9Xv1f7HsTm6kocjeZzFGvUSc2yCbdEA',
            ],
        })
        assert.equal(String(signed.id), String(transaction.id))
    })

    test('any transaction', function () {
        const tx: AnyTransaction = {
            delay_sec: 0,
            expiration: '2020-07-01T17:32:13',
            max_cpu_usage_ms: 0,
            max_net_usage_words: 0,
            ref_block_num: 55253,
            ref_block_prefix: 3306698594,
            actions: [
                {
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{actor: 'foo', permission: 'active'}],
                    data: {
                        from: 'donkeyhunter',
                        memo: 'Anchor is the best! Thank you <3',
                        quantity: '0.0001 EOS',
                        to: 'teamgreymass',
                    },
                },
            ],
        }
        const abi: ABIDef = {
            structs: [
                {
                    base: '',
                    name: 'transfer',
                    fields: [
                        {name: 'from', type: 'name'},
                        {name: 'to', type: 'name'},
                        {name: 'quantity', type: 'asset'},
                        {name: 'memo', type: 'string'},
                    ],
                },
            ],
            actions: [{name: 'transfer', type: 'transfer', ricardian_contract: ''}],
        }
        const r1 = Transaction.from(tx, abi)
        const r2 = Transaction.from(tx, [{abi, contract: 'eosio.token'}])
        assert.equal(r1.equals(r2), true)
        assert.deepEqual(
            JSON.parse(JSON.stringify(r1.actions[0].decodeData(abi))),
            tx.actions![0].data
        )
        assert.throws(() => {
            Transaction.from(tx)
        })
        assert.throws(() => {
            Transaction.from(tx, [{abi, contract: 'ethereum.token'}])
        })
    })
    test('random', function () {
        assert.doesNotThrow(() => {
            UInt128.random()
            Int32.random()
        })
        assert.equal(UInt128.random().byteArray.length, 16)
    })

    test('equality helpers', function () {
        this.slow(500)

        const name = Name.from('foo')
        assert.equal(name.equals('foo'), true)
        assert.equal(name.equals(UInt64.from('6712615244595724288')), true)
        assert.equal(name.equals(UInt64.from('12345')), false)
        assert.equal(name.equals('bar'), false)

        const num = UInt64.from('123456789')
        assert.equal(num.equals(123456789), true)
        assert.equal(num.equals('123456789'), true)
        assert.equal(num.equals('123456700'), false)
        assert.equal(num.equals(1), false)
        assert.equal(num.equals(UInt32.from(123456789)), true)
        assert.equal(num.equals(UInt32.from(123456789), true), false)
        assert.equal(num.equals(UInt128.from(123456789), true), false)
        assert.equal(num.equals(UInt128.from(123456789), false), true)
        assert.equal(num.equals(Int64.from(123456789), true), false)
        assert.equal(num.equals(-1), false)

        const checksum = Checksum160.hash(Bytes.from('hello', 'utf8'))
        assert.equal(checksum.equals('108f07b8382412612c048d07d13f814118445acd'), true)
        assert.equal(checksum.equals('108f07b8382412612c048d07d13f814118445abe'), false)

        const pubKey = PublicKey.from('EOS6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin')
        assert.equal(
            pubKey.equals('PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs'),
            true
        )

        const sig = Signature.from(
            'SIG_K1_JyMXe1HU42qN2aM7GPUf5XrAcAjWPbRoojzfsKq9Rgto3dGsRcCZ4UaPsAcFPS2faGQMpRoSTRX8WQQUDEA5TfWHj8sr6q'
        )
        assert.equal(
            sig.equals(
                'SIG_K1_JyMXe1HU42qN2aM7GPUf5XrAcAjWPbRoojzfsKq9Rgto3dGsRcCZ4UaPsAcFPS2faGQMpRoSTRX8WQQUDEA5TfWHj8sr6q'
            ),
            true
        )
        assert.equal(
            sig.equals(
                'SIG_R1_K5VEcCFUxF2jptQJUjVhV99PNiBXur6kdz6xuHtqvjqoTnzGqcCkEpD6cuA4q9DPdEHysdXjfksLB5xfkERxBuWxb9QJ8y'
            ),
            false
        )

        const perm = PermissionLevel.from('foo@bar')
        assert.equal(perm.equals(perm), true)
        assert.equal(perm.equals({actor: 'foo', permission: 'bar'}), true)
        assert.equal(perm.equals('bar@moo'), false)

        @Struct.type('my_struct')
        class MyStruct extends Struct {
            @Struct.field('string') hello!: string
        }
        const struct = MyStruct.from({hello: 'world'})
        assert.equal(struct.equals(struct), true)
        assert.equal(struct.equals({hello: 'world'}), true)
        assert.equal(struct.equals({hello: 'bollywod'}), false)

        @Variant.type('my_variant', ['string', 'int32'])
        class MyVariant extends Variant {
            value!: string | Int32
        }
        const variant = MyVariant.from('hello')
        assert.equal(variant.equals(variant), true)
        assert.equal(variant.equals('hello'), true)
        assert.equal(variant.equals('boo'), false)
        assert.equal(variant.equals(Int32.from(1)), false)
        assert.equal(variant.equals(MyVariant.from('haj')), false)

        @Struct.type('my_struct')
        class MyStructWithVariant extends Struct {
            @Struct.field(MyVariant) field!: MyVariant
        }
        const action = Action.from({
            account: 'foo',
            name: 'bar',
            authorization: [perm],
            data: MyStructWithVariant.from({
                field: variant,
            }),
        })
        assert.equal(action.equals(action), true)
        assert.equal(
            action.equals({
                account: 'foo',
                name: 'bar',
                authorization: [perm],
                data: {
                    field: 'hello',
                },
            }),
            true
        )
        assert.equal(
            action.equals({
                account: 'foo',
                name: 'bar',
                authorization: [perm],
                data: {
                    field: variant,
                },
            }),
            true
        )
        assert.equal(
            action.equals({
                account: 'foo',
                name: 'bar',
                authorization: [],
                data: {
                    field: variant,
                },
            }),
            false
        )
        assert.equal(
            action.equals({
                account: 'foo',
                name: 'bar',
                authorization: [{actor: 'maa', permission: 'jong'}],
                data: {
                    field: variant,
                },
            }),
            false
        )

        const time = TimePointSec.from(1)
        assert.equal(time.equals(time), true)
        assert.equal(time.equals('1970-01-01T00:00:01'), true)
        assert.equal(time.equals('2020-02-20T02:20:20'), false)
        assert.equal(time.equals(1), true)
        assert.equal(time.equals(2), false)
        assert.equal(time.equals(TimePoint.from(1 * 1000000)), true)
    })

    test('transaction signingDigest', async function () {
        const transaction = Transaction.from({
            expiration: '1970-01-01T00:00:00',
            ref_block_num: 0,
            ref_block_prefix: 0,
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
            context_free_actions: [],
            actions: [
                {
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{actor: 'corecorecore', permission: 'active'}],
                    data:
                        'a02e45ea52a42e4580b1915e5d268dcaba0100000000000004454f5300' +
                        '00000019656f73696f2d636f7265206973207468652062657374203c33',
                },
            ],
            transaction_extensions: [],
        })
        const chainId = Checksum256.from(
            '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840'
        )
        const digest1 = transaction.signingDigest(chainId)
        const digest2 = transaction.signingDigest(chainId.toString())
        assert.equal(digest1.equals(digest2), true)
        assert.equal(digest1.toString(), digest2.toString())
    })

    test('transaction signingData', async function () {
        const transaction = Transaction.from({
            expiration: '1970-01-01T00:00:00',
            ref_block_num: 0,
            ref_block_prefix: 0,
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
            context_free_actions: [],
            actions: [
                {
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{actor: 'corecorecore', permission: 'active'}],
                    data:
                        'a02e45ea52a42e4580b1915e5d268dcaba0100000000000004454f5300' +
                        '00000019656f73696f2d636f7265206973207468652062657374203c33',
                },
            ],
            transaction_extensions: [],
        })
        const chainId = Checksum256.from(
            '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840'
        )
        const data1 = transaction.signingData(chainId)
        const data2 = transaction.signingData(chainId.toString())
        assert.equal(data1.equals(data2), true)
        assert.equal(data1.toString(), data2.toString())
    })

    test('action with no arguments', function () {
        const abi = {
            structs: [{name: 'noop', base: '', fields: []}],
            actions: [
                {
                    name: 'noop',
                    type: 'noop',
                    ricardian_contract: '',
                },
            ],
        }
        const a1 = Action.from(
            {
                account: 'greymassnoop',
                name: 'noop',
                authorization: [{actor: 'greymassfuel', permission: 'cosign'}],
                data: '',
            },
            abi
        )
        const a2 = Action.from(
            {
                account: 'greymassnoop',
                name: 'noop',
                authorization: [{actor: 'greymassfuel', permission: 'cosign'}],
                data: {},
            },
            abi
        )
        const a3 = Action.from(
            {
                account: 'greymassnoop',
                name: 'noop',
                authorization: [{actor: 'greymassfuel', permission: 'cosign'}],
                data: [],
            },
            abi
        )
        assert.equal(a1.equals(a2), true)
        assert.equal(a1.equals(a3), true)
    })

    test('action retains abi (abi)', function () {
        const abi = {
            structs: [{name: 'noop', base: '', fields: []}],
            actions: [
                {
                    name: 'noop',
                    type: 'noop',
                    ricardian_contract: '',
                },
            ],
        }
        const action = Action.from(
            {
                account: 'greymassnoop',
                name: 'noop',
                authorization: [{actor: 'greymassfuel', permission: 'cosign'}],
                data: '',
            },
            abi
        )
        assert.instanceOf(action.abi, ABI)
    })

    test('action can deserialize itself from abi', function () {
        const abi = {
            structs: [
                {
                    name: 'transfer',
                    base: '',
                    fields: [
                        {
                            name: 'from',
                            type: 'name',
                        },
                        {
                            name: 'to',
                            type: 'name',
                        },
                        {
                            name: 'quantity',
                            type: 'asset',
                        },
                        {
                            name: 'memo',
                            type: 'string',
                        },
                    ],
                },
            ],
            actions: [
                {
                    name: 'transfer',
                    type: 'transfer',
                    ricardian_contract: '',
                },
            ],
        }

        const action = Action.from(
            {
                account: 'eosio.token',
                name: 'transfer',
                authorization: [{actor: 'foo', permission: 'bar'}],
                data: {
                    from: 'foo',
                    to: 'bar',
                    quantity: '1.0000 EOS',
                    memo: 'hello',
                },
            },
            abi
        )
        assert.instanceOf(action.abi, ABI)
        const decoded = action.decoded
        assert.instanceOf(decoded.account, Name)
        assert.instanceOf(decoded.name, Name)
        assert.instanceOf(decoded.authorization, Array)
        assert.instanceOf(decoded.authorization[0], PermissionLevel)
        assert.instanceOf(decoded.data.from, Name)
        assert.instanceOf(decoded.data.to, Name)
        assert.instanceOf(decoded.data.quantity, Asset)
    })

    test('action retains abi (struct)', function () {
        @Struct.type('transfer')
        class Transfer extends Struct {
            @Struct.field('name') from!: Name
            @Struct.field('name') to!: Name
            @Struct.field('asset') quantity!: Asset
            @Struct.field('string') memo!: string
        }

        const data = Transfer.from({
            from: 'foo',
            to: 'bar',
            quantity: '1.0000 EOS',
            memo: 'hello',
        })

        const action = Action.from({
            authorization: [],
            account: 'eosio.token',
            name: 'transfer',
            data,
        })
        assert.instanceOf(action.abi, ABI)

        const transaction = Transaction.from({
            ref_block_num: 0,
            ref_block_prefix: 0,
            expiration: 0,
            actions: [action],
        })

        assert.instanceOf(transaction.actions[0].abi, ABI)
        assert.isTrue(action.equals(transaction.actions[0]))
        assert.isTrue(transaction.actions[0].equals(action))
        assert.isTrue(
            data.equals(
                Serializer.decode({
                    data: transaction.actions[0].data,
                    abi: transaction.actions[0].abi,
                    type: String(transaction.actions[0].name),
                })
            )
        )
    })

    test('action can deserialize itself from struct', function () {
        @Struct.type('transfer')
        class Transfer extends Struct {
            @Struct.field('name') from!: Name
            @Struct.field('name') to!: Name
            @Struct.field('asset') quantity!: Asset
            @Struct.field('string') memo!: string
        }
        const data = Transfer.from({
            from: 'foo',
            to: 'bar',
            quantity: '1.0000 EOS',
            memo: 'hello',
        })

        const action = Action.from({
            authorization: [
                {
                    actor: 'foo',
                    permission: 'bar',
                },
            ],
            account: 'eosio.token',
            name: 'transfer',
            data,
        })
        assert.instanceOf(action.abi, ABI)
        const decoded = action.decoded
        assert.instanceOf(decoded.account, Name)
        assert.instanceOf(decoded.name, Name)
        assert.instanceOf(decoded.authorization, Array)
        assert.instanceOf(decoded.authorization[0], PermissionLevel)
        assert.instanceOf(decoded.data.from, Name)
        assert.instanceOf(decoded.data.to, Name)
        assert.instanceOf(decoded.data.quantity, Asset)
    })

    test('authority sorts mixed K1 and WA keys', function () {
        // Reported in wharfkit/antelope#8, where localeCompare returns the wrong order.
        const auth = Authority.from({
            threshold: 1,
            keys: [
                'EOS5fMyAUopVJv88Wb4szbLH2ds65jiNCjv1XWRRyvrfR6oEBdZXk',
                'PUB_WA_323xpHU17pKZ6VsygcdXxq7cgosxSyRU5KGevyjUNtw4m9Y63EzPs3SEVpsf7rjeVLa7',
                'PUB_WA_4B6ZbE2hxTvcrndvS8758EjGqRMQqVoV4vBTGgvqi27HNw8xyQz6viKrGLNLcaiRmhmbuyu584Hf',
                'PUB_WA_4vD5irsd1GdmTEhea5G8QideW3NqU8F5zgPLyD3wKDE7MUPAwo5nELCEbJEELDafLeV4Uz7djSFJ',
                'PUB_WA_5Q6G5dqajZDkqDbgEUG7a7qMpe94P6LegYdf7h8yL9efjhC6ERWuFsJM1ueygEmXzaELBokrUeH8',
                'PUB_WA_6wUAAJXLFc3edKhGb5DdWb3WmoLxLwFSspdiEYHvT6DN2X7zo6opCfv6TcAifvxRQdVYwcr84zMS',
            ].map((key) => ({key, weight: 1})),
        })
        assert.deepEqual(
            auth.keys.map((kw) => String(kw.key)),
            [
                'PUB_K1_5fMyAUopVJv88Wb4szbLH2ds65jiNCjv1XWRRyvrfR6oDcpM7y',
                'PUB_WA_4B6ZbE2hxTvcrndvS8758EjGqRMQqVoV4vBTGgvqi27HNw8xyQz6viKrGLNLcaiRmhmbuyu584Hf',
                'PUB_WA_4vD5irsd1GdmTEhea5G8QideW3NqU8F5zgPLyD3wKDE7MUPAwo5nELCEbJEELDafLeV4Uz7djSFJ',
                'PUB_WA_5Q6G5dqajZDkqDbgEUG7a7qMpe94P6LegYdf7h8yL9efjhC6ERWuFsJM1ueygEmXzaELBokrUeH8',
                'PUB_WA_323xpHU17pKZ6VsygcdXxq7cgosxSyRU5KGevyjUNtw4m9Y63EzPs3SEVpsf7rjeVLa7',
                'PUB_WA_6wUAAJXLFc3edKhGb5DdWb3WmoLxLwFSspdiEYHvT6DN2X7zo6opCfv6TcAifvxRQdVYwcr84zMS',
            ]
        )
    })

    test('authority sorts accounts and waits', function () {
        const auth = Authority.from({
            threshold: 1,
            accounts: [
                {permission: {actor: 'zzz', permission: 'active'}, weight: 1},
                {permission: {actor: 'aaa', permission: 'zzz'}, weight: 1},
                {permission: {actor: 'aaa', permission: 'active'}, weight: 1},
            ],
            waits: [
                {wait_sec: 3600, weight: 1},
                {wait_sec: 60, weight: 1},
                {wait_sec: 86400, weight: 1},
            ],
        })
        assert.deepEqual(
            auth.accounts.map((a) => String(a.permission)),
            ['aaa@active', 'aaa@zzz', 'zzz@active']
        )
        assert.deepEqual(
            auth.waits.map((w) => Number(w.wait_sec)),
            [60, 3600, 86400]
        )
    })

    test('authority', function () {
        const auth = Authority.from({
            threshold: 21,
            keys: [
                {
                    key: 'EOS6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin',
                    weight: 20,
                },
                {
                    key: 'PUB_R1_82ua5qburg82c9eWY1qZVNUAAD6VPHsTMoPMGDrk7s4BQgxEoc',
                    weight: 2,
                },
            ],
            waits: [{wait_sec: 10, weight: 1}],
        })
        assert.ok(auth.hasPermission('EOS6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin'))
        assert.ok(
            auth.hasPermission('PUB_R1_82ua5qburg82c9eWY1qZVNUAAD6VPHsTMoPMGDrk7s4BQgxEoc', true)
        )
        assert.ok(!auth.hasPermission('PUB_R1_82ua5qburg82c9eWY1qZVNUAAD6VPHsTMoPMGDrk7s4BQgxEoc'))
        assert.ok(!auth.hasPermission('PUB_K1_6E45rq9ZhnvnWNTNEEexpM8V8rqCjggUWHXJBurkVQSnEyCHQ9'))
        assert.ok(
            !auth.hasPermission('PUB_K1_6E45rq9ZhnvnWNTNEEexpM8V8rqCjggUWHXJBurkVQSnEyCHQ9', true)
        )
    })

    test('packed transaction', function () {
        // uncompressed packed transaction
        const uncompressed = PackedTransaction.from({
            packed_trx:
                '34b6c664cb1b3056b588000000000190e2a51c5f25af590000000000e94c4402308db3ee1bf7a88900000000a8ed3232e04c9bae3b75a88900000000a8ed323210e04c9bae3b75a889529e9d0f0001000000',
        })
        assert.instanceOf(uncompressed.getTransaction(), Transaction)

        // zlib compressed packed transation
        const compressedString =
            '78dacb3d782c659f64208be036062060345879fad9aa256213401c8605cb2633322c79c8c0e8bd651e88bfe2ad9191204c80e36d735716638b77330300024516b4'

        // This is a compressed transaction and should throw since it cannot be read without a compression flag
        const compressedError = PackedTransaction.from({
            packed_trx: compressedString,
        })
        assert.throws(() => compressedError.getTransaction())

        // This is a compressed transaction and should succeed since it has a compression flag
        const compressedSuccess = PackedTransaction.from({
            compression: 1,
            packed_trx: compressedString,
        })
        assert.instanceOf(compressedSuccess.getTransaction(), Transaction)
    })

    test('fixed size array', function () {
        const data = {
            version: 'eosio::abi/1.2',
            types: [],
            structs: [
                {
                    name: 'basic',
                    base: '',
                    fields: [
                        {
                            name: 'input',
                            type: 'int32',
                        },
                    ],
                },
                {
                    name: 'array',
                    base: '',
                    fields: [
                        {
                            name: 'input',
                            type: 'int32[]',
                        },
                    ],
                },
                {
                    name: 'fixed',
                    base: '',
                    fields: [
                        {
                            name: 'input',
                            type: 'int32[4]',
                        },
                    ],
                },
            ],
            actions: [
                {
                    name: 'basic',
                    type: 'basic',
                    ricardian_contract: '',
                },
                {
                    name: 'array',
                    type: 'array',
                    ricardian_contract: '',
                },
                {
                    name: 'fixed',
                    type: 'fixed',
                    ricardian_contract: '',
                },
            ],
            tables: [],
            ricardian_clauses: [],
            error_messages: [],
            abi_extensions: [],
            variants: [],
            action_results: [
                {
                    name: 'basic',
                    result_type: 'int32',
                },
                {
                    name: 'array',
                    result_type: 'int32[]',
                },
                {
                    name: 'fixed',
                    result_type: 'int32[4]',
                },
            ],
        }

        const abi = ABI.from(data)
        assert.isTrue(abi.equals(data))
        assert.equal(abi.structs[0].fields[0].type, 'int32')
        assert.equal(abi.structs[1].fields[0].type, 'int32[]')
        assert.equal(abi.structs[2].fields[0].type, 'int32[4]')
        assert.equal(abi.action_results[0].result_type, 'int32')
        assert.equal(abi.action_results[1].result_type, 'int32[]')
        assert.equal(abi.action_results[2].result_type, 'int32[4]')

        const encoded = Serializer.encode({object: abi})
        const decoded = Serializer.decode({data: encoded, type: ABI})
        assert.isTrue(decoded.equals(data))
        assert.equal(decoded.structs[0].fields[0].type, 'int32')
        assert.equal(decoded.structs[1].fields[0].type, 'int32[]')
        assert.equal(decoded.structs[2].fields[0].type, 'int32[4]')
        assert.equal(decoded.action_results[0].result_type, 'int32')
        assert.equal(decoded.action_results[1].result_type, 'int32[]')
        assert.equal(decoded.action_results[2].result_type, 'int32[4]')

        assert.equal(
            '01000000',
            Serializer.encode({object: {input: 1}, abi, type: 'basic'}).hexString
        )

        assert.equal(
            '0401000000020000000300000004000000',
            Serializer.encode({object: {input: [1, 2, 3, 4]}, abi, type: 'array'}).hexString
        )

        assert.equal(
            '01000000020000000300000004000000',
            Serializer.encode({object: {input: [1, 2, 3, 4]}, abi, type: 'fixed'}).hexString
        )
    })

    test('action does not exist in ABI', function () {
        assert.throws(() =>
            Action.from(
                {
                    account: 'foo',
                    name: 'bar',
                    authorization: [{actor: 'foo', permission: 'bar'}],
                    data: {},
                },
                {}
            )
        )
    })
})
