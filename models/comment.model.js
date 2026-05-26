export default (sequelize, DataTypes) => sequelize.define("comment", {
    comment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    occurrence_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_inappropriate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    creation_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
    }, {
        timestamps: false
    }
);