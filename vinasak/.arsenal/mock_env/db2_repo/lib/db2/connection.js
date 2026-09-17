export class DB2Connection {
    async executeQuery(sql) {
        // Mock DB2 query execution engine
        if (sql.length > 500) {
            const error = new Error('[IBM][CLI Driver][DB2] SQL0102N  The string constant beginning with "' + sql.substring(0, 80) + '..." is too long or has too many parameters. SQLSTATE=54002');
            error.code = -102;
            error.sqlState = '54002';
            throw error;
        }
        return [{ id: "CUST-10023", name: "Acme Corp", region: "US-EAST" }];
    }
}

export const db = new DB2Connection();
