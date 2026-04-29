import jwt from 'jsonwebtoken'

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'Không tìm thấy Token.' });
    }

    const token = authHeader.split(' ')[1]

    // 2. Giải mã và kiểm tra
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Lỗi này xảy ra khi token sai chữ ký hoặc đã hết hạn (expiresIn)
            return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        // 3. Nếu đúng, lưu thông tin user (userId) vào request để dùng cho các hàm sau
        req.user = decoded;

        // 4. Mở barie cho đi tiếp vào Controller xử lý logic
        next();
    });
};

export default verifyJWT;