'use strict';

const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ProductDetailConfig extends Model {
        static associate(models) {
            ProductDetailConfig.belongsTo(models.Allcode, { foreignKey: 'colorId', targetKey: 'code', as: 'colorData' })
            ProductDetailConfig.belongsTo(models.Allcode, { foreignKey: 'romId', targetKey: 'code', as: 'romData' })
        }
    };
    ProductDetailConfig.init({
        productdetailId: DataTypes.INTEGER,
        colorId: DataTypes.STRING,
        romId: DataTypes.STRING,
        screen: DataTypes.TEXT('long'),
        os: DataTypes.TEXT('long'),
        backcam: DataTypes.TEXT('long'),
        frontcam: DataTypes.TEXT('long'),
        cpu: DataTypes.TEXT('long'),
        ram: DataTypes.TEXT('long'),
        sim: DataTypes.TEXT('long'),
        battery: DataTypes.TEXT('long'),
        design: DataTypes.TEXT('long'),
       
    }, {
        sequelize,
        modelName: 'ProductDetailConfig',
    });
    return ProductDetailConfig;
};