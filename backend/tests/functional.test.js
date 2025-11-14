const axios = require("axios");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.API_URL || "http://localhost:4000";
const API_URL = `${BASE_URL}/api`;

// Test results storage
const testResults = [];

function addTestResult(
  testName,
  status,
  expected,
  actual,
  responseTime,
  notes = ""
) {
  testResults.push({
    "#": testResults.length + 1,
    "Test Name": testName,
    Status: status,
    "Expected Result": expected,
    "Actual Result": actual,
    "Response Time (ms)": responseTime.toFixed(2),
    Notes: notes,
    Timestamp: new Date().toISOString(),
  });
}

function saveTestResults() {
  const resultsDir = path.join(__dirname, "../test-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = Date.now();

  // Save as JSON
  const jsonFilename = path.join(
    resultsDir,
    `functional-results-${timestamp}.json`
  );
  fs.writeFileSync(jsonFilename, JSON.stringify(testResults, null, 2));

  // Save as CSV
  const csvFilename = path.join(
    resultsDir,
    `functional-results-${timestamp}.csv`
  );
  const headers = Object.keys(testResults[0]).join(",");
  const rows = testResults
    .map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  fs.writeFileSync(csvFilename, `${headers}\n${rows}`);

  console.log(`\n✓ Test results saved to: ${jsonFilename}`);
  console.log(`✓ CSV results saved to: ${csvFilename}`);
}

// Test data - will be populated during tests
let testUser = null;
let authToken = null;
let testProductId = null;
let testUserId = null;

describe("SmartShop Functional Tests", function () {
  this.timeout(10000);

  after(function () {
    saveTestResults();
  });

  // ============================================
  // TEST SUITE 1: AUTHENTICATION
  // ============================================
  describe("1. Authentication & User Management", function () {
    it("1.1 Should register a new user with valid data", async function () {
      const timestamp = Date.now();
      testUser = {
        username: `testuser_${timestamp}`,
        email: `test_${timestamp}@example.com`,
        password: "test123456",
        age: 25,
        gender: "male",
        preferences: ["electronics", "books"],
      };

      const startTime = Date.now();
      try {
        const response = await axios.post(`${API_URL}/auth/register`, testUser);
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Registration (Valid)",
          response.status === 201 ? "PASS" : "FAIL",
          "201 Created with user object and token",
          `${response.status} - User created`,
          responseTime,
          "New user registered successfully"
        );

        expect(response.status).to.equal(201);
        expect(response.data).to.have.property("user");
        expect(response.data).to.have.property("token");
        expect(
          response.data.user.email || response.data.user._doc?.email
        ).to.equal(testUser.email);

        authToken = response.data.token;
        testUserId = response.data.user._doc._id; // Mongo serialized user object
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "User Registration (Valid)",
          "FAIL",
          "201 Created",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("1.2 Should reject duplicate email registration", async function () {
      const startTime = Date.now();
      try {
        await axios.post(`${API_URL}/auth/register`, testUser);
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Registration (Duplicate)",
          "FAIL",
          "409 Conflict",
          "Request succeeded (should have failed)",
          responseTime,
          "Should reject duplicate email"
        );

        throw new Error("Should have failed with 409");
      } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error.response && error.response.status === 409) {
          addTestResult(
            "User Registration (Duplicate)",
            "PASS",
            "409 Conflict",
            `${error.response.status} - Duplicate rejected`,
            responseTime,
            "Correctly rejected duplicate email"
          );
          expect(error.response.status).to.equal(409);
        } else {
          throw error;
        }
      }
    });

    it("1.3 Should reject invalid email format", async function () {
      const invalidUser = {
        username: "testuser",
        email: "invalid-email",
        password: "test123456",
      };

      const startTime = Date.now();
      try {
        await axios.post(`${API_URL}/auth/register`, invalidUser);
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Registration (Invalid Email)",
          "FAIL",
          "400 Bad Request",
          "Request succeeded",
          responseTime,
          "Should reject invalid email"
        );

        throw new Error("Should have failed with 400");
      } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error.response && error.response.status === 400) {
          addTestResult(
            "User Registration (Invalid Email)",
            "PASS",
            "400 Bad Request",
            `${error.response.status} - Invalid email rejected`,
            responseTime,
            "Email format validation working"
          );
          expect(error.response.status).to.equal(400);
        } else {
          throw error;
        }
      }
    });

    it("1.4 Should reject short password", async function () {
      const invalidUser = {
        username: "testuser",
        email: "test@example.com",
        password: "123",
      };

      const startTime = Date.now();
      try {
        await axios.post(`${API_URL}/auth/register`, invalidUser);
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Registration (Short Password)",
          "FAIL",
          "400 Bad Request",
          "Request succeeded",
          responseTime,
          "Should reject passwords < 6 chars"
        );

        throw new Error("Should have failed with 400");
      } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error.response && error.response.status === 400) {
          addTestResult(
            "User Registration (Short Password)",
            "PASS",
            "400 Bad Request",
            `${error.response.status} - Short password rejected`,
            responseTime,
            "Password length validation working"
          );
          expect(error.response.status).to.equal(400);
        } else {
          throw error;
        }
      }
    });

    it("1.5 Should login with valid credentials", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password,
        });
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Login (Valid)",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with token",
          `${response.status} - Login successful`,
          responseTime,
          "JWT token returned"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("token");
        expect(response.data).to.have.property("user");

        // Update token after login
        authToken = response.data.token;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "User Login (Valid)",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("1.6 Should reject invalid password", async function () {
      const startTime = Date.now();
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: testUser.email,
          password: "wrongpassword",
        });
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Login (Invalid Password)",
          "FAIL",
          "401 Unauthorized",
          "Request succeeded",
          responseTime,
          "Should reject wrong password"
        );

        throw new Error("Should have failed with 401");
      } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error.response && error.response.status === 401) {
          addTestResult(
            "User Login (Invalid Password)",
            "PASS",
            "401 Unauthorized",
            `${error.response.status} - Invalid password rejected`,
            responseTime,
            "Authentication failed as expected"
          );
          expect(error.response.status).to.equal(401);
        } else {
          throw error;
        }
      }
    });

    it("1.7 Should reject non-existent user", async function () {
      const startTime = Date.now();
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: "nonexistent@example.com",
          password: "password123",
        });
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Login (Non-existent)",
          "FAIL",
          "401 Unauthorized",
          "Request succeeded",
          responseTime,
          "Should reject non-existent user"
        );

        throw new Error("Should have failed with 401");
      } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error.response && error.response.status === 401) {
          addTestResult(
            "User Login (Non-existent)",
            "PASS",
            "401 Unauthorized",
            `${error.response.status} - Non-existent user rejected`,
            responseTime,
            "User not found"
          );
          expect(error.response.status).to.equal(401);
        } else {
          throw error;
        }
      }
    });

    it("1.8 Should get current authenticated user", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Get Current User",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with user object",
          `${response.status} - User data retrieved`,
          responseTime,
          "Current user information returned"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("user");
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Get Current User",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("1.9 Should update user profile", async function () {
      const updateData = {
        username: "updated_username",
        age: 26,
        preferences: ["electronics", "sports", "books"],
      };

      const startTime = Date.now();
      try {
        const response = await axios.put(
          `${API_URL}/users/profile`,
          updateData,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Update User Profile",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with updated user",
          `${response.status} - Profile updated`,
          responseTime,
          "User profile modified successfully"
        );

        expect(response.status).to.equal(200);
        expect(response.data.user.username).to.equal(updateData.username);
        expect(response.data.user.age).to.equal(updateData.age);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Update User Profile",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("1.10 Should logout user", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.post(
          `${API_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "User Logout",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK",
          `${response.status} - Logout successful`,
          responseTime,
          "Session destroyed"
        );

        expect(response.status).to.equal(200);

        // Important: Login again for subsequent tests
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password,
        });
        authToken = loginResponse.data.token;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "User Logout",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });
  });

  // ============================================
  // TEST SUITE 2: PRODUCTS
  // ============================================
  describe("2. Product Management", function () {
    it("2.1 Should create a new product", async function () {
      const productData = {
        name: `Test Product ${Date.now()}`,
        description: "Test product description",
        category: "Electronics",
        price: 99.99,
        tags: ["test", "electronics"],
      };

      const startTime = Date.now();
      try {
        const response = await axios.post(`${API_URL}/products`, productData, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Create Product",
          response.status === 201 ? "PASS" : "FAIL",
          "201 Created with product object",
          `${response.status} - Product created`,
          responseTime,
          "New product added to catalog"
        );

        expect(response.status).to.equal(201);
        expect(response.data).to.have.property("product");
        expect(response.data.product.name).to.equal(productData.name);

        testProductId = response.data.product._id;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Create Product",
          "FAIL",
          "201 Created",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("2.2 Should list all products", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.get(`${API_URL}/products`);
        const responseTime = Date.now() - startTime;

        addTestResult(
          "List Products",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with products array",
          `${response.status} - ${response.data.products.length} products`,
          responseTime,
          "Product catalog retrieved"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("products");
        expect(response.data.products).to.be.an("array");

        // Set testProductId if not set
        if (!testProductId && response.data.products.length > 0) {
          testProductId = response.data.products[0]._id;
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "List Products",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("2.3 Should search products", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.get(
          `${API_URL}/products/search?q=product`
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Search Products",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with search results",
          `${response.status} - ${response.data.products.length} results`,
          responseTime,
          "Text search working"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("products");
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Search Products",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("2.4 Should reject empty search query", async function () {
      const startTime = Date.now();
      try {
        await axios.get(`${API_URL}/products/search?q=`);
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Search Products (Empty Query)",
          "FAIL",
          "400 Bad Request",
          "Request succeeded",
          responseTime,
          "Should reject empty query"
        );

        throw new Error("Should have failed with 400");
      } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error.response && error.response.status === 400) {
          addTestResult(
            "Search Products (Empty Query)",
            "PASS",
            "400 Bad Request",
            `${error.response.status} - Empty query rejected`,
            responseTime,
            "Query validation working"
          );
          expect(error.response.status).to.equal(400);
        } else {
          throw error;
        }
      }
    });

    it("2.5 Should get product by ID", async function () {
      if (!testProductId) {
        const products = await axios.get(`${API_URL}/products`);
        if (products.data.products.length > 0) {
          testProductId = products.data.products[0]._id;
        }
      }

      const startTime = Date.now();
      try {
        const response = await axios.get(
          `${API_URL}/products/${testProductId}`
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Get Product By ID",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with product details",
          `${response.status} - Product retrieved`,
          responseTime,
          "Single product fetch working"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("product");
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Get Product By ID",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("2.6 Should handle pagination", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.get(`${API_URL}/products?limit=5`);
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Product Pagination",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with pagination data",
          `${response.status} - ${response.data.products.length} products, hasMore: ${response.data.hasMore}`,
          responseTime,
          "Pagination working correctly"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("hasMore");
        expect(response.data.products.length).to.be.at.most(5);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Product Pagination",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });
  });

  // ============================================
  // TEST SUITE 3: INTERACTIONS
  // ============================================
  describe("3. User Interactions", function () {
    before(async function () {
      // Ensure we have a product ID
      if (!testProductId) {
        const products = await axios.get(`${API_URL}/products`);
        if (products.data.products.length > 0) {
          testProductId = products.data.products[0]._id;
        }
      }
    });

    it("3.1 Should create view interaction", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.post(
          `${API_URL}/interactions`,
          {
            userId: testUserId,
            productId: testProductId,
            type: "view",
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        const responseTime = Date.now() - startTime;

        addTestResult(
          "Create View Interaction",
          response.status === 201 ? "PASS" : "FAIL",
          "201 Created with interaction object",
          `${response.status} - View logged`,
          responseTime,
          "User interaction recorded"
        );

        expect(response.status).to.equal(201);
        expect(response.data).to.have.property("interaction");
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Create View Interaction",
          "FAIL",
          "201 Created",
          error.response?.status || "Error",
          responseTime,
          error.response?.data?.message || error.message
        );

        throw error;
      }
    });

    it("3.2 Should create like interaction", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.post(
          `${API_URL}/interactions`,
          {
            userId: testUserId,
            productId: testProductId,
            type: "like",
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Create Like Interaction",
          response.status === 201 ? "PASS" : "FAIL",
          "201 Created",
          `${response.status} - Like logged`,
          responseTime,
          "Like interaction recorded"
        );

        expect(response.status).to.equal(201);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Create Like Interaction",
          "FAIL",
          "201 Created",
          error.response?.status || "Error",
          responseTime,
          error.response?.data?.message || error.message
        );
        throw error;
      }
    });

    it("3.3 Should get user interactions", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.get(
          `${API_URL}/interactions/${testUserId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Get User Interactions",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with interactions array",
          `${response.status} - ${response.data.interactions.length} interactions`,
          responseTime,
          "Interaction history retrieved"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("interactions");
        expect(response.data.interactions).to.be.an("array");
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Get User Interactions",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.response?.data?.message || error.message
        );
        throw error;
      }
    });
  });

  // ============================================
  // TEST SUITE 4: RECOMMENDATIONS
  // ============================================
  describe("4. Recommendations", function () {
    it("4.1 Should get user recommendations", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.get(
          `${API_URL}/recommendations/${testUserId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Get Recommendations",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with recommendations",
          `${response.status} - ${
            response.data.recommendations?.recommendations?.length || 0
          } recommendations`,
          responseTime,
          "Recommendations generated"
        );

        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("recommendations");
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Get Recommendations",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });

    it("4.2 Should regenerate recommendations", async function () {
      const startTime = Date.now();
      try {
        const response = await axios.post(
          `${API_URL}/recommendations/${testUserId}/regenerate`,
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const responseTime = Date.now() - startTime;

        addTestResult(
          "Regenerate Recommendations",
          response.status === 200 ? "PASS" : "FAIL",
          "200 OK with new recommendations",
          `${response.status} - Recommendations refreshed`,
          responseTime,
          "Force regeneration working"
        );

        expect(response.status).to.equal(200);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        addTestResult(
          "Regenerate Recommendations",
          "FAIL",
          "200 OK",
          error.response?.status || "Error",
          responseTime,
          error.message
        );
        throw error;
      }
    });
  });
});

module.exports = { testResults };
