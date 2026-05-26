export default (sequelize, DataTypes) => sequelize.define("user", {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    profile_type: {
        type: DataTypes.ENUM('student_teacher', 'staff', 'admin'),
        allowNull: false
    },
    state: {
        type: DataTypes.ENUM('active', 'suspended'),
        defaultValue: 'active'
    }
    }, {
        timestamps: false
    }
);