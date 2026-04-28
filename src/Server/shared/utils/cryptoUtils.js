// ---> CODE CHUNG DÙNG CHO CẢ MASTER VÀ WORKER
// Hàm dùng chung (Format thời gian, hash mật khẩu...)

const getMasterKey = () => Buffer.from(process.env.AES_MASTER_KEY, 'hex')

export const GCMdecrypt = (cipherObj) => {
	try{
		const {encryptedData, iv, authTag} = cipherObj;

		const ivBuffer = Buffer.from(iv, 'hex');
		const authTagBuffer = Buffer.from(authTag, 'hex');
		const masterKey = getMasterKey();

		const decipher = crypto.createDecipheriv(
			'aes-256-gcm', 
			masterKey, 
			ivBuffer
		);
		
		decipher.setAuthTag(authTagBuffer);
		
		let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	}
	catch(err){
		console.error('Không thể giải mã Key', err.message);
		return null;
	}
}

export const GCMencrypt = (plainText) => {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(
		"aes-128-gcm",
		masterkey,
		iv
	);

	let encrypted = cipher.update(Secret, 'utf-8', 'hex');
	encrypted += cipher.final('hex');

	const tag = cipher.getAuthTag();

	return{
		iv: iv.toString('hex'),
		cipherText: encrypted,
		tag: tag.toString('hex')
	};
}

