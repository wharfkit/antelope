import * as assert from 'assert'
import 'mocha'

import {Action} from '../src/chain/action'
import {Asset} from '../src/chain/asset'
import {Bytes} from '../src/chain/bytes'
import {Int64} from '../src/chain/integer'
import {Name} from '../src/chain/name'
import {Struct} from '../src/chain/struct'
import {TimePoint, TimePointSec} from '../src/chain/time'
import {Transaction} from '../src/chain/transaction'

suite('chain', function () {
    test('asset', function () {
        assert.equal(Asset.from('-1.2345 NEGS').toString(), '-1.2345 NEGS')
        assert.equal(Asset.from('-0.2345 NEGS').toString(), '-0.2345 NEGS')
        assert.equal(Asset.from('0.0000000000000 DUCKS').toString(), '0.0000000000000 DUCKS')
        assert.equal(Asset.from('99999999999 DUCKS').toString(), '99999999999 DUCKS')
        assert.equal(Asset.from('-99999999999 DUCKS').toString(), '-99999999999 DUCKS')
        assert.equal(Asset.from('-0.0000000000001 DUCKS').toString(), '-0.0000000000001 DUCKS')

        const asset = Asset.from(Asset.from('1.000000000 FOO'))
        assert.equal(asset.value, 1.0)
        asset.value += 0.000000001
        assert.equal(asset.value, 1.000000001)
        asset.value += 0.000000000999 // truncates outside precision
        assert.equal(asset.value, 1.000000001)
        asset.value = -100
        assert.equal(asset.toString(), '-100.000000000 FOO')
        assert.equal(asset.units.toString(), '-100000000000')

        const symbol = Asset.Symbol.from(Asset.Symbol.from('10,K'))
        assert.equal(symbol.name, 'K')
        assert.equal(symbol.precision, '10')
        assert.equal(Asset.Symbol.from(symbol.value).toString(), symbol.toString())

        assert.throws(() => {
            symbol.convertUnits(Int64.from('9223372036854775807'))
        })
        assert.throws(() => {
            symbol.convertFloat(9.223372037e17)
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
        assert.throws(() => {
            Asset.Symbol.from('4,')
        })
    })

    test('bytes', function () {
        assert.equal(Bytes.from('hello', 'utf8').toString('hex'), '68656c6c6f')
        assert.equal(Bytes.equal('beef', 'beef'), true)
        assert.equal(Bytes.equal('beef', 'face'), false)
        assert.equal(Bytes.from('68656c6c6f').toString('utf8'), 'hello')
        assert.equal(Bytes.from([0xff, 0x00, 0xff, 0x00]).copy().hexString, 'ff00ff00')
        assert.equal(
            Bytes.from('hello world', 'utf8').sha256Digest.hexString,
            'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
        )
        assert.equal(
            Bytes.from('hello world', 'utf8').sha512Digest.hexString,
            '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f' +
                '989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f'
        )
        assert.equal(
            Bytes.from('hello world', 'utf8').ripemd160Digest.hexString,
            '98c615784ccb5fe5936fbc0cbe9dfdb408d92f0f'
        )
        assert.throws(() => {
            Bytes.from('numeris in culus', 'latin' as any)
        })
        assert.throws(() => {
            Bytes.from('babababa').toString('latin' as any)
        })
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
    })
})
