const mongoose = require('mongoose');
var mongoDB = process.env.mongoDBURL;
const options = {
    useNewUrlParser: false,
    useUnifiedTopology: true,
    useCreateIndex: false,
    useFindAndModify: false,
    autoIndex: false, // Don't build indexes
    poolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    keepAlive: true, // true by default since mongoose 5.2.0.
    keepAliveInitialDelay: 300000 // number of milliseconds to wait before initiating keepAlive
  };
mongoose.connect(mongoDB, options).catch(error => console.error.bind(console, 'MongoDB connection error:'));


mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
mongoose.connection.once('open', () => {
    console.log('Connected to mongo DB');
});
module.exports = mongoose;