const crypto = require('crypto');

const generatePassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let retVal = '';
    for (let i = 0; i < length; i++) {
        retVal += charset.charAt(bytes[i] % charset.length);
    }
    return retVal;
};

module.exports = generatePassword;
