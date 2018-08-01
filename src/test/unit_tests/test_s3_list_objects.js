/* Copyright (C) 2016 NooBaa */
'use strict';

// setup coretest first to prepare the env
const coretest = require('./coretest');
coretest.setup();

const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const crypto = require('crypto');

mocha.describe('s3.listObjects()', function() {

    const { s3 } = coretest;

    mocha.describe('works with small number of files and folders', function() {
        this.timeout(600000); // eslint-disable-line no-invalid-this

        const BKT = 'test-s3-list-objects-small';
        const folders_to_upload = Object.freeze(_.times(23, i => `folder${i}/`));
        const files_in_folders_to_upload = Object.freeze(_.times(29, i => `folder1/file${i}`));
        const files_in_utf_diff_delimiter = Object.freeze(_.times(31, i => `תיקיה#קובץ${i}`));
        const files_without_folders_to_upload = Object.freeze(_.times(37, i => `file_without_folder${i}`));
        const test_folders = Object.freeze(_.sortBy(folders_to_upload.map(s => ({ Prefix: s })), 'Prefix'));
        const test_objects = [];

        mocha.before(async function() {
            await create_test_bucket_and_objects(test_objects, BKT,
                folders_to_upload,
                files_in_folders_to_upload,
                files_without_folders_to_upload,
                files_in_utf_diff_delimiter
            );
        });

        mocha.it('works with Delimiter=#', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    Delimiter: '#',
                }).promise(), {
                    IsTruncated: false,
                    CommonPrefixes: [{ Prefix: 'תיקיה#' }],
                    Contents: test_objects.filter(f =>
                        folders_to_upload.includes(f.Key) ||
                        files_in_folders_to_upload.includes(f.Key) ||
                        files_without_folders_to_upload.includes(f.Key)
                    )
                }
            );
        });

        mocha.it('works with Delimiter=/', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    Delimiter: '/',
                }).promise(), {
                    IsTruncated: false,
                    CommonPrefixes: test_folders,
                    Contents: test_objects.filter(f =>
                        files_without_folders_to_upload.includes(f.Key) ||
                        files_in_utf_diff_delimiter.includes(f.Key)
                    ),
                }
            );
        });

        mocha.it('works with Delimiter=/ and Prefix=folder', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    Delimiter: '/',
                    Prefix: 'folder',
                }).promise(), {
                    IsTruncated: false,
                    CommonPrefixes: test_folders,
                    Contents: [],
                }
            );
        });

        mocha.it('works with Delimiter=/ and Prefix=folder1/', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    Delimiter: '/',
                    Prefix: 'folder1/',
                }).promise(), {
                    IsTruncated: false,
                    CommonPrefixes: [],
                    Contents: test_objects.filter(f =>
                        f.Key === 'folder1/' ||
                        files_in_folders_to_upload.includes(f.Key)
                    ),
                }
            );
        });

        mocha.it('works with Delimiter=/ and MaxKeys=5', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    Delimiter: '/',
                    MaxKeys: 5,
                }).promise(), {
                    IsTruncated: true,
                    CommonPrefixes: [],
                    Contents: test_objects.filter(f =>
                        f.Key === 'file_without_folder0' ||
                        f.Key === 'file_without_folder1' ||
                        f.Key === 'file_without_folder10' ||
                        f.Key === 'file_without_folder11' ||
                        f.Key === 'file_without_folder12'
                    ),
                }
            );
        });

        mocha.it('works with Prefix=file_without', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    Prefix: 'file_without',
                }).promise(), {
                    IsTruncated: false,
                    CommonPrefixes: [],
                    Contents: test_objects.filter(f =>
                        files_without_folders_to_upload.includes(f.Key)
                    ),
                }
            );
        });

        mocha.it('works with Prefix=file_without_folder0', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    Prefix: 'file_without_folder0',
                }).promise(), {
                    IsTruncated: false,
                    CommonPrefixes: [],
                    Contents: test_objects.filter(f =>
                        f.Key === files_without_folders_to_upload[0]
                    ),
                }
            );
        });

        mocha.it('works with MaxKeys=0', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    MaxKeys: 0,
                }).promise(), {
                    IsTruncated: false,
                    CommonPrefixes: [],
                    Contents: [],
                }
            );
        });

        mocha.it('works with Delimiter=/ and MaxKeys=3 iteration', async function() {
            test_list_objects(
                await iterate_list_objects({
                    Bucket: BKT,
                    Delimiter: '/',
                    MaxKeys: 3,
                }), {
                    IsTruncated: false,
                    CommonPrefixes: test_folders,
                    Contents: test_objects.filter(f =>
                        files_without_folders_to_upload.includes(f.Key) ||
                        files_in_utf_diff_delimiter.includes(f.Key)
                    ),
                }
            );
        });
    });

    mocha.describe('works with large (>1000) number of files and folders', async function() {
        this.timeout(600000); // eslint-disable-line no-invalid-this

        const BKT = 'test-s3-list-objects-large';
        const test_objects = [];

        mocha.before(async function() {
            await create_test_bucket_and_objects(test_objects, BKT,
                ..._.times(20, i => _.times(111, j => `max_keys_test_${i}_${j}`))
            );
        });

        mocha.it('works with MaxKeys=5555 (above real limit = 1000)', async function() {
            test_list_objects(
                await s3.listObjects({
                    Bucket: BKT,
                    MaxKeys: 5555, // we expect the server to truncate to 1000 in any case
                }).promise(), {
                    IsTruncated: true,
                    CommonPrefixes: [],
                    Contents: test_objects.slice(0, 1000),
                }
            );
        });

        mocha.it('works with Delimiter=/ and MaxKeys=3 iteration', async function() {
            test_list_objects(
                await iterate_list_objects({
                    Bucket: BKT,
                    Delimiter: '/',
                    MaxKeys: 3,
                }), {
                    IsTruncated: false,
                    CommonPrefixes: [],
                    Contents: test_objects,
                }
            );
        });

        mocha.it('throws InvalidArgument with MaxKeys=-666', async function() {
            try {
                await s3.listObjects({
                    Bucket: BKT,
                    MaxKeys: -666,
                }).promise();
                assert.fail('expected error InvalidArgument');
            } catch (err) {
                assert.strictEqual(err.code, 'InvalidArgument');
            }
        });

    });


    ///////////
    // UTILS //
    ///////////


    /**
     * @param {AWS.S3.ObjectList} test_objects
     * @param {String} bucket
     * @param {String[]} keys_lists
     */
    async function create_test_bucket_and_objects(test_objects, bucket, ...keys_lists) {
        const map = new Map();
        await s3.createBucket({ Bucket: bucket }).promise();
        await Promise.all(keys_lists.map(async keys => {
            for (const key of keys) {
                const body = crypto.randomBytes(64);
                const res = await s3.putObject({
                    Bucket: bucket,
                    Key: key,
                    Body: body,
                }).promise();
                assert.strictEqual(res.ETag, `"${crypto.createHash('md5').update(body).digest('hex')}"`);
                map.set(res.ETag, key);
            }
        }));
        const list_res = await iterate_list_objects({ Bucket: bucket });
        // check that all the returned list is exactly as expected
        for (const obj of list_res.Contents) {
            const key = map.get(obj.ETag);
            assert.strictEqual(key, obj.Key);
            map.delete(obj.ETag);
        }
        assert.strictEqual(map.size, 0);
        test_list_objects_sanity(list_res);
        test_objects.push(...list_res.Contents);
        Object.freeze(test_objects);
    }

    /**
     * @param {AWS.S3.ListObjectsRequest} params
     * @returns {AWS.S3.ListObjectsOutput}
     */
    async function iterate_list_objects(params) {
        const full_res = {
            IsTruncated: true,
            Contents: [],
            CommonPrefixes: [],
        };
        while (full_res.IsTruncated) {
            const res = await s3.listObjects(params).promise();
            params.Marker = res.NextMarker;
            full_res.IsTruncated = res.IsTruncated;
            full_res.Contents.push(...res.Contents);
            full_res.CommonPrefixes.push(...res.CommonPrefixes);
        }
        return full_res;
    }

    /**
     * @param {AWS.S3.ListObjectsOutput} res
     * @param {AWS.S3.ListObjectsOutput} expected
     */
    function test_list_objects(res, expected) {
        for (const key of Object.keys(expected)) {
            assert.deepStrictEqual(res[key], expected[key]);
        }
        test_list_objects_sanity(res);
    }

    /**
     * @param {AWS.S3.ListObjectsOutput} res
     */
    function test_list_objects_sanity(res) {
        for (let i = 1; i < res.Contents.length; ++i) {
            const curr = res.Contents[i];
            const prev = res.Contents[i - 1];
            assert.ok(prev.Key <= curr.Key, `${prev.Key} <= ${curr.Key}`);
        }
    }

});
