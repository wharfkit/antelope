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

    test('null data', function () {
        const abi = ABI.from({
            version: 'eosio::abi/1.1',
            structs: [
                {
                    name: 'doresources',
                    base: '',
                    fields: [],
                },
            ],
            actions: [
                {
                    name: 'doresources',
                    type: 'doresources',
                    ricardian_contract: '',
                },
            ],
        })
        const data = ''
        Serializer.decode({data, type: 'noop', abi})
    })
})
