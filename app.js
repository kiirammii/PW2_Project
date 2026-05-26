import express from "express";
import 'dotenv/config';

const app = express();

const PORT = process.env.PORT;
const HOST = process.env.HOST;

app.use(express.json());

// import express router for carts & products resources
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import commentRoutes from './routes/comment.routes.js';
import occurrenceRoutes from './routes/occurrence.routes.js';
import statusRoutes from './routes/status.routes.js';
import userRoutes from './routes/user.routes.js';


// apply express router for each routes file
app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/comments', commentRoutes);
app.use('/occurrences', occurrenceRoutes);
app.use('/status', statusRoutes);
app.use('/users', userRoutes);

// handle 404 error for unknown routes
app.use((req, res, next) => {
    const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    // capture express.json() body parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        err.message = "Invalid JSON payload";
        err.status = 400;
    }

    res.status(err.status || 500).json({
        description: err.message || "Internal server error",
        // if errors, include it in the response
        ...(err.errors && { errors: err.errors })
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});