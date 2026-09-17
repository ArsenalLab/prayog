import { CustomerService } from '../services/customer_service.js';

const customerService = new CustomerService();

export class RequestHandler {
    async handle(req, res) {
        const { customerId, region } = req.query;
        try {
            const customer = await customerService.getCustomerDetails(customerId, region);
            res.json({ status: "success", data: customer });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
}
