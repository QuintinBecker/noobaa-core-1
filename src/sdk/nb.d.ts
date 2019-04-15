export as namespace nb;

import { ObjectId as MongoID, Binary as MongoBinary } from 'mongodb';

type Semaphore = import('../util/semaphore');
type KeysSemaphore = import('../util/keys_semaphore');
type SensitiveString = import('../util/sensitive_string');

type BigInt = number | { n: number; peta: number; };
type Region = string;
type DigestType = 'sha1' | 'sha256' | 'sha384' | 'sha512';
type CompressType = 'snappy' | 'zlib';
type CipherType = 'aes-256-gcm';
type ParityType = 'isa-c1' | 'isa-rs' | 'cm256';
type ResourceType = 'HOSTS' | 'CLOUD' | 'INTERNAL';
type NodeType =
    'BLOCK_STORE_S3' |
    'BLOCK_STORE_MONGO' |
    'BLOCK_STORE_AZURE' |
    'BLOCK_STORE_GOOGLE' |
    'BLOCK_STORE_FS' |
    'ENDPOINT_S3';
type MapByID<T> = { [id: string]: T };

interface Base {
    toJSON?(): Object | string;
    toString?(): string;
}

type ID = MongoID;
type DBBuffer = MongoBinary | Buffer;

interface System extends Base {
    _id: ID;
    name: string;
    default_chunk_config?: ChunkConfig;
    buckets_by_name: { [name: string]: Bucket };
    tiering_policies_by_name: { [name: string]: Tiering };
    tiers_by_name: { [name: string]: Tier };
    pools_by_name: { [name: string]: Pool };
    chunk_configs_by_id: { [id: string]: ChunkConfig };
}

interface Account extends Base {
    _id: ID;
    name: string;
    system: System;
    email: SensitiveString;
    next_password_change: Date;
    is_support?: boolean;
    allowed_buckets: {
        full_permission: boolean;
        permission_list: Bucket[];
    },
    access_keys: {
        access_key: SensitiveString;
        secret_key: SensitiveString;
    }[];
}

interface NodeAPI extends Base {
    _id: ID;
    name: string;
    pool: string; // name!
    node_type: NodeType;
    rpc_address: string;
    ip: string;
    online: boolean;
    writable: boolean;
    readable: boolean;
    is_cloud_node: boolean;
    is_mongo_node: boolean;
    host_id: string;
    heartbeat: number;
    os_info: {
        hostname: string,
    },
    drive: {
        mount: string,
    },
    // incomplete...
}

type NodesById = { [node_id: string]: NodeAPI };

interface Pool extends Base {
    _id: ID;
    name: string;
    system: System;
    resource_type: ResourceType;
    pool_node_type: NodeType;

    region?: Region;
    cloud_pool_info?: CloudPoolInfo;
    mongo_pool_info?: MongoPoolInfo;
}

interface CloudPoolInfo {

}

interface MongoPoolInfo {

}

interface Tier extends Base {
    _id: ID;
    name: string;
    system: System;
    chunk_config: ChunkConfig;
    data_placement: 'MIRROR' | 'SPREAD';
    mirrors: TierMirror[];
}

interface TierMirror {
    _id: ID;
    spread_pools: Pool[];
}

interface Tiering extends Base {
    _id: ID;
    name: string;
    system: System;
    chunk_split_config: {
        avg_chunk: number;
        delta_chunk: number;
    };
    tiers: {
        order: number;
        tier: Tier;
        spillover?: boolean;
        disabled?: boolean;
    }[];
}

interface TierStatus {
    pools: PoolsStatus;
    mirrors_storage: MirrorStatus[];
}

interface TieringStatus {
    [tier_id: string]: TierStatus
}

interface PoolsStatus {
    [pool_id: string]: {
        valid_for_allocation: boolean;
        num_nodes: number;
        resource_type: ResourceType;
    }
}

interface MirrorStatus {
    free: BigInt;
    regular_free: BigInt;
    redundant_free: BigInt;
}

interface Bucket extends Base {
    _id: ID;
    deleted?: Date;
    name: string;
    system: System;
    versioning: 'DISABLED' | 'SUSPENDED' | 'ENABLED';
    tiering: Tiering;

    tag?: string;
    namespace?: {
        read_resources: NamespaceResource[];
        write_resource: NamespaceResource;
    };
    quota?: Object;
    storage_stats: {
        last_update: number;
    };
    lifecycle_configuration_rules?: Object;
    lambda_triggers?: Object;
}

interface NamespaceResource {
    _id: ID;
    name: string;
    system: System;
    account: Account;
    connection: Object;
}

interface ChunkConfig extends Base {
    _id: ID;
    system: System;
    chunk_coder_config: ChunkCoderConfig;
}

interface ChunkCoderConfig {
    replicas: number;
    digest_type: DigestType;
    frag_digest_type: DigestType;
    compress_type: CompressType;
    cipher_type: CipherType;
    data_frags: number;
    parity_frags: number;
    parity_type: ParityType;
    lrc_group?: number;
    lrc_frags?: number;
    lrc_type?: ParityType;
}

interface LocationInfo {
    node_id?: string;
    host_id?: string;
    pool_id?: string;
    region?: Region;
}



////////////////////
// OBJECT MAPPING //
////////////////////


interface Chunk {
    _id: ID;
    bucket_id: ID;
    tier_id: ID;
    size: number;
    compress_size: number;
    frag_size: number;
    digest_b64: string;
    cipher_key_b64: string;
    cipher_iv_b64: string;
    cipher_auth_tag_b64: string;
    chunk_coder_config: ChunkCoderConfig;

    dup_chunk_id?: ID;
    had_errors?: boolean;
    data?: Buffer;

    is_accessible: boolean;
    is_building_blocks: boolean;
    is_building_frags: boolean;

    readonly frags: Frag[];
    readonly frag_by_index: { [frag_index: string]: Frag };
    readonly bucket: Bucket;
    readonly tier: Tier;
    readonly chunk_config: ChunkConfig;
    readonly parts: Part[];

    add_block_allocation(frag: Frag, pools: Pool[]);

    to_api(): ChunkInfo;
    to_db(): ChunkSchemaDB;
}

interface Frag {
    _id: ID;
    data_index?: number;
    parity_index?: number;
    lrc_index?: number;
    frag_index: string;
    digest_b64: string;
    blocks: Block[];

    data?: Buffer;
    // chunk: Chunk;

    is_accessible: boolean;
    is_building_blocks: boolean;

    to_api(): FragInfo;
    to_db(): FragSchemaDB;
}

interface Block {
    _id: ID;
    node_id: ID;
    pool_id: ID;
    chunk_id: ID;
    frag_id: ID;
    bucket_id: ID;
    size: number;
    address: string;

    node: NodeAPI;
    pool: Pool;
    bucket: Bucket;
    system: System;

    // frag: Frag;
    // chunk: Chunk;

    is_accessible: boolean;

    is_preallocated: boolean;
    allocation_pools?: Pool[];
    is_allocation: boolean;
    is_deletion: boolean;
    is_future_deletion: boolean;

    // is_misplaced: boolean;
    // is_local_mirror: boolean;
    // is_missing: boolean;
    // is_tampered: boolean;

    to_block_md(): BlockMD;
    to_api(adminfo?: boolean): BlockInfo;
    to_db(): BlockSchemaDB;
}

interface Part {
    _id: ID;
    deleted?: Date;
    start: number;
    end: number;
    seq: number;
    obj_id: ID;
    multipart_id: ID;
    chunk_id: ID;

    to_api(): PartInfo;
    to_db(): PartSchemaDB;
}

interface ObjectMD {
    _id: ID;
    deleted?: Date;
    bucket: Bucket;
    system: System;
    key: string;
    delete_marker?: boolean;
    // partial
}

interface ObjectMultipart {
    _id: ID;
    obj: ObjectMD;
    // partial
}



interface ChunkInfo {
    _id?: string;
    bucket_id?: string;
    tier_id?: string;
    dup_chunk?: string;
    chunk_coder_config?: nb.ChunkCoderConfig;
    size: number;
    compress_size?: number;
    frag_size?: number;
    digest_b64?: string;
    cipher_key_b64?: string;
    cipher_iv_b64?: string;
    cipher_auth_tag_b64?: string;
    frags: FragInfo[];
    parts?: PartInfo[];
    is_accessible?: boolean;
    is_building_blocks?: boolean;
    is_building_frags?: boolean;

    // Properties not in the API but used in memory
    data?: Buffer;
}

interface FragInfo {
    _id?: string;
    data_index?: number;
    parity_index?: number;
    lrc_index?: number;
    digest_b64?: string;
    blocks?: BlockInfo[];

    // Properties not in the API but used in memory
    data?: Buffer;
}

interface BlockInfo {
    block_md: BlockMD;
    is_accessible?: boolean;
    is_allocation?: boolean;
    is_deletion?: boolean;
    is_future_deletion?: boolean;
    adminfo?: {
        node_name: string;
        host_name: string;
        mount: string;
        pool_name: string;
        node_ip: string;
        online: boolean;
        in_cloud_pool: boolean;
        in_mongo_pool: boolean;
        mirror_group: string;
    };
}

interface BlockMD {
    id: string;
    address?: string;
    node?: string;
    pool?: string;
    size?: number;
    digest_type?: string;
    digest_b64?: string;
    node_type?: string;
    is_preallocated?: boolean;
}

interface PartInfo {
    obj_id: string;
    chunk_id: string;
    multipart_id?: string;
    seq: number;
    start: number;
    end: number;
    chunk_offset?: number;
}


interface ChunkSchemaDB {
    _id: ID;
    system: ID;
    deleted?: Date;
    bucket: ID;
    tier: ID;
    tier_lru: Date;
    chunk_config: ID;
    size: number;
    compress_size: number;
    frag_size: number;
    dedup_key: DBBuffer;
    digest: DBBuffer;
    cipher_key: DBBuffer;
    cipher_iv: DBBuffer;
    cipher_auth_tag: DBBuffer;
    frags: FragSchemaDB[];
    parts?: PartSchemaDB[]; // see MDStore.load_parts_objects_for_chunks()
    // objects?: ObjectMDSchemaDB[]; // see MDStore.load_parts_objects_for_chunks()
}

interface FragSchemaDB {
    _id: ID;
    data_index?: number;
    parity_index?: number;
    lrc_index?: number;
    digest?: DBBuffer;
    blocks?: BlockSchemaDB[]; // see MDStore.load_blocks_for_chunk()
}

interface BlockSchemaDB {
    _id: ID;
    system: ID;
    bucket: ID;
    node: ID;
    pool: ID;
    chunk: ID;
    frag: ID;
    size: number;

    deleted?: Date;
    reclaimed?: Date;
}

interface PartSchemaDB {
    _id: ID;
    system: ID;
    bucket: ID;
    chunk: ID;
    obj: ID;
    multipart: ID;

    seq: number;
    start: number;
    end: number;
    chunk_offset?: number;

    deleted?: Date;
    uncommitted?: boolean;
}
