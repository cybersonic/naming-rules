#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { scan, version } from '../index.js';
import { readFileSync } from 'fs';

program
    .version(version())
    .description("Naming Rules")
    .option("-r, --reporter <reporter>", "How to display the results", "simple")
    .option("-s, --severity <severity>", "Which severity to display", "all")
    .option("-c, --config <config>", "Path to the config file", "./naming-rules.json")
    .argument('<path>')
    .parse();

const options = program.opts();

const pathToScan = program.args[0];

if (!pathToScan || pathToScan === "") {
    console.error("Please provide a path to scan");
    process.exit(1);
}
// If it is a directory, we scan 
const diagnostics = await scan(pathToScan);

//If it is a file, we read the file and get config. 

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

let filtered = diagnostics;
if (options.severity !== 'all') {
    const severity = parseInt(options.severity);
    filtered = diagnostics.filter(diag => diag.severity === severity);
}

if (options.reporter === 'json') {
    console.log(JSON.stringify(filtered, null, 2));
} else {
    console.table(filtered, ['severity', 'uri', 'message']);
}