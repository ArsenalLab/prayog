import { z } from 'zod';
import { ErrorProfileSchema } from './error_agent.mjs';

// Strict output validation schema for Agent 2 (Component & Code Context)
export const ComponentContextSchema = z.object({
    errorProfile: ErrorProfileSchema,
    failingComponent: z.string().describe("Name of the failing class, function, query, or component (e.g. CustomerService.getCustomerDetails)"),
    failingFilePath: z.string().describe("Relative file path containing the failing component logic"),
    failingSnippet: z.string().describe("Code snippet containing the failing query or logic"),
    architectureContext: z.string().describe("Architectural description of where this component fits in the database/query execution layer"),
    dependencies: z.array(z.string()).describe("List of other files or services calling or depending on this component")
});

export const promptTemplate = `
You are the **Component & Code Context Agent** in a production-ready multi-agent handoff pipeline.

### Inputs
You are given the structured Error Profile from the Diagnostics Agent:
\`\`\`json
{{ERROR_PROFILE}}
\`\`\`

Target DB2 Codebase repository path: "{{DB2_REPO_PATH}}"

### Objectives
1. Review the input Error Profile, especially the error code (e.g., SQL0102N), error message, and stack trace.
2. Query and inspect the codebase at "{{DB2_REPO_PATH}}" to find the file and code lines where the error originated.
3. Extract:
   - The failing component/class/service/function name.
   - The exact relative file path where the issue lies.
   - The relevant code snippet (the query or business logic that triggered the error).
   - Architectural context explaining what this component does in the system.
   - A list of dependent components or caller files that import/invoke this failing component.
4. Construct a strict, structured Component Context payload matching the output schema.

### Execution Instructions
- Use your tools to search the directory "{{DB2_REPO_PATH}}" for the files mentioned in the stack trace (e.g., "services/customer_service.js", "lib/db2/connection.js").
- Read the files to extract the exact code snippet that compiles/constructs the query or executes the failing logic.
- Trace references to find which files or modules import or depend on this file (look for imports/requires).
- Format your final answer exactly inside the XML handoff block.

### XML Formatting Constraints
- **CRITICAL**: Do NOT write, reference, or preview the literal characters of the opening XML tag in your thoughts, description, or introduction.
- Only output the XML block once, at the very end of your response, enclosing your JSON object.
- The tag name to use at the end is "handoff_state".

### Handoff Schema
Your output inside the handoff block must conform to this JSON schema:
\`\`\`json
{
  "errorProfile": {
     // ... complete error profile object passed in inputs ...
  },
  "failingComponent": "string",
  "failingFilePath": "string",
  "failingSnippet": "string",
  "architectureContext": "string",
  "dependencies": ["string"]
}
\`\`\`

Example Output (at the very end of your response):
<handoff_state>
{
  "errorProfile": {
     "status": "error",
     "errorCode": "SQL0102N",
     "errorMessage": "The string constant is too long.",
     "stackTrace": "at DB2Connection.executeQuery (lib/db2/connection.js:104:15)...",
     "failureContext": "Query failed during regional customer lookup.",
     "timestamp": "2026-03-30T10:00:01.234Z"
  },
  "failingComponent": "CustomerService.getCustomerDetails",
  "failingFilePath": "services/customer_service.js",
  "failingSnippet": "const query = \`SELECT * FROM ...\`;",
  "architectureContext": "Service layer component responsible for customer querying and DB2 customer data access.",
  "dependencies": ["routes/customer.js"]
}
</handoff_state>

Begin your codebase exploration now. Locate and read the relevant source files inside the repo path "{{DB2_REPO_PATH}}".
`;
