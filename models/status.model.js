export default (sequelize, DataTypes) => sequelize.define("status", {
    status_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
    }, {
        timestamps: false
    }
);