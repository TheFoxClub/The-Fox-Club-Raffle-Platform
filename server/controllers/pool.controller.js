const { status: httpStatus } = require("http-status");
const respond = require("../util/respond");
const { RewardPool } = require("../models");
const { User } = require("lucide-react");

class PoolController {
  static async getPools(req, res) {
    try {
      const polls = await RewardPool.findAndCountAll();

      if (!polls) {
        return respond(res, httpStatus.NOT_FOUND, "No Polls Found");
      }

      return respond(res, httpStatus.OK, "Polls Fetched Successfully", polls);
    } catch (error) {
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Fetch Polls"
      );
    }
  }

  static async addWalletToPool(req, res) {
    try {
      const { address } = req.body;
      const newEntry = await RewardPool.create({ address });

      if (!newEntry) {
        return respond(res, httpStatus.NOT_FOUND, "Add Wallet to Pool Failed");
      }

      return respond(res, httpStatus.OK, "Wallet Added Successfully", newEntry);
    } catch (error) {
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Add Wallet to Poll"
      );
    }
  }

  static async deleteWalletFromPool(req, res) {
    try {
      const { address } = req.query;

      const deletedAddress = await RewardPool.destroy({ where: { address } });

      return respond(
        res,
        httpStatus.OK,
        "Wallet Deleted Successfully",
        deletedAddress
      );
    } catch (error) {
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Delete Wallet from Poll"
      );
    }
  }

  static async bulkCSVAddWalletsToPool(req, res) {
    try {
      if (!req.file) {
        return respond(res, httpStatus.BAD_REQUEST, "CSV file is required");
      }

      const csvData = req.file.buffer.toString();
      const rows = csvData.split("\n");
      const results = {
        success: [],
        failed: [],
        duplicates: [],
      };

      // Skip header row if it exists
      const startIndex = rows[0].toLowerCase().includes("address") ? 1 : 0;

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;

        const columns = row.split(",").map((col) => col.trim());
        const address = columns[0];
        const name = columns[1] || null;

        if (!address) {
          results.failed.push({ row: i + 1, error: "Address is required" });
          continue;
        }

        try {
          const existing = await RewardPool.findOne({
            where: { address },
          });

          if (existing) {
            results.duplicates.push({ address });
            continue;
          }

          const collection = await RewardPool.create({
            address,
          });

          results.success.push(collection);
        } catch (error) {
          results.failed.push({ row: i + 1, address, error: error.message });
        }
      }

      return respond(res, httpStatus.OK, "CSV upload processed", { results });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }
}

module.exports = PoolController;
