const axios = require('axios');
const bodyParser = require('body-parser');
const express = require('express');
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const socketIO = require('socket.io');

const KEY_MAPPINGS = require('./key-mappings');
const RequestQueue = require('./request-queue');

const PORT = process.env.PORT || 5000;

const app = express();

const requestQueue = new RequestQueue();

const cors = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
};

app.use(cors);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false,
}));

app.listen(PORT, console.log(`Server started on port ${PORT}`));

let currentWindowId;

function xdotoolKey(windowId, keystroke) {
    return `xdotool windowactivate ${windowId.trim()} key ${keystroke}`;
}

function xdotoolKeyIn(windowId, keystroke) {
    return `xdotool windowactivate ${windowId.trim()} keydown ${keystroke}`;
}

function xdotoolKeyOut(windowId, keystroke) {
    return `xdotool windowactivate ${windowId.trim()} keyup ${keystroke}`;
}

function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stdout);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/keystroke', (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const {keyId} = req.body;
    if (keyId === undefined) {
        return res.status(400).send({
            error: {
                reason: 'Error: keyId missing in request.',
            },
        });
    }

    if (KEY_MAPPINGS.gba[keyId] === undefined) {
        return res.status(400).send({
            error: {
                reason: `Error: invalid keyId ${keyId} for GBA.`,
            },
        });
    }

    if (currentWindowId === undefined) {
        return res.status(400).send({
            error: {
                reason: 'Error: global currentWindowId is not set.',
            },
        });
    }

    const keystroke = KEY_MAPPINGS.gba[keyId];

    requestQueue.add(getXdotoolKeyStroke(currentWindowId, keystroke));

    res.status(200).send({
        'success': `Success: Keystroke sent (${keyId} => ${keystroke})`
    });
});

async function download(url) {
    const pathName = path.resolve(__dirname, 'rom.gba');
    const writer = fs.createWriteStream(pathName);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

app.post('/vba-startup', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const {romUrl} = req.body;
    if (romUrl === undefined) {
        return res.status(400).send({
            error: {
                reason: 'Error: romUrl is empty.',
            },
        });
    }

    // Download GBA file from romUrl
    try {
        console.log('Starting download...');
        await download(romUrl);
        console.log('ROM downloaded.');
    } catch (err) {
        return res.status(400).send({
            error: {
                reason: `Error: Problem downloading file from ${romUrl}.`,
                message: err,
            },
        });
    }

    if (currentWindowId) {
        console.log('Killing existing window...');
        await execPromise(`xdotool windowkill ${currentWindowId}`);
        console.log('Existing window killed.');
    }

    console.log('Starting new window...');
    execPromise(`/usr/bin/vba --frameskip=0 --fullscreen ~/server/rom.gba &`);
    await sleep(3000);
    const windowId = await execPromise('xdotool getactivewindow');
    currentWindowId = windowId.trim();
    await execPromise(`xdotool windowactivate ${currentWindowId}`);
    console.log('New window active.');

    // console.log('Positioning window...');
    // await execPromise(`xdotool windowmove ${currentWindowId} 0 -20`);
    // console.log('Window positioned.');

    return res.status(200).send({
        'success': 'Success'
    });
});

const SOCKET_PORT = 5002;
const io = socketIO(SOCKET_PORT);

const MODE = {
    KeyPress: 1,
    KeyPressIn: 2,
    KeyPressOut: 3,
};

io.of('/emulation-service').on('connection', function (socket) {
    socket.emit('connected', {
        success: 'Success: made socket connection.'
    });

    socket.on('keyPress', function ({ consoleId, keyId, mode }) {
        if (!consoleId || !KEY_MAPPINGS[consoleId]) {
            return socket.emit('error', {
                error: {
                    reason: `Error: invalid consoleId ${consoleId}.`,
                },
            });
        }

        if (!keyId) {
            return socket.emit('error', {
                error: {
                    reason: 'Error: keyId missing in request.',
                },
            });
        }

        const keystroke = KEY_MAPPINGS[consoleId][keyId];

        if (!keystroke) {
            return socket.emit('error', {
                error: {
                    reason: `Error: invalid keyId ${keyId} for consoleId ${consoleId}.`,
                },
            });
        }

        if (currentWindowId === undefined) {
            console.warn('Warning: there is no active window.');
            return;
        }

        let cmd;
        switch (mode) {
            case MODE.KeyPressIn:
                cmd = xdotoolKeyIn(currentWindowId, keystroke);
                break;
            case MODE.KeyPressOut:
                cmd = xdotoolKeyOut(currentWindowId, keystroke);
                break;
            case MODE.KeyPress:
            default:
                cmd = xdotoolKey(currentWindowId, keystroke);
                break;
        }

        requestQueue.add(cmd);
    });
});
