### ⚠️ Critical Regression — SQL0102N / SQLSTATE=54002 · `services/customer_service.js` Line 6

**Introduced by:** Dev John <john.doe@ibm.com>  
**Commit:** `e4f5g6h789abcedf0123456789abcdef01234567`  
**Severity:** 🔴 Production-breaking — all calls to `getCustomerDetails` fail unconditionally

---

#### What Is Wrong

**Line 6** contains two compounding anti-patterns:

```javascript
// ❌ CURRENT (BROKEN) — services/customer_service.js:6
const query = `SELECT * FROM DB2INST1.CUSTOMERS WHERE ID = '${customerId}' AND REGION = '${region}'`
            + " AND " + "A".repeat(10000); // SQL0102N too long string
return await db.executeQuery(query);
```

1. **Debug artifact committed to production** — `"A".repeat(10000)` appends a 10,000-character string unconditionally to every query. The inline comment `// SQL0102N too long string` confirms this was written deliberately to trigger the error during local debugging. It has no place in a production code path.

2. **Raw string interpolation replaces parameterized binding** — The architecture context and `failureContext` confirm the original query used `?` bind parameters (`WHERE ID = ? AND REGION = ?`). This commit replaces them with direct template-literal interpolation of caller-supplied `customerId` and `region`, introducing a **SQL injection vulnerability** in addition to the length failure.

3. **Query is unconditionally over the length limit** — `DB2Connection.executeQuery` enforces `sql.length > 500` and throws `SQL0102N`. The 10,000-char suffix alone ensures every call exceeds this limit regardless of input values.

---

#### 5 Whys Root Cause Chain

| # | Why | Finding |
|---|-----|---------|
| 1 | Why does `getCustomerDetails` fail? | `SQL0102N` is thrown on every invocation |
| 2 | Why does DB2 reject the query? | The SQL string exceeds max constant length due to `"A".repeat(10000)` |
| 3 | Why was the 10,000-char literal added? | A debug reproduction harness for `SQL0102N` was left in and committed |
| 4 | Why did this merge without being caught? | No lint rule flags large `.repeat()` in query paths; no DB2 layer integration test runs pre-merge |
| 5 | Why do those safeguards not exist? | No query-builder abstraction enforces parameterized binding and length validation; CI has no DB2 service-layer regression gate |

---

#### Required Fix

Remove the debug padding and restore parameterized query binding:

```diff
- const query = `SELECT * FROM DB2INST1.CUSTOMERS WHERE ID = '${customerId}' AND REGION = '${region}'` + " AND " + "A".repeat(10000); // SQL0102N too long string
- return await db.executeQuery(query);
+ const query = 'SELECT * FROM DB2INST1.CUSTOMERS WHERE ID = ? AND REGION = ?';
+ return await db.executeQuery(query, [customerId, region]);
```

This restores the original parameterized template, eliminates the SQL injection surface, and keeps the query string well within DB2's length limits.

---

#### Follow-Up Action Items

- [ ] **Immediate:** Apply the patch and deploy a hotfix to unblock production.
- [ ] **Short-term:** Add a pre-merge integration test covering `getCustomerDetails` that asserts the constructed query string length is below DB2's limit for representative inputs.
- [ ] **Short-term:** Add an ESLint/custom lint rule that flags `.repeat(N)` where `N > 100` in any file under `services/` or `lib/db2/`.
- [ ] **Medium-term:** Introduce a query-builder wrapper in `DB2Connection` that enforces parameterized binding by API design — disallow raw string construction at the call site.
- [ ] **Medium-term:** Add `DB2Connection.executeQuery` unit tests asserting the `sql.length > 500` guard fires correctly, with a complementary test confirming the valid parameterized path does not trigger it.