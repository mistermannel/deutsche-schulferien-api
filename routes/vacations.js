const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

// Cache for storing parsed JSON data
const cache = new Map();

// Service layer for data access
const vacationService = {
  async getVacationsByYear(year) {
    try {
      // Check cache first
      if (cache.has(year)) {
        return cache.get(year);
      }

      const filePath = path.join(__dirname, "./years", `${year}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const vacations = JSON.parse(data);
      
      // Cache the result
      cache.set(year, vacations);
      return vacations;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`No vacation data found for year ${year}`);
      }
      throw error;
    }
  },

  async getVacationsByYearAndState(year, state) {
    const vacations = await this.getVacationsByYear(year);
    const filtered = vacations.filter(vac => 
      vac.stateCode === String(state) && vac.year === Number(year)
    );
    
    if (filtered.length === 0) {
      throw new Error(`No vacations found for year ${year} and state ${state}`);
    }
    
    return filtered;
  }
};

// Route handlers
const getAllVacationsByYear = async (req, res, next) => {
  try {
    const vacations = await vacationService.getVacationsByYear(req.params.year);
    res.json(vacations);
  } catch (error) {
    next(error);
  }
};

const getAllVacationsByYearAndState = async (req, res, next) => {
  try {
    const vacations = await vacationService.getVacationsByYearAndState(
      req.params.year,
      req.params.state
    );
    res.json(vacations);
  } catch (error) {
    next(error);
  }
};

// Routes
router.route("/api/v1/:year").get(getAllVacationsByYear);
router.route("/api/v1/:year/:state").get(getAllVacationsByYearAndState);

module.exports = router;
