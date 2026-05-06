// ---> TẤT CẢ LOGIC CỦA MASTER NODE
// Xử lý API cho Giao diện (UI) gọi xuống
// Cấp phát token cho UI
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from "../../shared/database/connect.js";

const authController = {
    register: async (req, res) => {
        const {user_email, password, role} = req.body;

        try {
            const email = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [user_email]
            );
            
            if(email.rows.length > 0)
            {
                return res.status(400).json({ message: 'Username or email already exists' });
            }
        
            const hashedPassword = await bcrypt.hash(password, 10);

            // Nếu có gửi role thì dùng, không thì tự động gán là 'viewer'
            const assignedRole = role || 'viewer';
            
            // Cập nhật câu lệnh SQL: thêm cột _role và biến $3
            await pool.query(
                "INSERT INTO users (email, password_hash, _role) VALUES ($1, $2, $3)",
                [user_email, hashedPassword, assignedRole]
            )

            res.status(201).json({ message: 'User registered successfully' });
        }
        catch (err)
        {
            console.log('Error register!', err);
            res.status(500).json({ message: 'Server error' });
        }
    },

    login: async (req, res) =>
    {
        const { user_email, password } = req.body;
        
        try {
            const email = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [user_email]
            )

            const user = email.rows[0];

            if(!user)
            {
                return res.status(400).json({message: 'Invalid email or password' }); // Email is not found in db
            }

            const passwordMatch = await bcrypt.compare(password, user.password_hash);


            if(!passwordMatch)
            {
                return res.status(400).json({message: 'Invalid email or password' }); // Password does not match
            }

            const token = jwt.sign({ 
                userId: user.user_id, 
                _role: user._role
            }, process.env.JWT_SECRET, { expiresIn: '8h'});
            res.json({ token, userId: user.user_id });
        }
        catch (err)
        {
            console.log('Error login!', err);
            res.status(500).json({ message: 'Server error' });
        }
    }

};

export default authController;
