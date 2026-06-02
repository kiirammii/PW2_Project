import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // get token from authorization header (Authorization: Bearer <TOKEN>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // separate "Bearer" from the token

    if (!token) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    try {
        // verify the token and decode its payload
        const secretKey = process.env.JWT_SECRET || 'chave_secreta_provisoria_pw2';
        const decoded = jwt.verify(token, secretKey);

        // inject the user information from the token into the request object for use in subsequent controllers
        req.loggedUser = {
            user_id: decoded.user_id,
            profile_type: decoded.profile_type
        };

        // pass control to the next middleware or route handler
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token inválido ou expirado." });
    }
};

// middleware to check if the logged-in user has admin privileges
export const isAdmin = (req, res, next) => {
    if (req.loggedUser && req.loggedUser.profile_type === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: "Acesso proibido. Requer privilégios de Administrador." });
    }
};