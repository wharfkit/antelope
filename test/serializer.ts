import * as assert from 'assert'
import 'mocha'

import {Serializer} from '../src/serializer'

import {Name} from '../src/chain/name'
import {ABI} from '../src/chain/abi'
import {Int32, UInt256, UInt64, UInt8} from '../src/chain/integer'
import {Asset} from '../src/chain/asset'
import {PublicKey} from '../src/chain/public-key'
import {Signature} from '../src/chain/signature'
import {Struct} from '../src/chain/struct'
import {TimePoint, TimePointSec} from '../src/chain/time'
import {Variant} from '../src/chain/variant'
import {TypeAlias} from '../src/chain/type-alias'
import {Transaction} from '../src/chain/transaction'

suite('serializer', function () {
    test('array', function () {
        const data = '0303666f6f036261720362617a'
        const array = ['foo', 'bar', 'baz']
        assert.equal(Serializer.encode({object: array, type: 'string[]'}).hexString, data)
        assert.deepEqual(Serializer.decode({data, type: 'string[]'}), array)
        assert.throws(() => {
            Serializer.encode({object: 'banana', type: 'string[]'})
        })
        assert.throws(() => {
            Serializer.decode({object: 'banana', type: 'string[]'})
        })
        class CustomType extends Struct {
            static abiName = 'custom'
            static abiFields = [{name: 'foo', type: 'string[]'}]
            foo!: string[]
        }
        const customArray = ['hello', 'world'].map((s) => {
            return CustomType.from({foo: s.split('')})
        })
        assert.equal(
            Serializer.encode({
                object: customArray,
                type: 'custom[]',
                customTypes: [CustomType],
            }).hexString,
            '020501680165016c016c016f050177016f0172016c0164'
        )
        assert.equal(
            Serializer.encode({
                object: customArray,
            }).hexString,
            '020501680165016c016c016f050177016f0172016c0164'
        )
        assert.equal(
            Serializer.encode({
                object: [{foo: ['h', 'e', 'l', 'l', 'o']}, {foo: ['w', 'o', 'r', 'l', 'd']}],
                type: 'custom[]',
                customTypes: [CustomType],
            }).hexString,
            '020501680165016c016c016f050177016f0172016c0164'
        )
        assert.throws(() => {
            Serializer.encode({object: [Name.from('foo'), false]})
        })
        assert.throws(() => {
            Serializer.encode({object: [1, 2] as any})
        })
    })

    test('name', function () {
        const data = '000000005c73285d'
        const object = Name.from('foobar')
        const json = '"foobar"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.deepEqual(Serializer.decode({data, type: Name}), object)
        assert.deepEqual(Serializer.decode({json, type: 'name'}), object)
        assert.deepEqual(Name.from(UInt64.from('6712742083569909760')), object)
        assert.equal(JSON.stringify(object), json)
        assert.equal(object.rawValue.toString(), '6712742083569909760')
    })

    test('asset', function () {
        const data = '393000000000000004464f4f00000000'
        const object = Asset.from('1.2345 FOO')
        const json = '"1.2345 FOO"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: Asset})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'asset'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('asset symbol', function () {
        const data = '04464f4f00000000'
        const object = Asset.Symbol.from('4,FOO')
        const json = '"4,FOO"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: Asset.Symbol})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'symbol'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('struct', function () {
        const abi = ABI.from({
            structs: [
                {
                    base: '',
                    name: 'foo',
                    fields: [
                        {name: 'one', type: 'string'},
                        {name: 'two', type: 'int8'},
                    ],
                },
                {
                    base: 'foo',
                    name: 'bar',
                    fields: [
                        {name: 'three', type: 'name?'},
                        {name: 'four', type: 'string[]?'},
                    ],
                },
            ],
        })
        const object = {
            one: 'one',
            two: 2,
            three: 'two',
            four: ['f', 'o', 'u', 'r'],
        }
        const enc = Serializer.encode({object, abi, type: 'bar'})
        assert.equal(enc.hexString, '036f6e65020100000000000028cf01040166016f01750172')
        const dec = Serializer.decode({data: enc, type: 'bar', abi})
        assert.equal(
            JSON.stringify(dec),
            '{"one":"one","two":2,"three":"two","four":["f","o","u","r"]}'
        )
    })

    test('struct object', function () {
        class Other extends Struct {
            static abiName = 'other'
            static abiFields = [{name: 'doeet', type: 'bool'}]
            doeet!: boolean
        }
        class Test extends Struct {
            static abiName = 'test'
            static abiFields = [
                {name: 'foo', type: Name},
                {name: 'things', type: 'string[]'},
                {name: 'keys', type: PublicKey, optional: true, array: true},
                {name: 'other', type: Other},
            ]
            foo!: Name
            things!: string[]
            keys?: PublicKey[]
            other!: Other
        }
        const object = Test.from({foo: 'bar', things: ['a', 'b', 'c'], other: {doeet: true}})
        const encoded = Serializer.encode({object})
        assert.equal(encoded.hexString, '000000000000ae39030161016201630001')
        const decoded = Serializer.decode({data: encoded, type: Test})
        assert.equal(
            JSON.stringify(decoded),
            '{"foo":"bar","things":["a","b","c"],"keys":null,"other":{"doeet":true}}'
        )
    })

    test('struct decorators', function () {
        @Struct.type('transfer')
        class Transfer extends Struct {
            @Struct.field('name') from!: Name
            @Struct.field('name') to!: Name
            @Struct.field('asset') quantity!: Asset
            @Struct.field('string') memo!: string
        }

        const transfer = Transfer.from({
            from: 'alice',
            to: 'bob',
            quantity: '3.5 GMZ',
            memo: 'for you',
        })

        transfer.quantity.value += 38.5

        assert.equal(
            Serializer.encode({object: transfer}).hexString,
            '0000000000855c340000000000000e3da40100000000000001474d5a0000000007666f7220796f75'
        )

        assert.equal(
            JSON.stringify(transfer),
            '{"from":"alice","to":"bob","quantity":"42.0 GMZ","memo":"for you"}'
        )
    })

    test('untyped struct', function () {
        const object = {
            name: Name.from('foobar'),
            string: 'hello',
            flag: false,
            nest: {
                grains: UInt256.from('75000000000000000000000'),
            },
        }
        assert.equal(
            Serializer.encode({object}).hexString,
            '000000005c73285d0568656c6c6f000000e038f8e815c2e10f00000000000000000000000000000000000000000000'
        )
        assert.throws(() => {
            Serializer.encode({
                object: {
                    numbers: 123 as any,
                },
            })
        })
    })

    test('string', function () {
        const data = '0b68656c6c6f20776f726c64'
        const object = 'hello world'
        const json = '"hello world"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: 'string'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('bool', function () {
        const data = '01'
        const object = true
        const json = 'true'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: 'bool'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('public key', function () {
        const data = '000223e0ae8aacb41b06dc74af1a56b2eb69133f07f7f75bd1d5e53316bff195edf4'
        const object = PublicKey.from('PUB_K1_5AHoNnWetuDhKWSDx3WUf8W7Dg5xjHCMc4yHmmSiaJCFvvAgnB')
        const json = '"PUB_K1_5AHoNnWetuDhKWSDx3WUf8W7Dg5xjHCMc4yHmmSiaJCFvvAgnB"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: PublicKey})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'public_key'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('signature', function () {
        const data =
            '00205150a67288c3b393fdba9061b05019c54b12bdac295fc83bebad7cd63c7bb67d5cb8cc220564da006240a58419f64d06a5c6e1fc62889816a6c3dfdd231ed389'
        const object = Signature.from(
            'SIG_K1_KfPLgpw35iX8nfDzhbcmSBCr7nEGNEYXgmmempQspDJYBCKuAEs5rm3s4ZuLJY428Ca8ZhvR2Dkwu118y3NAoMDxhicRj9'
        )
        const json =
            '"SIG_K1_KfPLgpw35iX8nfDzhbcmSBCr7nEGNEYXgmmempQspDJYBCKuAEs5rm3s4ZuLJY428Ca8ZhvR2Dkwu118y3NAoMDxhicRj9"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: Signature})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'signature'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('time point', function () {
        const data = 'f8b88a3cd5620400'
        const object = TimePoint.from(1234567890123000)
        const json = '"2009-02-13T23:31:30.123"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: TimePoint})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'time_point'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('time point sec', function () {
        const data = 'd2029649'
        const object = TimePointSec.from(1234567890)
        const json = '"2009-02-13T23:31:30"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: TimePointSec})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'time_point_sec'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('optionals', function () {
        assert.equal(Serializer.decode({data: '00', type: 'public_key?'}), null)
        assert.equal(Serializer.decode({data: '0101', type: 'bool?'}), true)
        assert.equal(Serializer.encode({object: null, type: 'signature?'}).hexString, '00')
        assert.throws(() => {
            Serializer.decode({object: null, type: 'bool'})
        })
        assert.throws(() => {
            Serializer.encode({object: null, type: 'bool'})
        })
    })

    test('api', function () {
        assert.throws(() => {
            Serializer.decode({json: '"foo"', type: 'santa'})
        })
        assert.throws(() => {
            const BadType: any = {abiName: 'santa'}
            Serializer.decode({json: '"foo"', type: BadType})
        })
        assert.throws(() => {
            const BadType: any = {abiName: 'santa'}
            Serializer.encode({object: 'foo', type: BadType})
        })
        assert.throws(() => {
            Serializer.encode({object: 42 as any})
        })
    })

    test('decoding errors', function () {
        const abi = ABI.from({
            structs: [
                {
                    base: '',
                    name: 'type1',
                    fields: [{name: 'foo', type: 'type2?'}],
                },
                {
                    base: '',
                    name: 'type2',
                    fields: [{name: 'bar', type: 'type3[]'}],
                },
                {
                    base: '',
                    name: 'type3',
                    fields: [{name: 'baz', type: 'int8'}],
                },
            ],
        })
        try {
            const object = {foo: {bar: [{baz: 'not int'}]}}
            Serializer.decode({object, type: 'type1', abi})
            assert.fail()
        } catch (error) {
            assert.equal(
                error.message,
                'Decoding error at root<type1>.foo<type2?>.bar<type3[]>.0.baz<int8>: Invalid number'
            )
        }
        try {
            const data = Buffer.from('beefbeef')
            Serializer.decode({data, type: 'type1', abi})
            assert.fail()
        } catch (error) {
            assert.equal(
                error.message,
                'Decoding error at root<type1>.foo<type2?>.bar<type3[]>.6.baz<int8>: Read past end of buffer'
            )
        }
    })

    test('variant', function () {
        const abi = ABI.from({
            structs: [{base: '', name: 'struct', fields: [{name: 'field1', type: 'bool'}]}],
            variants: [{name: 'foo', types: ['uint8', 'string[]', 'struct', 'struct?']}],
        })
        assert.deepEqual(Serializer.decode({data: '00ff', abi, type: 'foo'}), [
            'uint8',
            {value: 255},
        ])
        assert.deepEqual(Serializer.decode({object: UInt8.from(255), abi, type: 'foo'}), [
            'uint8',
            {value: 255},
        ])
        assert.equal(
            Serializer.encode({object: UInt8.from(255), abi, type: 'foo'}).hexString,
            '00ff'
        )
        assert.equal(
            Serializer.encode({object: ['struct?', {field1: true}], abi, type: 'foo'}).hexString,
            '030101'
        )
        assert.throws(() => {
            Serializer.decode({data: '04ff', abi, type: 'foo'})
        })
        assert.throws(() => {
            Serializer.encode({object: UInt64.from(255), abi, type: 'foo'})
        })
    })

    test('custom variant', function () {
        @Struct.type('my_struct')
        class MyStruct extends Struct {
            @Struct.field('string?') foo?: string
        }
        @Variant.type('my_variant', [
            'string',
            'bool',
            'string[]',
            MyStruct,
            {type: MyStruct, array: true},
        ])
        class MyVariant extends Variant {
            value!: string | boolean | string[] | MyStruct | MyStruct[]
        }
        assert.deepEqual(MyVariant.from('hello'), {value: 'hello', variantIdx: 0})
        assert.deepEqual(MyVariant.from(false), {value: false, variantIdx: 1})
        assert.deepEqual(MyVariant.from(['bool', 'booly'], 'string[]'), {
            value: ['bool', 'booly'],
            variantIdx: 2,
        })
        assert.deepEqual(MyVariant.from(['bool', 'booly'], 'string[]'), {
            value: ['bool', 'booly'],
            variantIdx: 2,
        })
        assert.deepEqual(MyVariant.from(MyStruct.from({foo: 'bar'})), {
            value: {foo: 'bar'},
            variantIdx: 3,
        })
        assert.deepEqual(MyVariant.from({foo: 'bar'}, MyStruct), {
            value: {foo: 'bar'},
            variantIdx: 3,
        })
        assert.deepEqual(MyVariant.from({foo: 'bar'}, 'my_struct'), {
            value: {foo: 'bar'},
            variantIdx: 3,
        })
        assert.deepEqual(MyVariant.from([{foo: 'bar'}], 'my_struct[]'), {
            value: [{foo: 'bar'}],
            variantIdx: 4,
        })
        assert.equal(JSON.stringify(MyVariant.from('hello')), '["string","hello"]')
        assert.equal(Serializer.encode({object: MyVariant.from(false)}).hexString, '0100')
        assert.equal(Serializer.encode({object: false, type: MyVariant}).hexString, '0100')
        assert.equal(
            Serializer.encode({object: ['string', 'hello'], type: MyVariant}).hexString,
            '000568656c6c6f'
        )
        assert.deepEqual(
            Serializer.decode({object: ['my_struct', {foo: 'bar'}], type: MyVariant}),
            {value: {foo: 'bar'}, variantIdx: 3}
        )
        assert.deepEqual(Serializer.decode({data: '0101', type: MyVariant}), {
            value: true,
            variantIdx: 1,
        })
        assert.throws(() => {
            MyVariant.from(Name.from('hello'))
        })
        assert.throws(() => {
            MyVariant.from({foo: 'bar'}, 'not_my_struct')
        })
    })

    test('alias', function () {
        const abi = ABI.from({
            types: [
                {
                    new_type_name: 'super_string',
                    type: 'string',
                },
                {
                    new_type_name: 'super_foo',
                    type: 'foo',
                },
            ],
            structs: [
                {
                    base: '',
                    name: 'foo',
                    fields: [{name: 'bar', type: 'string'}],
                },
            ],
        })
        assert.equal(
            Serializer.encode({object: 'foo', type: 'super_string', abi}).hexString,
            '03666f6f'
        )
        assert.equal(Serializer.decode({data: '03666f6f', type: 'super_string', abi}), 'foo')
        assert.equal(
            Serializer.encode({object: {bar: 'foo'}, type: 'super_foo', abi}).hexString,
            '03666f6f'
        )
        assert.deepEqual(
            Serializer.decode({
                data: '03666f6f',
                type: 'super_foo',
                abi,
            }),
            {
                bar: 'foo',
            }
        )
        assert.deepEqual(
            Serializer.decode({
                object: {bar: 'foo'},
                type: 'super_foo',
                abi,
            }),
            {
                bar: 'foo',
            }
        )
    })

    test('custom alias', function () {
        @TypeAlias('super_int')
        class SuperInt extends Int32 {}
        assert.equal(
            Serializer.encode({
                object: SuperInt.from(42),
            }).hexString,
            '2a000000'
        )
        assert.equal(
            Serializer.encode({
                object: 42,
                type: 'super_int',
                customTypes: [SuperInt],
            }).hexString,
            '2a000000'
        )
        const decoded = Serializer.decode({
            data: '2a000000',
            type: 'super_int',
            customTypes: [SuperInt],
        })
        assert.equal(decoded instanceof SuperInt, true)
        assert.equal(decoded instanceof Int32, true)
    })

    test('synthesize abi', function () {
        @TypeAlias('my_transaction')
        class MyTransaction extends Transaction {}

        @Variant.type('my_variant', ['string', MyTransaction])
        class MyVariant extends Variant {}

        assert.deepEqual(Serializer.synthesize(MyVariant), {
            version: 'eosio::abi/1.1',
            types: [{new_type_name: 'my_transaction', type: 'transaction'}],
            variants: [{name: 'my_variant', types: ['string', 'my_transaction']}],
            structs: [
                {
                    base: '',
                    name: 'permission_level',
                    fields: [
                        {name: 'actor', type: 'name'},
                        {name: 'permission', type: 'name'},
                    ],
                },
                {
                    base: '',
                    name: 'action',
                    fields: [
                        {name: 'account', type: 'name'},
                        {name: 'name', type: 'name'},
                        {name: 'authorization', type: 'permission_level[]'},
                        {name: 'data', type: 'bytes'},
                    ],
                },
                {
                    base: '',
                    name: 'transaction_extension',
                    fields: [
                        {name: 'type', type: 'uint16'},
                        {name: 'data', type: 'bytes'},
                    ],
                },
                {
                    base: '',
                    name: 'transaction_header',
                    fields: [
                        {name: 'expiration', type: 'time_point_sec'},
                        {name: 'ref_block_num', type: 'uint16'},
                        {name: 'ref_block_prefix', type: 'uint32'},
                        {name: 'max_net_usage_words', type: 'varuint32'},
                        {name: 'max_cpu_usage_ms', type: 'uint8'},
                        {name: 'delay_sec', type: 'varuint32'},
                    ],
                },
                {
                    base: 'transaction_header',
                    name: 'transaction',
                    fields: [
                        {name: 'context_free_actions', type: 'action[]'},
                        {name: 'actions', type: 'action[]'},
                        {name: 'transaction_extensions', type: 'transaction_extension[]'},
                    ],
                },
            ],
            actions: [],
            tables: [],
            ricardian_clauses: [],
        })
    })

    test('circular alias', function () {
        const abi = ABI.from({
            types: [
                {new_type_name: 'a', type: 'a'},
                {new_type_name: 'b1', type: 'b2'},
                {new_type_name: 'b2', type: 'b1'},
                {new_type_name: 'c1', type: 'c2'},
                {new_type_name: 'c2', type: 'c3'},
            ],
            structs: [
                {base: '', name: 'c3', fields: [{name: 'f', type: 'c4'}]},
                {base: '', name: 'c4', fields: [{name: 'f', type: 'c1'}]},
            ],
        })
        assert.throws(() => {
            Serializer.decode({data: 'beef', type: 'a', abi})
        })
        assert.throws(() => {
            Serializer.decode({data: 'beef', type: 'b1', abi})
        })
        assert.throws(() => {
            Serializer.decode({data: 'beef', type: 'c1', abi})
        })
        assert.throws(() => {
            Serializer.encode({object: {f: {f: {}}}, type: 'c1', abi})
        })
    })
})
