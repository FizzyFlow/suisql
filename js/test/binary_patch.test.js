import { describe, expect, it } from "vitest";
import SuiSqlBinaryPatch from '../src/SuiSqlBinaryPatch';
import SuiSql from "../src/SuiSql";

const areEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

let db = null;

describe("test binary patches", () => {
    it("dbs are equal no matter time", {}, async () => {
        // check that there're no random bytes in binary representation of the database
        const db1 = new SuiSql({ name: 'test', });

        await new Promise((res)=>setTimeout(res, 100));

        const db2 = new SuiSql({ name: 'test', });

        await new Promise((res)=>setTimeout(res, 100));

        await db1.run('CREATE TABLE employees(id integer primary key,  name    text);'); 
        await db1.run('INSERT INTO employees (id, name) VALUES (1, "John Doe");');

        await new Promise((res)=>setTimeout(res, 100));

        await db2.run('CREATE TABLE employees(id integer primary key,  name    text);'); 
        await new Promise((res)=>setTimeout(res, 100));
        await db2.run('INSERT INTO employees (id, name) VALUES (1, "John Doe");');

        const binary1 = db1.export();
        const binary2 = db2.export();

        expect(binary1.length > 0).toBeTruthy();
        expect(areEqual(binary1, binary2)).toBeTruthy();

    });

    it("test binary patching the database", {}, async () => {
        const db1 = new SuiSql({ name: 'test', });
        await db1.run('CREATE TABLE employees(id integer primary key,  name    text);'); 
        await db1.run('INSERT INTO employees (id, name) VALUES (1, "John Doe");');

        const baseBinaryView = db1.getBinaryView();

        await db1.run('INSERT INTO employees (id, name) VALUES (null, "Pluck");');
        await db1.run('INSERT INTO employees (id, name) VALUES (null, "Pluck");');
        await db1.run('INSERT INTO employees (id, name) VALUES (null, "Pluck");');
        await db1.run('INSERT INTO employees (id, name) VALUES (null, "Pluck");');
        await db1.run('INSERT INTO employees (id, name) VALUES (null, "Pluck");');

        const changedBinaryView = db1.getBinaryView();

        const patch = await changedBinaryView.getBinaryPatch(baseBinaryView);

        console.log(patch);

        const patched = await baseBinaryView.getPatched(patch);

        console.log(patched);

        expect(areEqual(baseBinaryView.binary, patched)).toBeFalsy();
        expect(areEqual(changedBinaryView.binary, patched)).toBeTruthy();
    });

    // it("test binary patch", {}, async () => {
    //     const a = new Uint8Array([10, 20, 30, 40, 50]);
    //     const b = new Uint8Array([10, 99, 20, 30, 88, 89, 40, 50, 77]);

    //     // console.log(SuiSqlBinaryPatch.diff(a, b));


    //     db = new SuiSql({ name: 'test', }); // we are not going to save it
    //     expect(db).toBeTruthy();
    //     await db.initialize();

    //     // need to run some query, as empty database is just 0 bytes
    //     await db.run('CREATE TABLE employees(id integer primary key,  name    text);'); 

    //     // now it has full structure:
    //     const binary1 = db.binary.getPage(0);
    //     const binary_q1 = db.binary.getPage(1);
    //     console.log(await db.binary.getPageSha256(0));

    //     // need to run some query, as empty database is just 0 bytes
    //     await db.run('CREATE TABLE employees2(id integer primary key,  name    text);'); 

    //     console.log('inserted');

    //     const binary2 = db.binary.getPage(0);
    //     const binary_q2 = db.binary.getPage(1);
    //     console.log('inserted', binary2);
    //     console.log(await db.binary.getPageSha256(0));

    //     await new Promise((res)=>setTimeout(res, 1000));

    //     // console.log(await SuiSqlBinaryPatch.diff2(binary1, binary2));
    //     // console.log(await SuiSqlBinaryPatch.diff2(binary_q1, binary_q2));

    //     console.log(SuiSqlBinaryPatch.binaryDiff(binary1, binary2));

    //     const patch1 = SuiSqlBinaryPatch.binaryDiff(binary1, binary2);
    //     const patched1 = SuiSqlBinaryPatch.applyFixedLengthPatch(binary1, patch1);

    //     expect(areEqual(patched1, binary2)).toBeTruthy();

    //     const patchq = SuiSqlBinaryPatch.binaryDiff(binary_q1, binary_q2);

    //     const patchedq = SuiSqlBinaryPatch.applyFixedLengthPatch(binary_q1, patchq);

    //     expect(areEqual(patchedq, binary_q2)).toBeTruthy();

    //     await new Promise((res)=>setTimeout(res, 1000));
    //     // console.log(binary1);
    //     // console.log(binary2);
    // });
});