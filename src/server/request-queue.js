const exec = require('child_process').exec;

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

class RequestQueue {
    constructor() {
        this.queue = [];
        this.lock = false;
    }

    add(cmd) {
        this.queue.push(cmd);
        if (this.lock) {
            return;
        }
        this.execute();
    }

    execute() {
        this.lock = true;

        const cmd = this.queue.shift();
        execPromise(cmd)
        .then(() => {
            if (this.queue.length !== 0) {
                this.execute();
            } else {
                this.lock = false;
            }
        });
    }
}

module.exports = RequestQueue;
