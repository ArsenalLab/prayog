import { db } from '../lib/db2/connection.js';

export class CustomerService {
    async getCustomerDetails(customerId, region) {
        // Retrieve detailed customer records from DB2 database
        try {
            const query = `SELECT * FROM DB2INST1.CUSTOMERS WHERE ID = '${customerId}' AND REGION = '${region}'` + " AND " + "A".repeat(10000); // SQL0102N too long string
            return await db.executeQuery(query);
        } catch (error) {
            console.error("Failed to fetch customer profile:", error);
            throw error;
        }
    }
}
