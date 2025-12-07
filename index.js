require('dotenv').config();

const chalk = require('chalk');

console.log(chalk.blue.bold(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ██████╗     ║
║   ██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗    ║
║   ██║  ██║██║███████╗██║     ██║   ██║██████╔╝██║  ██║    ║
║   ██║  ██║██║╚════██║██║     ██║   ██║██╔══██╗██║  ██║    ║
║   ██████╔╝██║███████║╚██████╗╚██████╔╝██║  ██║██████╔╝    ║
║   ╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝ ╚═╝╚═════╝     ║
║                                                           ║
║              Discord Bot Ecosystem v10.0.0                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));

async function startServices() {
    console.log(chalk.yellow('Starting services...'));
    console.log('');

    require('./website/server');
    console.log(chalk.green('✓'), chalk.white('Website server started'));

    if (process.env.DISCORD_TOKEN && process.env.MONGO_TOKEN) {
        try {
            require('./src/bot');
            console.log(chalk.green('✓'), chalk.white('Main Discord bot started'));
        } catch (error) {
            console.log(chalk.red('✗'), chalk.white('Main bot failed to start:', error.message));
        }
    } else {
        console.log(chalk.yellow('!'), chalk.white('Main bot not started - Set DISCORD_TOKEN and MONGO_TOKEN to enable'));
    }

    if (process.env.DISCORD_TOKEN1) {
        setTimeout(() => {
            try {
                require('./modmail/bot');
                console.log(chalk.green('✓'), chalk.white('Modmail bot started'));
            } catch (error) {
                console.log(chalk.red('✗'), chalk.white('Modmail bot failed to start:', error.message));
            }
        }, 5000);
    } else {
        console.log(chalk.yellow('!'), chalk.white('Modmail bot not started - Set DISCORD_TOKEN1 to enable'));
    }

    console.log('');
    console.log(chalk.blue('━'.repeat(50)));
    console.log(chalk.blue.bold('  All services initialized!'));
    console.log(chalk.blue('━'.repeat(50)));
}

startServices().catch(error => {
    console.error(chalk.red('Failed to start services:'), error);
    process.exit(1);
});
