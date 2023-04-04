import BN from 'bn.js'

import {assert} from 'chai'

import typestresserAbi from './typestresser.abi.json'

import {
    ABI,
    ABIDecoder,
    ABIEncoder,
    Asset,
    Bytes,
    Checksum256,
    Int128,
    Int32,
    Int32Type,
    Int64,
    Name,
    PermissionLevel,
    PublicKey,
    Serializer,
    Signature,
    Struct,
    TimePoint,
    TimePointSec,
    Transaction,
    TypeAlias,
    UInt128,
    UInt16,
    UInt32,
    UInt64,
    UInt8,
    Variant,
} from '$lib'

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
            declare foo: string[]
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
        assert.equal(object.value.toString(), '6712742083569909760')
        assert.equal(JSON.stringify(Name.from(UInt64.from(0))), '""')
    })

    test('asset', function () {
        const data = '393000000000000004464f4f00000000'
        const object = Asset.from('1.2345 FOO')
        const json = '"1.2345 FOO"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: Asset})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'asset'})), json)
        assert.equal(JSON.stringify(object), json)

        const data2 = '00000000000000000000000000000000'
        const object2 = Asset.from('0 ')
        const json2 = '"0 "'

        assert.equal(Serializer.encode({object: object2}).hexString, data2)
        assert.equal(JSON.stringify(Serializer.decode({data: data2, type: Asset})), json2)
        assert.equal(JSON.stringify(Serializer.decode({json: json2, type: 'asset'})), json2)
        assert.equal(JSON.stringify(object2), json2)
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
            declare doeet: boolean
        }
        class Test extends Struct {
            static abiName = 'test'
            static abiFields = [
                {name: 'foo', type: Name},
                {name: 'things', type: 'string[]'},
                {name: 'keys', type: PublicKey, optional: true, array: true},
                {name: 'other', type: Other},
            ]
            declare foo: Name
            declare things: string[]
            keys?: PublicKey[]
            declare other: Other
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
            @Struct.field('name') declare from: Name
            @Struct.field('name') declare to: Name
            @Struct.field('asset') declare quantity: Asset
            @Struct.field('string') declare memo: string
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
                grains: UInt128.from('75000000000000000'),
            },
        }
        assert.equal(
            Serializer.encode({object}).hexString,
            '000000005c73285d0568656c6c6f00008027461a740a010000000000000000'
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

    test('public key (wa)', function () {
        const data =
            '020220b9dab512e892392a44a9f41f9433c9fbd80db864e9df5889c2407db3acbb9f010d6b656f73642e696e76616c6964'
        const object = PublicKey.from(
            'PUB_WA_WdCPfafVNxVMiW5ybdNs83oWjenQXvSt1F49fg9mv7qrCiRwHj5b38U3ponCFWxQTkDsMC'
        )
        const json =
            '"PUB_WA_WdCPfafVNxVMiW5ybdNs83oWjenQXvSt1F49fg9mv7qrCiRwHj5b38U3ponCFWxQTkDsMC"'

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

    test('signature (wa)', function () {
        const sig =
            'SIG_WA_2AAAuLJS3pLPgkQQPqLsehL6VeRBaAZS7NYM91UYRUrSAEfUvzKN7DCSwhjsDqe74cZNWKUU' +
            'GAHGG8ddSA7cvUxChbfKxLSrDCpwe6MVUqz4PDdyCt5tXhEJmKekxG1o1ucY3LVj8Vi9rRbzAkKPCzW' +
            'qC8cPcUtpLHNG8qUKkQrN4Xuwa9W8rsBiUKwZv1ToLyVhLrJe42pvHYBXicp4E8qec5E4m6SX11KuXE' +
            'RFcV48Mhiie2NyaxdtNtNzQ5XZ5hjBkxRujqejpF4SNHvdAGKRBbvhkiPLA25FD3xoCbrN26z72'
        const data =
            '0220d9132bbdb219e4e2d99af9c507e3597f86b615814f36672d501034861792bbcf21a46d1a2eb12bace4a29100b942f987494f3aefc8' +
            'efb2d5af4d4d8de3e0871525aa14905af60ca17a1bb80e0cf9c3b46908a0f14f72567a2f140c3a3bd2ef074c010000006d737b226f7269' +
            '67696e223a2268747470733a2f2f6b656f73642e696e76616c6964222c2274797065223a22776562617574686e2e676574222c22636861' +
            '6c6c656e6765223a226f69567235794848304a4336453962446675347142735a6a527a70416c5131505a50436e5974766850556b3d227d'
        const object = Signature.from(sig)
        const json = `"${sig}"`

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
            const data = Bytes.from('beefbeef', 'utf8')
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
        assert.deepEqual(
            Serializer.objectify(Serializer.decode({data: '00ff', abi, type: 'foo'})),
            ['uint8', 255]
        )
        assert.deepEqual(
            Serializer.objectify(Serializer.decode({object: UInt8.from(255), abi, type: 'foo'})),
            ['uint8', 255]
        )
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
            declare value: string | boolean | string[] | MyStruct | MyStruct[]
        }
        assert.deepEqual(MyVariant.from('hello'), {value: 'hello', variantIdx: 0})
        assert.deepEqual(MyVariant.from(false), {value: false, variantIdx: 1})
        assert.deepEqual(MyVariant.from(['string[]', ['bool', 'booly']]), {
            value: ['bool', 'booly'],
            variantIdx: 2,
        })
        assert.deepEqual(MyVariant.from(MyStruct.from({foo: 'bar'})), {
            value: {foo: 'bar'},
            variantIdx: 3,
        })
        assert.deepEqual(MyVariant.from(['my_struct', {foo: 'bar'}]), {
            value: {foo: 'bar'},
            variantIdx: 3,
        })
        assert.deepEqual(MyVariant.from(['my_struct[]', [{foo: 'bar'}]]), {
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
            MyVariant.from(['not_my_struct', {foo: 'bar'}])
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
        class SuperInt extends Int32 {
            static from(value: Int32Type) {
                if (typeof value === 'number' && value < 100) {
                    value *= 42
                }
                return super.from(value) as SuperInt
            }
            didIt = false
            doIt() {
                this.didIt = true
            }
        }
        assert.equal(
            Serializer.encode({
                object: SuperInt.from(10),
            }).hexString,
            'a4010000'
        )
        assert.equal(
            Serializer.encode({
                object: 10,
                type: 'super_int',
                customTypes: [SuperInt],
            }).hexString,
            'a4010000'
        )
        const decoded = Serializer.decode({
            data: 'a4010000',
            type: 'super_int',
            customTypes: [SuperInt],
        })
        assert.equal(decoded instanceof SuperInt, true)
        assert.equal(decoded instanceof Int32, true)
        const sint = Serializer.decode({
            data: 'a4010000',
            type: SuperInt,
        })
        assert.strictEqual(sint.didIt, false)
        sint.doIt()
        assert.strictEqual(sint.didIt, true)
        @Variant.type('my_variant', ['string', SuperInt])
        class MyVariant extends Variant {}
        const v = MyVariant.from(['super_int', 1])
        assert.equal(v.value instanceof SuperInt, true)
        const v2 = Serializer.decode({data: '01a4010000', type: MyVariant})
        assert.equal(v2.value instanceof SuperInt, true)
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

    test('complex type', function () {
        @TypeAlias('do_you_even')
        class DoYouEven extends Int128 {}
        @Variant.type('several_things', [{type: Transaction, array: true}, 'bool?', DoYouEven])
        class SeveralThings extends Variant {}
        @Struct.type('complex')
        class Complex extends Struct {
            @Struct.field(SeveralThings) declare things: SeveralThings
            @Struct.field(Complex, {optional: true}) self?: Complex
        }
        const object = Complex.from({
            things: [
                'transaction[]',
                [
                    {
                        actions: [
                            {
                                account: 'eosio.token',
                                name: 'transfer',
                                authorization: [{actor: 'foo', permission: 'active'}],
                                data: '000000000000285d000000000000ae39e80300000000000003454f53000000000b68656c6c6f207468657265',
                            },
                        ],
                        context_free_actions: [],
                        delay_sec: 123,
                        expiration: '2018-02-15T00:00:00',
                        max_cpu_usage_ms: 99,
                        max_net_usage_words: 0,
                        ref_block_num: 0,
                        ref_block_prefix: 0,
                        transaction_extensions: [],
                    },
                ],
            ],
            self: {
                things: ['do_you_even', 2],
                self: {
                    things: ['do_you_even', '-170141183460469231731687303715884105727'],
                },
            },
        })
        const recoded = Serializer.decode({data: Serializer.encode({object}), type: Complex})
        assert.deepStrictEqual(JSON.parse(JSON.stringify(recoded)), {
            things: [
                'transaction[]',
                [
                    {
                        delay_sec: 123,
                        expiration: '2018-02-15T00:00:00',
                        max_cpu_usage_ms: 99,
                        max_net_usage_words: 0,
                        ref_block_num: 0,
                        ref_block_prefix: 0,
                        context_free_actions: [],
                        actions: [
                            {
                                account: 'eosio.token',
                                name: 'transfer',
                                authorization: [{actor: 'foo', permission: 'active'}],
                                data: '000000000000285d000000000000ae39e80300000000000003454f53000000000b68656c6c6f207468657265',
                            },
                        ],
                        transaction_extensions: [],
                    },
                ],
            ],
            self: {
                things: ['do_you_even', 2],
                self: {
                    things: ['do_you_even', '-170141183460469231731687303715884105727'],
                    self: null,
                },
            },
        })
    })

    test('typestresser abi', function () {
        // eslint-disable-next-line @typescript-eslint/no-var-requires

        const abi = typestresserAbi
        // .readFileSync(__dirname + '/')
        // .toString()
        const object = {
            bool: true,
            int8: 127,
            uint8: 255,
            int16: 32767,
            uint16: 65535,
            int32: 2147483647,
            uint32: 4294967295,
            int64: '9223372036854775807',
            uint64: '18446744073709551615',
            int128: '170141183460469231731687303715884105727',
            uint128: '340282366920938463463374607431768211455',
            varint32: 2147483647,
            varuint32: 4294967295,
            float32: '3.1415925',
            float64: '3.141592653589793',
            float128: '0xbeefbeefbeefbeefbeefbeefbeefbeef',
            time_point: '2020-02-02T02:02:02.222',
            time_point_sec: '2020-02-02T02:02:02',
            block_timestamp_type: '2020-02-02T02:02:02.500',
            name: 'foobar',
            bytes: 'beef',
            string: 'hello',
            checksum160: 'ffffffffffffffffffffffffffffffffffffffff',
            checksum256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            checksum512:
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            public_key: 'PUB_K1_5AHoNnWetuDhKWSDx3WUf8W7Dg5xjHCMc4yHmmSiaJCFvvAgnB',
            signature:
                'SIG_K1_KfPLgpw35iX8nfDzhbcmSBCr7nEGNEYXgmmempQspDJYBCKuAEs5rm3s4ZuLJY428Ca8ZhvR2Dkwu118y3NAoMDxhicRj9',
            symbol: '7,PI',
            symbol_code: 'PI',
            asset: '3.1415926 PI',
            extended_asset: {
                quantity: '3.1415926 PI',
                contract: 'pi.token',
            },
            alias1: true,
            alias2: true,
            alias3: {
                bool: true,
            },
            alias4: ['int8', 1],
            alias5: [true, true],
            alias6: null,
            extension: {
                message: 'hello',
                extension: {
                    message: 'world',
                    extension: null,
                },
            },
        }

        const data = Serializer.encode({object, type: 'all_types', abi})
        assert.equal(
            data.hexString,
            '017fffff7fffffffffff7fffffffffffffffffffffff7fffffffffffffffffffffffffffffffffffffffffffffff7fffff' +
                'fffffffffffffffffffffffffffffeffffff0fffffffff0fda0f4940182d4454fb210940beefbeefbeefbeefbeefbeefbe' +
                'efbeefb07d56318e9d05009a2d365e35d4914b000000005c73285d02beef0568656c6c6fffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffff000223e0ae8aacb41b06dc74af1a56b2eb69133f07f7f75bd1d5e53316bff195edf400205150a67288c3b393' +
                'fdba9061b05019c54b12bdac295fc83bebad7cd63c7bb67d5cb8cc220564da006240a58419f64d06a5c6e1fc62889816a6' +
                'c3dfdd231ed38907504900000000005049000000000000765edf01000000000750490000000000765edf01000000000750' +
                '49000000000000000053419a81ab0101010001020101000568656c6c6f0105776f726c6400'
        )
        const decoded = Serializer.decode({data, type: 'all_types', abi})
        assert.deepStrictEqual(JSON.parse(JSON.stringify(decoded)), object)
    })

    test('coder metadata', function () {
        @TypeAlias('endian_int64')
        class EndianInt64 extends Int64 {
            static fromABI(decoder: ABIDecoder) {
                const bigEndian = decoder.metadata['endian'] === 'big'
                const data = decoder.readArray(8)
                const bn = new BN(data, undefined, bigEndian ? 'be' : 'le')
                return new this(bn)
            }
            toABI(encoder: ABIEncoder) {
                const bigEndian = encoder.metadata['endian'] === 'big'
                const data = this.value.toArray(bigEndian ? 'be' : 'le', 8)
                encoder.writeArray(data)
            }
        }
        const bigData = Serializer.encode({
            object: 255,
            type: EndianInt64,
            metadata: {endian: 'big'},
        })
        const littleData = Serializer.encode({
            object: 255,
            type: EndianInt64,
            metadata: {endian: 'little'},
        })
        assert.equal(bigData.hexString, '00000000000000ff')
        assert.equal(littleData.hexString, 'ff00000000000000')
        const valueFromBig = Serializer.decode({
            data: bigData,
            type: EndianInt64,
            metadata: {endian: 'big'},
        })
        const valueFromLittle = Serializer.decode({
            data: littleData,
            type: EndianInt64,
            metadata: {endian: 'little'},
        })
        assert.equal(valueFromBig.toNumber(), 255)
        assert.equal(valueFromLittle.toNumber(), 255)
    })

    test('object-only any coding', function () {
        @Struct.type('my_struct')
        class MyStruct extends Struct {
            @Struct.field('any') declare foo: any
            @Struct.field('any[]') declare bar: any[]
            @Struct.field('any', {optional: true}) baz?: any
            @Struct.field('name') declare account: Name
        }
        const decoded = Serializer.decode({
            object: {
                foo: 'hello',
                bar: [1, 'two', false],
                account: 'foobar1234',
            },
            type: MyStruct,
        })
        assert.deepEqual(JSON.parse(JSON.stringify(decoded)), {
            foo: 'hello',
            bar: [1, 'two', false],
            baz: null,
            account: 'foobar1234',
        })
        const abi = Serializer.synthesize(MyStruct)
        const decoded2 = Serializer.decode({
            object: {
                foo: {nested: 'obj'},
                bar: [],
                baz: {b: {a: {z: 'zz'}}},
                account: 'foo',
            },
            type: 'my_struct',
            abi,
        })
        assert.deepEqual(JSON.parse(JSON.stringify(decoded2)), {
            foo: {nested: 'obj'},
            bar: [],
            baz: {b: {a: {z: 'zz'}}},
            account: 'foo',
        })
        assert.throws(() => {
            Serializer.decode({data: 'beef', type: MyStruct})
        })
        assert.throws(() => {
            Serializer.encode({object: decoded})
        })
    })

    test('coding with type descriptors', function () {
        const array = Serializer.decode({
            data: '020000ffff',
            type: {type: UInt16, array: true},
        }) as UInt16[]
        assert.deepEqual(array.map(Number), [0, 65535])
        const optional = Serializer.decode({
            data: '00',
            type: {type: Transaction, optional: true},
        })
        assert.strictEqual(optional, null)
        const obj = Serializer.decode({
            object: [false, true, false],
            type: {type: 'bool', array: true},
        })
        assert.deepEqual(obj, [false, true, false])
        @Struct.type('my_struct')
        class MyStruct extends Struct {
            @Struct.field('uint16') declare foo: UInt16
        }
        const encoded = Serializer.encode({
            object: [{foo: 0}, {foo: 65535}],
            type: {type: MyStruct, array: true},
        })
        assert.equal(encoded.hexString, '020000ffff')
        const decoded = Serializer.decode({
            data: '020000ffff',
            type: {type: MyStruct, array: true},
        }) as MyStruct[]
        assert.equal(decoded.length, 2)
        assert.equal(
            decoded.every((v) => v instanceof MyStruct),
            true
        )
        assert.deepEqual(
            decoded.map((v) => Number(v.foo)),
            [0, 65535]
        )
    })

    test('unicode', function () {
        const data = Serializer.encode({object: '😷'})
        const text = Serializer.decode({data, type: 'string'})
        assert.strictEqual(text, '😷')
    })

    test('argument mutation', function () {
        // should never mutate input values to 'from' methods
        @Struct.type('test_obj')
        class TestObj extends Struct {
            @Struct.field('asset') declare asset: Asset
            @Struct.field('int32') int32!: Int32
            @Struct.field(PermissionLevel) declare auth: PermissionLevel
        }
        const object = {asset: '1.3 ROCKS', int32: 1234, auth: {actor: 'foo', permission: 'bar'}}
        const original = JSON.parse(JSON.stringify(object))
        assert.deepStrictEqual(object, original)
        TestObj.from(object)
        assert.deepStrictEqual(object, original)
        Serializer.decode({object, type: 'test_obj', customTypes: [TestObj]})
        assert.deepStrictEqual(object, original)
    })

    test('abi resolve all', function () {
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
                {base: 'c4', name: 'c5', fields: [{name: 'f2', type: 'c5[]?'}]},
            ],
            variants: [{name: 'c6', types: ['a', 'b1', 'c1', 'c5']}],
        })
        const types = abi.resolveAll()
        const allTypes = types.types.concat(types.structs).concat(types.variants)
        const maxId = allTypes.reduce((p, v) => (v.id > p ? v.id : p), 0)
        assert.equal(maxId, 9)
    })

    test('objectify', function () {
        const tx = Transaction.from({
            ref_block_num: 123,
            ref_block_prefix: 456,
            expiration: 992,
            actions: [
                {
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{actor: 'foo', permission: 'active'}],
                    data: '0000000000855c340000000000000e3da40100000000000001474d5a0000000007666f7220796f75',
                },
            ],
        })
        assert.deepStrictEqual(Serializer.objectify(tx), {
            expiration: '1970-01-01T00:16:32',
            ref_block_num: 123,
            ref_block_prefix: 456,
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
            context_free_actions: [],
            actions: [
                {
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{actor: 'foo', permission: 'active'}],
                    data: '0000000000855c340000000000000e3da40100000000000001474d5a0000000007666f7220796f75',
                },
            ],
            transaction_extensions: [],
        })
    })

    test('struct optional field', function () {
        @Struct.type('test')
        class Test extends Struct {
            @Struct.field('string') declare a: string
            @Struct.field('string?') b?: string
            @Struct.field('string', {optional: true}) c?: string
            @Struct.field('string[]?') d?: string
        }
        assert.doesNotThrow(() => {
            Test.from({a: 'foo'})
        })
        assert.throws(() => {
            Test.from({b: 'foo'})
        }, /encountered undefined for non-optional/)
    })

    test('abi def', function () {
        const abi = ABI.from({
            types: [{new_type_name: 'b', type: 'a'}],
            structs: [{base: '', name: 'a', fields: [{name: 'f', type: 'a'}]}],
            tables: [
                {name: 't', type: 'a', index_type: 'i64', key_names: ['k'], key_types: ['i64']},
            ],
            ricardian_clauses: [{id: 'foo', body: 'bar'}],
            variants: [{name: 'v', types: ['a', 'b']}],
        })
        const data = Serializer.encode({object: abi})
        assert.equal(
            data.hexString,
            '0e656f73696f3a3a6162692f312e310101620161010161000101660161000100000000000000c80369363401016b010369363401610103666f6f0362617200000101760201610162'
        )
        const decoded = Serializer.objectify(Serializer.decode({data, type: ABI}))
        assert.deepEqual(abi.types, decoded.types)
        assert.deepEqual(abi.structs, decoded.structs)
        assert.deepEqual(abi.tables, decoded.tables)
        assert.deepEqual(abi.ricardian_clauses, decoded.ricardian_clauses)
        assert.deepEqual(abi.variants, decoded.variants)
        assert.ok(abi.equals(decoded))
    })

    test('binary extensions', function () {
        @Struct.type('info_pair')
        class InfoPair extends Struct {
            @Struct.field('string') declare key: string
            @Struct.field('bytes') declare value: Bytes
        }
        @TypeAlias('super_int')
        class SuperInt extends UInt8 {
            static abiDefault() {
                return SuperInt.from(42)
            }
        }
        @Variant.type('jazz_variant', [SuperInt, 'string'])
        class JazzVariant extends Variant {}
        @Struct.type('many_extensions')
        class ManyExtensions extends Struct {
            @Struct.field('string') declare name: string
            @Struct.field(InfoPair, {array: true, extension: true}) declare info: InfoPair[]
            @Struct.field(InfoPair, {extension: true}) declare singleInfo: InfoPair
            @Struct.field('uint32$') declare uint32: UInt32
            @Struct.field('asset$') declare asset: Asset
            @Struct.field('checksum256$') declare checksum256: Checksum256
            @Struct.field(SuperInt, {extension: true}) declare superInt: SuperInt
            @Struct.field(JazzVariant, {extension: true}) declare jazz: JazzVariant
            @Struct.field(JazzVariant, {extension: true, optional: true})
            declare maybeJazz?: JazzVariant
            @Struct.field('bool?$') declare dumbBool?: boolean
            @Struct.field('bool$') declare bool: boolean
        }
        const res1 = Serializer.decode({
            data: '03666f6f',
            type: ManyExtensions,
            strictExtensions: true,
        })
        assert.equal(res1.uint32.toNumber(), 0)
        assert.equal(res1.asset.toString(), '0.0000 SYS')
        assert.equal(res1.superInt.toNumber(), 42)
        assert.equal(res1.jazz.value, 42)
        assert.strictEqual(res1.maybeJazz, null)
        assert.strictEqual(res1.dumbBool, null)
        assert.strictEqual(res1.bool, false)
        const res2 = Serializer.decode({
            object: {name: 'foo'},
            type: ManyExtensions,
            strictExtensions: true,
        })
        assert.ok(res1.equals(res2))
        const abi = Serializer.synthesize(ManyExtensions)
        const res3 = Serializer.decode({
            object: {name: 'foo', dumbBool: false},
            abi,
            type: 'many_extensions',
            strictExtensions: true,
        }) as any
        assert.equal(res3.superInt.toNumber(), 0) // expected since we loose coupling to the SuperInt type implementation and it resolves to UInt8 instead
        assert.equal(res3.jazz[0], 'super_int')
        assert.strictEqual(res3.dumbBool, false)
        assert.strictEqual(res3.bool, false)
        const res4 = Serializer.decode({
            object: {name: 'foo', jazz: JazzVariant.from('hi'), maybeJazz: ['super_int', 22]},
            abi,
            type: 'many_extensions',
            customTypes: [SuperInt, JazzVariant],
            strictExtensions: true,
        }) as any
        assert.equal(res4.superInt.toNumber(), 42) // coupling restored
        assert.equal(res4.jazz.value, 'hi')
        assert.equal(res4.maybeJazz.value, 22)
        const OptimisticBool: any = {
            // don't try this at home, just because you can doesn't mean you should
            abiName: 'bool',
            abiDefault: () => true,
            from: (value: boolean): boolean => value,
        }
        const res5 = Serializer.decode({
            object: {name: 'foo'},
            abi,
            type: 'many_extensions',
            customTypes: [SuperInt, JazzVariant, OptimisticBool],
            strictExtensions: true,
        }) as any
        assert.strictEqual(res5.bool, true)

        abi.structs[1].fields[1].type = 'many_extensions$'
        assert.throws(() => {
            Serializer.decode({
                data: '03666f6f',
                abi,
                type: 'many_extensions',
                strictExtensions: true,
            })
        }, /Circular type reference/)
    })

    test('serialization error', function () {
        const abiData =
            '{"version":"eosio::abi/1.1","types":[{"new_type_name":"transaction_id","type":"checksum256"}],"structs":[{"name":"get_status_request_v0","fields":[]},{"name":"block_position","fields":[{"name":"block_num","type":"uint32"},{"name":"block_id","type":"checksum256"}]},{"name":"get_status_result_v0","fields":[{"name":"head","type":"block_position"},{"name":"last_irreversible","type":"block_position"},{"name":"trace_begin_block","type":"uint32"},{"name":"trace_end_block","type":"uint32"},{"name":"chain_state_begin_block","type":"uint32"},{"name":"chain_state_end_block","type":"uint32"},{"name":"chain_id","type":"checksum256$"}]},{"name":"get_blocks_request_v0","fields":[{"name":"start_block_num","type":"uint32"},{"name":"end_block_num","type":"uint32"},{"name":"max_messages_in_flight","type":"uint32"},{"name":"have_positions","type":"block_position[]"},{"name":"irreversible_only","type":"bool"},{"name":"fetch_block","type":"bool"},{"name":"fetch_traces","type":"bool"},{"name":"fetch_deltas","type":"bool"}]},{"name":"get_blocks_ack_request_v0","fields":[{"name":"num_messages","type":"uint32"}]},{"name":"get_blocks_result_v0","fields":[{"name":"head","type":"block_position"},{"name":"last_irreversible","type":"block_position"},{"name":"this_block","type":"block_position?"},{"name":"prev_block","type":"block_position?"},{"name":"block","type":"bytes?"},{"name":"traces","type":"bytes?"},{"name":"deltas","type":"bytes?"}]},{"name":"row","fields":[{"name":"present","type":"bool"},{"name":"data","type":"bytes"}]},{"name":"table_delta_v0","fields":[{"name":"name","type":"string"},{"name":"rows","type":"row[]"}]},{"name":"action","fields":[{"name":"account","type":"name"},{"name":"name","type":"name"},{"name":"authorization","type":"permission_level[]"},{"name":"data","type":"bytes"}]},{"name":"account_auth_sequence","fields":[{"name":"account","type":"name"},{"name":"sequence","type":"uint64"}]},{"name":"action_receipt_v0","fields":[{"name":"receiver","type":"name"},{"name":"act_digest","type":"checksum256"},{"name":"global_sequence","type":"uint64"},{"name":"recv_sequence","type":"uint64"},{"name":"auth_sequence","type":"account_auth_sequence[]"},{"name":"code_sequence","type":"varuint32"},{"name":"abi_sequence","type":"varuint32"}]},{"name":"account_delta","fields":[{"name":"account","type":"name"},{"name":"delta","type":"int64"}]},{"name":"action_trace_v0","fields":[{"name":"action_ordinal","type":"varuint32"},{"name":"creator_action_ordinal","type":"varuint32"},{"name":"receipt","type":"action_receipt?"},{"name":"receiver","type":"name"},{"name":"act","type":"action"},{"name":"context_free","type":"bool"},{"name":"elapsed","type":"int64"},{"name":"console","type":"string"},{"name":"account_ram_deltas","type":"account_delta[]"},{"name":"except","type":"string?"},{"name":"error_code","type":"uint64?"}]},{"name":"action_trace_v1","fields":[{"name":"action_ordinal","type":"varuint32"},{"name":"creator_action_ordinal","type":"varuint32"},{"name":"receipt","type":"action_receipt?"},{"name":"receiver","type":"name"},{"name":"act","type":"action"},{"name":"context_free","type":"bool"},{"name":"elapsed","type":"int64"},{"name":"console","type":"string"},{"name":"account_ram_deltas","type":"account_delta[]"},{"name":"except","type":"string?"},{"name":"error_code","type":"uint64?"},{"name":"return_value","type":"bytes"}]},{"name":"partial_transaction_v0","fields":[{"name":"expiration","type":"time_point_sec"},{"name":"ref_block_num","type":"uint16"},{"name":"ref_block_prefix","type":"uint32"},{"name":"max_net_usage_words","type":"varuint32"},{"name":"max_cpu_usage_ms","type":"uint8"},{"name":"delay_sec","type":"varuint32"},{"name":"transaction_extensions","type":"extension[]"},{"name":"signatures","type":"signature[]"},{"name":"context_free_data","type":"bytes[]"}]},{"name":"transaction_trace_v0","fields":[{"name":"id","type":"checksum256"},{"name":"status","type":"uint8"},{"name":"cpu_usage_us","type":"uint32"},{"name":"net_usage_words","type":"varuint32"},{"name":"elapsed","type":"int64"},{"name":"net_usage","type":"uint64"},{"name":"scheduled","type":"bool"},{"name":"action_traces","type":"action_trace[]"},{"name":"account_ram_delta","type":"account_delta?"},{"name":"except","type":"string?"},{"name":"error_code","type":"uint64?"},{"name":"failed_dtrx_trace","type":"transaction_trace?"},{"name":"partial","type":"partial_transaction?"}]},{"name":"packed_transaction","fields":[{"name":"signatures","type":"signature[]"},{"name":"compression","type":"uint8"},{"name":"packed_context_free_data","type":"bytes"},{"name":"packed_trx","type":"bytes"}]},{"name":"transaction_receipt_header","fields":[{"name":"status","type":"uint8"},{"name":"cpu_usage_us","type":"uint32"},{"name":"net_usage_words","type":"varuint32"}]},{"name":"transaction_receipt","base":"transaction_receipt_header","fields":[{"name":"trx","type":"transaction_variant"}]},{"name":"extension","fields":[{"name":"type","type":"uint16"},{"name":"data","type":"bytes"}]},{"name":"block_header","fields":[{"name":"timestamp","type":"block_timestamp_type"},{"name":"producer","type":"name"},{"name":"confirmed","type":"uint16"},{"name":"previous","type":"checksum256"},{"name":"transaction_mroot","type":"checksum256"},{"name":"action_mroot","type":"checksum256"},{"name":"schedule_version","type":"uint32"},{"name":"new_producers","type":"producer_schedule?"},{"name":"header_extensions","type":"extension[]"}]},{"name":"signed_block_header","base":"block_header","fields":[{"name":"producer_signature","type":"signature"}]},{"name":"signed_block","base":"signed_block_header","fields":[{"name":"transactions","type":"transaction_receipt[]"},{"name":"block_extensions","type":"extension[]"}]},{"name":"transaction_header","fields":[{"name":"expiration","type":"time_point_sec"},{"name":"ref_block_num","type":"uint16"},{"name":"ref_block_prefix","type":"uint32"},{"name":"max_net_usage_words","type":"varuint32"},{"name":"max_cpu_usage_ms","type":"uint8"},{"name":"delay_sec","type":"varuint32"}]},{"name":"transaction","base":"transaction_header","fields":[{"name":"context_free_actions","type":"action[]"},{"name":"actions","type":"action[]"},{"name":"transaction_extensions","type":"extension[]"}]},{"name":"code_id","fields":[{"type":"uint8","name":"vm_type"},{"type":"uint8","name":"vm_version"},{"type":"checksum256","name":"code_hash"}]},{"name":"account_v0","fields":[{"type":"name","name":"name"},{"type":"block_timestamp_type","name":"creation_date"},{"type":"bytes","name":"abi"}]},{"name":"account_metadata_v0","fields":[{"type":"name","name":"name"},{"type":"bool","name":"privileged"},{"type":"time_point","name":"last_code_update"},{"type":"code_id?","name":"code"}]},{"name":"code_v0","fields":[{"type":"uint8","name":"vm_type"},{"type":"uint8","name":"vm_version"},{"type":"checksum256","name":"code_hash"},{"type":"bytes","name":"code"}]},{"name":"contract_table_v0","fields":[{"type":"name","name":"code"},{"type":"name","name":"scope"},{"type":"name","name":"table"},{"type":"name","name":"payer"}]},{"name":"contract_row_v0","fields":[{"type":"name","name":"code"},{"type":"name","name":"scope"},{"type":"name","name":"table"},{"type":"uint64","name":"primary_key"},{"type":"name","name":"payer"},{"type":"bytes","name":"value"}]},{"name":"contract_index64_v0","fields":[{"type":"name","name":"code"},{"type":"name","name":"scope"},{"type":"name","name":"table"},{"type":"uint64","name":"primary_key"},{"type":"name","name":"payer"},{"type":"uint64","name":"secondary_key"}]},{"name":"contract_index128_v0","fields":[{"type":"name","name":"code"},{"type":"name","name":"scope"},{"type":"name","name":"table"},{"type":"uint64","name":"primary_key"},{"type":"name","name":"payer"},{"type":"uint128","name":"secondary_key"}]},{"name":"contract_index256_v0","fields":[{"type":"name","name":"code"},{"type":"name","name":"scope"},{"type":"name","name":"table"},{"type":"uint64","name":"primary_key"},{"type":"name","name":"payer"},{"type":"checksum256","name":"secondary_key"}]},{"name":"contract_index_double_v0","fields":[{"type":"name","name":"code"},{"type":"name","name":"scope"},{"type":"name","name":"table"},{"type":"uint64","name":"primary_key"},{"type":"name","name":"payer"},{"type":"float64","name":"secondary_key"}]},{"name":"contract_index_long_double_v0","fields":[{"type":"name","name":"code"},{"type":"name","name":"scope"},{"type":"name","name":"table"},{"type":"uint64","name":"primary_key"},{"type":"name","name":"payer"},{"type":"float128","name":"secondary_key"}]},{"name":"producer_key","fields":[{"type":"name","name":"producer_name"},{"type":"public_key","name":"block_signing_key"}]},{"name":"producer_schedule","fields":[{"type":"uint32","name":"version"},{"type":"producer_key[]","name":"producers"}]},{"name":"block_signing_authority_v0","fields":[{"type":"uint32","name":"threshold"},{"type":"key_weight[]","name":"keys"}]},{"name":"producer_authority","fields":[{"type":"name","name":"producer_name"},{"type":"block_signing_authority","name":"authority"}]},{"name":"producer_authority_schedule","fields":[{"type":"uint32","name":"version"},{"type":"producer_authority[]","name":"producers"}]},{"name":"chain_config_v0","fields":[{"type":"uint64","name":"max_block_net_usage"},{"type":"uint32","name":"target_block_net_usage_pct"},{"type":"uint32","name":"max_transaction_net_usage"},{"type":"uint32","name":"base_per_transaction_net_usage"},{"type":"uint32","name":"net_usage_leeway"},{"type":"uint32","name":"context_free_discount_net_usage_num"},{"type":"uint32","name":"context_free_discount_net_usage_den"},{"type":"uint32","name":"max_block_cpu_usage"},{"type":"uint32","name":"target_block_cpu_usage_pct"},{"type":"uint32","name":"max_transaction_cpu_usage"},{"type":"uint32","name":"min_transaction_cpu_usage"},{"type":"uint32","name":"max_transaction_lifetime"},{"type":"uint32","name":"deferred_trx_expiration_window"},{"type":"uint32","name":"max_transaction_delay"},{"type":"uint32","name":"max_inline_action_size"},{"type":"uint16","name":"max_inline_action_depth"},{"type":"uint16","name":"max_authority_depth"}]},{"name":"chain_config_v1","fields":[{"type":"uint64","name":"max_block_net_usage"},{"type":"uint32","name":"target_block_net_usage_pct"},{"type":"uint32","name":"max_transaction_net_usage"},{"type":"uint32","name":"base_per_transaction_net_usage"},{"type":"uint32","name":"net_usage_leeway"},{"type":"uint32","name":"context_free_discount_net_usage_num"},{"type":"uint32","name":"context_free_discount_net_usage_den"},{"type":"uint32","name":"max_block_cpu_usage"},{"type":"uint32","name":"target_block_cpu_usage_pct"},{"type":"uint32","name":"max_transaction_cpu_usage"},{"type":"uint32","name":"min_transaction_cpu_usage"},{"type":"uint32","name":"max_transaction_lifetime"},{"type":"uint32","name":"deferred_trx_expiration_window"},{"type":"uint32","name":"max_transaction_delay"},{"type":"uint32","name":"max_inline_action_size"},{"type":"uint16","name":"max_inline_action_depth"},{"type":"uint16","name":"max_authority_depth"},{"type":"uint32","name":"max_action_return_value_size"}]},{"name":"wasm_config_v0","fields":[{"type":"uint32","name":"max_mutable_global_bytes"},{"type":"uint32","name":"max_table_elements"},{"type":"uint32","name":"max_section_elements"},{"type":"uint32","name":"max_linear_memory_init"},{"type":"uint32","name":"max_func_local_bytes"},{"type":"uint32","name":"max_nested_structures"},{"type":"uint32","name":"max_symbol_bytes"},{"type":"uint32","name":"max_module_bytes"},{"type":"uint32","name":"max_code_bytes"},{"type":"uint32","name":"max_pages"},{"type":"uint32","name":"max_call_depth"}]},{"name":"global_property_v0","fields":[{"type":"uint32?","name":"proposed_schedule_block_num"},{"type":"producer_schedule","name":"proposed_schedule"},{"type":"chain_config","name":"configuration"}]},{"name":"global_property_v1","fields":[{"type":"uint32?","name":"proposed_schedule_block_num"},{"type":"producer_authority_schedule","name":"proposed_schedule"},{"type":"chain_config","name":"configuration"},{"type":"checksum256","name":"chain_id"},{"type":"wasm_config$","name":"wasm_configuration"}]},{"name":"generated_transaction_v0","fields":[{"type":"name","name":"sender"},{"type":"uint128","name":"sender_id"},{"type":"name","name":"payer"},{"type":"checksum256","name":"trx_id"},{"type":"bytes","name":"packed_trx"}]},{"name":"activated_protocol_feature_v0","fields":[{"type":"checksum256","name":"feature_digest"},{"type":"uint32","name":"activation_block_num"}]},{"name":"protocol_state_v0","fields":[{"type":"activated_protocol_feature[]","name":"activated_protocol_features"}]},{"name":"key_weight","fields":[{"type":"public_key","name":"key"},{"type":"uint16","name":"weight"}]},{"name":"permission_level","fields":[{"type":"name","name":"actor"},{"type":"name","name":"permission"}]},{"name":"permission_level_weight","fields":[{"type":"permission_level","name":"permission"},{"type":"uint16","name":"weight"}]},{"name":"wait_weight","fields":[{"type":"uint32","name":"wait_sec"},{"type":"uint16","name":"weight"}]},{"name":"authority","fields":[{"type":"uint32","name":"threshold"},{"type":"key_weight[]","name":"keys"},{"type":"permission_level_weight[]","name":"accounts"},{"type":"wait_weight[]","name":"waits"}]},{"name":"permission_v0","fields":[{"type":"name","name":"owner"},{"type":"name","name":"name"},{"type":"name","name":"parent"},{"type":"time_point","name":"last_updated"},{"type":"authority","name":"auth"}]},{"name":"permission_link_v0","fields":[{"type":"name","name":"account"},{"type":"name","name":"code"},{"type":"name","name":"message_type"},{"type":"name","name":"required_permission"}]},{"name":"resource_limits_v0","fields":[{"type":"name","name":"owner"},{"type":"int64","name":"net_weight"},{"type":"int64","name":"cpu_weight"},{"type":"int64","name":"ram_bytes"}]},{"name":"usage_accumulator_v0","fields":[{"type":"uint32","name":"last_ordinal"},{"type":"uint64","name":"value_ex"},{"type":"uint64","name":"consumed"}]},{"name":"resource_usage_v0","fields":[{"type":"name","name":"owner"},{"type":"usage_accumulator","name":"net_usage"},{"type":"usage_accumulator","name":"cpu_usage"},{"type":"uint64","name":"ram_usage"}]},{"name":"resource_limits_state_v0","fields":[{"type":"usage_accumulator","name":"average_block_net_usage"},{"type":"usage_accumulator","name":"average_block_cpu_usage"},{"type":"uint64","name":"total_net_weight"},{"type":"uint64","name":"total_cpu_weight"},{"type":"uint64","name":"total_ram_bytes"},{"type":"uint64","name":"virtual_net_limit"},{"type":"uint64","name":"virtual_cpu_limit"}]},{"name":"resource_limits_ratio_v0","fields":[{"type":"uint64","name":"numerator"},{"type":"uint64","name":"denominator"}]},{"name":"elastic_limit_parameters_v0","fields":[{"type":"uint64","name":"target"},{"type":"uint64","name":"max"},{"type":"uint32","name":"periods"},{"type":"uint32","name":"max_multiplier"},{"type":"resource_limits_ratio","name":"contract_rate"},{"type":"resource_limits_ratio","name":"expand_rate"}]},{"name":"resource_limits_config_v0","fields":[{"type":"elastic_limit_parameters","name":"cpu_limit_parameters"},{"type":"elastic_limit_parameters","name":"net_limit_parameters"},{"type":"uint32","name":"account_cpu_usage_average_window"},{"type":"uint32","name":"account_net_usage_average_window"}]}],"actions":[],"tables":[{"name":"account","type":"account","key_names":["name"]},{"name":"account_metadata","type":"account_metadata","key_names":["name"]},{"name":"code","type":"code","key_names":["vm_type","vm_version","code_hash"]},{"name":"contract_table","type":"contract_table","key_names":["code","scope","table"]},{"name":"contract_row","type":"contract_row","key_names":["code","scope","table","primary_key"]},{"name":"contract_index64","type":"contract_index64","key_names":["code","scope","table","primary_key"]},{"name":"contract_index128","type":"contract_index128","key_names":["code","scope","table","primary_key"]},{"name":"contract_index256","type":"contract_index256","key_names":["code","scope","table","primary_key"]},{"name":"contract_index_double","type":"contract_index_double","key_names":["code","scope","table","primary_key"]},{"name":"contract_index_long_double","type":"contract_index_long_double","key_names":["code","scope","table","primary_key"]},{"name":"global_property","type":"global_property","key_names":[]},{"name":"generated_transaction","type":"generated_transaction","key_names":["sender","sender_id"]},{"name":"protocol_state","type":"protocol_state","key_names":[]},{"name":"permission","type":"permission","key_names":["owner","name"]},{"name":"permission_link","type":"permission_link","key_names":["account","code","message_type"]},{"name":"resource_limits","type":"resource_limits","key_names":["owner"]},{"name":"resource_usage","type":"resource_usage","key_names":["owner"]},{"name":"resource_limits_state","type":"resource_limits_state","key_names":[]},{"name":"resource_limits_config","type":"resource_limits_config","key_names":[]}],"ricardian_clauses":[],"error_messages":[],"abi_extensions":[],"variants":[{"name":"request","types":["get_status_request_v0","get_blocks_request_v0","get_blocks_ack_request_v0"]},{"name":"result","types":["get_status_result_v0","get_blocks_result_v0"]},{"name":"action_receipt","types":["action_receipt_v0"]},{"name":"action_trace","types":["action_trace_v0","action_trace_v1"]},{"name":"partial_transaction","types":["partial_transaction_v0"]},{"name":"transaction_trace","types":["transaction_trace_v0"]},{"name":"transaction_variant","types":["transaction_id","packed_transaction"]},{"name":"table_delta","types":["table_delta_v0"]},{"name":"account","types":["account_v0"]},{"name":"account_metadata","types":["account_metadata_v0"]},{"name":"code","types":["code_v0"]},{"name":"contract_table","types":["contract_table_v0"]},{"name":"contract_row","types":["contract_row_v0"]},{"name":"contract_index64","types":["contract_index64_v0"]},{"name":"contract_index128","types":["contract_index128_v0"]},{"name":"contract_index256","types":["contract_index256_v0"]},{"name":"contract_index_double","types":["contract_index_double_v0"]},{"name":"contract_index_long_double","types":["contract_index_long_double_v0"]},{"name":"chain_config","types":["chain_config_v0","chain_config_v1"]},{"name":"wasm_config","types":["wasm_config_v0"]},{"name":"global_property","types":["global_property_v0","global_property_v1"]},{"name":"generated_transaction","types":["generated_transaction_v0"]},{"name":"activated_protocol_feature","types":["activated_protocol_feature_v0"]},{"name":"protocol_state","types":["protocol_state_v0"]},{"name":"permission","types":["permission_v0"]},{"name":"permission_link","types":["permission_link_v0"]},{"name":"resource_limits","types":["resource_limits_v0"]},{"name":"usage_accumulator","types":["usage_accumulator_v0"]},{"name":"resource_usage","types":["resource_usage_v0"]},{"name":"resource_limits_state","types":["resource_limits_state_v0"]},{"name":"resource_limits_ratio","types":["resource_limits_ratio_v0"]},{"name":"elastic_limit_parameters","types":["elastic_limit_parameters_v0"]},{"name":"resource_limits_config","types":["resource_limits_config_v0"]},{"name":"block_signing_authority","types":["block_signing_authority_v0"]}]}'
        const abi = JSON.parse(abiData)
        const shipAbi = ABI.from(abi)

        @Struct.type('shipblock')
        class ShipBlock extends Struct {
            @Struct.field('uint32') declare block_num: UInt32
            @Struct.field('checksum256') declare block_id: Checksum256
        }

        @Struct.type('shiprecord')
        class ShipRecord extends Struct {
            @Struct.field(ShipBlock) declare head: ShipBlock
            @Struct.field(ShipBlock) declare last_irreversible: ShipBlock
            @Struct.field(ShipBlock) declare this_block: ShipBlock
            @Struct.field(ShipBlock) declare prev_block: ShipBlock
            @Struct.field('bytes') declare block: Bytes
            @Struct.field('bytes') declare traces: Bytes
            @Struct.field('bytes') declare deltas: Bytes
        }

        const data =
            '{"head":{"block_num":227932307,"block_id":"0d95f89353c048a8b660a25938d06accd8330939c003b522ea6050110b50c3ae"},"last_irreversible":{"block_num":227931971,"block_id":"0d95f7437b30e25a05433364d5056d9cc34fb57220c8f093c3f219cb22053629"},"this_block":{"block_num":174582075,"block_id":"0a67e93b6457ec683d92e4dde460f767306694d758c81bb3b8979a22133c0f19"},"prev_block":{"block_num":174582074,"block_id":"0a67e93a35786d9fc7d3d759e26e93b8a9bddc67cc6e11d309b45b635cd3aeb8"},"block":"6c8d4f5410dd37f75077315500000a67e93a35786d9fc7d3d759e26e93b8a9bddc67cc6e11d309b45b635cd3aeb804ee29f122c972fde156e44639b83b43da0a6771f86e3a8175288ece957a200f85f69412e379902e5fd2efe7b537f59897d4c5cdc5f8c20db477671033ef3865f56000000000001f6e93a23c35b8379d29e653c4ab1c52f641789a3c5da069294c5cd69f8492c8a8709b4ceebba76652dd89b5479c1f614da2125b111ff7375ff57b40423c9716e70200020100000c0101001f59011a6681fa8289230f20798a6124880fc4601b8b63dbb3f37f7da73a95eb3c2e4f56fe68c8dfacd96e7078468908bba03af4c3c0b6813951c6a4d562c0fc8b000032520a9562f2e75f082c8e00000000018092ca19ab9cb1ca000000000000bca9018092ca19ab9cb1ca00000000a8ed323200000009010000150101002026f7219f9c66df16c0ea067d3c76971b76b2770b56e2d1cb95b8c6a1f6b6ed74665702f261adf6a0245139aaf1aa9084f0d250e3f1d19b6c350e206e47f3b4f30000773f189562e6e7578b9a6600000000010000364a821036670000006167278fc601808d92208410426000000000a8ed323245808d922084104260460027012f0a9562b9544c424e51e4c2000001000000000000000000000000c84100d85f44221200c4fff4030080807c0a0f00a5d54b0200001b0c3c000000","traces":"030025891d1afb06d83cb086073851a173fdbffd04a4351e32e5fe61e0ac85b089b30064000000001a000000000000000000000000000000000101010001000000000000ea3055a26df1a804fc29fec0185490ec1961199a6bf3a7f46a1ea203c1fc1926ec400f0dc14f0d000000001ac0830a00000000010000000000ea3055ade49c0a000000001f0c0000000000ea30550000000000ea305500000000221acfa4010000000000ea305500000000a8ed3232746b8d4f5410dd37f75077315500000a67e9392939712edca3216289ac7f2dc72f60094f756b301779d861a6cea86600000000000000000000000000000000000000000000000000000000000000005b55be6a35a07284c6470e7025740117c493e55b05b74c058b687cab9c30d514f56000000000001300000000000000000000000000000000010000000000000000000000000000000000004501c07affa7af1c0ee3909f3f2eff2011d65796940c00b99af81410e1d14cf800020100000c3d060000000000006000000000000000000501010001008092ca19ab9cb1ca8f22eef855cb5303e2bacf432897fcffaef28ca69a66ead6bbede15459c104990ec14f0d000000000f00000000000000018092ca19ab9cb1ca3b0000000000000021018092ca19ab9cb1ca8092ca19ab9cb1ca000000000000bca9018092ca19ab9cb1ca00000000a8ed32320000cb05000000000000e8034c6f6f6b696e6720666f72206b65793a20633532366461616562636563616361323736386532336230306237663633623863376662633539326638626666643731336539343563393663633661363638360a4b657920666f756e6420776974682076616c75653a2031386166623637663030626330353061610a4b657920666f756e6420776974682076616c75653a203139373135323933380a4b657920666f756e6420776974682076616c75653a20018afb67f00bc050aa0a3337303431393834313339310a302e303030303030303030303030303030652b30306e6f775f6d733a31363533393334363436202d20702e6c6173745f7061796f75743a31363533393235353435203d2074696d655f73696e63655f6c6173745f7061796f75743a393130310a74696d655f73696e63655f6c6173745f7061796f75743a39313031202f20702e696e74657276616c3a31383030203d207061796d656e74735f6475653a350a35207061796f75747320746f3a20656f73696f2e72657820776974682074696d653a20313635333933343634360a4368616e6e656c696e6720746f205245580a5061796f7574206f66203530303020544c4f5320746f3a20656f73696f2e726578203530303020544c4f5320776974682074696d653a20313635333933343634360a0000000001020101000000000000ea3055292c067000ee5d369cdfbc96926d635ff5b62c81240e000b205d2396c7c468c70fc14f0d000000001bc0830a00000000018092ca19ab9cb1ca3c000000000000001f0c0000000000ea30550000000000ea3055004057d7b89db14b018092ca19ab9cb1ca00000000a8ed3232188092ca19ab9cb1ca80f0fa020000000004544c4f53000000001e000000000000000000000000010302010000a6823403ea3055005ce11fd75299542d5838a3cb828ac91a678f0343980417bdf2302dfa81129610c14f0d00000000deea160000000000018092ca19ab9cb1ca3d00000000000000040500a6823403ea305500a6823403ea3055000000572d3ccdcd018092ca19ab9cb1ca00000000a8ed3232488092ca19ab9cb1ca0000e8ea02ea305580f0fa020000000004544c4f53000000277472616e736665722066726f6d2074657374746573747465646320746f20656f73696f2e726578001600000000000000000000000001040301008092ca19ab9cb1ca005ce11fd75299542d5838a3cb828ac91a678f0343980417bdf2302dfa81129611c14f0d000000001000000000000000018092ca19ab9cb1ca3e0000000000000004058092ca19ab9cb1ca00a6823403ea3055000000572d3ccdcd018092ca19ab9cb1ca00000000a8ed3232488092ca19ab9cb1ca0000e8ea02ea305580f0fa020000000004544c4f53000000277472616e736665722066726f6d2074657374746573747465646320746f20656f73696f2e726578000b00000000000000000000000001050301000000e8ea02ea3055005ce11fd75299542d5838a3cb828ac91a678f0343980417bdf2302dfa81129612c14f0d0000000043f2000000000000018092ca19ab9cb1ca3f0000000000000004050000e8ea02ea305500a6823403ea3055000000572d3ccdcd018092ca19ab9cb1ca00000000a8ed3232488092ca19ab9cb1ca0000e8ea02ea305580f0fa020000000004544c4f53000000277472616e736665722066726f6d2074657374746573747465646320746f20656f73696f2e7265780002000000000000000000000000000000000100520a9562f2e75f082c8e0000000001001f59011a6681fa8289230f20798a6124880fc4601b8b63dbb3f37f7da73a95eb3c2e4f56fe68c8dfacd96e7078468908bba03af4c3c0b6813951c6a4d562c0fc8b000028428055d5e66d6c60f2b2a9cb33ac48ebbc1b956c5fe06aad5938861127e3ef0009010000155a00000000000000a800000000000000000101010001000000364a821036672be7f5db40f4900997699d4977ed3bc6b6a0c5abf7da58c4ad2272feccb9625813c14f0d00000000a32600000000000001808d9220841042606f7000000000000001010000364a821036670000364a821036670000006167278fc601808d92208410426000000000a8ed323245808d922084104260460027012f0a9562b9544c424e51e4c2000001000000000000000000000000c84100d85f44221200c4fff4030080807c0a0f00a5d54b0200001b0c3c0000400000000000000000000000000000000001003f189562e6e7578b9a660000000001002026f7219f9c66df16c0ea067d3c76971b76b2770b56e2d1cb95b8c6a1f6b6ed74665702f261adf6a0245139aaf1aa9084f0d250e3f1d19b6c350e206e47f3b4f300","deltas":"0400106163636f756e745f6d6574616461746100000c636f6e74726163745f726f770c015e000000364a821036670000364a82103667a0e231d95f23a5c6808d922084104260808d92208410426034808d922084104260360a9562b9544c424e51e4c2000001000001a3a114616a2600003600000008070b4d455f544553545f4c414201d917000000364a821036670000364a82103667000050f1986cb249808d922084104260808d922084104260ae17808d9220841042601776312e312e362d392d67303531303962302d64697274794600080704c000000000000000000000000000000027011c00300030003046000b0150459462b9544c424e51e4c2000001000000000000000000000080c14100205e441f1400d3fff5030080803cfc0d00f68e170200003b473b0046000c01584c9462b9544c424e51e4c2000001000000000000000000000000c24100445e441f1700ccfff0030080808d070e00368919020000434e3b0046000d0160539462b9544c424e51e4c2000001000000000000000000000080c34100605e441f1200c8fff103008080ef110e00b4491b0200004b553b0046000e01685a9462b9544c424e51e4c2000001000000000000000000000000c44100785e441f1400c5fffd030080809c1b0e0079471d020000535c3b0046000f0170619462b9544c424e51e4c2000001000000000000000000000080c34100845e441f1b00c7ffef0300808002250e00548c1e0200005b633b004600100178689462b9544c424e51e4c2000001000000000000000000000080c24100905e441f1a00cafff103008080df300e00b57d20020000636a3b0046001101806f9462b9544c424e51e4c2000001000000000000000000000000c04100a05e441f1700d6ffec03008080253b0e00c256220200006b713b004600120188769462b9544c424e51e4c2000001000000000000000000000000c54100b05e441f1200cbfff703008080ea450e00be4d2402000073783b0046001301907d9462b9544c424e51e4c2000001000000000000000000000000c24100b45e441f1500c7fff4030080809a4e0e003c01260200007b7f3b004600140198849462b9544c424e51e4c2000001000000000000000000000000c24100c05e441f1300c4fff903008080f3570e004e852702000083863b0046001501a08b9462b9544c424e51e4c2000001000000000000000000000000c44100c45e441f0f00d0fffc0300808041600e007f3d290200008b8d3b0046001601a8929462b9544c424e51e4c2000001000000000000000000000000be4100d05e44201800c8fff103008080266a0e00923e2b02000093943b0046001701af999462b9544c424e51e4c2000001000000000000000000000080bd4100dc5e44201500ccfff403008080d6720e00dcf82c0200009b9b3b0046001801b7a09462b9544c424e51e4c2000001000000000000000000000000be4100ec5e44201100c3fff403008080cd7b0e000d3c2f020000a3a23b0046001901bfa79462b9544c424e51e4c2000001000000000000000000000080bf4100045f44201100d1fff90300808033850e00390731020000aba93b0046001a01c7ae9462b9544c424e51e4c2000001000000000000000000000000c04100145f44201600d9ffed03008080fc8e0e00c53b33020000b3b03b0046001b01cfb59462b9544c424e51e4c2000001000000000000000000000000bf41001c5f44202300c5fff70300808000980e007b0235020000bbb73b0046001c01d7bc9462b9544c424e51e4c2000001000000000000000000000080c941002c5f44200c00d1ffeb0300808018a10e00fcf836020000c3be3b0046001d01dfc39462b9544c424e51e4c2000001000000000000000000000000c741003c5f44201300cdfff30300808039ac0e00676338020000cbc53b0046001e01e7ca9462b9544c424e51e4c2000001000000000000000000000080c541004c5f44201600c0fff303008080fdb40e008c643a020000d3cc3b0046001f01efd19462b9544c424e51e4c2000001000000000000000000000000c441005c5f44211b00d3ffed03008080d7bd0e007a733c020000dbd33b0046002001f7d89462b9544c424e51e4c2000001000000000000000000000080c24100685f44211600d1fff403008080a4c60e00d3523e020000e3da3b0046002101ffdf9462b9544c424e51e4c2000001000000000000000000000080c141007c5f44221500cafff2030080805ed00e00762940020000ebe13b004600220107e79462b9544c424e51e4c2000001000000000000000000000000ce41009c5f44221400c8fff103008080cad90e006e0542020000f3e83b00460023010fee9462b9544c424e51e4c2000001000000000000000000000000cd4100a85f44221d00d5fff50300808019e40e00ea6b44020000fbef3b004600240117f59462b9544c424e51e4c2000001000000000000000000000080ca4100bc5f44221a00c8fff20300808085ed0e00203d4602000003f73b00460025011ffc9462b9544c424e51e4c2000001000000000000000000000000c84100d85f44221c00d0fff103008080ebf60e00f73f480200000bfe3b004600260127039562b9544c424e51e4c2000001000000000000000000000080c74100e05f44221a00c6fff40300808044000f00d9f84902000013053c00460027012f0a9562b9544c424e51e4c2000001000000000000000000000000c84100d85f44221200c4fff4030080807c0a0f00a5d54b0200001b0c3c004600f800b8bf9362b9544c424e51e4c2000001000000000000000000000000c34100b85c441f1800cbffeb03008080d9420d0041d1f2010000a3c13a004600f900c0c69362b9544c424e51e4c2000001000000000000000000000000c24100c45c441f1500d7fff003008080fe4c0d00d486f4010000abc83a004600fa00c8cd9362b9544c424e51e4c2000001000000000000000000000080c34100c85c441f1300c1fff20300808060550d00d324f7010000b3cf3a004600fb00d0d49362b9544c424e51e4c2000001000000000000000000000000c34100d05c441e1c00c9ffef030080803b600d00d3b5f8010000bbd63a004600fc00d8db9362b9544c424e51e4c2000001000000000000000000000080c34100d45c441e1b00c9fff2030080809d680d00689ffa010000c3dd3a004600fd00e0e29362b9544c424e51e4c2000001000000000000000000000000c44100ec5c441e1700c8fff4030080802e740d0049b0fc010000cbe43a004600fe00e8e99362b9544c424e51e4c2000001000000000000000000000000c34100f45c441e1300d1fff8030080807e7d0d00cc63fe010000d3eb3a004600ff00f0f09362b9544c424e51e4c2000001000000000000000000000000c24100fc5c441e1700cfffef0300808059880d00539d00020000dbf23a0046000001f8f79362b9544c424e51e4c2000001000000000000000000000000c34100005d441e1e00c7ffee0300808063910d00c95202020000e3f93a004600010100ff9362b9544c424e51e4c2000001000000000000000000000080c24100085d441e1400d2fff303008080689c0d00692504020000eb003b004600020108069462b9544c424e51e4c2000001000000000000000000000000c24100185d441e1500c9fff8030080801ea50d00be9506020000f3073b0046000301100d9462b9544c424e51e4c2000001000000000000000000000000c14100285d441e1d00cafff8030080806daf0d00497108020000fb0e3b004600040118149462b9544c424e51e4c2000001000000000000000000000000c241003c5d441e2300cdfff10300808007b80d00d3c50a02000003163b0046000501201b9462b9544c424e51e4c2000001000000000000000000000000c34100585d441e0f00c5fffb0300808002c20d00c6fd0b0200000b1d3b004600060128229462b9544c424e51e4c2000001000000000000000000000000c341006c5d441e0d00ccfff40300808064ca0d00d3740e02000013243b004600070130299462b9544c424e51e4c2000001000000000000000000000000c241008c5d441f0d00cafff703008080cbd50d004359100200001b2b3b004600080138309462b9544c424e51e4c2000001000000000000000000000000c24100a45d441f1200c5fff503008080d5de0d0093531202000023323b004600090140379462b9544c424e51e4c2000001000000000000000000000000c14100d05d441f1700ccfff00300808044e80d008921140200002b393b0046000a01483e9462b9544c424e51e4c2000001000000000000000000000080c14100005e441f0e00c6fffc030080804af20d004f2c1602000033403b000160000000364a821036670000364a8210366700808ac7649c4dc6808d922084104260808d92208410426036808d922084104260a3a11461360a95626a2600000f02010000000a000000000000000600000042020000020302000000000009070000013a0000a6823403ea30550000e8ea02ea3055000000384f4d1132544c4f53000000000000e8ea02ea305510afeb4f425600000004544c4f53000000013a0000a6823403ea30558092ca19ab9cb1ca000000384f4d1132544c4f53000000008092ca19ab9cb1ca10c8d632010000000004544c4f53000000019301000000000000ea30550000000000ea305500000020525abbba00000000000000000000000000ea30556900000000000000000004544c4f53000000ef29b9415600000004544c4f530000007cc5c6cf0100000004544c4f53000000ef29b9415600000004544c4f53000000f8678c2fc9d800000452455800000000000000000000000004544c4f530000002c00000000000000014a008092ca19ab9cb1ca8092ca19ab9cb1ca00000000674dbda90000e8ea02ea30558092ca19ab9cb1ca200000e8ea02ea3055e8030000000000000807000000000000360a956200000000013a000000000000ea30550000000000ea3055000000406573bda9000000406573bda90000000000ea305510f50600000000000000c39dd000000000014a000000000000ea30550000000000ea30550000c093ba6c32bd0000c093ba6c32bd0000000000ea30552060a2d25f4db53155100c7277999635c508000000160000003b175054bbc54e5401b402000000000000ea30550000000000ea305570b3922aeaa41ac270b3922aeaa41ac20000000000ea3055890210dd37f750773155000000001510dd37f75077315508000000c0d54598469555cb0c000000508f71693a4ca3ca0c000000806954791a87afaa0c000000000090265d95b1340c00000080d3cdd81c88683c0c000000500fa651651f9d490c000000000000994ee8413d0c000000a02a4598469555cb0c00000000000020397a403d0c00000010f0a42ed25cfd450c000000a0129dc8244ca3ca0c000000406f85f1603a9d810c00000050cf55df6555ab490c000000a0aece51234ca3ca0c0000008021a2f160aaa2410c00000010b29a19ab4cdd610c000000100c7277999635c50c000000108c3be61a4ca3ca0000000000118d67bb6cd445000000008063f68c46aaa2ca0000000001e801000000000000ea30550000000000ea3055000000004473686400000000447368640000000000ea3055bd010000100000000000e8030000c02709000c000000f40100001400000064000000400d0300f4010000f049020064000000100e00005802000080533b000010000004000600c01f24e1070000004615c125020000008e0bb56201000000318d4f54a1854f54a04a03983ee0050000000000000000000000000000000000980c0000bacbbbac1e000000a0fc0f6b709005001500a903fcae110b7e42248db45302e9670aec8a4f5400000000400048e54e5400000000000000000000000000018502000000000000ea30550000000000ea30550000c057219de8ad10dd37f75077315510dd37f750773155da0110dd37f7507731554230ef054e09344200031446e209d483df5b0cfd7869a5ce0cd8e195919b7e2f080c4d6802a63259d12d01001168747470733a2f2f656f7372696f2e696f1c000000719c2c0000000000ac200000a04a03983ee005004c00010000006950726f6475636572206163636f756e74207761732064656163746976617465642062656361757365206974207265616368656420746865206d6178696d756d206d697373656420626c6f636b7320696e207468697320726f746174696f6e2074696d656672616d652e0000000002000000c95f3f50000e7265736f757263655f757361676503013b00808d922084104260006c8d4f5433b5000000000000a900000000000000006c8d4f541d1d0300000000000a010000000000002a49000000000000013b008092ca19ab9cb1ca006c8d4f5446572100000000006300000000000000006c8d4f5444d10900000000000301000000000000a1c5050000000000013b000000000000ea3055006c8d4f5400000000000000000000000000000000006c8d4f540106f40500000000c800000000000000ce625b010000000000157265736f757263655f6c696d6974735f737461746501015300003be9670a6d99a300000000001101000000000000003be9670a6652c60b000000003003000000000000e10cd5a2500000007224f666520000008683e237020000000000803e0000000000c2eb0b00000000"}'

        const resultElement = ShipRecord.from(JSON.parse(data))

        const traces = Serializer.decode({
            type: 'transaction_trace[]',
            data: resultElement.traces.array as Uint8Array,
            abi: shipAbi,
        }) as any[]
    })
})
