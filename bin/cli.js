#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
// const meow = require('meow');
const { scanFolder } = require('../index');

function printUsage() {
    console.log('Usage: naming --folder <folder> [--json]');
}

function getColorForSeverity(severity) {
    // Need to shift it by -1 to match the DiagnosticSeverity enum
    severity -= 1;
    switch (severity) {
        case 0: // Error
            return chalk.red;
        case 1: // Warning
            return chalk.yellow;
        case 2: // Information
            return chalk.blue;
        case 3: // Hint
            return chalk.gray;
        default:
            return chalk.white;
    }
}

const args = process.argv.slice(2);
let folderPath = null;
let outputFormat = 'text';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--folder' && i + 1 < args.length) {
        folderPath = args[i + 1];
        i++;
    } else if (args[i] === '--json') {
        outputFormat = 'json';
    }
}

if (!folderPath) {
    printUsage();
    process.exit(1);
}

const filePath = path.resolve(process.cwd(), folderPath);
const diagnostics = scanFolder(filePath);

if (outputFormat === 'json') {
    console.log(JSON.stringify(diagnostics, null, 2));
} else {
    // Example text report output with severity colouring
    diagnostics.forEach(diag => {
        const colorFn = getColorForSeverity(diag.severity);
        console.log(colorFn(`File: ${diag.uri}`));
        console.log(colorFn(`Start - Line: ${diag.range.start.line} Column: ${diag.range.start.column}`));
        console.log(colorFn(`End - Line: ${diag.range.end.line} Column: ${diag.range.end.column}`));
        console.log(colorFn(`Message: ${diag.message}`));
        console.log(colorFn('-----------------------------------'));
    });
}