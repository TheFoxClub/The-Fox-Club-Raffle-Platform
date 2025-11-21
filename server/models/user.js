"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    static associate(models) {
      // define associations here, e.g.,
      // this.hasMany(models.Post, { foreignKey: 'userId' });
    }
  }
  user.init(
    {
      id: DataTypes.INTEGER,
      username: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "user",
    }
  );
  return user;
};
