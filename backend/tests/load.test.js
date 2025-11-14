const autocannon = require("autocannon");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.API_URL || "http://localhost:4000";
const API_URL = `${BASE_URL}/api`;

const loadTestResults = [];

function addLoadResult(
  testName,
  users,
  duration,
  avgLatency,
  maxLatency,
  minLatency,
  p95Latency,
  throughput,
  totalRequests,
  errors,
  notes
) {
  loadTestResults.push({
    "#": loadTestResults.length + 1,
    "Test Name": testName,
    "Virtual Users": users,
    "Duration (s)": duration,
    "Avg Latency (ms)": avgLatency.toFixed(2),
    "Min Latency (ms)": minLatency.toFixed(2),
    "P95 Latency (ms)": p95Latency.toFixed(2),
    "Max Latency (ms)": maxLatency.toFixed(2),
    "Throughput (req/s)": throughput.toFixed(2),
    "Total Requests": totalRequests,
    "Successful Requests": totalRequests - errors,
    "Failed Requests": errors,
    "Error Rate (%)":
      errors > 0 ? ((errors / totalRequests) * 100).toFixed(2) : "0.00",
    Notes: notes,
    Timestamp: new Date().toISOString(),
  });
}

function saveLoadResults() {
  const resultsDir = path.join(__dirname, "../test-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = Date.now();

  // Save as JSON
  const jsonFilename = path.join(resultsDir, `load-results-${timestamp}.json`);
  fs.writeFileSync(jsonFilename, JSON.stringify(loadTestResults, null, 2));

  // Save as CSV
  const csvFilename = path.join(resultsDir, `load-results-${timestamp}.csv`);
  if (loadTestResults.length > 0) {
    const headers = Object.keys(loadTestResults[0]).join(",");
    const rows = loadTestResults
      .map((r) =>
        Object.values(r)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    fs.writeFileSync(csvFilename, `${headers}\n${rows}`);
  }

  console.log(`\n✓ Load test results saved to: ${jsonFilename}`);
  console.log(`✓ CSV results saved to: ${csvFilename}`);
}

async function runLoadTest(url, connections, duration, testName, notes) {
  console.log(`\n🔥 Running: ${testName}`);
  console.log(`   URL: ${url}`);
  console.log(`   Users: ${connections}, Duration: ${duration}s`);

  return new Promise((resolve) => {
    const instance = autocannon(
      {
        url,
        connections,
        duration,
        pipelining: 1,
      },
      (err, result) => {
        if (err) {
          console.error("❌ Load test error:", err);
          addLoadResult(
            testName,
            connections,
            duration,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            `Error: ${err.message}`
          );
          resolve(null);
          return;
        }

        const avgLatency = result.latency.mean ?? 0;
        const minLatency = result.latency.min ?? 0;
        const maxLatency = result.latency.max ?? 0;
        const p95Latency = result.latency.p95 ?? 0;
        const throughput = result.requests.average;
        const totalRequests = result.requests.total;
        const errors = result.errors || 0;

        console.log(`   ✓ Avg Latency: ${avgLatency.toFixed(2)}ms`);
        console.log(`   ✓ Min Latency: ${minLatency.toFixed(2)}ms`);
        console.log(`   ✓ P95 Latency: ${p95Latency.toFixed(2)}ms`);
        console.log(`   ✓ Max Latency: ${maxLatency.toFixed(2)}ms`);
        console.log(`   ✓ Throughput: ${throughput.toFixed(2)} req/s`);
        console.log(`   ✓ Total Requests: ${totalRequests}`);
        console.log(`   ✓ Failed Requests: ${errors}`);
        console.log(
          `   ✓ Error Rate: ${
            errors > 0 ? ((errors / totalRequests) * 100).toFixed(2) : 0
          }%`
        );

        addLoadResult(
          testName,
          connections,
          duration,
          avgLatency,
          maxLatency,
          minLatency,
          p95Latency,
          throughput,
          totalRequests,
          errors,
          notes
        );

        resolve(result);
      }
    );

    autocannon.track(instance);
  });
}

async function runAllLoadTests() {
  console.log("═══════════════════════════════════════");
  console.log("  SmartShop Load Testing Suite");
  console.log("═══════════════════════════════════════");
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Start Time: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════\n");

  // Test 1: Health Check - 50 users
  await runLoadTest(
    `${BASE_URL}/health`,
    50,
    10,
    "Health Check - 50 Users",
    "Baseline performance test - low load"
  );

  // Test 2: Health Check - 100 users
  await runLoadTest(
    `${BASE_URL}/health`,
    100,
    10,
    "Health Check - 100 Users",
    "Moderate load test"
  );

  // Test 3: Health Check - 500 users
  await runLoadTest(
    `${BASE_URL}/health`,
    500,
    10,
    "Health Check - 500 Users",
    "High load stress test"
  );

  // Test 4: Product List - 50 users
  await runLoadTest(
    `${API_URL}/products`,
    50,
    10,
    "Product List - 50 Users",
    "Database read operations - low load"
  );

  // Test 5: Product List - 100 users
  await runLoadTest(
    `${API_URL}/products`,
    100,
    10,
    "Product List - 100 Users",
    "Database stress test - moderate load"
  );

  // Test 6: Product List - 500 users
  await runLoadTest(
    `${API_URL}/products`,
    500,
    10,
    "Product List - 500 Users",
    "High load database operations"
  );

  // Test 7: Search - 50 users
  await runLoadTest(
    `${API_URL}/products/search?q=product`,
    50,
    10,
    "Product Search - 50 Users",
    "Text search performance - low load"
  );

  // Test 8: Search - 100 users
  await runLoadTest(
    `${API_URL}/products/search?q=product`,
    100,
    10,
    "Product Search - 100 Users",
    "Search under moderate load"
  );

  // Test 9: Search - 500 users
  await runLoadTest(
    `${API_URL}/products/search?q=product`,
    500,
    10,
    "Product Search - 500 Users",
    "Search under high load"
  );

  // Test 10: Product Detail - 50 users (requires product ID)
  try {
    const productsResponse = await require("axios").get(`${API_URL}/products`);
    if (
      productsResponse.data.products &&
      productsResponse.data.products.length > 0
    ) {
      const productId = productsResponse.data.products[0]._id;

      await runLoadTest(
        `${API_URL}/products/${productId}`,
        50,
        10,
        "Product Detail - 50 Users",
        "Single product fetch - database query by ID"
      );

      await runLoadTest(
        `${API_URL}/products/${productId}`,
        100,
        10,
        "Product Detail - 100 Users",
        "Single product fetch - moderate load"
      );
    }
  } catch (error) {
    console.log("\n⚠️  Skipping product detail tests (no products available)");
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  Load Testing Complete!");
  console.log("═══════════════════════════════════════\n");

  saveLoadResults();
  printSummaryTable();
}

function printSummaryTable() {
  console.log("\n📊 LOAD TEST SUMMARY\n");
  console.log(
    "┌────┬─────────────────────────────────────┬──────┬──────────┬──────────┬────────────┬──────────┬─────────┐"
  );
  console.log(
    "│ #  │ Test Name                           │ Users│ Avg (ms) │ P95 (ms) │ Throughput │ Total Req│ Errors  │"
  );
  console.log(
    "├────┼─────────────────────────────────────┼──────┼──────────┼──────────┼────────────┼──────────┼─────────┤"
  );

  loadTestResults.forEach((result) => {
    const num = String(result["#"]).padStart(2);
    const name = result["Test Name"].substring(0, 35).padEnd(35);
    const users = String(result["Virtual Users"]).padStart(5);
    const avg = String(result["Avg Latency (ms)"]).padStart(8);
    const p95 = String(result["P95 Latency (ms)"]).padStart(8);
    const throughput = String(result["Throughput (req/s)"]).padStart(10);
    const total = String(result["Total Requests"]).padStart(8);
    const errors = String(result["Failed Requests"]).padStart(7);

    console.log(
      `│ ${num} │ ${name} │ ${users} │ ${avg} │ ${p95} │ ${throughput} │ ${total} │ ${errors} │`
    );
  });

  console.log(
    "└────┴─────────────────────────────────────┴──────┴──────────┴──────────┴────────────┴──────────┴─────────┘\n"
  );

  // Calculate statistics
  if (loadTestResults.length > 0) {
    const avgLatencies = loadTestResults.map((r) =>
      parseFloat(r["Avg Latency (ms)"])
    );
    const throughputs = loadTestResults.map((r) =>
      parseFloat(r["Throughput (req/s)"])
    );
    const errorRates = loadTestResults.map((r) =>
      parseFloat(r["Error Rate (%)"])
    );

    console.log("\n📈 OVERALL STATISTICS\n");
    console.log(
      `   Average Latency: ${(
        avgLatencies.reduce((a, b) => a + b, 0) / avgLatencies.length
      ).toFixed(2)}ms`
    );
    console.log(
      `   Average Throughput: ${(
        throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      ).toFixed(2)} req/s`
    );
    console.log(
      `   Average Error Rate: ${(
        errorRates.reduce((a, b) => a + b, 0) / errorRates.length
      ).toFixed(2)}%`
    );
    console.log(
      `   Total Requests Across All Tests: ${loadTestResults.reduce(
        (sum, r) => sum + r["Total Requests"],
        0
      )}`
    );
    console.log(
      `   Total Failed Requests: ${loadTestResults.reduce(
        (sum, r) => sum + r["Failed Requests"],
        0
      )}\n`
    );
  }
}

// Run if called directly
if (require.main === module) {
  runAllLoadTests()
    .then(() => {
      console.log("✅ All load tests completed successfully\n");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Load tests failed:", error);
      process.exit(1);
    });
}

module.exports = { runAllLoadTests, loadTestResults };
