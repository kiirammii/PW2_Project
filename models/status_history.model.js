export default (sequelize, DataTypes) => sequelize.define("status_history", {
    history_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    occurrence_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    change_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    procedure_description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
    }, {
        timestamps: false
    }
);