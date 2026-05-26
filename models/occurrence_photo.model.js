export default (sequelize, DataTypes) => sequelize.define("occurrence_photo", {
    photo_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    occurrence_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    photo_url: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    upload_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
    }, {
        timestamps: false
    }
);