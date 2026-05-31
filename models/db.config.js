// using sequelize with MySQL
// create a connection to the database using environment variables for configuration
import bcrypt from 'bcrypt';
import { Sequelize, DataTypes } from "sequelize";

import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        port: 3306
    }
);


// ==========================================
// TEST DATABSE CONNECTION
// ==========================================

try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
} catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
}



// ==========================================
// IMPORT AND INITIALIZE MODELS
// ==========================================

import CategoryModel from "./category.model.js";
const Category = CategoryModel(sequelize, DataTypes);

import CommentModel from "./comment.model.js";
const Comment = CommentModel(sequelize, DataTypes);

import OccurrencePhotoModel from "./occurrence_photo.model.js";
const OccurrencePhoto = OccurrencePhotoModel(sequelize, DataTypes);

import OccurrenceModel from "./occurrence.model.js";
const Occurrence = OccurrenceModel(sequelize, DataTypes);

import StatusHistoryModel from "./status_history.model.js";
const StatusHistory = StatusHistoryModel(sequelize, DataTypes);

import StatusModel from "./status.model.js";
const Status = StatusModel(sequelize, DataTypes);

import UserModel from "./user.model.js";
const User = UserModel(sequelize, DataTypes);



// ==========================================
// DEFAULT ADMIN USER
// ==========================================

const defaultAdminUser = {
    user_name: process.env.DEFAULT_ADMIN_NAME || 'Admin',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@campus2.ipp.pt',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!'
};

const ensureDefaultAdminUser = async () => {
    const existingAdmin = await User.findOne({
        where: { email: defaultAdminUser.email }
    });

    if (existingAdmin) {
        if (existingAdmin.profile_type !== 'admin' || existingAdmin.state !== 'active') {
            existingAdmin.profile_type = 'admin';
            existingAdmin.state = 'active';
            await existingAdmin.save();
        }

        console.log(`Default admin user already exists: ${defaultAdminUser.email}`);
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultAdminUser.password, salt);

    await User.create({
        user_name: defaultAdminUser.user_name,
        email: defaultAdminUser.email,
        password: hashedPassword,
        profile_type: 'admin',
        state: 'active'
    });

    console.log(`Default admin user created: ${defaultAdminUser.email}`);
};



// ==========================================
// RELATIONS BETWEEN MODELS
// ==========================================

// 1. Relações do Utilizador (User)
User.hasMany(Occurrence, { foreignKey: 'user_id' });
Occurrence.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

// 2. Relações da Categoria (Category)
Category.hasMany(Occurrence, { foreignKey: 'category_id' });
Occurrence.belongsTo(Category, { foreignKey: 'category_id' });

// 3. Relações do Estado (Status)
Status.hasMany(Occurrence, { foreignKey: 'status_id' });
Occurrence.belongsTo(Status, { foreignKey: 'status_id' });

Status.hasMany(StatusHistory, { foreignKey: 'status_id' });
StatusHistory.belongsTo(Status, { foreignKey: 'status_id' });

// 4. Relações da Ocorrência (Occurrence) com os Sub-recursos (Fotos, Comentários, Histórico)
Occurrence.hasMany(OccurrencePhoto, { foreignKey: 'occurrence_id', onDelete: 'CASCADE' });
OccurrencePhoto.belongsTo(Occurrence, { foreignKey: 'occurrence_id' });

Occurrence.hasMany(Comment, { foreignKey: 'occurrence_id', onDelete: 'CASCADE' });
Comment.belongsTo(Occurrence, { foreignKey: 'occurrence_id' });

Occurrence.hasMany(StatusHistory, { foreignKey: 'occurrence_id', onDelete: 'CASCADE' });
StatusHistory.belongsTo(Occurrence, { foreignKey: 'occurrence_id' });



// ==========================================
// SYNCHRONIZE MODELS WITH DATABASE
// ==========================================

try {
    await sequelize.sync({ alter: true }); // use { force: true } to drop and recreate tables on every sync (use with caution in production)
    console.log("All models were synchronized successfully.");
    await ensureDefaultAdminUser();
} catch (error) {
    console.error("Error synchronizing models:", error);
    process.exit(1);
}

export {
    Category, Comment, OccurrencePhoto, Occurrence, StatusHistory, Status, User,
    sequelize, DataTypes
};