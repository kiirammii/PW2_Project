import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // 1. Ir buscar o token ao header da requisição (Authorization: Bearer <TOKEN>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Separa a palavra 'Bearer' do token real

    if (!token) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    try {
        // 2. Verificar se o token é válido
        const secretKey = process.env.JWT_SECRET || 'chave_secreta_provisoria_pw2';
        const decoded = jwt.verify(token, secretKey);

        // 3. Injetar os dados do utilizador dentro do objeto 'req' para que os controladores saibam quem fez a requisição
        req.loggedUser = {
            user_id: decoded.user_id,
            profile_type: decoded.profile_type
        };

        // 4. Passar o controlo para o controlador seguinte
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token inválido ou expirado." });
    }
};

// Middleware opcional para trancar rotas apenas para Administradores
export const isAdmin = (req, res, next) => {
    if (req.loggedUser && req.loggedUser.profile_type === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: "Acesso proibido. Requer privilégios de Administrador." });
    }
};