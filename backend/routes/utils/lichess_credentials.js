// module.exports = {
//   clientId: 'lip_vJMHMJyxiPN4Zc1SkL1Y',
//   url: 'http://localhost:5000',
//   clientSecret: '123',
// };
module.exports = {
  clientId: process.env.CLIENT_ID || 'lip_vJMHMJyxiPN4Zc1SkL1Y',
  url: process.env.REDIRECT_BASE_URL || 'http://localhost:5000',
};
