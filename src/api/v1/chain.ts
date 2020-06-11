import {APIClient} from '../client'

import {Checksum256} from '../../chain/checksum'
import {Name} from '../../chain/name'
import {Struct} from '../../chain/struct'
import {TimePoint} from '../../chain/time'
import {UInt32, UInt64} from '../../chain/integer'

class APIResponse extends Struct {
    static abiName = 'api_response'
}

export class ChainAPI {
    constructor(private client: APIClient) {}

    async get_info() {
        return this.client.call({
            path: '/v1/chain/get_info',
            responseType: ChainAPI.GetInfoResponse,
        }) as Promise<ChainAPI.GetInfoResponse>
    }
}

export namespace ChainAPI {
    export class GetInfoResponse extends APIResponse {
        /** Hash representing the last commit in the tagged release. */
        @Struct.field('string') server_version!: string
        /** Hash representing the ID of the chain. */
        @Struct.field('checksum256') chain_id!: Checksum256
        /** Highest block number on the chain */
        @Struct.field('uint32') head_block_num!: UInt32
        /** Highest block number on the chain that has been irreversibly applied to state. */
        @Struct.field('uint32') last_irreversible_block_num!: UInt32
        /** Highest block ID on the chain that has been irreversibly applied to state. */
        @Struct.field('checksum256') last_irreversible_block_id!: Checksum256
        /** Highest block ID on the chain. */
        @Struct.field('checksum256') head_block_id!: Checksum256
        /** Highest block unix timestamp. */
        @Struct.field('time_point') head_block_time!: TimePoint
        /** Producer that signed the highest block (head block). */
        @Struct.field('name') head_block_producer!: Name
        /** CPU limit calculated after each block is produced, approximately 1000 times `blockCpuLimit`. */
        @Struct.field('uint64') virtual_block_cpu_limit!: UInt64
        /** NET limit calculated after each block is produced, approximately 1000 times `blockNetLimit`. */
        @Struct.field('uint64') virtual_block_net_limit!: UInt64
        /** Actual maximum CPU limit. */
        @Struct.field('uint64') block_cpu_limit!: UInt64
        /** Actual maximum NET limit. */
        @Struct.field('uint64') block_net_limit!: UInt64
        /** String representation of server version. */
        @Struct.field('string?') server_version_string?: string
        /** Sequential block number representing the best known head in the fork database tree. */
        @Struct.field('uint32') fork_db_head_block_num?: UInt32
        /** Hash representing the best known head in the fork database tree. */
        @Struct.field('checksum256') fork_db_head_block_id?: Checksum256
    }
}
