const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');


const configFileName = ".namingrc.json";

// A Diagnostic object
class Diagnostic {
    uri;
    rule;
    type;
    message;
    severity;
    href;
    resource;
    range;
    code;

    constructor(uri, rule, range) {
        this.uri = uri;
        this.rule = rule;
        this.type = rule.type;
        this.message = rule.message;
        this.severity = rule.severity;
        this.href = rule.href;
        this.resource = "file"; //file or folder
        this.range = range || {
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 }
        },
            this.code = "";

    }

    getRuleNickname() {

        if (this.rule.type === "function" || this.rule.type === "tag" || this.rule.type === "filename_postfix") {
            return this.rule.type + " " + this.rule.value;
        }
        return this.rule.type;
    }
}

// Copied from vscode, so that we match and can provide info for users. 
// export enum DiagnosticSeverity {

//     /**
//      * Something not allowed by the rules of a language or other means.
//      */
//     Error = 0,

//     /**
//      * Something suspicious but allowed.
//      */
//     Warning = 1,

//     /**
//      * Something to inform about but not a problem.
//      */
//     Information = 2,

//     /**
//      * Something to hint to a better way of doing it, like proposing
//      * a refactoring.
//      */
//     Hint = 3
// }

function scanFolder(scanRoot, config = {}, diagnostics = []
) {
    const files = fs.readdirSync(scanRoot);

    // See if there is a config file in the root.
    const configPath = path.join(scanRoot, configFileName);
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config["scanRoot"] = scanRoot;
        // console.log("Found config!", configPath);
    }

    for (const file of files) {
        const filePath = path.join(scanRoot, file);
        let diagnostic;
        if (fs.statSync(filePath).isDirectory()) {

            // Check the rules against the folder.
            processRules(filePath, config, diagnostics);
            // Now do the children
            scanFolder(filePath, config, diagnostics);
            // diagnostics = diagnostics.concat(diagnostic);
        } else {
            // const relativePath = path.relative(scanRoot, filePath);
            // console.log("Processing file", relativePath, "against scanRoot", scanRoot);
            processRules(filePath, config, diagnostics);
            // diagnostics = diagnostics.concat(diagnostic);
        }
    }
    return diagnostics;
}

/**
 * Scans an individial file path. We also can search for the config file all the way up the tree. until we hit the root path. 
 * @param {string} filePath - The path of the file to scan.
 * @param {Object} config - The naming convention config. (optional)
 * @param {Array<Object>} diagnostics - An array of diagnostic messages. (optional)
 * @param {string} rootPath - The root path of the scan. (optional)
 **/
function scanFile(filePath, config = {}, diagnostics = [], rootPath = "/") {

    // if (!config.rules) {
    //     let configfile = findConfigFile(filePath, rootPath);
    //     config = JSON.parse(fs.readFileSync(configfile, 'utf8'));
    //     config["scanRoot"] = scanRoot;
    //     console.log("Found config!", configfile);
    // }

    processRules(filePath, config, diagnostics);
    return diagnostics;

}

function findConfigFile(filePath, rootPath = "/") {
    // Does the filepoath exist?, make it absolute 
    // What is the current file path I guess?

    // Check the current path for the config file.
    // console.log(path.resolve(filePath));
    const resolvedPath = path.resolve(filePath);
    const root = path.resolve(rootPath) || "/";

    // console.log(root, resolvedPath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const isDir = fs.statSync(resolvedPath).isDirectory();
    let searchPath = resolvedPath;
    if (!isDir) {
        searchPath = path.dirname(searchPath);
    }

    const configPath = path.join(searchPath, configFileName);


    if (fs.existsSync(path.resolve(configPath))) {
        return configPath;
    }

    // We only go up if we are not at the root
    if (searchPath === root) {
        return null;
    }
    return findConfigFile(path.dirname(filePath), rootPath);

}

function processRules(filePath, config, diagnostics) {
    const rules = config.rules || [];


    // console.log("File Rules", fileRules.length);
    for (const rule of rules) {
        const ruleResults = validateRule(filePath, rule, config);

        for (let ruleResult of ruleResults) {
            diagnostics.push(ruleResult);
        }
        // diagnostics = diagnostics.concat(ruleResults);
    }
    return diagnostics;
}



function validateRule(filePath, rule, config) {
    const diagnostics = [];

    // Get relative path  so we can use minmatch
    const relativePath = path.relative(config.scanRoot, filePath);

    // Normalize file paths to use forward slashes.
    const normalizedFilePath = relativePath.replace(/\\/g, '/');

    if (!rule.includes) {
        console.error('Rule must have a Glob pattern in the `includes` field', rule);
        throw new Error('Rule must have a Glob pattern in the `includes` field');
    }
    if (rule.includes) {
        if (!minimatch(normalizedFilePath, rule.includes)) {
            return diagnostics; // file doesn't match the include pattern, so ignore.
        }
    }

    // Next, check if the file matches an ignore pattern.
    if (rule.excludes && minimatch(normalizedFilePath, rule.excludes)) {
        return diagnostics; // file matches the ignore pattern, so skip this rule.
    }



    // try {
    //     console.info(normalizedFilePath, rule.include, minimatch(normalizedFilePath, rule.include))
    // }
    // catch (e) {
    //     console.error(e, rule);
    //     throw e;
    // }
    // Process rule types.
    switch (rule.type) {
        case 'extension_not_allowed': {
            // Here, rule.value could be a glob pattern like "*.md"
            if (minimatch(normalizedFilePath, rule.includes)) {

                diagnostics.push(
                    new Diagnostic(filePath, rule)
                );

            }

            break;
        }
        case 'folder_not_allowed': {
            // For folder not allowed, we split the path and check if any segment equals the forbidden folder.
            if (minimatch(normalizedFilePath, rule.includes)) {
                let diag = new Diagnostic(filePath, rule);
                diag.resource = "folder";
                diagnostics.push(diag);
            }
            break;
        }
        case 'filename_postfix': {
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName);
            const baseName = path.basename(fileName, ext);

            if (!baseName.endsWith(rule.value)) {
                diagnostics.push(new Diagnostic(filePath, rule));
            }
            break;
        }
        case 'regex': {

            const regex = new RegExp(rule.value);
            const content = fs.readFileSync(filePath, 'utf8');
            const match = regex.exec(content);
            if (match) {
                const startIndex = match.index;
                const endIndex = startIndex + match[0].length;
                const startPos = getLineColumn(content, startIndex);
                const endPos = getLineColumn(content, endIndex);

                const code = match[0];
                const diag = new Diagnostic(filePath, rule, { start: startPos, end: endPos });
                diag.code = match[0];
                diagnostics.push(diag);
            }
            break;
        }
        case 'tag': {
            const content = fs.readFileSync(filePath, 'utf8');
            const tagRegex = getTagRegex(rule.value);
            const match = tagRegex.exec(content);
            if (match) {
                const startIndex = match.index;
                const endIndex = startIndex + match[0].length;
                const startPos = getLineColumn(content, startIndex);
                const endPos = getLineColumn(content, endIndex);
                const diag = new Diagnostic(filePath, rule, { start: startPos, end: endPos });
                diag.code = match[0];
                diagnostics.push(diag);
            }
            break;
        }
        // case 'function_def': {
        //     const content = fs.readFileSync(filePath, 'utf8');
        //     const regex = new RegExp(`function\\s+${rule.value}\\s*\\(`);
        //     const match = regex.exec(content);
        //     if (match) {
        //         const startIndex = match.index;
        //         const endIndex = startIndex + match[0].length;
        //         const startPos = getLineColumn(content, startIndex);
        //         const endPos = getLineColumn(content, endIndex);
        //         diagnostics.push(new Diagnostic(filePath, rule, { start: startPos, end: endPos }));
        //     }
        //     break
        // }
        case 'function': {
            const content = fs.readFileSync(filePath, 'utf8');
            const regex = getFunctionRegex(rule.value);
            const match = regex.exec(content);
            if (match) {
                const startIndex = match.index;
                const endIndex = startIndex + match[0].length;
                const startPos = getLineColumn(content, startIndex);
                const endPos = getLineColumn(content, endIndex);
                const diag = new Diagnostic(filePath, rule, { start: startPos, end: endPos });
                diag.code = match[0];
                diagnostics.push(diag);
            }
            break
        }


        default:
            break;
    }
    return diagnostics;
}



function getTagRegex(tagName) {
    return new RegExp(
        `<${tagName}\\b([^>]*)>([\\s\\S]*?)?<\\/${tagName}>|<${tagName}\\b([^>]*)>`,
        "gi"
    );
}

function getFunctionRegex(functionName) {
    return new RegExp(
        `(${functionName}\w*)\s*\(([^)]*)\)`,
        "gi"
    );
}



function getLineColumn(content, index) {
    const lines = content.substring(0, index).split(/\r?\n/);
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
}


/**
 * Validate a file against both workspace and file rules.
 * @param {string} filePath - The path of the file to validate.
 * @param {Object} config - The naming convention config.
 * @returns {Array<Object>} An array of diagnostic messages.
 */
// function validate(filePath, config) {
//     let diagnostics = [];

//     // Process workspace rules.
//     if (config.workspace && Array.isArray(config.workspace)) {
//         for (const rule of config.workspace) {
//             diagnostics = diagnostics.concat(validateWorkspaceRules(filePath, rule));
//         }
//     }

//     // Read file content for file rules.
//     let content = '';
//     try {
//         content = fs.readFileSync(filePath, 'utf8');
//     } catch (err) {
//         diagnostics.push({
//             type: 'file_read_error',
//             message: `Failed to read file: ${filePath}`,
//             severity: 5,
//             href: null,
//         });
//         return diagnostics;
//     }

//     // Process file rules.
//     if (config.file && Array.isArray(config.file)) {
//         for (const rule of config.file) {
//             diagnostics = diagnostics.concat(validateFileRules(filePath, rule, content));
//         }
//     }

//     return diagnostics;
// }

module.exports = {
    loadConfig: (configPath) => JSON.parse(fs.readFileSync(configPath, 'utf8')),
    // validate,
    // validateWorkspaceRules,
    // validateFileRules,
    // validateContentRules,
    // NamingConventionChecker,
    findConfigFile, //exposing for testing
    validateRule,
    scanFolder,
    scanFile,
    getTagRegex
};
