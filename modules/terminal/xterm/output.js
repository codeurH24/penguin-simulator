export function captureOutput() {
    this.commandOutput = '';
    this.originalWrite = this.term.write;
    this.term.write = (data) => {
        this.commandOutput += data;
    };
}

export function getCapture() {
    this.term.write = this.originalWrite;
    return this.commandOutput;
}