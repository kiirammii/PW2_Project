import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // get token from authorization header (Authorization: Bearer <TOKEN>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // separate "Bearer" from the token

    if (!token) {
        return res.status(401).json({ message: "Access denied. Token not provided." });
    }

    try {
        // verify the token and decode its payload
        const secretKey = process.env.JWT_SECRET || 'temporary_secret_key';
        const decoded = jwt.verify(token, secretKey);

        // inject the user information from the token into the request object for use in subsequent controllers
        req.loggedUser = {
            user_id: decoded.user_id,
            profile_type: decoded.profile_type
        };

        // pass control to the next middleware or route handler
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

// middleware to check if the logged-in user has admin privileges
export const isAdmin = (req, res, next) => {
    if (req.loggedUser && req.loggedUser.profile_type === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: "Access denied. Requires Administrator privileges." });
    }
};