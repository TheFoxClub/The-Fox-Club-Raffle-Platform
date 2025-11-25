"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UserInfo extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: "userId",
        targetKey: "id",
      });
    }
  }
  UserInfo.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        unique: true,
      },
      description: DataTypes.TEXT("long"),
      username: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      photoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "UserInfo",
      tableName: "user_infos",
    }
  );
  return UserInfo;
};
