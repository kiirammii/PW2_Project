export default (sequelize, DataTypes) => sequelize.define("category", {
        category_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        category_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        }
    }, {
        timestamps: false
    }
);