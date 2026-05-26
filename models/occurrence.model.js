export default (sequelize, DataTypes) => sequelize.define("occurrence", {
    occurrence_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false
    },
    building_zone: {
        type: DataTypes.ENUM('Bloco A', 'Bloco B', 'Bloco C', 'Bloco D', 'Bloco E', 'Bloco F', 'Bloco G'),
        allowNull: false
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    register_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    expected_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    resolution_date: {
        type: DataTypes.DATE,
        allowNull: true
    }
    }, {
        timestamps: false
    }
);