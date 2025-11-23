"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class user_info extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: "userId",
        targetKey: "id",
      });
    }
  }
  user_info.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        unique: true,
      },
      description: DataTypes.TEXT("long"),
      username: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "user_info",
    }
  );
  return user_info;
};
