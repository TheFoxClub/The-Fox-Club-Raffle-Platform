'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class reward_pool extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  reward_pool.init({
    address: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'reward_pool',
  });
  return reward_pool;
};