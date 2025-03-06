import { describe, expect, it } from "vitest";
import SuiSql from "../src/SuiSql";

describe("set up empty db", () => {
    it("works", async () => {
        const db = new SuiSql();
        const state = await db.initialize();
        expect(state).toEqual('EMPTY');
        expect(db.writeExecutions.length).toEqual(0);

        await db.iterateStatements(`
            DROP TABLE IF EXISTS employees;
            CREATE TABLE employees( id          integer,  name    text,
                          designation text,     manager integer,
                          hired_on    date,     salary  integer,
                          commission  float,    dept    integer);

            INSERT INTO employees VALUES (1,'JOHNSON','ADMIN',6,'1990-12-17',18000,NULL,4);
            INSERT INTO employees VALUES (2,'HARDING','MANAGER',9,'1998-02-02',52000,300,3);
            INSERT INTO employees VALUES (3,'TAFT','SALES I',2,'1996-01-02',25000,500,3);
            INSERT INTO employees VALUES (4,'HOOVER','SALES I',2,'1990-04-02',27000,NULL,3);
            INSERT INTO employees VALUES (5,'LINCOLN','TECH',6,'1994-06-23',22500,1400,4);
            INSERT INTO employees VALUES (6,'GARFIELD','MANAGER',9,'1993-05-01',54000,NULL,4);
            INSERT INTO employees VALUES (7,'POLK','TECH',6,'1997-09-22',25000,NULL,4);
            INSERT INTO employees VALUES (8,'GRANT','ENGINEER',10,'1997-03-30',32000,NULL,2);
            INSERT INTO employees VALUES (9,'JACKSON','CEO',NULL,'1990-01-01',75000,NULL,4);
            INSERT INTO employees VALUES (10,'FILLMORE','MANAGER',9,'1994-08-09',56000,NULL,2);
            INSERT INTO employees VALUES (11,'ADAMS','ENGINEER',10,'1996-03-15',34000,NULL,2);
            INSERT INTO employees VALUES (12,'WASHINGTON','ADMIN',6,'1998-04-16',18000,NULL,4);
            INSERT INTO employees VALUES (13,'MONROE','ENGINEER',10,'2000-12-03',30000,NULL,2);
            INSERT INTO employees VALUES (14,'ROOSEVELT','CPA',9,'1995-10-12',35000,NULL,1);
            `);

        expect(db.writeExecutions.length > 0).toBeTruthy();

        const res = await db.prepare("SELECT designation,COUNT(*) AS nbr, (AVG(salary)) AS avg_salary FROM employees GROUP BY designation ORDER BY avg_salary DESC;");
        const count = await res.forEach((row)=>{
            // row:  { designation: 'CEO', nbr: 1, avg_salary: 75000 }
            // row:  { designation: 'MANAGER', nbr: 3, avg_salary: 54000 }
            // row:  { designation: 'CPA', nbr: 1, avg_salary: 35000 }
            // row:  { designation: 'ENGINEER', nbr: 3, avg_salary: 32000 }
            // row:  { designation: 'SALES I', nbr: 2, avg_salary: 26000 }
            // row:  { designation: 'TECH', nbr: 2, avg_salary: 23750 }
            // row:  { designation: 'ADMIN', nbr: 2, avg_salary: 18000 }
        });

        expect(count).toEqual(7);
    });
});