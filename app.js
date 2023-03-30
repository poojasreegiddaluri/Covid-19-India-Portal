const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let database = null;
const initializeDbAndServer = async () => {
  try {
    database = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database Error is ${error}`);
    process.exit(1);
  }
};
initializeDbAndServer();
//API-1
const logger = (request, response, next) => {
  next();
};
function authenticationToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers.authorization;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, "abcdef", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send(`Invalid JWT Token`); // Scenario 1
      } else {
        next(); //Scenario 2
      }
    });
  } else {
    response.status(401);
    response.send(`Invalid JWT Token`); //Scenario 1
  }
}
//API-2
app.get("/states/", authenticationToken, async (request, response) => {
  const stateQuery = `select state_id as stateId,state_name as stateName, population as population from state;`;
  const stateQueryResponse = await database.all(stateQuery);
  response.send(stateQueryResponse);
});
//API-1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userQuery = `select * from user where username='${username}';`;
  const userQueryResponse = await database.get(userQuery);
  if (userQueryResponse === undefined) {
    response.status(400);
    response.send(`Invalid user`); //Scenario 1
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userQueryResponse.password
    );
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "abcdef");
      response.send({ jwtToken }); //Scenario 3
    } else {
      response.status(400);
      response.send(`Invalid password`); //Scenario 2
    }
  }
});
//API-3
app.get("/states/:stateId/", authenticationToken, async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `select state_id as stateId,state_name as stateName, population as population from state where state_id=${stateId};`;
  const stateQueryResponse = await database.get(stateQuery);
  response.send(stateQueryResponse);
});
//API-4
app.post("/districts/", authenticationToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDist = `insert into district (district_name,state_id,cases,cured,active,deaths) values ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const createDistResponse = await database.run(createDist);
  response.send(`District Successfully Added`);
});
//API-5
app.get(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const distQuery = `select district_id as districtId,
                      district_name as districtName,
                      state_id as stateId,
                      cases as cases,
                      cured as cured,
                      active as active,
                      deaths as deaths from district 
                      where district_id=${districtId};`;
    const distQueryResponse = await database.get(distQuery);
    response.send(distQueryResponse);
  }
);
//API-6
app.delete(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const distQuery = `delete from district where district_id=${districtId};`;
    const distQueryResponse = await database.run(distQuery);
    response.send(`District Removed`);
  }
);
//API-7
app.put(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const distQuery = `update district set district_name='${districtName}',
                        state_id=${stateId},
                        cases=${cases},
                        cured=${cured},
                        active=${active},
                        deaths=${deaths}
                        where district_id=${districtId};`;
    const distQueryResponse = await database.run(distQuery);
    response.send(`District Details Updated`);
  }
);
//API-8
app.get(
  "/states/:stateId/stats/",
  authenticationToken,
  async (request, response) => {
    const { stateId } = request.params;
    const stateQuery = `select sum(cases) as totalCases,
                       sum(cured) as totalCured,
                       sum(active) as totalActive,
                       sum(deaths) as totalDeaths from District where state_id=${stateId};`;
    const stateQueryResponse = await database.get(stateQuery);
    response.send(stateQueryResponse);
  }
);
module.exports = app;
