import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/db.config.js';

// ==========================================
// Create a New User
// ==========================================
export const registerUser = async (req, res, next) => {
    try {
        const { user_name, email, password } = req.body;

        // validate required fields
        if (!user_name || !email || !password) {
            return res.status(400).json({ message: "All fields (user_name, email, password) are required." });
        }

        // validate password length
        if (password.length < 10) {
            return res.status(400).json({ message: "Password must be at least 10 characters long." });
        }

        // check for spaces in the password
        if (password.includes(' ')) {
            return res.status(400).json({ message: "Password cannot contain spaces." });
        }

        // Check special characters (Only allow letters, numbers, and !, #, -, _)
        if (!/^[a-zA-Z0-9!#\-_]+$/.test(password)) {
            return res.status(400).json({ message: "Password can only contain letters, numbers, and the following special characters: !, #, -, _" });
        }

        const profile_type = 'student_teacher';

        // check if the email is from the institutional domain
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail.includes('esmad.ipp.pt') && !cleanEmail.includes('esht.ipp.pt')) {
            return res.status(400).json({ message: "Students and Teachers must register with the institutional email." });
        }

        // verify if the email is already registered
        const userExists = await User.findOne({ where: { email: cleanEmail } });
        if (userExists) {
            return res.status(409).json({ message: "This email is already registered." });
        }

        // encrypt the password before saving to the database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // create the new user in the database
        const newUser = await User.create({
            user_name: user_name.trim(),
            email: cleanEmail,
            password: hashedPassword,
            profile_type: profile_type,
            state: 'active'
        });

        return res.status(201).json({
            message: "User registered successfully!",
            user: {
                user_id: newUser.user_id,
                user_name: newUser.user_name,
                email: newUser.email,
                profile_type: newUser.profile_type
            }
        });

    } catch (error) {
        console.error("Error in registerUser:", error);
        return res.status(500).json({ message: "Internal server error while registering user." });
    }
};

// ==========================================
// Authenticate an User
// ==========================================
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // validate required fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const cleanEmail = email.trim().toLowerCase();

        // search for the user by email
        const user = await User.findOne({ where: { email: cleanEmail } });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." }); // Dica de segurança: não dar pistas se o email existe ou não
        }

        // verify if the user is suspended
        if (user.state === 'suspended') {
            return res.status(403).json({ message: "Your account is suspended. Contact an administrator." });
        }

        // compare the provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // generate the JWT Token
        const secretKey = process.env.JWT_SECRET || 'temporary_secret_key';
        const token = jwt.sign(
            { user_id: user.user_id, profile_type: user.profile_type },
            secretKey,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                profile_type: user.profile_type
            }
        });

    } catch (error) {
        console.error("Error in loginUser:", error);
        return res.status(500).json({ message: "Internal server error while logging in." });
    }
}

// ==========================================
// Retrieve all Users
// ==========================================
export const getAllUsers = async (req, res, next) => {
    try {

        // check if the logged user is an admin
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can view all users." });
        }

        const users = await User.findAll({
            attributes: ['user_id', 'user_name', 'email', 'profile_type', 'state']
        });
        return res.status(200).json(users);

    } catch (error) {
        console.error("Error in getAllUsers:", error);
        return res.status(500).json({ message: "Error while listing users." });
    }
}

// ==========================================
// Edit an User
// ==========================================
export const updateUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const { user_name, email, state, profile_type } = req.body;

        const loggedUserId = req.loggedUser.user_id;
        const loggedProfileType = req.loggedUser.profile_type;

        // convert user_id to number and validate
        const numericUserId = parseInt(user_id, 10);
        if (isNaN(numericUserId)) {
            return res.status(400).json({ message: "The user ID must be a valid number." });
        }

        // if not admin, can only edit their own profile ID
        if (loggedProfileType !== 'admin' && loggedUserId !== numericUserId) {
            return res.status(403).json({ message: "Access denied. You cannot edit other users' profiles." });
        }

        // find User
        const user = await User.findByPk(numericUserId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // validate and update: user_name
        if (user_name !== undefined) {
            if (typeof user_name !== 'string' || user_name.trim().length < 3) {
                return res.status(400).json({ message: "Invalid name. It must be a text with at least 3 characters." });
            }
            user.user_name = user_name.trim();
        }

        // validate and update: email
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const cleanEmail = email.trim().toLowerCase();
            
            if (typeof email !== 'string' || !emailRegex.test(cleanEmail)) {
                return res.status(400).json({ message: "Invalid email format." });
            }

            // check for duplicate email in the database, excluding the current user
            const emailConflict = await User.findOne({ where: { email: cleanEmail } });
            if (emailConflict && emailConflict.user_id !== numericUserId) {
                return res.status(409).json({ message: "This email is already in use by another user." });
            }
            user.email = cleanEmail;
        }
        
        // validate and update: state (admin)
        if (state && loggedProfileType === 'admin') {
            const allowedStates = ['active', 'suspended'];
            if (!allowedStates.includes(state)) {
                return res.status(400).json({ message: "Invalid state. Use: active or suspended." });
            }
            user.state = state;
        }

        // validate and update: profile_type (admin)
        if (profile_type && loggedProfileType === 'admin') {
            const allowedProfiles = ['student_teacher', 'staff', 'admin'];
            if (!allowedProfiles.includes(profile_type)) {
                return res.status(400).json({ message: "Invalid profile type. Use: admin, staff or student_teacher." });
            }

            // admin cannot remove their own admin privileges
            if (loggedUserId === numericUserId && profile_type !== 'admin') {
                return res.status(400).json({ message: "You cannot remove your own administrator privileges." });
            }

            user.profile_type = profile_type;
        }

        // save into DB
        await user.save();

        return res.status(200).json({
            message: "User updated successfully!",
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                email: user.email,
                profile_type: user.profile_type,
                state: user.state
            }
        });

    } catch (error) {
        console.error("Error in updateUser:", error);
        return res.status(500).json({ message: "Error while updating user." });
    }
}

// ==========================================
// Delete an User
// ==========================================
export const deleteUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const loggedUserId = req.loggedUser.user_id;

        // only admins can delete users
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can delete users." });
        }

        // convert user_id to number and validate
        const numericUserId = parseInt(user_id, 10);
        if (isNaN(numericUserId)) {
            return res.status(400).json({ message: "The user ID must be a valid number." });
        }

        const user = await User.findByPk(numericUserId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // admin cannot delete their own account
        if (loggedUserId === numericUserId) {
            return res.status(400).json({ message: "You cannot delete your own administrator account." });
        }

        await user.destroy();
        return res.status(200).json({ message: "User deleted successfully!" });

    } catch (error) {
        console.error("Error in deleteUser:", error);
        return res.status(500).json({ message: "Error while deleting user." });
    }
}