const mongoose = require('mongoose');
const chalk = require('chalk');

async function connect() {
    if (!process.env.MONGO_TOKEN) {
        console.log(chalk.yellow(`[WARNING]`), chalk.white(`>>`), chalk.yellow(`MongoDB`), chalk.white(`>>`), chalk.yellow(`MONGO_TOKEN not set, skipping connection`));
        return false;
    }

    mongoose.set('strictQuery', false);
    try {
        console.log(chalk.blue(chalk.bold(`Database`)), (chalk.white(`>>`)), chalk.red(`MongoDB`), chalk.green(`is connecting...`))
        await mongoose.connect(process.env.MONGO_TOKEN, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    } catch (err) {
        console.log(chalk.red(`[ERROR]`), chalk.white(`>>`), chalk.red(`MongoDB`), chalk.white(`>>`), chalk.red(`Failed to connect to MongoDB!`), chalk.white(`>>`), chalk.red(`Error: ${err.message}`))
        console.log(chalk.yellow(`Bot will continue without MongoDB - some features may not work`));
        return false;
    }


    mongoose.connection.once("open", () => {
        console.log(chalk.blue(chalk.bold(`Database`)), (chalk.white(`>>`)), chalk.red(`MongoDB`), chalk.green(`is ready!`))
    });

    mongoose.connection.on("error", (err) => {
        console.log(chalk.red(`[ERROR]`), chalk.white(`>>`), chalk.red(`Database`), chalk.white(`>>`), chalk.red(`MongoDB error!`), chalk.white(`>>`), chalk.red(`Error: ${err.message}`))
    });
    return true;
}

module.exports = connect