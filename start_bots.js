const { spawn } = require('child_process');
const path = require('path');

function startBot(scriptName) {
    const bot = spawn('node', [scriptName], {
        stdio: 'inherit'
    });

    bot.on('close', (code) => {
        console.log(`${scriptName} exited with code ${code}`);
        // Bot kapanırsa yeniden başlat
        setTimeout(() => startBot(scriptName), 5000);
    });
}

// ETH Grid Bot'u başlat
startBot('eth_grid.js');

// BTC Grid Bot'u başlat
startBot('btc_grid.js'); 