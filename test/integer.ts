import {assert} from 'chai'

import {Int, Int128, Int16, Int32, Int64, Int8, UInt128, UInt16, UInt32, UInt64, UInt8} from '$lib'

suite('integer', function () {
    test('from', function () {
        assertInt(Int8.from(850, 'truncate'), 82)
        assertInt(Int16.from(Int8.from(82), 'truncate'), 82)
        assertInt(UInt8.from(-100, 'truncate'), 156)
        assertInt(Int16.from(-100, 'truncate'), -100)
        assertInt(UInt16.from(-100, 'truncate'), 65436)
        assertInt(Int16.from(4294967196, 'truncate'), -100)
        assertInt(UInt64.from(-100, 'truncate'), '18446744073709551516')
        assertInt(Int64.from(-100, 'truncate'), -100)
        assertInt(UInt64.from(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER)
        assertInt(Int32.from('-1985000104'), -1985000104)
        assert.throws(() => UInt32.from(-1985000104), /underflow/)
        assertInt(UInt32.from(-1985000104, 'clamp'), 0)
        assertInt(UInt32.from('18446744073709551516', 'truncate'), 4294967196)
        assertInt(UInt32.from('18446744073709551516', 'clamp'), 4294967295)
        assert.throws(() => UInt32.from('18446744073709551516'), /overflow/)
        assert.throws(() => Int8.from(200), /overflow/)
        assert.throws(() => Int8.from(200), /overflow/)
        assert.throws(() => UInt16.from(65536), /overflow/)
        assert.throws(() => Int64.from('12345678900000000000'), /overflow/)
        assert.throws(() => UInt128.from('-42'), /underflow/)
        assert.throws(() => UInt8.from(-1), /underflow/)
        assert.throws(() => Int16.from(-32799), /underflow/)
        assert.throws(() => UInt128.from('banana'), /invalid/i)
    })

    test('cast', function () {
        assertInt(Int32.from('-4890').cast(UInt64), '18446744073709546726')

        assertInt(UInt8.from(1).cast(Int32), 1)
        assertInt(Int32.from(-100).cast(UInt64), '18446744073709551516')
        assertInt(Int64.from(-100000).cast(Int8), 96)
        assertInt(
            UInt128.from('340282366920938463463374607431768211455').cast(UInt64),
            '18446744073709551615'
        )
        assertInt(UInt128.from('559900').cast(Int8), 28)
        assertInt(UInt8.from(200).cast(Int8), -56)
        assertInt(UInt8.from(200).cast(Int8, 'clamp'), 127)
        assertInt(Int8.from(-56).cast(UInt8), 200)
        assertInt(Int8.from(-56).cast(UInt8, 'clamp'), 0)
        assertInt(UInt8.from(200).cast(Int8), -56)
        assert.throws(() => {
            Int8.from(-56).cast(UInt8, 'throw')
        })
        assert.throws(() => {
            UInt8.from(200).cast(Int8, 'throw')
        }, /overflow/)
        assert.throws(() => {
            Int8.from(-1).cast(UInt8, 'throw')
        }, /underflow/)
    })

    test('add', function () {
        const a = UInt8.from(10)
        const b = Int8.from(-20)
        const c = a.adding(b).cast(Int8)
        assertInt(c, -10)
        c.add(1000)
        assertInt(c, -34)
        assertInt(UInt32.from(4000000000).adding(Int128.from(1)), 4000000001)
    })

    test('subtract', function () {
        const a = Int8.from(100)
        const b = UInt64.from(5000)
        b.subtract(10)
        const c = a.subtracting(b)
        assertInt(c, '-26')
        assertInt(
            UInt64.from(-1, 'truncate').subtracting(Int128.from('19446744070000000000')),
            '17446744077419103231'
        )
    })

    test('multiply', function () {
        const a = UInt8.from(100)
        const b = Int64.from(5000)
        b.multiply(2)
        const c = a.multiplying(b)
        assertInt(c, 64)
        assertInt(
            Int128.from('52342352348378372732', 'truncate')
                .multiplying(Int64.from('19446744070000'))
                .cast(Int64),
            '4721481336455838272'
        )
    })

    test('divide', function () {
        const v = Int32.from(10)
        v.divide(2)
        assertInt(v.dividing(3), 1)
        assertInt(v.dividing(4), 1)
        assertInt(v.dividing(3, 'ceil'), 2)
        assertInt(v.dividing(4, 'ceil'), 2)
        assertInt(v.dividing(3, 'round'), 2)
        assertInt(v.dividing(4, 'round'), 1)
        const v2 = Int64.from('1000000000000000000')
        v2.divide(2)
        assertInt(v2.dividing('300000000000000000'), 1)
        assertInt(v2.dividing('400000000000000000'), 1)
        assertInt(v2.dividing('300000000000000000', 'ceil'), 2)
        assertInt(v2.dividing('400000000000000000', 'ceil'), 2)
        assertInt(v2.dividing('300000000000000000', 'round'), 2)
        assertInt(v2.dividing('400000000000000000', 'round'), 1)
        v2.divide(-100000000000)
        assertInt(v2, -5000000)
        assertInt(
            Int64.from(-5000000000)
                .multiplying(2)
                .dividing(UInt32.from(-1, 'truncate'))
                .cast(Int16),
            -2
        )
        assertInt(Int8.from(127).dividing(-2).cast(UInt8), 193)
        assertInt(UInt32.from(-1, 'truncate').dividing(Int8.from(2), 'ceil'), 2147483648)
        assertInt(Int32.from(1).dividing(UInt128.from(1), 'ceil'), 1)
        assertInt(Int32.from(-2).dividing(Int128.from(-1), 'ceil'), 2)
        assertInt(Int32.from(-2).dividing(Int16.from(10), 'ceil'), 1)
        assertInt(Int32.from(100).dividing(Int8.from(-99), 'ceil'), -2)
        assert.throws(() => {
            UInt128.from(100).divide(0, 'round')
        }, /Division by zero/)
        assert.throws(() => {
            Int8.from(100).divide(0)
        }, /Division by zero/)
        assert.throws(() => {
            Int64.from(100).divide(0, 'ceil')
        }, /Division by zero/)
    })

    test('greater than', function () {
        assert.isTrue(Int8.from(10).gt(Int8.from(5)))
        assert.isTrue(Int64.from(10).gt(Int8.from(5)))
        assert.isTrue(Int8.from(10).gt(Int64.from(5)))
    })

    test('less than', function () {
        assert.isTrue(Int8.from(5).lt(Int8.from(10)))
        assert.isTrue(Int64.from(5).lt(Int8.from(10)))
        assert.isTrue(Int8.from(5).lt(Int64.from(10)))
    })

    test('greater than or equal', function () {
        assert.isTrue(Int8.from(10).gte(Int8.from(5)))
        assert.isTrue(Int64.from(10).gte(Int8.from(5)))
        assert.isTrue(Int8.from(10).gte(Int64.from(5)))
        assert.isTrue(Int8.from(10).gte(Int8.from(10)))
        assert.isTrue(Int64.from(10).gte(Int8.from(10)))
        assert.isTrue(Int8.from(10).gte(Int64.from(10)))
    })

    test('less than or equal', function () {
        assert.isTrue(Int8.from(5).lte(Int8.from(10)))
        assert.isTrue(Int64.from(5).lte(Int8.from(10)))
        assert.isTrue(Int8.from(5).lte(Int64.from(10)))
        assert.isTrue(Int8.from(10).lte(Int8.from(10)))
        assert.isTrue(Int64.from(10).lte(Int8.from(10)))
        assert.isTrue(Int8.from(10).lte(Int64.from(10)))
    })

    test('to primitive', function () {
        const smallValue = UInt64.from('1459536')
        assert.equal(String(smallValue), '1459536')
        assert.equal(Number(smallValue), 1459536)
        assert.equal(JSON.stringify(smallValue), '1459536')
        const bigValue = UInt64.from('14595364149838066048')
        assert.equal(String(bigValue), '14595364149838066048')
        assert.equal(JSON.stringify(bigValue), '"14595364149838066048"')
        assert.throws(() => {
            assert.ok(Number(bigValue))
        }, /Number can only safely store up to 53 bits/)
    })

    test('zero', function () {
        assert.isTrue(Int8.from(0).equals(Int8.zero))
        assert.isTrue(Int16.from(0).equals(Int16.zero))
        assert.isTrue(Int32.from(0).equals(Int32.zero))
        assert.isTrue(Int64.from(0).equals(Int64.zero))
        assert.isTrue(Int128.from(0).equals(Int128.zero))
        assert.isTrue(UInt8.from(0).equals(UInt8.zero))
        assert.isTrue(UInt16.from(0).equals(UInt16.zero))
        assert.isTrue(UInt32.from(0).equals(UInt32.zero))
        assert.isTrue(UInt64.from(0).equals(UInt64.zero))
        assert.isTrue(UInt128.from(0).equals(UInt128.zero))
    })
})

function assertInt(actual: Int, expected: number | string) {
    const type = actual.constructor as typeof Int
    const message = `Expected value of type ${type.abiName} to be equal`
    if (typeof expected === 'string') {
        assert.equal(String(actual), expected, message)
    } else {
        assert.equal(Number(actual), expected, message)
    }
}
