import * as assert from 'assert'
import 'mocha'

import {Asset} from '../src/chain/asset'
import {Int64} from '../src/chain/integer'

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
})
