"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class verified_collection extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  verified_collection.init(
    {
      address: DataTypes.STRING,
      name: DataTypes.STRING,
      isVerified: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "verified_collection",
    }
  );
  return verified_collection;
};
